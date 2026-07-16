# CargoFlow Slack 集成 - 快速安装文档

## 本次更新内容

在现有的两个 workflow 中加入了 Slack 团队通知，并优化了 GHL 联系人创建逻辑。

### purchase-label workflow 新增/优化节点（7个）

```
... (原有节点) ...
Log Airtable
    ↓
GHL - Build Contact Data       ← 准备联系人数据
    ↓
GHL - Find Contact             ← 用 email 查找联系人
    ↓
GHL - Check If Exists          ← 判断联系人是否存在
    ↓
GHL - If Exists                ← 条件分支
    ├─ (exists) → GHL - Update Contact    ← 存在则更新联系人
    └─ (new) → GHL - Create Contact       ← 不存在则创建新联系人
    ↓
GHL - Build Note Data          ← 合并结果，准备备注
    ↓
GHL - Add Note                 ← 添加订单备注
    ↓
Log GHL
    ↓
Slack - Build Message          ← 构建新订单通知消息
    ↓
Slack - Send Notification      ← 发送到 Slack 频道
    ↓
Format Response
    ↓
Respond to Webhook
```

**关键优化**：
- **Upsert 逻辑**：先查找联系人，存在则更新，不存在则创建
- **避免重复错误**：不再报 "duplicated contact" 错误
- **保留历史数据**：更新时保留联系人的历史订单、备注、互动记录

**触发时机**：客户购买标签成功后

**通知内容**：
- 订单编号
- 客户姓名、邮箱
- 路线（from → to）
- 承运商 + 服务
- 金额
- 追踪号

### tracking-webhook workflow 新增节点（2个）

```
... (原有节点) ...
Log Delivered Notification
    ↓
Slack - Build Delivered Message  ← 构建签收通知消息
    ↓
Slack - Send Delivered           ← 发送到 Slack 频道
    ↓
GHL - Build Tag Data
    ↓
...
```

**触发时机**：包裹签收（DELIVERED）后

**通知内容**：
- 订单编号
- 客户姓名、邮箱
- 追踪号
- 状态（DELIVERED）

---

## 安装步骤

### 第一步：创建 Slack Incoming Webhook

1. 访问 https://api.slack.com/messaging/webhooks
2. 点击 **Create your Slack app** → **From scratch**
3. 填写 App Name（如 `CargoFlow Notifications`），选择 workspace
4. 左侧菜单选择 **Incoming Webhooks**
5. 开启 **Activate Incoming Webhooks**
6. 点击 **Add New Webhook to Workspace**
7. 选择要发送通知的频道（如 `#orders`、`#notifications`）
8. 复制生成的 Webhook URL，格式：
   ```
   https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
   ```

### 第二步：配置环境变量

#### 本地开发（Docker n8n）

在 n8n 的 `.env` 文件中添加：

```bash
# /Users/lindediannao/Documents/project/n8n/self-hosted-ai-starter-kit/.env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

**重启 n8n 容器**（必须用 `up -d`，不能用 `restart`）：

```bash
cd /Users/lindediannao/Documents/project/n8n/self-hosted-ai-starter-kit
docker compose up -d n8n
```

验证环境变量已加载：

```bash
docker exec -it n8n printenv | grep SLACK
# 应该输出: SLACK_WEBHOOK_URL=https://hooks.slack.com/...
```

#### Railway 部署

在 Railway n8n 服务中：
1. 进入 n8n 服务 → **Variables**
2. 添加：
   - Key: `SLACK_WEBHOOK_URL`
   - Value: `https://hooks.slack.com/services/YOUR/WEBHOOK/URL`
3. Railway 会自动重新部署

### 第三步：导入更新后的 Workflow

#### purchase-label.json（必须更新）

1. 打开 n8n（http://localhost:5678）
2. 找到 **CargoFlow - Purchase Label** workflow
3. 右上角 **...** → **Delete**
4. 点击 **+** → **Import from file**
5. 选择 `docs/n8n-workflows/purchase-label.json`
6. 导入后，检查新增的两个节点：
   - `Slack - Build Message`
   - `Slack - Send Notification`
7. 点击 **Save**，再点击 **Activate**

#### tracking-webhook.json（必须更新）

1. 找到 **CargoFlow - Tracking Webhook** workflow
2. 删除旧的，导入 `docs/n8n-workflows/tracking-webhook.json`
3. 检查新增的两个节点：
   - `Slack - Build Delivered Message`
   - `Slack - Send Delivered`
