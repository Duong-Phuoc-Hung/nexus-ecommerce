'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Clock3,
  Gavel,
  ReceiptText,
  RefreshCw,
  Store,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { requestApi } from '@/lib/axios/api-client';
import { unwrap } from '@/lib/axios/http';
import { auctionApi, type Auction } from '@/modules/auction/api/auction.api';
import { AuctionBadge, auctionDate } from '@/modules/auction/components/auction-ui';

type PendingSellerRow = {
  id: string;
  shopName: string;
  applicantName: string;
  status: string;
  submittedAt: string;
};

type DashboardMetrics = {
  pendingOrders: number | null;
  pendingSellerApps: number | null;
  activeOrUpcomingAuctions: number | null;
  extendedAuctions: number;
  openDisputes: number | null;
  todayRevenue: number | null;
};

const money = (v: number) => `${new Intl.NumberFormat('vi-VN').format(Math.round(v))} ₫`;

export function AdminOverview({ productsPath = '/admin/products' }: { productsPath?: string }) {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    pendingOrders: null,
    pendingSellerApps: null,
    activeOrUpcomingAuctions: null,
    extendedAuctions: 0,
    openDisputes: null,
    todayRevenue: null,
  });
  const [pendingSellers, setPendingSellers] = useState<PendingSellerRow[]>([]);
  const [watchAuctions, setWatchAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [ordersRes, sellersRes, auctionsRes, casesRes] = await Promise.allSettled([
      requestApi('/orders?page=1&limit=50'),
      requestApi('/admin/seller-applications'),
      auctionApi.list(),
      requestApi('/support/cases'),
    ]);

    const next: DashboardMetrics = {
      pendingOrders: null,
      pendingSellerApps: null,
      activeOrUpcomingAuctions: null,
      extendedAuctions: 0,
      openDisputes: null,
      todayRevenue: null,
    };

    if (ordersRes.status === 'fulfilled') {
      const raw = unwrap<unknown>(ordersRes.value);
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as Record<string, unknown>)?.items)
          ? ((raw as Record<string, unknown>).items as Array<Record<string, unknown>>)
          : [];
      if (next.pendingOrders === null) {
        next.pendingOrders = list.filter((o) =>
          ['PENDING', 'PENDING_PAYMENT', 'PAID', 'PROCESSING'].includes(
            String(o.orderStatus ?? o.status ?? '').toUpperCase(),
          ),
        ).length;
      }
      if (next.todayRevenue === null) {
        const todayStr = new Date().toISOString().slice(0, 10);
        next.todayRevenue = list
          .filter(
            (o) =>
              String(o.createdAt ?? '').startsWith(todayStr) &&
              !['CANCELLED', 'REFUNDED'].includes(String(o.status ?? '').toUpperCase()),
          )
          .reduce((acc, o) => acc + (Number(o.totalAmount ?? o.total ?? 0) || 0), 0);
      }
    }

    if (sellersRes.status === 'fulfilled') {
      const raw = unwrap<unknown>(sellersRes.value);
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as Record<string, unknown>)?.items)
          ? ((raw as Record<string, unknown>).items as Array<Record<string, unknown>>)
          : [];
      const pending = list.filter((item) =>
        ['PENDING', 'SUBMITTED', 'UNDER_REVIEW'].includes(String(item.status ?? '').toUpperCase()),
      );
      if (next.pendingSellerApps === null) next.pendingSellerApps = pending.length;
      setPendingSellers(
        pending.slice(0, 5).map((item, idx) => ({
          id: String(item.id ?? `app-${idx}`),
          shopName: String(item.shopName ?? item.storeName ?? 'Hồ sơ gian hàng'),
          applicantName: String(
            item.applicantName ?? item.fullName ?? item.email ?? 'Người đăng ký',
          ),
          status: String(item.status ?? 'PENDING'),
          submittedAt: String(item.submittedAt ?? item.createdAt ?? ''),
        })),
      );
    }

    if (auctionsRes.status === 'fulfilled') {
      const list = auctionsRes.value;
      const watch = list.filter((a) => a.status === 'SCHEDULED' || a.status === 'EXTENDED');
      if (next.activeOrUpcomingAuctions === null) {
        next.activeOrUpcomingAuctions = watch.length;
        next.extendedAuctions = list.filter((a) => a.status === 'EXTENDED').length;
      }
      setWatchAuctions(watch.slice(0, 5));
    }

    if (casesRes.status === 'fulfilled') {
      const raw = unwrap<unknown>(casesRes.value);
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as Record<string, unknown>)?.items)
          ? ((raw as Record<string, unknown>).items as Array<Record<string, unknown>>)
          : [];
      if (next.openDisputes === null) {
        next.openDisputes = list.filter((c) =>
          ['OPEN', 'INVESTIGATING', 'ESCALATED_DISPUTE'].includes(
            String(c.status ?? '').toUpperCase(),
          ),
        ).length;
      }
    }

    setMetrics(next);
    setUpdatedAt(new Date().toLocaleTimeString('vi-VN'));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const kpis = [
    {
      label: 'Đơn chờ xử lý',
      value: metrics.pendingOrders,
      href: '/admin/orders',
      icon: ReceiptText,
      tone: 'bg-sky-50 text-sky-700',
    },
    {
      label: 'Hồ sơ Seller chờ duyệt',
      value: metrics.pendingSellerApps,
      href: '/admin/seller-applications',
      icon: Store,
      tone: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'Phiên sắp mở / gia hạn',
      value: metrics.activeOrUpcomingAuctions,
      sub: metrics.extendedAuctions > 0 ? `${metrics.extendedAuctions} đang gia hạn` : undefined,
      href: '/admin/auctions',
      icon: Gavel,
      tone: 'bg-amber-50 text-amber-700',
    },
    {
      label: 'Khiếu nại đang mở',
      value: metrics.openDisputes,
      href: '/admin/orders',
      icon: AlertTriangle,
      tone: 'bg-red-50 text-red-700',
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="admin-kicker">NEXUS / QUẢN TRỊ</p>
          <h1 className="mt-2">Tổng quan vận hành</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {updatedAt && (
            <span className="text-xs text-slate-500 tabular-nums">Cập nhật: {updatedAt}</span>
          )}
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Làm mới
          </Button>
          <Button asChild size="sm">
            <Link href="/admin/reports">
              Xem báo cáo
              <ArrowUpRight size={15} />
            </Link>
          </Button>
        </div>
      </header>

      {/* 4 operational KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ label, value, sub, href, icon: Icon, tone }) => (
          <Link
            key={label}
            href={href}
            className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <span className={`grid size-10 place-items-center rounded-xl ${tone}`}>
                <Icon size={19} aria-hidden="true" />
              </span>
              <ArrowUpRight
                size={16}
                className="text-slate-400 transition group-hover:text-slate-900"
                aria-hidden="true"
              />
            </div>
            <div className="mt-4">
              <p className="text-xs font-medium text-slate-500">{label}</p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-slate-950 tabular-nums">
                {loading ? '—' : value === null ? '—' : value}
              </p>
              {sub && <p className="mt-1 text-xs font-medium text-amber-800">{sub}</p>}
            </div>
          </Link>
        ))}
      </div>

      {/* Today revenue strip + quick links */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div>
          <p className="text-xs font-medium text-slate-500">Doanh thu ghi nhận hôm nay</p>
          <p className="mt-1 text-2xl font-bold text-emerald-800 tabular-nums">
            {loading ? '—' : metrics.todayRevenue !== null ? money(metrics.todayRevenue) : '—'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={productsPath}>Sản phẩm</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/inventory">Kho hàng</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/promotions">Khuyến mãi</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/moderation">Kiểm duyệt</Link>
          </Button>
        </div>
      </section>

      {/* Two live watchlists */}
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
            <h2 className="text-base font-semibold text-slate-950">Hồ sơ Seller chờ duyệt</h2>
            <Link
              href="/admin/seller-applications"
              className="text-xs font-semibold text-emerald-800 hover:underline"
            >
              Xem tất cả
            </Link>
          </div>
          {pendingSellers.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              Không có hồ sơ Seller nào đang chờ duyệt.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {pendingSellers.map((app) => (
                <li key={app.id} className="flex items-center justify-between gap-3 py-3.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{app.shopName}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {app.applicantName}
                      {app.submittedAt &&
                        ` · ${new Date(app.submittedAt).toLocaleDateString('vi-VN')}`}
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/seller-applications/${encodeURIComponent(app.id)}`}>
                      Xét duyệt
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
            <h2 className="text-base font-semibold text-slate-950">
              Phiên sắp mở &amp; đang gia hạn
            </h2>
            <Link
              href="/admin/auctions"
              className="text-xs font-semibold text-emerald-800 hover:underline"
            >
              Quản lý phiên
            </Link>
          </div>
          {watchAuctions.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              Hiện chưa có phiên sắp mở hoặc đang gia hạn.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {watchAuctions.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-3.5 text-sm">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <AuctionBadge status={a.status} />
                      <Link
                        href={`/admin/auctions/${encodeURIComponent(a.id)}`}
                        className="truncate font-semibold text-slate-900 hover:underline"
                      >
                        {a.title}
                      </Link>
                    </div>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500 tabular-nums">
                      <Clock3 size={12} aria-hidden="true" />
                      {a.status === 'SCHEDULED'
                        ? `Mở: ${auctionDate(a.startAt)}`
                        : `Đóng: ${auctionDate(a.endAt)}`}
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/auctions/${encodeURIComponent(a.id)}`}>Xem</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
