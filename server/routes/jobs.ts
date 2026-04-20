import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

const router = Router();

// 环境变量只加载一次
let envLoaded = false;

// 加载环境变量
function loadEnv(): void {
  if (envLoaded) return;
  
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
    envLoaded = true;
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
  job_description: string;
}

interface ProfileRecord {
  id: number;
  profile_name: string;
}

interface CareerPathRecord {
  to_job_id: number;
}

// 格式化后的岗位类型
export interface FormattedJob {
  id: number;
  title: string;
  company: string;
  salary: string;
  location: string;
  industry: string;
  company_type: string;
  company_size: string;
  description: string;
}

// 简单的内存缓存
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const searchCache = new Map<string, CacheEntry<FormattedJob[]>>();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

// 生成缓存键
function getCacheKey(filters: Record<string, string>): string {
  const sortedKeys = Object.keys(filters).sort();
  return sortedKeys.map(key => `${key}:${filters[key]}`).join('|');
}

// 检查缓存
function getFromCache(key: string): FormattedJob[] | null {
  const entry = searchCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  if (entry) {
    searchCache.delete(key);
  }
  return null;
}

// 设置缓存
function setCache(key: string, data: FormattedJob[]): void {
  searchCache.set(key, {
    data,
    timestamp: Date.now()
  });
  
  // 清理过期缓存
  const now = Date.now();
  for (const [k, v] of searchCache.entries()) {
    if (now - v.timestamp > CACHE_TTL) {
      searchCache.delete(k);
    }
  }
}

// 核心搜索逻辑 - 可以被其他模块直接调用
export async function searchJobs(filters: {
  industry?: string;
  salary?: string;
  location?: string;
  company?: string;
  size?: string;
  jobType?: string;
  keyword?: string;
}, limit: number = 20): Promise<FormattedJob[]> {
  // 检查缓存
  const cacheKey = getCacheKey(filters);
  const cached = getFromCache(cacheKey);
  if (cached) {
    console.log('使用缓存的搜索结果');
    return cached.slice(0, limit);
  }

  const { industry, salary, location, company, size, jobType, keyword } = filters;
  
  // 构建筛选条件
  const filterParts: string[] = [];
  
  if (industry) {
    filterParts.push(`industry=ilike.*${encodeURIComponent(industry)}*`);
  }
  if (salary) {
    filterParts.push(`salary_range=eq.${encodeURIComponent(salary)}`);
  }
  if (location) {
    filterParts.push(`address=ilike.${encodeURIComponent(location)}*`);
  }
  if (company) {
    filterParts.push(`company_type=eq.${encodeURIComponent(company)}`);
  }
  if (size) {
    filterParts.push(`company_size=eq.${encodeURIComponent(size)}`);
  }
  if (jobType) {
    filterParts.push(`job_title=ilike.*${encodeURIComponent(jobType)}*`);
  }
  
  // 关键词搜索：同时匹配岗位名称、公司名称、职位描述
  if (keyword && keyword.trim()) {
    const encodedKeyword = encodeURIComponent(keyword.trim());
    const orFilter = `(job_title.ilike.*${encodedKeyword}*,company_name.ilike.*${encodedKeyword}*,job_description.ilike.*${encodedKeyword}*)`;
    const encodedOrFilter = orFilter.replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/,/g, '%2C');
    filterParts.push(`or=${encodedOrFilter}`);
  }
  
  // 构建URL - 只获取需要的字段，并且只取前limit条
  let url = `${supabaseUrl}/rest/v1/jobs?select=id,job_title,company_name,salary_range,address,industry,company_type,company_size,job_description&order=id.desc&limit=${limit}`;
  
  if (filterParts.length > 0) {
    url += '&' + filterParts.join('&');
  }
  
  console.log('搜索URL:', url.replace(supabaseUrl, '[SUPABASE_URL]'));
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const data = await response.json();
  
  // 格式化数据
  const jobs: FormattedJob[] = (Array.isArray(data) ? data : []).map((job: JobRecord) => ({
    id: job.id,
    title: job.job_title,
    company: job.company_name,
    salary: job.salary_range,
    location: job.address,
    industry: job.industry,
    company_type: job.company_type,
    company_size: (job as any).company_size || '',
    description: job.job_description
  }));
  
  // 设置缓存
  setCache(cacheKey, jobs);
  
  return jobs;
}

