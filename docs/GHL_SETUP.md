# GoHighLevel (GHL) 接入配置教程

## 目录

1. [GHL 账号准备](#1-ghl-账号准备)
2. [获取 API Key 和 Location ID](#2-获取-api-key-和-location-id)
3. [在 n8n 中配置 GHL 凭据](#3-在-n8n-中配置-ghl-凭据)
4. [导入更新后的 Workflow](#4-导入更新后的-workflow)
5. [验证集成是否正常](#5-验证集成是否正常)
6. [常见问题](#6-常见问题)

---

## 1. GHL 账号准备

GoHighLevel（简称 GHL，也叫 HighLevel）是一个 CRM + 营销自动化平台。

如果还没有账号：
- 官网：https://www.gohighlevel.com
- 注册试用即可（14 天免费）
- 注册后会自动创建一个 **Sub-Account（子账号）**，这就是你的 **Location**

登录后界面：左侧选择你的 Sub-Account，进入 Location 控制台。

---

## 2. 获取 API Key 和 Location ID

### 2.1 获取 Location ID

1. 登录 GHL，进入 Sub-Account 控制台
2. 点击左下角 **Settings**（设置）
3. 选择 **Business Profile**（或 Business Info）
4. 页面 URL 中可以看到 Location ID，格式类似：
   ```
   https://app.gohighlevel.com/location/xxxxxxxxxxxxxxxxxxx/settings/profile
   ```
   中间那段 `xxxxxxxxxxxxxxxxxxx` 就是 **Location ID**

也可以在 **Settings → Integrations → API** 页面看到。

### 2.2 获取 Private Integration API Key

GHL 有两种 API Key，这里使用 **Private Integration Key**（推荐，权限更稳定）：

1. 在 Sub-Account 控制台，点击左下角 **Settings**
2. 找到 **Integrations**
3. 点击 **API Keys**（或 Private Integrations）
4. 点击 **Create API Key**（或 Add Key）
5. 填写名称：`CargoFlow Integration`
6. 权限选择：
   - ✅ Contacts（Read + Write）
   - ✅ Notes（Read + Write）
   - ✅ Tags（Read + Write）
7. 点击 **Save / Create**
8. 复制生成的 API Key（只显示一次，请立即保存）

> ⚠️ **注意**：不要使用 Agency 级别的 API Key，要用 Location（Sub-Account）级别的。

---

## 3. 在 n8n 中配置 GHL 凭据

### 3.1 打开 n8n

本地访问：http://localhost:5678
Railway 部署后访问你的 n8n URL。

### 3.2 创建 HTTP Header Auth 凭据

1. 点击右上角 **Settings** → **Credentials**
2. 点击 **+ Add Credential**
3. 搜索并选择 **HTTP Header Auth**
4. 填写：

   | 字段 | 值 |
   |------|-----|
   | **Credential Name** | `GHL API` |
   | **Header Name** | `Authorization` |
   | **Header Value** | `Bearer 你的GHL-API-Key` |

   > ⚠️ `Bearer` 后面有一个空格，然后紧跟 API Key

5. 点击 **Save**

### 3.3 配置 GHL_LOCATION_ID 环境变量

`tracking-webhook` 中查询联系人时需要 `locationId`。

**本地开发**：在项目根目录 `.env` 文件添加：
```
GHL_LOCATION_ID=你的Location-ID
```

**Railway 部署**：在 n8n 服务的环境变量中添加：
```
GHL_LOCATION_ID=你的Location-ID
```

n8n 中通过 `$env.GHL_LOCATION_ID` 读取该变量。

---

## 4. 导入更新后的 Workflow

### 4.1 更新 purchase-label workflow

该 workflow 在标签购买成功后，自动在 GHL 创建/更新联系人并添加订单备注。

**步骤**：
1. 打开 n8n，找到现有的 **CargoFlow - Purchase Label** workflow
2. 删除旧的 workflow（或在 n8n 中直接导入会提示覆盖）
3. 点击 **+** → **Import from file**
4. 选择 `docs/n8n-workflows/purchase-label.json`
5. 导入后，找到以下两个节点，手动关联凭据：
   - **GHL - Create Contact** → 选择 `GHL API`
   - **GHL - Add Note** → 选择 `GHL API`
6. 点击 **Save**，再点击右上角开关 **Activate**

### 4.2 更新 tracking-webhook workflow

该 workflow 在包裹状态变更（DELIVERED / TRANSIT）时，自动给 GHL 联系人打 tag。

**步骤**：
1. 找到现有的 **CargoFlow - Tracking Webhook** workflow
2. 删除旧的，导入 `docs/n8n-workflows/tracking-webhook.json`
3. 找到以下两个节点，手动关联凭据：
   - **GHL - Find Contact** → 选择 `GHL API`
   - **GHL - Update Tag** → 选择 `GHL API`
4. **Save** + **Activate**

---

## 5. 验证集成是否正常

### 5.1 测试 purchase-label 流程

1. 打开前端 http://localhost:3000
2. 填写报价（姓名、邮箱、电话必填）
3. 选择运输方案 → 购买标签
4. 登录 GHL，进入 **Contacts**
5. 搜索你填写的邮箱
6. ✅ 应该看到新建的联系人，带有 tag：`cargoflow-customer`、`label-purchased`
7. 点进联系人 → **Notes** 标签，✅ 应该看到一条备注：
   ```
   Shipment #123 | New York → Los Angeles | USPS Priority Mail | $7.33 | Tracking: 940011... | Date: 2026-07-14
   ```

### 5.2 测试 tracking-webhook 流程

1. 在前端找到一个已购买标签的订单
2. 点击 **Simulate Tracking** → 选择 **DELIVERED**
3. 登录 GHL → 找到对应联系人
4. 查看 **Tags** 标签，✅ 应该看到新增 tag：`delivered`

### 5.3 查看 n8n 执行日志

1. 打开 n8n → 左侧 **Executions**
2. 找到最近执行的 workflow
3. 检查以下节点都是绿色：
   - GHL - Build Contact Data ✓
   - GHL - Create Contact ✓
   - GHL - Build Note Data ✓
   - GHL - Add Note ✓
   - Log GHL ✓

### 5.4 查询数据库日志

```sql
SELECT shipment_id, action_type, details, created_at
FROM automation_logs
WHERE action_type = 'ghl_synced'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 6. 常见问题

**Q: 报错 401 Unauthorized**

API Key 有问题，检查：
- n8n 凭据中的 Header Value 格式是否为 `Bearer xxx`（注意空格）
- 是否用了 Location 级别的 Key（不是 Agency 级别）
- Key 是否已过期或被删除

**Q: 报错 422 Unprocessable Entity**

请求体字段格式有误，最常见原因：
- `phone` 字段格式不符合 GHL 要求，建议加国家码，如 `+16505550100`
- `email` 字段为空

**Q: Contact 创建成功，但 Note 没有添加**

GHL - Add Note 节点的 URL 是动态的，依赖 contactId。检查：
- `GHL - Build Note Data` 节点中的 `contactId` 是否有值
- 如果 contactId 为 null，Note 接口会 404

**Q: GHL - Find Contact 返回空结果**

- 确认 `GHL_LOCATION_ID` 环境变量已正确配置
- 确认查询的 email 是注册过的联系人
- 如果是第一次跑 tracking-webhook，purchase-label 必须先跑过一次才能找到联系人

**Q: Railway 部署后如何更新环境变量**

1. 进入 Railway 项目
2. 点击 n8n 服务
3. **Variables** 标签 → 添加 `GHL_API_KEY` 和 `GHL_LOCATION_ID`
4. Railway 会自动重新部署

**Q: 想给不同状态打不同的 tag 怎么办**

修改 `tracking-webhook.json` 中 `GHL - Build Tag Data` 节点的 statusMap：

```javascript
const statusMap = {
  DELIVERED: 'delivered',
  TRANSIT: 'in-transit',
  OUT_FOR_DELIVERY: 'out-for-delivery',
  RETURNED: 'returned',   // 可以自由添加
};
```

---

## 附录：GHL API 接口说明

本集成使用 GHL API v2（LeadConnectorHQ）：

| 操作 | 方法 | 接口 |
|------|------|------|
| 创建联系人 | POST | `https://services.leadconnectorhq.com/contacts/` |
| 搜索联系人 | GET | `https://services.leadconnectorhq.com/contacts/?email=xxx&locationId=xxx` |
| 添加备注 | POST | `https://services.leadconnectorhq.com/contacts/{id}/notes` |
| 添加 Tag | POST | `https://services.leadconnectorhq.com/contacts/{id}/tags` |

所有请求需要附加 Header：
```
Authorization: Bearer {API_KEY}
Version: 2021-07-28
```
