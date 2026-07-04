# n8n Workflow 快速导入指南

## 🚀 一键导入（推荐）

### 步骤 1: 访问 n8n

访问 http://localhost:5678

### 步骤 2: 导入 Workflow

1. 点击右上角的 **"+"** 按钮
2. 选择 **"Import from File"** 或 **"Import from URL"**
3. 选择文件：`docs/n8n-workflows/quote-generation-stage1.json`
4. 点击 **"Import"**

### 步骤 3: 配置数据库连接

导入后，你会看到 PostgreSQL 节点显示红色警告。需要配置数据库连接：

1. 点击 **PostgreSQL** 节点
2. 点击 **"Credential to connect with"** 下拉框
3. 点击 **"Create New Credential"**
4. 填写连接信息：

```
Name: CargoFlow PostgreSQL
Host: localhost (如果 n8n 在 Docker 中，使用 host.docker.internal)
Database: logistics_demo
User: root
Password: password
Port: 5433
SSL: Disable
```

5. 点击 **"Save"** 保存凭证
6. 点击 **"Save"** 保存 workflow

### 步骤 4: 激活 Workflow

1. 点击右上角的开关，激活 workflow（变为绿色）
2. 复制 Webhook URL（应该是 `http://localhost:5678/webhook/generate-quote`）

### 步骤 5: 测试

**直接测试 n8n webhook:**
```bash
curl -X POST http://localhost:5678/webhook/generate-quote \
  -H "Content-Type: application/json" \
  -d '{
    "fromAddress": "Chicago, IL",
    "toAddress": "Los Angeles, CA",
    "weight": 500
  }'
```

**通过前端测试:**
1. 访问 http://localhost:3000
2. 填写表单提交
3. 应该看到绿色成功提示和真实报价金额（$750.00）

---

## 📋 Workflow 说明

这个 workflow 包含 5 个节点：

### 1. Webhook Trigger
- 路径: `/webhook/generate-quote`
- 方法: POST
- 接收来自 NestJS 的报价请求

### 2. Generate Mock Quote (Function)
- 计算报价：重量 × $1.5/磅
- 构造数据对象

### 3. PostgreSQL
- 插入数据到 `demo_shipments` 表
- 返回插入的记录（包含自动生成的 ID）

### 4. Format Response (Function)
- 整理数据格式
- 将数据库字段转换为 API 响应格式

### 5. Respond to Webhook
- 返回 JSON 响应给 NestJS

---

## 🔧 故障排查

### 问题 1: PostgreSQL 连接失败

**症状**: 节点显示红色，提示连接错误

**解决方案:**

**如果 n8n 在 Docker 中运行:**
- Host 改为 `host.docker.internal`

**如果 n8n 本地运行:**
- Host 使用 `localhost`

**验证数据库:**
```bash
docker ps | grep postgres  # 确认容器运行
docker exec self-hosted-ai-starter-kit-postgres-1 \
  psql -U root -d logistics_demo -c "\dt"
```

### 问题 2: Webhook 404 错误

**症状**: 测试时返回 404 Not Found

**解决方案:**
1. 确认 workflow 已激活（右上角开关为绿色）
2. 检查 webhook 路径是否为 `generate-quote`
3. 重新启动 n8n

### 问题 3: 导入后节点位置混乱

**解决方案:**
- 手动拖动节点调整位置
- 或删除后重新导入

---

## 🎨 手动配置（备选方案）

如果导入失败，可以手动创建 workflow，详见本目录的 `README.md` 文件中的"手动配置步骤"章节。

---

## 📝 下一步（阶段 2）

完成阶段 1 后，可以升级 workflow：

1. **替换 Mock 报价为 OpenAI API**
   - 添加 OpenAI 节点
   - 使用 GPT-4 生成智能报价建议

2. **接入 EasyPost API**
   - 添加 HTTP Request 节点
   - 创建真实的物流单

3. **添加更多自动化**
   - 邮件通知（SendGrid）
   - SMS 通知（Twilio）
   - CRM 同步（HubSpot）

---

## ✅ 成功标准

完成配置后，你应该能：
- ✅ 在前端提交表单
- ✅ 看到绿色成功提示
- ✅ 显示报价金额（例如 $750.00）
- ✅ 数据保存到数据库，包含 quote_amount

**预计配置时间:** 3-5 分钟
