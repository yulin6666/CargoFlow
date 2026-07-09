# 第三步：等待 n8n 处理
echo "⏳ 步骤 3: 等待 n8n 处理（2秒）..."
sleep 2
echo ""

# 第四步：检查数据库日志
echo "📋 步骤 4: 检查 automation_logs..."
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \
  "SELECT
    id,
    shipment_id,
    action_type,
    details->>'contact_email' as email,
    details->>'order_amount' as amount,
    success,
    created_at
   FROM automation_logs
   WHERE shipment_id = $SHIPMENT_ID
   ORDER BY created_at DESC
   LIMIT 10;" \
  -x

echo ""

# 检查是否有 airtable_synced 记录
AIRTABLE_LOG=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c \
  "SELECT COUNT(*) FROM automation_logs WHERE shipment_id = $SHIPMENT_ID AND action_type = 'airtable_synced';")

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

echo ""
echo "📊 查看完整订单信息："
echo "   curl $API_URL/api/shipments/$SHIPMENT_ID | jq '.'"
