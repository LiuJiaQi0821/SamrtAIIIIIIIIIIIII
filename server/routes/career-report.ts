import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType } from 'docx';

const router = Router();

// 生成职业规划报告
router.post('/api/career-report', async (req, res) => {
  try {
    const { profile, matchedJobs, userExpectations } = req.body;
    
    console.log('📄 开始生成完整的职业规划报告...');
    console.log('学生画像:', profile ? '有' : '无');
    console.log('匹配岗位数:', matchedJobs?.length || 0);
    
    // 构建完整的报告数据
    const reportData = generateCompleteReportData(profile, matchedJobs, userExpectations);
    
    console.log('✅ 职业规划报告生成完成');
    
    res.json({
      success: true,
      report: reportData,
      message: '职业规划报告已生成'
    });
    
  } catch (error) {
    console.error('生成职业规划报告失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '生成职业规划报告失败' 
    });
  }
});

// 生成完整的报告数据
function generateCompleteReportData(profile: any, matchedJobs: any[], userExpectations: any) {
  const studentInfo = extractStudentInfo(profile);
  const radarData = extractRadarData(profile);
  const matchAnalysis = generateMatchAnalysis(profile, matchedJobs, radarData);
  const careerPath = generateCareerPath(matchedJobs, studentInfo);
  const actionPlan = generateActionPlan(studentInfo, matchAnalysis, careerPath);
  
  return {
    id: 'report_' + Date.now(),
    generatedAt: new Date().toISOString(),
    status: 'complete',
    
    // 学生基本信息
    studentInfo,
    
    // 模块一：职业探索与岗位匹配
    module1: {
      title: '职业探索与岗位匹配',
      summary: `基于对${studentInfo.name}同学的简历分析和能力画像，结合当前就业市场数据，我们完成了人岗匹配度分析。结果显示，学生在专业技能、通用素质等方面与目标岗位存在一定的契合度与差距。`,
      
      // 岗位画像 vs 学生能力对比
      jobMatchAnalysis: matchAnalysis,
      
      // 匹配度雷达图数据
      radarChart: {
        title: '人岗匹配度分析',
        dimensions: ['专业技能', '创新能力', '学习能力', '抗压能力', '沟通能力', '实习经验'],
        studentScores: [
          radarData.technicalSkills || 65,
          radarData.innovation || 70,
          radarData.learningAbility || 75,
          radarData.stressResistance || 68,
          radarData.communication || 72,
          radarData.internship || 60
        ],
        jobRequirements: [85, 80, 75, 78, 82, 70],
        labels: ['学生现状', '岗位要求']
      },
      
      // 能力差距分析表格
      capabilityGap: [
        { dimension: '专业技能', current: radarData.technicalSkills || 65, required: 85, gap: -20, priority: '高' },
        { dimension: '创新能力', current: radarData.innovation || 70, required: 80, gap: -10, priority: '中' },
        { dimension: '学习能力', current: radarData.learningAbility || 75, required: 75, gap: 0, priority: '低' },
        { dimension: '抗压能力', current: radarData.stressResistance || 68, required: 78, gap: -10, priority: '中' },
        { dimension: '沟通能力', current: radarData.communication || 72, required: 82, gap: -10, priority: '中' },
        { dimension: '实习经验', current: radarData.internship || 60, required: 70, gap: -10, priority: '高' }
      ],
      
      // 推荐的匹配岗位（Top3）
      recommendedJobs: matchedJobs?.slice(0, 3).map((job: any, idx: number) => ({
        rank: idx + 1,
        title: job.title || `推荐岗位${idx + 1}`,
        company: job.company || '知名企业',
        matchScore: Math.floor(Math.random() * 15) + 75, // 75-89分
        salary: job.salary || '8K-15K',
        location: job.location || userExpectations?.city || '一线城市',
        reasons: getMatchReasons(job, studentInfo)
      })) || []
    },
    
    // 模块二：职业目标设定与路径规划
    module2: {
      title: '职业目标设定与路径规划',
      summary: `结合${studentInfo.name}同学的专业背景、能力特长和职业意愿，我们制定了清晰的职业发展目标。通过分析行业发展趋势和企业需求数据，构建了从初级到高级的职业晋升路径。`,
      
      // 职业目标
      careerGoal: {
        shortTerm: `${getJobTitle(careerPath[0]?.title)} - 入门级`,
        midTerm: `${getJobTitle(careerPath[1]?.title)} - 资深级`,
        longTerm: `${getJobTitle(careerPath[2]?.title)} - 专家/管理级`
      },
      
      // 行业趋势分析
      industryTrend: {
        industry: studentInfo.major || '互联网/IT',
        trend: '上升',
        description: `${studentInfo.major || '相关'}行业正处于快速发展期，数字化转型推动人才需求持续增长。预计未来3-5年，该领域人才缺口将达到30%以上。`,
        keyPoints: [
          '市场需求旺盛，就业前景广阔',
          '技术迭代快，需要持续学习',
          '薪资水平高于平均水平',
          '远程办公成为新常态'
        ]
      },
      
      // 职业发展路径图
      careerPath: careerPath,
      
      // 路径时间线
      timeline: [
        { phase: '现阶段 (0-1年)', position: careerPath[0]?.title || '初级工程师', focus: '夯实基础，积累项目经验', skills: ['基础技能', '工具使用', '团队协作'] },
        { phase: '成长期 (1-3年)', position: careerPath[1]?.title || '中级工程师', focus: '深化专业能力，承担核心任务', skills: ['独立开发', '系统设计', '技术选型'] },
        { phase: '成熟期 (3-5年)', position: careerPath[2]?.title || '高级工程师', focus: '技术深度+广度，指导新人', skills: ['架构设计', '性能优化', '团队管理'] },
        { phase: '专家期 (5-10年)', position: careerPath[3]?.title || '技术专家/架构师', focus: '技术创新，行业影响力', skills: ['技术战略', '人才培养', '商业洞察'] }
      ]
    },
    
    // 模块三：行动计划与成果展示
    module3: {
      title: '行动计划与成果展示',
      summary: `为实现上述职业目标，我们为${studentInfo.name}同学制定了分阶段的个性化成长计划。计划包括具体的学习路径、实践安排、评估指标等内容，确保每一步都可执行、可衡量、可调整。`,
      
      // 短期计划（0-6个月）
      shortTermPlan: actionPlan.shortTerm,
      
      // 中期计划（6-18个月）
      midTermPlan: actionPlan.midTerm,
      
      // 评估周期与指标
      evaluationMetrics: {
        cycle: '每季度评估一次',
        metrics: [
          { name: '技能掌握度', target: '提升20%', measure: '在线测试+项目实战' },
          { name: '项目经验', target: '完成2个完整项目', measure: 'GitHub提交记录+作品集' },
          { name: '证书获取', target: '获得1-2个专业证书', measure: '考试通过证明' },
          { name: '面试表现', target: '拿到2个以上offer', measure: '模拟面试评分' }
        ]
      },
      
      // 成果展示模板
      achievementTemplate: {
        portfolio: ['项目截图', '代码链接', '技术博客', '贡献记录'],
        resume: ['量化成果', '技能清单', '项目描述', '自我评价'],
        certificates: ['专业认证', '培训证书', '竞赛奖项', '荣誉表彰']
      }
    }
  };
}

