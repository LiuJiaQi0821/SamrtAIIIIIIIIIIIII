import { getSupabaseClient } from '/workspace/projects/src/storage/database/supabase-client';

interface JobProfile {
  profile_name: string;
  category: string;
  description: string;
  professional_skills: string;
  certificate_requirements: string;
  innovation_ability: number;
  learning_ability: number;
  pressure_resistance: number;
  communication_ability: number;
  internship_requirement: string;
  education_requirement: string;
  work_experience_requirement: string;
  salary_range: string;
  career_direction: string;
  core_qualifications: string;
  tools_requirement: string;
}

// 构建12个岗位画像
const jobProfiles: JobProfile[] = [
  {
    profile_name: '前端开发工程师',
    category: '技术类',
    description: '负责Web前端页面设计与开发，实现用户交互界面，优化页面性能和用户体验。',
    professional_skills: 'HTML5/CSS3/JavaScript、Vue/React框架、TypeScript、Webpack/Vite前端工程化、响应式布局、移动端适配、性能优化、浏览器兼容性处理',
    certificate_requirements: '前端工程师证书、Web前端开发职业技能等级证书',
    innovation_ability: 4,
    learning_ability: 5,
    pressure_resistance: 3,
    communication_ability: 3,
    internship_requirement: '有Web开发项目经验或实习经历优先',
    education_requirement: '本科及以上',
    work_experience_requirement: '1-3年',
    salary_range: '8000-20000元/月',
    career_direction: '高级前端工程师、前端架构师、技术经理、产品经理',
    core_qualifications: '良好的代码编写习惯、审美能力、用户导向思维、团队协作能力',
    tools_requirement: 'VS Code、Git、Figma、Chrome DevTools',
  },
  {
    profile_name: '后端开发工程师',
    category: '技术类',
    description: '负责服务器端业务逻辑开发、API设计、数据库设计与优化，保障系统稳定运行。',
    professional_skills: 'Java/Python/Go语言、Spring Boot/Django框架、MySQL/PostgreSQL数据库、Redis缓存、RESTful API设计、微服务架构、Linux服务器操作、Docker容器化',
    certificate_requirements: '软件工程师证书、数据库工程师证书、AWS/阿里云认证',
    innovation_ability: 4,
    learning_ability: 5,
    pressure_resistance: 4,
    communication_ability: 3,
    internship_requirement: '有后端开发项目或实习经历，熟悉数据库操作',
    education_requirement: '本科及以上',
    work_experience_requirement: '1-5年',
    salary_range: '10000-25000元/月',
    career_direction: '高级后端工程师、架构师、技术总监、CTO',
    core_qualifications: '逻辑思维能力强、问题分析能力、系统设计能力、安全意识',
    tools_requirement: 'IDEA/VS Code、Git、Docker、Postman、Jmeter',
  },
  {
    profile_name: '软件测试工程师',
    category: '技术类',
    description: '负责软件质量保障，设计测试用例、执行测试、提交缺陷报告，保证产品上线质量。',
    professional_skills: '测试用例设计、黑盒/白盒测试、功能测试、自动化测试、Selenium/Appium、性能测试、JMeter、缺陷管理、测试报告撰写',
    certificate_requirements: '软件测试工程师证书、ISTQB测试工程师认证',
    innovation_ability: 3,
    learning_ability: 4,
    pressure_resistance: 3,
    communication_ability: 4,
    internship_requirement: '有测试实习经历或参与过测试项目',
    education_requirement: '本科及以上',
    work_experience_requirement: '1-3年',
    salary_range: '7000-15000元/月',
    career_direction: '高级测试工程师、测试架构师、测试经理、质量总监',
    core_qualifications: '细心耐心、逻辑严谨、质量意识、沟通协调能力',
    tools_requirement: 'Selenium、JMeter、Postman、Git、JIRA',
  },
  {
    profile_name: '产品经理',
    category: '产品类',
    description: '负责产品规划、需求分析、原型设计，协调研发团队推动产品迭代。',
    professional_skills: '需求分析、竞品分析、用户研究、产品设计、Axure/墨刀原型设计、数据分析、PRD文档撰写、敏捷开发流程',
    certificate_requirements: '产品经理证书、NPDP产品经理国际认证',
    innovation_ability: 5,
    learning_ability: 4,
    pressure_resistance: 4,
    communication_ability: 5,
    internship_requirement: '有互联网产品实习经验，参与过产品设计项目',
    education_requirement: '本科及以上',
    work_experience_requirement: '1-5年',
    salary_range: '12000-30000元/月',
    career_direction: '高级产品经理、产品总监、COO、创业者',
    core_qualifications: '商业敏感度、用户思维、数据驱动决策、跨部门协调能力',
    tools_requirement: 'Axure、墨刀、Figma、XMind、SQL',
  },
  {
    profile_name: '运营专员',
    category: '运营类',
    description: '负责内容运营、用户运营、活动策划，提升用户活跃度和产品转化率。',
    professional_skills: '内容策划、用户运营、数据分析、社群运营、活动策划与执行、文案撰写、渠道推广、SEO基础',
    certificate_requirements: '互联网运营师证书、新媒体运营师证书',
    innovation_ability: 4,
    learning_ability: 4,
    pressure_resistance: 3,
    communication_ability: 5,
    internship_requirement: '有新媒体运营或电商运营实习经验',
    education_requirement: '大专及以上',
    work_experience_requirement: '不限',
    salary_range: '5000-12000元/月',
    career_direction: '运营主管、运营经理、运营总监、自媒体创业者',
    core_qualifications: '创意思维、数据敏感度、执行力、用户洞察',
    tools_requirement: 'Office、PS/PR基础、数据分析工具、社交媒体管理工具',
  },
  {
    profile_name: '销售代表',
    category: '销售类',
    description: '负责客户开发、产品销售、商务谈判，完成销售业绩目标。',
    professional_skills: '客户开发、电话销售、面销技巧、商务谈判、合同签订、客户关系维护、销售数据分析、市场开拓',
    certificate_requirements: '销售从业资格证、证券/基金从业资格证（金融行业）',
    innovation_ability: 3,
    learning_ability: 3,
    pressure_resistance: 5,
    communication_ability: 5,
    internship_requirement: '有销售实习或兼职经历，有校园代理经验优先',
    education_requirement: '大专及以上',
    work_experience_requirement: '不限',
    salary_range: '5000-15000元/月+提成',
    career_direction: '销售主管、销售经理、销售总监、商务总监',
    core_qualifications: '抗压能力、目标导向、人际交往能力、积极心态',
    tools_requirement: 'CRM系统、Office、电话系统',
  },
  {
    profile_name: 'UI/UX设计师',
    category: '设计类',
    description: '负责产品界面设计、用户体验优化，设计符合品牌调性的视觉方案。',
    professional_skills: 'UI设计、UX设计、Figma/Sketch、Adobe全家桶、图标设计、动效设计、配色理论、用户研究、交互设计规范',
    certificate_requirements: 'Adobe认证设计师、UI设计证书',
    innovation_ability: 5,
    learning_ability: 4,
    pressure_resistance: 3,
    communication_ability: 4,
    internship_requirement: '有设计作品集，有App或Web设计项目经验',
    education_requirement: '本科及以上',
    work_experience_requirement: '1-3年',
    salary_range: '8000-18000元/月',
    career_direction: '高级设计师、设计主管、设计总监、艺术总监',
    core_qualifications: '审美能力、创意能力、用户思维、细节把控',
    tools_requirement: 'Figma、Sketch、Adobe XD、Photoshop、Illustrator、After Effects',
  },
  {
    profile_name: '实施工程师',
    category: '技术类',
    description: '负责软件系统部署、安装调试、客户培训，交付项目并处理实施过程中的技术问题。',
    professional_skills: '软件部署、数据库配置、系统集成、需求调研、客户培训、项目管理、问题诊断与解决、技术文档编写',
    certificate_requirements: '系统集成项目管理工程师、PMP认证',
    innovation_ability: 3,
    learning_ability: 4,
    pressure_resistance: 4,
    communication_ability: 5,
    internship_requirement: '有IT实施或技术支持实习经历',
    education_requirement: '本科及以上',
    work_experience_requirement: '1-3年',
    salary_range: '7000-14000元/月',
    career_direction: '实施经理、项目经理、售前顾问、技术总监',
    core_qualifications: '技术学习能力、客户沟通能力、项目管理能力、问题解决能力',
    tools_requirement: '数据库工具、远程桌面、虚拟机、项目管理工具',
  },
  {
    profile_name: '科研人员',
    category: '科研类',
    description: '从事科学研究、技术研发工作，开展课题研究，撰写学术论文，推动技术创新。',
    professional_skills: '文献检索与阅读、实验设计与操作、数据采集与分析、学术论文撰写、科研项目申报、专业软件使用（如MATLAB、SPSS）',
    certificate_requirements: '英语六级/雅思、研究领域相关资质',
    innovation_ability: 5,
    learning_ability: 5,
    pressure_resistance: 4,
    communication_ability: 3,
    internship_requirement: '有实验室研究经历，参与过科研项目',
    education_requirement: '硕士及以上',
    work_experience_requirement: '不限',
    salary_range: '8000-20000元/月',
    career_direction: '副研究员、研究员、学科带头人、项目负责人',
    core_qualifications: '科研创新精神、学术诚信、抗压能力、持续学习能力',
    tools_requirement: 'MATLAB、SPSS、Origin、LaTeX、EndNote',
  },
  {
    profile_name: '财务专员',
    category: '职能类',
    description: '负责日常账务处理、发票管理、报表编制，协助完成财务核算和税务申报工作。',
    professional_skills: '会计核算、财务报表编制、发票管理、税务申报、用友/金蝶财务软件、Excel高级应用、财务分析基础',
    certificate_requirements: '初级会计职称、注册会计师（CPA）优先',
    innovation_ability: 2,
    learning_ability: 4,
    pressure_resistance: 3,
    communication_ability: 3,
    internship_requirement: '有财务实习经历或会计事务所实习经验',
    education_requirement: '本科及以上',
    work_experience_requirement: '1-3年',
    salary_range: '5000-10000元/月',
    career_direction: '财务主管、财务经理、CFO',
    core_qualifications: '严谨细致、责任心强、数字敏感度、职业道德',
    tools_requirement: '用友U8、金蝶KIS、Excel、PPT',
  },
  {
    profile_name: '人力资源专员',
    category: '职能类',
    description: '负责招聘配置、培训发展、员工关系等人力资源模块工作，支撑公司人才战略。',
    professional_skills: '招聘渠道管理、面试评估、培训组织、员工关系处理、绩效考核、HR系统操作、劳动法规、数据统计分析',
    certificate_requirements: '人力资源管理师证书',
    innovation_ability: 3,
    learning_ability: 4,
    pressure_resistance: 3,
    communication_ability: 5,
    internship_requirement: '有人力资源实习经历，有校园招聘经验优先',
    education_requirement: '本科及以上',
    work_experience_requirement: '1-3年',
    salary_range: '5000-12000元/月',
    career_direction: 'HR主管、HRBP、人力资源经理、人力资源总监',
    core_qualifications: '沟通表达能力、服务意识、保密意识、公正客观',
    tools_requirement: '招聘系统、OA系统、Excel、PPT',
  },
  {
    profile_name: '市场专员',
    category: '市场类',
    description: '负责市场推广、品牌宣传、活动策划执行，提升品牌知名度和市场占有率。',
    professional_skills: '市场调研、品牌策划、活动执行、媒体投放、渠道拓展、营销文案撰写、数据分析、新媒体运营',
    certificate_requirements: '市场营销师证书',
    innovation_ability: 4,
    learning_ability: 4,
    pressure_resistance: 3,
    communication_ability: 5,
    internship_requirement: '有市场推广或活动执行实习经验',
    education_requirement: '本科及以上',
    work_experience_requirement: '1-3年',
    salary_range: '6000-13000元/月',
    career_direction: '市场主管、市场经理、市场总监、CMO',
    core_qualifications: '市场敏感度、创意策划能力、执行力、团队协作',
    tools_requirement: 'Office、PS基础、数据分析工具、CRM',
  },
];

async function main() {
  const client = getSupabaseClient();

  console.log('开始导入岗位画像数据...');

  const { error } = await client.from('job_profiles').insert(jobProfiles);
  if (error) {
    console.error('导入失败:', error.message);
    throw new Error(error.message);
  }

  console.log(`成功导入 ${jobProfiles.length} 个岗位画像！`);

  // 验证数据
  const { data, error: queryError } = await client.from('job_profiles').select('id, profile_name, category');
  if (queryError) {
    console.error('查询失败:', queryError.message);
    return;
  }
  console.log('\n导入的岗位画像列表:');
  data?.forEach((profile) => {
    console.log(`  ${profile.id}. ${profile.profile_name} (${profile.category})`);
  });
}

main().catch(console.error);
