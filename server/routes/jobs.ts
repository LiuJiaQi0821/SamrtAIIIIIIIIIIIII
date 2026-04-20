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
  job_description: string;
}

interface ProfileRecord {
  id: number;
  profile_name: string;
}

interface CareerPathRecord {
  to_job_id: number;
}

// 搜索岗位API
router.post('/api/jobs/search', async (req, res) => {
  try {
    const { industry, salary, location, company, size, jobType, keyword } = req.body;
    
    // 构建筛选条件
    const filters: string[] = [];
    
    if (industry) {
      filters.push(`industry=ilike.*${encodeURIComponent(industry)}*`);
    }
    if (salary) {
      filters.push(`salary_range=eq.${encodeURIComponent(salary)}`);
    }
    if (location) {
      filters.push(`address=ilike.${encodeURIComponent(location)}*`);
    }
    if (company) {
      filters.push(`company_type=eq.${encodeURIComponent(company)}`);
    }
    if (size) {
      filters.push(`company_size=eq.${encodeURIComponent(size)}`);
    }
    if (jobType) {
      filters.push(`job_title=ilike.*${encodeURIComponent(jobType)}*`);
    }
    
    // 关键词搜索：同时匹配岗位名称、公司名称、职位描述
    if (keyword && keyword.trim()) {
      // 对关键词进行 URL 编码
      const encodedKeyword = encodeURIComponent(keyword.trim());
      // 构建 or 条件
      const orFilter = `(job_title.ilike.*${encodedKeyword}*,company_name.ilike.*${encodedKeyword}*,job_description.ilike.*${encodedKeyword}*)`;
      // 对括号和逗号进行编码
      const encodedOrFilter = orFilter.replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/,/g, '%2C');
      filters.push(`or=${encodedOrFilter}`);
    }
    
    // 构建基础URL - 包含更多字段用于显示
    let url = `${supabaseUrl}/rest/v1/jobs?select=id,job_title,company_name,salary_range,address,industry,company_type,company_size,job_description&order=id`;
    
    // 添加筛选条件
    if (filters.length > 0) {
      url += '&' + filters.join('&');
    }
    
    // 使用分页获取所有符合条件的数据
    const allJobs: JobRecord[] = [];
    const pageSize = 1000;
    let page = 0;
    let hasMore = true;
    
    while (hasMore) {
      const offset = page * pageSize;
      const pageUrl = `${url}&limit=${pageSize}&offset=${offset}`;
      
      const response = await fetch(pageUrl, {
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
      
      if (Array.isArray(data) && data.length > 0) {
        allJobs.push(...data);
        page++;
        if (data.length < pageSize) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }
    
    // 格式化数据 - 使用正确的列名
    const jobs = allJobs.map((job) => ({
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