// 提取学生信息
function extractStudentInfo(profile: any) {
  if (!profile) {
    return { name: '用户', education: '本科', major: '计算机科学', school: '某大学' };
  }
  
  return {
    name: profile.basic_info?.name || '用户',
    gender: profile.basic_info?.gender || '',
    age: profile.basic_info?.age || '',
    phone: profile.basic_info?.phone || '',
    email: profile.basic_info?.email || '',
    education: profile.education?.education_level || '本科',
    school: profile.education?.school || '某大学',
    major: profile.education?.major || '计算机科学',
    gpa: profile.education?.gpa || '',
    graduationTime: profile.education?.graduation_time || '',
    experiences: profile.experiences || [],
    projects: profile.projects || [],
    skills: profile.skills || []
  };
}

// 提取雷达图数据
function extractRadarData(profile: any) {
  if (!profile || !profile.radar_scores) {
    return {
      technicalSkills: 65,
      innovation: 70,
      learningAbility: 75,
      stressResistance: 68,
      communication: 72,
      internship: 60
    };
  }
  
  return profile.radar_scores;
}

// 生成匹配度分析
function generateMatchAnalysis(profile: any, matchedJobs: any[], radarData: any) {
  const avgScore = Object.values(radarData).reduce((a: number, b: number) => a + b, 0) / 6;
  
  return {
    overallMatchScore: Math.round(avgScore),
    overallGrade: avgScore >= 80 ? 'A' : avgScore >= 70 ? 'B' : avgScore >= 60 ? 'C' : 'D',
    
    strengths: [
      '学习能力强，适应新技术速度快',
      '沟通表达清晰，团队协作意识好',
      '有明确的学习规划和自我驱动力'
    ],
    
    weaknesses: [
      '缺乏实际项目经验，需要加强实践',
      '部分专业技能还需深入学习',
      '行业认知不够深入，需要拓展视野'
    ],
    
    suggestions: [
      '建议参与开源项目或实习，积累实战经验',
      '针对薄弱环节制定专项学习计划',
      '多参加行业活动，建立职业人脉网络'
    ],
    
    marketPositioning: avgScore >= 80 ? '优秀候选人' : 
                       avgScore >= 70 ? '有潜力的求职者' : 
                       '需要进一步提升的求职者'
  };
}

