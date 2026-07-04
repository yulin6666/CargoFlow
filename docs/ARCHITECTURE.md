# CargoFlow 架构说明：后端 / n8n / 数据库的关系

## 整体调用链

```
前端 (Next.js :3000)
    │
    │  HTTP POST /api/quotes
    ▼
后端 (NestJS :3001)
    │
    │  HTTP POST /webhook/generate-quote
    ▼
n8n (:5678)
    │
    │  SQL INSERT
    ▼
PostgreSQL (:5433)
```

---

## 后端如何调用 n8n

后端**不直接处理业务逻辑**，而是把请求转发给 n8n webhook。n8n 是真正的执行者。

### 调用方式

`QuotesService.createQuote()` 使用 `@nestjs/axios` 发送 HTTP POST：

```typescript
// apps/backend/src/quotes/quotes.service.ts

const n8nUrl = `${this.n8nWebhookBase}/webhook/generate-quote`;
const response = await firstValueFrom(
  this.httpService.post(n8nUrl, createQuoteDto),
);
return response.data;
```

- webhook 地址通过环境变量 `N8N_WEBHOOK_BASE` 配置（默认 `http://localhost:5678`）
- 请求体原样透传：`{ fromAddress, toAddress, weight }`
- n8n 处理完之后返回结果，后端直接把这个结果透传给前端

### 降级处理（Fallback）

如果 n8n 不可用，或者 n8n 返回空响应，后端会 **自己写入数据库** 并返回错误提示：

```typescript
// n8n 调用失败时
const shipment = await prisma.demoShipment.create({
  data: { fromAddress, toAddress, weight, status: 'draft', quoteAmount: null }
});
return { success: false, error: 'n8n webhook not available', shipmentId: shipment.id };
```

这也是目前前端显示黄色提示的原因。

---

## 对外 API 接口

### 创建报价

```
POST /api/quotes
Content-Type: application/json

请求体：
{
  "fromAddress": "Chicago, IL",
  "toAddress": "Los Angeles, CA",
  "weight": 500
}
```

**正常响应（n8n 已配置）：**
```json
{
  "success": true,
  "shipmentId": 5,
  "fromAddress": "Chicago, IL",
  "toAddress": "Los Angeles, CA",
  "weight": 500,
  "quoteAmount": 750,
  "status": "draft",
  "message": "报价生成成功！订单已创建。",
  "createdAt": "2026-07-04T..."
}
```

**降级响应（n8n 未配置）：**
```json
{
  "success": false,
  "error": "n8n webhook not available",
  "shipmentId": 5,
  "message": "Quote created locally. Please configure n8n workflow to generate pricing."
}
```

---

### 查询订单列表

```
GET /api/quotes

响应：
[
  { "id": 1, "fromAddress": "...", "quoteAmount": "750.00", "status": "draft", ... }
]
```

### 查询单个订单

```
GET /api/quotes/:id

响应：
{ "id": 1, "fromAddress": "...", ... }
```

---

## 数据库的使用方

**目前数据库同时被两个地方使用：**

| 操作 | 执行者 | 时机 |
|------|--------|------|
| INSERT 新订单（正常流程）| **n8n** | n8n workflow 执行 SQL 写入 |
| INSERT 新订单（降级流程）| **NestJS 后端** | n8n 不可用时，后端直接用 Prisma 写入 |
| SELECT 订单列表 | **NestJS 后端** | `GET /api/quotes` 请求时 |
| SELECT 单个订单 | **NestJS 后端** | `GET /api/quotes/:id` 请求时 |

### 设计意图

这个设计是有意为之的：

- **n8n 负责写**：在完整流程中，报价逻辑、AI 调用、第三方 API 都在 n8n 里完成，最后写入数据库
- **NestJS 负责读**：前端展示数据（订单列表、详情）通过后端查询
- **后端做兜底**：n8n 挂了时，后端保证请求不会完全失败，至少保存一条基础记录

### 阶段 2 的计划

到阶段 2 接入更多第三方服务后，数据库将完全由 n8n 负责写入：

```
n8n workflow 1（报价）→ 写入 demo_shipments
n8n workflow 2（支付）→ 更新订单状态 + 写入 automation_logs
n8n workflow 3（状态更新）→ 更新状态 + 写入 automation_logs

NestJS 后端 → 只做查询（SELECT），不做写入
```

---

## 配置关键点

**后端**（`.env.local`）：
```
N8N_WEBHOOK_BASE=http://localhost:5678   # n8n 地址
DATABASE_URL=postgresql://...            # 数据库（用于读和降级写）
```

**n8n workflow**（在 n8n 中配置）：
```
PostgreSQL 凭证 → host.docker.internal:5433
数据库 → logistics_demo
```

**注意**：后端和 n8n 各自维护一个数据库连接。后端用 Prisma，n8n 用内置 PostgreSQL 节点。两者连接的是同一个数据库，不冲突。
