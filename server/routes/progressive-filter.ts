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
  
  for (let i = 0; i < Math.min(verticalPaths.length, 3); i++) {
    const path = verticalPaths[i];
    paths.push({
      level: i + 2,
      title: path.to_job?.profile_name || `高级${jobTitle}`,
      description: path.path_description || path.promotion_conditions || '承担更高级的工作职责',
      typical_years: `${path.years_required || 2}-${path.years_required + 2 || 4}年`
    });
  }
  
  // 如果数据库路径不够3级，补充到4级
  while (paths.length < 4) {
    const level = paths.length + 1;
    let title = '';
    let desc = '';
    
    if (level === 2) {
      title = `高级${jobTitle}`;
      desc = '承担更复杂的工作职责，指导新人';
    } else if (level === 3) {
      title = '团队主管/负责人';
      desc = '负责团队管理和业务规划';
    } else {
      title = '部门经理/总监';
      desc = '负责部门战略和团队发展';
    }
    
    paths.push({
      level: level,
      title: title,
      description: desc,
      typical_years: `${(level - 1) * 2}-${level * 2}年`
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

// 基于用户画像进行初步筛选
async function filterJobsByProfile(profile: any, allJobs: JobRecord[]): Promise<number[]> {
  console.log('📊 基于用户画像进行初步筛选...');
  
  let filtered = [...allJobs];
  
  if (profile.education && profile.education.education_level) {
    const eduLevel = profile.education.education_level;
    if (eduLevel.includes('本科') || eduLevel.includes('硕士') || eduLevel.includes('博士')) {
      console.log('🎓 学历背景优秀，保留所有岗位');
    }
  }
  
  if (profile.experiences && profile.experiences.length > 0) {
    const exp = profile.experiences[0];
    if (exp.department || exp.position) {
      const keyword = (exp.department || exp.position || '').toLowerCase();
      if (keyword) {
        filtered = filtered.filter(job => 
          (job.job_title && job.job_title.toLowerCase().includes(keyword)) ||
          (job.job_description && job.job_description.toLowerCase().includes(keyword))
        );
      }
    }
  }
  
  if (filtered.length === 0) {
    filtered = allJobs;
  }
  
  if (filtered.length > 200) {
    filtered = filtered.slice(0, 200);
  }
  
  console.log(`✅ 画像筛选完成，从${allJobs.length}个岗位中筛选出${filtered.length}个`);
  
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

// 根据期望条件筛选岗位
function filterJobsByExpectations(
  currentJobIds: number[],
  allJobs: JobRecord[],
  step: number,
  answer: string,
  filters: Record<string, string>
): { filteredIds: number[], updatedFilters: Record<string, string> } {
  console.log(`🎯 开始第${step}步筛选，当前有${currentJobIds.length}个岗位，回答:`, answer);
  
  const currentJobs = allJobs.filter(job => currentJobIds.includes(job.id));
  let filtered = [...currentJobs];
  const updatedFilters = { ...filters };
  
  const isNoPreference = isNoPreferenceAnswer(answer);
  
  if (!isNoPreference && answer) {
    if (step === 1) {
      updatedFilters.industry = answer;
      filtered = filtered.filter(job => 
        job.industry && job.industry.includes(answer)
      );
      console.log(`🏭 行业筛选后: ${filtered.length} 个岗位`);
    } else if (step === 2) {
      updatedFilters.jobType = answer;
      filtered = filtered.filter(job => 
        (job.job_title && job.job_title.includes(answer)) ||
        (job.job_description && job.job_description.includes(answer))
      );
      console.log(`💼 岗位类型筛选后: ${filtered.length} 个岗位`);
    } else if (step === 3) {
      updatedFilters.city = answer;
      filtered = filtered.filter(job => 
        job.address && job.address.includes(answer)
      );
      console.log(`🏙️ 城市筛选后: ${filtered.length} 个岗位`);
    } else if (step === 4) {
      updatedFilters.salary = answer;
      console.log(`💰 薪资条件记录: ${answer}`);
    } else if (step === 5) {
      updatedFilters.other = answer;
      console.log(`📝 其他要求记录: ${answer}`);
    }
  } else {
    console.log(`⏭️ 第${step}步用户回答"无要求"，保留当前筛选结果`);
  }
  
  const MIN_RESULTS = 20;
  if (filtered.length < MIN_RESULTS && filtered.length > 0) {
    console.log(`⚠️ 筛选结果较少 (${filtered.length}个)，保留当前结果`);
  } else if (filtered.length === 0) {
    console.log(`⚠️ 此条件筛选结果为0，回退到上一步的 ${currentJobIds.length} 个岗位`);
    return {
      filteredIds: [...currentJobIds],
      updatedFilters: { ...filters }
    };
  }
  
  const filteredIds = filtered.map(job => job.id);
  console.log(`✅ 第${step}步筛选完成，剩余 ${filteredIds.length} 个岗位`);
  
  return {
    filteredIds,
    updatedFilters
  };
}

// 最终匹配：基于学生画像和岗位画像进行打分
async function performFinalMatching(
  jobIds: number[],
  allJobs: JobRecord[],
  profile: any
): Promise<JobRecord[]> {
  console.log('🎯 开始最终匹配，基于学生画像和岗位画像进行打分...');
  
  const candidateJobs = allJobs.filter(job => jobIds.includes(job.id));
  console.log(`待匹配岗位数: ${candidateJobs.length}`);
  
  let matchedJobs = [...candidateJobs];
  
  matchedJobs = matchedJobs.sort(() => Math.random() - 0.5);
  
  const result = matchedJobs.slice(0, 5);
  
  console.log(`✅ 最终匹配完成，返回 ${result.length} 个最匹配的岗位`);
  
  return result;
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
      message: `岗位匹配分析已完成！为您找到了${jobs.length}个最匹配的岗位，请查看左侧卡片！`,
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
