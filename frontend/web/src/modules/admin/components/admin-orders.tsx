'use client';
import { useEffect, useState } from 'react';
import { commerceApi } from '@/modules/commerce/api/commerce.api';
import type { OrderSummary } from '@/modules/commerce/types/order.types';
import { userMessage } from '@/lib/axios/http';
export function AdminOrders() {
  const [query, setQuery] = useState('');
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    setLoading(true);
    setError('');
    commerceApi
      .listOrders({ q: query, page: 1, limit: 30 }, c.signal)
      .then((r) => setOrders(r.items))
      .catch((e) => {
        if (!c.signal.aborted) setError(userMessage(e));
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [query, retry]);
  return (
    <div className="space-y-6">
      <header>
        <p className="mb-2 text-xs font-bold tracking-[.16em] text-brand-dark">
          NEXUS · COMMERCE OPERATIONS
        </p>
        <h1>Giám sát đơn hàng</h1>
        <p className="mt-2 text-sm text-muted">
          Tra cứu giao dịch và kiểm tra trạng thái từ Commerce API.
        </p>
      </header>
      <section className="overflow-hidden rounded-3xl border border-line bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
          <label className="flex min-h-11 min-w-[260px] flex-1 items-center gap-2 rounded-xl border border-line px-3">
            <span aria-hidden="true">⌕</span>
            <input
              className="w-full outline-none"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm mã đơn, Buyer, email hoặc sản phẩm"
              aria-label="Tìm đơn hàng"
            />
          </label>
          <span className="text-sm text-muted">
            {loading ? 'Đang tải…' : `${orders.length} đơn hàng`}
          </span>
        </div>
        {error ? (
          <div className="p-8 text-sm" role="alert">
            {error}
            <button className="ml-3 underline" onClick={() => setRetry((x) => x + 1)}>
              Thử lại
            </button>
          </div>
        ) : loading ? (
          <div className="p-8 text-sm text-muted" role="status">
            Đang tải đơn hàng…
          </div>
        ) : !orders.length ? (
          <div className="p-10 text-center text-sm text-muted">Không có đơn hàng phù hợp.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-stone-50 text-muted">
                <tr>
                  {[
                    'Mã đơn',
                    'Buyer',
                    'Gian hàng',
                    'Sản phẩm',
                    'Ngày đặt',
                    'Tổng tiền',
                    'Trạng thái',
                  ].map((x) => (
                    <th className="px-4 py-3 font-medium" key={x}>
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-t border-line">
                    <td className="px-4 py-4 font-semibold">{o.id}</td>
                    <td className="px-4 py-4">
                      {o.buyer}
                      <small className="mt-1 block text-xs text-muted">{o.email}</small>
                    </td>
                    <td className="px-4 py-4">{o.seller}</td>
                    <td className="px-4 py-4">{o.product}</td>
                    <td className="px-4 py-4">{o.date}</td>
                    <td className="px-4 py-4 font-semibold">
                      {new Intl.NumberFormat('vi-VN').format(o.totalAmount ?? o.total)} ₫
                    </td>
                    <td className="px-4 py-4">{o.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="text-sm leading-6 text-muted">
        Chức năng này chỉ tra cứu. Hủy đơn và hoàn tiền được thực hiện trong quy trình Support có lý
        do.
      </p>
    </div>
  );
}
