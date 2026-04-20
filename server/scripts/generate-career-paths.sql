-- 生成垂直晋升路径SQL脚本
-- 为每个岗位创建晋升路径：初级 → 中级 → 高级 → 主管/负责人 → 总监/VP

-- ============================================
-- 技术类岗位晋升路径
-- ============================================

-- 前端开发晋升路径
INSERT INTO career_paths (
  from_job_id, to_job_id, path_type, difficulty, years_required,
  additional_skills, additional_certificates, promotion_conditions,
  salary_changes, is_recommended, path_description, created_at
) VALUES 
(80, 80, 'vertical', 'medium', 2, '深入前端技术栈、组件化开发', '前端高级工程师认证', '2年以上经验，技术能力突出', '+20%~30%', true, '前端开发从初级晋升到中级，需2年经验', NOW()),
(80, 80, 'vertical', 'medium', 3, '架构设计、性能优化', '前端架构师认证', '3年以上经验，能主导复杂项目', '+30%~50%', true, '前端开发从中级晋升到高级，需3年经验', NOW()),
(80, 95, 'management', 'hard', 3, '团队管理、项目管理', 'PMP认证', '3年以上经验，有管理经验', '+40%~60%', true, '前端开发从技术岗晋升管理岗（项目经理）', NOW());

-- Java开发晋升路径
INSERT INTO career_paths (
  from_job_id, to_job_id, path_type, difficulty, years_required,
  additional_skills, additional_certificates, promotion_conditions,
  salary_changes, is_recommended, path_description, created_at
) VALUES 
(81, 81, 'vertical', 'medium', 2, '深入Java技术栈、微服务', 'Java高级工程师认证', '2年以上经验，技术能力突出', '+20%~30%', true, 'Java从初级晋升到中级，需2年经验', NOW()),
(81, 81, 'vertical', 'medium', 3, '架构设计、分布式系统', 'Java架构师认证', '3年以上经验，能主导复杂项目', '+30%~50%', true, 'Java从中级晋升到高级，需3年经验', NOW()),
(81, 95, 'management', 'hard', 3, '团队管理、项目管理', 'PMP认证', '3年以上经验，有管理经验', '+40%~60%', true, 'Java从技术岗晋升管理岗（项目经理）', NOW());

-- Python开发晋升路径
INSERT INTO career_paths (
  from_job_id, to_job_id, path_type, difficulty, years_required,
  additional_skills, additional_certificates, promotion_conditions,
  salary_changes, is_recommended, path_description, created_at
) VALUES 
(82, 82, 'vertical', 'medium', 2, '深入Python技术栈、数据分析', 'Python高级工程师认证', '2年以上经验，技术能力突出', '+20%~30%', true, 'Python从初级晋升到中级，需2年经验', NOW()),
(82, 82, 'vertical', 'medium', 3, '架构设计、机器学习', 'Python架构师认证', '3年以上经验，能主导复杂项目', '+30%~50%', true, 'Python从中级晋升到高级，需3年经验', NOW()),
(82, 95, 'management', 'hard', 3, '团队管理、项目管理', 'PMP认证', '3年以上经验，有管理经验', '+40%~60%', true, 'Python从技术岗晋升管理岗（项目经理）', NOW());

-- C/C++开发晋升路径
INSERT INTO career_paths (
  from_job_id, to_job_id, path_type, difficulty, years_required,
  additional_skills, additional_certificates, promotion_conditions,
  salary_changes, is_recommended, path_description, created_at
) VALUES 
(83, 83, 'vertical', 'medium', 2, '深入C/C++技术栈、底层开发', 'C/C++高级工程师认证', '2年以上经验，技术能力突出', '+20%~30%', true, 'C/C++从初级晋升到中级，需2年经验', NOW()),
(83, 83, 'vertical', 'medium', 3, '架构设计、性能优化', 'C/C++架构师认证', '3年以上经验，能主导复杂项目', '+30%~50%', true, 'C/C++从中级晋升到高级，需3年经验', NOW()),
(83, 95, 'management', 'hard', 3, '团队管理、项目管理', 'PMP认证', '3年以上经验，有管理经验', '+40%~60%', true, 'C/C++从技术岗晋升管理岗（项目经理）', NOW());

