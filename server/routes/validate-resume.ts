import { Router } from 'express';

const router = Router();

// 简历关键词特征
const RESUME_KEYWORDS = [
  // 个人信息
  '姓名', '性别', '年龄', '生日', '籍贯', '居住地', '地址', '电话', '手机', '邮箱', 'email',
  '求职意向', '期望薪资', '期望职位', '到岗时间',
  // 教育背景
  '教育背景', '毕业院校', '学历', '学位', '专业', '毕业时间', '教育经历',
  // 工作经历
  '工作经历', '工作经验', '工作年限', '职业背景', '工作经历', '实习经历',
  // 技能
  '专业技能', '技能证书', '技能专长', '掌握技能', '技术栈', '编程语言',
  // 项目经历
  '项目经历', '项目经验', '项目描述', '项目成果',
  // 自我评价
  '自我评价', '个人评价', '个人简介', '自我描述', '个人总结',
  // 简历常用格式
  'resume', 'cv', 'curriculum vitae',
  // 常见职位
  '前端开发', '后端开发', '全栈开发', '软件工程师', '产品经理', '设计师',
  // 工作相关动词
  '负责', '参与', '开发', '设计', '实现', '优化', '维护', '完成',
];

// 非简历特征词（用于排除）
const NON_RESUME_INDICATORS = [
  '合同', '协议', '条款', '甲方', '乙方', '法律责任',
  '产品说明书', '使用手册', '用户指南', '操作指南',
  '新闻稿', '活动策划', '营销方案', '商业计划书',
  '小说', '散文', '诗歌', '故事',
];

interface ValidationResult {
  isResume: boolean;
  confidence: number;
  matchedKeywords: string[];
  suggestions: string[];
  summary: string;
}

// 验证文本是否为简历内容
function validateResume(text: string): ValidationResult {
  const upperText = text.toUpperCase();
  const lines = text.split(/\n/).filter(line => line.trim());
  
  // 计算匹配的简历关键词数量
  let matchedKeywords: string[] = [];
  let keywordScore = 0;
  
  for (const keyword of RESUME_KEYWORDS) {
    // 支持大小写不敏感匹配
    const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    if (regex.test(text)) {
      matchedKeywords.push(keyword);
      keywordScore++;
    }
  }
  
  // 计算排除词数量（减少可信度）
  let nonResumeScore = 0;
  for (const indicator of NON_RESUME_INDICATORS) {
    const regex = new RegExp(indicator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    if (regex.test(text)) {
      nonResumeScore++;
    }
  }
  
  // 检查是否具有简历的典型格式特征
  const hasContactInfo = /1[3-9]\d{9}|手机|电话|邮箱|@/.test(text);
  const hasEducationSection = /学历|大学|学院|学校|毕业/.test(text);
  const hasWorkExperience = /工作|任职|职位|岗位|公司/.test(text);
  const hasSkillsSection = /技能|能力|熟练|掌握|精通/.test(text);
  
  // 统计格式特征得分
  let formatScore = 0;
  if (hasContactInfo) formatScore += 2;
  if (hasEducationSection) formatScore += 2;
  if (hasWorkExperience) formatScore += 3;
  if (hasSkillsSection) formatScore += 1;
  
  // 计算可信度 (0-100)
  const totalScore = keywordScore * 3 + formatScore * 5 - nonResumeScore * 10;
  const confidence = Math.max(0, Math.min(100, totalScore));
  
  // 判断是否为简历
  const isResume = confidence >= 40 && keywordScore >= 3;
  
  // 生成建议
  const suggestions: string[] = [];
  if (!hasContactInfo) suggestions.push('建议包含联系方式（手机、邮箱）');
  if (!hasEducationSection) suggestions.push('建议包含教育背景信息');
  if (!hasWorkExperience) suggestions.push('建议包含工作经历描述');
  if (!hasSkillsSection) suggestions.push('建议包含专业技能描述');
  
  // 生成摘要
  let summary = '';
  if (isResume) {
    const features: string[] = [];
    if (hasContactInfo) features.push('包含联系方式');
    if (hasEducationSection) features.push('包含教育背景');
    if (hasWorkExperience) features.push('包含工作经历');
    if (hasSkillsSection) features.push('包含技能描述');
    summary = `检测到简历特征（可信度${confidence}%），${features.join('、')}。`;
  } else if (confidence >= 25) {
    summary = `可能是简历但特征不明显（可信度${confidence}%），建议检查文件内容。`;
  } else {
    summary = `未检测到明显简历特征（可信度${confidence}%），可能不是简历文件。`;
  }
  
  return {
    isResume,
    confidence,
    matchedKeywords,
    suggestions,
    summary,
  };
}

// 验证简历API
router.post('/api/validate-resume', async (req, res) => {
  try {
    const { content, url } = req.body;
    
    // 如果没有直接传内容，需要先解析文档
    if (!content && url) {
      // 这里需要调用文档解析服务获取内容
      // 由于内容可能很大，我们做初步判断
      res.json({
        success: true,
        needParse: true,
        message: '需要先解析文档内容',
      });
      return;
    }
    
    if (!content) {
      res.status(400).json({ 
        success: false, 
        error: '内容不能为空' 
      });
      return;
    }
    
    // 验证简历内容
    const result = validateResume(content);
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Validate resume error:', error);
    res.status(500).json({ 
      success: false, 
      error: '验证简历失败' 
    });
  }
});

export default router;