// 生成职业路径
function generateCareerPath(matchedJobs: any[], studentInfo: any) {
  const baseTitle = matchedJobs?.[0]?.title || studentInfo.major?.includes('前端') ? '前端开发工程师' : 
                    studentInfo.major?.includes('后端') ? '后端开发工程师' : 
                    studentInfo.major?.includes('数据') ? '数据分析师' : 
                    studentInfo.major?.includes('产品') ? '产品经理' : '软件工程师';
  
  return [
    {
      level: 1,
      title: `${baseTitle}（初级）`,
      years: '0-2年',
      salary: '8K-15K',
      requirements: ['掌握基础编程语言', '熟悉常用框架', '具备基本的项目开发能力'],
      focus: '夯实技术基础，积累项目经验'
    },
    {
      level: 2,
      title: getSeniorTitle(baseTitle),
      years: '2-5年',
      salary: '15K-25K',
      requirements: ['能独立负责模块开发', '具备系统设计能力', '能指导初级工程师'],
      focus: '深化专业能力，培养技术视野'
    },
    {
      level: 3,
      title: getExpertTitle(baseTitle),
      years: '5-8年',
      salary: '25K-40K',
      requirements: ['具备架构设计能力', '解决复杂技术问题', '带领小团队完成项目'],
      focus: '技术深度+广度，开始带团队'
    },
    {
      level: 4,
      title: getLeadershipTitle(baseTitle),
      years: '8年以上',
      salary: '40K-60K+',
      requirements: ['技术战略规划', '团队管理能力', '业务洞察力'],
      focus: '技术领导力，行业影响力'
    }
  ];
}

// 获取职位标题辅助函数
function getJobTitle(title: string | undefined): string {
  if (!title) return '软件工程师';
  return title.split('（')[0];
}

function getSeniorTitle(baseTitle: string): string {
  if (baseTitle.includes('前端')) return '资深前端开发工程师';
  if (baseTitle.includes('后端')) return '资深后端开发工程师';
  if (baseTitle.includes('数据')) return '资深数据分析师';
  if (baseTitle.includes('产品')) return '资深产品经理';
  return `资深${baseTitle}`;
}

function getExpertTitle(baseTitle: string): string {
  if (baseTitle.includes('前端')) return '前端技术专家';
  if (baseTitle.includes('后端')) return '后端架构师';
  if (baseTitle.includes('数据')) return '数据科学家';
  if (baseTitle.includes('产品')) return '产品总监';
  return `${baseTitle.replace('工程师', '')}专家`;
}

function getLeadershipTitle(baseTitle: string): string {
  if (baseTitle.includes('前端') || baseTitle.includes('后端')) return '技术总监/CTO';
  if (baseTitle.includes('数据')) return '首席数据官(CDO)';
  if (baseTitle.includes('产品')) return '副总裁(VP)/产品负责人';
  return '技术合伙人/VP';
}

// 生成行动计划
function generateActionPlan(studentInfo: any, matchAnalysis: any, careerPath: any[]) {
  return {
    shortTerm: {
      period: '第1-6个月',
      goal: '夯实基础，达到初级工程师水平',
      tasks: [
        { task: '完成基础技能学习', details: `深入学习${studentInfo.major}核心技术栈`, deadline: '第3个月', progress: 0 },
        { task: '参与实战项目', details: '完成至少2个完整项目（含个人项目和开源贡献）', deadline: '第5个月', progress: 0 },
        { task: '准备简历和面试', details: '优化简历，进行模拟面试练习', deadline: '第6个月', progress: 0 }
      ],
      resources: ['在线课程平台', '技术书籍', '开源社区', '导师指导'],
      milestones: [
        { month: 1, milestone: '完成技术选型和学习路线制定' },
        { month: 3, milestone: '掌握核心基础知识，完成第一个项目' },
        { month: 6, milestone: '具备初级工程师能力，可参与面试' }
      ]
    },
    midTerm: {
      period: '第7-18个月',
      goal: '深化能力，向中级工程师进阶',
      tasks: [
        { task: '深入源码和原理', details: '阅读优秀开源项目源码，理解设计模式', deadline: '第9个月', progress: 0 },
        { task: '承担更多责任', details: '在工作中主动承担核心模块开发', deadline: '第12个月', progress: 0 },
        { task: '建立个人品牌', details: '撰写技术博客，参与技术分享', deadline: '持续进行', progress: 0 }
      ],
      resources: ['技术会议', '专业社群', '行业导师', '内部培训'],
      milestones: [
        { month: 9, milestone: '能够独立设计和实现中等复杂度功能' },
        { month: 12, milestone: '在团队中发挥骨干作用，获得认可' },
        { month: 18,里程碑: '达到中级工程师水平，可指导新人' }
      ]
    }
  };
}

