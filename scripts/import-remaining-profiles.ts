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

// 剩余岗位画像数据
const jobProfiles = [
  {
    profile_name: '前端开发',
    category: '技术类',
    description: '负责Web前端开发，实现用户界面和交互功能。',
    professional_skills: 'HTML/CSS/JavaScript、Vue/React框架、TypeScript、Webpack、性能优化、浏览器兼容',
    certificate_requirements: '前端开发工程师证书',
    innovation_ability: 3,
    learning_ability: 5,
    pressure_resistance: 3,
    communication_ability: 3,
    internship_requirement: '有前端项目经验或开源贡献优先',
    education_requirement: '本科及以上',
    work_experience_requirement: '1-3年',
    salary_range: '10000-30000元/月',
    career_direction: '高级前端工程师、前端架构师、技术经理',
    core_qualifications: '前端基础、设计审美、性能意识',
    tools_requirement: 'VSCode、Git、Webpack、Vite'
  },
  {
    profile_name: '商务专员',
    category: '商务类',
    description: '负责商务合作和客户关系维护。',
    professional_skills: '商务谈判、合同管理、客户关系、方案制作、沟通协调',
    certificate_requirements: '商务证书',
    innovation_ability: 3,
    learning_ability: 3,
    pressure_resistance: 3,
    communication_ability: 5,
    internship_requirement: '有商务或销售实习经验优先',
    education_requirement: '本科及以上',
    work_experience_requirement: '1-3年',
    salary_range: '8000-20000元/月',
    career_direction: '商务经理、商务总监、BD经理',
    core_qualifications: '商务敏感度、沟通能力、谈判技巧',
    tools_requirement: 'CRM、PPT、办公软件'
  },
  {
    profile_name: '招聘专员/助理',
    category: '人力资源类',
    description: '负责招聘工作，为企业引进人才。',
    professional_skills: '招聘流程、面试技巧、人才mapping、渠道运营、HR系统、数据统计',
    certificate_requirements: '人力资源证书',
    innovation_ability: 3,
    learning_ability: 4,
    pressure_resistance: 3,
    communication_ability: 5,
    internship_requirement: '有HR或猎头实习经验优先',
    education_requirement: '本科及以上',
    work_experience_requirement: '1年以下',
    salary_range: '5000-12000元/月',
    career_direction: '招聘经理、HRBP、人力资源总监',
    core_qualifications: '识人能力、沟通技巧、数据敏感',
    tools_requirement: '招聘系统、LinkedIn、办公软件'
  },
  {
    profile_name: '法务专员/助理',
    category: '法务类',
    description: '协助处理企业法务事务。',
    professional_skills: '合同审核、法律检索、文书撰写、合规检查、风险提示',
    certificate_requirements: '法律职业资格证书',
    innovation_ability: 2,
    learning_ability: 4,
    pressure_resistance: 3,
    communication_ability: 3,
    internship_requirement: '有法务或律所实习经验优先',
    education_requirement: '本科及以上',
    work_experience_requirement: '1年以下',
    salary_range: '6000-15000元/月',
    career_direction: '法务专员、法务经理、法务总监',
    core_qualifications: '法律基础、细心严谨、风险意识',
    tools_requirement: '法律数据库、办公软件'
  }
];

async function insertProfiles() {
  console.log('开始插入剩余岗位画像...');
  
  let insertedCount = 0;
  
  for (const profile of jobProfiles) {
    // 检查是否已存在
    const { data: existing } = await supabase
      .from('job_profiles')
      .select('id')
      .eq('profile_name', profile.profile_name)
      .single();
    
    if (existing) {
      console.log(`跳过: ${profile.profile_name} (已存在)`);
      continue;
    }
    
    const { error } = await supabase
      .from('job_profiles')
      .insert(profile);
    
    if (error) {
      console.error(`插入失败: ${profile.profile_name}`, error.message);
    } else {
      console.log(`插入成功: ${profile.profile_name}`);
      insertedCount++;
    }
  }
  
  console.log(`\n总计插入: ${insertedCount} 条画像`);
}

insertProfiles().catch(console.error);
