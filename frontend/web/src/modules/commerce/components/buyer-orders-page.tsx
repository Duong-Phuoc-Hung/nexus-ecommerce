'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Banknote, Loader2, Package, QrCode, RefreshCw, Truck } from 'lucide-react';
import { StoreHeader } from '@/components/layout/store-header';
import { Button } from '@/components/ui/button';
import { userMessage } from '@/lib/axios/http';
import { useSession } from '@/modules/auth/hooks/use-session';
import { commerceApi } from '../api/commerce.api';
import type { OrderSummary } from '../types/order.types';
import {
  formatVndCurrency,
  getOrderPaymentPresentation,
} from '../utils/order-payment-presentation';

type OrderFilterTab = 'ALL' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

function toneBadgeClasses(tone: 'info' | 'danger' | 'success' | 'neutral'): string {
  switch (tone) {
    case 'info':
      return 'text-sky-800';
    case 'danger':
      return 'text-red-700';
    case 'success':
      return 'text-emerald-700';
    default:
      return 'text-stone-600';
  }
}

function toneDotClasses(tone: 'info' | 'danger' | 'success' | 'neutral'): string {
  switch (tone) {
    case 'info':
      return 'bg-sky-500';
    case 'danger':
      return 'bg-red-500';
    case 'success':
      return 'bg-emerald-500';
    default:
      return 'bg-stone-400';
  }
}

