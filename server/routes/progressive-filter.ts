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

// 渐进式筛选状态存储（内存中，生产环境应该用Redis或数据库）
interface FilterState {
  step: number; // 当前步骤 0-5
  filters: {
    industry?: string;
    jobType?: string;
    city?: string;
    salary?: string;
    other?: string;
  };
  filteredJobIds: number[]; // 筛选后的岗位ID列表
  allJobs: JobRecord[]; // 所有岗位数据（缓存）
  lastUpdated: number;
}

// 存储筛选状态（按会话或用户）
const filterSessions = new Map<string, FilterState>();

// 模糊匹配函数
function fuzzyMatch(text: string | null, pattern: string): boolean {
  if (!text) return false;
  
  const normalizedText = text.toLowerCase().trim();
  const normalizedPattern = pattern.toLowerCase().trim();
  
  // 1. 精确匹配
  if (normalizedText === normalizedPattern) return true;
  
  // 2. 包含匹配
  if (normalizedText.includes(normalizedPattern)) return true;
  
  // 3. 分词匹配
  const patternWords = normalizedPattern.split(/[\s,，、]+/).filter(w => w);
  if (patternWords.length > 0) {
    return patternWords.some(word => normalizedText.includes(word));
  }
  
  return false;
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

// 根据筛选条件过滤岗位
function filterJobs(jobs: JobRecord[], filters: FilterState['filters'], step: number): JobRecord[] {
  console.log(`开始第${step}步筛选，当前岗位数: ${jobs.length}`);
  console.log('筛选条件:', filters);
  
  let filtered = [...jobs];
  
  // 第1步：行业筛选
  if (step >= 1 && filters.industry) {
    const industry = filters.industry;
    filtered = filtered.filter(job => fuzzyMatch(job.industry, industry));
    console.log(`行业筛选后: ${filtered.length}个岗位`);
  }
  
  // 第2步：岗位类型筛选
  if (step >= 2 && filters.jobType) {
    const jobType = filters.jobType;
    filtered = filtered.filter(job => 
      fuzzyMatch(job.job_title, jobType) || 
      fuzzyMatch(job.job_description, jobType)
    );
    console.log(`岗位类型筛选后: ${filtered.length}个岗位`);
  }
  
  // 第3步：城市筛选
  if (step >= 3 && filters.city) {
    const city = filters.city;
    filtered = filtered.filter(job => fuzzyMatch(job.address, city));
    console.log(`城市筛选后: ${filtered.length}个岗位`);
  }
  
  // 第4步：薪资筛选（简化处理，不严格限制）
  if (step >= 4 && filters.salary) {
    // 薪资筛选不作为严格限制，只作为参考
    console.log('薪资条件记录，不作为严格筛选');
  }
  
  // 第5步：其他要求筛选（只作为参考）
  if (step >= 5 && filters.other) {
    // 其他要求在AI匹配时考虑
    console.log('其他要求记录，在AI匹配时考虑');
  }
  
  return filtered;
}

// 初始化渐进式筛选会话
router.post('/api/progressive-filter/init', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'sessionId is required' });
    }
    
    console.log('初始化渐进式筛选会话:', sessionId);
    
    // 获取所有岗位数据
    const allJobs = await getAllJobs();
    console.log(`加载了 ${allJobs.length} 个岗位数据`);
    
    // 创建筛选状态
    const filterState: FilterState = {
      step: 0,
      filters: {},
      filteredJobIds: allJobs.map(job => job.id),
      allJobs,
      lastUpdated: Date.now()
    };
    
    // 存储会话状态
    filterSessions.set(sessionId, filterState);
    
    res.json({
      success: true,
      totalJobs: allJobs.length,
      message: `已加载 ${allJobs.length} 个岗位数据`
    });
    
  } catch (error) {
    console.error('初始化渐进式筛选失败:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// 逐步筛选API
router.post('/api/progressive-filter/step', async (req, res) => {
  try {
    const { sessionId, step, answer } = req.body;
    
    if (!sessionId || step === undefined || step < 1 || step > 5) {
      return res.status(400).json({ 
        success: false, 
        error: 'sessionId和有效的step (1-5) 是必需的' 
      });
    }
    
    console.log(`处理第${step}步筛选，回答:`, answer);
    
    // 获取会话状态
    const filterState = filterSessions.get(sessionId);
    if (!filterState) {
      return res.status(400).json({ 
        success: false, 
        error: '会话不存在，请先调用init接口' 
      });
    }
    
    // 更新筛选条件
    if (step === 1) {
      filterState.filters.industry = answer;
    } else if (step === 2) {
      filterState.filters.jobType = answer;
    } else if (step === 3) {
      filterState.filters.city = answer;
    } else if (step === 4) {
      filterState.filters.salary = answer;
    } else if (step === 5) {
      filterState.filters.other = answer;
    }
    
    filterState.step = step;
    
    // 获取当前筛选范围的岗位
    const currentJobs = filterState.allJobs.filter(job => 
      filterState.filteredJobIds.includes(job.id)
    );
    
    // 执行筛选
    const filteredJobs = filterJobs(currentJobs, filterState.filters, step);
    
    // 更新筛选后的岗位ID列表
    filterState.filteredJobIds = filteredJobs.map(job => job.id);
    filterState.lastUpdated = Date.now();
    
    // 保存更新后的状态
    filterSessions.set(sessionId, filterState);
    
    console.log(`第${step}步筛选完成，剩余岗位数: ${filteredJobs.length}`);
    
    // 返回结果
    res.json({
      success: true,
      step,
      remainingCount: filteredJobs.length,
      totalCount: filterState.allJobs.length,
      message: `已筛选出 ${filteredJobs.length} 个岗位`,
      sampleJobs: filteredJobs.slice(0, 3).map(job => ({
        id: job.id,
        title: job.job_title,
        company: job.company_name,
        location: job.address,
        industry: job.industry
      }))
    });
    
  } catch (error) {
    console.error('逐步筛选失败:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// 获取最终筛选结果并进行AI匹配
router.post('/api/progressive-filter/final', async (req, res) => {
  try {
    const { sessionId, profile } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ 
        success: false, 
        error: 'sessionId是必需的' 
      });
    }
    
    console.log('获取最终筛选结果，进行AI匹配');
    
    // 获取会话状态
    const filterState = filterSessions.get(sessionId);
    if (!filterState) {
      return res.status(400).json({ 
        success: false, 
        error: '会话不存在，请先调用init接口' 
      });
    }
    
    // 获取筛选后的岗位
    const filteredJobs = filterState.allJobs.filter(job => 
      filterState.filteredJobIds.includes(job.id)
    );
    
    console.log(`最终筛选结果: ${filteredJobs.length} 个岗位`);
    
    // 如果没有筛选结果，放宽条件
    let finalJobs = filteredJobs;
    let relaxedMessage = '';
    
    if (filteredJobs.length === 0) {
      console.log('没有筛选结果，开始放宽条件');
      
      // 逐步放宽条件
      const relaxStrategies = [
        { step: 4, drop: ['other'], msg: '放宽了其他要求' },
        { step: 3, drop: ['salary', 'other'], msg: '放宽了薪资和其他要求' },
        { step: 2, drop: ['city', 'salary', 'other'], msg: '放宽了城市、薪资和其他要求' },
        { step: 1, drop: ['jobType', 'city', 'salary', 'other'], msg: '放宽了岗位类型、城市、薪资和其他要求' },
        { step: 0, drop: ['industry', 'jobType', 'city', 'salary', 'other'], msg: '已放宽所有条件' }
      ];
      
      for (const strategy of relaxStrategies) {
        const relaxedFilters = { ...filterState.filters };
        strategy.drop.forEach(key => {
          delete (relaxedFilters as any)[key];
        });
        
        const relaxedJobs = filterJobs(filterState.allJobs, relaxedFilters, strategy.step);
        if (relaxedJobs.length > 0) {
          finalJobs = relaxedJobs;
          relaxedMessage = strategy.msg;
          console.log(`放宽策略成功: ${strategy.msg}, 获得 ${relaxedJobs.length} 个岗位`);
          break;
        }
      }
      
      // 如果还是没有，返回所有岗位
      if (finalJobs.length === 0) {
        finalJobs = filterState.allJobs.slice(0, 100);
        relaxedMessage = '已放宽所有条件，返回推荐岗位';
      }
    }
    
    // 格式化岗位数据
    const jobs = finalJobs.map((job) => ({
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
    
    // 构建提示信息
    let friendlyMessage = '';
    if (relaxedMessage) {
      friendlyMessage = `${relaxedMessage}，为您找到了 ${finalJobs.length} 个岗位，请查看左侧卡片！`;
    } else {
      friendlyMessage = `岗位匹配分析已完成！为您找到了 ${finalJobs.length} 个岗位，请查看左侧卡片了解详细分析结果。`;
    }
    
    // 清理会话
    filterSessions.delete(sessionId);
    
    res.json({
      success: true,
      message: friendlyMessage,
      jobs: jobs.slice(0, 50), // 最多返回50个岗位供AI匹配
      totalCount: finalJobs.length,
      wasRelaxed: !!relaxedMessage
    });
    
  } catch (error) {
    console.error('获取最终筛选结果失败:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

export default router;