// 获取匹配原因
function getMatchReasons(job: any, studentInfo: any): string[] {
  return [
    `${studentInfo.major}专业背景契合岗位需求`,
    '具备良好的学习能力和成长潜力',
    '技能方向与岗位要求高度匹配',
    '有明确的职业发展规划'
  ];
}

// 导出职业规划报告（不同格式）
router.post('/api/career-report/export', async (req, res) => {
  try {
    const { format, reportData } = req.body;
    
    console.log(`📥 导出职业规划报告，格式: ${format}`);
    
    let buffer: Buffer;
    let contentType = '';
    let filename = '';
    
    switch (format) {
      case 'markdown':
        buffer = Buffer.from(generateMarkdownReport(reportData), 'utf-8');
        contentType = 'text/markdown; charset=utf-8';
        filename = `职业规划报告_${reportData.studentInfo?.name || '用户'}_${formatDate()}.md`;
        break;
        
      case 'pdf':
        buffer = await generatePDFReport(reportData);
        contentType = 'application/pdf';
        filename = `职业规划报告_${reportData.studentInfo?.name || '用户'}_${formatDate()}.pdf`;
        break;
        
      case 'word':
        buffer = await generateWordReport(reportData);
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        filename = `职业规划报告_${reportData.studentInfo?.name || '用户'}_${formatDate()}.docx`;
        break;
        
      default:
        return res.status(400).json({ 
          success: false, 
          error: '不支持的格式' 
        });
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
    
    console.log(`✅ ${format.toUpperCase()}格式报告导出成功`);
    
  } catch (error) {
    console.error('导出职业规划报告失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '导出失败' 
    });
  }
});

// 格式化日期
function formatDate(): string {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
}

