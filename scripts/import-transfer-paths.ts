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

// 换岗路径图谱数据
const transferPaths = [
  // ==================== 前端开发工程师 换岗路径 ====================
  // 路径1: 直接转换 -> UI/UX设计师
  {
    from_name: '前端开发工程师',
    to_name: 'UI/UX设计师',
    path_type: 'direct',
    intermediate_name: null,
    transfer_difficulty: 'medium',
    steps_required: 1,
    additional_skills: 'UI设计规范、Figma/Sketch、设计系统搭建、视觉设计、用户研究',
    additional_certificates: 'Adobe认证设计师、UX认证',
    transfer_conditions: '有设计作品集、良好的审美能力、对交互设计有理解',
    salary_impact: '15K-20K → 12K-20K',
    transfer_tips: '前端转UI/UX有天然优势，可从组件设计入手，逐步深入视觉设计',
    blood_relationship: '前端与UI同属界面开发领域，技术栈有30%重叠'
  },
  // 路径2: 直接转换 -> 产品经理
  {
    from_name: '前端开发工程师',
    to_name: '产品经理',
    path_type: 'direct',
    intermediate_name: null,
    transfer_difficulty: 'hard',
    steps_required: 1,
    additional_skills: '产品思维、需求分析、用户体验设计、项目管理、数据分析',
    additional_certificates: '产品经理证书、NPDP认证',
    transfer_conditions: '有完整项目经验、良好的产品sense、用户导向思维',
    salary_impact: '15K-20K → 18K-30K',
    transfer_tips: '前端转产品经理需要补足商业思维和数据分析能力，可先从小功能模块负责开始',
    blood_relationship: '前端与产品同属产品实现链，技术栈有20%重叠'
  },
  // 路径3: 经过中间岗位 -> 数据分析师
  {
    from_name: '前端开发工程师',
    to_name: '数据分析师',
    path_type: 'through',
    intermediate_name: '后端开发工程师',
    transfer_difficulty: 'hard',
    steps_required: 2,
    additional_skills: 'SQL、数据可视化、Python/R、统计建模',
    additional_certificates: '数据分析证书、Tableau认证',
    transfer_conditions: '先转入后端开发，掌握数据处理能力后再转数据分析',
    salary_impact: '15K-20K → 18K-25K',
    transfer_tips: '建议先深入后端开发，学习数据处理，再转型数据分析',
    blood_relationship: '前端→后端→数据分析构成完整的数据链路血缘'
  },
  // 路径4: 直接转换 -> 项目经理
  {
    from_name: '前端开发工程师',
    to_name: '项目经理',
    path_type: 'direct',
    intermediate_name: null,
    transfer_difficulty: 'hard',
    steps_required: 1,
    additional_skills: 'PMP项目管理、团队管理、跨部门协调、风险管理',
    additional_certificates: 'PMP认证、ACP认证',
    transfer_conditions: '5年以上经验、有团队管理经验、良好的沟通协调能力',
    salary_impact: '20K-35K → 20K-30K',
    transfer_tips: '前端专家转项目经理需要提升项目管理综合能力，建议考取PMP证书',
    blood_relationship: '前端与项目经理同属项目交付链，技术与管理交叉'
  },
  // 路径5: 经过中间岗位 -> 运营专员
  {
    from_name: '前端开发工程师',
    to_name: '运营专员',
    path_type: 'through',
    intermediate_name: '产品经理',
    transfer_difficulty: 'hard',
    steps_required: 2,
    additional_skills: '用户运营、内容运营、活动策划、数据分析',
    additional_certificates: '运营证书',
    transfer_conditions: '先转产品经理，再转运营专员',
    salary_impact: '15K-20K → 8K-15K',
    transfer_tips: '前端→产品→运营路径较长，但产品经验能帮助理解运营需求',
    blood_relationship: '前端→产品→运营构成用户价值链血缘'
  },

  // ==================== 软件测试工程师 换岗路径 ====================
  // 路径1: 直接转换 -> 质量管理
  {
    from_name: '软件测试工程师',
    to_name: '质量管理',
    path_type: 'direct',
    intermediate_name: null,
    transfer_difficulty: 'medium',
    steps_required: 1,
    additional_skills: 'ISO9001/ISO27001体系、质量管理流程、供应商质量管理、质量审计',
    additional_certificates: '质量工程师证书、ISO内审员',
    transfer_conditions: '了解质量管理体系、有质检经验、细心严谨',
    salary_impact: '10K-15K → 10K-18K',
    transfer_tips: '测试转质量管理是自然延伸，可从测试流程优化入手，逐步扩展到质量体系',
    blood_relationship: '测试与质量管理同属质量保障领域，技术栈有60%重叠'
  },
  // 路径2: 直接转换 -> 运维工程师
  {
    from_name: '软件测试工程师',
    to_name: '运维工程师',
    path_type: 'direct',
    intermediate_name: null,
    transfer_difficulty: 'medium',
    steps_required: 1,
    additional_skills: 'Linux运维、Shell脚本、容器编排、监控系统、自动化运维',
    additional_certificates: 'Linux运维认证、K8s认证',
    transfer_conditions: '熟悉Linux系统、有DevOps实践经验、了解运维体系',
    salary_impact: '10K-15K → 12K-18K',
    transfer_tips: '测试转运维有优势，可从自动化测试平台维护入手，逐步深入运维体系',
    blood_relationship: '测试与运维同属系统保障领域，技术栈有40%重叠'
  },
  // 路径3: 直接转换 -> 数据分析师
  {
    from_name: '软件测试工程师',
    to_name: '数据分析师',
    path_type: 'direct',
    intermediate_name: null,
    transfer_difficulty: 'hard',
    steps_required: 1,
    additional_skills: 'SQL高级、数据可视化、Python/R、统计建模、业务分析',
    additional_certificates: '数据分析证书、Tableau认证',
    transfer_conditions: '熟练SQL、有数据分析项目经验、商业敏感度',
    salary_impact: '10K-15K → 12K-18K',
    transfer_tips: '测试转数据分析师需要补充统计分析能力，可从测试数据分析入手',
    blood_relationship: '测试与数据分析同属数据领域，测试数据驱动分析有天然优势'
  },
  // 路径4: 经过中间岗位 -> 后端开发工程师
  {
    from_name: '软件测试工程师',
    to_name: '后端开发工程师',
    path_type: 'through',
    intermediate_name: '前端开发工程师',
    transfer_difficulty: 'hard',
    steps_required: 2,
    additional_skills: 'Java/Python/Go、数据库、API设计、分布式系统',
    additional_certificates: '后端开发认证',
    transfer_conditions: '先转前端开发，掌握编程基础后再转后端',
    salary_impact: '10K-15K → 18K-25K',
    transfer_tips: '建议先转前端打牢编程基础，再深入后端技术栈',
    blood_relationship: '测试→前端→后端构成开发技能链血缘'
  },
  // 路径5: 直接转换 -> 实施工程师
  {
    from_name: '软件测试工程师',
    to_name: '实施工程师',
    path_type: 'direct',
    intermediate_name: null,
    transfer_difficulty: 'medium',
    steps_required: 1,
    additional_skills: '项目管理、需求分析、客户培训、系统部署',
    additional_certificates: 'PMP认证、实施工程师证书',
    transfer_conditions: '有项目管理经验、良好的沟通能力、客户导向',
    salary_impact: '10K-15K → 10K-18K',
    transfer_tips: '测试转实施工程师有优势，可从测试用例讲解和客户支持入手',
    blood_relationship: '测试与实施同属项目交付领域，客户导向交叉'
  },

  // ==================== 产品经理 换岗路径 ====================
  // 路径1: 直接转换 -> 运营专员
  {
    from_name: '产品经理',
    to_name: '运营专员',
    path_type: 'direct',
    intermediate_name: null,
    transfer_difficulty: 'easy',
    steps_required: 1,
    additional_skills: '用户运营、内容运营、活动策划、社群运营',
    additional_certificates: '运营证书',
    transfer_conditions: '有运营项目经验、数据分析能力、用户思维',
    salary_impact: '18K-30K → 8K-15K',
    transfer_tips: '产品转运营相对容易，产品经验能帮助理解运营需求',
    blood_relationship: '产品与运营同属用户价值链，技术栈有50%重叠'
  },
  // 路径2: 直接转换 -> 项目经理
  {
    from_name: '产品经理',
    to_name: '项目经理',
    path_type: 'direct',
    intermediate_name: null,
    transfer_difficulty: 'medium',
    steps_required: 1,
    additional_skills: 'PMP项目管理、团队管理、风险管理、干系人管理',
    additional_certificates: 'PMP认证',
    transfer_conditions: '有项目管理经验、团队管理能力、PMP证书',
    salary_impact: '18K-30K → 20K-30K',
    transfer_tips: '产品经理转项目经理有优势，产品规划能力可迁移',
    blood_relationship: '产品与项目经理同属项目管理领域，职责有40%重叠'
  },
  // 路径3: 经过中间岗位 -> UI/UX设计师
  {
    from_name: '产品经理',
    to_name: 'UI/UX设计师',
    path_type: 'through',
    intermediate_name: '前端开发工程师',
    transfer_difficulty: 'hard',
    steps_required: 2,
    additional_skills: 'UI设计、Figma/Sketch、设计系统、用户研究',
    additional_certificates: 'Adobe认证设计师',
    transfer_conditions: '先转前端开发，掌握设计实现后再转UI/UX',
    salary_impact: '18K-30K → 12K-20K',
    transfer_tips: '产品→前端→UI路径较长，但前端经验能帮助理解设计实现',
    blood_relationship: '产品→前端→UI构成用户体验链血缘'
  },
  // 路径4: 直接转换 -> 数据分析师
  {
    from_name: '产品经理',
    to_name: '数据分析师',
    path_type: 'direct',
    intermediate_name: null,
    transfer_difficulty: 'medium',
    steps_required: 1,
    additional_skills: 'SQL、Python/R、数据可视化、AB测试、统计建模',
    additional_certificates: '数据分析证书',
    transfer_conditions: '熟练SQL、有数据分析经验、数据驱动思维',
    salary_impact: '18K-30K → 12K-18K',
    transfer_tips: '产品经理有数据敏感度，转数据分析师需要补充技术能力',
    blood_relationship: '产品与数据分析师同属数据驱动领域，分析思维交叉'
  },
  // 路径5: 直接转换 -> 游戏运营
  {
    from_name: '产品经理',
    to_name: '游戏运营',
    path_type: 'direct',
    intermediate_name: null,
    transfer_difficulty: 'medium',
    steps_required: 1,
    additional_skills: '游戏运营策略、用户增长、活动策划、数据分析',
    additional_certificates: '游戏运营证书',
    transfer_conditions: '游戏行业经验、用户运营能力、数据分析能力',
    salary_impact: '18K-30K → 10K-20K',
    transfer_tips: '产品经理转游戏运营需要补充游戏行业知识',
    blood_relationship: '产品与游戏运营同属互联网产品领域，用户思维交叉'
  },

  // ==================== 运营专员 换岗路径 ====================
  // 路径1: 直接转换 -> 电商运营
  {
    from_name: '运营专员',
    to_name: '电商运营',
    path_type: 'direct',
    intermediate_name: null,
    transfer_difficulty: 'easy',
    steps_required: 1,
    additional_skills: '电商平台运营、店铺管理、客服话术、供应链基础',
    additional_certificates: '电商运营证书',
    transfer_conditions: '有电商平台经验、客服经验、电商思维',
    salary_impact: '8K-15K → 8K-18K',
    transfer_tips: '运营转电商运营相对容易，运营思维可迁移',
    blood_relationship: '运营与电商运营同属电商领域，运营思维有70%重叠'
  },
  // 路径2: 直接转换 -> 新媒体运营
  {
    from_name: '运营专员',
    to_name: '新媒体运营',
    path_type: 'direct',
    intermediate_name: null,
    transfer_difficulty: 'easy',
    steps_required: 1,
    additional_skills: '内容创作、短视频运营、直播运营、社媒运营',
    additional_certificates: '新媒体运营证书',
    transfer_conditions: '有内容创作经验、社交媒体运营经验',
    salary_impact: '8K-15K → 8K-15K',
    transfer_tips: '运营转新媒体运营有优势，内容运营能力可迁移',
    blood_relationship: '运营与新媒体运营同属内容领域，内容思维有60%重叠'
  },
  // 路径3: 直接转换 -> 社区运营
  {
    from_name: '运营专员',
    to_name: '社区运营',
    path_type: 'direct',
    intermediate_name: null,
    transfer_difficulty: 'easy',
    steps_required: 1,
    additional_skills: '社区搭建、社群运营、KOL运营、用户分层',
    additional_certificates: '社区运营证书',
    transfer_conditions: '有社群运营经验、用户运营能力',
    salary_impact: '8K-15K → 8K-15K',
    transfer_tips: '运营转社区运营有天然优势，用户运营能力可迁移',
    blood_relationship: '运营与社区运营同属用户运营领域，用户思维有80%重叠'
  },
  // 路径4: 经过中间岗位 -> 产品经理
  {
    from_name: '运营专员',
    to_name: '产品经理',
    path_type: 'through',
    intermediate_name: '运营助理/专员',
    transfer_difficulty: 'hard',
    steps_required: 2,
    additional_skills: '产品规划、需求分析、项目管理、数据分析',
    additional_certificates: '产品经理证书',
    transfer_conditions: '先晋升为高级运营，再转产品经理',
    salary_impact: '8K-15K → 18K-30K',
    transfer_tips: '建议先在运营领域晋升到高级运营，积累足够经验后再转产品',
    blood_relationship: '运营→高级运营→产品构成用户价值链血缘'
  },
  // 路径5: 直接转换 -> 游戏运营
  {
    from_name: '运营专员',
    to_name: '游戏运营',
    path_type: 'direct',
    intermediate_name: null,
    transfer_difficulty: 'medium',
    steps_required: 1,
    additional_skills: '游戏运营策略、用户增长、活动策划、游戏数据分析',
    additional_certificates: '游戏运营证书',
    transfer_conditions: '游戏行业经验、用户运营能力',
    salary_impact: '8K-15K → 10K-20K',
    transfer_tips: '运营转游戏运营需要补充游戏行业知识',
    blood_relationship: '运营与游戏运营同属用户运营领域，用户思维有60%重叠'
  },

  // ==================== 销售代表 换岗路径 ====================
  // 路径1: 直接转换 -> 大客户代表
  {
    from_name: '销售代表',
    to_name: '大客户代表',
    path_type: 'direct',
    intermediate_name: null,
    transfer_difficulty: 'medium',
    steps_required: 1,
    additional_skills: '大客户开发、战略合作、商务谈判、客户关系管理',
    additional_certificates: '销售管理证书',
    transfer_conditions: '有大客户经验、良好的客户关系管理能力',
    salary_impact: '8K-15K → 15K-30K',
    transfer_tips: '销售代表转大客户代表需要提升商务谈判能力',
    blood_relationship: '销售代表与大客户代表同属销售领域，销售技能有70%重叠'
  },
  // 路径2: 直接转换 -> 网络销售
  {
    from_name: '销售代表',
    to_name: '网络销售',
    path_type: 'direct',
    intermediate_name: null,
    transfer_difficulty: 'easy',
    steps_required: 1,
    additional_skills: '电商平台运营、在线沟通、销售话术',
    additional_certificates: '电商运营证书',
    transfer_conditions: '有电商平台销售经验、在线沟通能力',
    salary_impact: '8K-15K → 8K-15K',
    transfer_tips: '销售代表转网络销售相对容易，销售技能可迁移',
    blood_relationship: '销售代表与网络销售同属销售领域，销售技能有60%重叠'
  },
  // 路径3: 直接转换 -> 商务专员
  {
    from_name: '销售代表',
    to_name: '商务专员',
    path_type: 'direct',
    intermediate_name: null,
    transfer_difficulty: 'medium',
    steps_required: 1,
    additional_skills: '商务谈判、合同管理、商务拓展、客户关系',
    additional_certificates: '商务证书',
    transfer_conditions: '有商务谈判经验、合同管理能力',
    salary_impact: '8K-15K → 8K-20K',
    transfer_tips: '销售转商务需要提升商务谈判能力',
    blood_relationship: '销售与商务同属商务领域，谈判技能有50%重叠'
  },
  // 路径4: 经过中间岗位 -> 运营专员
  {
    from_name: '销售代表',
    to_name: '运营专员',
    path_type: 'through',
    intermediate_name: '网络销售',
    transfer_difficulty: 'hard',
    steps_required: 2,
    additional_skills: '用户运营、数据分析、活动策划',
    additional_certificates: '运营证书',
    transfer_conditions: '先转网络销售，再转运营专员',
    salary_impact: '8K-15K → 8K-15K',
    transfer_tips: '销售→网络销售→运营路径较长，但销售经验能帮助理解用户需求',
    blood_relationship: '销售→网络销售→运营构成用户价值链血缘'
  },
  // 路径5: 直接转换 -> BD经理
  {
    from_name: '销售代表',
    to_name: 'BD经理',
    path_type: 'direct',
    intermediate_name: null,
    transfer_difficulty: 'hard',
    steps_required: 1,
    additional_skills: 'BD拓展、资源整合、战略合作、商务谈判',
    additional_certificates: 'BD认证',
    transfer_conditions: '有BD经验、丰富的资源整合能力',
    salary_impact: '8K-15K → 15K-40K',
    transfer_tips: '销售转BD需要提升资源整合能力和战略思维',
    blood_relationship: '销售与BD同属商务领域，但BD更强调资源整合'
  },

  // ==================== 额外：JAVA开发工程师 换岗路径 ====================
  // 路径1: 直接转换 -> 算法工程师
  {
    from_name: '后端开发工程师',
    to_name: '算法工程师',
    path_type: 'direct',
    intermediate_name: null,
    transfer_difficulty: 'hard',
    steps_required: 1,
    additional_skills: '机器学习算法、深度学习框架、数据工程、Python',
    additional_certificates: '深度学习工程师认证、Kaggle证书',
    transfer_conditions: '扎实的数学基础、Python熟练、对ML/DL有深入理解',
    salary_impact: '18K-25K → 20K-40K',
    transfer_tips: '后端转算法工程师需要扎实的数学基础和算法能力',
    blood_relationship: '后端与算法同属技术领域，编程能力有60%重叠'
  },
  // 路径2: 直接转换 -> 架构师 (通过晋升路径)
  {
    from_name: '后端开发工程师',
    to_name: '后端开发工程师',
    path_type: 'direct',
    intermediate_name: null,
    transfer_difficulty: 'medium',
    steps_required: 1,
    additional_skills: '分布式系统设计、高并发处理、微服务架构、云原生',
    additional_certificates: '架构师认证、云原生认证',
    transfer_conditions: '独立设计过中高并发系统、熟悉微服务架构',
    salary_impact: '18K-25K → 25K-45K',
    transfer_tips: '后端晋升高级工程师需要掌握分布式系统设计能力',
    blood_relationship: '初级后端→高级后端同属后端领域，技术栈有90%重叠'
  },

  // ==================== 额外：UI/UX设计师 换岗路径 ====================
  // 路径1: 直接转换 -> 前端开发工程师
  {
    from_name: 'UI/UX设计师',
    to_name: '前端开发工程师',
    path_type: 'direct',
    intermediate_name: null,
    transfer_difficulty: 'medium',
    steps_required: 1,
    additional_skills: 'HTML/CSS/JavaScript、Vue/React、TypeScript',
    additional_certificates: '前端开发工程师证书',
    transfer_conditions: '有前端项目经验、编程基础',
    salary_impact: '12K-20K → 15K-20K',
    transfer_tips: 'UI转前端有天然优势，设计稿实现能力是核心竞争力',
    blood_relationship: 'UI与前端同属界面开发领域，设计还原有60%重叠'
  },
  // 路径2: 直接转换 -> 产品经理
  {
    from_name: 'UI/UX设计师',
    to_name: '产品经理',
    path_type: 'direct',
    intermediate_name: null,
    transfer_difficulty: 'hard',
    steps_required: 1,
    additional_skills: '产品规划、需求分析、项目管理、数据分析',
    additional_certificates: '产品经理证书',
    transfer_conditions: '有产品设计经验、良好的产品思维',
    salary_impact: '12K-20K → 18K-30K',
    transfer_tips: 'UI转产品经理有优势，用户体验思维可迁移',
    blood_relationship: 'UI与产品同属产品设计领域，用户思维有50%重叠'
  },

  // ==================== 额外：游戏运营 换岗路径 ====================
  // 路径1: 直接转换 -> 游戏推广
  {
    from_name: '游戏运营',
    to_name: '游戏推广',
    path_type: 'direct',
    intermediate_name: null,
    transfer_difficulty: 'easy',
    steps_required: 1,
    additional_skills: 'ASO优化、ASM投放、渠道合作、用户增长',
    additional_certificates: '游戏运营证书',
    transfer_conditions: '有游戏推广经验、数据分析能力',
    salary_impact: '10K-20K → 8K-20K',
    transfer_tips: '游戏运营转游戏推广相对容易，用户增长思维可迁移',
    blood_relationship: '游戏运营与游戏推广同属游戏发行领域，推广技能有50%重叠'
  },
  // 路径2: 直接转换 -> 运营专员
  {
    from_name: '游戏运营',
    to_name: '运营专员',
    path_type: 'direct',
    intermediate_name: null,
    transfer_difficulty: 'medium',
    steps_required: 1,
    additional_skills: '用户运营、内容运营、活动策划',
    additional_certificates: '运营证书',
    transfer_conditions: '有互联网运营经验',
    salary_impact: '10K-20K → 8K-15K',
    transfer_tips: '游戏运营转通用运营需要扩展用户运营能力',
    blood_relationship: '游戏运营与运营专员同属运营领域，用户思维有60%重叠'
  }
];

