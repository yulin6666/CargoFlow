# 🚀 5 分钟快速启动指南

## 第一步：检查环境

```bash
# 检查 Node.js
node -v  # 需要 >= 18

# 检查 Docker（如果使用 Docker）
docker --version
```

## 第二步：安装依赖

```bash
# 根目录已安装，继续安装子项目
cd packages/database && npm install && cd ../..
cd apps/backend && npm install && cd ../..
cd apps/frontend && npm install && cd ../..

# 或使用自动化脚本（包含所有步骤）
./setup.sh
```

## 第三步：启动数据库

**选项 A - Docker（推荐）:**
```bash
npm run docker:postgres
```

**选项 B - 本地 PostgreSQL:**
```bash
# 如果已安装
createdb logistics_demo
```

## 第四步：初始化数据库

```bash
cd packages/database
npx prisma migrate dev --name init
npx prisma generate
cd ../..
```

## 第五步：启动 n8n

**选项 A - Docker（推荐）:**
```bash
npm run docker:n8n
```

**选项 B - 全局安装:**
```bash
npm install -g n8n
n8n start
```

访问 http://localhost:5678 确认 n8n 正常运行。

## 第六步：配置 n8n Workflow

1. 访问 http://localhost:5678
2. 创建新 Workflow: "Quote Generation - Stage 1"
3. 按照 `docs/n8n-workflows/README.md` 配置节点：
   - Webhook Trigger (path: `generate-quote`)
   - Function Node (mock 报价逻辑)
   - PostgreSQL Node (保存数据)
   - Function Node (整理返回数据)
   - Respond to Webhook
4. 保存并激活 workflow（右上角开关变绿）

**⚠️ 注意:** 即使跳过此步骤，系统也能运行，只是会显示黄色提示。

## 第七步：启动应用

**在两个终端中分别运行:**

```bash
# 终端 1 - 后端
cd apps/backend
npm run start:dev
# 等待显示: 🚀 Backend server is running on: http://localhost:3001

# 终端 2 - 前端
cd apps/frontend
npm run dev
# 等待显示: - Local: http://localhost:3000
```

**或使用一个命令（需要在根目录）:**
```bash
npm run dev
```

## 第八步：测试

### 浏览器测试
1. 访问 http://localhost:3000
2. 填写表单：
   - 起运地: `Chicago, IL`
   - 目的地: `Los Angeles, CA`
   - 重量: `500`
3. 点击"获取 AI 报价"
4. 查看结果

### API 测试
```bash
curl -X POST http://localhost:3001/api/quotes \
  -H "Content-Type: application/json" \
  -d '{
    "fromAddress": "Chicago, IL",
    "toAddress": "Los Angeles, CA",
    "weight": 500
  }'
```

### 数据库查看
```bash
cd packages/database
npx prisma studio
```

## 成功标准

### 最小成功（n8n 未配置）
- ✅ 前端表单可以提交
- ✅ 后端返回黄色提示
- ✅ 数据保存到数据库

### 完整成功（n8n 已配置）
- ✅ 前端表单可以提交
- ✅ 后端返回绿色报价结果
- ✅ 显示报价金额（例如 $750.00）
- ✅ 数据保存到数据库，包含 quote_amount

## 常见问题

### 端口被占用
```bash
# 查看端口占用
lsof -i :3000  # 前端
lsof -i :3001  # 后端
lsof -i :5432  # PostgreSQL
lsof -i :5678  # n8n

# 杀死进程
kill -9 <PID>
```

### 依赖安装失败
```bash
# 清理并重新安装
rm -rf node_modules package-lock.json
npm install
```

### 数据库连接失败
```bash
# 检查 PostgreSQL 状态
pg_isready

# Docker 查看日志
docker logs cargoflow-postgres

# 检查 .env.local 配置
cat .env.local
```

### n8n workflow 不工作
```bash
# 检查 n8n 状态
curl http://localhost:5678/healthz

# 直接测试 webhook
curl -X POST http://localhost:5678/webhook/generate-quote \
  -H "Content-Type: application/json" \
  -d '{"fromAddress":"Chicago, IL","toAddress":"LA","weight":500}'
```

## 停止服务

```bash
# 停止 Node.js 服务
Ctrl + C  # 在运行的终端中

# 停止 Docker 容器
npm run docker:stop

# 删除 Docker 容器（清理）
npm run docker:remove
```

## 下一步

完成阶段 1 后，查看：
- `物流自动化Demo设计文档.md` - 完整设计文档
- `docs/DEVELOPMENT.md` - 开发指南
- `PROJECT_STATUS.md` - 项目进度

开始阶段 2：接入真实 API（OpenAI + EasyPost + Stripe）

---

**预计完成时间:** 20-30 分钟

**遇到问题？** 查看 `docs/DEVELOPMENT.md` 的故障排查章节
