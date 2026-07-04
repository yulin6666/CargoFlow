# 物流自动化 Demo 技术设计文档

## 项目概述

构建一个基于 n8n + AI 的物流自动化演示系统，可部署在 Railway 平台，支持多个客户通过测试码进行真实 API 体验。

### 核心功能

- AI 辅助承运商匹配
- 自动报价生成
- 货物状态追踪与通知
- CRM 自动化同步
- 支付流程集成

### 目标用户

物流公司、货运代理、需要自动化货运操作的企业客户

---

## 技术架构

### 本地开发架构（当前阶段）

```
┌─────────────────────────────────────────────────┐
│              本地开发环境                        │
│  ┌─────────────┐  ┌──────────────┐             │
│  │   Next.js   │  │   NestJS     │             │
│  │  (前端)     │─→│   (后端)     │             │
│  │  :3000      │  │   :3001      │             │
│  └─────────────┘  └──────┬───────┘             │
│  ┌─────────────┐         │                      │
│  │     n8n     │←────────┘                      │
│  │  (workflow) │                                │
│  │   :5678     │                                │
│  └──────┬──────┘                                │
│  ┌──────┴──────┐                                │
│  │ PostgreSQL  │                                │
│  │ (本地/Docker)│                                │
│  └─────────────┘                                │
└─────────────────────────────────────────────────┘
         │
         ├─── Shippo (物流 API - test mode)
         ├─── Stripe (支付 - test mode)
         ├─── SendGrid (邮件通知)
         ├─── Twilio (SMS 通知)
         ├─── HubSpot (CRM - free tier)
         └─── OpenAI/Claude (AI 报价和匹配)

注：webhook回调需要ngrok暴露本地端口
```

### 技术栈调整

| 层级 | 原设计 | 实际方案 | 理由 |
|------|--------|----------|------|
| 前端 | React | **Next.js 14+** | App Router、SSR、更好的开发体验 |
| 后端 | FastAPI | **NestJS** | TypeScript全栈、模块化架构 |
| Workflow | Railway部署 | **本地n8n** | 已有服务，先本地调试 |
| 数据库ORM | SQL直接操作 | **Prisma/TypeORM** | 类型安全、迁移管理 |

---

## 系统集成方案

### 1. Shippo（物流数据核心）

