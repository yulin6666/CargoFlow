# 项目修改清单

## ✅ 已完成的修改

### 1. 项目结构优化
- ✅ 移除 workspace 依赖，改用标准 npm 包引用
- ✅ 修改 `prisma.service.ts` 直接从 `@prisma/client` 导入
- ✅ 添加 `postinstall` hook 自动生成 Prisma client

### 2. Railway 部署配置
- ✅ 创建 `apps/backend/nixpacks.toml` - Backend 部署配置
- ✅ 创建 `apps/frontend/nixpacks.toml` - Frontend 部署配置
- ✅ 配置使用 Node.js 20
- ✅ 添加 Prisma 生成步骤

### 3. 脚本优化
- ✅ 更新根目录 `package.json` 脚本
- ✅ 使用 `npm --workspace` 替代 `cd` 命令
- ✅ 添加 `prisma:migrate` 生产环境迁移命令

### 4. 文档
- ✅ 创建 `DEPLOY.md` - Railway 部署指南
- ✅ 更新 `README.md` - 项目说明
- ✅ 创建 `.env.example` - 环境变量模板

## 🎯 Airtable 使用情况

**Airtable 在项目中的作用：**
- 仅在 n8n workflow 中使用（`purchase-label.json`）
- 用于同步客户联系信息和订单数据
- 作为简易 CRM 系统

**是否必需：**
- ❌ **非必需** - 核心功能（报价、购买运单）不依赖 Airtable
- ✅ **可选** - 仅用于 CRM 数据同步
- 如果不需要 CRM，可以跳过 Airtable 配置

## 📋 部署检查清单

### Railway 部署前
- [ ] 将代码推送到 GitHub
- [ ] 准备 Shippo Test Token
- [ ] 准备 Resend API Key
- [ ] （可选）准备 Airtable API Key 和 Base ID

### Railway 部署步骤
1. [ ] 创建 PostgreSQL 数据库
2. [ ] 部署 Backend 服务（root: `apps/backend`）
3. [ ] 部署 Frontend 服务（root: `apps/frontend`）
4. [ ] 部署 n8n 服务（Docker 镜像）
5. [ ] 配置所有环境变量
6. [ ] 生成公开域名
7. [ ] 运行数据库迁移
8. [ ] 导入 n8n workflows
9. [ ] 测试完整流程

### 本地开发
- [ ] 复制 `.env.example` 到各服务
- [ ] 启动 PostgreSQL: `npm run docker:postgres`
- [ ] 启动 n8n: `npm run docker:n8n`
- [ ] 生成 Prisma: `npm run prisma:generate`
- [ ] 推送数据库: `cd packages/database && npx prisma db push`
- [ ] 启动服务: `npm run dev`

## 🔧 关键环境变量

### Backend (必需)
```
DATABASE_URL=${{Postgres.DATABASE_URL}}
N8N_WEBHOOK_BASE=https://YOUR_N8N_DOMAIN
SHIPPO_TEST_TOKEN=shippo_test_xxx
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=onboarding@resend.dev
```

### Frontend (必需)
```
NEXT_PUBLIC_API_URL=https://YOUR_BACKEND_DOMAIN
```

### n8n (必需)
```
N8N_PORT=5678
N8N_PROTOCOL=https
WEBHOOK_URL=https://YOUR_N8N_DOMAIN
DB_TYPE=postgresdb
DB_POSTGRESDB_URL=${{Postgres.DATABASE_URL}}
```

### Airtable (可选)
```
AIRTABLE_API_KEY=patxxx
AIRTABLE_BASE_ID=appxxx
```

## 📦 项目依赖关系

```
Frontend (Next.js)
   ↓ HTTP
Backend (NestJS)
   ↓ webhook
n8n workflows
   ↓ API calls
Shippo API (shipping)
Resend API (email)
Airtable API (CRM, optional)
```

## ⚠️ 注意事项

1. **Prisma Client 生成**
   - 部署时自动通过 `postinstall` 生成
   - 本地开发需要手动运行 `npm run prisma:generate`

2. **数据库迁移**
   - Railway 首次部署后需要运行迁移
   - 使用 `prisma migrate deploy` 而非 `migrate dev`

3. **n8n Credentials**
   - PostgreSQL: 从 Railway 复制连接信息
   - Shippo: HTTP Header Auth
   - Airtable: Token API (可选)

4. **域名配置**
   - Backend 需要先部署并获取域名
   - n8n 需要先部署并获取域名
   - 然后更新 Backend 的 `N8N_WEBHOOK_BASE`
   - 最后更新 Frontend 的 `NEXT_PUBLIC_API_URL`

## 🎉 完成标志

部署成功后，你应该能：
- ✅ 访问 Frontend 并看到表单
- ✅ 提交地址后获取多个承运商报价
- ✅ 选择报价并购买运单
- ✅ 收到 Tracking Number
- ✅ 收到邮件通知（Resend）
- ✅ （可选）在 Airtable 中看到同步的数据
