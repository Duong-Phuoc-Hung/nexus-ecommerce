'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Printer, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { requestApi } from '@/lib/axios/api-client';
import { unwrap } from '@/lib/axios/http';
import { auctionApi } from '@/modules/auction/api/auction.api';

type ReportSummary = {
  netRevenue: number;
  totalOrders: number;
  completedOrders: number;
  cancelledOrRefundedOrders: number;
  cancelRefundRate: number;
  completedAuctions: number;
};

type ReportRow = {
  period: string;
  orders: number;
  cancelledOrRefunded: number;
  revenue: number;
  completedAuctions: number;
};

type PresetKey = '7d' | '30d' | 'month' | 'custom';

function isoDate(d: Date): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function money(v: number) {
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(v))} ₫`;
}

export function AdminReportsScreen() {
  const today = useMemo(() => new Date(), []);
  const [preset, setPreset] = useState<PresetKey>('30d');
  const [fromDate, setFromDate] = useState(() => isoDate(new Date(Date.now() - 29 * 86400000)));
  const [toDate, setToDate] = useState(() => isoDate(today));
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('day');

  const [summary, setSummary] = useState<ReportSummary>({
    netRevenue: 0,
    totalOrders: 0,
    completedOrders: 0,
    cancelledOrRefundedOrders: 0,
    cancelRefundRate: 0,
    completedAuctions: 0,
  });
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  const applyPreset = (key: PresetKey) => {
    setPreset(key);
    const now = new Date();
    if (key === '7d') {
      setFromDate(isoDate(new Date(now.getTime() - 6 * 86400000)));
      setToDate(isoDate(now));
    } else if (key === '30d') {
      setFromDate(isoDate(new Date(now.getTime() - 29 * 86400000)));
      setToDate(isoDate(now));
    } else if (key === 'month') {
      setFromDate(isoDate(new Date(now.getFullYear(), now.getMonth(), 1)));
      setToDate(isoDate(now));
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ from: fromDate, to: toDate, granularity });
      const raw = await requestApi(`/orders/admin/reports?${qs}`);
      const data = unwrap<Record<string, unknown>>(raw);
      const s = (data?.summary ?? {}) as Record<string, unknown>;
      setSummary({
        netRevenue: Number(s.netRevenue ?? 0),
        totalOrders: Number(s.totalOrders ?? 0),
        completedOrders: Number(s.completedOrders ?? 0),
        cancelledOrRefundedOrders: Number(
          s.cancelledOrRefundedOrders ??
            Number(s.cancelledOrders ?? 0) + Number(s.refundedOrders ?? 0),
        ),
        cancelRefundRate: Number(s.cancelRefundRate ?? 0),
        completedAuctions: Number(s.completedAuctions ?? 0),
      });
      setRows(
        Array.isArray(data?.rows)
          ? (data.rows as Array<Record<string, unknown>>).map((r) => ({
              period: String(r.period ?? ''),
              orders: Number(r.orders ?? 0),
              cancelledOrRefunded: Number(r.cancelledOrRefunded ?? 0),
              revenue: Number(r.revenue ?? 0),
              completedAuctions: Number(r.completedAuctions ?? 0),
            }))
          : [],
      );
      setLoading(false);
      return;
    } catch {
      // Fallback tổng hợp tạm từ /orders & /auctions nếu endpoint /orders/admin/reports chưa mở
    }

    const [ordersRes, auctionsRes] = await Promise.allSettled([
      requestApi('/orders?page=1&limit=100'),
      auctionApi.list(),
    ]);

    const fromMs = new Date(`${fromDate}T00:00:00`).getTime();
    const toMs = new Date(`${toDate}T23:59:59.999`).getTime();

    const byPeriod = new Map<string, ReportRow>();
    let totalOrders = 0;
    let completedOrders = 0;
    let cancelledOrRefundedOrders = 0;
    let netRevenue = 0;
    let completedAuctions = 0;

    const bucketKey = (ts: number) => {
      const d = new Date(ts);
      if (granularity === 'month')
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return isoDate(d);
    };

    if (ordersRes.status === 'fulfilled') {
      const raw = unwrap<unknown>(ordersRes.value);
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as Record<string, unknown>)?.items)
          ? ((raw as Record<string, unknown>).items as Array<Record<string, unknown>>)
          : [];
      for (const o of list) {
        const ts = Date.parse(String(o.createdAt ?? ''));
        if (!Number.isFinite(ts) || ts < fromMs || ts > toMs) continue;
        const st = String(o.orderStatus ?? o.status ?? '').toUpperCase();
        const amt = Number(o.totalAmount ?? o.total ?? 0) || 0;
        const key = bucketKey(ts);
        const cur = byPeriod.get(key) ?? {
          period: key,
          orders: 0,
          cancelledOrRefunded: 0,
          revenue: 0,
          completedAuctions: 0,
        };
        cur.orders += 1;
        totalOrders += 1;
        if (['CANCELLED', 'REFUNDED'].includes(st)) {
          cur.cancelledOrRefunded += 1;
          cancelledOrRefundedOrders += 1;
        } else {
          cur.revenue += amt;
          netRevenue += amt;
          if (['DELIVERED', 'COMPLETED', 'PAID'].includes(st)) completedOrders += 1;
        }
        byPeriod.set(key, cur);
      }
    }

    if (auctionsRes.status === 'fulfilled') {
      for (const a of auctionsRes.value) {
        if (a.status !== 'ENDED') continue;
        if (a.endAt < fromMs || a.endAt > toMs) continue;
        completedAuctions += 1;
        const key = bucketKey(a.endAt);
        const cur = byPeriod.get(key) ?? {
          period: key,
          orders: 0,
          cancelledOrRefunded: 0,
          revenue: 0,
          completedAuctions: 0,
        };
        cur.completedAuctions += 1;
        byPeriod.set(key, cur);
      }
    }

    setSummary({
      netRevenue,
      totalOrders,
      completedOrders,
      cancelledOrRefundedOrders,
      cancelRefundRate: totalOrders > 0 ? (cancelledOrRefundedOrders / totalOrders) * 100 : 0,
      completedAuctions,
    });
    setRows(Array.from(byPeriod.values()).sort((a, b) => b.period.localeCompare(a.period)));
    setLoading(false);
  }, [fromDate, granularity, toDate]);

  useEffect(() => {
    void load();
  }, [load]);

  function exportCsv() {
    const headers = ['Kỳ báo cáo', 'Số đơn', 'Đơn hủy/hoàn', 'Doanh thu (VND)', 'Phiên hoàn tất'];
    const csvRows = [
      headers.join(','),
      ...rows.map((r) =>
        [
          r.period,
          r.orders,
          r.cancelledOrRefunded,
          Math.round(r.revenue),
          r.completedAuctions,
        ].join(','),
      ),
      [
        'Tổng cộng',
        summary.totalOrders,
        summary.cancelledOrRefundedOrders,
        Math.round(summary.netRevenue),
        summary.completedAuctions,
      ].join(','),
    ];
    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nexus-report-${fromDate}_${toDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="admin-kicker">NEXUS / GIÁM SÁT</p>
          <h1 className="mt-2">Báo cáo vận hành</h1>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Làm mới
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={loading}>
            <Download size={15} />
            Xuất CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer size={15} />
            In báo cáo
          </Button>
        </div>
      </header>

      {/* Filters */}
      <section className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 print:hidden">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Chọn nhanh kỳ báo cáo">
          {(
            [
              ['7d', '7 ngày'],
              ['30d', '30 ngày'],
              ['month', 'Tháng này'],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={preset === key ? 'default' : 'outline'}
              onClick={() => applyPreset(key)}
            >
              {label}
            </Button>
          ))}
        </div>

        <div className="ml-auto flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-xs font-semibold text-slate-600">
            Từ ngày
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setPreset('custom');
                setFromDate(e.target.value);
              }}
            />
          </label>
          <label className="space-y-1 text-xs font-semibold text-slate-600">
            Đến ngày
            <Input
              type="date"
              value={toDate}
              onChange={(e) => {
                setPreset('custom');
                setToDate(e.target.value);
              }}
            />
          </label>
          <div className="w-36 space-y-1 text-xs font-semibold text-slate-600">
            <span>Gom nhóm</span>
            <Select
              value={granularity}
              onValueChange={(v) => setGranularity(v as 'day' | 'week' | 'month')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Theo ngày</SelectItem>
                <SelectItem value="week">Theo tuần</SelectItem>
                <SelectItem value="month">Theo tháng</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* 4 KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Doanh thu thuần</p>
          <p className="mt-2 text-2xl font-bold text-emerald-800 tabular-nums">
            {loading ? '—' : money(summary.netRevenue)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Tổng số đơn hàng</p>
          <p className="mt-2 text-2xl font-bold text-slate-950 tabular-nums">
            {loading ? '—' : summary.totalOrders}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Tỷ lệ hủy / hoàn</p>
          <p className="mt-2 text-2xl font-bold text-slate-950 tabular-nums">
            {loading ? '—' : `${summary.cancelRefundRate.toFixed(1)}%`}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {summary.cancelledOrRefundedOrders} đơn hủy / hoàn
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Phiên đấu giá hoàn tất</p>
          <p className="mt-2 text-2xl font-bold text-slate-950 tabular-nums">
            {loading ? '—' : summary.completedAuctions}
          </p>
        </div>
      </div>

      {/* Reconciliation table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {loading ? (
          <p role="status" className="p-8 text-center text-sm text-slate-500">
            Đang tổng hợp số liệu báo cáo…
          </p>
        ) : rows.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500">
            Chưa có giao dịch trong khoảng thời gian đã chọn.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                <tr>
                  <th className="px-5 py-3.5">Kỳ báo cáo</th>
                  <th className="px-5 py-3.5 text-right">Số đơn</th>
                  <th className="px-5 py-3.5 text-right">Đơn hủy / hoàn</th>
                  <th className="px-5 py-3.5 text-right">Doanh thu</th>
                  <th className="px-5 py-3.5 text-right">Phiên hoàn tất</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.period} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3.5 font-medium text-slate-900 tabular-nums">
                      {r.period}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums">{r.orders}</td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-red-700">
                      {r.cancelledOrRefunded}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-slate-950 tabular-nums">
                      {money(r.revenue)}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums">{r.completedAuctions}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-bold text-slate-950">
                <tr>
                  <td className="px-5 py-3.5">Tổng cộng</td>
                  <td className="px-5 py-3.5 text-right tabular-nums">{summary.totalOrders}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-red-700">
                    {summary.cancelledOrRefundedOrders}
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-emerald-800">
                    {money(summary.netRevenue)}
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums">
                    {summary.completedAuctions}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