**选择原因：**
- 有完善的 test mode（token 前缀 `shippo_test_`）
- 真实 API 调用，支持创建 shipment、购买 label 和 tracking
- 注册即得 test token，在 [portal.goshippo.com/api-keys](https://portal.goshippo.com/api-keys) 获取，无需审批
- 支持 USPS、UPS、FedEx 等多承运商费率比价
- 文档：[docs.goshippo.com](https://docs.goshippo.com)

**获取 Test API Key：**
1. 注册 [goshippo.com](https://goshippo.com)
2. 进入 [portal.goshippo.com/api-keys](https://portal.goshippo.com/api-keys)
3. 复制 **Test Token**（格式：`shippo_test_xxxxxxxx...`）

**集成方式：**
```javascript
// n8n HTTP Request node - 创建 shipment 并获取费率
POST https://api.goshippo.com/shipments/
Authorization: ShippoToken shippo_test_xxxxx
Content-Type: application/json

{
  "address_from": {
    "name": "Sender Name",
    "street1": "215 Clayton St",
    "city": "San Francisco",
    "state": "CA",
    "zip": "94117",
    "country": "US"
  },
  "address_to": {
    "name": "Recipient Name",
    "street1": "965 Mission St",
    "city": "San Francisco",
    "state": "CA",
    "zip": "94103",
    "country": "US"
  },
  "parcels": [{
    "length": "5",
    "width": "5",
    "height": "5",
    "distance_unit": "in",
    "weight": "2",
    "mass_unit": "lb"
  }],
  "async": false
}
```

**购买 Label（test mode）：**
```javascript
// 从 shipment.rates 中选择一个 rate_id 购买
POST https://api.goshippo.com/transactions/
Authorization: ShippoToken shippo_test_xxxxx

{
  "rate": "<rate_object_id>",
  "label_file_type": "PDF",
  "async": false
}
// 返回: tracking_number, label_url
```

**状态追踪（创建 tracker）：**
```javascript
// 通过 tracking number 创建 tracker
POST https://api.goshippo.com/tracks/
Authorization: ShippoToken shippo_test_xxxxx

{
  "carrier": "usps",
  "tracking_number": "9205590164917312751089"
}
```

**Test mode 特殊 tracking number（自动模拟状态流转）：**
- `SHIPPO_TRANSIT` → 直接进入 in_transit 状态
- `SHIPPO_DELIVERED` → 直接进入 delivered 状态
- `SHIPPO_RETURNED` → 模拟退件
- `SHIPPO_FAILURE` → 模拟投递失败

每次轮询自动推进：
`UNKNOWN → PRE_TRANSIT → TRANSIT → DELIVERED`

---

### 2. Stripe（支付流程）

**test mode 配置：**
- API Key: `sk_test_xxxxx`
- 测试卡号: `4242 4242 4242 4242`
- Webhook 真实触发，完全模拟生产行为

**n8n workflow：**
```
Stripe Webhook 触发
  ↓
验证支付成功
  ↓
创建 HubSpot 联系人
  ↓
发送确认邮件
```

---

### 3. 通知系统

**Email（SendGrid）：**
- Free tier: 100 封/天
- SMTP 集成到 n8n
- 模板化邮件（报价确认、状态更新、发票）

**SMS（Twilio）：**
- Trial 账号 $15 credit
- 限制：只能发到已验证号码
- 解决方案：客户申请测试码时提交手机号，后台预先验证

---

### 4. HubSpot CRM

**数据同步：**
- 创建联系人（客户信息）
- 创建 Deals（订单金额、状态）
- 自定义字段（tracking number、carrier）

**n8n node：**
使用内置 HubSpot node，支持 CRUD 操作

---

### 5. AI 集成（OpenAI/Claude）

**功能点：**

1. **智能报价生成**
```
输入：货物信息（重量、体积、路线、时效要求）
输出：价格建议、备注说明
```

2. **承运商匹配**
```
输入：货物属性 + 历史数据
输出：推荐 Top 3 承运商 + 理由
```

**n8n 实现：**
```
OpenAI node (GPT-4)
Prompt: "根据以下货物信息生成报价..."
Response: JSON 格式 {price, carrier, notes}
```

---

## 测试码机制设计

### 数据库设计

```sql
-- 测试码表
CREATE TABLE demo_tokens (
    code VARCHAR(20) PRIMARY KEY,          -- DEMO-2024-ABC
    customer_name VARCHAR(100),            -- 客户名称
    customer_phone VARCHAR(20),            -- 接收 SMS 的号码
    customer_email VARCHAR(100),           -- 接收邮件的地址
    max_shipments INT DEFAULT 10,          -- 最多创建订单数
    used_shipments INT DEFAULT 0,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 演示订单表
CREATE TABLE demo_shipments (
    id SERIAL PRIMARY KEY,
    token_code VARCHAR(20) REFERENCES demo_tokens(code),
    shippo_object_id VARCHAR(100),         -- Shippo shipment object ID
    shippo_rate_id VARCHAR(100),           -- 选中的费率 ID
    tracking_number VARCHAR(100),
    from_address JSONB,
    to_address JSONB,
    status VARCHAR(50),                    -- created, paid, in_transit, delivered
    quote_amount DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 自动化日志表
CREATE TABLE automation_logs (
    id SERIAL PRIMARY KEY,
    shipment_id INT REFERENCES demo_shipments(id),
    action_type VARCHAR(50),               -- email_sent, sms_sent, hubspot_updated
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 测试码生成逻辑

```python
import secrets
import string

def generate_demo_token():
    """生成格式：DEMO-2024-XXXXX"""
    random_part = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(5))
    return f"DEMO-2024-{random_part}"
```

### 使用流程

1. **客户申请测试码：**
   - 填写表单（姓名、邮箱、手机号）
   - 系统生成测试码
   - 后台添加手机号到 Twilio verified list

2. **客户使用：**
   - 输入测试码登录 dashboard
   - 创建订单（受 max_shipments 限制）
   - 推进状态触发自动化

3. **过期清理：**
   - 定时任务清理过期测试码的数据
   - 保留日志用于演示回顾

---

## Dashboard 界面设计

### 技术选型

**方案 A：Streamlit（快速原型）**
- Python 编写，5 分钟搭建界面
- 适合纯演示，交互简单

**方案 B：FastAPI + React（推荐）**
- 前后端分离，更专业
- 易于扩展功能
- 部署在 Railway 同一项目

### Next.js Dashboard 界面结构

```
┌────────────────────────────────────────────────┐
│  🚚 Logistics Automation Demo                  │
│  测试码：[DEMO-2024-XXXXX]  [重置数据]  [登出] │
├────────────────────────────────────────────────┤
│                                                │
│  📦 创建新订单                                  │
│  ┌──────────────────────────────────────────┐ │
│  │ 起运地：[Chicago, IL         ]          │ │
│  │ 目的地：[Los Angeles, CA     ]          │ │
│  │ 重量：  [500 lbs             ]          │ │
│  │ 尺寸：  [48x40x36 inches     ]          │ │
│  │                                          │ │
│  │ [获取 AI 报价]                           │ │
│  └──────────────────────────────────────────┘ │
│                                                │
├────────────────────────────────────────────────┤
│  📋 活跃订单                                    │
│  ┌──────────────────────────────────────────┐ │
│  │ #ORD-001  Chicago → LA                  │ │
│  │ 状态：等待支付  金额：$1,240            │ │
│  │ [查看报价] [支付] [取消]                │ │
│  └──────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────┐ │
│  │ #ORD-002  NYC → Miami                   │ │
│  │ 状态：运输中  Tracking: SHIPPO_TRANSIT  │ │
│  │ [推进到下一状态] [查看详情]             │ │
│  └──────────────────────────────────────────┘ │
│                                                │
├────────────────────────────────────────────────┤
│  📊 自动化日志（实时）                          │
│  ┌──────────────────────────────────────────┐ │
│  │ 14:23  ORD-002 触发 SMS "货物已送达"    │ │
│  │ 14:21  ORD-001 AI 生成报价 $1,240       │ │
│  │ 14:20  Stripe 收款 $850 → HubSpot 同步  │ │
│  │ 14:18  ORD-003 发送确认邮件成功         │ │
│  └──────────────────────────────────────────┘ │
└────────────────────────────────────────────────┘
```

**技术实现：**
- 前端：Next.js 14 App Router + Tailwind CSS + shadcn/ui
- 状态管理：React Server Components + Server Actions
- 实时日志：Server-Sent Events (SSE) 或短轮询
- API调用：通过NestJS后端代理

### 关键交互

**1. 获取 AI 报价**
```
用户点击按钮
  ↓
Next.js 调用 NestJS API: POST /api/quotes
  ↓
NestJS 调用 n8n webhook: POST http://localhost:5678/webhook/generate-quote
  ↓
n8n workflow: OpenAI 生成报价 → Shippo 比价获取费率 → 写入数据库
  ↓
NestJS 返回报价结果给前端
  ↓
Next.js 更新 UI
```

**2. 支付流程**
```
用户点击"支付"
  ↓
NestJS 创建 Stripe Checkout Session (test mode)
  ↓
跳转到 Stripe 支付页面
  ↓
支付成功 → Stripe webhook → n8n (需要ngrok)
  ↓
n8n: 更新订单状态 + HubSpot 同步 + 发送邮件
  ↓
Dashboard 轮询或SSE刷新状态
```

**3. 推进状态（本地测试用）**
```
用户点击"推进到下一状态"
  ↓
NestJS API 调用 Shippo API 查询 tracker 状态
  ↓
Shippo webhook → n8n (需要ngrok)
  ↓
n8n: SMS/Email 通知 + HubSpot 更新 + 写日志
  ↓
Dashboard 实时显示通知日志
```

---

## 货运流程状态机

```
[创建订单] → status: draft
    ↓ 自动触发：AI 生成报价
    ↓
[等待支付] → status: pending_payment
    ↓ 用户操作：完成 Stripe 支付
    ↓ 自动触发：创建 HubSpot deal + 发确认邮件
    ↓
[支付完成] → status: paid
    ↓ 自动触发：AI 承运商匹配
    ↓
[分配承运商] → status: carrier_assigned
    ↓ 手动推进（模拟承运商接单）
    ↓ 自动触发：SMS "货物即将取件"
    ↓
[货物取件] → status: picked_up
    ↓ 手动推进（模拟运输中）
    ↓ 自动触发：SMS "货物运输中" + Email 附带追踪链接
    ↓
[运输中] → status: in_transit
    ↓ 手动推进（模拟即将送达）
    ↓ 自动触发：SMS "货物今日送达"
    ↓
[即将送达] → status: out_for_delivery
    ↓ 手动推进（模拟送达）
    ↓ 自动触发：SMS + Email "货物已送达" + Stripe 生成收据
    ↓
[已送达] → status: delivered
```

### n8n Workflow 设计

**Workflow 1: Quote Generation**
```
Webhook Trigger (POST /webhook/generate-quote)
  ↓
Extract shipment details
  ↓
OpenAI Node (生成报价建议)
  ↓
HTTP Request Node (Shippo API - 创建 shipment 获取真实费率)
  POST https://api.goshippo.com/shipments/
  Authorization: ShippoToken shippo_test_xxxxx
  ↓
Function Node (解析 rates，选最优价格)
  ↓
PostgreSQL (保存到 demo_shipments，含 shippo_object_id + rates)
  ↓
Respond to Webhook (返回 AI 推荐 + 实际费率列表)
```

**Workflow 2: Payment Processing**
```
Stripe Webhook Trigger (payment_intent.succeeded)
  ↓
PostgreSQL (更新订单状态为 paid)
  ↓
HubSpot Node (创建/更新 deal)
  ↓
SendGrid Node (发送确认邮件)
  ↓
Log to automation_logs
```

**Workflow 3: Status Update Automation**
```
Shippo Webhook Trigger (tracking_updated)
  ↓
Switch Node (根据 tracking_status.status 分支)
  ├─ TRANSIT → Twilio SMS + Email
  ├─ OUT_FOR_DELIVERY → Twilio SMS
  └─ DELIVERED → Twilio SMS + Email + HubSpot update
  ↓
PostgreSQL (更新 shipment status)
  ↓
Log to automation_logs
```

---

## Railway 部署方案（后续迁移）

> **注意：** 当前阶段先在本地开发，此部分为后续迁移Railway的准备说明

### 迁移兼容性设计原则

**1. 环境变量管理**
```bash
# .env.local (本地开发)
DATABASE_URL=postgresql://localhost:5432/logistics_demo
N8N_WEBHOOK_BASE=http://localhost:5678
NEXT_PUBLIC_API_URL=http://localhost:3001

# .env.production (Railway部署)
DATABASE_URL=${RAILWAY_POSTGRES_URL}
N8N_WEBHOOK_BASE=https://your-project.railway.app
NEXT_PUBLIC_API_URL=https://your-api.railway.app
```

**2. 数据库迁移**
- 使用 Prisma 或 TypeORM 管理 schema
- 迁移文件版本控制
- Railway 部署时自动运行 migrations

**3. Docker化准备**
```dockerfile
# 虽然本地开发不强制Docker，但准备好Dockerfile
# Railway支持从Dockerfile部署

# apps/frontend/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]

# apps/backend/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "run", "start:prod"]
```

**4. CORS配置**
```typescript
// NestJS main.ts
app.enableCors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
});
```

---

## 技术难点与解决方案

### 🔴 高难度

**1. Webhook 本地回调问题**
- **问题：** Stripe、Shippo 的 webhook 需要公网可访问 URL
- **临时方案：** 用 ngrok 暴露本地端口
  ```bash
  ngrok http 3001
  # 获得 https://xxxx.ngrok.io → 配置到第三方服务
  ```
- **替代方案：** 开发阶段改为手动触发 API，模拟 webhook 事件

**2. n8n Workflow 设计复杂度**
- **问题：** 3-4 个 workflow 涉及多节点编排、条件分支、错误处理
- **解决：**
  - 先设计最简单的 workflow 验证连通性
  - 用 n8n 的 Execute Workflow 节点模块化
  - 多用 Function 节点处理数据转换

**3. 第三方 API 集成与调试**
- **问题：** 6 个外部服务，每个有不同的认证、限额、错误码
- **解决：**
  - **优先级分级：**
    - P0: OpenAI（AI报价）、Shippo（物流核心）
    - P1: Stripe（支付）
    - P2: SendGrid（邮件）、HubSpot（CRM）
    - P3: Twilio（SMS，trial限制多）
  - 分阶段接入，不要一次全上

### 🟡 中等难度

**4. 实时日志展示**
- **方案1：** Server-Sent Events (SSE)
  ```typescript
  // NestJS
  @Get('logs/stream')
  streamLogs(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    // 推送日志事件
  }
  ```
- **方案2：** 短轮询（简单但不优雅）
  ```typescript
  // Next.js 前端每2秒轮询
  useEffect(() => {
    const interval = setInterval(() => fetchLogs(), 2000);
    return () => clearInterval(interval);
  }, []);
  ```

**5. 数据库迁移管理**
- **工具选择：** Prisma（推荐）或 TypeORM
- **Prisma 优势：** 类型安全、迁移简单、与 Next.js/NestJS 都兼容
  ```bash
  npx prisma migrate dev --name init
  npx prisma generate
  ```

**6. NestJS 调用 n8n**
- **实现：** 使用 `@nestjs/axios`
  ```typescript
  @Injectable()
  export class N8nService {
    async triggerQuote(data: QuoteRequestDto) {
      const url = `${process.env.N8N_WEBHOOK_BASE}/webhook/generate-quote`;
      return this.httpService.post(url, data).toPromise();
    }
  }
  ```

### 🟢 低难度

**7. Next.js Dashboard UI**
- **UI 框架：** shadcn/ui（Tailwind 组件库）
- **快速搭建：**
  ```bash
  npx shadcn-ui@latest init
  npx shadcn-ui@latest add button form table
  ```

**8. 测试码验证机制**
- **NestJS Guard：**
  ```typescript
  @Injectable()
  export class DemoTokenGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const request = context.switchToHttp().getRequest();
      const token = request.headers['x-demo-token'];
      // 验证逻辑
    }
  }
  ```

---

## 分阶段实施策略

### 阶段 0：环境准备（Day 1 上午）

**本地服务启动：**
```bash
# PostgreSQL (选择其一)
docker run --name postgres -e POSTGRES_PASSWORD=demo123 -p 5432:5432 -d postgres:15
# 或使用已有的 PostgreSQL

