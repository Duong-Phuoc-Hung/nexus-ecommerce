'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { StoreHeader } from '@/components/layout/store-header';
import { useSession } from '@/modules/auth/hooks/use-session';
import { ordersApi } from '@/modules/commerce/api/orders.api';
import type { OrderListItem } from '@/modules/commerce/api/orders.api';
import { userMessage } from '@/lib/axios/http';
const money = (n: number) => `${new Intl.NumberFormat('vi-VN').format(n)} ₫`;
export default function BuyerOrdersPage() {
  const { user, phase } = useSession();
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!user || user.role !== 'BUYER') {
      setLoading(false);
      return;
    }
    const c = new AbortController();
    setLoading(true);
    ordersApi
      .list({ buyerId: user.id, page: 1, limit: 20 }, c.signal)
      .then((r) => setOrders(r.items))
      .catch((e) => {
        if (!c.signal.aborted) setError(userMessage(e));
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [user, retry]);
  return (
    <>
      <StoreHeader />
      <main className="nexus-container min-h-[70vh] py-8">
        <Link href="/account" className="inline-flex min-h-11 items-center text-sm text-muted">
          ← Tài khoản
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-dark">
              TÀI KHOẢN / GIAO DỊCH
            </p>
            <h1 className="mt-2 text-3xl font-bold">Đơn hàng của tôi</h1>
            <p className="mt-2 text-sm text-muted">Theo dõi trạng thái các đơn mua của bạn.</p>
          </div>
          <Link
            href="/products"
            className="inline-flex min-h-11 items-center rounded-xl border border-line px-4 text-sm font-semibold"
          >
            Tiếp tục mua sắm
          </Link>
        </div>
        <section className="mt-6 overflow-hidden rounded-2xl border border-line bg-white">
          {phase === 'loading' || loading ? (
            <p className="p-8 text-sm text-muted" role="status">
              Đang tải đơn hàng…
            </p>
          ) : !user ? (
            <div className="p-8">
              <p>Đăng nhập để xem đơn hàng.</p>
              <Link
                className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-brand-dark px-5 text-white"
                href="/login?next=%2Faccount%2Forders"
              >
                Đăng nhập
              </Link>
            </div>
          ) : user.role !== 'BUYER' ? (
            <div className="p-8 text-sm text-muted">Trang đơn mua dành cho tài khoản Buyer.</div>
          ) : error ? (
            <div className="p-8" role="alert">
              <p>{error}</p>
              <button
                className="mt-4 min-h-11 rounded-xl border px-4"
                onClick={() => {
                  setError('');
                  setRetry((x) => x + 1);
                }}
              >
                Thử lại
              </button>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-10 text-center">
              <h2 className="text-lg font-semibold">Bạn chưa có đơn hàng</h2>
              <p className="mt-2 text-sm text-muted">
                Các đơn hàng sẽ xuất hiện tại đây sau khi thanh toán được kết nối.
              </p>
              <Link
                href="/products"
                className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-brand-dark px-5 text-white"
              >
                Khám phá sản phẩm
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-stone-50 text-muted">
                  <tr>
                    {['Mã đơn', 'Sản phẩm', 'Ngày đặt', 'Tổng tiền', 'Trạng thái', ''].map((x) => (
                      <th className="px-5 py-4 font-medium" key={x}>
                        {x}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-t border-line">
                      <td className="px-5 py-4 font-semibold">{o.id}</td>
                      <td className="px-5 py-4">{o.product}</td>
                      <td className="px-5 py-4">{o.date}</td>
                      <td className="px-5 py-4 font-semibold">{money(o.totalAmount ?? o.total)}</td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-brand-soft px-3 py-1.5 text-xs font-medium">
                          {o.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          className="font-semibold text-brand-dark underline-offset-4 hover:underline"
                          href={`/account/orders/${encodeURIComponent(o.id)}`}
                        >
                          Chi tiết
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