export default function BuyerOrdersPage() {
  const { user, phase } = useSession();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [activeTab, setActiveTab] = useState<OrderFilterTab>('ALL');

  const canViewBuyerHistory = Boolean(user && (user.role === 'BUYER' || user.role === 'SELLER'));
  const isReadOnlySellerHistory = user?.role === 'SELLER';

  const loadOrders = useCallback(
    (signal?: AbortSignal) => {
      if (!user || !canViewBuyerHistory) {
        setLoading(false);
        return;
      }
      setLoading(true);
      commerceApi
        .listOrders({ buyerId: user.id, page: 1, limit: 20 }, signal)
        .then((r) => {
          setOrders(r.items);
          setError('');
        })
        .catch((e) => {
          if (!signal?.aborted) setError(userMessage(e));
        })
        .finally(() => {
          if (!signal?.aborted) setLoading(false);
        });
    },
    [canViewBuyerHistory, user],
  );

  useEffect(() => {
    const c = new AbortController();
    loadOrders(c.signal);
    return () => c.abort();
  }, [loadOrders, retry]);

  const enrichedOrders = useMemo(
    () =>
      orders.map((order) => ({
        order,
        view: getOrderPaymentPresentation(order),
      })),
    [orders],
  );

  const filteredOrders = useMemo(() => {
    if (activeTab === 'ALL') return enrichedOrders;
    return enrichedOrders.filter(({ view }) => {
      if (activeTab === 'PROCESSING') {
        return (
          !view.isClosed &&
          !['SHIPPED', 'DELIVERED', 'COMPLETED'].includes(view.normalizedOrderStatus)
        );
      }
      if (activeTab === 'SHIPPED') {
        return view.normalizedOrderStatus === 'SHIPPED';
      }
      if (activeTab === 'DELIVERED') {
        return ['DELIVERED', 'COMPLETED'].includes(view.normalizedOrderStatus);
      }
      if (activeTab === 'CANCELLED') {
        return view.isClosed;
      }
      return true;
    });
  }, [activeTab, enrichedOrders]);

  const filterTabs: Array<{ key: OrderFilterTab; label: string }> = [
    { key: 'ALL', label: 'Tất cả' },
    { key: 'PROCESSING', label: 'Đang xử lý' },
    { key: 'SHIPPED', label: 'Đang giao hàng' },
    { key: 'DELIVERED', label: 'Hoàn tất' },
    { key: 'CANCELLED', label: 'Đã hủy / Hoàn tiền' },
  ];

  return (
    <>
      <StoreHeader />
      <main className="nexus-container min-h-[75vh] py-8">
        <Link href="/account" className="inline-flex min-h-10 items-center text-sm text-muted">
          ← Tài khoản
        </Link>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-dark">
              TÀI KHOẢN / GIAO DỊCH
            </p>
            <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
              {isReadOnlySellerHistory ? 'Lịch sử đơn mua trước đây' : 'Đơn hàng của tôi'}
            </h1>
            <p className="mt-1.5 text-sm text-muted">
              {isReadOnlySellerHistory
                ? 'Tra cứu các đơn hàng bạn đã mua trước khi kích hoạt tài khoản Seller (chế độ chỉ đọc).'
                : 'Theo dõi trạng thái đơn hàng, phương thức thanh toán và vận chuyển.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canViewBuyerHistory && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setRetry((x) => x + 1)}
                disabled={loading}
                className="h-10 rounded-xl border-line bg-white px-3.5 text-xs sm:text-sm font-semibold text-stone-700"
              >
                <RefreshCw className={`mr-1.5 size-3.5 ${loading ? 'animate-spin' : ''}`} />
                Làm mới
              </Button>
            )}
            <Link
              href="/products"
              className="inline-flex h-10 items-center rounded-xl border border-line bg-white px-4 text-xs sm:text-sm font-semibold text-stone-800 hover:bg-stone-50"
            >
              Xem sản phẩm trên sàn
            </Link>
          </div>
        </div>

        {/* Bộ lọc gọn theo tiến trình đơn hàng */}
        {canViewBuyerHistory && orders.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Lọc đơn hàng">
            {filterTabs.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    active
                      ? 'bg-stone-900 text-white shadow-2xs'
                      : 'border border-line bg-white text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        <section className="mt-5 overflow-hidden rounded-2xl border border-line bg-white shadow-xs">
          {phase === 'loading' || loading ? (
            <div className="flex items-center gap-2.5 p-8 text-sm text-muted" role="status">
              <Loader2 className="size-4 animate-spin text-brand-dark" />
              <span>Đang tải danh sách đơn hàng…</span>
            </div>
          ) : !user ? (
            <div className="p-8">
              <p className="text-sm text-stone-700">Đăng nhập để xem đơn hàng của bạn.</p>
              <Link
                className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-brand-dark px-5 text-sm font-semibold text-white"
                href="/login?next=%2Faccount%2Forders"
              >
                Đăng nhập
              </Link>
            </div>
          ) : !canViewBuyerHistory ? (
            <div className="p-8 text-sm text-muted">
              Trang đơn mua dành cho tài khoản Buyer hoặc tra cứu lịch sử mua trước đây của Seller.
            </div>
          ) : error ? (
            <div className="p-8" role="alert">
              <p className="text-sm text-red-700">{error}</p>
              <Button
                type="button"
                variant="outline"
                className="mt-4 rounded-xl"
                onClick={() => {
                  setError('');
                  setRetry((x) => x + 1);
                }}
              >
                Thử lại
              </Button>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-10 text-center">
              <Package className="mx-auto size-10 text-stone-300" />
              <h2 className="mt-3 text-lg font-semibold text-stone-900">Bạn chưa có đơn hàng</h2>
              <p className="mt-1.5 text-sm text-muted">
                Các đơn hàng sẽ xuất hiện tại đây sau khi bạn đặt mua hoặc trúng phiên đấu giá.
              </p>
              <Link
                href="/products"
                className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-brand-dark px-5 text-sm font-semibold text-white"
              >
                Khám phá sản phẩm
              </Link>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted">
              Không có đơn hàng nào khớp bộ lọc hiện tại.
            </div>
          ) : (
            <>
              {/* Bảng Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="border-b border-line bg-stone-50/90 text-xs font-semibold uppercase tracking-wide text-stone-500">
                    <tr>
                      <th className="px-5 py-3.5">Đơn hàng</th>
                      <th className="px-4 py-3.5">Tổng tiền</th>
                      <th className="px-4 py-3.5">Trạng thái đơn</th>
                      <th className="px-4 py-3.5">Thanh toán</th>
                      <th className="px-5 py-3.5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filteredOrders.map(({ order, view }) => (
                      <tr key={order.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="px-5 py-4 align-top">
                          <div className="font-mono text-xs font-bold text-stone-900">
                            #{view.displayCode}
                          </div>
                          <div className="mt-0.5 font-medium text-stone-800 line-clamp-1 max-w-[280px]">
                            {order.product}
                            {order.itemsCount > 1 ? ` (+${order.itemsCount - 1} món)` : ''}
                          </div>
                          <div className="mt-0.5 text-xs text-muted">{order.date}</div>
                        </td>

                        <td className="px-4 py-4 align-top font-semibold tabular-nums text-stone-900">
                          {formatVndCurrency(order.totalAmount ?? order.total)}
                        </td>

                        <td className="px-4 py-4 align-top">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${view.orderStatusBadgeClass}`}
                          >
                            {view.orderStatusLabel}
                          </span>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <div className="space-y-1">
                            {view.methodLabel ? (
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-800">
                                {view.methodKind === 'PAYOS' ? (
                                  <QrCode className="size-3.5 text-brand-dark shrink-0" />
                                ) : (
                                  <Banknote className="size-3.5 text-emerald-700 shrink-0" />
                                )}
                                <span>{view.methodLabel}</span>
                              </div>
                            ) : null}
                            <div
                              className={`flex items-center gap-1.5 text-xs font-medium ${toneBadgeClasses(view.moneyStatusTone)}`}
                            >
                              <span
                                className={`size-1.5 rounded-full shrink-0 ${toneDotClasses(view.moneyStatusTone)}`}
                              />
                              <span>{view.moneyStatusLabel}</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 align-top text-right">
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            {view.canTrackShipment && (
                              <Link
                                href={`/account/orders/${encodeURIComponent(order.id)}`}
                                className="inline-flex h-9 items-center gap-1 rounded-xl border border-line bg-white px-3 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                              >
                                <Truck className="size-3.5 text-brand-dark" />
                                Theo dõi giao hàng
                              </Link>
                            )}

                            <Link
                              className="inline-flex h-9 items-center gap-1 rounded-xl border border-line bg-white px-3 text-xs font-semibold text-brand-dark hover:bg-brand/5"
                              href={`/account/orders/${encodeURIComponent(order.id)}`}
                            >
                              Chi tiết
                              <ArrowRight className="size-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Thẻ Mobile */}
              <div className="divide-y divide-line md:hidden">
                {filteredOrders.map(({ order, view }) => (
                  <article key={order.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-mono text-xs font-bold text-stone-900">
                          #{view.displayCode}
                        </div>
                        <div className="text-[11px] text-muted">{order.date}</div>
                      </div>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${view.orderStatusBadgeClass}`}
                      >
                        {view.orderStatusLabel}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-medium text-stone-900 line-clamp-2">
                        {order.product}
                        {order.itemsCount > 1 ? ` (+${order.itemsCount - 1} món)` : ''}
                      </p>
                      <strong className="shrink-0 text-sm font-bold tabular-nums text-stone-900">
                        {formatVndCurrency(order.totalAmount ?? order.total)}
                      </strong>
                    </div>

                    <div className="rounded-xl border border-line/70 bg-stone-50/80 px-3 py-2.5 space-y-1">
                      {view.methodLabel ? (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-800">
                          {view.methodKind === 'PAYOS' ? (
                            <QrCode className="size-3.5 text-brand-dark shrink-0" />
                          ) : (
                            <Banknote className="size-3.5 text-emerald-700 shrink-0" />
                          )}
                          <span>{view.methodLabel}</span>
                        </div>
                      ) : null}
                      <div
                        className={`flex items-center gap-1.5 text-xs font-medium ${toneBadgeClasses(view.moneyStatusTone)}`}
                      >
                        <span
                          className={`size-1.5 rounded-full shrink-0 ${toneDotClasses(view.moneyStatusTone)}`}
                        />
                        <span>{view.moneyStatusLabel}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      {view.canTrackShipment && (
                        <Link
                          href={`/account/orders/${encodeURIComponent(order.id)}`}
                          className="inline-flex h-10 items-center gap-1 rounded-xl border border-line bg-white px-3 text-xs font-semibold text-stone-700"
                        >
                          <Truck className="size-3.5 text-brand-dark" />
                          Theo dõi giao hàng
                        </Link>
                      )}

                      <Link
                        className="inline-flex h-10 flex-1 items-center justify-center gap-1 rounded-xl border border-line bg-white px-3.5 text-xs font-semibold text-brand-dark"
                        href={`/account/orders/${encodeURIComponent(order.id)}`}
                      >
                        Chi tiết
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </main>
    </>
  );
}