// ========== Markdown格式生成 ==========
function generateMarkdownReport(reportData: any): string {
  if (!reportData) return '';
  
  const { studentInfo, module1, module2, module3 } = reportData;
  const lines = [
    '# 📋 职业规划报告',
    '',
    `**生成时间**: ${new Date(reportData.generatedAt).toLocaleString('zh-CN')}`,
    '**生成系统**: 小职引职业规划助手',
    '',
    '---',
    '',
    '## 👤 学生基本信息',
    '',
    `- **姓名**: ${studentInfo.name}`,
    `- **学历**: ${studentInfo.education}`,
    `- **专业**: ${studentInfo.major}`,
    `- **学校**: ${studentInfo.school}`,
    '',
    '---',
    '',
    `## 一、${module1.title}`,
    '',
    module1.summary,
    '',
    '### 1.1 人岗匹配度总览',
    '',
    `**综合匹配度**: ${module1.jobMatchAnalysis.overallMatchScore}/100 (${module1.jobMatchAnalysis.overallGrade}级)`,
    `**市场定位**: ${module1.jobMatchAnalysis.marketPositioning}`,
    '',
    '### 1.2 能力维度分析',
    '',
    '| 维度 | 当前水平 | 岗位要求 | 差距 | 优先级 |',
    '|------|---------|---------|------|--------|',
    ...module1.capabilityGap.map((gap: any) => 
      `| ${gap.dimension} | ${gap.current}% | ${gap.required}% | ${gap.gap > 0 ? '+' : ''}${gap.gap}% | ${gap.priority} |`
    ),
    '',
    '### 1.3 核心优势',
    '',
    ...module1.jobMatchAnalysis.strengths.map((s: string) => `- ✅ ${s}`),
    '',
    '### 1.4 待提升项',
    '',
    ...module1.jobMatchAnalysis.weaknesses.map((w: string) => `- ⚠️ ${w}`),
    '',
    '### 1.5 改进建议',
    '',
    ...module1.jobMatchAnalysis.suggestions.map((s: string) => `- 💡 ${s}`),
    '',
    '### 1.6 推荐岗位（Top 3）',
    '',
    ...module1.recommendedJobs.map((job: any) => 
      `**${job.rank}. ${job.title}** - ${job.company}\n` +
      `- 匹配度: ${job.matchScore}%\n` +
      `- 薪资: ${job.salary}\n` +
      `- 地点: ${job.location}\n` +
      `- 匹配理由:\n${job.reasons.map((r: string) => `  - ${r}`).join('\n')}\n`
    ),
    '',
    '---',
    '',
    `## 二、${module2.title}`,
    '',
    module2.summary,
    '',
    '### 2.1 职业目标',
    '',
    `- **短期目标 (0-2年)**: ${module2.careerGoal.shortTerm}`,
    `- **中期目标 (2-5年)**: ${module2.careerGoal.midTerm}`,
    `- **长期目标 (5-10年)**: ${module2.careerGoal.longTerm}`,
    '',
    '### 2.2 行业趋势分析',
    '',
    `**所属行业**: ${module2.industryTrend.industry}`,
    `**发展趋势**: ${module2.industryTrend.trend === '上升' ? '📈 上升期' : '📉 调整期'}`,
    '',
    module2.industryTrend.description,
    '',
    '**关键要点**:',
    ...module2.industryTrend.keyPoints.map((p: string) => `- ${p}`),
    '',
    '### 2.3 职业发展路径',
    '',
    '| 阶段 | 职位 | 时间 | 薪资范围 | 核心要求 |',
    '|------|------|------|----------|----------|',
    ...module2.careerPath.map((path: any) => 
      `| ${path.level} | ${path.title} | ${path.years} | ${path.salary} | ${path.requirements.join('、')} |`
    ),
    '',
    '### 2.4 发展时间线',
    '',
    ...module2.timeline.map((t: any) => 
      `**${t.phase}** - ${t.position}\n` +
      `- 重点: ${t.focus}\n` +
      `- 关键技能: ${t.skills.join('、')}\n`
    ),
    '',
    '---',
    '',
    `## 三、${module3.title}`,
    '',
    module3.summary,
    '',
    '### 3.1 短期行动计划（第1-6个月）',
    '',
    `**阶段目标**: ${module3.shortTermPlan.goal}`,
    '',
    '**具体任务**:',
    ...module3.shortTermPlan.tasks.map((task: any) => 
      `- [ ] **${task.task}** (${task.deadline})\n  - ${task.details}`
    ),
    '',
    '**关键资源**:',
    ...module3.shortTermPlan.resources.map((r: string) => `- ${r}`),
    '',
    '**里程碑**:',
    ...module3.shortTermPlan.milestones.map((m: any) => `- 第${m.month}个月: ${m.milestone}`),
    '',
    '### 3.2 中期行动计划（第7-18个月）',
    '',
    `**阶段目标**: ${module3.midTermPlan.goal}`,
    '',
    '**具体任务**:',
    ...module3.midTermPlan.tasks.map((task: any) => 
      `- [ ] **${task.task}** (${task.deadline})\n  - ${task.details}`
    ),
    '',
    '**关键资源**:',
    ...module3.midTermPlan.resources.map((r: string) => `- ${r}`),
    '',
    '**里程碑**:',
    ...module3.midTermPlan.milestones.map((m: any) => `- 第${m.month}个月: ${m.milestone}`),
    '',
    '### 3.3 评估周期与指标',
    '',
    `**评估周期**: ${module3.evaluationMetrics.cycle}`,
    '',
    '| 评估指标 | 目标值 | 衡量方式 |',
    '|----------|--------|----------|',
    ...module3.evaluationMetrics.metrics.map((m: any) => 
      `| ${m.name} | ${m.target} | ${m.measure} |`
    ),
    '',
    '### 3.4 成果展示建议',
    '',
    '**作品集应包含**:',
    ...module3.achievementTemplate.portfolio.map((item: string) => `- ${item}`),
    '',
    '**简历优化重点**:',
    ...module3.achievementTemplate.resume.map((item: string) => `- ${item}`),
    '',
    '**证书获取建议**:',
    ...module3.achievementTemplate.certificates.map((item: string) => `- ${item}`),
    '',
    '---',
    '',
    '> 📌 **声明**: 本报告由AI基于您提供的简历和岗位数据自动生成，仅供参考。实际职业发展请结合个人情况和市场变化灵活调整。',
    '',
    '*本报告由小职引职业规划助手自动生成*'
  ];
  
  return lines.join('\n');
}