-- 后端开发工程师晋升路径
INSERT INTO career_paths (
  from_job_id, to_job_id, path_type, difficulty, years_required,
  additional_skills, additional_certificates, promotion_conditions,
  salary_changes, is_recommended, path_description, created_at
) VALUES 
(84, 84, 'vertical', 'medium', 2, '深入后端技术栈、微服务', '后端高级工程师认证', '2年以上经验，技术能力突出', '+20%~30%', true, '后端开发从初级晋升到中级，需2年经验', NOW()),
(84, 84, 'vertical', 'medium', 3, '架构设计、分布式系统', '后端架构师认证', '3年以上经验，能主导复杂项目', '+30%~50%', true, '后端开发从中级晋升到高级，需3年经验', NOW()),
(84, 95, 'management', 'hard', 3, '团队管理、项目管理', 'PMP认证', '3年以上经验，有管理经验', '+40%~60%', true, '后端开发从技术岗晋升管理岗（项目经理）', NOW());

-- 测试工程师晋升路径
INSERT INTO career_paths (
  from_job_id, to_job_id, path_type, difficulty, years_required,
  additional_skills, additional_certificates, promotion_conditions,
  salary_changes, is_recommended, path_description, created_at
) VALUES 
(86, 86, 'vertical', 'medium', 2, '深入测试技术、自动化测试', '高级测试工程师认证', '2年以上经验，测试能力突出', '+20%~30%', true, '测试工程师从初级晋升到中级，需2年经验', NOW()),
(86, 86, 'vertical', 'medium', 3, '测试架构、质量体系', '测试架构师认证', '3年以上经验，能主导测试体系', '+30%~50%', true, '测试工程师从中级晋升到高级，需3年经验', NOW()),
(86, 120, 'management', 'hard', 3, '团队管理、质量管理', '质量管理认证', '3年以上经验，有管理经验', '+40%~60%', true, '测试工程师晋升质量管理岗', NOW());

-- 算法工程师晋升路径
INSERT INTO career_paths (
  from_job_id, to_job_id, path_type, difficulty, years_required,
  additional_skills, additional_certificates, promotion_conditions,
  salary_changes, is_recommended, path_description, created_at
) VALUES 
(92, 92, 'vertical', 'medium', 2, '深入机器学习、深度学习', '高级算法工程师认证', '2年以上经验，算法能力突出', '+20%~30%', true, '算法工程师从初级晋升到中级，需2年经验', NOW()),
(92, 92, 'vertical', 'medium', 3, '算法架构、研究创新', '算法专家认证', '3年以上经验，能主导算法创新', '+30%~50%', true, '算法工程师从中级晋升到高级，需3年经验', NOW()),
(92, 95, 'management', 'hard', 3, '团队管理、项目管理', 'PMP认证', '3年以上经验，有管理经验', '+40%~60%', true, '算法工程师从技术岗晋升管理岗（项目经理）', NOW());

-- 数据分析师晋升路径
INSERT INTO career_paths (
  from_job_id, to_job_id, path_type, difficulty, years_required,
  additional_skills, additional_certificates, promotion_conditions,
  salary_changes, is_recommended, path_description, created_at
) VALUES 
(93, 93, 'vertical', 'medium', 2, '深入数据分析、统计建模', '高级数据分析师认证', '2年以上经验，分析能力突出', '+20%~30%', true, '数据分析师从初级晋升到中级，需2年经验', NOW()),
(93, 93, 'vertical', 'medium', 3, '数据架构、商业洞察', '数据专家认证', '3年以上经验，能主导数据驱动', '+30%~50%', true, '数据分析师从中级晋升到高级，需3年经验', NOW()),
(93, 94, 'management', 'hard', 3, '产品思维、商业分析', '产品经理认证', '3年以上经验，有产品思维', '+40%~60%', true, '数据分析师晋升产品经理岗', NOW());

-- ============================================
-- 产品类岗位晋升路径
-- ============================================

