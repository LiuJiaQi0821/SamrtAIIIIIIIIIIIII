import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

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
const supabaseKey = process.env.COZE_SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// 获取岗位画像ID映射
async function getProfileIdMap(): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from('job_profiles')
    .select('id, profile_name');
  
  if (error) throw error;
  
  const map = new Map<string, number>();
  for (const profile of data) {
    map.set(profile.profile_name, profile.id);
  }
  return map;
}

// 晋升路径数据
const careerPaths = [
  // 前端开发 晋升路径
  { from_name: '前端开发', to_name: '前端开发', path_type: 'vertical', difficulty: '3', years_required: 2, additional_skills: '框架源码阅读、性能优化、工程化', additional_certificates: '前端架构师证书', promotion_conditions: '深入框架原理', salary_change: '30-50%' },
  { from_name: '前端开发', to_name: '前端开发', path_type: 'vertical', difficulty: '4', years_required: 3, additional_skills: '前端架构、技术选型、团队管理', additional_certificates: '技术管理证书', promotion_conditions: '架构能力和团队管理', salary_change: '50-70%' },
  { from_name: '前端开发', to_name: '前端开发', path_type: 'vertical', difficulty: '5', years_required: 5, additional_skills: '前端技术战略、中台建设', additional_certificates: '系统架构师证书', promotion_conditions: '全面技术视野', salary_change: '80-100%' },
  { from_name: '前端开发', to_name: '前端开发', path_type: 'horizontal', difficulty: '2', years_required: 1, additional_skills: 'Node.js、全栈能力', additional_certificates: 'Node.js认证', promotion_conditions: '后端技术学习', salary_change: '10-20%' },
  
  // 商务专员 晋升路径
  { from_name: '商务专员', to_name: '商务专员', path_type: 'vertical', difficulty: '3', years_required: 2, additional_skills: '商务谈判、资源整合', additional_certificates: '商务证书', promotion_conditions: '商务能力提升', salary_change: '30-50%' },
  { from_name: '商务专员', to_name: '商务专员', path_type: 'vertical', difficulty: '4', years_required: 3, additional_skills: '团队管理、商务战略', additional_certificates: '商务管理证书', promotion_conditions: '管理经验', salary_change: '50-70%' },
  { from_name: '商务专员', to_name: 'BD经理', path_type: 'vertical', difficulty: '4', years_required: 4, additional_skills: 'BD能力、资源整合', additional_certificates: 'BD认证', promotion_conditions: 'BD方向晋升', salary_change: '60-80%' },
  { from_name: '商务专员', to_name: '销售工程师', path_type: 'horizontal', difficulty: '3', years_required: 2, additional_skills: '技术背景、销售能力', additional_certificates: '销售证书', promotion_conditions: '技术销售转型', salary_change: '30-50%' },
  
  // 招聘专员/助理 晋升路径
  { from_name: '招聘专员/助理', to_name: '招聘专员/助理', path_type: 'vertical', difficulty: '3', years_required: 2, additional_skills: '招聘体系、人才mapping', additional_certificates: 'HR证书', promotion_conditions: '招聘能力提升', salary_change: '30-50%' },
  { from_name: '招聘专员/助理', to_name: '招聘专员/助理', path_type: 'vertical', difficulty: '4', years_required: 3, additional_skills: 'HRBP能力、团队管理', additional_certificates: 'HRBP证书', promotion_conditions: 'HRBP转型', salary_change: '50-70%' },
  { from_name: '招聘专员/助理', to_name: '猎头顾问', path_type: 'horizontal', difficulty: '3', years_required: 2, additional_skills: '猎头技能、行业资源', additional_certificates: '猎头认证', promotion_conditions: '猎头方向转型', salary_change: '40-60%' },
  { from_name: '招聘专员/助理', to_name: '猎头顾问', path_type: 'vertical', difficulty: '4', years_required: 4, additional_skills: '招聘管理、团队建设', additional_certificates: 'HR管理证书', promotion_conditions: '招聘管理晋升', salary_change: '60-80%' },
  
  // 法务专员/助理 晋升路径
  { from_name: '法务专员/助理', to_name: '法务专员/助理', path_type: 'vertical', difficulty: '3', years_required: 2, additional_skills: '合同审核、合规管理', additional_certificates: '法务证书', promotion_conditions: '法务能力提升', salary_change: '30-50%' },
  { from_name: '法务专员/助理', to_name: '法务专员/助理', path_type: 'vertical', difficulty: '4', years_required: 4, additional_skills: '法务管理、团队管理', additional_certificates: '法务管理证书', promotion_conditions: '管理晋升', salary_change: '60-80%' },
  { from_name: '法务专员/助理', to_name: '律师', path_type: 'vertical', difficulty: '3', years_required: 2, additional_skills: '律师执业资格', additional_certificates: '律师执业证书', promotion_conditions: '通过司法考试', salary_change: '80-100%' },
  { from_name: '法务专员/助理', to_name: '律师', path_type: 'vertical', difficulty: '5', years_required: 5, additional_skills: '律师专业能力、客户积累', additional_certificates: '合伙人资格', promotion_conditions: '律师执业发展', salary_change: '150-200%' }
];

async function insertCareerPaths() {
  console.log('开始获取岗位画像ID映射...');
  const profileIdMap = await getProfileIdMap();
  console.log(`获取到 ${profileIdMap.size} 个岗位画像`);
  
  console.log('开始插入晋升路径...');
  
  let insertedCount = 0;
  let skipCount = 0;
  
  for (const path of careerPaths) {
    const fromJobId = profileIdMap.get(path.from_name);
    const toJobId = profileIdMap.get(path.to_name);
    
    if (!fromJobId) {
      console.log(`跳过: ${path.from_name} -> ${path.to_name} (未找到起始岗位画像ID)`);
      skipCount++;
      continue;
    }
    
    if (!toJobId) {
      console.log(`跳过: ${path.from_name} -> ${path.to_name} (未找到目标岗位画像ID)`);
      skipCount++;
      continue;
    }
    
    // 检查是否已存在
    const { data: existing } = await supabase
      .from('career_paths')
      .select('id')
      .eq('from_job_id', fromJobId)
      .eq('to_job_id', toJobId)
      .single();
    
    if (existing) {
      console.log(`跳过: ${path.from_name} -> ${path.to_name} (已存在)`);
      skipCount++;
      continue;
    }
    
    const insertData = {
      from_job_id: fromJobId,
      to_job_id: toJobId,
      path_type: path.path_type,
      difficulty: path.difficulty,
      years_required: path.years_required,
      additional_skills: path.additional_skills,
      additional_certificates: '',
      promotion_conditions: path.promotion_conditions,
      salary_change: path.salary_change,
      is_recommended: 1
    };
    
    const { error } = await supabase
      .from('career_paths')
      .insert(insertData);
    
    if (error) {
      console.error(`插入失败: ${path.from_name} -> ${path.to_name}: ${error.message}`);
    } else {
      console.log(`插入成功: ${path.from_name} -> ${path.to_name}`);
      insertedCount++;
    }
  }
  
  console.log(`\n总计插入: ${insertedCount} 条晋升路径, 跳过: ${skipCount} 条`);
}

insertCareerPaths().catch(console.error);
