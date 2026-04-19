import { getSupabaseClient } from '/workspace/projects/src/storage/database/supabase-client';

interface CareerPath {
  from_job_id: number;
  to_job_id: number;
  path_type: 'vertical' | 'horizontal';
  difficulty: 'easy' | 'medium' | 'hard';
  years_required: number;
  additional_skills: string;
  additional_certificates: string;
  promotion_conditions: string;
  salary_change: string;
  path_description: string;
  is_recommended: number;
}

// 构建完整的岗位晋升路径图谱
const careerPaths: CareerPath[] = [
  // ==================== 技术类晋升路径 ====================
  
  // 1. 前端开发工程师晋升路径
  {
    from_job_id: 1, to_job_id: 1, path_type: 'vertical', difficulty: 'medium', years_required: 3,
    additional_skills: 'Node.js全栈能力、架构设计能力、技术选型能力',
    additional_certificates: '高级前端工程师证书',
    promotion_conditions: '主导过中型项目前端架构、熟练掌握前端工程化、性能优化经验',
    salary_change: '15K-20K → 20K-35K',
    path_description: '从初级前端工程师晋升为高级前端工程师，需掌握前端架构设计和工程化能力',
    is_recommended: 1,
  },
  {
    from_job_id: 1, to_job_id: 4, path_type: 'horizontal', difficulty: 'hard', years_required: 4,
    additional_skills: '产品思维、需求分析、用户体验设计、项目管理',
    additional_certificates: '产品经理证书、NPDP认证',
    promotion_conditions: '有完整项目经验、良好的产品sense、用户导向思维',
    salary_change: '15K-20K → 18K-30K',
    path_description: '前端转产品经理，需补充产品设计和项目管理能力',
    is_recommended: 1,
  },
  {
    from_job_id: 1, to_job_id: 7, path_type: 'horizontal', difficulty: 'medium', years_required: 2,
    additional_skills: 'UI设计规范、Figma/Sketch、设计系统搭建',
    additional_certificates: 'Adobe认证设计师',
    promotion_conditions: '有设计作品集、良好的审美能力、对交互设计有理解',
    salary_change: '15K-20K → 12K-18K',
    path_description: '前端转UI/UX设计，需加强视觉设计和用户研究能力',
    is_recommended: 1,
  },
  {
    from_job_id: 1, to_job_id: 16, path_type: 'horizontal', difficulty: 'hard', years_required: 5,
    additional_skills: 'PMP项目管理、团队管理、跨部门协调',
    additional_certificates: 'PMP认证、ACP认证',
    promotion_conditions: '5年以上经验、有团队管理经验、良好的沟通协调能力',
    salary_change: '20K-35K → 20K-30K',
    path_description: '前端专家转项目经理，需提升项目管理综合能力',
    is_recommended: 0,
  },

  // 2. 后端开发工程师晋升路径
  {
    from_job_id: 2, to_job_id: 2, path_type: 'vertical', difficulty: 'medium', years_required: 3,
    additional_skills: '分布式系统设计、高并发处理、微服务架构、云原生',
    additional_certificates: '架构师认证、云原生认证',
    promotion_conditions: '独立设计过中高并发系统、熟悉微服务架构、有大规模数据处理经验',
    salary_change: '18K-25K → 25K-45K',
    path_description: '从后端工程师晋升为高级/架构师，需掌握分布式系统设计能力',
    is_recommended: 1,
  },
  {
    from_job_id: 2, to_job_id: 14, path_type: 'horizontal', difficulty: 'medium', years_required: 2,
    additional_skills: '机器学习算法、深度学习框架、数据工程',
    additional_certificates: '深度学习工程师认证、Kaggle证书',
    promotion_conditions: '扎实的数学基础、Python熟练、对ML/DL有深入理解',
    salary_change: '18K-25K → 20K-40K',
    path_description: '后端转算法工程师，需补充机器学习和算法研究能力',
    is_recommended: 1,
  },
  {
    from_job_id: 2, to_job_id: 13, path_type: 'horizontal', difficulty: 'medium', years_required: 2,
    additional_skills: 'Linux运维、容器编排、监控系统搭建',
    additional_certificates: 'Linux运维认证、K8s认证',
    promotion_conditions: '熟悉Linux系统、有DevOps实践经验、了解运维体系',
    salary_change: '18K-25K → 12K-18K',
    path_description: '后端转运维工程师，需加强系统运维和自动化能力',
    is_recommended: 0,
  },
  {
    from_job_id: 2, to_job_id: 15, path_type: 'horizontal', difficulty: 'medium', years_required: 2,
    additional_skills: 'SQL高级、数据可视化、业务分析能力',
    additional_certificates: '数据分析证书、Tableau认证',
    promotion_conditions: '熟练SQL、有数据分析项目经验、商业敏感度',
    salary_change: '18K-25K → 12K-18K',
    path_description: '后端转数据分析师，需加强数据分析业务能力',
    is_recommended: 1,
  },

  // 3. 软件测试工程师晋升路径
  {
    from_job_id: 3, to_job_id: 3, path_type: 'vertical', difficulty: 'medium', years_required: 3,
    additional_skills: '自动化测试框架开发、性能测试、安全测试、测试架构',
    additional_certificates: 'ISTQB高级认证、测试架构师认证',
    promotion_conditions: '能搭建自动化测试框架、有性能测试经验、了解安全测试',
    salary_change: '10K-15K → 18K-28K',
    path_description: '从初级测试工程师晋升为高级测试工程师，需掌握自动化和测试架构能力',
    is_recommended: 1,
  },
  {
    from_job_id: 3, to_job_id: 20, path_type: 'horizontal', difficulty: 'medium', years_required: 2,
    additional_skills: 'ISO9001/ISO27001体系、质量管理流程、供应商质量管理',
    additional_certificates: '质量工程师证书、ISO内审员',
    promotion_conditions: '了解质量管理体系、有质检经验、细心严谨',
    salary_change: '10K-15K → 10K-18K',
    path_description: '测试转质量管理，需加强质量体系和流程管理能力',
    is_recommended: 0,
  },

  // 4. 产品经理晋升路径
  {
    from_job_id: 4, to_job_id: 4, path_type: 'vertical', difficulty: 'medium', years_required: 3,
    additional_skills: '产品战略规划、数据驱动决策、团队管理、行业深耕',
    additional_certificates: 'NPDP高级认证',
    promotion_conditions: '负责过完整产品线、有数据验证的成功案例、团队管理经验',
    salary_change: '18K-30K → 30K-50K',
    path_description: '从产品经理晋升为高级产品经理/产品总监，需具备战略思维和团队管理能力',
    is_recommended: 1,
  },
  {
    from_job_id: 4, to_job_id: 16, path_type: 'horizontal', difficulty: 'medium', years_required: 2,
    additional_skills: '项目管理知识体系、敏捷开发、风险管理、干系人管理',
    additional_certificates: 'PMP认证',
    promotion_conditions: '有完整项目管理经验、良好的协调能力',
    salary_change: '18K-30K → 18K-25K',
    path_description: '产品经理转项目经理，有天然优势，因为产品工作本身包含项目管理',
    is_recommended: 1,
  },

  // 5. 运维工程师晋升路径
  {
    from_job_id: 13, to_job_id: 13, path_type: 'vertical', difficulty: 'medium', years_required: 3,
    additional_skills: 'K8s深入、Service Mesh、可观测性、SRE实践',
    additional_certificates: 'CKA/CKAD认证、SRE认证',
    promotion_conditions: '熟练K8s运维、有SRE实践经验、了解可观测性体系',
    salary_change: '12K-18K → 20K-35K',
    path_description: '从运维工程师晋升为SRE/运维架构师，需掌握云原生和可观测性技术',
    is_recommended: 1,
  },
  {
    from_job_id: 13, to_job_id: 24, path_type: 'horizontal', difficulty: 'medium', years_required: 2,
    additional_skills: '网络安全、防火墙配置、安全加固',
    additional_certificates: '网络安全认证HCIP-Security',
    promotion_conditions: '了解网络安全、熟悉安全设备和协议',
    salary_change: '12K-18K → 12K-20K',
    path_description: '运维转网络/安全工程师，需补充网络安全知识',
    is_recommended: 1,
  },

  // 6. 算法工程师晋升路径
  {
    from_job_id: 14, to_job_id: 14, path_type: 'vertical', difficulty: 'medium', years_required: 3,
    additional_skills: '前沿算法研究、论文发表、大模型应用、团队技术引领',
    additional_certificates: '顶会论文、高级算法工程师认证',
    promotion_conditions: '有顶会论文、主导过创新算法落地、有团队技术指导经验',
    salary_change: '25K-40K → 40K-80K',
    path_description: '从算法工程师晋升为算法专家/研究员，需具备算法研究创新能力',
    is_recommended: 1,
  },
  {
    from_job_id: 14, to_job_id: 15, path_type: 'horizontal', difficulty: 'easy', years_required: 1,
    additional_skills: '数据分析方法、业务理解、报告撰写',
    additional_certificates: '数据分析证书',
    promotion_conditions: '有算法落地经验、能把复杂算法转化为业务价值',
    salary_change: '25K-40K → 12K-18K',
    path_description: '算法转数据分析，算法背景使数据分析更加深入',
    is_recommended: 1,
  },

  // 7. 数据分析师晋升路径
  {
    from_job_id: 15, to_job_id: 15, path_type: 'vertical', difficulty: 'medium', years_required: 3,
    additional_skills: '数据挖掘、机器学习、数据产品设计、数据治理',
    additional_certificates: 'CDA数据分析师高级认证',
    promotion_conditions: '能独立完成数据挖掘项目、有数据产品经验、了解数据治理',
    salary_change: '12K-18K → 20K-35K',
    path_description: '从数据分析师晋升为高级数据分析师/数据产品经理，需具备数据产品和挖掘能力',
    is_recommended: 1,
  },
  {
    from_job_id: 15, to_job_id: 28, path_type: 'horizontal', difficulty: 'hard', years_required: 3,
    additional_skills: '金融知识、财务分析、投资理论',
    additional_certificates: 'CFA、证券从业资格证',
    promotion_conditions: '金融专业背景或转岗金融行业、需补充金融知识',
    salary_change: '12K-18K → 15K-25K',
    path_description: '数据分析转金融分析师，需补充金融领域专业知识',
    is_recommended: 0,
  },

  // 8. 网络工程师晋升路径
  {
    from_job_id: 24, to_job_id: 24, path_type: 'vertical', difficulty: 'medium', years_required: 3,
    additional_skills: '网络安全、云网络、SD-WAN、网络自动化',
    additional_certificates: 'HCIE-Routing & Switching、安全认证',
    promotion_conditions: '有大型网络架构经验、熟悉网络安全、能进行网络自动化',
    salary_change: '10K-15K → 18K-30K',
    path_description: '从网络工程师晋升为网络架构师/安全工程师',
    is_recommended: 1,
  },

  // 9. 机械工程师晋升路径
  {
    from_job_id: 25, to_job_id: 25, path_type: 'vertical', difficulty: 'medium', years_required: 3,
    additional_skills: '有限元分析、产品研发管理、技术创新',
    additional_certificates: '机械工程师职称',
    promotion_conditions: '独立负责过产品设计、有团队管理经验',
    salary_change: '8K-14K → 15K-25K',
    path_description: '从机械工程师晋升为高级工程师/研发主管',
    is_recommended: 1,
  },

  // 10. 电气工程师晋升路径
  {
    from_job_id: 26, to_job_id: 26, path_type: 'vertical', difficulty: 'medium', years_required: 3,
    additional_skills: 'PLC高级编程、电气系统设计、项目管理',
    additional_certificates: '电气工程师职称、PMP',
    promotion_conditions: '独立完成过电气系统设计、有项目管理经验',
    salary_change: '8K-15K → 15K-25K',
    path_description: '从电气工程师晋升为高级工程师/项目经理',
    is_recommended: 1,
  },

  // 11. 建筑工程师晋升路径
  {
    from_job_id: 27, to_job_id: 27, path_type: 'vertical', difficulty: 'medium', years_required: 5,
    additional_skills: '大型项目管理、成本控制、团队协调',
    additional_certificates: '一级建造师、高级工程师职称',
    promotion_conditions: '持有一级建造师、有大型项目经验、团队管理能力',
    salary_change: '10K-18K → 20K-40K',
    path_description: '从建筑工程师晋升为项目经理/总工程师',
    is_recommended: 1,
  },

  // 12. 游戏开发工程师晋升路径
  {
    from_job_id: 30, to_job_id: 30, path_type: 'vertical', difficulty: 'medium', years_required: 3,
    additional_skills: '游戏引擎深入、图形学、性能优化、游戏设计',
    additional_certificates: 'Unity认证开发者、游戏开发证书',
    promotion_conditions: '参与过完整游戏项目、有热门项目经验',
    salary_change: '15K-25K → 25K-45K',
    path_description: '从游戏开发工程师晋升为主程序员/游戏制作人',
    is_recommended: 1,
  },

  // ==================== 运营类晋升路径 ====================
  
  // 13. 运营专员晋升路径
  {
    from_job_id: 5, to_job_id: 5, path_type: 'vertical', difficulty: 'medium', years_required: 3,
    additional_skills: '数据运营、用户增长、内容营销、团队管理',
    additional_certificates: '高级运营证书',
    promotion_conditions: '独立操盘过运营项目、数据驱动思维、团队管理经验',
    salary_change: '8K-12K → 15K-25K',
    path_description: '从运营专员晋升为运营经理/总监，需具备数据驱动和团队管理能力',
    is_recommended: 1,
  },
  {
    from_job_id: 5, to_job_id: 18, path_type: 'horizontal', difficulty: 'easy', years_required: 1,
    additional_skills: '电商平台运营、直通车投放、店铺管理',
    additional_certificates: '电商运营证书',
    promotion_conditions: '了解电商行业、对销售数据敏感',
    salary_change: '8K-12K → 8K-15K',
    path_description: '运营转电商运营，行业相关性高，转型容易',
    is_recommended: 1,
  },
  {
    from_job_id: 5, to_job_id: 17, path_type: 'horizontal', difficulty: 'easy', years_required: 1,
    additional_skills: '短视频制作、内容策划、账号运营',
    additional_certificates: '新媒体运营证书',
    promotion_conditions: '有自媒体经验、网感好、创意能力强',
    salary_change: '8K-12K → 8K-15K',
    path_description: '运营转新媒体运营，内容能力复用性强',
    is_recommended: 1,
  },
  {
    from_job_id: 5, to_job_id: 4, path_type: 'horizontal', difficulty: 'hard', years_required: 4,
    additional_skills: '产品设计、需求分析、数据分析',
    additional_certificates: '产品经理证书',
    promotion_conditions: '运营中对产品有深入理解、数据分析能力强',
    salary_change: '15K-25K → 18K-30K',
    path_description: '运营转产品经理，需补充系统化的产品设计能力',
    is_recommended: 0,
  },

  // 14. 新媒体运营晋升路径
  {
    from_job_id: 17, to_job_id: 17, path_type: 'vertical', difficulty: 'medium', years_required: 3,
    additional_skills: '账号矩阵运营、IP打造、MCN运营、团队管理',
    additional_certificates: '新媒体运营高级证书',
    promotion_conditions: '有爆款案例、账号运营经验丰富、粉丝量过百万',
    salary_change: '8K-15K → 15K-30K',
    path_description: '从新媒体运营晋升为新媒体总监/KOL/创业者',
    is_recommended: 1,
  },
  {
    from_job_id: 17, to_job_id: 12, path_type: 'horizontal', difficulty: 'medium', years_required: 2,
    additional_skills: '市场调研、品牌策划、活动执行',
    additional_certificates: '市场营销师证书',
    promotion_conditions: '了解市场营销全链路、有市场项目经验',
    salary_change: '8K-15K → 10K-13K',
    path_description: '新媒体转市场专员，扩大职业边界',
    is_recommended: 1,
  },

  // 15. 电商运营晋升路径
  {
    from_job_id: 18, to_job_id: 18, path_type: 'vertical', difficulty: 'medium', years_required: 3,
    additional_skills: '店铺全局运营、供应链管理、团队管理、渠道拓展',
    additional_certificates: '电商运营高级证书',
    promotion_conditions: '负责过完整店铺运营、销量增长显著、有团队管理经验',
    salary_change: '8K-15K → 15K-30K+',
    path_description: '从电商运营晋升为电商经理/总监/店铺合伙人',
    is_recommended: 1,
  },

  // ==================== 销售类晋升路径 ====================
  
  // 16. 销售代表晋升路径
  {
    from_job_id: 6, to_job_id: 6, path_type: 'vertical', difficulty: 'medium', years_required: 3,
    additional_skills: '大客户销售、团队管理、商务谈判、战略思维',
    additional_certificates: '高级销售管理证书',
    promotion_conditions: '业绩持续优秀、有大客户资源、团队管理能力',
    salary_change: '8K-15K+提成 → 20K-40K+提成',
    path_description: '从销售代表晋升为销售主管/经理，需具备团队管理和战略思维',
    is_recommended: 1,
  },
  {
    from_job_id: 6, to_job_id: 22, path_type: 'horizontal', difficulty: 'medium', years_required: 2,
    additional_skills: '供应商管理、采购流程、成本控制',
    additional_certificates: '采购师证书',
    promotion_conditions: '了解采购流程、有商务谈判经验',
    salary_change: '8K-15K+提成 → 8K-12K',
    path_description: '销售转采购，有客户资源和谈判经验优势',
    is_recommended: 0,
  },
  {
    from_job_id: 6, to_job_id: 12, path_type: 'horizontal', difficulty: 'medium', years_required: 2,
    additional_skills: '市场分析、品牌推广、营销策划',
    additional_certificates: '市场营销师证书',
    promotion_conditions: '了解市场工作、对品牌推广有兴趣',
    salary_change: '8K-15K+提成 → 10K-13K',
    path_description: '销售转市场，利用客户洞察能力',
    is_recommended: 1,
  },

  // ==================== 职能类晋升路径 ====================
  
  // 17. 财务专员晋升路径
  {
    from_job_id: 10, to_job_id: 10, path_type: 'vertical', difficulty: 'medium', years_required: 3,
    additional_skills: '财务分析、预算管理、税务筹划、财务管理',
    additional_certificates: '中级会计师、CPA部分科目',
    promotion_conditions: '持有中级会计、有财务管理经验、分析能力强',
    salary_change: '8K-10K → 12K-20K',
    path_description: '从财务专员晋升为财务主管/经理，需加强财务分析和税务筹划能力',
    is_recommended: 1,
  },
  {
    from_job_id: 10, to_job_id: 28, path_type: 'horizontal', difficulty: 'hard', years_required: 3,
    additional_skills: '金融知识、投资分析、风险管理',
    additional_certificates: 'CFA、证券从业资格证',
    promotion_conditions: '金融背景或转金融行业、需补充大量金融知识',
    salary_change: '8K-10K → 12K-25K',
    path_description: '财务转金融分析师，需系统学习金融知识',
    is_recommended: 0,
  },

  // 18. 人力资源专员晋升路径
  {
    from_job_id: 11, to_job_id: 11, path_type: 'vertical', difficulty: 'medium', years_required: 3,
    additional_skills: 'HRBP能力、组织发展、人才盘点、薪酬绩效设计',
    additional_certificates: '人力资源管理师二级/一级',
    promotion_conditions: '熟悉2个以上HR模块、有BP经验、战略思维',
    salary_change: '8K-12K → 15K-25K',
    path_description: '从HR专员晋升为HRBP/HR主管/HR经理',
    is_recommended: 1,
  },
  {
    from_job_id: 11, to_job_id: 23, path_type: 'horizontal', difficulty: 'easy', years_required: 1,
    additional_skills: '行政管理、后勤协调',
    additional_certificates: '行政管理证书',
    promotion_conditions: '细心周到、服务意识强',
    salary_change: '8K-12K → 6K-8K',
    path_description: 'HR转行政，相对轻松但薪资可能下降',
    is_recommended: 0,
  },

  // 19. 行政专员晋升路径
  {
    from_job_id: 23, to_job_id: 23, path_type: 'vertical', difficulty: 'medium', years_required: 3,
    additional_skills: '行政管理体系搭建、后勤统筹、企业文化',
    additional_certificates: '行政管理师证书',
    promotion_conditions: '有大型企业行政经验、管理经验',
    salary_change: '6K-8K → 10K-15K',
    path_description: '从行政专员晋升为行政主管/经理',
    is_recommended: 1,
  },

  // 20. 法务专员晋升路径
  {
    from_job_id: 21, to_job_id: 21, path_type: 'vertical', difficulty: 'medium', years_required: 3,
    additional_skills: '企业法务全盘管理、诉讼处理、合规体系建设',
    additional_certificates: '法律职业资格证（A证）、企业法律顾问',
    promotion_conditions: '持有A证、有诉讼经验、合规管理能力',
    salary_change: '10K-15K → 18K-30K',
    path_description: '从法务专员晋升为法务主管/经理',
    is_recommended: 1,
  },

  // ==================== 市场类晋升路径 ====================
  
  // 21. 市场专员晋升路径
  {
    from_job_id: 12, to_job_id: 12, path_type: 'vertical', difficulty: 'medium', years_required: 3,
    additional_skills: '品牌战略、市场规划、团队管理、数字营销',
    additional_certificates: '市场营销师高级证书',
    promotion_conditions: '有品牌项目经验、数据分析能力、团队管理',
    salary_change: '8K-13K → 15K-25K',
    path_description: '从市场专员晋升为市场主管/经理',
    is_recommended: 1,
  },
  {
    from_job_id: 12, to_job_id: 4, path_type: 'horizontal', difficulty: 'hard', years_required: 4,
    additional_skills: '产品设计、数据分析、用户研究',
    additional_certificates: '产品经理证书',
    promotion_conditions: '市场经验转化产品思维、补充产品能力',
    salary_change: '15K-25K → 18K-30K',
    path_description: '市场转产品经理，对市场和用户有深入理解',
    is_recommended: 0,
  },

  // ==================== 供应链类晋升路径 ====================
  
  // 22. 物流专员晋升路径
  {
    from_job_id: 19, to_job_id: 19, path_type: 'vertical', difficulty: 'medium', years_required: 3,
    additional_skills: '仓储优化、物流规划、供应链协同、成本控制',
    additional_certificates: '物流师二级/一级',
    promotion_conditions: '有仓储和物流管理经验、优化物流成本能力',
    salary_change: '6K-10K → 12K-20K',
    path_description: '从物流专员晋升为物流主管/经理',
    is_recommended: 1,
  },
  {
    from_job_id: 19, to_job_id: 22, path_type: 'horizontal', difficulty: 'easy', years_required: 1,
    additional_skills: '供应商管理、采购流程',
    additional_certificates: '采购师证书',
    promotion_conditions: '了解采购流程、有供应商资源',
    salary_change: '6K-10K → 8K-12K',
    path_description: '物流转采购，供应链知识可复用',
    is_recommended: 1,
  },

  // 23. 采购专员晋升路径
  {
    from_job_id: 22, to_job_id: 22, path_type: 'vertical', difficulty: 'medium', years_required: 3,
    additional_skills: '战略采购、供应商开发、成本分析、供应链管理',
    additional_certificates: '采购师二级/一级、CPSM',
    promotion_conditions: '有战略采购经验、成本控制能力强、供应商管理经验',
    salary_change: '8K-12K → 12K-20K',
    path_description: '从采购专员晋升为采购主管/经理',
    is_recommended: 1,
  },

  // ==================== 质量/实施晋升路径 ====================
  
  // 24. 质量管理晋升路径
  {
    from_job_id: 20, to_job_id: 20, path_type: 'vertical', difficulty: 'medium', years_required: 3,
    additional_skills: '质量体系搭建、六西格玛、供应商质量管理',
    additional_certificates: '质量工程师中级、六西格玛绿带/黑带',
    promotion_conditions: '熟悉质量管理体系、有体系搭建经验',
    salary_change: '8K-12K → 15K-25K',
    path_description: '从质量管理晋升为质量主管/经理',
    is_recommended: 1,
  },

  // 25. 实施工程师晋升路径
  {
    from_job_id: 8, to_job_id: 16, path_type: 'horizontal', difficulty: 'medium', years_required: 3,
    additional_skills: 'PMP项目管理、团队管理、风险管理',
    additional_certificates: 'PMP认证、软考高项',
    promotion_conditions: '有完整项目实施经验、协调能力强',
    salary_change: '10K-14K → 15K-25K',
    path_description: '实施工程师转项目经理，有项目经验优势',
    is_recommended: 1,
  },
  {
    from_job_id: 8, to_job_id: 8, path_type: 'vertical', difficulty: 'medium', years_required: 3,
    additional_skills: '项目管理、售前咨询、技术方案设计',
    additional_certificates: 'PMP、系统集成项目管理工程师',
    promotion_conditions: '有大型项目实施经验、售前能力',
    salary_change: '10K-14K → 15K-25K',
    path_description: '从实施工程师晋升为实施经理/售前顾问',
    is_recommended: 1,
  },

  // ==================== 设计类晋升路径 ====================
  
  // 26. UI/UX设计师晋升路径
  {
    from_job_id: 7, to_job_id: 7, path_type: 'vertical', difficulty: 'medium', years_required: 3,
    additional_skills: '设计系统搭建、品牌设计、用户研究、设计管理',
    additional_certificates: 'Adobe高级认证、UX设计师证书',
    promotion_conditions: '有完整设计系统经验、团队管理能力、良好的设计视野',
    salary_change: '12K-18K → 20K-35K',
    path_description: '从UI/UX设计师晋升为设计专家/设计主管',
    is_recommended: 1,
  },
  {
    from_job_id: 7, to_job_id: 1, path_type: 'horizontal', difficulty: 'medium', years_required: 2,
    additional_skills: '前端框架、JavaScript/TypeScript',
    additional_certificates: '前端工程师证书',
    promotion_conditions: '有前端基础、对技术实现有兴趣',
    salary_change: '12K-18K → 15K-20K',
    path_description: '设计师转前端，CSS和布局基础可复用',
    is_recommended: 0,
  },

  // ==================== 科研类晋升路径 ====================
  
  // 27. 科研人员晋升路径
  {
    from_job_id: 9, to_job_id: 9, path_type: 'vertical', difficulty: 'medium', years_required: 5,
    additional_skills: '科研项目申报、团队带领、学术成果转化',
    additional_certificates: '高级职称、SCI论文',
    promotion_conditions: '有高水平论文、负责过科研项目、团队管理能力',
    salary_change: '10K-20K → 20K-40K',
    path_description: '从科研人员晋升为副研究员/研究员/学科带头人',
    is_recommended: 1,
  },
  {
    from_job_id: 9, to_job_id: 14, path_type: 'horizontal', difficulty: 'medium', years_required: 2,
    additional_skills: '算法工程化、模型部署、产品落地',
    additional_certificates: '深度学习工程师证书',
    promotion_conditions: '研究背景可转化、有工程化意愿',
    salary_change: '10K-20K → 20K-40K',
    path_description: '科研人员转算法工程师，算法研究能力可复用',
    is_recommended: 1,
  },

  // ==================== 金融/翻译晋升路径 ====================
  
  // 28. 金融分析师晋升路径
  {
    from_job_id: 28, to_job_id: 28, path_type: 'vertical', difficulty: 'medium', years_required: 3,
    additional_skills: '投资决策、风险管理、团队研究管理',
    additional_certificates: 'CFA二级/三级、CPA',
    promotion_conditions: 'CFA二级以上、有投资业绩、团队管理能力',
    salary_change: '15K-25K → 30K-60K',
    path_description: '从金融分析师晋升为高级分析师/投资总监',
    is_recommended: 1,
  },

  // 29. 翻译晋升路径
  {
    from_job_id: 29, to_job_id: 29, path_type: 'vertical', difficulty: 'medium', years_required: 5,
    additional_skills: '同声传译、专业领域深耕、翻译项目管理',
    additional_certificates: 'CATTI一口/同传、高阶语言证书',
    promotion_conditions: '翻译经验丰富、某个领域专业、有客户资源',
    salary_change: '8K-15K → 20K-50K',
    path_description: '从翻译晋升为高级翻译/同声传译/自由译者',
    is_recommended: 1,
  },

  // ==================== 项目经理晋升路径 ====================
  
  // 30. 项目经理晋升路径
  {
    from_job_id: 16, to_job_id: 16, path_type: 'vertical', difficulty: 'medium', years_required: 5,
    additional_skills: '战略项目管理、PMO建设、组织级项目管理',
    additional_certificates: 'PgMP、MSP',
    promotion_conditions: '大型项目管理经验、PMO建设经验、战略思维',
    salary_change: '18K-25K → 30K-50K',
    path_description: '从项目经理晋升为项目总监/PMO负责人',
    is_recommended: 1,
  },
  {
    from_job_id: 16, to_job_id: 4, path_type: 'horizontal', difficulty: 'easy', years_required: 2,
    additional_skills: '产品设计、需求分析',
    additional_certificates: '产品经理证书',
    promotion_conditions: '项目管理中产品理解深入、对产品有兴趣',
    salary_change: '18K-25K → 18K-30K',
    path_description: '项目经理转产品经理，项目经验帮助理解产品',
    is_recommended: 1,
  },

  // ==================== 跨类别转岗路径 ====================
  
  // 31. 运营转人力资源
  {
    from_job_id: 5, to_job_id: 11, path_type: 'horizontal', difficulty: 'medium', years_required: 2,
    additional_skills: '招聘配置、培训发展、员工关系',
    additional_certificates: '人力资源管理师',
    promotion_conditions: '了解HR工作、沟通协调能力',
    salary_change: '8K-12K → 8K-12K',
    path_description: '运营转人力资源，用户运营经验对招聘有帮助',
    is_recommended: 1,
  },

  // 32. 运营转项目管理
  {
    from_job_id: 5, to_job_id: 16, path_type: 'horizontal', difficulty: 'medium', years_required: 3,
    additional_skills: 'PMP知识体系、风险管理、干系人管理',
    additional_certificates: 'PMP认证',
    promotion_conditions: '运营项目经验、对项目管理有兴趣',
    salary_change: '8K-12K → 12K-18K',
    path_description: '运营转项目经理，活动策划经验可复用',
    is_recommended: 1,
  },

  // 33. 行政转人力资源
  {
    from_job_id: 23, to_job_id: 11, path_type: 'horizontal', difficulty: 'easy', years_required: 1,
    additional_skills: '招聘基础、培训协助',
    additional_certificates: '人力资源管理师',
    promotion_conditions: '细心、有服务意识',
    salary_change: '6K-8K → 8K-12K',
    path_description: '行政转人力资源，基础扎实容易转型',
    is_recommended: 1,
  },

  // 34. 销售转运营
  {
    from_job_id: 6, to_job_id: 5, path_type: 'horizontal', difficulty: 'easy', years_required: 1,
    additional_skills: '用户运营、数据分析',
    additional_certificates: '运营证书',
    promotion_conditions: '有客户思维、沟通能力',
    salary_change: '8K-15K+提成 → 8K-12K',
    path_description: '销售转运营，客户服务经验可复用',
    is_recommended: 1,
  },

  // 35. 质量转项目管理
  {
    from_job_id: 20, to_job_id: 16, path_type: 'horizontal', difficulty: 'medium', years_required: 3,
    additional_skills: '项目管理知识体系、团队协调',
    additional_certificates: 'PMP认证',
    promotion_conditions: '质量管理工作涉及项目管理、有协调经验',
    salary_change: '8K-12K → 12K-18K',
    path_description: '质量管理转项目经理，流程思维有帮助',
    is_recommended: 1,
  },
];

async function main() {
  const client = getSupabaseClient();

  console.log(`开始导入 ${careerPaths.length} 条岗位晋升路径...`);

  const { error } = await client.from('career_paths').insert(careerPaths);
  if (error) {
    console.error('导入失败:', error.message);
    throw new Error(error.message);
  }

  console.log(`成功导入 ${careerPaths.length} 条岗位晋升路径！`);

  // 统计
  const { count } = await client.from('career_paths').select('*', { count: 'exact', head: true });
  console.log(`数据库中现有晋升路径总数: ${count} 条`);

  // 按路径类型统计
  const verticalPaths = careerPaths.filter(p => p.path_type === 'vertical').length;
  const horizontalPaths = careerPaths.filter(p => p.path_type === 'horizontal').length;
  console.log(`垂直晋升路径: ${verticalPaths} 条`);
  console.log(`横向转岗路径: ${horizontalPaths} 条`);

  // 按推荐程度统计
  const recommendedPaths = careerPaths.filter(p => p.is_recommended === 1).length;
  console.log(`推荐路径: ${recommendedPaths} 条`);
}

main().catch(console.error);
