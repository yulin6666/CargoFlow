# CargoFlow 物流自动化系统 - 完整版

基于 Shippo API + n8n + Next.js + NestJS 的完整物流自动化演示系统

## 功能特性

- ✅ **智能报价** - Shippo 多承运商实时比价
- ✅ **Label 购买** - 自动购买运单并获取 tracking
- ✅ **状态追踪** - Webhook 实时推送物流状态更新
- ✅ **支付集成** - Stripe 支付流程（test mode）
- ✅ **自动化日志** - 所有操作日志记录和展示
- ✅ **订单管理** - 完整的订单 CRUD 和状态管理

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 14 + Tailwind CSS + shadcn/ui |
| 后端 | NestJS + TypeScript |
| Workflow | n8n (6个完整workflows) |
| 数据库 | PostgreSQL + Prisma ORM |
| 物流API | Shippo (test mode) |
| 支付 | Stripe (test mode，可选) |

## 架构图

```
┌─────────────────────────────────────────────────┐
│  Next.js Frontend (:3000)                       │
│  - 报价表单                                      │
│  - 订单列表                                      │
│  - 状态追踪                                      │
│  - 自动化日志                                    │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│  NestJS Backend (:3001)                         │
│  POST /api/shipments/quote                      │
│  POST /api/shipments/:id/purchase-label         │
│  GET  /api/shipments                            │
│  GET  /api/shipments/:id                        │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│  n8n Workflows (:5678)                          │
│  1. Quote Generation                            │
│  2. Purchase Label                              │
│  3. Tracking Webhook                            │
│  4. Payment Processing                          │
│  5. Get Shipment                                │
│  6. List Shipments                              │
└─────────────────┬───────────────────────────────┘
                  │
        ┌─────────┴──────────┐
        ▼                    ▼
┌───────────────┐    ┌───────────────┐
│  PostgreSQL   │    │  Shippo API   │
│  (:5433)      │    │  (test mode)  │
└───────────────┘    └───────────────┘
```

## 数据库 Schema

### demo_tokens (测试码表)
- `code` - 测试码 (主键)
- `customer_name` / `customer_email` / `customer_phone`
- `max_shipments` / `used_shipments` - 使用限额
- `expires_at` - 过期时间

### demo_shipments (订单表)
- `id` - 订单 ID (主键)
- `token_code` - 关联测试码
- `from_address` / `to_address` / `weight`
- `status` - 订单状态 (draft/label_purchased/in_transit/delivered)
- `shippo_object_id` / `shippo_rate_id` - Shippo 数据
- `tracking_number` / `tracking_status` / `tracking_url`
- `label_url` - PDF 运单下载链接
- `carrier` / `service_name` / `estimated_days`
- `quote_amount` - 报价金额
- `stripe_payment_id` / `paid_at` - 支付信息

### automation_logs (自动化日志表)
- `id` - 日志 ID
- `shipment_id` - 关联订单
- `action_type` - 动作类型 (label_purchased/tracking_updated/payment_succeeded等)
- `details` - JSON 详细信息
- `success` / `error_msg` - 执行结果

## 快速开始

### 1. 环境要求

- Node.js 18+
- Docker (用于 PostgreSQL 和 n8n)
- Shippo Test Token
- (可选) Stripe Test Key

### 2. 数据库启动

```bash
# 如果已有 PostgreSQL 容器在 5433 端口，跳过此步
docker run -d --name postgres \
  -e POSTGRES_USER=root \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=logistics_demo \
  -p 5433:5432 \
  postgres:15
```

### 3. 运行数据库迁移

```bash
cd packages/database
npx prisma migrate deploy
npx prisma generate
```

### 4. 配置环境变量

```bash
# .env.local (项目根目录)
DATABASE_URL="postgresql://root:password@localhost:5433/logistics_demo"
N8N_WEBHOOK_BASE="http://localhost:5678"
NEXT_PUBLIC_API_URL="http://localhost:3001"

# Shippo (必需)
SHIPPO_TEST_TOKEN="shippo_test_xxxxx"

# Stripe (可选)
STRIPE_SECRET_KEY="sk_test_xxxxx"
```

