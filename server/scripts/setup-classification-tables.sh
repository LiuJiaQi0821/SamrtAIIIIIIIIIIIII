#!/bin/bash
# 岗位预分类表设置脚本

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "========================================================"
echo "🚀 开始设置岗位预分类表"
echo "========================================================"

# 检查必需文件
if [ ! -f "$SCRIPT_DIR/migrate-job-classification.sql" ]; then
  echo "❌ 错误: 找不到 migrate-job-classification.sql 文件"
  exit 1
fi

if [ ! -f "$SCRIPT_DIR/populate-job-classification.ts" ]; then
  echo "❌ 错误: 找不到 populate-job-classification.ts 文件"
  exit 1
fi

echo ""
echo "📋 设置步骤："
echo "1️⃣  创建数据库表和索引"
echo "2️⃣  从现有 jobs 表提取数据并填充新表"
echo "3️⃣  验证设置结果"
echo ""

echo "⚠️  注意："
echo "  - 请确保已正确配置 Supabase 环境变量"
echo "  - 数据填充可能需要几分钟时间（取决于数据量）"
echo ""

read -p "❓ 是否继续执行设置？(y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ 用户取消了设置"
  exit 1
fi

echo ""
echo "========================================================"
echo "1️⃣  开始创建数据库表和索引..."
echo "========================================================"

# 运行 SQL 迁移脚本
# 注意：这里需要用户使用 Supabase SQL Editor 或 psql 执行
echo ""
echo "📝 请在 Supabase SQL Editor 中执行以下文件中的 SQL："
echo "   $SCRIPT_DIR/migrate-job-classification.sql"
echo ""
echo "或者，如果您有 psql 客户端，可以手动执行："
echo "   psql \$COZE_SUPABASE_URL -f $SCRIPT_DIR/migrate-job-classification.sql"
echo ""

read -p "❓ 已完成表创建？(y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "⏭️  跳过表创建，继续下一步"
else
  echo "✅ 表创建完成！"
fi

echo ""
echo "========================================================"
echo "2️⃣  开始数据填充..."
echo "========================================================"

cd "$SCRIPT_DIR/.."

# 检查是否有 package.json
if [ ! -f "package.json" ]; then
  echo "❌ 错误: 找不到 package.json"
  exit 1
fi

# 检查是否有 TypeScript 和 ts-node
if ! command -v npx &> /dev/null; then
  echo "❌ 错误: 找不到 npx，确保已安装 Node.js 和 pnpm"
  exit 1
fi

echo ""
echo "🚀 运行数据填充脚本..."
echo ""

# 使用 tsx 或 ts-node 运行 TypeScript 脚本
if npx tsx --version 2>/dev/null; then
  echo "使用 tsx 运行..."
  npx tsx "$SCRIPT_DIR/populate-job-classification.ts"
elif npx ts-node --version 2>/dev/null; then
  echo "使用 ts-node 运行..."
  npx ts-node "$SCRIPT_DIR/populate-job-classification.ts"
else
  echo "⚠️  未找到 tsx 或 ts-node，尝试使用 bun..."
  if command -v bun &> /dev/null; then
    bun "$SCRIPT_DIR/populate-job-classification.ts"
  else
    echo "❌ 错误: 请先安装 tsx 或 ts-node"
    echo "   pnpm add -D tsx"
    exit 1
  fi
fi

echo ""
echo "========================================================"
echo "✅ 数据填充完成！"
echo "========================================================"
echo ""
echo "📊 预分类表设置已完成！"
echo ""
echo "下一步："
echo "1️⃣  启动或重启您的应用服务器"
echo "2️⃣  渐进式筛选API将自动使用新的预分类表"
echo "3️⃣  筛选性能应该会显著提升！"
echo ""
echo "如需更多帮助，请查看："
echo "  - 迁移脚本: $SCRIPT_DIR/migrate-job-classification.sql"
echo "  - 填充脚本: $SCRIPT_DIR/populate-job-classification.ts"
echo ""
