'use client';

import { useState, useEffect, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ---- Type definitions ----

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
  aiRecommendation?: string;
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
  aiRecommendation: string | null;
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

// ---- Status config ----

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft:            { label: 'Pending Payment', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  pending_payment:  { label: 'Processing',      color: 'text-orange-700', bg: 'bg-orange-100' },
  paid:             { label: 'Paid',             color: 'text-blue-700',   bg: 'bg-blue-100'   },
  label_purchased:  { label: 'Label Purchased',  color: 'text-purple-700', bg: 'bg-purple-100' },
  in_transit:       { label: 'In Transit',       color: 'text-indigo-700', bg: 'bg-indigo-100' },
  delivered:        { label: 'Delivered',        color: 'text-green-700',  bg: 'bg-green-100'  },
};

const LOG_CONFIG: Record<string, { icon: string; label: string }> = {
  label_purchased:            { icon: '🏷️', label: 'Label Purchased' },
  tracking_updated:           { icon: '📡', label: 'Tracking Updated' },
  notification_in_transit:    { icon: '🚚', label: 'In Transit Notification' },
  notification_delivered:     { icon: '✅', label: 'Delivered Notification' },
  payment_succeeded:          { icon: '💳', label: 'Payment Succeeded' },
  email_payment_confirmation: { icon: '📧', label: 'Confirmation Email' },
};

// ---- Components ----

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
  const time = new Date(log.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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
          {!log.success && <span className="text-xs text-red-500">Failed</span>}
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
          {shipment.estimatedDays && <span className="text-gray-400">{shipment.estimatedDays} days</span>}
        </div>
      )}

      {shipment.aiRecommendation && (
        <div className="mb-3 p-2.5 bg-blue-50 border border-blue-100 rounded text-xs text-gray-700 flex items-start gap-2">
          <span className="shrink-0">🤖</span>
          <span className="flex-1">{shipment.aiRecommendation}</span>
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
              Track →
            </a>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        {shipment.labelUrl && (
          <a href={shipment.labelUrl} target="_blank" rel="noopener noreferrer"
             className="text-xs text-blue-600 hover:underline flex items-center gap-1"
             onClick={e => e.stopPropagation()}>
            📄 Download Label
          </a>
        )}

        {shipment.status === 'draft' && shipment.quoteAmount && (
          <button
            className="ml-auto text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
            onClick={e => { e.stopPropagation(); onCheckout(shipment.id); }}
          >
            ✅ Mock Payment
          </button>
        )}

        {shipment.status === 'draft' && (
          <button
            className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 transition-colors"
            onClick={e => { e.stopPropagation(); onPurchaseLabel(shipment.id); }}
          >
            Purchase Label
          </button>
        )}

        {shipment.trackingNumber && (
          <>
            <button
              className="text-xs bg-orange-500 text-white px-2 py-1 rounded hover:bg-orange-600 transition-colors"
              onClick={e => { e.stopPropagation(); onSimulateTracking(shipment.id, 'TRANSIT', shipment.trackingNumber!); }}
            >
              🚚 Simulate Transit
            </button>
            <button
              className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 transition-colors"
              onClick={e => { e.stopPropagation(); onSimulateTracking(shipment.id, 'DELIVERED', shipment.trackingNumber!); }}
            >
              📦 Simulate Delivered
            </button>
          </>
        )}
      </div>

      <div className="text-xs text-gray-400 mt-2">
        {new Date(shipment.createdAt).toLocaleString('en-US')}
      </div>
    </div>
  );
}

// ---- Main Page ----

