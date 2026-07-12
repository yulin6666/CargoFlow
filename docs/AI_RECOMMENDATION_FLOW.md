# AI 智能推荐流程图

## 整体架构

```
┌─────────────┐
│   用户界面   │
│  (Frontend)  │
└──────┬───────┘
       │ 1. 提交报价请求
       ▼
┌──────────────┐
│  后端 API     │
│  (NestJS)     │
└──────┬───────┘
       │ 2. 转发到 n8n
       ▼
┌──────────────────────────────────────────────────────┐
│                   n8n Workflow                        │
│                                                       │
│  ┌──────────┐    ┌────────────┐    ┌──────────┐     │
│  │ Webhook  │───▶│  Prepare   │───▶│  Shippo  │     │
│  │ Trigger  │    │  Request   │    │   API    │     │
│  └──────────┘    └────────────┘    └────┬─────┘     │
│                                          │           │
│                                          ▼           │
│                                    ┌──────────┐     │
│                                    │  Parse   │     │
│                                    │  Rates   │     │
│                                    └────┬─────┘     │
│                                         │           │
│                                         ▼           │
│            ⭐ NEW ────────────────────────────────   │
│                                    ┌──────────┐     │
│                                    │   AI     │     │
│                                    │  Agent   │────▶│ OpenAI API
│                                    └────┬─────┘     │
│                                         │           │
│                                         ▼           │
│                                    ┌──────────┐     │
│                                    │  Parse   │     │
│                                    │ AI Resp  │     │
│                                    └────┬─────┘     │
│            ────────────────────────────────── ⭐     │
│                                         │           │
│                                         ▼           │
│                                    ┌──────────┐     │
│                                    │   Save   │     │
│                                    │ to  DB   │     │
│                                    └────┬─────┘     │
│                                         │           │
│                                         ▼           │
│                                    ┌──────────┐     │
│                                    │  Format  │     │
│                                    │ Response │     │
│                                    └────┬─────┘     │
│                                         │           │
└─────────────────────────────────────────┼───────────┘
                                          │
                                          ▼
                                    ┌──────────┐
                                    │ Frontend │
                                    │ Display  │
                                    └──────────┘
```

## 数据流转

### 1. 输入数据 (用户提交)
```json
{
  "fromAddress": "New York",
  "toAddress": "Los Angeles",
  "weight": 10,
  "senderName": "John Smith",
  "senderPhone": "6505550100",
  "senderEmail": "john@example.com"
}
```

### 2. Shippo API 返回 (多个 rates)
```json
{
  "rates": [
    {
      "object_id": "rate_1",
      "provider": "USPS",
      "servicelevel_name": "Priority Mail",
      "amount": "7.33",
      "currency": "USD",
      "estimated_days": 2
    },
    {
      "object_id": "rate_2",
      "provider": "UPS",
      "servicelevel_name": "Ground",
      "amount": "9.50",
      "currency": "USD",
      "estimated_days": 3
    },
    {
      "object_id": "rate_3",
      "provider": "FedEx",
      "servicelevel_name": "Express",
      "amount": "15.20",
      "currency": "USD",
      "estimated_days": 1
    }
  ]
}
```

### 3. AI 输入 (发送给 OpenAI)
```json
{
  "model": "gpt-3.5-turbo",
  "messages": [
    {
      "role": "system",
      "content": "你是一个物流专家，需要根据承运商的价格、时效、可靠性等因素，给出最优的推荐理由。请用简洁的中文回复，不超过50字。"
    },
    {
      "role": "user",
      "content": "以下是所有可用的运输方案：\n[rates数据]\n\n请推荐最佳方案并说明原因。"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 150
}
```

### 4. AI 输出 (OpenAI 返回)
```json
{
  "choices": [
    {
      "message": {
        "content": "推荐选择 USPS Priority Mail，价格为$7.33，2天内到达，性价比最高，适合普通包裹运输。"
      }
    }
  ]
}
```

### 5. 存储到数据库
```sql
INSERT INTO demo_shipments (
  from_address,
  to_address,
  weight,
  carrier,
  service_name,
  quote_amount,
  estimated_days,
  ai_recommendation,  -- ⭐ 新字段
  ...
) VALUES (
  'New York',
  'Los Angeles',
  10,
  'USPS',
  'Priority Mail',
  7.33,
  2,
  '推荐选择 USPS Priority Mail，价格为$7.33，2天内到达，性价比最高，适合普通包裹运输。',
  ...
);
```