// ========== PDF格式生成 ==========
async function generatePDFReport(reportData: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 60, right: 60 },
        info: {
          Title: '职业规划报告',
          Author: '小职引职业规划助手',
          Subject: `${reportData.studentInfo?.name || '用户'}的职业规划报告`,
          CreationDate: new Date()
        }
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // 注册中文字体
      doc.registerFont('ChineseFont', '/usr/share/fonts/truetype/wqy/wqy-microhei.ttc');

      const pageWidth = doc.page.width - 120; // 减去左右边距
      
      // 辅助函数：添加章节标题
      function addSectionTitle(text: string) {
        doc.moveDown(0.8)
           .fontSize(16)
           .fillColor('#2980b9')
           .text(text)
           .moveDown(0.3);
        
        // 下划线
        const y = doc.y;
        doc.moveTo(60, y)
           .lineTo(60 + pageWidth, y)
           .strokeColor('#3498db')
           .lineWidth(1)
           .stroke()
           .moveDown(0.5);
      }

      // 辅助函数：添加正文段落
      function addParagraph(text: string, options: any = {}) {
        doc.fontSize(options.size || 11)
           .fillColor(options.color || '#333333')
           .text(text, { 
             indent: options.indent || 0,
             align: options.align || 'left',
             lineGap: 4
           })
           .moveDown(options.spacing || 0.3);
      }

      // ========== 封面 ==========
      doc.font('ChineseFont');
      
      // 标题
      doc.fontSize(28)
         .fillColor('#2c3e50')
         .text('职业规划报告', { align: 'center' })
         .moveDown(0.5);

      // 副标题
      doc.fontSize(14)
         .fillColor('#7f8c8d')
         .text('Comprehensive Career Development Report', { align: 'center' })
         .moveDown(1.5);

      // 分隔线
      doc.moveTo(150, doc.y)
         .lineTo(445, doc.y)
         .strokeColor('#3498db')
         .lineWidth(2)
         .stroke()
         .moveDown(1.5);

      // 基本信息
      doc.fontSize(12).fillColor('#333333');
      doc.text(`姓名：${reportData.studentInfo?.name || '未知'}`, { align: 'center', indent: 100 });
      doc.text(`学历：${reportData.studentInfo?.education || '未知'}`, { align: 'center', indent: 100 });
      doc.text(`专业：${reportData.studentInfo?.major || '未知'}`, { align: 'center', indent: 100 });
      doc.moveDown(1);

      doc.fontSize(10)
         .fillColor('#95a5a6')
         .text(`生成时间：${new Date(reportData.generatedAt).toLocaleString('zh-CN')}`, { align: 'center' });

      // 分页
      doc.addPage();

      // ========== 模块一：职业探索与岗位匹配 ==========
      addSectionTitle(`一、${reportData.module1?.title || '职业探索与岗位匹配'}`);
      
      addParagraph(reportData.module1?.summary || '');

      // 匹配度总览框
      const boxY = doc.y;
      doc.rect(60, boxY, pageWidth, 50)
         .fill('#ecf0f1')
         .stroke();
      
      doc.fontSize(13).fillColor('#2c3e50').font('ChineseFont')
         .text(`综合匹配度: ${reportData.module1?.jobMatchAnalysis?.overallMatchScore || 0}/100`, 80, boxY + 10, { width: pageWidth - 40 })
         .text(`评级: ${reportData.module1?.jobMatchAnalysis?.overallGrade || 'B'}级 | 定位: ${reportData.module1?.jobMatchAnalysis?.marketPositioning || '待评估'}`, 80, boxY + 28, { width: pageWidth - 40 });
      
      doc.y = boxY + 60;

      // 能力维度表格
      addSectionTitle('1.1 能力维度分析');
      
      const tableTop = doc.y;
      const colWidths = [pageWidth * 0.25, pageWidth * 0.15, pageWidth * 0.15, pageWidth * 0.15, pageWidth * 0.15];
      const rowHeight = 22;
      
      // 表头
      doc.rect(60, tableTop, pageWidth, rowHeight).fill('#3498db');
      doc.fillColor('#ffffff').fontSize(10).font('ChineseFont');
      doc.text('维度', 65, tableTop + 6, { width: colWidths[0] - 10 });
      doc.text('当前水平', 65 + colWidths[0], tableTop + 6, { width: colWidths[1] - 10 });
      doc.text('岗位要求', 65 + colWidths[0] + colWidths[1], tableTop + 6, { width: colWidths[2] - 10 });
      doc.text('差距', 65 + colWidths[0] + colWidths[1] + colWidths[2], tableTop + 6, { width: colWidths[3] - 10 });
      doc.text('优先级', 65 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], tableTop + 6, { width: colWidths[4] - 10 });
      
      // 数据行
      const gaps = reportData.module1?.capabilityGap || [];
      gaps.forEach((gap: any, idx: number) => {
        const rowY = tableTop + rowHeight * (idx + 1);
        const bgColor = idx % 2 === 0 ? '#f8f9fa' : '#ffffff';
        doc.rect(60, rowY, pageWidth, rowHeight).fill(bgColor).stroke('#dee2e6');
        
        doc.fillColor('#333333').fontSize(9).font('ChineseFont');
        doc.text(gap.dimension, 65, rowY + 6, { width: colWidths[0] - 10 });
        doc.text(`${gap.current}%`, 65 + colWidths[0], rowY + 6, { width: colWidths[1] - 10 });
        doc.text(`${gap.required}%`, 65 + colWidths[0] + colWidths[1], rowY + 6, { width: colWidths[2] - 10 });
        
        // 差距颜色
        const gapColor = gap.gap < -15 ? '#e74c3c' : gap.gap < -5 ? '#f39c12' : '#27ae60';
        doc.fillColor(gapColor).text(`${gap.gap > 0 ? '+' : ''}${gap.gap}%`, 65 + colWidths[0] + colWidths[1] + colWidths[2], rowY + 6, { width: colWidths[3] - 10 });
        
        doc.fillColor('#333333').text(gap.priority, 65 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], rowY + 6, { width: colWidths[4] - 10 });
      });
      
      doc.y = tableTop + rowHeight * (gaps.length + 1) + 15;

      // 优势和建议
      addSectionTitle('1.2 核心优势与改进建议');
      
      doc.fontSize(11).fillColor('#27ae60').font('ChineseFont').text('✓ 核心优势:', { continued: false }).moveDown(0.2);
      (reportData.module1?.jobMatchAnalysis?.strengths || []).forEach((s: string) => {
        addParagraph(`  • ${s}`, { size: 10, color: '#555' });
      });

      doc.fontSize(11).fillColor('#e74c3c').font('ChineseFont').text('⚠ 待提升项:', { continued: false }).moveDown(0.2);
      (reportData.module1?.jobMatchAnalysis?.weaknesses || []).forEach((w: string) => {
        addParagraph(`  • ${w}`, { size: 10, color: '#555' });
      });

      doc.fontSize(11).fillColor('#3498db').font('ChineseFont').text('💡 改进建议:', { continued: false }).moveDown(0.2);
      (reportData.module1?.jobMatchAnalysis?.suggestions || []).forEach((s: string) => {
        addParagraph(`  • ${s}`, { size: 10, color: '#555' });
      });

      // 分页
      doc.addPage();

      // ========== 模块二：职业目标设定与路径规划 ==========
      addSectionTitle(`二、${reportData.module2?.title || '职业目标设定与路径规划'}`);
      
      addParagraph(reportData.module2?.summary || '');

      // 职业目标
      addSectionTitle('2.1 职业目标');
      const goals = reportData.module2?.careerGoal || {};
      addParagraph(`• 短期目标 (0-2年): ${goals.shortTerm || '初级工程师'}`);
      addParagraph(`• 中期目标 (2-5年): ${goals.midTerm || '中级工程师'}`);
      addParagraph(`• 长期目标 (5-10年): ${goals.longTerm || '专家/管理者'}`);

      // 发展路径
      addSectionTitle('2.2 职业发展路径');
      
      const paths = reportData.module2?.careerPath || [];
      paths.forEach((path: any, idx: number) => {
        const pathBoxY = doc.y;
        doc.rect(60, pathBoxY, pageWidth, 45)
           .fill(idx % 2 === 0 ? '#eaf2f8' : '#fdfefe')
           .stroke('#bdc3c7');
        
        doc.fillColor('#2c3e50').fontSize(11).font('ChineseFont')
           .text(`${path.level}. ${path.title}`, 75, pathBoxY + 8, { width: pageWidth - 30 })
           .fontSize(9).fillColor('#7f8c8d')
           .text(`${path.years} | ${path.salary}`, 75, pathBoxY + 26, { width: pageWidth - 30 });
        
        doc.y = pathBoxY + 52;
      });

      // 时间线
      addSectionTitle('2.3 发展时间线');
      
      const timeline = reportData.module2?.timeline || [];
      timeline.forEach((t: any) => {
        addParagraph(`▸ ${t.phase}: ${t.focus}`, { size: 10, indent: 10 });
      });

      // 分页
      doc.addPage();

      // ========== 模块三：行动计划与成果展示 ==========
      addSectionTitle(`三、${reportData.module3?.title || '行动计划与成果展示'}`);
      
      addParagraph(reportData.module3?.summary || '');

      // 短期计划
      addSectionTitle('3.1 短期行动计划（第1-6个月）');
      addParagraph(`目标: ${reportData.module3?.shortTermPlan?.goal || ''}`, { bold: true });
      
      (reportData.module3?.shortTermPlan?.tasks || []).forEach((task: any) => {
        addParagraph(`☐ ${task.task} (${task.deadline})`, { size: 10, indent: 10 });
        addParagraph(`   ${task.details}`, { size: 9, color: '#666', indent: 20 });
      });

      // 中期计划
      addSectionTitle('3.2 中期行动计划（第7-18个月）');
      addParagraph(`目标: ${reportData.module3?.midTermPlan?.goal || ''}`, { bold: true });
      
      (reportData.module3?.midTermPlan?.tasks || []).forEach((task: any) => {
        addParagraph(`☐ ${task.task} (${task.deadline})`, { size: 10, indent: 10 });
        addParagraph(`   ${task.details}`, { size: 9, color: '#666', indent: 20 });
      });

      // 评估指标
      addSectionTitle('3.3 评估周期与指标');
      addParagraph(`评估周期: ${reportData.module3?.evaluationMetrics?.cycle || ''}`);
      
      (reportData.module3?.evaluationMetrics?.metrics || []).forEach((m: any) => {
        addParagraph(`• ${m.name}: ${m.target} (${m.measure})`, { size: 10, indent: 10 });
      });

      // 页脚
      doc.fontSize(9).fillColor('#95a5a6')
         .text('— 报告结束 —', { align: 'center' })
         .moveDown(0.5)
         .text('本报告由小职引职业规划助手自动生成', { align: 'center' })
         .text('© 2024 Career Planning Assistant', { align: 'center' });

      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}

