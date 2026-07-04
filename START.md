# ✅ 阶段 1 完成 - 启动指南

## 当前状态

✅ 所有依赖已安装
✅ 数据库已配置（使用现有 PostgreSQL 容器）
✅ 数据库迁移已完成
✅ 后端 API 测试通过
✅ 数据持久化验证成功

## 立即启动

### 1. 启动后端（终端 1）

```bash
cd apps/backend
npm run start:dev
```

等待看到：
```
🚀 Backend server is running on: http://localhost:3001
```

### 2. 启动前端（终端 2）

```bash
cd apps/frontend
npm run dev
```

等待看到：
```
- Local: http://localhost:3000
```

### 3. 测试应用

**浏览器访问:** http://localhost:3000

填写表单：
- 起运地: `Chicago, IL`
- 目的地: `Los Angeles, CA`
- 重量: `500`

点击"获取 AI 报价"，你会看到：
- ⚠️ 黄色提示（因为 n8n 还未配置）
- ✅ 订单 ID（数据已保存）
- ✅ 提示信息：需要配置 n8n workflow

---

## 下一步：配置 n8n（可选）

### 启动 n8n

```bash
# 选项 A: Docker
npm run docker:n8n

# 选项 B: 本地安装
npm install -g n8n
n8n start
```

### 导入 Workflow（3 分钟）

1. 访问 http://localhost:5678
2. 点击右上角 **"+"** → **"Import from File"**
3. 选择文件：`docs/n8n-workflows/quote-generation-stage1.json`
4. 配置 PostgreSQL 连接：
   - Host: `localhost` (Docker 中用 `host.docker.internal`)
   - Database: `logistics_demo`
   - User: `root`
   - Password: `password`
   - Port: `5433`
5. 激活 workflow（右上角开关变绿）
6. 重新测试前端，会看到绿色成功提示！

**详细说明:** 查看 `docs/n8n-workflows/IMPORT.md`

---

## 验证命令

### 测试后端 API
```bash
curl -X POST http://localhost:3001/api/quotes \
  -H "Content-Type: application/json" \
  -d '{
    "fromAddress": "Chicago, IL",
    "toAddress": "Los Angeles, CA",
    "weight": 500
  }'
```

### 查看数据库记录
```bash
docker exec self-hosted-ai-starter-kit-postgres-1 \
  psql -U root -d logistics_demo -c "SELECT * FROM demo_shipments;"
```

### 使用 Prisma Studio（可视化）
```bash
cd packages/database
npx prisma studio
# 访问 http://localhost:5555
```

---

## 数据库配置

当前使用：
- **容器**: `self-hosted-ai-starter-kit-postgres-1`
- **端口**: 5433
- **用户**: root
- **密码**: password
- **数据库**: logistics_demo

配置文件：
- `.env.local` (根目录)
- `packages/database/.env`

---

## 故障排查

### 后端启动失败

**检查数据库连接:**
```bash
docker ps | grep postgres  # 确认容器运行
```

**检查环境变量:**
```bash
cat .env.local
cat packages/database/.env
```

### 前端无法连接后端

**确认后端运行:**
```bash
curl http://localhost:3001/api/quotes
```

**检查 CORS 配置:**
前端应该在 `localhost:3000`，后端在 `localhost:3001`

### Prisma 错误

**重新生成 client:**
```bash
cd packages/database
npx prisma generate
```

---

## 🎉 恭喜！阶段 1 完成

你现在有一个完全可用的最小化版本：
- ✅ 前端表单可提交
- ✅ 后端 API 正常工作
- ✅ 数据持久化到数据库
- ✅ 完整的错误处理和降级

**预计完成时间:** 你只需要 5 分钟启动服务！

**下一步:** 查看 `物流自动化Demo设计文档.md` 的阶段 2，接入真实 API。
