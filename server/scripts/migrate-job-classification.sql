-- ====================================================
-- 岗位预分类表优化 - 提升筛选性能
-- ====================================================

-- 1. 创建岗位-行业关联表
CREATE TABLE IF NOT EXISTS job_industries (
  job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
  industry TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (job_id, industry)
);

-- 2. 创建岗位-城市关联表
CREATE TABLE IF NOT EXISTS job_cities (
  job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
  city TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (job_id, city)
);

-- 3. 创建岗位-公司类型关联表
CREATE TABLE IF NOT EXISTS job_company_types (
  job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
  company_type TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (job_id, company_type)
);

-- 4. 创建岗位-公司规模关联表
CREATE TABLE IF NOT EXISTS job_company_sizes (
  job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
  company_size TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (job_id, company_size)
);

-- 5. 创建岗位-关键词关联表（用于岗位名称和描述的关键词）
CREATE TABLE IF NOT EXISTS job_keywords (
  job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  keyword_type TEXT NOT NULL, -- 'title', 'description', 'skill'
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (job_id, keyword, keyword_type)
);

-- ====================================================
-- 创建索引以提升查询性能
-- ====================================================

-- 为关联表创建查询索引
CREATE INDEX IF NOT EXISTS idx_job_industries_industry ON job_industries(industry);
CREATE INDEX IF NOT EXISTS idx_job_cities_city ON job_cities(city);
CREATE INDEX IF NOT EXISTS idx_job_company_types_type ON job_company_types(company_type);
CREATE INDEX IF NOT EXISTS idx_job_company_sizes_size ON job_company_sizes(company_size);
CREATE INDEX IF NOT EXISTS idx_job_keywords_keyword ON job_keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_job_keywords_type ON job_keywords(keyword_type);

-- ====================================================
-- 创建视图用于快速查询
-- ====================================================

-- 创建岗位信息汇总视图
CREATE OR REPLACE VIEW job_summary AS
SELECT 
  j.id,
  j.job_title,
  j.company_name,
  j.salary_range,
  j.address,
  j.industry,
  j.company_type,
  j.company_size,
  j.job_description,
  -- 聚合相关信息
  ARRAY(SELECT industry FROM job_industries WHERE job_id = j.id) as industries,
  ARRAY(SELECT city FROM job_cities WHERE job_id = j.id) as cities,
  ARRAY(SELECT keyword FROM job_keywords WHERE job_id = j.id AND keyword_type = 'skill') as skills
FROM jobs j;

-- ====================================================
-- 完成提示
-- ====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ 岗位预分类表创建完成！';
  RAISE NOTICE '下一步：运行数据填充脚本 populate-job-classification.sql';
END $$;