-- 产品经理晋升路径
INSERT INTO career_paths (
  from_job_id, to_job_id, path_type, difficulty, years_required,
  additional_skills, additional_certificates, promotion_conditions,
  salary_changes, is_recommended, path_description, created_at
) VALUES 
(94, 94, 'vertical', 'medium', 2, '深入产品方法论、用户研究', '高级产品经理认证', '2年以上经验，产品能力突出', '+20%~30%', true, '产品经理从初级晋升到中级，需2年经验', NOW()),
(94, 94, 'vertical', 'medium', 3, '产品战略、商业思维', '产品总监认证', '3年以上经验，能主导产品战略', '+30%~50%', true, '产品经理从中级晋升到高级，需3年经验', NOW()),
(94, 149, 'management', 'hard', 5, '战略思维、团队管理', 'MBA/EMBA', '5年以上经验，有高管经验', '+50%~100%', true, '产品经理晋升高管岗（总助/CEO助理）', NOW());

-- ============================================
-- 管理类岗位晋升路径
-- ============================================

-- 项目经理晋升路径
INSERT INTO career_paths (
  from_job_id, to_job_id, path_type, difficulty, years_required,
  additional_skills, additional_certificates, promotion_conditions,
  salary_changes, is_recommended, path_description, created_at
) VALUES 
(95, 95, 'vertical', 'medium', 2, '深入项目管理、风险管理', 'PMP高级认证', '2年以上经验，项目管理能力突出', '+20%~30%', true, '项目经理从初级晋升到中级，需2年经验', NOW()),
(95, 95, 'vertical', 'medium', 3, '项目组合管理、战略规划', 'PgMP认证', '3年以上经验，能主导大型项目', '+30%~50%', true, '项目经理从中级晋升到高级，需3年经验', NOW()),
(95, 149, 'management', 'hard', 5, '战略思维、高管能力', 'MBA/EMBA', '5年以上经验，有高管经验', '+50%~100%', true, '项目经理晋升高管岗（总助/CEO助理）', NOW());

-- ============================================
-- 运营类岗位晋升路径
-- ============================================

-- 游戏运营晋升路径
INSERT INTO career_paths (
  from_job_id, to_job_id, path_type, difficulty, years_required,
  additional_skills, additional_certificates, promotion_conditions,
  salary_changes, is_recommended, path_description, created_at
) VALUES 
(97, 97, 'vertical', 'medium', 2, '深入游戏运营、数据分析', '高级运营认证', '2年以上经验，运营能力突出', '+20%~30%', true, '游戏运营从初级晋升到中级，需2年经验', NOW()),
(97, 97, 'vertical', 'medium', 3, '游戏产品、用户增长', '运营总监认证', '3年以上经验，能主导运营策略', '+30%~50%', true, '游戏运营从中级晋升到高级，需3年经验', NOW()),
(97, 94, 'management', 'hard', 3, '产品思维、游戏理解', '产品经理认证', '3年以上经验，有产品思维', '+40%~60%', true, '游戏运营晋升游戏产品经理岗', NOW());

-- 新媒体运营晋升路径
INSERT INTO career_paths (
  from_job_id, to_job_id, path_type, difficulty, years_required,
  additional_skills, additional_certificates, promotion_conditions,
  salary_changes, is_recommended, path_description, created_at
) VALUES 
(101, 101, 'vertical', 'medium', 2, '内容创作、传播策略', '高级新媒体运营认证', '2年以上经验，内容能力突出', '+20%~30%', true, '新媒体运营从初级晋升到中级，需2年经验', NOW()),
(101, 101, 'vertical', 'medium', 3, '内容战略、品牌建设', '内容总监认证', '3年以上经验，能主导内容战略', '+30%~50%', true, '新媒体运营从中级晋升到高级，需3年经验', NOW());

-- ============================================
-- 设计类岗位晋升路径
-- ============================================

-- UI设计晋升路径
INSERT INTO career_paths (
  from_job_id, to_job_id, path_type, difficulty, years_required,
  additional_skills, additional_certificates, promotion_conditions,
  salary_changes, is_recommended, path_description, created_at
) VALUES 
(99, 99, 'vertical', 'medium', 2, '深入UI设计、设计系统', '高级UI设计师认证', '2年以上经验，设计能力突出', '+20%~30%', true, 'UI设计从初级晋升到中级，需2年经验', NOW()),
(99, 99, 'vertical', 'medium', 3, '设计管理、设计策略', '设计总监认证', '3年以上经验，能主导设计体系', '+30%~50%', true, 'UI设计从中级晋升到高级，需3年经验', NOW()),
(99, 120, 'management', 'hard', 3, '团队管理、设计管理', '设计管理认证', '3年以上经验，有管理经验', '+40%~60%', true, 'UI设计晋升设计管理岗', NOW());