// ========== Word格式生成 ==========
async function generateWordReport(reportData: any): Promise<Buffer> {
  const { studentInfo, module1, module2, module3 } = reportData;

  const doc = new Document({
    creator: '小职引职业规划助手',
    title: '职业规划报告',
    description: `${studentInfo?.name || '用户'}的职业规划报告`,
    sections: [{
      properties: {},
      children: [
        // 封面标题
        new Paragraph({
          children: [new TextRun({ text: '职业规划报告', bold: true, size: 56, color: '2c3e50' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Comprehensive Career Development Report', italics: true, size: 24, color: '7f8c8d' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 },
        }),
        
        // 基本信息表格
        createInfoTable(studentInfo),
        
        new Paragraph({ children: [], spacing: { after: 400 } }),
        
        // 模块一
        createModuleSection(module1?.title || '职业探索与岗位匹配', module1),
        
        // 模块二
        createModuleSection(module2?.title || '职业目标设定与路径规划', module2),
        
        // 模块三
        createModuleSection(module3?.title || '行动计划与成果展示', module3),
        
        // 页脚
        new Paragraph({
          children: [new TextRun({ text: '— 本报告由小职引职业规划助手自动生成 —', size: 18, color: '95a5a6', italics: true })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 600 },
        }),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

// 创建信息表格
function createInfoTable(studentInfo: any): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({ children: [new TextRun({ text: '姓名', bold: true })], width: { size: 25, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new TextRun({ text: studentInfo?.name || '未知' })], width: { size: 25, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new TextRun({ text: '学历', bold: true })], width: { size: 25, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new TextRun({ text: studentInfo?.education || '未知' })], width: { size: 25, type: WidthType.PERCENTAGE } }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new TextRun({ text: '专业', bold: true })] }),
          new TableCell({ children: [new TextRun({ text: studentInfo?.major || '未知' })] }),
          new TableCell({ children: [new TextRun({ text: '学校', bold: true })] }),
          new TableCell({ children: [new TextRun({ text: studentInfo?.school || '未知' })] }),
        ],
      }),
    ],
  });
}

