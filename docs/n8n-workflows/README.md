# n8n Workflow 配置指南

## 阶段 1: Quote Generation Workflow (最小版本)

这是一个简单的 workflow，用于验证 NestJS → n8n 的连通性。

### Workflow 步骤

1. **Webhook Trigger** (接收 NestJS 的请求)
2. **Function Node** (处理数据，生成 mock 报价)
3. **PostgreSQL Node** (保存到数据库)
4. **Respond to Webhook** (返回结果给 NestJS)

---

## 手动配置步骤

### 1. 创建新 Workflow

1. 访问 http://localhost:5678
2. 点击 "Create new workflow"
3. 命名为 "Quote Generation - Stage 1"

### 2. 添加 Webhook Trigger 节点

1. 点击 "+" 添加节点
2. 搜索并选择 "Webhook"
3. 配置：
   - **HTTP Method**: POST
   - **Path**: `generate-quote`
   - **Respond**: Using 'Respond to Webhook' Node
4. 点击 "Execute Node" 获取 webhook URL
5. 复制 URL（应该类似 `http://localhost:5678/webhook/generate-quote`）

### 3. 添加 Function 节点

1. 连接 Webhook 节点后添加 "Function" 节点
2. 配置：
   - **Function Name**: Generate Mock Quote
   - **JavaScript Code**:

```javascript
// 获取输入数据
const { fromAddress, toAddress, weight } = $input.item.json;

// 简单的 mock 报价逻辑（基于重量）
const baseRate = 1.5; // 每磅 $1.5
const quoteAmount = (weight * baseRate).toFixed(2);

// 构造返回数据
const result = {
  success: true,
  shipmentId: null, // 将由数据库生成
  quoteAmount: parseFloat(quoteAmount),
  fromAddress,
  toAddress,
  weight,
  status: 'draft',
  message: `Mock 报价已生成：从 ${fromAddress} 到 ${toAddress}，重量 ${weight} lbs`,
  timestamp: new Date().toISOString(),
};

return { json: result };
```

### 4. 添加 PostgreSQL 节点

1. 添加 "Postgres" 节点
2. 配置连接：
   - **Host**: localhost (或 host.docker.internal)
   - **Database**: logistics_demo
   - **User**: postgres
   - **Password**: demo123
   - **Port**: 5432
   - **SSL**: Disable
3. 配置操作：
   - **Operation**: Insert
   - **Schema**: public
   - **Table**: demo_shipments
   - **Columns**:
     ```
     from_address = {{ $json.fromAddress }}
     to_address = {{ $json.toAddress }}
     weight = {{ $json.weight }}
     status = draft
     quote_amount = {{ $json.quoteAmount }}
     ```
   - **Return Fields**: *（全部字段）

### 5. 添加第二个 Function 节点（整理返回数据）

```javascript
// 获取数据库插入结果
const dbResult = $input.item.json;

// 整理返回给 NestJS 的数据
return {
  json: {
    success: true,
    shipmentId: dbResult.id,
    quoteAmount: parseFloat(dbResult.quote_amount),
    fromAddress: dbResult.from_address,
    toAddress: dbResult.to_address,
    weight: parseFloat(dbResult.weight),
    status: dbResult.status,
    message: '报价生成成功！订单已创建。',
    createdAt: dbResult.created_at,
  },
};
```

### 6. 添加 Respond to Webhook 节点

1. 添加 "Respond to Webhook" 节点
2. 配置：
   - **Respond With**: JSON
   - **Response Code**: 200
3. 数据会自动使用上一个节点的输出

### 7. 保存并激活

1. 点击右上角 "Save" 保存 workflow
2. 切换右上角的开关，激活 workflow（变为绿色）

---

## 快速测试

### 测试 n8n webhook（直接调用）

```bash
curl -X POST http://localhost:5678/webhook/generate-quote \
  -H "Content-Type: application/json" \
  -d '{
    "fromAddress": "Chicago, IL",
    "toAddress": "Los Angeles, CA",
    "weight": 500
  }'
```

### 测试完整流程（通过 NestJS）

```bash
curl -X POST http://localhost:3001/api/quotes \
  -H "Content-Type: application/json" \
  -d '{
    "fromAddress": "Chicago, IL",
    "toAddress": "Los Angeles, CA",
    "weight": 500
  }'
```

---

## 故障排查

### 问题 1: Webhook URL 无法访问

**症状**: `Connection refused` 或 `ECONNREFUSED`

**解决**:
- 确认 n8n 正在运行：`curl http://localhost:5678/healthz`
- 检查 workflow 是否已激活（右上角开关为绿色）
- 确认 webhook path 正确：`/webhook/generate-quote`

### 问题 2: PostgreSQL 连接失败

**症状**: `Connection error` 或 `Authentication failed`

**解决**:
- 如果 n8n 运行在 Docker 中，Host 应该是 `host.docker.internal` 而不是 `localhost`
- 检查数据库凭证是否正确
- 确认数据库已创建且表已存在（运行 Prisma migration）

### 问题 3: 数据库插入失败

**症状**: `Column not found` 或 `Invalid input`

**解决**:
- 确认表结构与 Prisma schema 一致
- 检查字段名是否使用下划线（from_address 而不是 fromAddress）
- 确认数据类型匹配（weight 和 quote_amount 是 Decimal）

---

## 下一步（阶段 2）

完成阶段 1 后，可以升级 workflow：
1. 将 mock 报价替换为真实的 OpenAI API 调用
2. 添加 EasyPost API 创建真实物流单
3. 添加更复杂的报价逻辑

保持当前的 workflow 结构，只需替换 Function 节点的逻辑即可。
