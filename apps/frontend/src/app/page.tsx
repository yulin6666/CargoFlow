'use client';

import { useState, useEffect, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ---- 类型定义 ----

interface Rate {
  rateId: string;
  carrier: string;
  service: string;
  amount: number;
  currency: string;
  estimatedDays: number;
}

interface QuoteResult {
  success: boolean;
  shipmentId: number;
  quoteAmount: number;
  carrier: string;
  serviceName: string;
  estimatedDays: number;
  allRates: Rate[];
  shippoObjectId: string;
  message: string;
}

interface Shipment {
  id: number;
  fromAddress: string;
  toAddress: string;
  weight: number;
  status: string;
  quoteAmount: number | null;
  trackingNumber: string | null;
  trackingStatus: string | null;
  trackingUrl: string | null;
  labelUrl: string | null;
  carrier: string | null;
  serviceName: string | null;
  estimatedDays: number | null;
  createdAt: string;
  updatedAt: string;
}

interface AutomationLog {
  actionType: string;
  details: Record<string, unknown>;
  success: boolean;
  errorMsg: string | null;
  createdAt: string;
}

// ---- 状态配置 ----

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft:            { label: '待支付', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  pending_payment:  { label: '支付中', color: 'text-orange-700', bg: 'bg-orange-100' },
  paid:             { label: '已支付', color: 'text-blue-700',   bg: 'bg-blue-100'   },
  label_purchased:  { label: '已出单', color: 'text-purple-700', bg: 'bg-purple-100' },
  in_transit:       { label: '运输中', color: 'text-indigo-700', bg: 'bg-indigo-100' },
  delivered:        { label: '已送达', color: 'text-green-700',  bg: 'bg-green-100'  },
};

const LOG_CONFIG: Record<string, { icon: string; label: string }> = {
  label_purchased:          { icon: '🏷️', label: 'Label 已购买' },
  tracking_updated:         { icon: '📡', label: '追踪状态更新' },
  notification_in_transit:  { icon: '🚚', label: '运输通知' },
  notification_delivered:   { icon: '✅', label: '送达通知' },
  payment_succeeded:        { icon: '💳', label: '支付成功' },
  email_payment_confirmation: { icon: '📧', label: '确认邮件' },
};

// ---- 子组件 ----

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: 'text-gray-700', bg: 'bg-gray-100' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function LogItem({ log }: { log: AutomationLog }) {
  const cfg = LOG_CONFIG[log.actionType] || { icon: '⚡', label: log.actionType };
  const time = new Date(log.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const details = log.details as Record<string, string | number>;
  const detailStr = details?.tracking_number ? `Tracking: ${details.tracking_number}` :
                    details?.message ? String(details.message) :
                    details?.amount ? `$${details.amount} ${details.currency || ''}` : '';
  return (
    <div className={`flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0 ${!log.success ? 'opacity-60' : ''}`}>
      <span className="text-lg mt-0.5 shrink-0">{cfg.icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-800">{cfg.label}</span>
          {!log.success && <span className="text-xs text-red-500">失败</span>}
        </div>
        {detailStr && <p className="text-xs text-gray-500 mt-0.5 truncate">{detailStr}</p>}
      </div>
      <span className="text-xs text-gray-400 shrink-0">{time}</span>
    </div>
  );
}

function ShipmentCard({
  shipment,
  onPurchaseLabel,
  onCheckout,
  onSelect,
  isSelected,
  onSimulateTracking,
}: {
  shipment: Shipment;
  onPurchaseLabel: (id: number) => void;
  onCheckout: (id: number) => void;
  onSelect: (id: number) => void;
  isSelected: boolean;
  onSimulateTracking: (id: number, status: string, trackingNumber: string) => void;
}) {
  return (
    <div
      className={`bg-white rounded-lg border-2 p-4 cursor-pointer transition-all ${
        isSelected ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={() => onSelect(shipment.id)}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <span className="text-xs text-gray-400 font-mono">#{shipment.id}</span>
          <div className="text-sm font-medium text-gray-800 mt-0.5">
            {shipment.fromAddress} → {shipment.toAddress}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">{shipment.weight} lbs</div>
        </div>
        <StatusBadge status={shipment.status} />
      </div>

      {shipment.quoteAmount && (
        <div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
          <span className="font-semibold text-gray-900">${shipment.quoteAmount}</span>
          {shipment.carrier && <span>{shipment.carrier} {shipment.serviceName}</span>}
          {shipment.estimatedDays && <span className="text-gray-400">{shipment.estimatedDays}天</span>}
        </div>
      )}

      {shipment.trackingNumber && (
        <div className="flex items-center gap-2 bg-gray-50 rounded px-2 py-1.5 mb-3">
          <span className="text-xs text-gray-500">Tracking:</span>
          <span className="text-xs font-mono text-gray-700 flex-1 truncate">{shipment.trackingNumber}</span>
          {shipment.trackingUrl && (
            <a href={shipment.trackingUrl} target="_blank" rel="noopener noreferrer"
               className="text-xs text-blue-500 hover:underline shrink-0"
               onClick={e => e.stopPropagation()}>
              追踪 →
            </a>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        {shipment.labelUrl && (
          <a href={shipment.labelUrl} target="_blank" rel="noopener noreferrer"
             className="text-xs text-blue-600 hover:underline flex items-center gap-1"
             onClick={e => e.stopPropagation()}>
            📄 下载 Label
          </a>
        )}

        {shipment.status === 'draft' && shipment.quoteAmount && (
          <button
            className="ml-auto text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
            onClick={e => { e.stopPropagation(); onCheckout(shipment.id); }}
          >
            ✅ 模拟支付
          </button>
        )}

        {shipment.status === 'draft' && (
          <button
            className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 transition-colors"
            onClick={e => { e.stopPropagation(); onPurchaseLabel(shipment.id); }}
          >
            购买运单
          </button>
        )}

        {shipment.trackingNumber && (
          <>
            <button
              className="text-xs bg-orange-500 text-white px-2 py-1 rounded hover:bg-orange-600 transition-colors"
              onClick={e => { e.stopPropagation(); onSimulateTracking(shipment.id, 'TRANSIT', shipment.trackingNumber!); }}
            >
              🚚 模拟运输中
            </button>
            <button
              className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 transition-colors"
              onClick={e => { e.stopPropagation(); onSimulateTracking(shipment.id, 'DELIVERED', shipment.trackingNumber!); }}
            >
              📦 模拟送达
            </button>
          </>
        )}
      </div>

      <div className="text-xs text-gray-400 mt-2">
        {new Date(shipment.createdAt).toLocaleString('zh-CN')}
      </div>
    </div>
  );
}

// ---- 主页面 ----

export default function Home() {
  const [tab, setTab] = useState<'quote' | 'orders' | 'logs'>('quote');

  // 报价表单
  const [form, setForm] = useState({ fromAddress: 'Chicago', toAddress: 'New York', weight: '10', senderName: 'John Smith', senderPhone: '6505550100', senderEmail: 'linyubupt@gmail.com' });
  const [quoting, setQuoting] = useState(false);
  const [quoteResult, setQuoteResult] = useState<QuoteResult | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);

  // 订单列表
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loadingShipments, setLoadingShipments] = useState(false);
  const [selectedShipmentId, setSelectedShipmentId] = useState<number | null>(null);
  const [selectedShipmentLogs, setSelectedShipmentLogs] = useState<AutomationLog[]>([]);

  // 购买 label
  const [purchasingId, setPurchasingId] = useState<number | null>(null);
  const [checkingOutId, setCheckingOutId] = useState<number | null>(null);

  // 全局日志
  const [allLogs, setAllLogs] = useState<AutomationLog[]>([]);

  const fetchShipments = useCallback(async () => {
    setLoadingShipments(true);
    try {
      const res = await fetch(`${API_URL}/api/shipments`);
      const data = await res.json();
      if (data.success && data.data) {
        console.log('[fetchShipments] first item:', JSON.stringify(data.data[0]));
        setShipments(data.data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingShipments(false);
    }
  }, []);

  const fetchShipmentDetail = useCallback(async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/api/shipments/${id}`);
      const data = await res.json();
      if (data.success && data.logs) setSelectedShipmentLogs(data.logs);
    } catch {
      // ignore
    }
  }, []);

  const fetchAllLogs = useCallback(async () => {
    // 从最近的订单汇总日志
    if (shipments.length === 0) return;
    const logs: AutomationLog[] = [];
    for (const s of shipments.slice(0, 5)) {
      try {
        const res = await fetch(`${API_URL}/api/shipments/${s.id}`);
        const data = await res.json();
        if (data.success && data.logs) logs.push(...data.logs);
      } catch { /* ignore */ }
    }
    logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setAllLogs(logs.slice(0, 30));
  }, [shipments]);

  useEffect(() => {
    if (tab === 'orders') fetchShipments();
  }, [tab, fetchShipments]);

  useEffect(() => {
    if (tab === 'logs') fetchAllLogs();
  }, [tab, fetchAllLogs]);

  useEffect(() => {
    if (selectedShipmentId) fetchShipmentDetail(selectedShipmentId);
  }, [selectedShipmentId, fetchShipmentDetail]);

  const handleQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuoting(true);
    setQuoteResult(null);
    setQuoteError(null);
    setSelectedRateId(null);
    try {
      const res = await fetch(`${API_URL}/api/shipments/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, weight: parseFloat(form.weight) }),
      });
      const data = await res.json();
      if (data.success) {
        setQuoteResult(data);
        setSelectedRateId(data.allRates?.[0]?.rateId || null);
      } else {
        setQuoteError(data.message || '报价失败');
      }
    } catch (err: unknown) {
      setQuoteError(err instanceof Error ? err.message : '请求失败');
    } finally {
      setQuoting(false);
    }
  };

  const handlePurchaseLabel = async (shipmentId: number, rateId?: string) => {
    setPurchasingId(shipmentId);
    try {
      const body: Record<string, unknown> = { shipmentId };
      if (rateId) body.rateId = rateId;
      const res = await fetch(`${API_URL}/api/shipments/${shipmentId}/purchase-label`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        // 成功后刷新
        if (tab === 'orders') fetchShipments();
        if (quoteResult?.shipmentId === shipmentId) {
          setQuoteResult(null);
          setTab('orders');
          setTimeout(fetchShipments, 500);
        }
        alert(`✅ 购买成功！\nTracking: ${data.trackingNumber}`);
      } else {
        alert(`❌ 购买失败: ${data.message || JSON.stringify(data)}`);
      }
    } catch (err: unknown) {
      alert(`❌ 请求失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setPurchasingId(null);
    }
  };

  const handleCheckout = async (shipmentId: number) => {
    setCheckingOutId(shipmentId);
    try {
      const res = await fetch(`${API_URL}/api/shipments/${shipmentId}/mock-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        fetchShipments();
        alert(`✅ 模拟支付成功！订单 #${shipmentId} 已标记为已支付，邮件/HubSpot 自动化已触发。`);
      } else {
        alert(`❌ 支付失败: ${data.message || JSON.stringify(data)}`);
      }
    } catch (err: unknown) {
      alert(`❌ 请求失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setCheckingOutId(null);
    }
  };

  const handleSimulateTracking = async (shipmentId: number, status: string, trackingNumber: string) => {
    console.log('[handleSimulateTracking]', { shipmentId, status, trackingNumber });
    try {
      const res = await fetch(`${API_URL}/api/shipments/${shipmentId}/simulate-tracking-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, trackingNumber }),
      });
      const data = await res.json();
      if (data.success) {
        fetchShipments();
        if (selectedShipmentId === shipmentId) {
          fetchShipmentDetail(shipmentId);
        }
        alert(`✅ 模拟 ${status} webhook 已发送！邮件通知应已触发。`);
      } else {
        alert(`❌ 模拟失败: ${data.message || JSON.stringify(data)}`);
      }
    } catch (err: unknown) {
      alert(`❌ 请求失败: ${err instanceof Error ? err.message : '未知错误'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚚</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900">CargoFlow</h1>
              <p className="text-xs text-gray-500">物流自动化演示系统</p>
            </div>
          </div>
          <div className="flex gap-1">
            {([
              ['quote', '📦 报价'],
              ['orders', '📋 订单'],
              ['logs', '📊 日志'],
            ] as [string, string][]).map(([key, label]) => (
              <button
                key={key}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setTab(key as typeof tab)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">

        {/* ---- 报价 Tab ---- */}
        {tab === 'quote' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 表单 */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-5">创建报价</h2>
              <form onSubmit={handleQuote} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">起运地</label>
                  <input
                    type="text"
                    value={form.fromAddress}
                    onChange={e => setForm({ ...form, fromAddress: e.target.value })}
                    placeholder="Chicago / New York / Los Angeles ..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">目的地</label>
                  <input
                    type="text"
                    value={form.toAddress}
                    onChange={e => setForm({ ...form, toAddress: e.target.value })}
                    placeholder="Chicago / New York / Los Angeles ..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">重量 (lbs)</label>
                  <input
                    type="number"
                    value={form.weight}
                    onChange={e => setForm({ ...form, weight: e.target.value })}
                    placeholder="1 - 70"
                    min="0.1"
                    max="70"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs text-gray-500 font-medium mb-3">发件人联系方式（USPS 必填）</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                      <input
                        type="text"
                        value={form.senderName}
                        onChange={e => setForm({ ...form, senderName: e.target.value })}
                        placeholder="发件人姓名"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">手机号 <span className="text-red-500">*</span></label>
                      <input
                        type="tel"
                        value={form.senderPhone}
                        onChange={e => setForm({ ...form, senderPhone: e.target.value })}
                        placeholder="例如: 6505550100"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">邮箱 <span className="text-red-500">*</span></label>
                      <input
                        type="email"
                        value={form.senderEmail}
                        onChange={e => setForm({ ...form, senderEmail: e.target.value })}
                        placeholder="sender@example.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        required
                      />
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={quoting}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {quoting ? '获取报价中...' : '获取 Shippo 实时报价'}
                </button>
              </form>

              {/* 支持城市提示 */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 font-medium mb-1">支持城市</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  New York · Los Angeles · Chicago · Houston · Phoenix · San Francisco · Seattle · Miami · Dallas · Boston
                </p>
              </div>
            </div>

            {/* 报价结果 */}
            <div>
              {quoteError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                  <p className="text-sm font-medium text-red-800 mb-1">报价失败</p>
                  <p className="text-sm text-red-600">{quoteError}</p>
                </div>
              )}

              {quoteResult && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">报价结果</h2>
                    <span className="text-xs text-gray-400 font-mono">订单 #{quoteResult.shipmentId}</span>
                  </div>

                  <div className="space-y-2 mb-5">
                    {quoteResult.allRates?.map(rate => (
                      <label
                        key={rate.rateId}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedRateId === rate.rateId
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="rate"
                          value={rate.rateId}
                          checked={selectedRateId === rate.rateId}
                          onChange={() => setSelectedRateId(rate.rateId)}
                          className="text-blue-600"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-800">{rate.carrier}</span>
                            <span className="text-xs text-gray-500">{rate.service}</span>
                          </div>
                          <div className="text-xs text-gray-400">{rate.estimatedDays} 天送达</div>
                        </div>
                        <span className="text-base font-bold text-gray-900">${rate.amount}</span>
                      </label>
                    ))}
                  </div>

                  <button
                    disabled={!selectedRateId || purchasingId === quoteResult.shipmentId}
                    onClick={() => handlePurchaseLabel(quoteResult.shipmentId, selectedRateId!)}
                    className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {purchasingId === quoteResult.shipmentId ? '购买中...' : '确认购买运单'}
                  </button>
                </div>
              )}

              {!quoteResult && !quoteError && !quoting && (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
                  <div className="text-4xl mb-3">📦</div>
                  <p className="text-sm">填写表单获取实时运费报价</p>
                  <p className="text-xs mt-1 text-gray-300">由 Shippo API 提供多承运商比价</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---- 订单 Tab ---- */}
        {tab === 'orders' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* 订单列表 */}
            <div className="lg:col-span-3">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  订单列表
                  {shipments.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-gray-400">({shipments.length})</span>
                  )}
                </h2>
                <button
                  onClick={fetchShipments}
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  {loadingShipments ? '刷新中...' : '↻ 刷新'}
                </button>
              </div>

              {loadingShipments && shipments.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">加载中...</div>
              ) : shipments.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-sm">暂无订单</p>
                  <button
                    className="mt-3 text-sm text-blue-600 hover:underline"
                    onClick={() => setTab('quote')}
                  >
                    去创建第一个报价 →
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {shipments.map(s => (
                    <ShipmentCard
                      key={s.id}
                      shipment={s}
                      onPurchaseLabel={id => handlePurchaseLabel(id)}
                      onCheckout={id => handleCheckout(id)}
                      onSelect={id => setSelectedShipmentId(id === selectedShipmentId ? null : id)}
                      isSelected={selectedShipmentId === s.id}
                      onSimulateTracking={(id, status, trackingNumber) => handleSimulateTracking(id, status, trackingNumber)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* 订单日志面板 */}
            <div className="lg:col-span-2">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {selectedShipmentId ? `订单 #${selectedShipmentId} 日志` : '自动化日志'}
              </h2>
              <div className="bg-white rounded-xl border border-gray-200 p-4 min-h-[300px]">
                {!selectedShipmentId ? (
                  <p className="text-sm text-gray-400 text-center py-8">点击订单查看日志</p>
                ) : selectedShipmentLogs.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">暂无日志</p>
                ) : (
                  <div>
                    {selectedShipmentLogs.map((log, i) => (
                      <LogItem key={i} log={log} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ---- 日志 Tab ---- */}
        {tab === 'logs' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">自动化日志</h2>
              <button
                onClick={fetchAllLogs}
                className="text-sm text-blue-600 hover:underline"
              >
                ↻ 刷新
              </button>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              {allLogs.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-3">📊</div>
                  <p className="text-sm">暂无日志记录</p>
                  <p className="text-xs mt-1 text-gray-300">完成报价和购买运单后，日志会在此显示</p>
                </div>
              ) : (
                <div>
                  {allLogs.map((log, i) => (
                    <LogItem key={i} log={log} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
