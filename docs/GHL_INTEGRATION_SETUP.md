# CargoFlow GHL 集成 - 快速安装文档

## 本次更新内容

在现有的两个 workflow 中加入了 GoHighLevel CRM 自动同步：

### purchase-label workflow 新增节点（5个）

```
... (原有节点) ...
Log Airtable
    ↓
GHL - Build Contact Data   ← 准备联系人数据（拆分姓名、整理字段）
    ↓
GHL - Create Contact       ← 调用 GHL API 创建联系人，自动打 tag
    ↓
GHL - Build Note Data      ← 提取 contactId，准备备注内容
    ↓
GHL - Add Note             ← 在联系人下添加订单详情备注
    ↓
Log GHL                    ← 写入数据库日志
    ↓
Format Response
    ↓
Respond to Webhook
```

触发时机：客户购买标签成功后

GHL 操作：
- 创建联系人（firstName / lastName / email / phone）
- 自动打 tag：`cargoflow-customer`、`label-purchased`
- 添加订单备注（路线、承运商、金额、追踪号）

### tracking-webhook workflow 新增节点（5个）

```
... (原有节点) ...
Log Delivered Notification
    ↓
GHL - Build Tag Data       ← 根据物流状态确定 tag 名称
    ↓
GHL - Find Contact         ← 用 email 查找 GHL 联系人
    ↓
GHL - Extract Contact ID   ← 提取 contactId（找不到则跳过）
    ↓
GHL - If Contact Found     ← 判断是否找到联系人
    ↓ (yes)
GHL - Update Tag           ← 给联系人打状态 tag（delivered / in-transit）
    ↓
Respond Success
```

触发时机：包裹签收（DELIVERED）后

GHL 操作：给对应联系人打 tag `delivered`，可在 GHL 中配置自动化（如发送好评请求）

---

## 安装步骤

### 第一步：获取 GHL 凭据

需要两个信息：
1. **API Key**：GHL Sub-Account → Settings → Integrations → API Keys → 新建
2. **Location ID**：GHL Sub-Account → Settings → Business Profile，URL 中获取

详细步骤见 [GHL_SETUP.md](./GHL_SETUP.md)

### 第二步：配置 n8n 凭据

在 n8n（http://localhost:5678）中：
1. Settings → Credentials → Add Credential → **HTTP Header Auth**
2. 填写：
   - Name: `GHL API`
   - Header Name: `Authorization`
   - Header Value: `Bearer 你的API-Key`（Bearer 后有空格）
3. Save

### 第三步：配置环境变量

在项目根目录 `.env` 文件中添加：

```bash
GHL_API_KEY="你的GHL-API-Key"
GHL_LOCATION_ID="你的Location-ID"
```

Railway 部署同样在 n8n 服务的 Variables 中添加这两个变量。

### 第四步：导入 Workflow

**purchase-label.json**（必须更新）：
1. n8n 中删除旧的 `CargoFlow - Purchase Label`
2. Import from file → `docs/n8n-workflows/purchase-label.json`
3. 找到 `GHL - Create Contact` 和 `GHL - Add Note` 节点，关联 `GHL API` 凭据
4. Save + Activate

**tracking-webhook.json**（可选，用于送达后打 tag）：
1. n8n 中删除旧的 `CargoFlow - Tracking Webhook`
2. Import from file → `docs/n8n-workflows/tracking-webhook.json`
3. 找到 `GHL - Find Contact` 和 `GHL - Update Tag` 节点，关联 `GHL API` 凭据
4. Save + Activate

### 第五步：测试

1. 前端提交一笔完整订单（报价 → 购买标签）
2. 登录 GHL → Contacts，搜索提交的邮箱，确认联系人和备注已创建
3. 查看 n8n Executions，确认所有 GHL 节点绿色
4. 查询数据库确认日志：
   ```sql
   SELECT * FROM automation_logs WHERE action_type = 'ghl_synced';
   ```

---

## Railway 部署注意事项

Railway 上 n8n 的环境变量通过 `$env.变量名` 读取，已在 workflow 中配置好。

部署后需要：
1. 在 Railway n8n 服务 → Variables 添加 `GHL_LOCATION_ID`
2. 在 n8n 控制台重新配置 `GHL API` 凭据（Railway 部署不会自动迁移 n8n 的 Credentials）
3. 重新导入 workflow 并关联凭据

---

## 数据映射

### purchase-label → GHL Contact

| CargoFlow 字段 | GHL 字段 | 说明 |
|--------------|---------|------|
| senderName（第一个词）| firstName | 名 |
| senderName（其余）| lastName | 姓 |
| senderEmail | email | 邮箱（唯一标识） |
| senderPhone | phone | 电话 |
| 固定值 | tags | `cargoflow-customer`, `label-purchased` |
| 固定值 | source | `CargoFlow` |

### purchase-label → GHL Note

```
Shipment #123 | New York → Los Angeles | USPS Priority Mail | $7.33 | Tracking: 9400... | Date: 2026-07-14
```

### tracking-webhook → GHL Tag

| 物流状态 | GHL Tag |
|---------|---------|
| DELIVERED | `delivered` |
| TRANSIT | `in-transit` |
| OUT_FOR_DELIVERY | `out-for-delivery` |

---

## 错误排查

| 现象 | 可能原因 | 解决 |
|------|---------|------|
| GHL 节点报 401 | API Key 错误或格式错误 | 检查 Header Value 是否为 `Bearer xxx` |
| GHL 节点报 422 | 字段格式不对 | 检查 phone 格式，空 email 也会触发 |
| Note 接口报 404 | contactId 为 null | 检查 GHL - Build Note Data 的输出 |
| 找不到联系人 | locationId 未配置 | 确认 `GHL_LOCATION_ID` 环境变量已设置 |
| workflow 不触发 | workflow 未激活 | n8n 中确认 workflow 右上角开关为 active |
