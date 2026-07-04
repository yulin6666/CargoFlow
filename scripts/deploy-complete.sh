#!/bin/bash

# CargoFlow 完整版部署脚本
set -e

echo "🚀 CargoFlow 完整版部署开始..."

# 检查必要的环境变量
if [ -z "$SHIPPO_TEST_TOKEN" ]; then
  echo "❌ 错误: SHIPPO_TEST_TOKEN 环境变量未设置"
  echo "请先导出: export SHIPPO_TEST_TOKEN='shippo_test_xxxxx'"
  exit 1
fi

# 1. 数据库迁移
echo "📦 运行数据库迁移..."
cd packages/database
npx prisma migrate deploy
npx prisma generate
cd ../..

# 2. 安装依赖
echo "📦 安装后端依赖..."
cd apps/backend
npm install
cd ../..

echo "📦 安装前端依赖..."
cd apps/frontend
npm install
cd ../..

# 3. 检查 n8n
echo "🔍 检查 n8n 容器..."
if ! docker ps | grep -q "n8n"; then
  echo "⚠️  n8n 容器未运行，正在启动..."
  docker run -d --name n8n -p 5678:5678 -v ~/.n8n:/home/node/.n8n n8nio/n8n
  echo "⏳ 等待 n8n 启动 (30秒)..."
  sleep 30
else
  echo "✅ n8n 已运行"
fi

# 4. 检查 PostgreSQL
echo "🔍 检查 PostgreSQL 容器..."
if ! docker ps | grep -q "postgres.*5433"; then
  echo "⚠️  PostgreSQL 容器未在 5433 端口运行"
  echo "请手动启动 PostgreSQL 或检查现有容器"
fi

echo ""
echo "✅ 部署完成！"
echo ""
echo "📋 下一步操作："
echo "1. 访问 http://localhost:5678 导入 n8n workflows (docs/n8n-workflows/*.json)"
echo "2. 在 n8n 中配置 Shippo credential (Authorization: ShippoToken $SHIPPO_TEST_TOKEN)"
echo "3. 在 n8n 中配置 PostgreSQL credential"
echo "4. 启动后端: cd apps/backend && npm run start:dev"
echo "5. 启动前端: cd apps/frontend && npm run dev"
echo ""
echo "📖 完整文档: docs/COMPLETE_VERSION_README.md"
