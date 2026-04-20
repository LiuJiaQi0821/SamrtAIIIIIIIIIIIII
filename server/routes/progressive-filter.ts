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

interface JobRecord {
  id: number;
  job_title: string;
  company_name: string;
  salary_range: string;
  address: string;
  industry: string;
  company_type?: string;
  company_size?: string;
  job_description?: string;
}

interface FilterStateV2 {
  step: number;
  profileBasedJobIds: number[];
  currentFilteredJobIds: number[];
  filters: Record<string, string>;
  allJobs: JobRecord[];
  lastUpdated: number;
}

// 会话存储
const filterSessionsV2 = new Map<string, FilterStateV2>();

// 获取所有岗位
async function getAllJobs(): Promise<JobRecord[]> {
  const db = getSupabaseClient();
  if (!db) return [];
  
  try {
    const { data, error } = await db
      .from('jobs')
      .select('*')
      .limit(2000);
    
    if (error) {
      console.error('获取岗位数据失败:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('获取岗位数据出错:', error);
    return [];
  }
}

// 基于用户画像进行初步筛选（严格模式）
async function filterJobsByProfile(profile: any, allJobs: JobRecord[]): Promise<number[]> {
  console.log('📊 基于用户画像进行严格初步筛选...');
  
  let filtered = [...allJobs];
  const filterReasons: string[] = [];
  
  // 1. 学历筛选 - 保留匹配或低于学历要求的岗位
  if (profile && profile.education) {
    const eduLevel = profile.education.education_level || '';
    if (eduLevel) {
      // 根据学历过滤岗位描述中的要求
      const eduKeywords: Record<string, string[]> = {
        '博士': ['博士', 'PhD', '博士研究生'],
        '硕士': ['硕士', '研究生', 'Master'],
        '本科': ['本科', '学士', 'Bachelor', '大学'],
        '大专': ['大专', '专科', '高职'],
        '高中': ['高中', '中专']
      };
      
      // 找到当前学历及以下的所有关键词
      let allowedKeywords: string[] = [];
      for (const [level, keywords] of Object.entries(eduKeywords)) {
        allowedKeywords.push(...keywords);
        if (level === eduLevel || eduLevel.includes(level)) break;
      }
      
      // 过滤掉要求更高学历的岗位（可选，这里先保留所有）
      console.log(`🎓 学历: ${eduLevel}`);
    }
  }
  
  // 2. 专业匹配 - 这是关键筛选条件
  if (profile && (profile.education?.major || profile.major)) {
    const major = (profile.education?.major || profile.major || '').toLowerCase();
    if (major) {
      console.log(`📚 专业: ${major}`);
      
      // 专业关键词映射
      const majorKeywords: Record<string, string[]> = {
        '计算机': ['计算机', '软件', '开发', '编程', '程序', '前端', '后端', '全栈', '工程师', '技术', 'IT', '互联网', 'Java', 'Python', 'JavaScript', 'React', 'Vue', 'Node'],
        '软件': ['软件', '开发', '编程', '程序', '前端', '后端', '全栈', '工程师', '技术', 'IT', '互联网'],
        '电子': ['电子', '电路', '硬件', '嵌入式', '自动化', '通信', '电信'],
        '机械': ['机械', '制造', '设备', '工艺', '结构', '设计', 'CAD'],
        '金融': ['金融', '财务', '会计', '银行', '证券', '投资', '风控', '审计'],
        '市场': ['市场', '营销', '销售', '推广', '运营', '品牌', '公关'],
        '管理': ['管理', 'HR', '人力', '行政', '助理', '专员', '运营'],
        '设计': ['设计', 'UI', 'UX', '视觉', '平面', '交互', '美工', '创意'],
        '数据': ['数据', '分析', '算法', '统计', '挖掘', 'BI', '报表'],
        '会计': ['会计', '财务', '审计', '税务', '出纳', '核算'],
      };
      
      // 查找匹配的专业类别
      let matchedCategory = '';
      for (const [category, keywords] of Object.entries(majorKeywords)) {
        if (keywords.some(k => major.includes(k) || k.includes(major))) {
          matchedCategory = category;
          break;
        }
      }
      
      // 如果找到专业类别，进行岗位匹配
      if (matchedCategory) {
        const categoryKeywords = majorKeywords[matchedCategory];
        const beforeCount = filtered.length;
        
        filtered = filtered.filter(job => {
          const title = (job.job_title || '').toLowerCase();
          const desc = (job.job_description || '').toLowerCase();
          
          // 岗位标题或描述包含相关专业关键词
          return categoryKeywords.some(kw => 
            title.includes(kw) || desc.includes(kw)
          );
        });
        
        filterReasons.push(`专业匹配(${matchedCategory}): ${beforeCount} → ${filtered.length}`);
        console.log(`📚 专业筛选(${matchedCategory}): ${beforeCount} → ${filtered.length}`);
      }
    }
  }
  
  // 3. 技能匹配
  if (profile && profile.skills && Array.isArray(profile.skills) && profile.skills.length > 0) {
    const skills = profile.skills.map((s: any) => 
      typeof s === 'string' ? s.toLowerCase() : (s.name || '').toLowerCase()
    ).filter(Boolean);
    
    if (skills.length > 0) {
      console.log(`💡 技能: ${skills.join(', ')}`);
      
      const beforeCount = filtered.length;
      
      // 技能加分：优先展示包含相关技能的岗位
      filtered = filtered.map(job => {
        const title = (job.job_title || '').toLowerCase();
        const desc = (job.job_description || '').toLowerCase();
        
        let skillMatchCount = 0;
        for (const skill of skills) {
          if (title.includes(skill) || desc.includes(skill)) {
            skillMatchCount++;
          }
        }
        
        return { ...job, _skillMatchScore: skillMatchCount };
      });
      
      // 按技能匹配度排序
      filtered.sort((a: any, b: any) => (b._skillMatchScore || 0) - (a._skillMatchScore || 0));
      
      // 只保留至少匹配一个技能的岗位（如果结果足够的话）
      const withSkillMatch = filtered.filter((j: any) => (j._skillMatchScore || 0) > 0);
      if (withSkillMatch.length >= 10) {
        filtered = withSkillMatch;
      }
      
      filterReasons.push(`技能匹配: 保留${filtered.length}个`);
      console.log(`💡 技能筛选: ${beforeCount} → ${filtered.length} (有技能匹配的: ${withSkillMatch.length})`);
    }
  }
  
  // 4. 经验匹配 - 作为加分项而非硬性过滤（避免过度限制）
  if (profile && profile.experiences && profile.experiences.length > 0) {
    const exp = profile.experiences[0];
    const expText = [
      exp.department || '',
      exp.position || '',
      exp.company || '',
      exp.description || ''
    ].join(' ').toLowerCase();
    
    if (expText.trim()) {
      console.log(`🏢 经验: ${exp.position || exp.department || '有工作经验'}`);
      
      const beforeCount = filtered.length;
      
      // 提取经验关键词
      const expKeywords = expText.split(/[\s,，、;；]+/).filter((w: string) => w.length >= 2);
      
      // 【关键修改】经验只作为排序权重，不做硬性过滤
      // 给有经验匹配的岗位加分
      filtered = filtered.map(job => {
        const title = (job.job_title || '').toLowerCase();
        const desc = (job.job_description || '').toLowerCase();
        
        let expMatchCount = 0;
        for (const kw of expKeywords) {
          if (kw && (title.includes(kw) || desc.includes(kw))) {
            expMatchCount++;
          }
        }
        
        return { ...job, _expMatchScore: expMatchCount };
      });
      
      // 按经验匹配度排序（有经验的排前面）
      filtered.sort((a: any, b: any) => (b._expMatchScore || 0) - (a._expMatchScore || 0));
      
      // 保留所有岗位，但优先展示匹配的
      filterReasons.push(`经验加权: ${beforeCount}个候选（已按相关性排序）`);
      console.log(`🏢 经验加权: ${beforeCount}个候选（已按相关性排序）`);
    }
  }
  
  // 最终安全检查
  if (filtered.length === 0) {
    console.log('⚠️ 严格筛选无结果，使用宽松策略');
    // 宽松策略：只基于专业做一次宽泛筛选
    if (profile?.education?.major || profile?.major) {
      const major = (profile.education?.major || profile.major || '').toLowerCase();
      if (major) {
        filtered = allJobs.filter(job => {
          const title = (job.job_title || '').toLowerCase();
          const desc = (job.job_description || '').toLowerCase();
          return title.includes(major.slice(0, 2)) || desc.includes(major.slice(0, 2));
        });
      }
    }
    
    if (filtered.length === 0) {
      filtered = allJobs.slice(0, 100); // 最后兜底
    }
  }
  
  // 限制最大数量
  if (filtered.length > 200) {
    filtered = filtered.slice(0, 200);
  }
  
  console.log(`✅ 画像筛选完成: ${allJobs.length} → ${filtered.length} 个岗位`);
  console.log(`   筛选原因: ${filterReasons.join('; ')}`);
  
  return filtered.map(job => job.id);
}

// 判断是否是"无要求"的回答
function isNoPreferenceAnswer(answer: string): boolean {
  if (!answer) return false;
  const lowerAnswer = answer.toLowerCase();
  const noPreferenceKeywords = [
    '不限', '无要求', '没有要求', '随便', '都可以', '都可', 
    'any', 'no preference', 'whatever', '无所谓', '看情况', '没有特别',
    '都行', '都可以', '没有偏好'
  ];
  return noPreferenceKeywords.some(keyword => lowerAnswer.includes(keyword.toLowerCase()));
}

// 根据期望条件筛选岗位（严格模式 - 不轻易放松条件）
function filterJobsByExpectations(
  currentJobIds: number[],
  allJobs: JobRecord[],
  step: number,
  answer: string,
  filters: Record<string, string>
): { filteredIds: number[], updatedFilters: Record<string, string> } {
  console.log(`🎯 开始第${step}步严格筛选，当前有${currentJobIds.length}个岗位，回答:`, answer);
  
  const currentJobs = allJobs.filter(job => currentJobIds.includes(job.id));
  let filtered = [...currentJobs];
  const updatedFilters = { ...filters };
  
  const isNoPreference = isNoPreferenceAnswer(answer);
  
  if (!isNoPreference && answer) {
    if (step === 1) {
      // 行业筛选 - 使用模糊匹配
      updatedFilters.industry = answer;
      
      // 构建行业关键词（支持多种表达方式）
      const industryKeywords = buildIndustryKeywords(answer);
      
      filtered = filtered.filter(job => 
        job.industry && industryKeywords.some(kw => 
          job.industry.toLowerCase().includes(kw.toLowerCase())
        )
      );
      
      // 如果精确匹配结果太少，尝试更宽泛的匹配
      if (filtered.length < 5) {
        console.log(`⚠️ 行业精确匹配较少(${filtered.length})，尝试宽泛匹配`);
        filtered = currentJobs.filter(job => 
          job.industry || (job.job_description && job.job_description.includes(answer))
        );
      }
      
      console.log(`🏭 行业筛选后: ${filtered.length} 个岗位 (关键词: ${industryKeywords.join(',')})`);
      
    } else if (step === 2) {
      // 岗位类型筛选
      updatedFilters.jobType = answer;
      
      // 提取岗位类型关键词
      const jobTypeKeywords = extractJobTypeKeywords(answer);
      
      filtered = filtered.filter(job => 
        jobTypeKeywords.some(kw => 
          (job.job_title && job.job_title.includes(kw)) ||
          (job.job_description && job.job_description.includes(kw))
        )
      );
      
      console.log(`💼 岗位类型筛选后: ${filtered.length} 个岗位 (关键词: ${jobTypeKeywords.join(',')})`);
      
    } else if (step === 3) {
      // 城市筛选 - 支持模糊匹配
      updatedFilters.city = answer;
      
      // 城市别名映射
      const cityAliases: Record<string, string[]> = {
        '北京': ['北京', 'Beijing', 'BJ'],
        '上海': ['上海', 'Shanghai', 'SH'],
        '广州': ['广州', 'Guangzhou', 'GZ'],
        '深圳': ['深圳', 'Shenzhen', 'SZ'],
        '杭州': ['杭州', 'Hangzhou'],
        '成都': ['成都', 'Chengdu'],
        '武汉': ['武汉', 'Wuhan'],
        '南京': ['南京', 'Nanjing'],
        '西安': ['西安', "Xi'an"],
        '远程': ['远程', 'remote', '居家', '线上', '不限地点']
      };
      
      let cityMatched = false;
      for (const [city, aliases] of Object.entries(cityAliases)) {
        if (aliases.some(a => answer.includes(a) || a.includes(answer))) {
          filtered = filtered.filter(job => {
            if (!job.address) return false;
            return aliases.some(a => job.address!.includes(a));
          });
          cityMatched = true;
          break;
        }
      }
      
      if (!cityMatched) {
        filtered = filtered.filter(job => 
          job.address && job.address.includes(answer)
        );
      }
      
      console.log(`🏙️ 城市筛选后: ${filtered.length} 个岗位`);
      
    } else if (step === 4) {
      // 薪资筛选 - 记录但不强制过滤（避免过度限制）
      updatedFilters.salary = answer;
      
      // 解析薪资要求并过滤
      const salaryResult = filterBySalary(filtered, answer);
      filtered = salaryResult.filtered;
      
      console.log(`💰 薪资筛选后: ${filtered.length} 个岗位 (${answer})`);
      
    } else if (step === 5) {
      // 其他要求 - 关键词搜索
      updatedFilters.other = answer;
      
      const otherKeywords = answer.split(/[,，、\s]+/).filter(k => k.length >= 2);
      if (otherKeywords.length > 0) {
        filtered = filtered.filter(job => 
          otherKeywords.some(kw => 
            (job.job_title && job.job_title.includes(kw)) ||
            (job.job_description && job.job_description.includes(kw)) ||
            (job.company_name && job.company_name.includes(kw))
          )
        );
      }
      
      console.log(`📝 其他要求筛选后: ${filtered.length} 个岗位`);
    }
  } else if (isNoPreference) {
    console.log(`⏭️ 第${step}步用户回答"无要求"，保留当前筛选结果（不扩展）`);
  }
  
  // 【关键修改】提高最小结果数阈值，不轻易回退
  const MIN_RESULTS = 10; // 从20提高到10（更严格）
  const ABSOLUTE_MIN = 3; // 绝对最小值
  
  if (filtered.length < MIN_RESULTS && filtered.length >= ABSOLUTE_MIN) {
    console.log(`⚠️ 筛选结果较少 (${filtered.length}个)，但保留严格筛选结果（>=${ABSOLUTE_MIN}）`);
  } else if (filtered.length < ABSOLUTE_MIN && filtered.length > 0) {
    console.log(`⚠️ 筛选结果过少 (${filtered.length}个)，适当放宽条件`);
    // 放宽：在原始候选中重新用更宽松的条件筛选
    filtered = relaxFilterConditions(currentJobs, step, answer, filters);
  } else if (filtered.length === 0) {
    console.log(`⚠️ 此条件筛选结果为0，保留上一步的 ${currentJobIds.length} 个岗位`);
    return {
      filteredIds: [...currentJobIds],
      updatedFilters: { ...filters } // 不更新过滤器
    };
  }
  
  const filteredIds = filtered.map(job => job.id);
  console.log(`✅ 第${step}步筛选完成，剩余 ${filteredIds.length} 个岗位`);
  
  return {
    filteredIds,
    updatedFilters
  };
}

// 构建行业关键词（支持多种表达方式）
function buildIndustryKeywords(industry: string): string[] {
  const baseKeyword = industry.trim();
  const keywords = [baseKeyword];
  
  // 行业别名映射
  const industryAliases: Record<string, string[]> = {
    '互联网': ['互联网', 'IT', '科技', '计算机', '软件', '信息'],
    '金融': ['金融', '银行', '证券', '保险', '基金', '投资', '财务'],
    '教育': ['教育', '培训', '学校', '大学', '在线教育'],
    '医疗': ['医疗', '健康', '医院', '医药', '生物', '制药'],
    '制造': ['制造', '工厂', '生产', '工业', '汽车', '电子'],
    '零售': ['零售', '电商', '销售', '商贸', '超市', '购物'],
    '房地产': ['房地产', '地产', '建筑', '物业', '装修'],
    '传媒': ['传媒', '媒体', '广告', '新闻', '出版', '文化'],
  };
  
  for (const [main, aliases] of Object.entries(industryAliases)) {
    if (baseKeyword.includes(main) || main.includes(baseKeyword)) {
      keywords.push(...aliases);
      break;
    }
  }
  
  return [...new Set(keywords)]; // 去重
}

// 提取岗位类型关键词
function extractJobTypeKeywords(jobType: string): string[] {
  const baseKeyword = jobType.trim();
  const keywords = [baseKeyword];
  
  // 岗位类型别名
  const typeAliases: Record<string, string[]> = {
    '开发': ['开发', '工程师', '程序员', '开发工程师', '软件开发'],
    '前端': ['前端', 'Web', 'H5', '页面', 'UI开发'],
    '后端': ['后端', '服务端', 'Server', 'API', '接口'],
    '产品': ['产品', 'PM', '产品经理', '产品设计'],
    '设计': ['设计', 'UI', 'UX', '视觉', '交互', '平面'],
    '运营': ['运营', '操作', '推广', '活动', '用户运营'],
    '测试': ['测试', 'QA', '质量', 'SDET', '自动化'],
    '数据': ['数据', '分析', 'BI', '报表', '统计'],
    '算法': ['算法', 'AI', '机器学习', 'ML', '深度学习', 'NLP'],
    '管理': ['管理', '主管', '经理', '总监', '负责人', 'Team Leader'],
  };
  
  for (const [main, aliases] of Object.entries(typeAliases)) {
    if (baseKeyword.includes(main) || main.includes(baseKeyword)) {
      keywords.push(...aliases);
      break;
    }
  }
  
  // 添加拆分的关键词
  const parts = baseKeyword.split(/[\s\/\\+&]+/).filter(p => p.length >= 2);
  keywords.push(...parts);
  
  return [...new Set(keywords)];
}

// 薪资过滤
function filterBySalary(jobs: JobRecord[], salaryReq: string): { filtered: JobRecord[] } {
  let filtered = jobs;
  
  // 解析薪资要求中的数字
  const numbers = salaryReq.match(/\d+/g);
  if (numbers && numbers.length > 0) {
    const minSalary = parseInt(numbers[0]);
    
    if (minSalary >= 1000) {
      // 用户输入的是月薪（如 10000、15k 等）
      filtered = jobs.filter(job => {
        if (!job.salary_range) return true; // 没有薪资信息的保留
        
        const jobSalary = parseSalaryRange(job.salary_range);
        return jobSalary.min >= minSalary * 0.7; // 允许一定浮动
      });
    }
  }
  
  return { filtered };
}

// 解析薪资范围字符串
function parseSalaryRange(salaryStr: string): { min: number; max: number } {
  // 匹配各种格式：10-20k、10000-20000、10k-20k、1万-2万等
  const matches = salaryStr.match(/(\d+(?:\.\d+)?)[kK万千]?[\-\~至到]*(\d+(?:\.\d+)?)[kK万千]?/);
  
  if (matches) {
    let min = parseFloat(matches[1]);
    let max = parseFloat(matches[2]);
    
    // 处理单位
    if (salaryStr.includes('万')) {
      min *= 10000;
      max *= 10000;
    } else if (salaryStr.toLowerCase().includes('k') || !salaryStr.includes('元')) {
      min *= 1000;
      max *= 1000;
    }
    
    return { min, max };
  }
  
  return { min: 0, max: Infinity };
}

// 放宽筛选条件（仅在结果极少时使用）
function relaxFilterConditions(
  jobs: JobRecord[],
  step: number,
  answer: string,
  filters: Record<string, string>
): JobRecord[] {
  console.log(`🔓 第${step}步放宽筛选条件`);
  
  switch (step) {
    case 1: // 行业放宽
      return jobs.slice(0, 30); // 返回更多候选
      
    case 2: // 岗位类型放宽
      // 只保留包含部分关键词的
      const partialKeywords = answer.split(/[,，、\s]+/).filter(k => k.length >= 1);
      if (partialKeywords.length > 0) {
        return jobs.filter(job =>
          partialKeywords.some(kw => kw.length >= 2 && (
            (job.job_title && job.job_title.includes(kw)) ||
            (job.job_description && job.job_description.substring(0, 200).includes(kw))
          ))
        ).slice(0, 30);
      }
      return jobs.slice(0, 30);
      
    default:
      return jobs.slice(0, Math.max(10, Math.floor(jobs.length * 0.3)));
  }
}

// 最终匹配：基于学生画像和岗位画像进行多维度打分（严格模式）
async function performFinalMatching(
  jobIds: number[],
  allJobs: JobRecord[],
  profile: any
): Promise<JobRecord[]> {
  console.log('🎯 开始最终匹配，基于多维度打分算法...');
  
  const candidateJobs = allJobs.filter(job => jobIds.includes(job.id));
  console.log(`待匹配岗位数: ${candidateJobs.length}`);
  
  if (candidateJobs.length === 0) {
    console.log('⚠️ 无候选岗位，返回空结果');
    return [];
  }
  
  // 提取用户画像关键信息
  const userInfo = extractUserInfo(profile);
  console.log(`用户画像摘要: 专业=${userInfo.major}, 学历=${userInfo.education}, 技能数=${userInfo.skills.length}`);
  
  // 对每个候选岗位进行多维度打分
  const scoredJobs = candidateJobs.map(job => {
    const scores = calculateJobMatchScore(job, userInfo);
    return {
      job,
      ...scores
    };
  });
  
  // 按综合得分排序（降序）
  scoredJobs.sort((a, b) => b.overallScore - a.overallScore);
  
  // 输出打分详情（前10个）
  console.log('\n📊 岗位匹配得分排名:');
  scoredJobs.slice(0, 10).forEach((sj, idx) => {
    console.log(`  ${idx + 1}. ${sj.job.job_title} - 总分:${sj.overallScore.toFixed(1)} [专业:${sj.majorMatch}, 技能:${sj.skillMatch}, 经验:${sj.expMatch}, 综合:${sj.comprehensiveMatch}]`);
  });
  
  // 返回Top 5（确保都是高质量匹配）
  const result = scoredJobs
    .filter(sj => sj.overallScore >= 30) // 最低分数门槛
    .slice(0, 5)
    .map(sj => ({
      ...sj.job,
      _matchDetails: {
        overall_score: Math.round(sj.overallScore),
        dimension_scores: {
          basic_requirements: Math.round(sj.majorMatch),
          professional_skills: Math.round(sj.skillMatch),
          professional_quality: Math.round(sj.expMatch),
          development_potential: Math.round(sj.comprehensiveMatch)
        }
      }
    }));
  
  // 如果高质量结果不足5个，适当降低门槛补充
  if (result.length < 3 && scoredJobs.length > result.length) {
    const additional = scoredJobs
      .slice(result.length)
      .filter(sj => sj.overallScore >= 20)
      .slice(0, 5 - result.length)
      .map(sj => ({
        ...sj.job,
        _matchDetails: {
          overall_score: Math.round(sj.overallScore),
          dimension_scores: {
            basic_requirements: Math.round(sj.majorMatch),
            professional_skills: Math.round(sj.skillMatch),
            professional_quality: Math.round(sj.expMatch),
            development_potential: Math.round(sj.comprehensiveMatch)
          }
        }
      }));
    result.push(...additional);
  }
  
  console.log(`✅ 最终匹配完成，返回 ${result.length} 个最匹配的岗位`);
  
  return result;
}

// 提取用户画像信息
function extractUserInfo(profile: any): {
  major: string;
  education: string;
  skills: string[];
  experiences: Array<{position?: string; department?: string}>;
  radarScores: Record<string, number>;
} {
  // 提取专业
  let major = '';
  if (profile?.education?.major) {
    major = profile.education.major;
  } else if (profile?.studentProfile?.education?.major) {
    major = profile.studentProfile.education.major;
  } else if (profile?.studentProfile?.basic_info?.name) {
    // 尝试从其他字段推断
    major = '计算机科学'; // 默认值
  }
  
  // 提取学历
  let education = '';
  if (profile?.education?.education_level) {
    education = profile.education.education_level;
  } else if (profile?.studentProfile?.education?.education_level) {
    education = profile.studentProfile.education.education_level;
  }
  
  // 提取技能
  let skills: string[] = [];
  if (profile?.skills && Array.isArray(profile.skills)) {
    skills = profile.skills.map((s: any) => typeof s === 'string' ? s : s.name || '').filter(Boolean);
  } else if (profile?.abilityAnalysis) {
    // 从能力分析中提取技能
    for (const category of ['专业技能', '证书', '软技能']) {
      if (profile.abilityAnalysis[category] && Array.isArray(profile.abilityAnalysis[category])) {
        skills.push(...profile.abilityAnalysis[category]);
      }
    }
  }
  
  // 提取经验
  let experiences: Array<{position?: string; department?: string}> = [];
  if (profile?.experiences && Array.isArray(profile.experiences)) {
    experiences = profile.experiences;
  } else if (profile?.studentProfile?.experiences) {
    experiences = profile.studentProfile.experiences;
  }
  
  // 提取雷达图分数
  let radarScores: Record<string, number> = {};
  if (profile?.studentProfile?.radar_scores) {
    radarScores = profile.studentProfile.radar_scores;
  }
  
  return { major, education, skills, experiences, radarScores };
}

// 计算单个岗位的匹配分数
function calculateJobMatchScore(job: JobRecord, userInfo: {
  major: string;
  education: string;
  skills: string[];
  experiences: Array<{position?: string; department?: string}>;
  radarScores: Record<string, number>;
}): {
  overallScore: number;
  majorMatch: number;
  skillMatch: number;
  expMatch: number;
  comprehensiveMatch: number;
} {
  const title = (job.job_title || '').toLowerCase();
  const desc = (job.job_description || '').toLowerCase();
  const combinedText = `${title} ${desc}`;
  
  // 1. 专业匹配度 (0-30分)
  let majorMatch = 0;
  if (userInfo.major) {
    const majorLower = userInfo.major.toLowerCase();
    
    // 直接匹配
    if (title.includes(majorLower) || desc.includes(majorLower)) {
      majorMatch = 25;
    }
    
    // 专业关键词匹配
    const majorKeywordMap: Record<string, string[]> = {
      '计算机': ['软件', '开发', '编程', '程序', '前端', '后端', '全栈', '工程师', '技术', 'IT', '互联网', 'Java', 'Python', 'JavaScript', 'React', 'Vue', 'Node.js'],
      '软件': ['开发', '编程', '程序', '前端', '后端', '全栈', '工程师', '技术', 'IT', '互联网'],
      '电子': ['电子', '电路', '硬件', '嵌入式', '自动化', '通信'],
      '机械': ['机械', '制造', '设备', '工艺', '结构', '设计'],
      '金融': ['金融', '财务', '会计', '银行', '证券', '投资', '风控'],
      '市场': ['市场', '营销', '销售', '推广', '运营', '品牌'],
      '管理': ['管理', 'HR', '人力', '行政', '助理', '专员'],
      '设计': ['设计', 'UI', 'UX', '视觉', '平面', '交互'],
      '数据': ['数据', '分析', '算法', '统计', '挖掘', 'BI'],
      '会计': ['会计', '财务', '审计', '税务', '出纳'],
    };
    
    for (const [category, keywords] of Object.entries(majorKeywordMap)) {
      if (majorLower.includes(category)) {
        const matchCount = keywords.filter(kw => combinedText.includes(kw)).length;
        majorMatch = Math.max(majorMatch, Math.min(25, matchCount * 5));
        break;
      }
    }
    
    // 宽泛匹配（部分关键词）
    if (majorMatch < 15) {
      const broadKeywords = majorLower.split(/[\s,，、]+/).filter(w => w.length >= 2);
      for (const kw of broadKeywords) {
        if (combinedText.includes(kw)) {
          majorMatch += 3;
        }
      }
      majorMatch = Math.min(majorMatch, 18);
    }
    
    // 基础分（同领域）
    if (majorMatch < 5) {
      majorMatch = 5; // 给一个基础分
    }
  }
  
  // 2. 技能匹配度 (0-35分)
  let skillMatch = 0;
  if (userInfo.skills.length > 0) {
    const matchedSkills: string[] = [];
    const partialMatchedSkills: string[] = [];
    
    for (const skill of userInfo.skills) {
      const skillLower = skill.toLowerCase();
      
      // 精确匹配
      if (combinedText.includes(skillLower)) {
        matchedSkills.push(skill);
        skillMatch += 8;
      } else {
        // 部分匹配（技能词的一部分）
        const skillParts = skillLower.split(/[\s\/\\+&]+/);
        for (const part of skillParts) {
          if (part.length >= 2 && combinedText.includes(part)) {
            partialMatchedSkills.push(skill);
            skillMatch += 3;
            break;
          }
        }
      }
    }
    
    // 技能覆盖率加成
    const coverageRatio = (matchedSkills.length + partialMatchedSkills.length * 0.5) / userInfo.skills.length;
    if (coverageRatio >= 0.7) {
      skillMatch += 8; // 高覆盖率奖励
    } else if (coverageRatio >= 0.4) {
      skillMatch += 4;
    }
    
    skillMatch = Math.min(skillMatch, 35);
  } else {
    skillMatch = 10; // 无技能信息时给基础分
  }
  
  // 3. 经验匹配度 (0-20分)
  let expMatch = 0;
  if (userInfo.experiences.length > 0) {
    const expTexts = userInfo.experiences.map(e => [
      e.position || '',
      e.department || '',
      e.company || ''
    ].join(' ').toLowerCase()).join(' ');
    
    const expKeywords = expTexts.split(/[\s,，、;；]+/).filter(w => w.length >= 2);
    
    for (const kw of expKeywords) {
      if (combinedText.includes(kw)) {
        expMatch += 4;
      }
    }
    
    // 职位级别匹配
    const hasJuniorExp = expTexts.includes('实习') || expTexts.includes('初级') || expTexts.includes('助理');
    const isEntryLevelJob = title.includes('实习') || title.includes('初级') || title.includes('助理') || title.includes('应届');
    
    if (hasJuniorExp && isEntryLevelJob) {
      expMatch += 6;
    }
    
    expMatch = Math.min(expMatch, 20);
  } else {
    expMatch = 5; // 无经验时给基础分（适合入门岗位）
  }
  
  // 4. 综合潜力匹配 (0-15分)
  let comprehensiveMatch = 8; // 基础分
  
  // 雷达图分数加成
  if (Object.keys(userInfo.radarScores).length > 0) {
    const avgRadar = Object.values(userInfo.radarScores).reduce((a, b) => a + b, 0) / Object.values(userInfo.radarScores).length;
    if (avgRadar >= 75) {
      comprehensiveMatch += 4;
    } else if (avgRadar >= 60) {
      comprehensiveMatch += 2;
    }
  }
  
  // 学习能力/发展潜力关键词
  const potentialKeywords = ['学习', '成长', '发展', '培训', '培养', '新人', '应届', '潜力'];
  const potentialMatchCount = potentialKeywords.filter(kw => desc.includes(kw)).length;
  comprehensiveMatch += Math.min(potentialMatchCount * 1.5, 4);
  
  comprehensiveMatch = Math.min(comprehensiveMatch, 15);
  
  // 计算总分
  const overallScore = majorMatch + skillMatch + expMatch + comprehensiveMatch;
  
  return {
    overallScore,
    majorMatch,
    skillMatch,
    expMatch,
    comprehensiveMatch
  };
}

// ========== 新的API接口 ==========

// 初始化筛选会话（基于用户画像进行初步筛选）
router.post('/api/progressive-filter-v2/init', async (req, res) => {
  try {
    const { sessionId, profile } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'sessionId is required' });
    }
    
    console.log('🚀 初始化V2渐进式筛选会话:', sessionId);
    console.log('用户画像:', profile ? Object.keys(profile) : '无');
    
    // 获取所有岗位数据
    const allJobs = await getAllJobs();
    console.log(`加载了 ${allJobs.length} 个岗位数据`);
    
    // 基于用户画像进行初步筛选
    const profileBasedJobIds = await filterJobsByProfile(profile, allJobs);
    
    // 创建筛选状态
    const filterState: FilterStateV2 = {
      step: 0,
      profileBasedJobIds,
      currentFilteredJobIds: [...profileBasedJobIds],
      filters: {},
      allJobs,
      lastUpdated: Date.now()
    };
    
    // 存储会话状态
    filterSessionsV2.set(sessionId, filterState);
    
    res.json({
      success: true,
      totalJobs: allJobs.length,
      candidateCount: profileBasedJobIds.length,
      message: `已基于您的画像筛选出 ${profileBasedJobIds.length} 个候选岗位`
    });
    
  } catch (error) {
    console.error('初始化V2渐进式筛选失败:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// 逐步筛选API（V2版本）
router.post('/api/progressive-filter-v2/step', async (req, res) => {
  try {
    const { sessionId, step, answer } = req.body;
    
    if (!sessionId || step === undefined || step < 1 || step > 5) {
      return res.status(400).json({ 
        success: false, 
        error: 'sessionId和有效的step (1-5) 是必需的' 
      });
    }
    
    console.log(`🎯 处理V2第${step}步筛选，回答:`, answer);
    
    // 获取会话状态
    const filterState = filterSessionsV2.get(sessionId);
    if (!filterState) {
      return res.status(400).json({ 
        success: false, 
        error: '会话不存在，请先调用init接口' 
      });
    }
    
    // 判断是否是"无要求"的回答
    const isNoPreference = isNoPreferenceAnswer(answer);
    if (isNoPreference) {
      console.log(`⏭️ 第${step}步用户回答"无要求"，跳过筛选`);
    }
    
    // 在当前候选库中继续筛选
    const result = filterJobsByExpectations(
      filterState.currentFilteredJobIds,
      filterState.allJobs,
      step,
      answer,
      filterState.filters
    );
    
    // 更新筛选状态
    filterState.step = step;
    filterState.currentFilteredJobIds = result.filteredIds;
    filterState.filters = result.updatedFilters;
    filterState.lastUpdated = Date.now();
    
    // 保存更新后的状态
    filterSessionsV2.set(sessionId, filterState);
    
    console.log(`第${step}步筛选完成，剩余岗位数: ${result.filteredIds.length}`);
    
    // 返回结果（前端不展示，只确认收到）
    res.json({
      success: true,
      step,
      remainingCount: result.filteredIds.length,
      wasSkipped: isNoPreference,
      message: isNoPreference ? '已跳过此步筛选' : '筛选完成'
    });
    
  } catch (error) {
    console.error('V2逐步筛选失败:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// 获取最终筛选结果并进行AI匹配（V2版本）
router.post('/api/progressive-filter-v2/final', async (req, res) => {
  try {
    const { sessionId, profile } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ 
        success: false, 
        error: 'sessionId是必需的' 
      });
    }
    
    console.log('🎉 获取V2最终筛选结果，进行AI匹配');
    
    // 获取会话状态
    const filterState = filterSessionsV2.get(sessionId);
    if (!filterState) {
      return res.status(400).json({ 
        success: false, 
        error: '会话不存在，请先调用init接口' 
      });
    }
    
    console.log(`当前候选岗位数: ${filterState.currentFilteredJobIds.length}`);
    
    // 最终匹配：基于学生画像和岗位画像进行打分
    const matchedJobs = await performFinalMatching(
      filterState.currentFilteredJobIds,
      filterState.allJobs,
      profile
    );
    
    // 加载岗位画像
    const jobProfiles = await loadJobProfiles();
    
    // 格式化岗位数据，并从数据库查询晋升路径和横向换岗路径
    const jobs = await Promise.all(matchedJobs.map(async (job) => {
      const formattedJob = {
        id: job.id,
        title: job.job_title,
        company: job.company_name,
        salary: job.salary_range,
        location: job.address,
        industry: job.industry,
        company_type: job.company_type,
        company_size: job.company_size,
        description: job.job_description
      };
      
      // 从数据库查询并添加晋升路径和横向换岗路径
      return await enrichJobWithPaths(formattedJob, jobProfiles);
    }));
    
    console.log(`最终匹配完成，返回 ${jobs.length} 个岗位（已添加真实数据库职业路径）`);
    
    // 清理会话
    filterSessionsV2.delete(sessionId);
    
    res.json({
      success: true,
      message: `岗位匹配分析已完成！为您找到了${jobs.length}个最匹配的岗位，请查看左侧卡片！\n\n您需要我为您输出一份职业规划报告吗？我可以基于您的简历和匹配的岗位，为您制定详细的职业发展路径规划。`,
      jobs,
      totalCount: jobs.length,
      candidateCount: filterState.currentFilteredJobIds.length
    });
    
  } catch (error) {
    console.error('获取V2最终筛选结果失败:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

export default router;
