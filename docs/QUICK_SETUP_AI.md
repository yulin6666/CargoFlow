# 快速设置指南 - AI 智能推荐功能

## 🚀 5 分钟快速部署

### 步骤 1: 获取 OpenAI API Key

1. 访问 https://platform.openai.com/signup
2. 注册/登录账号
3. 进入 https://platform.openai.com/api-keys
4. 点击 "Create new secret key"
5. 复制生成的 API key (sk-...)

### 步骤 2: 配置环境变量

编辑 `.env` 文件，添加:

```bash
OPENAI_API_KEY="sk-your-actual-api-key-here"
```

### 步骤 3: 数据库迁移

```bash
cd packages/database
npx prisma migrate deploy
npx prisma generate
```

### 步骤 4: 配置 n8n 凭据

1. 打开 n8n (http://localhost:5678)
2. 进入 Settings → Credentials
3. 点击 "Add Credential"
4. 选择 "HTTP Header Auth"
5. 填写:
   - **Credential Name**: `OpenAI API Key`
   - **Name**: `Authorization`
   - **Value**: `Bearer sk-your-actual-api-key-here`
6. 保存

### 步骤 5: 导入/更新 n8n Workflow

#### 方法 A: 更新现有 workflow
1. 打开现有的 "CargoFlow - Quote Generation" workflow
2. 在 "Parse Shippo Rates" 节点后添加:

   **节点 1: AI Carrier Recommendation**
   - 类型: HTTP Request
   - Method: POST
   - URL: `https://api.openai.com/v1/chat/completions`
   - Authentication: HTTP Header Auth (选择上面创建的凭据)
   - Body (JSON):
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
         "content": "={{ \"以下是所有可用的运输方案：\\n\" + JSON.stringify($json.allRates) + \"\\n\\n请推荐最佳方案并说明原因。\" }}"
       }
     ],
     "temperature": 0.7,
     "max_tokens": 150
   }
   ```

   **节点 2: Parse AI Response**
   - 类型: Code
   - Code:
   ```javascript
   const aiResponse = $input.first().json;
   const ratesData = $('Parse Shippo Rates').first().json;

   let aiRecommendation = '';
   try {
     aiRecommendation = aiResponse.choices[0].message.content.trim();
   } catch (e) {
     aiRecommendation = '推荐选择价格最优且时效较快的承运商';
   }

   return {
     ...ratesData,
     aiRecommendation
   };
   ```

3. 更新 "PostgreSQL" 节点的 SQL:
   ```sql
   INSERT INTO demo_shipments (from_address, to_address, weight, status, quote_amount, shippo_object_id, shippo_rate_id, shippo_rates, sender_name, sender_phone, sender_email, carrier, service_name, estimated_days, ai_recommendation, created_at, updated_at)
   VALUES ('{{ $json.fromAddress }}', '{{ $json.toAddress }}', {{ $json.weight }}, 'draft', {{ $json.quoteAmount }}, '{{ $json.shippoObjectId }}', '{{ $json.shippoRateId }}', '{{ JSON.stringify($json.allRates) }}'::jsonb, '{{ $json.senderName }}', '{{ $json.senderPhone }}', '{{ $json.senderEmail }}', '{{ $json.carrier }}', '{{ $json.serviceName }}', {{ $json.estimatedDays }}, '{{ $json.aiRecommendation }}', NOW(), NOW())
   RETURNING *;
   ```

4. 更新 "Format Response" 节点:
   ```javascript
   const dbResult = $input.first().json;
   const rates = $('Parse AI Response').first().json;

   return {
     success: true,
     shipmentId: dbResult.id,
     quoteAmount: parseFloat(dbResult.quote_amount),
     fromAddress: dbResult.from_address,
     toAddress: dbResult.to_address,
     weight: parseFloat(dbResult.weight),
     status: dbResult.status,
     shippoObjectId: dbResult.shippo_object_id,
     carrier: rates.carrier,
     serviceName: rates.serviceName,
     estimatedDays: rates.estimatedDays,
     allRates: rates.allRates,
     aiRecommendation: dbResult.ai_recommendation || rates.aiRecommendation || '',
     message: `报价已生成：${rates.carrier} ${rates.serviceName}，$${rates.quoteAmount}，预计 ${rates.estimatedDays} 天`,
     createdAt: dbResult.created_at
   };
   ```

#### 方法 B: 导入新的 workflow (推荐)
1. 在 n8n 中点击 "..." → "Import from File"
2. 选择 `docs/n8n-workflows/quote-generation-stage1.json`
3. 导入后，确认 OpenAI 凭据配置正确

### 步骤 6: 重启服务

```bash
# Terminal 1: 重启 backend
cd apps/backend
npm run start:dev

# Terminal 2: 重启 frontend
cd apps/frontend
npm run dev
```

### 步骤 7: 测试

1. 打开浏览器访问 http://localhost:3000
2. 填写报价表单:
   - Origin: New York
   - Destination: Los Angeles
   - Weight: 10 lbs
   - 填写发件人信息
3. 点击 "Get Shippo Live Quote"
4. 等待 2-3 秒
5. 验证是否显示 AI 推荐框 🤖

## ✅ 验证清单

- [ ] OpenAI API Key 已添加到 .env
- [ ] 数据库迁移成功执行
- [ ] n8n 凭据配置完成
- [ ] n8n workflow 已更新/导入
- [ ] Backend 服务运行正常
- [ ] Frontend 服务运行正常
- [ ] 测试报价功能
- [ ] AI 推荐框正常显示
- [ ] 订单列表显示 AI 推荐

## 🐛 常见问题

### Q1: AI 推荐不显示
**A**: 检查:
1. `.env` 中 `OPENAI_API_KEY` 是否正确
2. n8n 凭据是否正确配置
3. n8n workflow 是否已更新
4. 浏览器控制台是否有错误

### Q2: 数据库迁移失败
**A**:
```bash
# 检查数据库连接
cd packages/database
npx prisma db pull

# 手动执行迁移 SQL
psql $DATABASE_URL -c "ALTER TABLE demo_shipments ADD COLUMN ai_recommendation TEXT;"
```

### Q3: n8n workflow 执行失败
**A**:
1. 检查 n8n 执行日志
2. 验证 OpenAI API Key 是否有效
3. 确认 OpenAI API 配额未用完

### Q4: AI 返回的是默认文案
**A**: 说明 OpenAI API 调用失败，检查:
1. API Key 是否有效
2. 网络连接是否正常
3. OpenAI 服务是否可用

## 💰 成本说明

- 使用 GPT-3.5-turbo
- 每次报价约 0.05-0.1 分 (人民币)
- 1000次报价约 0.5-1 元
- 可以设置 OpenAI 账户预算限制

## 📚 详细文档

- [完整功能说明](./AI_RECOMMENDATION_FEATURE.md)
- [数据流程图](./AI_RECOMMENDATION_FLOW.md)

## 🎉 完成！

现在你的 CargoFlow 系统已经具备 AI 智能推荐功能了！

用户在获取报价时，会看到 AI 基于价格、时效等因素给出的专业推荐建议。
