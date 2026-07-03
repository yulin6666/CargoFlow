'use client';

import { useState } from 'react';

interface QuoteFormData {
  fromAddress: string;
  toAddress: string;
  weight: number;
}

interface QuoteResult {
  success?: boolean;
  shipmentId?: number;
  quoteAmount?: number;
  message?: string;
  error?: string;
}

export default function Home() {
  const [formData, setFormData] = useState<QuoteFormData>({
    fromAddress: '',
    toAddress: '',
    weight: 0,
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QuoteResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/quotes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message || '请求失败',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🚚 CargoFlow
          </h1>
          <p className="text-gray-600">
            物流自动化演示系统 - 阶段 1: 最小可行版本
          </p>
        </div>

        {/* 创建订单表单 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">
            📦 创建新订单
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                起运地
              </label>
              <input
                type="text"
                value={formData.fromAddress}
                onChange={(e) =>
                  setFormData({ ...formData, fromAddress: e.target.value })
                }
                placeholder="例如: Chicago, IL"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                目的地
              </label>
              <input
                type="text"
                value={formData.toAddress}
                onChange={(e) =>
                  setFormData({ ...formData, toAddress: e.target.value })
                }
                placeholder="例如: Los Angeles, CA"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                重量 (lbs)
              </label>
              <input
                type="number"
                value={formData.weight || ''}
                onChange={(e) =>
                  setFormData({ ...formData, weight: parseFloat(e.target.value) })
                }
                placeholder="例如: 500"
                min="0.01"
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {loading ? '处理中...' : '获取 AI 报价'}
            </button>
          </form>
        </div>

        {/* 结果显示 */}
        {result && (
          <div
            className={`rounded-lg shadow-md p-6 ${
              result.success === false
                ? 'bg-yellow-50 border border-yellow-200'
                : 'bg-green-50 border border-green-200'
            }`}
          >
            <h3 className="text-xl font-semibold mb-3 text-gray-800">
              {result.success === false ? '⚠️ 处理结果' : '✅ 报价结果'}
            </h3>

            {result.shipmentId && (
              <p className="text-gray-700 mb-2">
                <span className="font-medium">订单 ID:</span> #{result.shipmentId}
              </p>
            )}

            {result.quoteAmount && (
              <p className="text-gray-700 mb-2">
                <span className="font-medium">报价金额:</span> $
                {result.quoteAmount}
              </p>
            )}

            {result.message && (
              <p className="text-gray-700 mb-2">{result.message}</p>
            )}

            {result.error && (
              <p className="text-red-600">
                <span className="font-medium">错误:</span> {result.error}
              </p>
            )}
          </div>
        )}

        {/* 帮助信息 */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2 text-blue-900">
            📝 阶段 1 说明
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• 这是最小可行版本，验证 Next.js ↔ NestJS ↔ n8n 连通性</li>
            <li>• 如果看到黄色提示，说明 n8n workflow 还未配置</li>
            <li>
              • 数据会保存到数据库，即使 n8n 未配置也能创建订单记录
            </li>
            <li>
              • 下一步：配置 n8n workflow，实现真实的 AI 报价功能
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