export default function Home() {
  const [tab, setTab] = useState<'quote' | 'orders' | 'logs'>('quote');

  // Quote form
  const [form, setForm] = useState({ fromAddress: 'Chicago', toAddress: 'New York', weight: '10', senderName: 'John Smith', senderPhone: '6505550100', senderEmail: 'linyubupt@gmail.com' });
  const [quoting, setQuoting] = useState(false);
  const [quoteResult, setQuoteResult] = useState<QuoteResult | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);

  // Orders list
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loadingShipments, setLoadingShipments] = useState(false);
  const [selectedShipmentId, setSelectedShipmentId] = useState<number | null>(null);
  const [selectedShipmentLogs, setSelectedShipmentLogs] = useState<AutomationLog[]>([]);

  // Purchase label
  const [purchasingId, setPurchasingId] = useState<number | null>(null);
  const [checkingOutId, setCheckingOutId] = useState<number | null>(null);

  // Global logs
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
    // Aggregate logs from recent orders
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
        setQuoteError(data.message || 'Quote failed');
      }
    } catch (err: unknown) {
      setQuoteError(err instanceof Error ? err.message : 'Request failed');
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
        if (tab === 'orders') fetchShipments();
        if (quoteResult?.shipmentId === shipmentId) {
          setQuoteResult(null);
          setTab('orders');
          setTimeout(fetchShipments, 500);
        }
        alert(`✅ Purchase successful!\nTracking: ${data.trackingNumber}`);
      } else {
        alert(`❌ Purchase failed: ${data.message || JSON.stringify(data)}`);
      }
    } catch (err: unknown) {
      alert(`❌ Request failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
        alert(`✅ Mock payment successful! Order #${shipmentId} marked as paid.`);
      } else {
        alert(`❌ Payment failed: ${data.message || JSON.stringify(data)}`);
      }
    } catch (err: unknown) {
      alert(`❌ Request failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
        alert(`✅ Simulated ${status} webhook sent!`);
      } else {
        alert(`❌ Simulation failed: ${data.message || JSON.stringify(data)}`);
      }
    } catch (err: unknown) {
      alert(`❌ Request failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
              <p className="text-xs text-gray-500">Logistics Automation Demo</p>
            </div>
          </div>
          <div className="flex gap-1">
            {([
              ['quote', '📦 Quote'],
              ['orders', '📋 Orders'],
              ['logs', '📊 Logs'],
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

        {/* ---- Quote Tab ---- */}
        {tab === 'quote' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-5">Create Quote</h2>
              <form onSubmit={handleQuote} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Origin</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight (lbs)</label>
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
                  <p className="text-xs text-gray-500 font-medium mb-3">Sender Info (required for USPS)</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input
                        type="text"
                        value={form.senderName}
                        onChange={e => setForm({ ...form, senderName: e.target.value })}
                        placeholder="Sender name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-red-500">*</span></label>
                      <input
                        type="tel"
                        value={form.senderPhone}
                        onChange={e => setForm({ ...form, senderPhone: e.target.value })}
                        placeholder="e.g. 6505550100"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
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
                  {quoting ? 'Getting quote...' : 'Get Shippo Live Quote'}
                </button>
              </form>

              {/* Supported cities */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 font-medium mb-1">Supported Cities</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  New York · Los Angeles · Chicago · Houston · Phoenix · San Francisco · Seattle · Miami · Dallas · Boston
                </p>
              </div>
            </div>

            {/* Quote result */}
            <div>
              {quoteError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                  <p className="text-sm font-medium text-red-800 mb-1">Quote Failed</p>
                  <p className="text-sm text-red-600">{quoteError}</p>
                </div>
              )}

              {quoteResult && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Quote Results</h2>
                    <span className="text-xs text-gray-400 font-mono">Order #{quoteResult.shipmentId}</span>
                  </div>

                  {quoteResult.aiRecommendation && (
                    <div className="mb-5 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl shrink-0">🤖</span>
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-1">AI 智能推荐</p>
                          <p className="text-sm text-gray-700 leading-relaxed">{quoteResult.aiRecommendation}</p>
                        </div>
                      </div>
                    </div>
                  )}

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
                          <div className="text-xs text-gray-400">{rate.estimatedDays} day delivery</div>
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
                    {purchasingId === quoteResult.shipmentId ? 'Purchasing...' : 'Confirm Purchase'}
                  </button>
                </div>
              )}

              {!quoteResult && !quoteError && !quoting && (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
                  <div className="text-4xl mb-3">📦</div>
                  <p className="text-sm">Fill in the form to get a live shipping quote</p>
                  <p className="text-xs mt-1 text-gray-300">Multi-carrier rates powered by Shippo API</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---- Orders Tab ---- */}
        {tab === 'orders' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Orders list */}
            <div className="lg:col-span-3">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Orders
                  {shipments.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-gray-400">({shipments.length})</span>
                  )}
                </h2>
                <button
                  onClick={fetchShipments}
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  {loadingShipments ? 'Refreshing...' : '↻ Refresh'}
                </button>
              </div>

              {loadingShipments && shipments.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">Loading...</div>
              ) : shipments.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-sm">No orders yet</p>
                  <button
                    className="mt-3 text-sm text-blue-600 hover:underline"
                    onClick={() => setTab('quote')}
                  >
                    Create your first quote →
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

            {/* Order logs panel */}
            <div className="lg:col-span-2">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {selectedShipmentId ? `Order #${selectedShipmentId} Logs` : 'Automation Logs'}
              </h2>
              <div className="bg-white rounded-xl border border-gray-200 p-4 min-h-[300px]">
                {!selectedShipmentId ? (
                  <p className="text-sm text-gray-400 text-center py-8">Click an order to view logs</p>
                ) : selectedShipmentLogs.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No logs yet</p>
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

        {/* ---- Logs Tab ---- */}
        {tab === 'logs' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Automation Logs</h2>
              <button
                onClick={fetchAllLogs}
                className="text-sm text-blue-600 hover:underline"
              >
                ↻ Refresh
              </button>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              {allLogs.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-3">📊</div>
                  <p className="text-sm">No logs yet</p>
                  <p className="text-xs mt-1 text-gray-300">Logs will appear here after completing a quote and purchase</p>
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