// 搜索岗位API
router.post('/api/jobs/search', async (req, res) => {
  try {
    const filters = req.body;
    const jobs = await searchJobs(filters, 100); // API接口返回更多结果
    
    res.json({
      success: true,
      jobs
    });
  } catch (error) {
    console.error('搜索岗位失败:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// 获取单个岗位详情
router.get('/api/jobs/:id', async (req, res) => {
  try {
    const db = getSupabaseClient();
    if (!db) {
      return res.status(500).json({ success: false, error: '数据库未配置' });
    }
    
    const { id } = req.params;
    
    // 查询岗位基本信息
    const { data: job, error: jobError } = await db
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single();
    
    if (jobError || !job) {
      return res.status(404).json({ success: false, error: '岗位不存在' });
    }
    
    const typedJob = job as unknown as JobRecord;
    
    // 查询该岗位的画像信息 - 使用profile_name字段
    const { data: profile } = await db
      .from('job_profiles')
      .select('*')
      .ilike('profile_name', `%${typedJob.job_title}%`)
      .limit(1)
      .single();
    
    // 查询晋升路径（从job_profiles获取id）
    let careerPaths: unknown[] = [];
    if (profile && (profile as ProfileRecord).id) {
      const profileId = (profile as ProfileRecord).id;
      const { data: paths } = await db
        .from('career_paths')
        .select('*')
        .eq('from_job_id', profileId);
      const typedCareerPaths = (paths || []) as CareerPathRecord[];
      careerPaths = typedCareerPaths;
      
      // 同时查询目标岗位的名称
      if (careerPaths.length > 0) {
        const toJobIds = typedCareerPaths.map((p) => p.to_job_id);
        const { data: targetProfiles } = await db
          .from('job_profiles')
          .select('id, profile_name')
          .in('id', toJobIds);
        
        const typedProfiles = (targetProfiles || []) as ProfileRecord[];
        const profileMap = new Map(typedProfiles.map((p) => [p.id, p.profile_name]));
        careerPaths = typedCareerPaths.map((p) => ({
          ...p,
          to_job_name: profileMap.get(p.to_job_id) || '未知岗位'
        }));
      }
    }
    
    res.json({
      success: true,
      job: {
        ...typedJob,
        profile,
        career_paths: careerPaths
      }
    });
  } catch (error) {
    console.error('获取岗位详情失败:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// 获取所有筛选选项
router.get('/api/jobs/filters/options', async (req, res) => {
  try {
    const db = getSupabaseClient();
    if (!db) {
      return res.status(500).json({ success: false, error: '数据库未配置' });
    }
    
    // 获取所有行业
    const { data: industries } = await db
      .from('jobs')
      .select('industry')
      .not('industry', 'is', null);
    
    // 获取所有地点
    const { data: locations } = await db
      .from('jobs')
      .select('address')
      .not('address', 'is', null);
    
    // 获取所有公司性质
    const { data: companyTypes } = await db
      .from('jobs')
      .select('company_type')
      .not('company_type', 'is', null);
    
    // 去重并格式化
    interface JobFilterRecord {
      industry: string | null;
      address: string | null;
      company_type: string | null;
    }
    
    const typedIndustries = (industries || []) as JobFilterRecord[];
    const typedLocations = (locations || []) as JobFilterRecord[];
    const typedCompanyTypes = (companyTypes || []) as JobFilterRecord[];
    
    const uniqueIndustries = [...new Set(typedIndustries.map(i => i.industry).filter(Boolean) as string[])];
    const uniqueLocations = [...new Set(typedLocations.map(l => l.address).filter(Boolean) as string[])];
    const uniqueCompanyTypes = [...new Set(typedCompanyTypes.map(c => c.company_type).filter(Boolean) as string[])];
    
    res.json({
      success: true,
      options: {
        industry: uniqueIndustries,
        location: uniqueLocations,
        company_type: uniqueCompanyTypes,
        salary: ['5K以下', '5K-10K', '10K-20K', '20K-35K', '35K-50K', '50K以上']
      }
    });
  } catch (error) {
    console.error('获取筛选选项失败:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

export default router;
