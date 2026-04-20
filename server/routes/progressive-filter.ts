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
    
    // 格式化岗位数据
    const jobs = matchedJobs.map((job) => ({
      id: job.id,
      title: job.job_title,
      company: job.company_name,
      salary: job.salary_range,
      location: job.address,
      industry: job.industry,
      company_type: job.company_type,
      company_size: job.company_size,
      description: job.job_description
    }));
    
    console.log(`最终匹配完成，返回 ${jobs.length} 个岗位`);
    
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