async function insertTransferPaths() {
  console.log('开始获取岗位画像ID映射...');
  const profileIdMap = await getProfileIdMap();
  console.log(`获取到 ${profileIdMap.size} 个岗位画像`);
  
  console.log('开始插入换岗路径...');
  
  let insertedCount = 0;
  let skipCount = 0;
  
  for (const path of transferPaths) {
    const fromJobId = profileIdMap.get(path.from_name);
    const toJobId = profileIdMap.get(path.to_name);
    const intermediateJobId = path.intermediate_name ? profileIdMap.get(path.intermediate_name) : null;
    
    if (!fromJobId) {
      console.log(`跳过: ${path.from_name} -> ${path.to_name} (未找到起始岗位)`);
      skipCount++;
      continue;
    }
    
    if (!toJobId) {
      console.log(`跳过: ${path.from_name} -> ${path.to_name} (未找到目标岗位)`);
      skipCount++;
      continue;
    }
    
    if (path.intermediate_name && !intermediateJobId) {
      console.log(`跳过: ${path.from_name} -> ${path.to_name} via ${path.intermediate_name} (未找到中间岗位)`);
      skipCount++;
      continue;
    }
    
    // 检查是否已存在
    const { data: existing } = await supabase
      .from('job_transfer_graph')
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
      intermediate_job_id: intermediateJobId,
      transfer_difficulty: path.transfer_difficulty,
      steps_required: path.steps_required,
      additional_skills: path.additional_skills,
      additional_certificates: path.additional_certificates,
      transfer_conditions: path.transfer_conditions,
      salary_impact: path.salary_impact,
      transfer_tips: path.transfer_tips,
      blood_relationship: path.blood_relationship,
      is_recommended: path.steps_required === 1 && path.transfer_difficulty !== 'hard'
    };
    
    const { error } = await supabase
      .from('job_transfer_graph')
      .insert(insertData);
    
    if (error) {
      console.error(`插入失败: ${path.from_name} -> ${path.to_name}: ${error.message}`);
    } else {
      console.log(`插入成功: ${path.from_name} -> ${path.to_name}`);
      insertedCount++;
    }
  }
  
  console.log(`\n总计插入: ${insertedCount} 条换岗路径, 跳过: ${skipCount} 条`);
}

insertTransferPaths().catch(console.error);
