import * as XLSX from 'xlsx';
import * as fs from 'fs';

// 读取Excel文件
const workbook = XLSX.readFile('/tmp/jobs.xls');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// 转换为JSON
const data = XLSX.utils.sheet_to_json(worksheet);

// 输出基本信息
console.log('总行数:', data.length);
console.log('列名:', Object.keys(data[0] as object));

// 输出前3条数据示例
console.log('\n前3条数据示例:');
data.slice(0, 3).forEach((row: Record<string, unknown>, i: number) => {
  console.log(`\n第${i + 1}条:`);
  Object.entries(row).forEach(([key, value]) => {
    console.log(`  ${key}: ${String(value).substring(0, 100)}`);
  });
});

// 检查每列的数据类型和空值情况
console.log('\n\n列数据分析:');
const columns = Object.keys(data[0] as object);
columns.forEach(col => {
  const values = data.map((row: Record<string, unknown>) => row[col]);
  const nonEmpty = values.filter(v => v !== null && v !== undefined && String(v).trim() !== '').length;
  console.log(`${col}: ${nonEmpty}/${data.length} 非空`);
});
