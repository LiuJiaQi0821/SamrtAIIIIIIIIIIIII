import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

const router = Router();

// 加载环境变量
function loadEnv(): void {
  try {
    const pythonCode = `
import os
import sys
try:
    from coze_workload_identity import Client
    client = Client()
    env_vars = client.get_project_env_vars()
    client.close()
    for env_var in env_vars:
        print(f"{env_var.key}={env_var.value}")
except Exception as e:
    print(f"# Error: {e}", file=sys.stderr)
`;

    const output = execSync(`python3 -c '${pythonCode.replace(/'/g, "'\"'\"'")}'`, {
      encoding: 'utf-8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const lines = output.trim().split('\n');
    for (const line of lines) {
      if (line.startsWith('#')) continue;
      const eqIndex = line.indexOf('=');
      if (eqIndex > 0) {
        const key = line.substring(0, eqIndex);
        let value = line.substring(eqIndex + 1);
        if ((value.startsWith("'") && value.endsWith("'")) ||
            (value.startsWith('"') && value.endsWith('"'))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  } catch {
    // Silently fail
  }
}

// 初始化Supabase客户端
loadEnv();

const supabaseUrl = process.env.COZE_SUPABASE_URL || '';
const supabaseKey = process.env.COZE_SUPABASE_SERVICE_ROLE_KEY || process.env.COZE_SUPABASE_ANON_KEY || '';

// 延迟创建supabase客户端
let supabase: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabase && supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          'Content-Type': 'application/json'
        }
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });
  }
  return supabase;
}

// 岗位画像缓存
let jobProfilesCache: any[] = [];
let jobProfilesLoaded = false;

// 加载所有岗位画像
async function loadJobProfiles() {
  if (jobProfilesLoaded) return jobProfilesCache;
  
  const db = getSupabaseClient();
  if (!db) return [];
  
  try {
    const { data, error } = await db
      .from('job_profiles')
      .select('*');
    
    if (error) {
      console.error('加载岗位画像失败:', error);
      return [];
    }
    
    jobProfilesCache = data || [];
    jobProfilesLoaded = true;
    console.log(`已加载 ${jobProfilesCache.length} 个岗位画像`);
    return jobProfilesCache;
  } catch (error) {
    console.error('加载岗位画像出错:', error);
    return [];
  }
}

// 根据岗位名称匹配岗位画像
function matchJobProfile(jobTitle: string, jobProfiles: any[]): any | null {
  if (!jobTitle || jobProfiles.length === 0) return null;
  
  const normalizedTitle = jobTitle.toLowerCase();
  
  // 精确匹配
  for (const profile of jobProfiles) {
    if (profile.profile_name && profile.profile_name.toLowerCase() === normalizedTitle) {
      return profile;
    }
  }
  
  // 关键词匹配
  for (const profile of jobProfiles) {
    if (profile.profile_name && normalizedTitle.includes(profile.profile_name.toLowerCase())) {
      return profile;
    }
    if (profile.profile_name && profile.profile_name.toLowerCase().includes(normalizedTitle)) {
      return profile;
    }
  }
  
  // 分类匹配
  for (const profile of jobProfiles) {
    if (profile.category === '技术类' && (normalizedTitle.includes('工程师') || normalizedTitle.includes('开发') || normalizedTitle.includes('技术'))) {
      return profile;
    }
  }
  
  return null;
}

