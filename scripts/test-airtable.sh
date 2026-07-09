#!/bin/bash
set -e

API_URL=${API_URL:-http://localhost:3001}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5433}
DB_USER=${DB_USER:-root}
DB_PASS=${DB_PASS:-password}
DB_NAME=${DB_NAME:-logistics_demo}

echo "🧪 测试 Airtable 集成"
echo "===================="
echo ""

# 第一步：创建报价
echo "📦 步骤 1: 创建报价..."
QUOTE_RESPONSE=$(curl -s -X POST "$API_URL/api/shipments/quote" \
  -H "Content-Type: application/json" \
  -d '{
    "fromAddress": "Chicago",
    "toAddress": "New York",
    "weight": 5,
    "senderName": "Test User",
    "senderPhone": "6505550100",
    "senderEmail": "test@cargoflow.demo"
  }')

echo "$QUOTE_RESPONSE"
echo ""

SHIPMENT_ID=$(echo "$QUOTE_RESPONSE" | grep -o '"shipmentId":[0-9]*' | grep -o '[0-9]*')
RATE_ID=$(echo "$QUOTE_RESPONSE" | grep -o '"rateId":"[^"]*"' | head -1 | sed 's/"rateId":"//;s/"//')

if [ -z "$SHIPMENT_ID" ]; then
  echo "❌ 创建报价失败"
  exit 1
fi

echo "✅ 报价创建成功"
echo "   Shipment ID: $SHIPMENT_ID"
echo "   Rate ID: $RATE_ID"
echo ""

# 第二步：购买运单
echo "🏷️  步骤 2: 购买运单..."
PURCHASE_RESPONSE=$(curl -s -X POST "$API_URL/api/shipments/$SHIPMENT_ID/purchase-label" \
  -H "Content-Type: application/json" \
  -d "{\"rateId\": \"$RATE_ID\"}")

echo "$PURCHASE_RESPONSE"
echo ""

SUCCESS=$(echo "$PURCHASE_RESPONSE" | grep -o '"success":true')
TRACKING=$(echo "$PURCHASE_RESPONSE" | grep -o '"trackingNumber":"[^"]*"' | sed 's/"trackingNumber":"//;s/"//')

if [ -z "$SUCCESS" ]; then
  echo "❌ 购买运单失败"
  exit 1
fi

echo "✅ 运单购买成功"
echo "   Tracking: $TRACKING"
echo ""

# 第三步：等待 n8n 处理
echo "⏳ 步骤 3: 等待 n8n 处理（3秒）..."
sleep 3
echo ""

# 第四步：检查数据库日志
echo "📋 步骤 4: 检查 automation_logs..."
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \
  "SELECT
    id,
    shipment_id,
    action_type,
    details,
    success,
    created_at
   FROM automation_logs
   WHERE shipment_id = $SHIPMENT_ID
   ORDER BY created_at DESC
   LIMIT 10;"

echo ""

# 检查是否有 airtable_synced 记录
AIRTABLE_LOG=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c \
  "SELECT COUNT(*) FROM automation_logs WHERE shipment_id = $SHIPMENT_ID AND action_type = 'airtable_synced';" | tr -d ' ')

echo ""
echo "===================="
echo "测试结果总结："
echo "===================="
echo "Shipment ID: $SHIPMENT_ID"
echo "Tracking Number: $TRACKING"
echo ""

if [ "$AIRTABLE_LOG" -gt 0 ]; then
  echo "✅ Airtable 同步成功！"
  echo "   在 automation_logs 中找到 airtable_synced 记录"
  echo ""
  echo "🎉 测试通过！数据已同步到 Airtable"
else
  echo "❌ Airtable 同步失败"
  echo "   在 automation_logs 中未找到 airtable_synced 记录"
  echo ""
  echo "💡 可能的原因："
  echo "   1. n8n 中未重新导入 purchase-label.json"
  echo "   2. Airtable credentials 未配置"
  echo "   3. Airtable 节点中未选择 Base 和 Table"
  echo "   4. n8n workflow 执行出错"
  echo ""
  echo "🔍 查看 n8n 日志："
  echo "   docker logs n8n --tail 50"
fi
