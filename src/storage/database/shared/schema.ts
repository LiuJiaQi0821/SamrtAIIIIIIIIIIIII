import { pgTable, serial, timestamp, varchar, text, integer, index, boolean } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// 健康检查表（系统表，禁止修改）
export const healthCheck = pgTable("health_check", {
  id: serial().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 岗位数据表
export const jobs = pgTable(
  "jobs",
  {
    id: serial().primaryKey(),
    job_title: varchar("job_title", { length: 255 }).notNull(),
    address: varchar("address", { length: 255 }).notNull(),
    salary_range: varchar("salary_range", { length: 100 }),
    company_name: varchar("company_name", { length: 255 }).notNull(),
    industry: varchar("industry", { length: 255 }),
    company_size: varchar("company_size", { length: 100 }),
    company_type: varchar("company_type", { length: 100 }),
    job_code: varchar("job_code", { length: 100 }),
    job_description: text("job_description"),
    update_date: varchar("update_date", { length: 50 }),
    company_description: text("company_description"),
    source_url: varchar("source_url", { length: 500 }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("jobs_job_title_idx").on(table.job_title),
    index("jobs_address_idx").on(table.address),
    index("jobs_company_name_idx").on(table.company_name),
    index("jobs_industry_idx").on(table.industry),
    index("jobs_job_code_idx").on(table.job_code),
  ]
);

// 岗位画像表
export const jobProfiles = pgTable(
  "job_profiles",
  {
    id: serial().primaryKey(),
    profile_name: varchar("profile_name", { length: 100 }).notNull(),
    category: varchar("category", { length: 50 }).notNull(),
    description: text("description"),
    // 专业技能
    professional_skills: text("professional_skills"),
    // 证书要求
    certificate_requirements: text("certificate_requirements"),
    // 创新能力 (1-5分)
    innovation_ability: integer("innovation_ability").default(3),
    // 学习能力 (1-5分)
    learning_ability: integer("learning_ability").default(3),
    // 抗压能力 (1-5分)
    pressure_resistance: integer("pressure_resistance").default(3),
    // 沟通能力 (1-5分)
    communication_ability: integer("communication_ability").default(3),
    // 实习经验要求
    internship_requirement: text("internship_requirement"),
    // 学历要求
    education_requirement: varchar("education_requirement", { length: 100 }),
    // 工作经验要求
    work_experience_requirement: varchar("work_experience_requirement", { length: 100 }),
    // 薪资范围
    salary_range: varchar("salary_range", { length: 100 }),
    // 就业方向
    career_direction: text("career_direction"),
    // 核心素质要求
    core_qualifications: text("core_qualifications"),
    // 工具/软件要求
    tools_requirement: text("tools_requirement"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("job_profiles_category_idx").on(table.category),
    index("job_profiles_name_idx").on(table.profile_name),
  ]
);

// 岗位晋升路径表
export const careerPaths = pgTable(
  "career_paths",
  {
    id: serial().primaryKey(),
    // 当前岗位ID
    from_job_id: integer("from_job_id").notNull().references(() => jobProfiles.id),
    // 目标岗位ID
    to_job_id: integer("to_job_id").notNull().references(() => jobProfiles.id),
    // 路径类型：vertical（垂直晋升）、horizontal（横向转岗）
    path_type: varchar("path_type", { length: 20 }).notNull(),
    // 晋升难度：easy（容易）、medium（中等）、hard（困难）
    difficulty: varchar("difficulty", { length: 20 }).default('medium'),
    // 晋升周期（年）
    years_required: integer("years_required").default(3),
    // 所需补充技能
    additional_skills: text("additional_skills"),
    // 所需补充证书
    additional_certificates: text("additional_certificates"),
    // 晋升条件说明
    promotion_conditions: text("promotion_conditions"),
    // 薪资变化说明
    salary_changes: text("salary_changes"),
    // 路径描述
    path_description: text("path_description"),
    // 是否推荐
    is_recommended: boolean("is_recommended").default(false),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("career_paths_from_job_idx").on(table.from_job_id),
    index("career_paths_to_job_idx").on(table.to_job_id),
  ]
);

// 换岗路径图谱表
export const jobTransferGraph = pgTable(
  "job_transfer_graph",
  {
    id: serial().primaryKey(),
    from_job_id: integer("from_job_id").notNull().references(() => jobProfiles.id),
    to_job_id: integer("to_job_id").notNull().references(() => jobProfiles.id),
    path_type: varchar("path_type", { length: 20 }).notNull(),
    intermediate_job_id: integer("intermediate_job_id").references(() => jobProfiles.id),
    transfer_difficulty: varchar("transfer_difficulty", { length: 20 }).default('medium'),
    steps_required: integer("steps_required").default(1),
    additional_skills: text("additional_skills"),
    additional_certificates: text("additional_certificates"),
    transfer_conditions: text("transfer_conditions"),
    salary_impact: text("salary_impact"),
    transfer_tips: text("transfer_tips"),
    blood_relationship: varchar("blood_relationship", { length: 50 }),
    is_recommended: boolean("is_recommended").default(false),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("job_transfer_graph_from_job_idx").on(table.from_job_id),
    index("job_transfer_graph_to_job_idx").on(table.to_job_id),
    index("job_transfer_graph_recommended_idx").on(table.is_recommended),
  ]
);