-- UI/UX设计师晋升路径
INSERT INTO career_paths (
  from_job_id, to_job_id, path_type, difficulty, years_required,
  additional_skills, additional_certificates, promotion_conditions,
  salary_changes, is_recommended, path_description, created_at
) VALUES 
(100, 100, 'vertical', 'medium', 2, '深入UX研究、交互设计', '高级UX设计师认证', '2年以上经验，UX能力突出', '+20%~30%', true, 'UI/UX设计师从初级晋升到中级，需2年经验', NOW()),
(100, 100, 'vertical', 'medium', 3, '设计策略、用户研究', 'UX总监认证', '3年以上经验，能主导UX体系', '+30%~50%', true, 'UI/UX设计师从中级晋升到高级，需3年经验', NOW()),
(100, 94, 'management', 'hard', 3, '产品思维、用户洞察', '产品经理认证', '3年以上经验，有产品思维', '+40%~60%', true, 'UI/UX设计师晋升产品经理岗', NOW());

-- ============================================
-- 其他常见岗位晋升路径（批量插入）
-- ============================================

-- 运维工程师晋升路径
INSERT INTO career_paths (from_job_id, to_job_id, path_type, difficulty, years_required, additional_skills, additional_certificates, promotion_conditions, salary_changes, is_recommended, path_description, created_at) VALUES
(90, 90, 'vertical', 'medium', 2, '深入运维技术、自动化', '高级运维工程师认证', '2年以上经验，运维能力突出', '+20%~30%', true, '运维工程师从初级晋升到中级，需2年经验', NOW()),
(90, 90, 'vertical', 'medium', 3, '运维架构、DevOps', '运维架构师认证', '3年以上经验，能主导运维架构', '+30%~50%', true, '运维工程师从中级晋升到高级，需3年经验', NOW()),
(90, 95, 'management', 'hard', 3, '团队管理、项目管理', 'PMP认证', '3年以上经验，有管理经验', '+40%~60%', true, '运维工程师晋升管理岗', NOW());

-- 销售代表晋升路径
INSERT INTO career_paths (from_job_id, to_job_id, path_type, difficulty, years_required, additional_skills, additional_certificates, promotion_conditions, salary_changes, is_recommended, path_description, created_at) VALUES
(106, 106, 'vertical', 'medium', 2, '深入销售技巧、客户关系', '高级销售认证', '2年以上经验，销售能力突出', '+20%~30%', true, '销售代表从初级晋升到中级，需2年经验', NOW()),
(106, 107, 'vertical', 'medium', 3, '销售管理、大客户', '销售经理认证', '3年以上经验，能主导销售团队', '+30%~50%', true, '销售代表晋升BD经理', NOW());

-- 财务专员晋升路径
INSERT INTO career_paths (from_job_id, to_job_id, path_type, difficulty, years_required, additional_skills, additional_certificates, promotion_conditions, salary_changes, is_recommended, path_description, created_at) VALUES
(115, 115, 'vertical', 'medium', 2, '深入财务知识、报表分析', '中级会计师', '2年以上经验，财务能力突出', '+20%~30%', true, '财务专员从初级晋升到中级，需2年经验', NOW()),
(115, 115, 'vertical', 'medium', 3, '财务管理、预算分析', '高级会计师/CPA', '3年以上经验，能主导财务管理', '+30%~50%', true, '财务专员从中级晋升到高级，需3年经验', NOW());

-- 人力资源专员晋升路径
INSERT INTO career_paths (from_job_id, to_job_id, path_type, difficulty, years_required, additional_skills, additional_certificates, promotion_conditions, salary_changes, is_recommended, path_description, created_at) VALUES
(117, 117, 'vertical', 'medium', 2, '深入人力资源、招聘技巧', '人力资源管理师二级', '2年以上经验，HR能力突出', '+20%~30%', true, '人力资源专员从初级晋升到中级，需2年经验', NOW()),
(117, 117, 'vertical', 'medium', 3, 'HR战略、组织发展', '人力资源管理师一级', '3年以上经验，能主导HR战略', '+30%~50%', true, '人力资源专员从中级晋升到高级，需3年经验', NOW());

-- 验证生成的路径数量
SELECT COUNT(*) as generated_paths FROM career_paths;
