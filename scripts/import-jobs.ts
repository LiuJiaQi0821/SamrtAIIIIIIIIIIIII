import * as XLSX from 'xlsx';
import { getSupabaseClient } from '/workspace/projects/src/storage/database/supabase-client';

interface JobRecord {
  job_title: string;
  address: string;
  salary_range: string | null;
  company_name: string;
  industry: string | null;
  company_size: string | null;
  company_type: string | null;
  job_code: string;
  job_description: string | null;
  update_date: string | null;
  company_description: string | null;
  source_url: string | null;
}

// 读取Excel文件
const workbook = XLSX.readFile('/tmp/jobs.xls');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

console.log(`读取到 ${data.length} 条数据`);

// 转换数据格式
const jobs: JobRecord[] = data.map((row) => ({
  job_title: String(row['岗位名称'] || ''),
  address: String(row['地址'] || ''),
  salary_range: row['薪资范围'] ? String(row['薪资范围']) : null,
  company_name: String(row['公司名称'] || ''),
  industry: row['所属行业'] ? String(row['所属行业']) : null,
  company_size: row['公司规模'] ? String(row['公司规模']) : null,
  company_type: row['公司类型'] ? String(row['公司类型']) : null,
  job_code: String(row['岗位编码'] || ''),
  job_description: row['岗位详情'] ? String(row['岗位详情']) : null,
  update_date: row['更新日期'] ? String(row['更新日期']) : null,
  company_description: row['公司详情'] ? String(row['公司详情']) : null,
  source_url: row['岗位来源地址'] ? String(row['岗位来源地址']) : null,
}));

// 过滤无效数据
const validJobs = jobs.filter(job => job.job_title && job.company_name);
console.log(`有效数据: ${validJobs.length} 条`);

// 初始化 Supabase 客户端
const client = getSupabaseClient();

// 分批插入，每批1000条
const BATCH_SIZE = 1000;
let insertedCount = 0;
let errorCount = 0;

async function insertBatch(batch: JobRecord[], batchIndex: number): Promise<void> {
  console.log(`插入批次 ${batchIndex + 1}...`);
  const { error } = await client.from('jobs').insert(batch);
  if (error) {
    console.error(`批次 ${batchIndex + 1} 插入失败:`, error.message);
    errorCount += batch.length;
  } else {
    insertedCount += batch.length;
    console.log(`批次 ${batchIndex + 1} 完成，当前已插入 ${insertedCount} 条`);
  }
}

async function main() {
  const totalBatches = Math.ceil(validJobs.length / BATCH_SIZE);
  console.log(`总共 ${totalBatches} 个批次`);

  for (let i = 0; i < validJobs.length; i += BATCH_SIZE) {
    const batch = validJobs.slice(i, i + BATCH_SIZE);
    const batchIndex = Math.floor(i / BATCH_SIZE);
    await insertBatch(batch, batchIndex);
  }

  console.log(`\n导入完成！`);
  console.log(`成功: ${insertedCount} 条`);
  console.log(`失败: ${errorCount} 条`);
}

main().catch(console.error);