# n8n (如果没有运行)
docker run -d --name n8n \
  -p 5678:5678 \
  -e DB_TYPE=postgresdb \
  -e DB_POSTGRESDB_HOST=host.docker.internal \
  -e DB_POSTGRESDB_PORT=5432 \
  -e DB_POSTGRESDB_DATABASE=logistics_demo \
  -e DB_POSTGRESDB_USER=postgres \
  -e DB_POSTGRESDB_PASSWORD=demo123 \
  n8nio/n8n
```

**项目初始化：**
```bash
# 创建 monorepo 结构
mkdir -p CargoFlow/{apps/{frontend,backend},packages}

# Next.js 前端
cd apps/frontend
npx create-next-app@latest . --typescript --tailwind --app

# NestJS 后端
cd apps/backend
npm i -g @nestjs/cli
nest new .
```

**验收标准：**
- [ ] PostgreSQL 可连接
- [ ] n8n 可访问 http://localhost:5678
- [ ] Next.js 启动正常
- [ ] NestJS 启动正常

---

### 阶段 1：最小可行版本（Day 1 下午 - Day 2）

**目标：** 跑通 Next.js ↔ NestJS ↔ n8n 的完整链路

**数据库：**
```sql
-- 只建一张表
CREATE TABLE demo_shipments (
    id SERIAL PRIMARY KEY,
    from_address TEXT,
    to_address TEXT,
    weight DECIMAL,
    status VARCHAR(50),
    quote_amount DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT NOW()
);
```

**NestJS 后端：**
- 一个简单的 API：`POST /api/quotes`
- 调用 n8n webhook（硬编码 URL）
- 返回结果给前端

**n8n workflow：**
```
Webhook Trigger (POST /webhook/generate-quote)
  ↓