4. 如果之前已配置 GHL 凭据，需要重新关联：
   - `GHL - Find Contact` → 选择 `GHL API` 凭据
   - `GHL - Update Tag` → 选择 `GHL API` 凭据
5. **Save** + **Activate**

### 第四步：测试

#### 测试新订单通知

1. 前端提交一笔完整订单（报价 → 购买标签）
2. 检查 Slack 频道，应该收到消息：
   ```
   📦 New Order - Label Purchased

   Shipment ID: #123
   Customer: John Smith
   Email: john@example.com
   Route: New York → Los Angeles
   Carrier: USPS Priority Mail
   Amount: $12.50
   Tracking: 9400111899562537849142
   ```

#### 测试签收通知

1. 前端点击 **Simulate Tracking** → 选择 **DELIVERED**
2. 检查 Slack 频道，应该收到消息：
   ```
   ✅ Package Delivered

   Shipment ID: #123
   Customer: John Smith
   Email: john@example.com
   Tracking: 9400111899562537849142
   Status: DELIVERED
   ```

#### 检查 n8n 执行日志

1. n8n → **Executions**
2. 找到最近的 workflow 执行
3. 确认新增节点都是绿色：
   - Slack - Build Message ✓
   - Slack - Send Notification ✓

---

## Railway 部署注意事项

1. 在 Railway n8n 服务 → **Variables** 添加 `SLACK_WEBHOOK_URL`
2. Railway 会自动重新部署，无需手动重启
3. 重新导入 workflow 并激活

---

## 消息格式自定义

如果想修改 Slack 消息格式，编辑以下节点：

### purchase-label - 新订单消息

节点：`Slack - Build Message`

```javascript
const message = `:package: *New Order - Label Purchased*\\n\\n` +
  `*Shipment ID:* #${ghlData.shipmentId}\\n` +
  `*Customer:* ${ghlData.firstName} ${ghlData.lastName}\\n` +
  `*Email:* ${ghlData.email}\\n` +
  `*Route:* ${ghlData.fromAddress} → ${ghlData.toAddress}\\n` +
  `*Carrier:* ${ghlData.carrier} ${ghlData.serviceName}\\n` +
  `*Amount:* $${ghlData.amount}\\n` +
  `*Tracking:* ${transaction.trackingNumber}`;
```

### tracking-webhook - 签收消息

节点：`Slack - Build Delivered Message`

```javascript
const message = `:white_check_mark: *Package Delivered*\\n\\n` +
  `*Shipment ID:* #${checkData.shipmentId}\\n` +
  `*Customer:* ${checkData.senderName}\\n` +
  `*Email:* ${checkData.senderEmail}\\n` +
  `*Tracking:* ${checkData.trackingNumber}\\n` +
  `*Status:* DELIVERED`;
```

可以修改：
- Emoji（`:package:`, `:white_check_mark:`）
- 字段顺序
- 添加/删除字段
- 文案（如改成中文）

---

## 错误排查

| 现象 | 可能原因 | 解决 |
|------|---------|------|
| Slack 节点报 404 | Webhook URL 错误 | 检查 URL 格式，确保完整复制 |
| Slack 节点报 400 | 消息格式错误 | 检查 JSON 格式，确保 `text` 字段存在 |
| Slack 收不到消息 | 环境变量未加载 | 用 `docker exec -it n8n printenv` 验证 |
| workflow 不触发 Slack | workflow 未激活或节点未连接 | 检查 workflow 右上角开关，检查节点连接 |
| 消息内容为空 | 上游节点数据缺失 | 在 `Slack - Build Message` 节点查看 INPUT 数据 |

---

## 扩展功能

### 添加更多通知场景

可以在以下场景添加 Slack 通知：

1. **包裹在途通知**（tracking-webhook 的 `If In Transit` 分支）
2. **报价生成通知**（需要新增 webhook）
3. **异常订单通知**（如 label 购买失败）

### 使用 Slack Block Kit

当前使用的是简单文本消息。如果需要更丰富的格式（按钮、图片、分栏），可以用 Slack Block Kit：

```json
{
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "📦 New Order"
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*Shipment ID:*\n#123"
        },
        {
          "type": "mrkdwn",
          "text": "*Customer:*\nJohn Smith"
        }
      ]
    }
  ]
}
```

参考：https://api.slack.com/block-kit

---

## 总结

✅ **purchase-label**: 新订单 → Slack 通知团队
✅ **tracking-webhook**: 包裹签收 → Slack 通知团队
✅ 使用 `$env.SLACK_WEBHOOK_URL` 环境变量，兼容本地和 Railway
✅ 全英文节点名称和字段，便于维护