### 5. 启动 n8n

```bash
# 如果已有 n8n 容器，跳过此步
docker run -d --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

### 6. 导入 n8n Workflows

1. 访问 http://localhost:5678
2. 依次导入 `docs/n8n-workflows/` 目录下的 6 个 JSON 文件：
   - `quote-generation-stage1.json`
   - `purchase-label.json`
   - `tracking-webhook.json`
   - `payment-processing.json`
   - `get-shipment.json`
   - `list-shipments.json`

3. 配置 Shippo Credential：
   - Settings → Credentials → Add Credential
   - 选择 **Header Auth**
   - Name: `Shippo Test Token`
   - Header Name: `Authorization`
   - Header Value: `ShippoToken shippo_test_xxxxx`

4. 为每个 workflow 的 Shippo HTTP Request 节点绑定 credential

5. 配置 PostgreSQL Credential：
   - Host: `host.docker.internal` (Docker内) 或 `localhost`
   - Port: `5433`
   - Database: `logistics_demo`
   - User: `root`
   - Password: `password`

### 7. 启动后端

```bash
cd apps/backend
npm install
npm run start:dev
```

访问: http://localhost:3001

### 8. 启动前端

```bash
cd apps/frontend
npm install
npm run dev
```

访问: http://localhost:3000

## API 文档

### 创建报价

```http
POST /api/shipments/quote
Content-Type: application/json

{
  "fromAddress": "Chicago",
  "toAddress": "New York",
  "weight": 5,
  "dimensions": {
    "length": "10",
    "width": "10",
    "height": "10"
  }
}
```

**支持的城市**：New York, Los Angeles, Chicago, Houston, Phoenix, San Francisco, Seattle, Miami, Dallas, Boston

**响应**：
```json
{
  "success": true,
  "shipmentId": 1,
  "quoteAmount": 12.50,
  "carrier": "USPS",
  "serviceName": "Priority Mail",
  "estimatedDays": 2,
  "allRates": [
    {
      "rateId": "rate_xxx",
      "carrier": "USPS",
      "service": "Priority Mail",
      "amount": 12.50,
      "currency": "USD",
      "estimatedDays": 2
    }
  ],
  "shippoObjectId": "shipment_xxx",
  "message": "报价已生成"
}
```

### 购买 Label

```http
POST /api/shipments/:id/purchase-label
Content-Type: application/json

{
  "rateId": "rate_xxx"  // 可选，不传则使用订单中保存的 rate
}
```

**响应**：
```json
{
  "success": true,
  "shipmentId": 1,
  "status": "label_purchased",
  "trackingNumber": "9205590164917312751089",
  "labelUrl": "https://shippo-delivery.s3.amazonaws.com/xxx.pdf",
  "trackingUrl": "https://tools.usps.com/go/TrackConfirmAction?tLabels=xxx",
  "carrier": "USPS",
  "serviceName": "Priority Mail",
  "message": "Label 购买成功！"
}
```

### 查询订单列表

```http
GET /api/shipments?status=label_purchased&limit=20&offset=0
```

### 查询订单详情

```http
GET /api/shipments/:id
```

**响应**：
```json
{
  "success": true,
  "shipment": {
    "id": 1,
    "fromAddress": "Chicago",
    "toAddress": "New York",
    "status": "label_purchased",
    "trackingNumber": "xxx",
    "labelUrl": "https://...",
    "trackingUrl": "https://...",
    ...
  },
  "logs": [
    {
      "actionType": "label_purchased",
      "details": { "tracking_number": "xxx" },
      "success": true,
      "createdAt": "2026-07-04T08:00:00Z"
    }
  ]
}
```

### 查询订单日志

```http
GET /api/shipments/:id/logs
```

## Webhook 配置

### Shippo Tracking Webhook

购买 label 后，Shippo 会自动创建 webhook。手动配置方式：

1. 访问 https://portal.goshippo.com/webhooks
2. Add Webhook
3. URL: `http://your-domain/webhook/shippo-tracking-webhook`
4. Event: `tracking_updated`