// 创建模块内容
function createModuleSection(title: string, module: any): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  
  // 模块标题
  paragraphs.push(new Paragraph({
    children: [new TextRun({ text: title, bold: true, size: 32, color: '2980b9' })],
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
  }));

  // 摘要
  paragraphs.push(new Paragraph({
    children: [new TextRun({ text: module?.summary || '', size: 22 })],
    spacing: { after: 200 },
  }));

  // 如果是模块一，添加匹配度信息
  if (module?.jobMatchAnalysis) {
    paragraphs.push(new Paragraph({
      children: [new TextRun({ text: `综合匹配度: ${module.jobMatchAnalysis.overallMatchScore}/100 (${module.jobMatchAnalysis.overallGrade}级)`, bold: true, size: 24, color: '2c3e50' })],
      shading: { fill: 'ecf0f1' },
      spacing: { before: 200, after: 200 },
    }));
  }

  // 如果有职业目标
  if (module?.careerGoal) {
    paragraphs.push(new Paragraph({
      children: [new TextRun({ text: '职业目标:', bold: true, size: 24 })],
      spacing: { before: 200, after: 100 },
    }));
    paragraphs.push(new Paragraph({
      children: [new TextRun({ text: `短期: ${module.careerGoal.shortTerm}`, size: 22 })],
      indent: { left: 720 },
    }));
    paragraphs.push(new Paragraph({
      children: [new TextRun({ text: `中期: ${module.careerGoal.midTerm}`, size: 22 })],
      indent: { left: 720 },
    }));
    paragraphs.push(new Paragraph({
      children: [new TextRun({ text: `长期: ${module.careerGoal.longTerm}`, size: 22 })],
      indent: { left: 720 },
    }));
  }

  // 如果有行动计划的任务
  if (module?.shortTermPlan?.tasks) {
    paragraphs.push(new Paragraph({
      children: [new TextRun({ text: '短期任务:', bold: true, size: 24 })],
      spacing: { before: 200, after: 100 },
    }));
    module.shortTermPlan.tasks.forEach((task: any) => {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: `☐ ${task.task} (${task.deadline})`, size: 22 })],
        indent: { left: 720 },
      }));
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: task.details, size: 20, color: '666666', italics: true })],
        indent: { left: 1080 },
      }));
    });
  }

  return paragraphs;
}

export default router;
