import { useEffect, useState } from 'react';
import { api, type AdminPayment, type AdminPaymentEvent } from '../lib/api';

function formatMoney(amount: number, currency: string) {
  return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString() : '-';
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [events, setEvents] = useState<AdminPaymentEvent[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<AdminPayment | null>(null);
  const [status, setStatus] = useState('');
  const [provider, setProvider] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadPayments() {
    setLoading(true);
    setError('');
    try {
      const result = await api.payments({ status, provider, email, limit: 100, offset: 0 });
      setPayments(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : '支付流水加载失败');
    } finally {
      setLoading(false);
    }
  }

  async function loadEvents(payment: AdminPayment) {
    setSelectedPayment(payment);
    setEvents([]);
    setError('');
    try {
      const result = await api.paymentEvents(payment.id);
      setEvents(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : '支付事件加载失败');
    }
  }

  useEffect(() => {
    void loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black">支付流水</h1>
          <p className="mt-2 text-sm text-white/48">查看 Stripe checkout、webhook、支付状态和会员权益链路。</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => void loadPayments()}>
          刷新
        </button>
      </div>

      <div className="surface mb-6 grid gap-3 p-4 md:grid-cols-4">
        <label className="text-sm text-white/60">
          状态
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="input mt-2">
            <option value="">全部</option>
            <option value="created">created</option>
            <option value="checkout_created">checkout_created</option>
            <option value="paid">paid</option>
            <option value="failed">failed</option>
            <option value="canceled">canceled</option>
            <option value="not_configured">not_configured</option>
            <option value="refunded">refunded</option>
            <option value="disputed">disputed</option>
          </select>
        </label>
        <label className="text-sm text-white/60">
          Provider
          <input value={provider} onChange={(event) => setProvider(event.target.value)} className="input mt-2" placeholder="stripe" />
        </label>
        <label className="text-sm text-white/60">
          用户邮箱
          <input value={email} onChange={(event) => setEmail(event.target.value)} className="input mt-2" placeholder="user@example.com" />
        </label>
        <div className="flex items-end">
          <button type="button" className="btn btn-secondary w-full" onClick={() => void loadPayments()}>
            筛选
          </button>
        </div>
      </div>

      {error && <p className="mb-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}

      <div className="surface overflow-x-auto">
        <table className="w-full min-w-[1280px] text-left text-sm">
          <thead className="bg-white/[0.04] text-white/45">
            <tr>
              <th className="px-4 py-3">支付 ID</th>
              <th className="px-4 py-3">用户邮箱</th>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">金额</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3">方式</th>
              <th className="px-4 py-3">paidAt</th>
              <th className="px-4 py-3">failedAt</th>
              <th className="px-4 py-3">canceledAt</th>
              <th className="px-4 py-3">Session</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">创建时间</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={13} className="px-4 py-8 text-center text-white/45">
                  加载中...
                </td>
              </tr>
            ) : payments.length ? (
              payments.map((payment) => (
                <tr key={payment.id} className="border-t border-white/[0.06]">
                  <td className="px-4 py-3 font-mono text-xs">{payment.id}</td>
                  <td className="px-4 py-3">{payment.userEmail || payment.providerCustomerEmail || '-'}</td>
                  <td className="px-4 py-3">{payment.provider}</td>
                  <td className="px-4 py-3">{formatMoney(payment.amount, payment.currency)}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-white/[0.08] px-3 py-1 text-xs">{payment.status}</span>
                  </td>
                  <td className="px-4 py-3">{payment.paymentMethod || '-'}</td>
                  <td className="px-4 py-3">{formatDate(payment.paidAt)}</td>
                  <td className="px-4 py-3">{formatDate(payment.failedAt)}</td>
                  <td className="px-4 py-3">{formatDate(payment.canceledAt)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{payment.providerSessionId || '-'}</td>
                  <td className="px-4 py-3 font-mono text-xs">{payment.providerPaymentId || '-'}</td>
                  <td className="px-4 py-3">{formatDate(payment.createdAt)}</td>
                  <td className="px-4 py-3">
                    <button type="button" className="btn btn-secondary" onClick={() => void loadEvents(payment)}>
                      事件
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={13} className="px-4 py-8 text-center text-white/45">
                  暂无支付流水
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedPayment && (
        <section className="surface mt-6 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">支付事件详情</h2>
              <p className="mt-1 font-mono text-xs text-white/42">{selectedPayment.id}</p>
            </div>
            <button type="button" className="btn btn-secondary" onClick={() => setSelectedPayment(null)}>
              关闭
            </button>
          </div>
          <div className="space-y-3">
            {events.length ? (
              events.map((event) => (
                <details key={event.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
                  <summary className="cursor-pointer text-sm font-semibold">
                    {event.eventType} · {formatDate(event.createdAt)}
                  </summary>
                  <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-black/30 p-3 text-xs text-white/62">
                    {event.payloadJson || '{}'}
                  </pre>
                </details>
              ))
            ) : (
              <p className="text-sm text-white/45">暂无 webhook 事件。</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
