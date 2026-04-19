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

// 岗位画像数据
const jobProfiles = [
  // 技术类
  {
    profile_name: 'C/C++',
    category: '技术类',
    description: '负责C/C++软件开发，进行系统级编程和性能优化。',
    professional_skills: 'C/C++编程、STL标准库、多线程编程、内存管理、数据结构与算法、Linux系统编程、Makefile/GDB调试',
    certificate_requirements: '计算机等级考试二级/三级、软件工程师证书',
    innovation_ability: 4,
    learning_ability: 5,
    pressure_resistance: 3,
    communication_ability: 2,
    internship_requirement: '有C/C++项目经验或开源贡献优先',
    education_requirement: '本科及以上',
    work_experience_requirement: '1-3年',
    salary_range: '10000-30000元/月',
    career_direction: '高级C/C++工程师、嵌入式开发、系统架构师、技术专家',
    core_qualifications: '扎实的编程基础、良好的代码风格、系统级思维、性能优化意识',
    tools_requirement: 'GCC/G++、GDB、Valgrind、CMake、Git'
  },
  {
    profile_name: 'Java',
    category: '技术类',
    description: '负责Java后端系统开发，设计和实现业务逻辑。',
    professional_skills: 'Java SE/EE、Spring Boot/Cloud、MySQL/Redis、RESTful API、微服务、Linux服务器、Git版本控制',
    certificate_requirements: '软件工程师证书、Oracle Java认证',
    innovation_ability: 3,
    learning_ability: 5,
    pressure_resistance: 3,
    communication_ability: 3,
    internship_requirement: '有Java Web项目经验优先',
    education_requirement: '本科及以上',
    work_experience_requirement: '1-3年',
    salary_range: '10000-35000元/月',
    career_direction: '高级Java工程师、技术经理、架构师',
    core_qualifications: '面向对象思想、数据库设计能力、问题分析能力',
    tools_requirement: 'IntelliJ IDEA、Maven/Gradle、Git、Docker'
  },
  {
    profile_name: '测试工程师',
    category: '技术类',
    description: '负责软件测试工作，确保产品质量。',
    professional_skills: '测试用例设计、自动化测试、Selenium/Appium、性能测试、接口测试、缺陷管理、测试报告编写',
    certificate_requirements: '软件评测师、ISTQB认证',
    innovation_ability: 3,
    learning_ability: 4,
    pressure_resistance: 4,
    communication_ability: 3,
    internship_requirement: '有测试实习经验优先',
    education_requirement: '本科及以上',
    work_experience_requirement: '1-3年',
    salary_range: '8000-20000元/月',
    career_direction: '高级测试工程师、测试架构师、测试经理、质量总监',
    core_qualifications: '细心严谨、逻辑思维、沟通协调、风险意识',
    tools_requirement: 'Selenium、Postman、Jmeter、Git'
  },
  {
    profile_name: '软件测试',
    category: '技术类',
    description: '负责软件功能测试和质量管理。',
    professional_skills: '功能测试、测试用例编写、缺陷跟踪、回归测试、接口测试、自动化测试基础',
    certificate_requirements: '软件评测师',
    innovation_ability: 3,
    learning_ability: 4,
    pressure_resistance: 3,
    communication_ability: 3,
    internship_requirement: '有软件测试实习经验优先',
    education_requirement: '本科及以上',
    work_experience_requirement: '1-3年',
    salary_range: '7000-18000元/月',
    career_direction: '高级测试工程师、测试主管、质量工程师',
    core_qualifications: '细心、耐心、逻辑清晰、文档能力',
    tools_requirement: 'JIRA、Postman、Selenium、Git'
  },
  {
    profile_name: '技术支持工程师',
    category: '技术类',
    description: '为客户提供技术支持和问题解决。',
    professional_skills: '故障诊断、网络基础、操作系统、远程协助、技术文档编写、客户沟通',
    certificate_requirements: '网络工程师证书、HCIA/HCIP认证',
    innovation_ability: 3,
    learning_ability: 4,
    pressure_resistance: 3,
    communication_ability: 4,
    internship_requirement: '有技术支持或客户服务经验优先',
    education_requirement: '本科及以上',
    work_experience_requirement: '1-3年',
    salary_range: '8000-20000元/月',
    career_direction: '高级技术支持、技术销售、解决方案专家',
    core_qualifications: '技术敏感度、耐心、服务意识、沟通能力',
    tools_requirement: '远程桌面、监控工具、CRM系统'
  },
  {
    profile_name: '硬件测试',
    category: '技术类',
    description: '负责硬件产品测试和验证。',
    professional_skills: '硬件测试理论、电子电路基础、测试设备使用、可靠性测试、环境测试',
    certificate_requirements: '硬件工程师证书',
    innovation_ability: 3,
    learning_ability: 4,
    pressure_resistance: 3,
    communication_ability: 2,
    internship_requirement: '有硬件测试或电子实习经验优先',
    education_requirement: '本科及以上',
    work_experience_requirement: '1-3年',
    salary_range: '7000-18000元/月',
    career_direction: '高级硬件测试工程师、硬件工程师、品质管理',
    core_qualifications: '电子基础、动手能力、细心严谨',
    tools_requirement: '示波器、万用表、信号发生器'
  },
  {
    profile_name: '质量管理/测试',
    category: '技术类',
    description: '负责质量管理和测试工作。',
    professional_skills: '质量管理理论、测试方法、ISO标准、流程优化、数据分析、报告编写',
    certificate_requirements: '质量工程师证书、ISO审核员证书',
    innovation_ability: 3,
    learning_ability: 4,
    pressure_resistance: 3,
    communication_ability: 4,
    internship_requirement: '有质量管理或测试实习经验优先',
    education_requirement: '本科及以上',
    work_experience_requirement: '1-3年',
    salary_range: '8000-20000元/月',
    career_direction: '质量管理/测试主管、质量经理、流程优化专家',
    core_qualifications: '质量意识、系统思维、数据分析、沟通协调',
    tools_requirement: '质量分析工具、统计软件、办公软件'
  },
  {
    profile_name: '质检员',
    category: '技术类',
    description: '负责产品质量检验和控制。',
    professional_skills: '质量检验标准、测量工具使用、缺陷识别、数据记录、不良品处理',
    certificate_requirements: '质量检验员证书',
    innovation_ability: 2,
    learning_ability: 3,
    pressure_resistance: 3,
    communication_ability: 2,
    internship_requirement: '有质检或生产实习经验优先',
    education_requirement: '大专及以上',
    work_experience_requirement: '1年以下',
    salary_range: '4000-8000元/月',
    career_direction: '高级质检员、质检主管、质量工程师',
    core_qualifications: '细心、责任心、标准执行',
    tools_requirement: '测量工具、检验设备、办公软件'
  },
  // 产品运营类
  {
    profile_name: '产品专员/助理',
    category: '产品类',
    description: '协助产品经理进行产品规划和需求管理。',
    professional_skills: '需求分析、产品设计、竞品分析、用户调研、原型设计、数据分析、文档编写',
    certificate_requirements: '产品经理证书',
    innovation_ability: 3,
    learning_ability: 4,
    pressure_resistance: 3,
    communication_ability: 4,
    internship_requirement: '有产品实习或项目经验优先',
    education_requirement: '本科及以上',
    work_experience_requirement: '1年以下',
    salary_range: '6000-15000元/月',
    career_direction: '产品经理、高级产品经理、产品总监',
    core_qualifications: '用户思维、逻辑分析、沟通协调、学习能力',
    tools_requirement: 'Axure、XMind、ProcessOn、数据分析工具'
  },
  {
    profile_name: '社区运营',
    category: '运营类',
    description: '负责社区内容建设和用户活跃度提升。',
    professional_skills: '内容策划、用户运营、活动策划、社群管理、数据分析、内容编辑',
    certificate_requirements: '新媒体运营证书',
    innovation_ability: 4,
    learning_ability: 4,
    pressure_resistance: 3,
    communication_ability: 5,
    internship_requirement: '有社区运营或新媒体实习经验优先',
    education_requirement: '本科及以上',
    work_experience_requirement: '1-3年',
    salary_range: '6000-15000元/月',
    career_direction: '社区运营经理、用户运营经理、内容运营总监',
    core_qualifications: '用户思维、内容敏感度、数据分析、沟通协调',
    tools_requirement: '社区管理工具、内容编辑器、数据分析工具'
  },
  {
    profile_name: '内容审核',
    category: '运营类',
    description: '负责平台内容审核和质量把控。',
    professional_skills: '内容识别、审核标准、风险判断、敏感词过滤、违规处理',
    certificate_requirements: '内容审核员证书',
    innovation_ability: 2,
    learning_ability: 3,
    pressure_resistance: 4,
    communication_ability: 2,
    internship_requirement: '有内容审核或编辑实习经验优先',
    education_requirement: '大专及以上',
    work_experience_requirement: '1年以下',
    salary_range: '5000-10000元/月',
    career_direction: '审核主管、内容质检、风控专员',
    core_qualifications: '政治敏感度、细心耐心、风险意识',
    tools_requirement: '审核系统、敏感词库、办公软件'
  },
  {
    profile_name: '网络客服',
    category: '客服类',
    description: '通过网络渠道为客户提供咨询和服务。',
    professional_skills: '在线沟通、问题解答、投诉处理、情绪管理、打字速度、办公软件',
    certificate_requirements: '客服证书',
    innovation_ability: 2,
    learning_ability: 3,
    pressure_resistance: 4,
    communication_ability: 5,
    internship_requirement: '有客服或销售实习经验优先',
    education_requirement: '大专及以上',
    work_experience_requirement: '1年以下',
    salary_range: '4000-8000元/月',
    career_direction: '客服主管、售后客服、客服培训师',
    core_qualifications: '耐心、服务意识、情绪管理、沟通能力',
    tools_requirement: '客服系统、CRM、办公软件'
  },
  // 销售类
  {
    profile_name: 'BD经理',
    category: '销售类',
    description: '负责业务拓展和合作伙伴开发。',
    professional_skills: '商务谈判、资源整合、项目推进、客户关系、行业分析、商业模式设计',
    certificate_requirements: '商务英语证书',
    innovation_ability: 4,
    learning_ability: 4,
    pressure_resistance: 4,
    communication_ability: 5,
    internship_requirement: '有BD、销售或商务实习经验优先',
    education_requirement: '本科及以上',
    work_experience_requirement: '3-5年',
    salary_range: '15000-40000元/月',
    career_direction: '高级BD经理、BD总监、商务VP',
    core_qualifications: '商业敏感度、谈判能力、资源整合、人脉拓展',
    tools_requirement: 'CRM、PPT、Excel、合同管理'
  },
  {
    profile_name: 'APP推广',
    category: '市场类',
    description: '负责移动应用推广和用户增长。',
    professional_skills: 'ASO优化、ASM投放、渠道合作、用户增长、数据分析、活动策划',
    certificate_requirements: '数字营销证书',
    innovation_ability: 4,
    learning_ability: 4,
    pressure_resistance: 3,
    communication_ability: 4,
    internship_requirement: '有推广或运营实习经验优先',
    education_requirement: '本科及以上',
    work_experience_requirement: '1-3年',
    salary_range: '8000-20000元/月',
    career_direction: '推广总监、用户增长负责人、市场总监',
    core_qualifications: '数据驱动、渠道敏感度、创新思维',
    tools_requirement: '数据分析平台、投放后台、ASO工具'
  },
  {
    profile_name: '大客户代表',
    category: '销售类',
    description: '负责大客户开发和服务。',
    professional_skills: '大客户开发、商务谈判、关系维护、方案呈现、合同签订、回款管理',
    certificate_requirements: '销售认证证书',
    innovation_ability: 3,
    learning_ability: 3,
    pressure_resistance: 4,
    communication_ability: 5,
    internship_requirement: '有大客户销售实习经验优先',
    education_requirement: '本科及以上',
    work_experience_requirement: '3-5年',
    salary_range: '15000-40000元/月',
    career_direction: '大客户经理、销售总监',
    core_qualifications: '商务谈判、客户关系、资源整合',
    tools_requirement: 'CRM、ERP、办公软件'
  },
  {
    profile_name: '广告销售',
    category: '销售类',
    description: '负责广告产品销售和客户开发。',
    professional_skills: '广告产品销售、客户开发、方案制作、谈判签约、关系维护、业绩达成',
    certificate_requirements: '广告从业资格证',
    innovation_ability: 3,
    learning_ability: 3,
    pressure_resistance: 4,
    communication_ability: 5,
    internship_requirement: '有广告或媒体销售实习经验优先',
    education_requirement: '本科及以上',
    work_experience_requirement: '1-3年',
    salary_range: '10000-30000元/月',
    career_direction: '广告销售经理、媒介总监、客户总监',
    core_qualifications: '媒体敏感度、谈判能力、客户关系',
    tools_requirement: 'CRM、广告投放平台、PPT'
  },
  {
    profile_name: '电话销售',
    category: '销售类',
    description: '通过电话进行产品销售。',
    professional_skills: '电话销售、客户开发、产品介绍、异议处理、促成签单、客户跟进',
    certificate_requirements: '销售证书',
    innovation_ability: 2,
    learning_ability: 3,
    pressure_resistance: 4,
    communication_ability: 5,
    internship_requirement: '有销售或客服实习经验优先',
    education_requirement: '大专及以上',
    work_experience_requirement: '1年以下',
    salary_range: '5000-15000元/月',
    career_direction: '销售主管、门店经理、区域销售',
    core_qualifications: '声音感染力、抗压能力、坚持不懈',
    tools_requirement: '电话系统、CRM、办公软件'
  },
  {
    profile_name: '销售助理',
    category: '销售类',
    description: '协助销售团队完成日常工作。',
    professional_skills: '销售支持、合同管理、客户跟进、报表制作、会议组织、文档管理',
    certificate_requirements: '商务证书',
    innovation_ability: 2,
    learning_ability: 3,
    pressure_resistance: 3,
    communication_ability: 4,
    internship_requirement: '有助理或销售实习经验优先',
    education_requirement: '本科及以上',
    work_experience_requirement: '1年以下',
    salary_range: '5000-10000元/月',
    career_direction: '销售专员、大客户经理、销售经理',
    core_qualifications: '细心、服务意识、沟通协调',
    tools_requirement: 'CRM、ERP、办公软件'
  },
  {
    profile_name: '销售工程师',
    category: '销售类',
    description: '技术型销售，为客户提供解决方案。',
    professional_skills: '技术销售、方案设计、客户需求分析、产品演示、技术支持、谈判签约',
    certificate_requirements: '技术销售证书',
    innovation_ability: 3,
    learning_ability: 4,
    pressure_resistance: 3,
    communication_ability: 5,
    internship_requirement: '有技术销售或售前实习经验优先',
    education_requirement: '本科及以上',
    work_experience_requirement: '1-3年',
    salary_range: '12000-30000元/月',
    career_direction: '高级销售工程师、售前经理、销售总监',
    core_qualifications: '技术背景、沟通能力、解决方案思维',
    tools_requirement: '技术文档、方案制作工具、CRM'
  },
  {
    profile_name: '销售运营',
    category: '销售类',
    description: '负责销售运营和数据分析。',
    professional_skills: '销售数据分析、CRM管理、销售流程优化、报表制作、团队协作',
    certificate_requirements: '数据分析证书',
    innovation_ability: 3,
    learning_ability: 4,
    pressure_resistance: 3,
    communication_ability: 4,
    internship_requirement: '有运营或数据分析实习经验优先',
    education_requirement: '本科及以上',
    work_experience_requirement: '1-3年',
    salary_range: '10000-25000元/月',
    career_direction: '销售运营经理、CRM经理、销售总监',
    core_qualifications: '数据分析、逻辑思维、流程优化',
    tools_requirement: 'CRM、Excel、Tableau、数据分析工具'
  },
  // 咨询类
  {
    profile_name: '咨询顾问',
    category: '咨询类',
    description: '为客户提供专业咨询服务。',
    professional_skills: '咨询方法论、行业分析、报告撰写、方案设计、客户沟通、项目管理',
    certificate_requirements: '管理咨询证书',
    innovation_ability: 4,
    learning_ability: 5,
    pressure_resistance: 4,
    communication_ability: 5,
    internship_requirement: '有咨询或研究实习经验优先',
    education_requirement: '本科及以上',
    work_experience_requirement: '1-3年',
    salary_range: '15000-40000元/月',
    career_direction: '高级顾问、咨询经理、合伙人',
    core_qualifications: '逻辑思维、行业洞察、沟通表达、学习能力',
    tools_requirement: 'PPT、Word、Excel、行业数据库'
  },
  {
    profile_name: '猎头顾问',
    category: '咨询类',
    description: '为客户猎取高端人才。',
    professional_skills: '人才寻访、面试评估、客户开发、薪资谈判、行业研究、人脉拓展',
    certificate_requirements: '人力资源证书',
    innovation_ability: 3,
    learning_ability: 4,
    pressure_resistance: 4,
    communication_ability: 5,
    internship_requirement: '有猎头或HR实习经验优先',
    education_requirement: '本科及以上',
    work_experience_requirement: '1-3年',
    salary_range: '15000-50000元/月',
    career_direction: '高级猎头、猎头团队负责人、HRVP',
    core_qualifications: '识人能力、人脉资源、谈判能力、耐心',
    tools_requirement: '猎头系统、LinkedIn、办公软件'
  },
  // 法务类
  {
    profile_name: '律师',
    category: '法务类',
    description: '提供法律服务和咨询。',
    professional_skills: '法律咨询、合同审核、诉讼代理、法律研究、文书撰写、风险评估',
    certificate_requirements: '法律职业资格证书',
    innovation_ability: 3,
    learning_ability: 5,
    pressure_resistance: 4,
    communication_ability: 4,
    internship_requirement: '有律所或法务实习经验优先',
    education_requirement: '本科及以上',
    work_experience_requirement: '3-5年',
    salary_range: '20000-60000元/月',
    career_direction: '高级律师、合伙人、法务总监',
    core_qualifications: '法律专业、逻辑严谨、风险意识',
    tools_requirement: '法律数据库、文档处理软件'
  },
  {
    profile_name: '律师助理',
    category: '法务类',
    description: '协助律师处理法律事务。',
    professional_skills: '法律检索、资料整理、文书撰写、案件跟进、客户沟通、研究能力',
    certificate_requirements: '法律职业资格证书',
    innovation_ability: 3,
    learning_ability: 4,
    pressure_resistance: 3,
    communication_ability: 4,
    internship_requirement: '有律所实习经验优先',
    education_requirement: '本科及以上',
    work_experience_requirement: '1年以下',
    salary_range: '6000-15000元/月',
    career_direction: '律师、高级律师、合伙人',
    core_qualifications: '法律基础、细心、文字表达',
    tools_requirement: '法律数据库、Word、办公软件'
  },
  // 管理培训类
  {
    profile_name: '储备干部',
    category: '管理类',
    description: '企业培养的未来管理者。',
    professional_skills: '轮岗学习、管理基础、业务流程、团队协作、自我管理、职业规划',
    certificate_requirements: '管培生证书',
    innovation_ability: 3,
    learning_ability: 5,
    pressure_resistance: 3,
    communication_ability: 4,
    internship_requirement: '有实习或社团经验优先',
    education_requirement: '本科及以上',
    work_experience_requirement: '1年以下',
    salary_range: '6000-12000元/月',
    career_direction: '部门主管、经理、总监',
    core_qualifications: '学习能力、适应能力、领导潜力',
    tools_requirement: '办公软件、汇报展示'
  },
  {
    profile_name: '储备经理人',
    category: '管理类',
    description: '培养成为企业管理层人才。',
    professional_skills: '战略思维、团队管理、业务运营、决策分析、沟通协调、项目管理',
    certificate_requirements: '管理学证书',
    innovation_ability: 4,
    learning_ability: 4,
    pressure_resistance: 4,
    communication_ability: 5,
    internship_requirement: '有管理实习或项目经验优先',
    education_requirement: '本科及以上',
    work_experience_requirement: '1-3年',
    salary_range: '10000-25000元/月',
    career_direction: '部门经理、总监、副总裁',
    core_qualifications: '领导力、战略眼光、决策能力',
    tools_requirement: '管理工具、数据分析、办公软件'
  },
  {
    profile_name: '管培生/储备干部',
    category: '管理类',
    description: '企业重点培养的管理人才。',
    professional_skills: '多业务学习、领导力培养、问题解决、团队协作、创新思维、职业规划',
    certificate_requirements: '企业管培生项目证书',
    innovation_ability: 4,
    learning_ability: 5,
    pressure_resistance: 3,
    communication_ability: 4,
    internship_requirement: '有社会实践或项目经历优先',
    education_requirement: '本科及以上',
    work_experience_requirement: '1年以下',
    salary_range: '7000-15000元/月',
    career_direction: '管理者、部门负责人、高管',
    core_qualifications: '学习能力、领导潜质、抗压能力',
    tools_requirement: '办公软件、项目管理'
  },
  {
    profile_name: '项目专员/助理',
    category: '管理类',
    description: '协助项目管理和执行。',
    professional_skills: '项目协助、文档管理、进度跟踪、会议组织、沟通协调、报告编写',
    certificate_requirements: 'PMP认证、项目管理证书',
    innovation_ability: 3,
    learning_ability: 4,
    pressure_resistance: 3,
    communication_ability: 4,
    internship_requirement: '有项目管理或助理实习经验优先',
    education_requirement: '本科及以上',
    work_experience_requirement: '1年以下',
    salary_range: '5000-12000元/月',
    career_direction: '项目经理、项目管理经理、PMO负责人',
    core_qualifications: '组织能力、沟通协调、细心',
    tools_requirement: '项目管理软件、Office、Visio'
  },
  {
    profile_name: '项目招投标',
    category: '管理类',
    description: '负责项目招投标工作。',
    professional_skills: '招投标流程、标书制作、商务谈判、合同管理、项目跟进、客户沟通',
    certificate_requirements: '招投标从业资格证',
    innovation_ability: 3,
    learning_ability: 3,
    pressure_resistance: 4,
    communication_ability: 4,
    internship_requirement: '有招投标或商务实习经验优先',
    education_requirement: '本科及以上',
    work_experience_requirement: '1-3年',
    salary_range: '8000-18000元/月',
    career_direction: '招投标经理、商务经理、项目总监',
    core_qualifications: '商务敏感度、文书能力、谈判技巧',
    tools_requirement: '招投标平台、Word、PDF制作'
  },
  {
    profile_name: '项目经理/主管',
    category: '管理类',
    description: '负责项目规划、执行和交付。',
    professional_skills: '项目管理、团队管理、风险管理、干系人管理、进度控制、质量管理',
    certificate_requirements: 'PMP认证、ACP认证',
    innovation_ability: 3,
    learning_ability: 4,
    pressure_resistance: 4,
    communication_ability: 5,
    internship_requirement: '有项目管理经验优先',
    education_requirement: '本科及以上',
    work_experience_requirement: '3-5年',
    salary_range: '15000-35000元/月',
    career_direction: '高级项目经理、项目总监、PMO总监',
    core_qualifications: '全局思维、风险意识、沟通协调',
    tools_requirement: '项目管理软件、Office、Visio'
  },
  // 客服类
  {
    profile_name: '售后客服',
    category: '客服类',
    description: '处理客户售后问题和投诉。',
    professional_skills: '售后服务、投诉处理、问题解决、情绪管理、客户回访、记录反馈',
    certificate_requirements: '客服证书',
    innovation_ability: 2,
    learning_ability: 3,
    pressure_resistance: 4,
    communication_ability: 5,
    internship_requirement: '有客服或售后实习经验优先',
    education_requirement: '大专及以上',
    work_experience_requirement: '1年以下',
    salary_range: '4000-8000元/月',
    career_direction: '售后主管、客服经理、客服培训师',
    core_qualifications: '耐心、服务意识、情绪管理',
    tools_requirement: '客服系统、CRM、办公软件'
  },
  {
    profile_name: '电话客服',
    category: '客服类',
    description: '通过电话为客户提供服务。',
    professional_skills: '电话沟通、问题解答、投诉处理、电话营销、客户维护、记录管理',
    certificate_requirements: '客服证书',
    innovation_ability: 2,
    learning_ability: 3,
    pressure_resistance: 4,
    communication_ability: 5,
    internship_requirement: '有客服实习经验优先',
    education_requirement: '大专及以上',
    work_experience_requirement: '1年以下',
    salary_range: '4000-8000元/月',
    career_direction: '客服组长、客服主管、培训师',
    core_qualifications: '声音条件、沟通能力、抗压能力',
    tools_requirement: '电话系统、CRM、办公软件'
  },
  // 翻译类
  {
    profile_name: '日语翻译',
    category: '翻译类',
    description: '负责日语翻译工作。',
    professional_skills: '日语翻译、口译/笔译、商务日语、日本文化、行业术语',
    certificate_requirements: '日语N1/N2证书、翻译资格证',
    innovation_ability: 2,
    learning_ability: 4,
    pressure_resistance: 3,
    communication_ability: 4,
    internship_requirement: '有翻译或日语实习经验优先',
    education_requirement: '本科及以上',
    work_experience_requirement: '1-3年',
    salary_range: '8000-20000元/月',
    career_direction: '高级翻译、翻译主管、项目经理',
    core_qualifications: '日语水平、文化理解、专业术语',
    tools_requirement: '翻译软件、办公软件、日语输入法'
  },
  {
    profile_name: '英语翻译',
    category: '翻译类',
    description: '负责英语翻译工作。',
    professional_skills: '英语翻译、口译/笔译、商务英语、行业术语、跨文化沟通',
    certificate_requirements: '英语专业八级、翻译资格证CATTI',
    innovation_ability: 2,
    learning_ability: 4,
    pressure_resistance: 3,
    communication_ability: 4,
    internship_requirement: '有翻译或英语实习经验优先',
    education_requirement: '本科及以上',
    work_experience_requirement: '1-3年',
    salary_range: '8000-25000元/月',
    career_direction: '高级翻译、翻译总监、外贸经理',
    core_qualifications: '英语水平、专业背景、文化理解',
    tools_requirement: '翻译软件、Trados、办公软件'
  },
  // 游戏类
  {
    profile_name: '游戏推广',
    category: '市场类',
    description: '负责游戏产品推广和用户获取。',
    professional_skills: '游戏推广、渠道合作、活动策划、用户获取、社群运营、数据分析',
    certificate_requirements: '游戏行业证书',
    innovation_ability: 4,
    learning_ability: 4,
    pressure_resistance: 3,
    communication_ability: 4,
    internship_requirement: '有游戏推广或运营实习经验优先',
    education_requirement: '大专及以上',
    work_experience_requirement: '1-3年',
    salary_range: '6000-15000元/月',
    career_direction: '推广经理、运营经理、市场总监',
    core_qualifications: '游戏热爱、数据敏感、创意策划',
    tools_requirement: '数据分析平台、社群工具、投放后台'
  },
  {
    profile_name: '游戏运营',
    category: '运营类',
    description: '负责游戏日常运营和活动策划。',
    professional_skills: '游戏运营、活动策划、数据分析、用户运营、内容运营、社群管理',
    certificate_requirements: '游戏行业证书',
    innovation_ability: 4,
    learning_ability: 4,
    pressure_resistance: 3,
    communication_ability: 4,
    internship_requirement: '有游戏运营实习经验优先',
    education_requirement: '本科及以上',
    work_experience_requirement: '1-3年',
    salary_range: '8000-20000元/月',
    career_direction: '运营经理、运营总监、制作人',
    core_qualifications: '游戏热爱、数据分析、用户思维',
    tools_requirement: '游戏后台、数据分析工具、办公软件'
  },
  // 其他专业类
  {
    profile_name: '培训师',
    category: '教育类',
    description: '负责企业内部或外部培训。',
    professional_skills: '培训课程开发、授课技巧、需求分析、课件制作、培训评估、演讲能力',
    certificate_requirements: '培训师职业证书',
    innovation_ability: 4,
    learning_ability: 5,
    pressure_resistance: 3,
    communication_ability: 5,
    internship_requirement: '有培训或教学实习经验优先',
    education_requirement: '本科及以上',
    work_experience_requirement: '1-3年',
    salary_range: '10000-25000元/月',
    career_direction: '高级培训师、培训经理、培训总监',
    core_qualifications: '表达力、感染力、专业知识',
    tools_requirement: 'PPT、微课制作工具、在线培训平台'
  },
  {
    profile_name: '档案管理',
    category: '行政类',
    description: '负责档案整理和管理工作。',
    professional_skills: '档案整理、分类编目、数字化处理、保密管理、检索查询',
    certificate_requirements: '档案管理员证书',
    innovation_ability: 2,
    learning_ability: 3,
    pressure_resistance: 2,
    communication_ability: 2,
    internship_requirement: '有档案或行政实习经验优先',
    education_requirement: '大专及以上',
    work_experience_requirement: '1年以下',
    salary_range: '4000-7000元/月',
    career_direction: '档案主管、行政经理',
    core_qualifications: '细心、保密意识、条理性',
    tools_requirement: '档案管理系统、办公软件'
  },
  {
    profile_name: '资料管理',
    category: '行政类',
    description: '负责资料收集、整理和归档。',
    professional_skills: '资料整理、分类归档、版本管理、检索查询、文档规范',
    certificate_requirements: '资料管理员证书',
    innovation_ability: 2,
    learning_ability: 3,
    pressure_resistance: 2,
    communication_ability: 2,
    internship_requirement: '有资料管理或行政实习经验优先',
    education_requirement: '大专及以上',
    work_experience_requirement: '1年以下',
    salary_range: '4000-7000元/月',
    career_direction: '资料主管、文档经理',
    core_qualifications: '细心、条理性、保密意识',
    tools_requirement: '文档管理系统、办公软件'
  },
  {
    profile_name: '风电工程师',
    category: '技术类',
    description: '负责风电场技术支持和运维。',
    professional_skills: '风力发电技术、电气知识、设备维护、故障诊断、安全规范',
    certificate_requirements: '电气工程师证书、风电从业资格证',
    innovation_ability: 3,
    learning_ability: 4,
    pressure_resistance: 3,
    communication_ability: 2,
    internship_requirement: '有风电或电力实习经验优先',
    education_requirement: '本科及以上',
    work_experience_requirement: '1-3年',
    salary_range: '10000-25000元/月',
    career_direction: '高级风电工程师、技术经理、项目经理',
    core_qualifications: '电气基础、动手能力、安全意识',
    tools_requirement: '风电监控系统、电气工具'
  },
  {
    profile_name: '知识产权/专利代理',
    category: '法务类',
    description: '负责专利申请和知识产权服务。',
    professional_skills: '专利撰写、专利检索、知识产权法律、申请流程、技术理解',
    certificate_requirements: '专利代理人资格证书',
    innovation_ability: 3,
    learning_ability: 5,
    pressure_resistance: 3,
    communication_ability: 3,
    internship_requirement: '有专利或法律实习经验优先',
    education_requirement: '本科及以上',
    work_experience_requirement: '1-3年',
    salary_range: '10000-25000元/月',
    career_direction: '高级专利代理、合伙人、知识产权总监',
    core_qualifications: '技术理解、法律基础、文字表达',
    tools_requirement: '专利检索系统、办公软件'
  },
  {
    profile_name: '统计员',
    category: '职能类',
    description: '负责数据统计和分析工作。',
    professional_skills: '数据统计、分析方法、报告撰写、图表制作、Excel/SPSS',
    certificate_requirements: '统计师证书',
    innovation_ability: 3,
    learning_ability: 4,
    pressure_resistance: 2,
    communication_ability: 3,
    internship_requirement: '有统计或数据分析实习经验优先',
    education_requirement: '本科及以上',
    work_experience_requirement: '1年以下',
    salary_range: '5000-10000元/月',
    career_direction: '统计分析师、数据分析师、数据工程师',
    core_qualifications: '数据分析、逻辑思维、细心',
    tools_requirement: 'Excel、SPSS、Python、SQL'
  },
  {
    profile_name: '总助/CEO助理/董事长助理',
    category: '管理类',
    description: '为高管提供全方位支持。',
    professional_skills: '日程管理、商务接待、行程安排、会议组织、文档撰写、沟通协调',
    certificate_requirements: '秘书证书、MBA',
    innovation_ability: 3,
    learning_ability: 5,
    pressure_resistance: 4,
    communication_ability: 5,
    internship_requirement: '有高管助理或秘书实习经验优先',
    education_requirement: '本科及以上',
    work_experience_requirement: '1-3年',
    salary_range: '10000-30000元/月',
    career_direction: '高管秘书、行政总监、COO',
    core_qualifications: '情商、全局思维、保密意识、多任务处理',
    tools_requirement: '办公软件、日程管理工具'
  },
  {
    profile_name: '网络销售',
    category: '销售类',
    description: '通过网络渠道进行产品销售。',
    professional_skills: '网络销售、在线沟通、产品介绍、客户开发、促成签单',
    certificate_requirements: '电商运营证书',
    innovation_ability: 3,
    learning_ability: 3,
    pressure_resistance: 3,
    communication_ability: 5,
    internship_requirement: '有网络销售或电商实习经验优先',
    education_requirement: '大专及以上',
    work_experience_requirement: '1年以下',
    salary_range: '5000-15000元/月',
    career_direction: '销售主管、电商运营经理',
    core_qualifications: '沟通能力、服务意识、执行力',
    tools_requirement: '电商平台、CRM、办公软件'
  },
  {
    profile_name: '运营助理/专员',
    category: '运营类',
    description: '协助运营团队完成日常工作。',
    professional_skills: '运营支持、数据统计、内容编辑、活动协助、沟通协调',
    certificate_requirements: '运营相关证书',
    innovation_ability: 3,
    learning_ability: 4,
    pressure_resistance: 3,
    communication_ability: 4,
    internship_requirement: '有运营实习经验优先',
    education_requirement: '本科及以上',
    work_experience_requirement: '1年以下',
    salary_range: '5000-12000元/月',
    career_direction: '运营专员、运营经理、运营总监',
    core_qualifications: '学习能力、执行力、细心',
    tools_requirement: '办公软件、数据分析工具'
  }
];

async function insertProfiles() {
  console.log('开始插入岗位画像...');
  
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
      console.error(`插入失败: ${profile.profile_name}`, error);
    } else {
      console.log(`插入成功: ${profile.profile_name}`);
      insertedCount++;
    }
  }
  
  console.log(`\n总计插入: ${insertedCount} 条画像`);
}

insertProfiles().catch(console.error);