Function Node (mock AI 报价逻辑)
  ↓
PostgreSQL (插入 demo_shipments)
  ↓
Respond to Webhook (返回报价结果)
```

**Next.js 前端：**
- 一个表单（起运地、目的地、重量）
- 一个按钮（获取报价）
- 显示结果

**验收标准：**
- [ ] 表单提交 → 调用 NestJS API
- [ ] NestJS 调用 n8n webhook 成功
- [ ] n8n 返回 mock 报价
- [ ] 前端显示报价结果
- [ ] 数据写入数据库

**不做的事情：**
- ❌ 不接入真实 API（OpenAI、Shippo）
- ❌ 不做支付流程
- ❌ 不做实时日志

---

### 阶段 2：核心功能集成（Day 3 - Day 4）

**目标：** 接入真实 API，完成核心业务流程

**第三方服务注册：**
1. **OpenAI**（必需）
   - 注册获取 API key
   - 配置到 n8n 环境变量

2. **Shippo**（必需）
   - 注册 [goshippo.com](https://goshippo.com)
   - 获取 test token：`shippo_test_xxxxx`（在 portal.goshippo.com/api-keys）

3. **Stripe**（推荐）
   - 注册 test mode
   - 获取测试 key：`sk_test_xxxxx`

**完善数据库：**
```sql
-- 添加完整字段
ALTER TABLE demo_shipments ADD COLUMN shippo_object_id VARCHAR(100);
ALTER TABLE demo_shipments ADD COLUMN shippo_rate_id VARCHAR(100);
ALTER TABLE demo_shipments ADD COLUMN tracking_number VARCHAR(100);
ALTER TABLE demo_shipments ADD COLUMN ai_quote_details JSONB;