### 6. 返回给前端
```json
{
  "success": true,
  "shipmentId": 123,
  "quoteAmount": 7.33,
  "carrier": "USPS",
  "serviceName": "Priority Mail",
  "estimatedDays": 2,
  "aiRecommendation": "推荐选择 USPS Priority Mail，价格为$7.33，2天内到达，性价比最高，适合普通包裹运输。",
  "allRates": [...]
}
```

## 前端展示效果

### Quote Results 页面
```
╔═══════════════════════════════════════════════════════╗
║  Quote Results                      Order #123         ║
╠═══════════════════════════════════════════════════════╣
║                                                        ║
║  ┌────────────────────────────────────────────────┐  ║
║  │ 🤖 AI 智能推荐                                  │  ║
║  │                                                 │  ║
║  │ 推荐选择 USPS Priority Mail，价格为$7.33，     │  ║
║  │ 2天内到达，性价比最高，适合普通包裹运输。       │  ║
║  └────────────────────────────────────────────────┘  ║
║                                                        ║
║  ○ USPS Priority Mail                                 ║
║    $7.33 • 2 day delivery                             ║
║                                                        ║
║  ○ UPS Ground                                         ║
║    $9.50 • 3 day delivery                             ║
║                                                        ║
║  ○ FedEx Express                                      ║
║    $15.20 • 1 day delivery                            ║
║                                                        ║
║  [      Confirm Purchase      ]                       ║
║                                                        ║
╚═══════════════════════════════════════════════════════╝
```

### Orders 列表页面
```
╔════════════════════════════════════════════╗
║ Order #123                     [Paid]      ║
╠════════════════════════════════════════════╣
║ New York → Los Angeles                     ║
║ 10 lbs                                     ║
║                                            ║
║ $7.33  USPS Priority Mail  2 days         ║
║                                            ║
║ ┌────────────────────────────────────────┐ ║
║ │ 🤖 推荐选择 USPS Priority Mail，       │ ║
║ │    性价比最高，2天内到达。             │ ║
║ └────────────────────────────────────────┘ ║
║                                            ║
║ [📄 Download Label]                        ║
╚════════════════════════════════════════════╝
```

## 时间轴

```
用户提交请求
    │
    ├─ 0ms: Frontend 发送请求
    │
    ├─ 50ms: Backend 转发到 n8n
    │
    ├─ 100ms: n8n 准备数据
    │
    ├─ 500ms: 调用 Shippo API
    │
    ├─ 1000ms: 解析 Shippo 返回的 rates
    │
    ├─ 1100ms: ⭐ 调用 OpenAI API (新增)
    │
    ├─ 2500ms: ⭐ 接收 AI 推荐 (新增)
    │
    ├─ 2600ms: 保存到数据库
    │
    ├─ 2700ms: 格式化响应
    │
    └─ 2800ms: 返回给前端展示
```

**总耗时**: 约 2.8 秒 (比原来增加 ~1.5 秒)

## 错误处理流程

```
┌─────────────────┐
│ AI API 调用     │
└────────┬────────┘
         │
    成功？│
    ┌────┴────┐
    │         │
   Yes       No
    │         │
    ▼         ▼
┌────────┐ ┌──────────────────┐
│ 使用   │ │ 使用默认推荐文案  │
│ AI文本 │ │ "推荐选择价格..."│
└────────┘ └──────────────────┘
    │         │
    └────┬────┘
         ▼
   ┌──────────┐
   │ 继续流程 │
   └──────────┘
```

## 配置检查清单

- [ ] `.env` 文件添加 `OPENAI_API_KEY`
- [ ] n8n 配置 OpenAI HTTP Header Auth 凭据
- [ ] 数据库迁移已执行
- [ ] Prisma Client 已重新生成
- [ ] n8n workflow 已导入
- [ ] Backend 已重启
- [ ] Frontend 已重启
- [ ] 测试报价流程
- [ ] 验证 AI 推荐显示

## 监控指标

建议监控以下指标：

1. **AI 调用成功率**: 目标 > 95%
2. **AI 响应时间**: 目标 < 2秒
3. **推荐采纳率**: 用户选择 AI 推荐方案的比例
4. **用户满意度**: 通过反馈收集

## 成本估算

基于 OpenAI GPT-3.5-turbo 定价:
- 输入: $0.0015 / 1K tokens
- 输出: $0.002 / 1K tokens

每次报价预估:
- 输入 tokens: ~300 (rates 数据 + prompt)
- 输出 tokens: ~50 (推荐文本)
- 单次成本: $0.0005 - $0.001 (约 0.05 - 0.1 分)

月度成本 (1000次报价): **$0.50 - $1.00**
