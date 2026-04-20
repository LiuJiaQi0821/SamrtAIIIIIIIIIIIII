import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { execSync } from 'child_process';

config();

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

loadEnv();

const supabaseUrl = process.env.COZE_SUPABASE_URL || '';
const supabaseKey = process.env.COZE_SUPABASE_SERVICE_ROLE_KEY || process.env.COZE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 配置');
  process.exit(1);
}

const db = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' },
  global: { headers: { 'Content-Type': 'application/json' } },
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
});

// 从文本中提取关键词
function extractKeywords(text: string | null): string[] {
  if (!text) return [];
  
  const keywords = new Set<string>();
  const normalized = text.toLowerCase();
  
  // 常见行业关键词
  const industryKeywords = [
    '互联网', '金融', '教育', '医疗', '房地产', '电商', '游戏',
    '人工智能', '大数据', '云计算', '新能源', '汽车', '制造',
    '咨询', '广告', '传媒', '物流', '零售', '餐饮', '旅游'
  ];
  
  industryKeywords.forEach(keyword => {
    if (normalized.includes(keyword)) {
      keywords.add(keyword);
    }
  });
  
  // 常见城市关键词
  const cityKeywords = [
    '北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安',
    '南京', '苏州', '重庆', '天津', '长沙', '郑州', '青岛', '大连'
  ];
  
  cityKeywords.forEach(keyword => {
    if (normalized.includes(keyword)) {
      keywords.add(keyword);
    }
  });
  
  // 常见技能关键词
  const skillKeywords = [
    'Java', 'Python', 'JavaScript', 'TypeScript', 'React', 'Vue', 'Node.js',
    'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Docker', 'Kubernetes',
    'Git', 'Linux', 'AWS', '阿里云', '腾讯云', '产品经理', 'UI设计'
  ];
  
  skillKeywords.forEach(keyword => {
    if (normalized.includes(keyword.toLowerCase())) {
      keywords.add(keyword);
    }
  });
  
  return Array.from(keywords);
}

// 从地址中提取城市
function extractCity(address: string | null): string[] {
  if (!address) return [];
  
  const cities = new Set<string>();
  const cityKeywords = [
    '北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安',
    '南京', '苏州', '重庆', '天津', '长沙', '郑州', '青岛', '大连',
    '沈阳', '哈尔滨', '长春', '济南', '宁波', '厦门', '福州', '合肥',
    '石家庄', '太原', '南昌', '南宁', '昆明', '贵阳', '兰州', '银川'
  ];
  
  cityKeywords.forEach(city => {
    if (address.includes(city)) {
      cities.add(city);
    }
  });
  
  return Array.from(cities);
}

async function populateJobClassification() {
  console.log('🚀 开始填充岗位预分类数据...');
  
  try {
    // 1. 首先清空现有数据（避免重复）
    console.log('🧹 清空现有分类数据...');
    await db.from('job_industries').delete().gt('job_id', 0);
    await db.from('job_cities').delete().gt('job_id', 0);
    await db.from('job_company_types').delete().gt('job_id', 0);
    await db.from('job_company_sizes').delete().gt('job_id', 0);
    await db.from('job_keywords').delete().gt('job_id', 0);
    
    // 2. 获取所有岗位数据
    console.log('📥 读取岗位数据...');
    const pageSize = 1000;
    let page = 0;
    let hasMore = true;
    let totalProcessed = 0;
    
    while (hasMore) {
      const offset = page * pageSize;
      console.log(`📄 处理第 ${page + 1} 批数据 (offset: ${offset})...`);
      
      const { data, error } = await db
        .from('jobs')
        .select('id,job_title,company_name,salary_range,address,industry,company_type,company_size,job_description')
        .range(offset, offset + pageSize - 1);
      
      if (error) {
        console.error('❌ 读取岗位数据失败:', error);
        throw error;
      }
      
      if (Array.isArray(data) && data.length > 0) {
        // 3. 处理每一个岗位
        for (const job of data) {
          // 行业分类
          if (job.industry) {
            await db.from('job_industries').insert({
              job_id: job.id,
              industry: job.industry
            }).select();
          }
          
          // 城市分类（从地址中提取）
          const cities = extractCity(job.address);
          for (const city of cities) {
            await db.from('job_cities').insert({
              job_id: job.id,
              city: city
            }).select();
          }
          
          // 公司类型分类
          if (job.company_type) {
            await db.from('job_company_types').insert({
              job_id: job.id,
              company_type: job.company_type
            }).select();
          }
          
          // 公司规模分类
          if (job.company_size) {
            await db.from('job_company_sizes').insert({
              job_id: job.id,
              company_size: job.company_size
            }).select();
          }
          
          // 关键词提取
          const keywords = extractKeywords(`${job.job_title} ${job.job_description}`);
          for (const keyword of keywords) {
            const keywordType = 
              (job.job_title && job.job_title.includes(keyword)) ? 'title' :
              (job.job_description && job.job_description.includes(keyword)) ? 'description' : 'skill';
            
            await db.from('job_keywords').insert({
              job_id: job.id,
              keyword: keyword,
              keyword_type: keywordType
            }).select();
          }
          
          totalProcessed++;
        }
        
        page++;
        if (data.length < pageSize) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
      
      // 每批完成后输出进度
      console.log(`✅ 已处理 ${totalProcessed} 个岗位`);
    }
    
    console.log(`\n🎉 完成！共处理 ${totalProcessed} 个岗位`);
    console.log('\n📊 统计信息：');
    
    // 查询统计信息
    const industryCount = await db.from('job_industries').select('*', { count: 'exact' });
    const cityCount = await db.from('job_cities').select('*', { count: 'exact' });
    const keywordCount = await db.from('job_keywords').select('*', { count: 'exact' });
    
    console.log(`- 行业关联: ${industryCount.count} 条`);
    console.log(`- 城市关联: ${cityCount.count} 条`);
    console.log(`- 关键词关联: ${keywordCount.count} 条`);
    
  } catch (error) {
    console.error('❌ 填充数据失败:', error);
    process.exit(1);
  }
}

populateJobClassification();