-- 新建测试码表
CREATE TABLE demo_tokens (
    code VARCHAR(20) PRIMARY KEY,
    customer_name VARCHAR(100),
    customer_email VARCHAR(100),
    max_shipments INT DEFAULT 10,
    used_shipments INT DEFAULT 0,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 新建日志表
CREATE TABLE automation_logs (
    id SERIAL PRIMARY KEY,
    shipment_id INT REFERENCES demo_shipments(id),
    action_type VARCHAR(50),
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**n8n workflows 升级：**

**Workflow 1: Quote Generation (真实版)**
```
Webhook Trigger
  ↓
OpenAI Node (调用 GPT-4，生成承运商推荐)
  ↓
HTTP Request Node (Shippo API - POST https://api.goshippo.com/shipments/)
  Authorization: ShippoToken shippo_test_xxxxx
  ↓
Function Node (解析 rates 列表，选最优价格)
  ↓
PostgreSQL (保存完整数据，含 shippo_object_id + rates)
  ↓
Respond to Webhook
```

**Workflow 2: Payment Processing**
```
Stripe Webhook Trigger (payment_intent.succeeded)
  ↓
PostgreSQL (更新订单状态为 paid)
  ↓
Function Node (写入 automation_logs)
  ↓
可选：SendGrid 发送确认邮件
```

**Workflow 3: Status Update (手动触发版)**
```
Webhook Trigger (POST /webhook/update-status)
  ↓
Switch Node (根据状态分支)
  ├─ in_transit → 写日志 "货物运输中"
  ├─ out_for_delivery → 写日志 "即将送达"
  └─ delivered → 写日志 "已送达"
  ↓
PostgreSQL (更新 shipment + 写 automation_logs)
```

**前端新增：**
- 订单列表展示（从数据库读取）
- "推进状态" 按钮（手动触发）
- 自动化日志显示（从 automation_logs 读取）

**验收标准：**
- [ ] AI 报价返回真实价格和建议
- [ ] Shippo 创建 shipment 并返回费率成功
- [ ] Stripe 支付流程可走通（test mode）
- [ ] 手动推进状态触发日志记录
- [ ] 前端显示完整订单流程

**不做的事情：**
- ❌ 不做 SMS 通知（Twilio trial 限制多）
- ❌ 不做 HubSpot CRM 同步（优先级低）
- ❌ 不做实时 webhook（用手动触发代替）

---

### 阶段 3：完整集成（Day 5 - Day 6，可选）

**目标：** 接入所有第三方服务，实现完整自动化

**新增服务：**
1. **SendGrid**（邮件通知）
   - 注册 free tier
   - 配置发件人域名验证
   - n8n 添加邮件通知节点

2. **HubSpot**（CRM 同步）
   - 注册 free CRM
   - 获取 API key
   - n8n 创建 Contact 和 Deal

3. **Twilio**（SMS 通知）
   - 注册 trial 账号
   - 验证接收手机号
   - n8n 发送 SMS 节点

**实时日志：**
- 实现 SSE 或 WebSocket
- n8n 每次自动化执行后推送日志事件
- 前端实时显示

**ngrok 配置：**
```bash
# 暴露本地 NestJS 端口
ngrok http 3001

# 获得公网 URL，配置到：
# - Stripe webhook endpoint
# - Shippo webhook endpoint（在 portal.goshippo.com/webhooks 配置）
```

**完整 Workflow 3：**
```
Shippo Webhook Trigger (tracking_updated)
  ↓
Switch Node (根据 tracking_status.status 分支)
  ├─ TRANSIT
  │   ├─ Twilio SMS
  │   ├─ SendGrid Email
  │   └─ HubSpot 更新 Deal
  ├─ OUT_FOR_DELIVERY
  │   └─ Twilio SMS
  └─ DELIVERED
      ├─ Twilio SMS + Email
      └─ HubSpot 更新 Deal 状态为 Won
  ↓
PostgreSQL (写日志)
```

**验收标准：**
- [ ] 支付成功自动发送确认邮件
- [ ] 状态变更触发 SMS 和邮件
- [ ] HubSpot 自动同步订单数据
- [ ] Dashboard 实时显示所有自动化日志

---

## 开发工作量估算（本地实现）

### 最小化版本（阶段 0 + 阶段 1）

| 模块 | 工作量 | 说明 |
|------|--------|------|
| 环境搭建 | 2h | PostgreSQL + n8n + 项目初始化 |
| 数据库设计 | 1h | 建表、写迁移脚本 |
| NestJS 基础 | 4h | 模块、Controller、Service |
| Next.js 基础 | 4h | 页面、表单、API 调用 |
| n8n workflow | 2h | 简单 workflow 验证连通性 |
| 联调测试 | 2h | 端到端测试 |
| **总计** | **15h** | 约 2 工作日 |

### 完整版本（阶段 0-2）

| 模块 | 工作量 | 说明 |
|------|--------|------|
| 阶段 0-1 | 15h | 见上 |
| 第三方 API 注册 | 3h | OpenAI + Shippo + Stripe |
| 完整数据库 | 2h | 3 张表 + 完整字段 |
| NestJS 功能完善 | 6h | 测试码验证、订单管理 API |
| Next.js 功能完善 | 6h | 订单列表、状态推进、日志展示 |
| n8n workflows | 6h | 3 个完整 workflow |
| 联调调试 | 4h | 端到端测试、bug 修复 |
| **总计** | **42h** | 约 5-6 工作日 |

### 全功能版本（阶段 0-3）

| 额外模块 | 工作量 | 说明 |
|----------|--------|------|
| 阶段 0-2 | 42h | 见上 |
| SendGrid + Twilio + HubSpot | 4h | 注册、配置、测试 |
| ngrok + webhook 调试 | 3h | 配置外部 webhook |
| 实时日志 SSE | 4h | NestJS 推送 + Next.js 订阅 |
| 全流程测试 | 3h | 所有自动化验证 |
| **总计** | **56h** | 约 7 工作日 |

---

## 推荐实施路径

**方案 A：快速验证（推荐）**
- 只做阶段 0-1（2 天）
- 验证技术可行性，展示基础 demo
- 后续根据反馈决定是否深入

**方案 B：完整核心功能**
- 做阶段 0-2（5-6 天）
- 有真实 API 集成，可演示完整流程
- 适合作为正式 demo 交付

**方案 C：全功能版本**
- 做阶段 0-3（7 天）
- 所有自动化全部实现
- 适合准备投入生产或深度演示

建议：**先做方案 A，验证可行后再决定是否推进到方案 B/C。**

---

## 风险与应对

### 风险 1: 本地 Webhook 回调限制

**问题：** 第三方服务无法直接回调本地服务

**应对：**
- **开发阶段：** 用手动触发 API 模拟 webhook 事件
- **演示阶段：** 使用 ngrok 暴露本地端口
- **生产部署：** Railway 提供公网 URL，问题自然解决

### 风险 2: Twilio Trial 限制

**问题：** 只能发送到已验证号码

**应对：**
- 开发阶段跳过 SMS 功能，用日志记录代替
- 演示时预先验证接收号码
- 或提供"模拟 SMS"功能（显示内容但不真发）

### 风险 3: API Rate Limit

**问题：** 免费 tier 有请求限制

**应对：**
- 测试码限制最大订单数（10个/码）
- 设置过期时间（7天）
- 监控 API 使用量
- Demo 级别调用量通常不会触发限额

### 风险 4: 技术栈学习曲线

**问题：** 如果团队不熟悉 NestJS 或 n8n

**应对：**
- 先用最简单的实现验证可行性（阶段 1）
- n8n 有可视化界面，学习成本较低
- NestJS 模块化结构清晰，文档完善
- 必要时可降级为 Express.js + React

---

## 总结

### 核心优势

✅ **技术栈现代化** - Next.js + NestJS 全栈 TypeScript，易维护
✅ **真实 API 集成** - 使用测试凭证，但体验完全真实
✅ **低成本验证** - 阶段 1 只需 2 天，快速验证可行性
✅ **渐进式开发** - 分阶段推进，每阶段都有可交付成果
✅ **Railway 兼容** - 预留迁移设计，后续平滑上线
✅ **n8n 可视化** - 非技术人员也能理解和维护 workflow

### 关键决策点

**现在需要决定：**
1. 选择哪个实施路径（方案 A/B/C）？
2. 是否需要所有第三方 API 集成？
3. 数据库用 Prisma 还是 TypeORM？
4. UI 框架用 shadcn/ui 还是 Ant Design？

**建议先行动：**
- 启动阶段 0（环境准备）
- 完成阶段 1（最小可行版本）
- 根据演示效果决定是否深入阶段 2/3

适合作为技术验证和 demo 交付，既展示了 n8n 自动化能力，又保持了架构的可扩展性。
