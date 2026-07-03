# CargoFlow 开发指南

## 目录结构

```
CargoFlow/
├── apps/
│   ├── frontend/              # Next.js 14 前端
│   │   ├── src/
│   │   │   └── app/
│   │   │       ├── page.tsx   # 主页面
│   │   │       └── layout.tsx
│   │   └── package.json
│   └── backend/               # NestJS 后端
│       ├── src/
│       │   ├── main.ts        # 入口文件
│       │   ├── app.module.ts
│       │   └── quotes/        # 报价模块
│       │       ├── quotes.controller.ts
│       │       ├── quotes.service.ts
│       │       └── quotes.module.ts
│       └── package.json
├── packages/
│   └── database/              # Prisma 数据库
│       ├── schema.prisma      # 数据库 schema
│       ├── index.ts
│       └── package.json
├── docs/
│   └── n8n-workflows/        # n8n workflow 配置
└── README.md
```

## 快速启动

### 1. 使用自动化脚本

```bash
# 一键安装和配置
npm run setup
```

### 2. 手动启动

**启动 PostgreSQL:**
```bash
# 选项 A: Docker
npm run docker:postgres

# 选项 B: 本地安装
brew install postgresql@15
brew services start postgresql@15
createdb logistics_demo
```

**启动 n8n:**
```bash
# 选项 A: Docker
npm run docker:n8n

# 选项 B: 全局安装
npm install -g n8n
n8n start
```

**初始化数据库:**
```bash
cd packages/database
npx prisma migrate dev --name init
npx prisma generate
```

**启动应用:**
```bash
# 同时启动前后端
npm run dev

# 或分别启动
npm run dev:backend  # http://localhost:3001
npm run dev:frontend # http://localhost:3000
```

## 阶段 1 验收清单

### 环境检查

- [ ] PostgreSQL 运行在 5432 端口
- [ ] n8n 运行在 5678 端口，可访问 http://localhost:5678
- [ ] 数据库 `logistics_demo` 已创建
- [ ] 表 `demo_shipments` 已存在

### 功能验证

**1. 后端 API 测试:**
```bash
curl -X POST http://localhost:3001/api/quotes \
  -H "Content-Type: application/json" \
  -d '{
    "fromAddress": "Chicago, IL",
    "toAddress": "Los Angeles, CA",
    "weight": 500
  }'
```

预期：返回 JSON，包含 `shipmentId` 或错误信息

**2. n8n Webhook 测试（配置后）:**
```bash
curl -X POST http://localhost:5678/webhook/generate-quote \
  -H "Content-Type: application/json" \
  -d '{
    "fromAddress": "Chicago, IL",
    "toAddress": "Los Angeles, CA",
    "weight": 500
  }'
```

预期：返回报价结果，包含 `quoteAmount`

**3. 前端界面测试:**
- [ ] 访问 http://localhost:3000
- [ ] 填写表单：起运地、目的地、重量
- [ ] 点击"获取 AI 报价"
- [ ] 看到结果（黄色提示或绿色报价）

**4. 数据库验证:**
```bash
# 查看数据库记录
cd packages/database
npx prisma studio
```
或使用 SQL：
```sql
SELECT * FROM demo_shipments ORDER BY created_at DESC LIMIT 5;
```

## 常见问题

### Q1: 前端显示黄色提示"n8n webhook not available"

**原因**: n8n workflow 还未配置或未激活

**解决**:
1. 访问 http://localhost:5678
2. 按照 `docs/n8n-workflows/README.md` 配置 workflow
3. 确保 workflow 已激活（右上角开关为绿色）

### Q2: 后端报错 "Connection refused" 连接数据库

**原因**: PostgreSQL 未启动或连接配置错误

**解决**:
```bash
# 检查 PostgreSQL 是否运行
pg_isready

# Docker 方式启动
npm run docker:postgres

# 检查 .env.local 中的 DATABASE_URL
```

### Q3: Prisma 迁移失败

**原因**: 数据库不存在或权限问题

**解决**:
```bash
# 手动创建数据库
createdb logistics_demo

# 重新运行迁移
cd packages/database
npx prisma migrate reset
npx prisma migrate dev --name init
```

### Q4: 端口冲突

**解决**:
- 前端（3000）: 修改 `apps/frontend/package.json` 的 dev 脚本
- 后端（3001）: 修改 `.env.local` 中的 `BACKEND_PORT`
- n8n（5678）: 启动时指定端口 `n8n start --port 5679`

## Docker 命令参考

```bash
# 启动 PostgreSQL
npm run docker:postgres

# 启动 n8n
npm run docker:n8n

# 停止所有容器
npm run docker:stop

# 删除容器
npm run docker:remove

# 查看容器日志
docker logs cargoflow-postgres
docker logs cargoflow-n8n

# 进入容器
docker exec -it cargoflow-postgres psql -U postgres -d logistics_demo
```

## 数据库管理

```bash
# 打开 Prisma Studio（可视化界面）
cd packages/database
npx prisma studio

# 查看迁移历史
npx prisma migrate status

# 重置数据库（清空所有数据）
npx prisma migrate reset

# 创建新迁移
npx prisma migrate dev --name migration_name

# 同步数据库 schema（不创建迁移）
npx prisma db push
```

## API 接口文档

### POST /api/quotes

创建新报价

**请求体:**
```json
{
  "fromAddress": "string",  // 起运地
  "toAddress": "string",    // 目的地
  "weight": number          // 重量（lbs）
}
```

**响应:**
```json
{
  "success": true,
  "shipmentId": 1,
  "quoteAmount": 750.00,
  "message": "报价生成成功！订单已创建。",
  "fromAddress": "Chicago, IL",
  "toAddress": "Los Angeles, CA",
  "weight": 500,
  "status": "draft",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### GET /api/quotes

获取所有订单

**响应:**
```json
[
  {
    "id": 1,
    "fromAddress": "Chicago, IL",
    "toAddress": "Los Angeles, CA",
    "weight": "500.00",
    "status": "draft",
    "quoteAmount": "750.00",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### GET /api/quotes/:id

获取单个订单详情

**响应:** 同上单个订单对象

## 下一步

完成阶段 1 后，可以继续：

### 阶段 2: 核心功能集成

1. **接入 OpenAI API**
   - 注册 OpenAI 账号，获取 API key
   - 修改 n8n workflow，替换 mock Function 为 OpenAI 节点
   - 实现真实的 AI 报价逻辑

2. **接入 EasyPost API**
   - 注册 EasyPost sandbox 账号
   - 在 n8n 中添加 EasyPost 节点
   - 创建真实的物流单

3. **添加 Stripe 支付**
   - 注册 Stripe test mode
   - 实现支付流程
   - 配置 webhook 回调

### 代码规范

- TypeScript 严格模式
- ESLint + Prettier（待配置）
- Git commit 规范：`type(scope): message`
  - feat: 新功能
  - fix: 修复
  - docs: 文档
  - refactor: 重构

### 贡献指南

1. Fork 项目
2. 创建特性分支: `git checkout -b feature/amazing-feature`
3. 提交更改: `git commit -m 'feat: add amazing feature'`
4. 推送分支: `git push origin feature/amazing-feature`
5. 提交 Pull Request

## 技术支持

遇到问题？
1. 查看本文档的"常见问题"章节
2. 查看 `docs/n8n-workflows/README.md`
3. 查看项目根目录 `README.md`
4. 提交 Issue
