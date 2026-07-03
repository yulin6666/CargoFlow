# CargoFlow - 物流自动化 Demo

基于 n8n + AI 的物流自动化演示系统，展示智能报价、状态追踪、自动化通知等核心能力。

## 技术栈

- **前端**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **后端**: NestJS + TypeScript
- **Workflow**: n8n (本地服务)
- **数据库**: PostgreSQL
- **ORM**: Prisma

## 项目结构

```
CargoFlow/
├── apps/
│   ├── frontend/          # Next.js 前端应用
│   └── backend/           # NestJS 后端服务
├── packages/
│   └── database/          # Prisma schema 和迁移
├── docs/                  # 文档
└── README.md
```

## 快速开始

### 前置要求

- Node.js >= 18
- PostgreSQL >= 15
- n8n (本地运行)

### 阶段 0: 环境准备

#### 1. 启动 PostgreSQL

**选项 A: 使用 Docker**
```bash
docker run --name cargoflow-postgres \
  -e POSTGRES_PASSWORD=demo123 \
  -e POSTGRES_DB=logistics_demo \
  -p 5432:5432 \
  -d postgres:15
```

**选项 B: 使用本地 PostgreSQL**
```bash
# macOS (Homebrew)
brew install postgresql@15
brew services start postgresql@15

# 创建数据库
createdb logistics_demo
```

#### 2. 启动 n8n

**选项 A: 使用 Docker**
```bash
docker run -d --name cargoflow-n8n \
  -p 5678:5678 \
  -e DB_TYPE=postgresdb \
  -e DB_POSTGRESDB_HOST=host.docker.internal \
  -e DB_POSTGRESDB_PORT=5432 \
  -e DB_POSTGRESDB_DATABASE=logistics_demo \
  -e DB_POSTGRESDB_USER=postgres \
  -e DB_POSTGRESDB_PASSWORD=demo123 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

**选项 B: 使用本地 n8n**
```bash
npm install -g n8n
n8n start
```

访问 http://localhost:5678 验证 n8n 是否正常运行。

#### 3. 安装项目依赖

```bash
# 安装根目录依赖
npm install

# 安装前端依赖
cd apps/frontend
npm install

# 安装后端依赖
cd apps/backend
npm install
```

#### 4. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env.local

# 编辑 .env.local，填入数据库连接信息
```

#### 5. 初始化数据库

```bash
cd packages/database
npx prisma migrate dev --name init
npx prisma generate
```

### 阶段 1: 启动服务

#### 启动后端（NestJS）

```bash
cd apps/backend
npm run start:dev
```

后端服务将在 http://localhost:3001 启动。

#### 启动前端（Next.js）

```bash
cd apps/frontend
npm run dev
```

前端应用将在 http://localhost:3000 启动。

### 阶段 1: 配置 n8n Workflow

1. 访问 http://localhost:5678
2. 创建新 Workflow: "Quote Generation"
3. 导入 workflow 配置（见 `docs/n8n-workflows/quote-generation.json`）
4. 激活 Workflow

## 功能验证

### 最小化版本（阶段 0 + 阶段 1）

- [ ] 访问 http://localhost:3000，看到订单创建表单
- [ ] 填写起运地、目的地、重量信息
- [ ] 点击"获取 AI 报价"按钮
- [ ] 后端调用 n8n webhook 成功
- [ ] 看到 mock 报价结果
- [ ] 数据库中有记录

**测试 API:**
```bash
curl -X POST http://localhost:3001/api/quotes \
  -H "Content-Type: application/json" \
  -d '{
    "fromAddress": "Chicago, IL",
    "toAddress": "Los Angeles, CA",
    "weight": 500
  }'
```

## 开发进度

- [x] 阶段 0: 环境准备
- [ ] 阶段 1: 最小可行版本
  - [ ] 数据库设计
  - [ ] NestJS API
  - [ ] n8n Workflow
  - [ ] Next.js UI
- [ ] 阶段 2: 核心功能集成（OpenAI + EasyPost + Stripe）
- [ ] 阶段 3: 完整集成（所有第三方服务）

## 常见问题

### PostgreSQL 连接失败

检查连接字符串格式：
```
postgresql://postgres:demo123@localhost:5432/logistics_demo
```

### n8n webhook 调用失败

确认 n8n 服务正在运行：
```bash
curl http://localhost:5678/healthz
```

### 端口冲突

如果端口被占用，可以修改：
- 前端: `apps/frontend/package.json` 中的 dev 脚本
- 后端: `apps/backend/src/main.ts` 中的端口配置

## 下一步

完成阶段 1 后，可以继续：
1. 接入 OpenAI API 实现真实 AI 报价
2. 接入 EasyPost API 创建真实物流单
3. 添加 Stripe 支付流程
4. 实现完整的状态机流转

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT
