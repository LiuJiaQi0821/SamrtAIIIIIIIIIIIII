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

// 补充更多横向转岗路径
const additionalPaths: CareerPath[] = [
  // 机械工程师横向转岗
  {
    from_job_id: 25, to_job_id: 27, path_type: 'horizontal', difficulty: 'medium', years_required: 3,
    additional_skills: '建筑施工、项目管理、工程造价',
    additional_certificates: '建造师证书',
    promotion_conditions: '了解建筑行业、有项目经验',
    salary_change: '8K-14K → 10K-18K',
    path_description: '机械转建筑工程师，工业背景可复用',
    is_recommended: 1,
  },
  {
    from_job_id: 25, to_job_id: 26, path_type: 'horizontal', difficulty: 'medium', years_required: 2,
    additional_skills: 'PLC编程、电气控制',
    additional_certificates: '电工证',
    promotion_conditions: '有电气基础、对控制感兴趣',
    salary_change: '8K-14K → 8K-15K',
    path_description: '机械转电气工程师，机电结合是常见方向',
    is_recommended: 1,
  },

  // 电气工程师横向转岗
  {
    from_job_id: 26, to_job_id: 24, path_type: 'horizontal', difficulty: 'medium', years_required: 2,
    additional_skills: '网络协议、通信系统',
    additional_certificates: '网络工程师证书',
    promotion_conditions: '了解通信网络、有弱电经验',
    salary_change: '8K-15K → 10K-15K',
    path_description: '电气转网络工程，弱电背景可复用',
    is_recommended: 0,
  },
  {
    from_job_id: 26, to_job_id: 25, path_type: 'horizontal', difficulty: 'easy', years_required: 1,
    additional_skills: '机械设计基础',
    additional_certificates: 'CAD证书',
    promotion_conditions: '有机械基础、对机电一体化感兴趣',
    salary_change: '8K-15K → 8K-14K',
    path_description: '电气转机械工程师，机电结合',
    is_recommended: 1,
  },

  // 建筑工程师横向转岗
  {
    from_job_id: 27, to_job_id: 16, path_type: 'horizontal', difficulty: 'medium', years_required: 3,
    additional_skills: 'PMP项目管理、风险管理',
    additional_certificates: '建造师证书、PMP',
    promotion_conditions: '建筑项目管理经验、对管理有兴趣',
    salary_change: '10K-18K → 15K-25K',
    path_description: '建筑转项目经理，建筑行业项目经理需求大',
    is_recommended: 1,
  },
  {
    from_job_id: 27, to_job_id: 20, path_type: 'horizontal', difficulty: 'medium', years_required: 2,
    additional_skills: 'ISO体系、质量管理流程',
    additional_certificates: '质量工程师证书',
    promotion_conditions: '有施工现场质量管理经验',
    salary_change: '10K-18K → 10K-15K',
    path_description: '建筑转质量管理，施工质量是核心',
    is_recommended: 0,
  },

  // 金融分析师横向转岗
  {
    from_job_id: 28, to_job_id: 15, path_type: 'horizontal', difficulty: 'medium', years_required: 1,
    additional_skills: 'Python/SQL、数据可视化',
    additional_certificates: '数据分析证书',
    promotion_conditions: '有数据分析基础、金融数据丰富',
    salary_change: '15K-25K → 12K-18K',
    path_description: '金融转数据分析，金融数据分析是热门方向',
    is_recommended: 1,
  },
  {
    from_job_id: 28, to_job_id: 6, path_type: 'horizontal', difficulty: 'medium', years_required: 2,
    additional_skills: '销售技巧、客户开发',
    additional_certificates: '证券从业资格证',
    promotion_conditions: '有金融资源、沟通能力',
    salary_change: '15K-25K → 15K-30K+提成',
    path_description: '金融分析师转销售（金融方向），专业背景有优势',
    is_recommended: 1,
  },

  // 翻译横向转岗
  {
    from_job_id: 29, to_job_id: 17, path_type: 'horizontal', difficulty: 'easy', years_required: 1,
    additional_skills: '短视频制作、内容策划',
    additional_certificates: '新媒体运营证书',
    promotion_conditions: '有自媒体兴趣、语言能力强',
    salary_change: '8K-15K → 8K-15K',
    path_description: '翻译转新媒体，语言能力是优势',
    is_recommended: 1,
  },
  {
    from_job_id: 29, to_job_id: 12, path_type: 'horizontal', difficulty: 'easy', years_required: 1,
    additional_skills: '市场调研、品牌策划',
    additional_certificates: '市场营销师证书',
    promotion_conditions: '有国际化视野、对市场有兴趣',
    salary_change: '8K-15K → 8K-13K',
    path_description: '翻译转市场，国际化背景有优势',
    is_recommended: 1,
  },

  // 游戏开发工程师横向转岗
  {
    from_job_id: 30, to_job_id: 1, path_type: 'horizontal', difficulty: 'medium', years_required: 1,
    additional_skills: 'Web开发、Vue/React',
    additional_certificates: '前端工程师证书',
    promotion_conditions: '有Web基础、游戏开发经验可复用',
    salary_change: '15K-25K → 12K-20K',
    path_description: '游戏转前端开发，游戏引擎经验有帮助',
    is_recommended: 1,
  },
  {
    from_job_id: 30, to_job_id: 2, path_type: 'horizontal', difficulty: 'medium', years_required: 1,
    additional_skills: '服务器开发、网络编程',
    additional_certificates: '后端开发证书',
    promotion_conditions: '有后端基础、游戏服务器经验',
    salary_change: '15K-25K → 15K-25K',
    path_description: '游戏转后端开发，游戏网络同步经验可复用',
    is_recommended: 1,
  },

  // 法务专员横向转岗
  {
    from_job_id: 21, to_job_id: 11, path_type: 'horizontal', difficulty: 'easy', years_required: 1,
    additional_skills: '招聘配置、员工关系',
    additional_certificates: '人力资源管理师',
    promotion_conditions: '了解HR工作、法律背景是优势',
    salary_change: '10K-15K → 8K-12K',
    path_description: '法务转人力资源，合规背景有优势',
    is_recommended: 1,
  },

  // 物流专员横向转岗
  {
    from_job_id: 19, to_job_id: 18, path_type: 'horizontal', difficulty: 'easy', years_required: 1,
    additional_skills: '电商运营、店铺管理',
    additional_certificates: '电商运营证书',
    promotion_conditions: '了解电商行业、电商物流结合紧密',
    salary_change: '6K-10K → 8K-15K',
    path_description: '物流转电商运营，电商物流不分家',
    is_recommended: 1,
  },

  // 采购专员横向转岗
  {
    from_job_id: 22, to_job_id: 19, path_type: 'horizontal', difficulty: 'easy', years_required: 1,
    additional_skills: '仓储管理、物流调度',
    additional_certificates: '物流师证书',
    promotion_conditions: '有供应链基础知识',
    salary_change: '8K-12K → 6K-10K',
    path_description: '采购转物流专员，供应链知识可复用',
    is_recommended: 1,
  },

  // 网络工程师横向转岗
  {
    from_job_id: 24, to_job_id: 2, path_type: 'horizontal', difficulty: 'medium', years_required: 2,
    additional_skills: '后端开发、Python/Go',
    additional_certificates: '后端开发证书',
    promotion_conditions: '有编程基础、网络应用开发经验',
    salary_change: '10K-15K → 15K-25K',
    path_description: '网络转后端开发，网络协议知识有帮助',
    is_recommended: 1,
  },
  {
    from_job_id: 24, to_job_id: 13, path_type: 'horizontal', difficulty: 'easy', years_required: 1,
    additional_skills: 'Linux运维、容器技术',
    additional_certificates: 'Linux运维认证',
    promotion_conditions: '有运维基础、网络+运维是天然组合',
    salary_change: '10K-15K → 12K-18K',
    path_description: '网络转运维，网络运维是核心',
    is_recommended: 1,
  },

  // 运维工程师横向转岗
  {
    from_job_id: 13, to_job_id: 2, path_type: 'horizontal', difficulty: 'medium', years_required: 2,
    additional_skills: '后端开发、微服务架构',
    additional_certificates: '后端开发证书',
    promotion_conditions: '有开发基础、DevOps实践',
    salary_change: '12K-18K → 18K-25K',
    path_description: '运维转后端开发，SRE需要开发能力',
    is_recommended: 1,
  },

  // 数据分析师横向转岗
  {
    from_job_id: 15, to_job_id: 4, path_type: 'horizontal', difficulty: 'medium', years_required: 2,
    additional_skills: '产品设计、需求分析',
    additional_certificates: '产品经理证书',
    promotion_conditions: '数据分析中理解产品、有数据驱动产品思维',
    salary_change: '12K-18K → 18K-30K',
    path_description: '数据分析转产品经理，数据驱动产品是趋势',
    is_recommended: 1,
  },
  {
    from_job_id: 15, to_job_id: 5, path_type: 'horizontal', difficulty: 'easy', years_required: 1,
    additional_skills: '用户运营、内容运营',
    additional_certificates: '运营证书',
    promotion_conditions: '了解运营业务、数据运营是核心',
    salary_change: '12K-18K → 8K-12K',
    path_description: '数据分析转运营，数据运营岗位需求大',
    is_recommended: 1,
  },

  // 算法工程师横向转岗
  {
    from_job_id: 14, to_job_id: 2, path_type: 'horizontal', difficulty: 'easy', years_required: 1,
    additional_skills: '后端开发、模型部署',
    additional_certificates: '后端开发证书',
    promotion_conditions: '有工程化基础、MLOps是热门方向',
    salary_change: '25K-40K → 18K-25K',
    path_description: '算法转后端开发，算法工程化是趋势',
    is_recommended: 1,
  },

  // UI/UX设计师横向转岗
  {
    from_job_id: 7, to_job_id: 4, path_type: 'horizontal', difficulty: 'medium', years_required: 3,
    additional_skills: '产品设计、需求分析、数据分析',
    additional_certificates: '产品经理证书',
    promotion_conditions: '设计中对产品理解深入、用户体验是核心',
    salary_change: '12K-18K → 18K-30K',
    path_description: '设计转产品经理，用户体验思维是优势',
    is_recommended: 1,
  },

  // 新媒体运营横向转岗
  {
    from_job_id: 17, to_job_id: 5, path_type: 'horizontal', difficulty: 'easy', years_required: 1,
    additional_skills: '用户运营、数据运营',
    additional_certificates: '运营证书',
    promotion_conditions: '新媒体是运营的一部分',
    salary_change: '8K-15K → 8K-12K',
    path_description: '新媒体转运营专员，扩大工作范围',
    is_recommended: 1,
  },

  // 电商运营横向转岗
  {
    from_job_id: 18, to_job_id: 5, path_type: 'horizontal', difficulty: 'easy', years_required: 1,
    additional_skills: '用户运营、内容运营',
    additional_certificates: '运营证书',
    promotion_conditions: '电商运营本身包含运营能力',
    salary_change: '8K-15K → 8K-12K',
    path_description: '电商转运营专员，能力可复用',
    is_recommended: 1,
  },

  // 实施工程师横向转岗
  {
    from_job_id: 8, to_job_id: 24, path_type: 'horizontal', difficulty: 'medium', years_required: 2,
    additional_skills: '网络配置、安全防护',
    additional_certificates: '网络工程师证书',
    promotion_conditions: '有IT基础、实施涉及网络',
    salary_change: '10K-14K → 10K-15K',
    path_description: '实施转网络工程师，实施中积累网络经验',
    is_recommended: 0,
  },

  // 质量管理横向转岗
  {
    from_job_id: 20, to_job_id: 3, path_type: 'horizontal', difficulty: 'easy', years_required: 1,
    additional_skills: '测试用例设计、缺陷管理',
    additional_certificates: '测试工程师证书',
    promotion_conditions: '有质量意识、测试是质量一部分',
    salary_change: '8K-12K → 10K-15K',
    path_description: '质量管理转测试工程师，思维可复用',
    is_recommended: 1,
  },

  // 市场专员横向转岗
  {
    from_job_id: 12, to_job_id: 5, path_type: 'horizontal', difficulty: 'easy', years_required: 1,
    additional_skills: '用户运营、数据运营',
    additional_certificates: '运营证书',
    promotion_conditions: '市场获客后需要运营承接',
    salary_change: '8K-13K → 8K-12K',
    path_description: '市场转运营，获客后用户运营很重要',
    is_recommended: 1,
  },

  // 项目经理横向转岗
  {
    from_job_id: 16, to_job_id: 8, path_type: 'horizontal', difficulty: 'easy', years_required: 1,
    additional_skills: '技术实施、系统部署',
    additional_certificates: '系统集成证书',
    promotion_conditions: '有技术背景、实施管理结合',
    salary_change: '18K-25K → 10K-14K',
    path_description: '项目经理转实施工程师，深入技术',
    is_recommended: 0,
  },
];

