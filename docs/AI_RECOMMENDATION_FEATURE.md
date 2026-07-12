# AI 智能承运商推荐功能

## 功能概述

在报价生成流程中，AI 会综合考虑价格、时效、承运商可靠性等因素，自动给出最优承运商推荐及理由。

## 实现位置

### 1. 数据库层 (Database Schema)

**文件**: `packages/database/schema.prisma`

添加了新字段 `aiRecommendation`:
```prisma
model DemoShipment {
  // ...existing fields...
  aiRecommendation String?   @map("ai_recommendation") @db.Text
  // ...
}
```

**Migration**: `20260712122000_add_ai_recommendation/migration.sql`

### 2. n8n 工作流 (Workflow)

**文件**: `docs/n8n-workflows/quote-generation-stage1.json`

**新增节点**:

1. **AI Carrier Recommendation** (位置: Parse Shippo Rates 之后)
   - 类型: HTTP Request
   - 功能: 调用 OpenAI API
   - 输入: 所有 rates 数据
   - 输出: AI 推荐理由

2. **Parse AI Response**
   - 类型: Code Node
   - 功能: 提取 AI 响应内容
   - 输出: 包含 aiRecommendation 的完整数据

**工作流顺序**:
```
Webhook
  → Prepare Shippo Request
  → Shippo - Create Shipment
  → Parse Shippo Rates
  → AI Carrier Recommendation (新增) ⭐
  → Parse AI Response (新增) ⭐
  → PostgreSQL
  → Format Response
  → Respond to Webhook
```

### 3. 前端 (Frontend)

**文件**: `apps/frontend/src/app/page.tsx`

**接口更新**:
```typescript
interface QuoteResult {
  // ...existing fields...
  aiRecommendation?: string;
}

interface Shipment {
  // ...existing fields...
  aiRecommendation: string | null;
}
```

**UI 展示位置**:

1. **报价结果页面** (Quote Results)
   - 显示在 rates 列表上方
   - 蓝色渐变背景框
   - 🤖 图标标识

2. **订单卡片** (ShipmentCard)
   - 显示在价格信息下方
   - 简洁的蓝色背景框
   - 紧凑布局

### 4. 后端 (Backend)

后端无需修改，因为：
- 数据库字段已通过 Prisma 自动映射
- n8n workflow 直接写入数据库
- 前端通过现有 API 读取数据

## 配置要求

### 环境变量

在 `.env` 文件中添加:
```bash
# OpenAI (AI 推荐)
OPENAI_API_KEY="sk-your-openai-api-key-here"
```

### n8n 凭据配置

需要在 n8n 中添加 HTTP Header Auth 凭据:

1. 凭据名称: `OpenAI API Key`
2. Header Name: `Authorization`
3. Header Value: `Bearer sk-your-openai-api-key-here`

## AI Prompt 设计

**System Prompt**:
```
你是一个物流专家，需要根据承运商的价格、时效、可靠性等因素，给出最优的推荐理由。
请用简洁的中文回复，不超过50字。
```

**User Prompt**:
```
以下是所有可用的运输方案：
[rates 数据]

请推荐最佳方案并说明原因。
```

## 使用流程

1. 用户在前端填写报价表单
2. Backend 调用 n8n webhook
3. n8n 从 Shippo 获取所有 rates
4. n8n 将 rates 发送给 OpenAI API ⭐
5. AI 返回推荐理由 ⭐
6. 保存到数据库（包含 AI 推荐）
7. 前端展示报价结果 + AI 推荐 ⭐

## 示例效果

### 报价结果页面
```
┌─────────────────────────────────────────┐
│ 🤖 AI 智能推荐                           │
│ 推荐选择 USPS Priority Mail，价格为     │
│ $7.33，2天内到达，性价比最高。           │
└─────────────────────────────────────────┘

☐ USPS Priority Mail - $7.33 - 2 days
☐ UPS Ground - $9.50 - 3 days
☐ FedEx Express - $15.20 - 1 day
```

### 订单列表
```
Order #123
New York → Los Angeles, 10 lbs
$7.33 - USPS Priority Mail - 2 days

🤖 推荐选择 USPS Priority Mail，价格为$7.33，
   2天内到达，性价比最高。
```

## 技术细节

### OpenAI API 参数
- Model: `gpt-3.5-turbo`
- Temperature: `0.7`
- Max Tokens: `150`

### 错误处理
如果 AI API 调用失败，使用默认文案：
```javascript
aiRecommendation = '推荐选择价格最优且时效较快的承运商';
```

### 性能考虑
- AI 调用在报价流程中串行执行
- 增加约 1-3 秒延迟
- 可考虑异步处理或缓存优化

## 部署步骤

1. **更新环境变量**
   ```bash
   echo 'OPENAI_API_KEY="sk-your-key"' >> .env
   ```

2. **运行数据库迁移**
   ```bash
   cd packages/database
   npx prisma migrate deploy
   npx prisma generate
   ```

3. **导入 n8n workflow**
   - 在 n8n 界面导入 `docs/n8n-workflows/quote-generation-stage1.json`
   - 配置 OpenAI API Key 凭据

4. **重启服务**
   ```bash
   # 重启 backend
   cd apps/backend
   npm run start:dev

   # 重启 frontend
   cd apps/frontend
   npm run dev
   ```

## 测试验证

1. 访问前端报价页面
2. 填写报价表单并提交
3. 验证报价结果中显示 AI 推荐
4. 检查订单列表中的 AI 推荐显示

## 未来优化方向

1. **多语言支持**: 根据用户语言返回对应语言的推荐
2. **个性化推荐**: 基于用户历史偏好调整推荐策略
3. **实时 A/B 测试**: 测试不同 prompt 的效果
4. **缓存机制**: 相似 routes 复用之前的推荐
5. **异步处理**: 先返回报价，AI 推荐后续更新

## 相关文件清单

- `packages/database/schema.prisma` - 数据库 schema
- `packages/database/migrations/20260712122000_add_ai_recommendation/migration.sql` - 数据库迁移
- `docs/n8n-workflows/quote-generation-stage1.json` - n8n 工作流
- `apps/frontend/src/app/page.tsx` - 前端页面
- `.env` - 环境变量配置
- `.env.example` - 环境变量模板

## 技术栈

- **AI**: OpenAI GPT-3.5-turbo
- **Workflow**: n8n
- **Database**: PostgreSQL + Prisma
- **Frontend**: Next.js + React + TypeScript
- **Backend**: NestJS
