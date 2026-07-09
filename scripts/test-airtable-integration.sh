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

echo "$QUOTE_RESPONSE" | jq '.'

SHIPMENT_ID=$(echo "$QUOTE_RESPONSE" | jq -r '.shipmentId')
RATE_ID=$(echo "$QUOTE_RESPONSE" | jq -r '.allRates[0].rateId')

if [ "$SHIPMENT_ID" == "null" ] || [ -z "$SHIPMENT_ID" ]; then
  echo "❌ 创建报价失败"
  exit 1
fi

echo ""
echo "✅ 报价创建成功"
echo "   Shipment ID: $SHIPMENT_ID"
echo "   Rate ID: $RATE_ID"
echo ""

# 第二步：购买运单
echo "🏷️  步骤 2: 购买运单..."
PURCHASE_RESPONSE=$(curl -s -X POST "$API_URL/api/shipments/$SHIPMENT_ID/purchase-label" \
  -H "Content-Type: application/json" \
  -d "{\"rateId\": \"$RATE_ID\"}")

echo "$PURCHASE_RESPONSE" | jq '.'

SUCCESS=$(echo "$PURCHASE_RESPONSE" | jq -r '.success')
TRACKING=$(echo "$PURCHASE_RESPONSE" | jq -r '.trackingNumber')

if [ "$SUCCESS" != "true" ]; then
  echo "❌ 购买运单失败"
  exit 1
fi

echo ""
echo "✅ 运单购买成功"
echo "   Tracking: $TRACKING"
echo ""