async function main() {
  const client = getSupabaseClient();

  console.log(`开始补充导入 ${additionalPaths.length} 条岗位晋升路径...`);

  const { error } = await client.from('career_paths').insert(additionalPaths);
  if (error) {
    console.error('导入失败:', error.message);
    throw new Error(error.message);
  }

  console.log(`成功补充导入 ${additionalPaths.length} 条岗位晋升路径！`);

  // 统计
  const { count } = await client.from('career_paths').select('*', { count: 'exact', head: true });
  console.log(`数据库中现有晋升路径总数: ${count} 条`);

  // 按路径类型统计
  const { data: allPaths } = await client.from('career_paths').select('path_type');
  const verticalPaths = allPaths?.filter(p => p.path_type === 'vertical').length || 0;
  const horizontalPaths = allPaths?.filter(p => p.path_type === 'horizontal').length || 0;
  console.log(`垂直晋升路径: ${verticalPaths} 条`);
  console.log(`横向转岗路径: ${horizontalPaths} 条`);

  // 按难度统计
  const { data: diffPaths } = await client.from('career_paths').select('difficulty');
  const easyPaths = diffPaths?.filter(p => p.difficulty === 'easy').length || 0;
  const mediumPaths = diffPaths?.filter(p => p.difficulty === 'medium').length || 0;
  const hardPaths = diffPaths?.filter(p => p.difficulty === 'hard').length || 0;
  console.log(`容易转岗路径: ${easyPaths} 条`);
  console.log(`中等难度路径: ${mediumPaths} 条`);
  console.log(`困难转岗路径: ${hardPaths} 条`);
}

main().catch(console.error);
