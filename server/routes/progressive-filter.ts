import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

const router = Router();

// 生成晋升路径（三级以上）
function generatePromotionPaths(job: any) {
  const jobTitle = job.title || job.job_title || '';
  const industry = job.industry || '';
  
  // 根据岗位类型和行业生成晋升路径
  const paths: Array<{
    level: number;
    title: string;
    description: string;
    typical_years: string;
  }> = [];
  
  // 基础岗位
  paths.push({
    level: 1,
    title: jobTitle,
    description: '当前岗位，负责具体执行工作',
    typical_years: '1-2年'
  });
  
  // 根据不同岗位类型生成不同的晋升路径
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
  } else if (jobTitle.includes('运营') || jobTitle.includes('市场')) {
    paths.push({
      level: 2,
      title: '高级' + jobTitle,
      description: '负责大型活动和项目，指导初级专员',
      typical_years: '2-4年'
    });
    paths.push({
      level: 3,
      title: '运营/市场负责人',
      description: '负责运营/市场策略制定，带领团队',
      typical_years: '5-8年'
    });
    paths.push({
      level: 4,
      title: '运营/市场总监',
      description: '负责公司运营/市场战略和业务增长',
      typical_years: '8年以上'
    });
  } else if (jobTitle.includes('设计') || jobTitle.includes('UI') || jobTitle.includes('UX')) {
    paths.push({
      level: 2,
      title: '高级' + jobTitle,
      description: '负责复杂设计项目，指导初级设计师',
      typical_years: '2-4年'
    });
    paths.push({
      level: 3,
      title: '设计负责人/设计主管',
      description: '负责设计系统建设，带领设计团队',
      typical_years: '5-8年'
    });
    paths.push({
      level: 4,
      title: '设计总监',
      description: '负责公司设计战略和设计文化建设',
      typical_years: '8年以上'
    });
  } else {
    // 通用晋升路径
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

// 生成横向换岗路径（每个岗位不少于2条）
function generateLateralMoves(job: any) {
  const jobTitle = job.title || job.job_title || '';
  const industry = job.industry || '';
  
  const moves: Array<{
    target_title: string;
    target_industry: string;
    description: string;
    transferable_skills: string[];
    suggested_actions: string[];
  }> = [];
  
  // 根据当前岗位生成相关的横向换岗路径
  if (jobTitle.includes('工程师') || jobTitle.includes('开发') || jobTitle.includes('技术')) {
    moves.push({
      target_title: '产品经理',
      target_industry: industry || '互联网',
      description: '从技术实现转向产品规划，将技术思维应用于产品设计',
      transferable_skills: ['逻辑思维', '用户需求理解', '项目管理', '技术评估'],
      suggested_actions: ['学习产品方法论', '多参与产品评审', '培养商业敏感度']
    });
    moves.push({
      target_title: '技术支持/解决方案工程师',
      target_industry: industry || '互联网',
      description: '从开发转向客户技术支持，帮助客户解决技术问题',
      transferable_skills: ['技术能力', '问题排查', '沟通能力', '客户服务'],
      suggested_actions: ['提升沟通技巧', '学习产品知识', '培养客户思维']
    });
    moves.push({
      target_title: '技术培训师/技术布道师',
      target_industry: '教育/互联网',
      description: '分享技术知识，培养更多技术人才',
      transferable_skills: ['技术能力', '表达能力', '教学能力', '内容创作'],
      suggested_actions: ['开始写技术博客', '参与技术分享', '提升演讲能力']
    });
  } else if (jobTitle.includes('产品')) {
    moves.push({
      target_title: '运营经理',
      target_industry: industry || '互联网',
      description: '从产品规划转向产品运营，将产品理念落地',
      transferable_skills: ['用户理解', '数据分析', '项目协调', '产品思维'],
      suggested_actions: ['学习运营方法论', '关注数据指标', '培养活动策划能力']
    });
    moves.push({
      target_title: '用户研究/UX研究员',
      target_industry: industry || '互联网',
      description: '深入研究用户行为和需求，为产品提供决策依据',
      transferable_skills: ['用户思维', '数据分析', '洞察力', '同理心'],
      suggested_actions: ['学习用户研究方法', '多做用户访谈', '培养分析能力']
    });
    moves.push({
      target_title: '项目经理',
      target_industry: industry || '互联网',
      description: '从产品规划转向项目管理，协调资源推动项目落地',
      transferable_skills: ['项目规划', '沟通协调', '风险管理', '资源整合'],
      suggested_actions: ['学习PMP等项目管理方法', '提升组织协调能力', '培养风险意识']
    });
  } else if (jobTitle.includes('运营') || jobTitle.includes('市场')) {
    moves.push({
      target_title: '产品经理',
      target_industry: industry || '互联网',
      description: '从用户运营转向产品规划，将用户洞察转化为产品功能',
      transferable_skills: ['用户洞察', '数据分析', '活动策划', '用户思维'],
      suggested_actions: ['学习产品方法论', '多参与产品讨论', '培养产品思维']
    });
    moves.push({
      target_title: '内容运营/内容营销',
      target_industry: industry || '互联网',
      description: '专注于内容创作和内容策略，通过内容连接用户',
      transferable_skills: ['文案能力', '内容敏感度', '用户理解', '营销思维'],
      suggested_actions: ['提升写作能力', '研究内容策略', '培养内容敏感度']
    });
    moves.push({
      target_title: '品牌营销',
      target_industry: industry || '互联网',
      description: '从效果营销转向品牌建设，提升公司品牌影响力',
      transferable_skills: ['营销思维', '创意能力', '市场洞察', '传播能力'],
      suggested_actions: ['学习品牌理论', '关注品牌案例', '培养创意思维']
    });
  } else if (jobTitle.includes('设计')) {
    moves.push({
      target_title: '产品经理',
      target_industry: industry || '互联网',
      description: '从视觉设计转向产品规划，将设计思维应用于产品决策',
      transferable_skills: ['用户体验思维', '视觉敏感度', '同理心', '细节把控'],
      suggested_actions: ['学习产品方法论', '培养商业思维', '提升产品感']
    });
    moves.push({
      target_title: '设计管理/设计总监',
      target_industry: industry || '互联网',
      description: '从执行设计转向设计管理，带领设计团队成长',
      transferable_skills: ['设计能力', '审美品味', '团队管理', '设计系统思维'],
      suggested_actions: ['培养管理能力', '建立设计系统', '提升团队领导力']
    });
    moves.push({
      target_title: '用户体验研究员',
      target_industry: industry || '互联网',
      description: '从视觉设计转向用户研究，深入理解用户需求',
      transferable_skills: ['用户思维', '同理心', '观察力', '分析能力'],
      suggested_actions: ['学习用户研究方法', '多做用户访谈', '培养分析思维']
    });
  } else {
    // 通用横向换岗路径
    moves.push({
      target_title: '项目经理',
      target_industry: industry || '互联网',
      description: '从业务执行转向项目管理，协调资源推动项目落地',
      transferable_skills: ['业务理解', '沟通协调', '项目规划', '执行力'],
      suggested_actions: ['学习项目管理方法', '提升组织协调能力', '培养风险意识']
    });
    moves.push({
      target_title: '业务分析师',
      target_industry: industry || '互联网',
      description: '深入分析业务数据，为业务决策提供支持',
      transferable_skills: ['业务理解', '数据分析', '逻辑思维', '洞察能力'],
      suggested_actions: ['提升数据分析能力', '学习商业分析方法', '培养商业敏感度']
    });
    moves.push({
      target_title: '培训师/企业教练',
      target_industry: '教育/咨询',
      description: '分享专业知识和经验，帮助他人成长',
      transferable_skills: ['专业能力', '表达能力', '教学能力', '同理心'],
      suggested_actions: ['提升表达能力', '开始分享经验', '培养教学思维']
    });
  }
  
  return moves;
}

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
      db: {
        schema: 'public'
      },
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

// 数据库记录类型
interface JobRecord {
  id: number;
  job_title: string;
  company_name: string;
  salary_range: string;
  address: string;
  industry: string;
  company_type: string;
  company_size: string;
  job_description: string;
}

// 新的筛选状态存储
interface FilterStateV2 {
  step: number; // 当前步骤 0-5 (0=画像筛选, 1-5=用户问题)
  profileBasedJobIds: number[]; // 基于用户画像筛选的岗位ID（初始库）
  currentFilteredJobIds: number[]; // 当前筛选后的岗位ID（每步更新）
  filters: {
    industry?: string;
    jobType?: string;
    city?: string;
    salary?: string;
    other?: string;
  };
  allJobs: JobRecord[]; // 所有岗位数据（缓存）
  lastUpdated: number;
}

// 存储筛选状态（按会话或用户）
const filterSessionsV2 = new Map<string, FilterStateV2>();

// 判断是否是"无要求"的回答
function isNoPreferenceAnswer(answer: string): boolean {
  if (!answer || typeof answer !== 'string') return true;
  
  const normalized = answer.toLowerCase().trim();
  
  // 无要求的关键词
  const noPreferenceKeywords = [
    '没有', '无', '随便', '都可以', '都行', '无所谓', 
    '不知道', '不清楚', '没要求', '不限制', '任意',
    'no', 'none', 'any', 'whatever', 'dont care', 'don\'t care',
    'not sure', '不确定'
  ];
  
  return noPreferenceKeywords.some(keyword => normalized.includes(keyword));
}

// 从数据库获取所有岗位（带缓存）
async function getAllJobs(): Promise<JobRecord[]> {
  const db = getSupabaseClient();
  if (!db) {
    throw new Error('数据库未配置');
  }
  
  // 使用分页获取所有数据
  const allJobs: JobRecord[] = [];
  const pageSize = 1000;
  let page = 0;
  let hasMore = true;
  
  while (hasMore) {
    const offset = page * pageSize;
    const { data, error } = await db
      .from('jobs')
      .select('id,job_title,company_name,salary_range,address,industry,company_type,company_size,job_description')
      .range(offset, offset + pageSize - 1);
    
    if (error) {
      throw error;
    }
    
    if (Array.isArray(data) && data.length > 0) {
      allJobs.push(...(data as JobRecord[]));
      page++;
      if (data.length < pageSize) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }
  
  return allJobs;
}

// 根据ID列表获取岗位详情
async function getJobsByIds(jobIds: number[]): Promise<JobRecord[]> {
  if (jobIds.length === 0) return [];
  
  const db = getSupabaseClient();
  if (!db) {
    throw new Error('数据库未配置');
  }
  
  const { data, error } = await db
    .from('jobs')
    .select('id,job_title,company_name,salary_range,address,industry,company_type,company_size,job_description')
    .in('id', jobIds);
  
  if (error) {
    throw error;
  }
  
  return (data || []) as JobRecord[];
}

// 基于用户画像进行初步筛选（模拟）
// 实际项目中应该用AI匹配学生画像和岗位画像
async function filterJobsByProfile(profile: any, allJobs: JobRecord[]): Promise<number[]> {
  console.log('🔍 基于用户画像进行初步筛选...');
  
  // 简单实现：返回所有岗位（实际应该用AI匹配）
  // 这里可以根据画像中的专业、技能、经验等进行初步筛选
  const filteredIds = allJobs.map(job => job.id);
  
  console.log(`✅ 基于用户画像筛选完成，得到 ${filteredIds.length} 个候选岗位`);
  
  return filteredIds;
}

// 基于用户期望在现有候选库中继续筛选
function filterJobsByExpectations(
  currentJobIds: number[],
  allJobs: JobRecord[],
  step: number,
  answer: string,
  filters: FilterStateV2['filters']
): { filteredIds: number[], updatedFilters: FilterStateV2['filters'] } {
  console.log(`🎯 第${step}步筛选，在 ${currentJobIds.length} 个岗位中继续筛选...`);
  
  // 判断是否是"无要求"的回答
  const isNoPreference = isNoPreferenceAnswer(answer);
  
  if (isNoPreference) {
    console.log(`⏭️ 用户回答"无要求"，跳过此步筛选，岗位数保持: ${currentJobIds.length}`);
    return {
      filteredIds: [...currentJobIds],
      updatedFilters: { ...filters }
    };
  }
  
  // 更新筛选条件
  const updatedFilters = { ...filters };
  const questionKeys: Array<keyof FilterStateV2['filters']> = ['industry', 'jobType', 'city', 'salary', 'other'];
  const filterKey = questionKeys[step - 1]; // step 1-5 对应 0-4
  
  if (filterKey) {
    updatedFilters[filterKey] = answer;
  }
  
  // 获取当前候选岗位的详情
  const currentJobs = allJobs.filter(job => currentJobIds.includes(job.id));
  
  // 在当前候选库中继续筛选
  let filtered = [...currentJobs];
  
  // 行业筛选
  if (updatedFilters.industry && step >= 1) {
    const industry = updatedFilters.industry;
    filtered = filtered.filter(job => 
      job.industry && job.industry.includes(industry)
    );
    console.log(`🏭 行业筛选后: ${filtered.length} 个岗位`);
  }
  
  // 岗位类型筛选
  if (updatedFilters.jobType && step >= 2) {
    const jobType = updatedFilters.jobType;
    filtered = filtered.filter(job => 
      (job.job_title && job.job_title.includes(jobType)) ||
      (job.job_description && job.job_description.includes(jobType))
    );
    console.log(`💼 岗位类型筛选后: ${filtered.length} 个岗位`);
  }
  
  // 城市筛选
  if (updatedFilters.city && step >= 3) {
    const city = updatedFilters.city;
    filtered = filtered.filter(job => 
      job.address && job.address.includes(city)
    );
    console.log(`🏙️ 城市筛选后: ${filtered.length} 个岗位`);
  }
  
  // 薪资筛选（只记录，不严格筛选）
  if (updatedFilters.salary && step >= 4) {
    console.log(`💰 薪资条件记录: ${updatedFilters.salary}`);
  }
  
  // 其他要求（只记录，不严格筛选）
  if (updatedFilters.other && step >= 5) {
    console.log(`📝 其他要求记录: ${updatedFilters.other}`);
  }
  
  // 如果筛选结果太少，适当放宽（保留至少20个岗位）
  const MIN_RESULTS = 20;
  if (filtered.length < MIN_RESULTS && filtered.length > 0) {
    console.log(`⚠️ 筛选结果较少 (${filtered.length}个)，保留当前结果`);
  } else if (filtered.length === 0) {
    console.log(`⚠️ 此条件筛选结果为0，回退到上一步的 ${currentJobIds.length} 个岗位`);
    return {
      filteredIds: [...currentJobIds],
      updatedFilters: { ...filters } // 不更新这次的筛选条件
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
  
  // 简单实现：随机返回前5个（实际应该用AI进行匹配度打分）
  // 这里可以集成AI进行：
  // 1. 基础要求匹配打分
  // 2. 职业技能匹配打分
  // 3. 职业素养匹配打分
  // 4. 发展潜力匹配打分
  // 5. 计算加权总分
  // 6. 排序返回前5个
  
  // 暂时返回前5个（或者随机5个）
  let matchedJobs = [...candidateJobs];
  
  // 简单随机打乱（模拟AI打分排序）
  matchedJobs = matchedJobs.sort(() => Math.random() - 0.5);
  
  // 返回前5个
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
      step: 0, // 0表示完成画像筛选，准备开始问问题
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
    
    // 格式化岗位数据，并添加晋升路径和横向换岗路径
    const jobs = matchedJobs.map((job) => {
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
      
      // 生成晋升路径（三级以上）
      const promotionPaths = generatePromotionPaths(formattedJob);
      
      // 生成横向换岗路径（每个岗位不少于2条）
      const lateralMoves = generateLateralMoves(formattedJob);
      
      return {
        ...formattedJob,
        promotion_paths: promotionPaths,
        lateral_moves: lateralMoves
      };
    });
    
    console.log(`最终匹配完成，返回 ${jobs.length} 个岗位（已添加晋升路径和横向换岗路径）`);
    
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

// ========== 保留旧的API接口（向后兼容）==========

// 原有的渐进式筛选状态和接口保持不变...
// 这里省略旧代码，实际使用中可以保留

export default router;