// 从数据库获取晋升路径
async function getPromotionPathsFromDB(profileId: number): Promise<any[]> {
  const db = getSupabaseClient();
  if (!db) return [];
  
  try {
    const { data, error } = await db
      .from('career_paths')
      .select(`
        *,
        from_job:job_profiles!from_job_id(id, profile_name),
        to_job:job_profiles!to_job_id(id, profile_name)
      `)
      .eq('from_job_id', profileId)
      .order('is_recommended', { ascending: false })
      .order('years_required');
    
    if (error) {
      console.error('获取晋升路径失败:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('获取晋升路径出错:', error);
    return [];
  }
}

// 从数据库获取横向换岗路径
async function getLateralMovesFromDB(profileId: number): Promise<any[]> {
  const db = getSupabaseClient();
  if (!db) return [];
  
  try {
    const { data, error } = await db
      .from('job_transfer_graph')
      .select(`
        *,
        from_job:job_profiles!from_job_id(id, profile_name),
        to_job:job_profiles!to_job_id(id, profile_name),
        intermediate_job:job_profiles!intermediate_job_id(id, profile_name)
      `)
      .eq('from_job_id', profileId)
      .order('is_recommended', { ascending: false })
      .order('steps_required');
    
    if (error) {
      console.error('获取横向换岗路径失败:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('获取横向换岗路径出错:', error);
    return [];
  }
}

// 格式化晋升路径用于前端展示
function formatPromotionPathsForDisplay(jobTitle: string, dbPaths: any[]): any[] {
  if (dbPaths.length === 0) {
    // 如果数据库没有数据，回退到生成模式
    return generatePromotionPathsFallback(jobTitle);
  }
  
  // 构建晋升路径层级
  const paths: any[] = [];
  
  // 第一级：当前岗位
  paths.push({
    level: 1,
    title: jobTitle,
    description: '当前岗位，负责具体执行工作',
    typical_years: '1-2年'
  });
  
  // 从数据库路径中提取晋升路线
  const verticalPaths = dbPaths.filter((p: any) => p.path_type === 'vertical');
  const managementPaths = dbPaths.filter((p: any) => p.path_type === 'management');
  
  let level = 2;
  
  // 先添加垂直晋升路径（同岗位内晋升）
  for (let i = 0; i < Math.min(verticalPaths.length, 2); i++) {
    const path = verticalPaths[i];
    // 从路径描述中提取更明确的岗位名称
    let title = path.to_job?.profile_name || jobTitle;
    if (path.path_description) {
      if (path.path_description.includes('中级')) {
        title = '中级' + jobTitle;
      } else if (path.path_description.includes('高级')) {
        title = '高级' + jobTitle;
      }
    }
    if (level === 2 && !title.includes('中级') && !title.includes('高级')) {
      title = '中级' + jobTitle;
    }
    if (level === 3 && !title.includes('高级')) {
      title = '高级' + jobTitle;
    }
    paths.push({
      level: level,
      title: title,
      description: path.path_description || path.promotion_conditions || '承担更高级的工作职责',
      typical_years: `${path.years_required || 2}-${path.years_required + 1 || 3}年`
    });
    level++;
  }
  
  // 添加管理岗晋升路径
  if (managementPaths.length > 0 && level <= 4) {
    const path = managementPaths[0];
    paths.push({
      level: level,
      title: path.to_job?.profile_name || '技术主管/负责人',
      description: path.path_description || path.promotion_conditions || '负责团队管理和业务规划',
      typical_years: `${path.years_required || 3}-${path.years_required + 2 || 5}年`
    });
    level++;
  }
  
  // 如果数据库路径不够4级，补充到4级
  while (paths.length < 4) {
    const currentLevel = paths.length + 1;
    let title = '';
    let desc = '';
    
    if (currentLevel === 2) {
      title = '中级' + jobTitle;
      desc = '承担更复杂的工作职责，指导初级同事';
    } else if (currentLevel === 3) {
      title = '高级' + jobTitle;
      desc = '负责技术架构设计，带领团队';
    } else {
      title = '技术主管/负责人';
      desc = '负责团队管理和业务规划';
    }
    
    paths.push({
      level: currentLevel,
      title: title,
      description: desc,
      typical_years: `${(currentLevel - 1) * 2}-${currentLevel * 2}年`
    });
  }
  
  return paths;
}

// 格式化横向换岗路径用于前端展示
function formatLateralMovesForDisplay(jobTitle: string, dbPaths: any[]): any[] {
  if (dbPaths.length === 0) {
    // 如果数据库没有数据，回退到生成模式
    return generateLateralMovesFallback(jobTitle);
  }
  
  const moves: any[] = [];
  
  for (const path of dbPaths.slice(0, 3)) {
    moves.push({
      target_title: path.to_job?.profile_name || '相关岗位',
      target_industry: '互联网',
      description: path.transfer_tips || path.transfer_conditions || '从当前岗位转向相关领域',
      transferable_skills: (path.additional_skills || '逻辑思维,沟通能力').split(',').map((s: string) => s.trim()).filter(Boolean),
      suggested_actions: (path.additional_certificates || '学习相关技能,了解目标行业').split(',').map((s: string) => s.trim()).filter(Boolean)
    });
  }
  
  // 确保至少有2条路径
  while (moves.length < 2) {
    moves.push({
      target_title: moves.length === 0 ? '产品经理' : '项目经理',
      target_industry: '互联网',
      description: '从当前岗位转向相关管理岗位',
      transferable_skills: ['逻辑思维', '沟通能力', '项目协调'],
      suggested_actions: ['学习相关方法论', '提升管理能力']
    });
  }
  
  return moves;
}

// 回退方案：生成晋升路径
function generatePromotionPathsFallback(jobTitle: string) {
  const paths: Array<{
    level: number;
    title: string;
    description: string;
    typical_years: string;
  }> = [];
  
  paths.push({
    level: 1,
    title: jobTitle,
    description: '当前岗位，负责具体执行工作',
    typical_years: '1-2年'
  });
  
  if (jobTitle.includes('工程师') || jobTitle.includes('开发') || jobTitle.includes('技术')) {
    paths.push({
      level: 2,
      title: '高级' + jobTitle,
      description: '负责复杂模块开发，指导初级工程师',
      typical_years: '2-4年'
    });
    paths.push({
      level: 3,
      title: '技术主管/架构师',
      description: '负责技术架构设计，带领技术团队',
      typical_years: '5-8年'
    });
    paths.push({
      level: 4,
      title: '技术总监/CTO',
      description: '负责公司技术战略和技术团队管理',
      typical_years: '8年以上'
    });
  } else if (jobTitle.includes('产品') || jobTitle.includes('经理')) {
    paths.push({
      level: 2,
      title: '高级' + jobTitle,
      description: '负责复杂产品模块，指导初级产品经理',
      typical_years: '2-4年'
    });
    paths.push({
      level: 3,
      title: '产品负责人/产品总监',
      description: '负责产品路线图规划，带领产品团队',
      typical_years: '5-8年'
    });
    paths.push({
      level: 4,
      title: '产品VP/CEO',
      description: '负责公司产品战略和业务发展',
      typical_years: '8年以上'
    });
  } else {
    paths.push({
      level: 2,
      title: '高级' + jobTitle,
      description: '承担更复杂的工作职责，指导新人',
      typical_years: '2-4年'
    });
    paths.push({
      level: 3,
      title: '团队主管',
      description: '负责团队管理和业务规划',
      typical_years: '5-8年'
    });
    paths.push({
      level: 4,
      title: '部门经理/总监',
      description: '负责部门战略和团队发展',
      typical_years: '8年以上'
    });
  }
  
  return paths;
}

// 回退方案：生成横向换岗路径
function generateLateralMovesFallback(jobTitle: string) {
  const moves: Array<{
    target_title: string;
    target_industry: string;
    description: string;
    transferable_skills: string[];
    suggested_actions: string[];
  }> = [];
  
  if (jobTitle.includes('工程师') || jobTitle.includes('开发') || jobTitle.includes('技术')) {
    moves.push({
      target_title: '产品经理',
      target_industry: '互联网',
      description: '从技术实现转向产品规划，将技术思维应用于产品设计',
      transferable_skills: ['逻辑思维', '用户需求理解', '项目管理', '技术评估'],
      suggested_actions: ['学习产品方法论', '多参与产品评审', '培养商业敏感度']
    });
    moves.push({
      target_title: '技术支持/解决方案工程师',
      target_industry: '互联网',
      description: '从开发转向客户技术支持，帮助客户解决技术问题',
      transferable_skills: ['技术能力', '问题排查', '沟通能力', '客户服务'],
      suggested_actions: ['提升沟通技巧', '学习产品知识', '培养客户思维']
    });
  } else if (jobTitle.includes('产品')) {
    moves.push({
      target_title: '运营经理',
      target_industry: '互联网',
      description: '从产品规划转向产品运营，将产品理念落地',
      transferable_skills: ['用户理解', '数据分析', '项目协调', '产品思维'],
      suggested_actions: ['学习运营方法论', '关注数据指标', '培养活动策划能力']
    });
    moves.push({
      target_title: '用户研究/UX研究员',
      target_industry: '互联网',
      description: '深入研究用户行为和需求，为产品提供决策依据',
      transferable_skills: ['用户思维', '数据分析', '洞察力', '同理心'],
      suggested_actions: ['学习用户研究方法', '多做用户访谈', '培养分析能力']
    });
  } else {
    moves.push({
      target_title: '项目经理',
      target_industry: '互联网',
      description: '从业务执行转向项目管理，协调资源推动项目落地',
      transferable_skills: ['业务理解', '沟通协调', '项目规划', '执行力'],
      suggested_actions: ['学习项目管理方法', '提升组织协调能力', '培养风险意识']
    });
    moves.push({
      target_title: '业务分析师',
      target_industry: '互联网',
      description: '深入分析业务数据，为业务决策提供支持',
      transferable_skills: ['业务理解', '数据分析', '逻辑思维', '洞察能力'],
      suggested_actions: ['提升数据分析能力', '学习商业分析方法', '培养商业敏感度']
    });
  }
  
  return moves;
}

// 为岗位添加晋升路径和横向换岗路径
async function enrichJobWithPaths(job: any, jobProfiles: any[]) {
  const jobTitle = job.title || job.job_title || '';
  
  // 匹配岗位画像
  const matchedProfile = matchJobProfile(jobTitle, jobProfiles);
  
  let promotionPaths: any[] = [];
  let lateralMoves: any[] = [];
  
  if (matchedProfile) {
    console.log(`岗位 "${jobTitle}" 匹配到画像:`, matchedProfile.profile_name);
    
    // 从数据库获取真实路径
    const dbPromotionPaths = await getPromotionPathsFromDB(matchedProfile.id);
    const dbLateralMoves = await getLateralMovesFromDB(matchedProfile.id);
    
    promotionPaths = formatPromotionPathsForDisplay(jobTitle, dbPromotionPaths);
    lateralMoves = formatLateralMovesForDisplay(jobTitle, dbLateralMoves);
  } else {
    console.log(`岗位 "${jobTitle}" 未匹配到画像，使用生成模式`);
    // 使用回退方案
    promotionPaths = generatePromotionPathsFallback(jobTitle);
    lateralMoves = generateLateralMovesFallback(jobTitle);
  }
  
  return {
    ...job,
    promotion_paths: promotionPaths,
    lateral_moves: lateralMoves
  };
}

// 人岗匹配分析API
router.post('/api/job-match', async (req, res) => {
  try {
    const { expectations, profile } = req.body;
    
    console.log('开始人岗匹配分析...');
    console.log('职业期望:', expectations);
    console.log('学生画像:', profile ? Object.keys(profile) : '无');
    
    const db = getSupabaseClient();
    if (!db) {
      return res.status(500).json({ success: false, error: '数据库未配置' });
    }
    
    // 加载岗位画像
    const jobProfiles = await loadJobProfiles();
    
    // 记录用户原始的筛选条件，用于后续提示
    const originalFilters: string[] = [];
    if (expectations.industry) originalFilters.push(`行业: ${expectations.industry}`);
    if (expectations.jobType) originalFilters.push(`岗位类型: ${expectations.jobType}`);
    if (expectations.city) originalFilters.push(`城市: ${expectations.city}`);
    if (expectations.salary) originalFilters.push(`薪资: ${expectations.salary}`);
    if (expectations.other) originalFilters.push(`其他要求: ${expectations.other}`);
    
    console.log('用户原始筛选条件:', originalFilters);
    
    // 智能放宽策略 - 确保至少找到5个岗位
    const relaxOrder = [
      { key: 'other', label: '其他要求', filterKey: null },
      { key: 'salary', label: '薪资', filterKey: null },
      { key: 'city', label: '城市', filterKey: 'location' },
      { key: 'jobType', label: '岗位类型', filterKey: 'keyword' },
      { key: 'industry', label: '行业', filterKey: 'industry' }
    ];
    
    let matchedJobs: any[] = [];
    let finalDroppedConditions: string[] = [];
    let currentFilters = {
      industry: expectations.industry,
      keyword: expectations.jobType,
      location: expectations.city
    };
    let currentDropped: string[] = [];
    
    console.log('开始智能放宽策略，目标：至少找到5个岗位');
    console.log('初始条件:', currentFilters);
    
    let searchFilters: Record<string, string> = {};
    Object.entries(currentFilters).forEach(([key, value]) => {
      if (value) searchFilters[key] = value;
    });
    
    console.log('第1轮搜索（使用所有条件）:', searchFilters);
    
    const firstResponse = await fetch('http://localhost:5000/api/jobs/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(searchFilters)
    });
    
    const firstData = await firstResponse.json();
    let jobs = firstData.jobs || [];
    
    if (jobs.length >= 5) {
      matchedJobs = jobs.slice(0, 5);
      finalDroppedConditions = [];
      console.log(`✅ 第1轮成功，找到 ${jobs.length} 个岗位`);
    } else {
      console.log(`⚠️ 第1轮只找到 ${jobs.length} 个岗位，开始逐步放宽条件`);
      
      for (let i = 0; i < relaxOrder.length; i++) {
        const relaxItem = relaxOrder[i];
        
        if (!relaxItem.filterKey) {
          currentDropped.push(relaxItem.label);
          continue;
        }
        
        console.log(`🔄 第${i + 2}轮：放宽条件 - 去掉${relaxItem.label}`);
        delete (currentFilters as any)[relaxItem.filterKey];
        currentDropped.push(relaxItem.label);
        
        searchFilters = {};
        Object.entries(currentFilters).forEach(([key, value]) => {
          if (value) searchFilters[key] = value;
        });
        
        console.log('当前搜索条件:', searchFilters);
        console.log('已放宽条件:', currentDropped);
        
        const response = await fetch('http://localhost:5000/api/jobs/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(searchFilters)
        });
        
        const data = await response.json();
        jobs = data.jobs || [];
        
        console.log(`本轮找到 ${jobs.length} 个岗位`);
        
        if (jobs.length >= 5) {
          matchedJobs = jobs.slice(0, 5);
          finalDroppedConditions = [...currentDropped];
          console.log(`✅ 成功！找到 ${jobs.length} 个岗位，已放宽条件:`, finalDroppedConditions);
          break;
        }
      }
      
      if (matchedJobs.length === 0) {
        console.log('⚠️ 所有条件都放宽了，尝试获取推荐岗位');
        
        const allResponse = await fetch('http://localhost:5000/api/jobs/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        
        const allData = await allResponse.json();
        const allJobs = allData.jobs || [];
        
        if (allJobs.length > 0) {
          matchedJobs = allJobs.slice(0, 5);
          finalDroppedConditions = ['行业', '岗位类型', '城市', '其他要求', '薪资'];
          console.log(`🎯 使用推荐岗位: ${matchedJobs.length} 个`);
        } else {
          console.log('❌ 没有找到任何岗位');
        }
      }
    }
    
    let friendlyMessage = '';
    if (matchedJobs.length === 0) {
      friendlyMessage = '抱歉，暂时没有找到合适的岗位。请稍后再试或调整您的期望条件。';
    } else if (finalDroppedConditions.length === 0) {
      friendlyMessage = `岗位匹配分析已完成！为您找到了${matchedJobs.length}个最匹配的岗位，请查看左侧卡片了解详细分析结果。\n\n您需要我为您输出一份职业规划报告吗？我可以基于您的简历和匹配的岗位，为您制定详细的职业发展路径规划。`;
    } else if (finalDroppedConditions.length < 5) {
      friendlyMessage = `为了给您找到${matchedJobs.length}个合适的岗位，我们放宽了以下条件：${finalDroppedConditions.join('、')}。以下是基于您的学生画像推荐的岗位，请查看左侧卡片！\n\n您需要我为您输出一份职业规划报告吗？我可以基于您的简历和匹配的岗位，为您制定详细的职业发展路径规划。`;
    } else {
      friendlyMessage = `根据您的具体条件没有找到足够的匹配岗位。我们已基于您的简历背景为您推荐了${matchedJobs.length}个岗位，放宽了条件：${finalDroppedConditions.join('、')}。请查看左侧卡片！\n\n您需要我为您输出一份职业规划报告吗？我可以基于您的简历和匹配的岗位，为您制定详细的职业发展路径规划。`;
    }
    
    console.log('最终匹配岗位数:', matchedJobs.length);
    console.log('最终提示语:', friendlyMessage);
    
    let matchAnalysis = null;
    if (matchedJobs.length > 0) {
      const jobsSummary = matchedJobs.map((job: any, idx: number) => `
岗位${idx + 1}:
- 岗位名称: ${job.title}
- 公司: ${job.company}
- 薪资: ${job.salary}
- 地点: ${job.location}
- 行业: ${job.industry}
- 描述: ${job.description?.substring(0, 200) || '无'}
`).join('\n');
      
      const profileSummary = JSON.stringify(profile, null, 2);
      
      const analysisPrompt = `请进行人岗匹配度分析，严格按照以下要求输出：

【学生画像】
${profileSummary}

【匹配岗位】
${jobsSummary}

【输出要求 - 必须严格遵守】
1. 只输出JSON格式的匹配分析结果 + 一句友好提示语
2. **严禁**输出任何表格、Markdown格式的岗位列表
3. **严禁**输出"### 岗位匹配结果"、"| 岗位名称 |..."这类内容
4. **严禁**输出任何额外的解释说明文字

请为每个岗位从以下四个维度进行详细分析和打分：

## 评分原则 - 请仔细阅读
1. **鼓励为主**：即使不是100%完美匹配，只要有相关经验和技能，就给予较高分数
2. **看重潜力**：应届生或经验较少的候选人，看重学习能力和潜力
3. **相关即可**：技能和经验相关即可，不需要完全一致
4. **转移价值**：过往经验即使不是完全匹配，也有转移价值

## 输出格式要求
请使用JSON格式输出，格式如下：
\`\`\`json
{
  "matches": [
    {
      "job_title": "岗位名称",
      "company": "公司名",
      "salary": "薪资",
      "location": "地点",
      "industry": "行业",
      "overall_score": 85,
      "match_percentage": "85%",
      "dimensions": {
        "basic_requirements": {
          "score": 80,
          "weight": 25,
          "analysis": "基础要求分析...",
          "strengths": ["优势1", "优势2"],
          "gaps": ["差距1", "差距2"]
        },
        "professional_skills": {
          "score": 90,
          "weight": 35,
          "analysis": "职业技能分析...",
          "strengths": ["优势1", "优势2"],
          "gaps": ["差距1", "差距2"]
        },
        "professional_quality": {
          "score": 85,
          "weight": 20,
          "analysis": "职业素养分析...",
          "strengths": ["优势1", "优势2"],
          "gaps": ["差距1", "差距2"]
        },
        "development_potential": {
          "score": 88,
          "weight": 20,
          "analysis": "发展潜力分析...",
          "strengths": ["优势1", "优势2"],
          "gaps": ["差距1", "差距2"]
        }
      },
      "key_strengths": ["核心优势1", "核心优势2", "核心优势3"],
      "key_gaps": ["关键差距1", "关键差距2"],
      "suggestions": "改进建议..."
    }
  ]
}
\`\`\`

注意：
- 每个维度必须包含 strengths（优势项）和 gaps（差距项）
- key_gaps 中的差距项需要在前端高亮显示
- **不要输出任何友好提示语，只输出JSON代码块**
`;
      
      try {
        const chatResponse = await fetch('http://localhost:5000/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: analysisPrompt }]
          })
        });
        
        if (chatResponse.ok) {
          const reader = chatResponse.body?.getReader();
          const decoder = new TextDecoder();
          let aiResponse = '';
          
          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              const chunk = decoder.decode(value);
              const lines = chunk.split('\n');
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') break;
                  
                  try {
                    const parsed = JSON.parse(data);
                    if (parsed.content) {
                      aiResponse += parsed.content;
                    }
                  } catch {
                  }
                }
              }
            }
          }
          
          const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)```/);
          if (jsonMatch) {
            try {
              matchAnalysis = JSON.parse(jsonMatch[1]);
              console.log('AI匹配分析完成:', Object.keys(matchAnalysis));
            } catch {
              console.error('解析匹配分析JSON失败');
            }
          }
        }
      } catch (aiError) {
        console.error('AI分析失败:', aiError);
      }
    }
    
    // 为每个岗位增加晋升路径和横向换岗路径（从数据库查询）
    const enrichedJobs = await Promise.all(
      matchedJobs.map(job => enrichJobWithPaths(job, jobProfiles))
    );
    
    let enrichedAnalysis = null;
    if (matchAnalysis && matchAnalysis.matches) {
      enrichedAnalysis = {
        ...matchAnalysis,
        matches: matchAnalysis.matches.map((match: any, idx: number) => {
          const job = enrichedJobs[idx];
          return {
            ...match,
            promotion_paths: job?.promotion_paths,
            lateral_moves: job?.lateral_moves
          };
        })
      };
    }
    
    res.json({
      success: true,
      message: friendlyMessage,
      analysis: enrichedAnalysis,
      jobs: enrichedJobs
    });
    
  } catch (error) {
    console.error('人岗匹配分析失败:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

export default router;
