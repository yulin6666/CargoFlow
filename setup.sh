#!/bin/bash

# CargoFlow 快速启动脚本

set -e

echo "🚀 CargoFlow 启动脚本"
echo "===================="
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未找到 Node.js，请先安装 Node.js >= 18"
    exit 1
fi

echo "✅ Node.js 版本: $(node -v)"
echo ""

# 检查 PostgreSQL
echo "🔍 检查 PostgreSQL..."
if ! command -v psql &> /dev/null; then
    echo "⚠️  未找到 psql 命令"
    echo "   如果使用 Docker，请运行: npm run docker:postgres"
else
    echo "✅ PostgreSQL 已安装"
fi
echo ""

# 检查 n8n
echo "🔍 检查 n8n..."
if ! command -v n8n &> /dev/null; then
    echo "⚠️  未找到 n8n 命令"
    echo "   安装: npm install -g n8n"
    echo "   或使用 Docker: npm run docker:n8n"
else
    echo "✅ n8n 已安装"
fi
echo ""

# 检查环境变量文件
if [ ! -f ".env.local" ]; then
    echo "📝 创建 .env.local 文件..."
    cp .env.example .env.local
    echo "✅ 已创建 .env.local，请根据需要修改配置"
else
    echo "✅ .env.local 已存在"
fi
echo ""

# 安装依赖
echo "📦 安装依赖..."
if [ ! -d "node_modules" ]; then
    npm install
fi

if [ ! -d "packages/database/node_modules" ]; then
    cd packages/database && npm install && cd ../..
fi

if [ ! -d "apps/backend/node_modules" ]; then
    cd apps/backend && npm install && cd ../..
fi

if [ ! -d "apps/frontend/node_modules" ]; then
    cd apps/frontend && npm install && cd ../..
fi
echo "✅ 依赖安装完成"
echo ""

# 初始化数据库
echo "🗄️  初始化数据库..."
echo "   请确保 PostgreSQL 正在运行，并且数据库连接配置正确"
read -p "   按回车键继续数据库迁移..."

cd packages/database
npx prisma migrate dev --name init
npx prisma generate
cd ../..
echo "✅ 数据库初始化完成"
echo ""

# 完成
echo "✨ 设置完成！"
echo ""
echo "下一步："
echo "1. 启动 PostgreSQL（如果还未运行）"
echo "2. 启动 n8n: n8n start"
echo "3. 配置 n8n workflow（见 docs/n8n-workflows/README.md）"
echo "4. 启动后端: cd apps/backend && npm run start:dev"
echo "5. 启动前端: cd apps/frontend && npm run dev"
echo ""
echo "或使用快捷命令: npm run dev（同时启动前后端）"
echo ""
