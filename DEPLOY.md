# Railway 部署指南（简化版）

## 🚀 快速部署

### 前置准备

确保你有以下 API Keys：
- Shippo Test Token: `shippo_test_xxx`
- Resend API Key: `re_xxx`
- Airtable API Key: `patxxx`
- Airtable Base ID: `appxxx`

### 第一步：部署到 Railway

1. **登录 Railway**
   - 访问 https://railway.app
   - 用 GitHub 账号登录

2. **创建新项目**
   - 点击 "New Project"
   - 选择 "Deploy from GitHub repo"
   - 选择你的 `CargoFlow` 仓库

3. **添加 PostgreSQL 数据库**
   - 在项目中点击 "+ New"
   - 选择 "Database" → "Add PostgreSQL"
   - 等待部署完成

### 第二步：部署 Backend

1. **创建 Backend 服务**
   - 点击 "+ New" → "GitHub Repo" → 选择你的仓库
   - 服务名称改为 `backend`

2. **配置 Backend**
   - 点击 Backend 服务 → "Settings"
   - **Root Directory**: `apps/backend`
   - **Build Command**: 留空（使用 nixpacks.toml）
   - **Start Command**: 留空（使用 nixpacks.toml）

3. **设置环境变量**

   点击 "Variables" 标签，添加：
   ```
   NODE_ENV=production
   PORT=3001
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   N8N_WEBHOOK_BASE=https://YOUR_N8N_DOMAIN
   SHIPPO_TEST_TOKEN=shippo_test_YOUR_KEY
   RESEND_API_KEY=re_YOUR_KEY
   RESEND_FROM_EMAIL=onboarding@resend.dev
   AIRTABLE_API_KEY=patYOUR_KEY
   AIRTABLE_BASE_ID=appYOUR_BASE_ID
   ```

4. **生成公开域名**
   - Settings → Networking → "Generate Domain"
   - 复制域名（如 `backend-production-xxxx.up.railway.app`）

### 第三步：部署 Frontend

1. **创建 Frontend 服务**
   - 点击 "+ New" → "GitHub Repo" → 选择你的仓库
   - 服务名称改为 `frontend`

2. **配置 Frontend**
   - Root Directory: `apps/frontend`
   - Build Command: 留空
   - Start Command: 留空

3. **设置环境变量**
   ```
   NODE_ENV=production
   NEXT_PUBLIC_API_URL=https://YOUR_BACKEND_DOMAIN
   ```

4. **生成公开域名**
   - Settings → Networking → "Generate Domain"

### 第四步：部署 n8n

1. **创建 n8n 服务**
   - 点击 "+ New" → "Empty Service"
   - 服务名称改为 `n8n`

2. **配置 Docker 镜像**
   - Settings → Deploy → "Docker Image"
   - Image: `n8nio/n8n:latest`

3. **设置环境变量**
   ```
   N8N_PORT=5678
   N8N_PROTOCOL=https
   WEBHOOK_URL=https://YOUR_N8N_DOMAIN
   N8N_EDITOR_BASE_URL=https://YOUR_N8N_DOMAIN
   DB_TYPE=postgresdb
   DB_POSTGRESDB_URL=${{Postgres.DATABASE_URL}}
   EXECUTIONS_DATA_SAVE_ON_SUCCESS=all
   ```

4. **生成公开域名**
   - Settings → Networking → "Generate Domain"

5. **更新 Backend 的 N8N_WEBHOOK_BASE**
   - 回到 Backend 服务
   - 修改 `N8N_WEBHOOK_BASE` 为 n8n 的实际域名

### 第五步：初始化数据库

1. **运行数据库迁移**
   ```bash
   # 本地运行（需要先设置 DATABASE_URL）
   npm run prisma:migrate
   ```

   或在 Railway 中：
   - Backend 服务 → "Settings" → "Deploy"
   - 在 "Custom Build Command" 中临时添加：
     ```
     npm run prisma:migrate && npm run build:backend
     ```
   - 点击 "Redeploy"
   - 部署成功后删除迁移命令

### 第六步：配置 n8n Workflows

1. **访问 n8n**
   - 打开 n8n 的域名
   - 首次访问会要求设置管理员账号

2. **添加 Credentials**
   - 点击右上角 "Credentials"
   - 添加 "PostgreSQL":
     - 从 Railway PostgreSQL 服务复制连接信息
   - 添加 "Airtable Token API":
     - Access Token: 你的 Airtable key
   - 添加 "HTTP Header Auth" (Shippo):
     - Name: `Authorization`
     - Value: `ShippoToken YOUR_SHIPPO_KEY`

3. **导入 Workflows**
   - 点击 "Import from File"
   - 导入以下文件（从项目的 `docs/n8n-workflows/` 目录）：
     1. `quote-generation-stage1.json`
     2. `purchase-label.json`
     3. `payment-processing.json`
     4. `shippo-tracking-webhook.json`

4. **配置每个 Workflow**
   - 打开每个 workflow
   - 点击 PostgreSQL 节点 → 选择你的 PostgreSQL credential
   - 点击 Airtable 节点 → 选择你的 Airtable credential 和 Base/Table
   - 点击右上角激活 workflow（绿色开关）

### 第七步：测试

1. **访问 Frontend**
   ```
   https://YOUR_FRONTEND_DOMAIN
   ```

2. **创建报价**
   - 填写表单
   - 点击 "Get Shippo Live Quote"
   - 应该看到多个承运商报价

3. **购买运单**
   - 选择一个报价
   - 点击 "Confirm Purchase"
   - 应该显示 Tracking Number

4. **检查 Airtable**
   - 打开你的 Airtable Base
   - 应该能看到新的 Contact 和 Order 记录

## ✅ 完成！

你的应用现在已经上线：
- 🌐 Frontend: `https://YOUR_FRONTEND_DOMAIN`
- 🔧 Backend: `https://YOUR_BACKEND_DOMAIN`
- ⚙️ n8n: `https://YOUR_N8N_DOMAIN`

## 🔧 常见问题

### Backend 启动失败
- 检查 DATABASE_URL 是否正确
- 确保运行了数据库迁移
- 查看 Railway Logs

### n8n Workflow 不工作
- 确保 workflow 已激活（绿色开关）
- 检查 credentials 是否配置正确
- 查看 n8n Executions 标签的错误信息

### Frontend 无法连接 Backend
- 确保 NEXT_PUBLIC_API_URL 正确
- 检查 Backend 是否成功部署
- 测试 Backend health: `https://YOUR_BACKEND_DOMAIN/health`

## 📝 本地开发

```bash
# 安装依赖
npm install

# 启动本地数据库和 n8n
npm run docker:postgres
npm run docker:n8n

# 生成 Prisma client
npm run prisma:generate

# 运行迁移
npm run prisma:migrate

# 启动开发服务器
npm run dev
```

访问：
- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- n8n: http://localhost:5678

## 💰 预估成本

Railway 每月约 $8-12（含 $5 免费额度）

## 📞 支持

遇到问题？检查：
1. Railway Dashboard → 服务 → Logs
2. n8n → Executions 标签
3. 浏览器开发者工具 → Console/Network
