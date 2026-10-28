'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { StoreHeader } from '@/components/layout/store-header';
import { commerceApi } from '../api/commerce.api';
import type { OrderDetail } from '../types/order.types';
import { userMessage } from '@/lib/axios/http';
import { useSession } from '@/modules/auth/hooks/use-session';
export default function BuyerOrderDetailPage({ orderId }: { orderId: string }) {
  const { user, phase } = useSession();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (phase === 'loading' || !user || user.role !== 'BUYER') return;
    const c = new AbortController();
    commerceApi
      .getOrder(orderId, c.signal)
      .then(setOrder)
      .catch((e) => {
        if (!c.signal.aborted) setError(userMessage(e));
      });
    return () => c.abort();
  }, [orderId, phase, user]);
  if (phase === 'loading')
    return (
      <>
        <StoreHeader />
        <main className="nexus-container min-h-[60vh] py-10" role="status">
          Đang xác minh tài khoản…
        </main>
      </>
    );
  if (!user || user.role !== 'BUYER')
    return (
      <>
        <StoreHeader />
        <main className="nexus-container min-h-[60vh] py-10">
          <section className="rounded-2xl border border-line bg-white p-8 text-sm">
            Đăng nhập bằng tài khoản Buyer để xem đơn mua.{' '}
            <Link
              href={`/login?next=${encodeURIComponent(`/account/orders/${orderId}`)}`}
              className="ml-2 font-semibold text-brand-dark underline"
            >
              Đăng nhập
            </Link>
          </section>
        </main>
      </>
    );
  if (order && order.buyerId !== user.id)
    return (
      <>
        <StoreHeader />
        <main className="nexus-container min-h-[60vh] py-10">
          <section className="rounded-2xl border border-line bg-white p-8">
            <h1 className="text-xl font-bold">Không tìm thấy đơn hàng</h1>
            <p className="mt-2 text-sm text-muted">Đơn này không thuộc tài khoản Buyer hiện tại.</p>
          </section>
        </main>
      </>
    );
  return (
    <>
      <StoreHeader />
      <main className="nexus-container min-h-[70vh] py-8">
        <Link
          href="/account/orders"
          className="inline-flex min-h-11 items-center text-sm text-muted"
        >
          ← Đơn hàng của tôi
        </Link>
        {error ? (
          <div className="mt-5 rounded-2xl border border-line bg-white p-8" role="alert">
            <h1 className="text-xl font-bold">Không tải được đơn hàng</h1>
            <p className="mt-3 text-sm text-muted">{error}</p>
          </div>
        ) : !order ? (
          <p
            className="mt-6 rounded-2xl border border-line bg-white p-8 text-sm text-muted"
            role="status"
          >
            Đang tải chi tiết đơn hàng…
          </p>
        ) : (
          <>
            <div className="mt-3">
              <p className="text-xs font-bold uppercase tracking-widest text-brand-dark">
                CHI TIẾT GIAO DỊCH
              </p>
              <h1 className="mt-2 text-3xl font-bold">Đơn hàng {order.id}</h1>
            </div>
            <section className="mt-6 grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
              <div className="rounded-2xl border border-line bg-white p-6">
                <div className="flex flex-wrap justify-between gap-3">
                  <h2 className="font-semibold">Sản phẩm</h2>
                  <span className="rounded-full bg-brand-soft px-3 py-1.5 text-xs">
                    {order.status}
                  </span>
                </div>
                <div className="mt-4 divide-y divide-line">
                  {order.items?.map((item, i) => (
                    <div
                      key={`${item.productId}-${i}`}
                      className="flex justify-between gap-4 py-4 text-sm"
                    >
                      <div>
                        <strong>{item.productName}</strong>
                        <p className="mt-1 text-muted">Số lượng: {item.quantity}</p>
                      </div>
                      <strong>{new Intl.NumberFormat('vi-VN').format(item.totalPrice)} ₫</strong>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between border-t border-line pt-4">
                  <strong>Tổng thanh toán</strong>
                  <strong className="text-brand-dark">
                    {new Intl.NumberFormat('vi-VN').format(order.totalAmount)} ₫
                  </strong>
                </div>
              </div>
              <div className="rounded-2xl border border-line bg-white p-6">
                <h2 className="font-semibold">Diễn biến đơn hàng</h2>
                <ol className="mt-5 space-y-5">
                  {order.timeline?.map((s, i) => (
                    <li key={`${s.timestamp}-${i}`} className="border-l-2 border-brand/30 pl-4">
                      <strong className="text-sm">{s.title || s.status}</strong>
                      <p className="mt-1 text-xs text-muted">
                        {new Date(s.timestamp).toLocaleString('vi-VN')}
                      </p>
                      {s.note && <p className="mt-1 text-sm text-muted">{s.note}</p>}
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}
