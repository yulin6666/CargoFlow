# 第三方服务配置指引

## 1. Stripe（支付）

**注册：** https://dashboard.stripe.com/register

**获取 Key：**
1. 登录后点左下角 **Developers → API keys**
2. 复制 **Publishable key**（`pk_test_...`）和 **Secret key**（`sk_test_...`）

**配置 Webhook（本地开发用 ngrok）：**
```bash
ngrok http 3001
# 拿到 https://xxxx.ngrok.io
```
1. Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://xxxx.ngrok.io/api/shipments/stripe-webhook`
3. Events: 选 `checkout.session.completed`
4. 复制 **Signing secret**（`whsec_...`）

**测试支付卡号：**
- 卡号: `4242 4242 4242 4242`
- 有效期: 任意未来日期
- CVC: 任意3位

**.env 填入：**
```
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

---

## 2. Resend（邮件通知）

**注册：** https://resend.com/signup（免费 3000 封/月，国内可注册）

**获取 API Key：**
1. 登录后点左侧 **API Keys → Create API Key**
2. 名称随便填（如 `CargoFlow`），权限选 **Sending access**
3. 复制 key（`re_xxxxxx`，只显示一次）

**发件域名（Demo 可跳过）：**
- 不配置自己域名时，默认用 `onboarding@resend.dev` 作为发件人
- 只能发到**你注册 Resend 用的邮箱**（测试限制）
- 演示 Demo 足够用

**.env 填入：**
```
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="onboarding@resend.dev"
```

**n8n Credential 配置（Resend API Key）：**
- Type: **Header Auth**
- Name: `Resend API Key`
- Header Name: `Authorization`
- Header Value: `Bearer re_你的key`

**n8n 环境变量：**
```
RESEND_FROM_EMAIL=onboarding@resend.dev
```

---

## 3. Twilio（SMS 通知）

**注册：** https://www.twilio.com/try-twilio（免费 $15 credit）

**获取凭证：**
1. 登录 Console → Account Info 区域
2. 复制 **Account SID** 和 **Auth Token**
3. Phone Numbers → Manage → Active numbers → 复制分配的号码

**Trial 账号限制：**
- 只能发到"已验证"的号码
- 验证方式：Console → Phone Numbers → Verified Caller IDs → Add

**.env 填入：**
```
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your_auth_token"
TWILIO_PHONE_NUMBER="+15005550006"  # 你的 Twilio 号码
```

**n8n Credential 配置（Twilio Basic Auth）：**
- Type: **HTTP Basic Auth**
- Name: `Twilio Basic Auth`
- User: `你的 Account SID`
- Password: `你的 Auth Token`

**n8n 环境变量（在 n8n 的 .env 或容器环境中设置）：**
```
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_PHONE_NUMBER=+15005550006
```

---

## 4. Airtable（CRM/数据存储）

**注册：** https://airtable.com/signup（免费，国内可访问）

**创建 Base（数据库）：**
1. 登录后点 **Create a base** → Start from scratch
2. 命名为 `CargoFlow CRM`

**创建两个 Table：**

**Table 1: Contacts（联系人表）**
- 点左侧 `Table 1` → Rename → `Contacts`
- 字段（列）：
  - `Name`（默认已有，类型: Single line text）
  - 点 `+` 添加：`Email`（类型: Email）
  - 点 `+` 添加：`Phone`（类型: Phone number）

**Table 2: Orders（订单表）**
- 点左下角 `+ Add or import` → Create empty table
- 命名为 `Orders`
- 字段：
  - `Shipment ID`（类型: Number）
  - `Amount`（类型: Number，格式选 Currency - USD）
  - `Route`（类型: Single line text）
  - `Carrier`（类型: Single line text）
  - `Date`（类型: Date）
  - `Customer Email`（类型: Email）

**获取 API Key 和 Base ID：**
1. 点右上角头像 → **Developer hub**
2. Personal access tokens → **Create token**
   - Name: `CargoFlow`
   - Scopes（权限）勾选：
     - `data.records:read`
     - `data.records:write`
     - `schema.bases:read`
   - Access（访问范围）→ Add a base → 选择 `CargoFlow CRM`
   - Create token → 复制 token（`patXXXX...`）
3. 获取 Base ID：
   - 打开你的 Base → 浏览器地址栏看 URL
   - 格式：`https://airtable.com/appXXXXXXXXXXXXXX/...`
   - 复制 `appXXXXXXXXXXXXXX` 这部分

**.env 填入：**
```
AIRTABLE_API_KEY="patXXXX..."
AIRTABLE_BASE_ID="appXXXX..."
```

**n8n Credential 配置（Airtable Token API）：**
- Type: **Airtable Token API**（n8n 原生支持，不需要用 HTTP Request）
- Name: `Airtable API`
- Access Token: `patXXXX...`

**n8n Workflow 配置：**
- 导入 workflow 后，在 `Airtable - Add Contact` 和 `Airtable - Add Order` 两个节点中：
  - Base: 下拉选择 `CargoFlow CRM`
  - Table: 分别选择 `Contacts` 和 `Orders`

---

## n8n 环境变量配置

n8n 的 HTTP Request 节点中用 `$env.VAR_NAME` 读取环境变量。
需要在 n8n 容器中设置以下环境变量：

```bash
# 重启 n8n 容器并注入环境变量
docker stop n8n && docker rm n8n

docker run -d --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  -e RESEND_FROM_EMAIL="onboarding@resend.dev" \
  -e TWILIO_ACCOUNT_SID="ACxxx" \
  -e TWILIO_PHONE_NUMBER="+15005550006" \
  n8nio/n8n
```

---

## 需要重新导入的 n8n Workflows

以下两个 workflow 已更新，需要在 n8n 中删除旧版并重新导入：

1. `docs/n8n-workflows/payment-processing.json`
   - 新增：SendGrid 支付确认邮件
   - 新增：HubSpot 创建 Contact + Deal

2. `docs/n8n-workflows/tracking-webhook.json`
   - 新增：Twilio SMS 状态通知
   - 新增：SendGrid 物流状态邮件

---

## 完整流程说明

```
1. 用户创建报价 → Shippo API 获取费率
2. 用户点击"模拟支付" → 后端触发 n8n payment webhook
3. n8n 更新订单状态为 paid，自动触发：
   ├── Resend 发送支付确认邮件
   └── Airtable 记录联系人 + 订单数据
4. 物流更新（Shippo webhook / 手动触发）→ n8n 处理：
   ├── Twilio 发 SMS 通知
   └── Resend 发物流状态邮件
```

---

## 快速测试（不需要真实 API Key）

对于 Demo 展示，可以跳过 Stripe webhook 配置，直接手动触发 n8n webhook：

```bash
# 模拟支付成功
curl -X POST http://localhost:5678/webhook/stripe-payment-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment_intent.succeeded",
    "data": {
      "object": {
        "id": "pi_test_123",
        "amount": 1250,
        "currency": "usd",
        "receipt_email": "test@example.com",
        "metadata": { "shipment_id": "1", "customer_email": "test@example.com" }
      }
    }
  }'

# 模拟物流状态更新
curl -X POST http://localhost:5678/webhook/shippo-tracking-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "tracking_number": "你的tracking号",
      "status": "TRANSIT",
      "carrier": "usps"
    }
  }'
```