**本地开发用 ngrok**：
```bash
ngrok http 5678
# 获得公网 URL: https://xxxx.ngrok.io
# Webhook URL: https://xxxx.ngrok.io/webhook/shippo-tracking-webhook
```

### Stripe Payment Webhook (可选)

1. 访问 https://dashboard.stripe.com/test/webhooks
2. Add endpoint
3. URL: `http://your-domain/webhook/stripe-payment-webhook`
4. Event: `payment_intent.succeeded`

## 订单状态流转

```
draft (创建报价)
  ↓
label_purchased (购买运单)
  ↓
in_transit (Shippo webhook: status=TRANSIT)
  ↓
delivered (Shippo webhook: status=DELIVERED)
```

支付流程（可选）：
```
draft → pending_payment → paid → label_purchased
```

## 自动化日志类型

- `label_purchased` - Label 购买成功
- `tracking_updated` - 状态更新
- `notification_in_transit` - 运输中通知（模拟）
- `notification_delivered` - 送达通知（模拟）
- `payment_succeeded` - 支付成功
- `email_payment_confirmation` - 支付确认邮件（模拟）

## 测试用例

### 1. 完整流程测试

```bash
# 1. 创建报价
curl -X POST http://localhost:3001/api/shipments/quote \
  -H "Content-Type: application/json" \
  -d '{"fromAddress":"Chicago","toAddress":"New York","weight":5}'

# 返回 shipmentId: 1, rateId: rate_xxx

# 2. 购买 label
curl -X POST http://localhost:3001/api/shipments/1/purchase-label \
  -H "Content-Type: application/json" \
  -d '{"rateId":"rate_xxx"}'

# 返回 trackingNumber: 9205590164917312751089

# 3. 查询订单
curl http://localhost:3001/api/shipments/1

# 4. 模拟 Shippo tracking webhook (n8n 直接调用)
curl -X POST http://localhost:5678/webhook/shippo-tracking-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "tracking_updated",
    "data": {
      "tracking_number": "9205590164917312751089",
      "status": "TRANSIT"
    }
  }'

# 5. 再次查询订单，查看状态变化和日志
curl http://localhost:3001/api/shipments/1
```

### 2. Shippo Test Tracking Numbers

使用特殊 tracking number 可以模拟状态变化：

- `SHIPPO_TRANSIT` - 直接进入运输中
- `SHIPPO_DELIVERED` - 直接进入已送达
- `SHIPPO_RETURNED` - 退件
- `SHIPPO_FAILURE` - 投递失败

## 常见问题

### Q: Shippo API 返回 `rates: []`
A: 地址不真实或重量超限。确保使用文档中列出的真实美国城市，重量 ≤ 70lb。

### Q: n8n webhook 无法访问
A: 检查 `N8N_WEBHOOK_BASE` 环境变量，确保 NestJS 能访问 n8n。

### Q: 数据库连接失败
A: 检查 PostgreSQL 容器是否启动，端口是否为 5433。

### Q: 本地开发 webhook 如何测试
A: 使用 ngrok 暴露本地端口，或在 n8n 中手动触发 webhook 节点。

## 下一步扩展

- [ ] 集成 SendGrid 发送真实邮件
- [ ] 集成 Twilio 发送 SMS 通知
- [ ] 集成 HubSpot CRM 同步
- [ ] 测试码生成和管理界面
- [ ] Dashboard 实时日志（SSE）
- [ ] 部署到 Railway 云平台

## 参考文档

- [Shippo API Documentation](https://docs.goshippo.com/)
- [Shippo Tracking Webhooks](https://goshippo.com/docs/webhooks)
- [n8n Documentation](https://docs.n8n.io/)
- [Prisma Documentation](https://www.prisma.io/docs)

## License

MIT
