'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  History,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { requestApi } from '@/lib/axios/api-client';
import { unwrap, userMessage } from '@/lib/axios/http';

type InventoryRow = {
  sku: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  onHand: number;
  reserved: number;
  available: number;
  updatedAt?: string;
};

type WarehouseOption = {
  id: string;
  name: string;
};

type LedgerEntry = {
  id: string;
  adjustmentType: string;
  delta: number;
  beforeOnHand: number;
  afterOnHand: number;
  referenceType?: string;
  referenceId?: string | null;
  reason?: string;
  operatorId?: string;
  createdAt: string;
};

export function AdminInventoryScreen() {
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [queryInput, setQueryInput] = useState('');
  const [skuSearch, setSkuSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'LOW' | 'OUT_OF_STOCK'>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Adjust dialog
  const [adjustTarget, setAdjustTarget] = useState<InventoryRow | null>(null);
  const [adjustType, setAdjustType] = useState<'STOCK_IN' | 'STOCK_OUT' | 'DAMAGE'>('STOCK_IN');
  const [adjustQty, setAdjustQty] = useState('1');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustBusy, setAdjustBusy] = useState(false);
  const [adjustError, setAdjustError] = useState('');

  // Ledger dialog
  const [ledgerTarget, setLedgerTarget] = useState<InventoryRow | null>(null);
  const [ledgerRows, setLedgerRows] = useState<LedgerEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ page: String(page), limit: '15' });
      if (skuSearch) {
        qs.set('sku', skuSearch);
        qs.set('q', skuSearch);
      }
      if (warehouseFilter !== 'ALL') qs.set('warehouseId', warehouseFilter);
      if (stockFilter !== 'ALL') qs.set('stockStatus', stockFilter);

      const raw = await requestApi(`/fulfillments/inventory?${qs}`);
      const env = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
      const data = unwrap<unknown>(raw);
      const list = Array.isArray(data)
        ? data
        : Array.isArray((data as Record<string, unknown>)?.items)
          ? ((data as Record<string, unknown>).items as unknown[])
          : [];
      const mapped: InventoryRow[] = (list as Array<Record<string, unknown>>).map((r, idx) => {
        const onHand = Number(r.onHand ?? 0);
        const reserved = Number(r.reserved ?? 0);
        return {
          sku: String(r.sku ?? `SKU-${idx}`),
          productName: String(r.productName ?? r.title ?? r.sku ?? 'Sản phẩm'),
          warehouseId: String(r.warehouseId ?? ''),
          warehouseName: String(r.warehouseName ?? r.warehouseId ?? 'Kho chính'),
          onHand,
          reserved,
          available: Number(r.available ?? Math.max(0, onHand - reserved)),
          updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : undefined,
        };
      });

      const filteredLocal =
        stockFilter === 'LOW'
          ? mapped.filter((r) => r.available > 0 && r.available <= 5)
          : stockFilter === 'OUT_OF_STOCK'
            ? mapped.filter((r) => r.available <= 0)
            : mapped;
      setRows(filteredLocal);

      const pag = (env.pagination ?? (data as Record<string, unknown>)?.pagination ?? {}) as Record<
        string,
        unknown
      >;
      setTotalPages(Math.max(1, Number(pag.totalPages ?? 1)));
    } catch (err) {
      setError(userMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, skuSearch, stockFilter, warehouseFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    requestApi('/fulfillments/inventory/warehouses')
      .then((raw) => {
        const data = unwrap<unknown>(raw);
        if (Array.isArray(data)) {
          setWarehouses(
            (data as Array<Record<string, unknown>>).map((w) => ({
              id: String(w.id ?? ''),
              name: String(w.name ?? w.id ?? ''),
            })),
          );
        }
      })
      .catch(() => {
        // Suy kho từ danh sách hiện tại nếu endpoint /warehouses chưa mở
      });
  }, []);

  async function openLedger(row: InventoryRow) {
    setLedgerTarget(row);
    setLedgerRows([]);
    setLedgerLoading(true);
    try {
      const qs = new URLSearchParams({ warehouseId: row.warehouseId, page: '1', limit: '20' });
      const raw = await requestApi(
        `/fulfillments/inventory/${encodeURIComponent(row.sku)}/ledger?${qs}`,
      );
      const data = unwrap<unknown>(raw);
      const list = Array.isArray(data)
        ? data
        : Array.isArray((data as Record<string, unknown>)?.items)
          ? ((data as Record<string, unknown>).items as unknown[])
          : [];
      setLedgerRows(
        (list as Array<Record<string, unknown>>).map((item, idx) => ({
          id: String(item.id ?? `ldg-${idx}`),
          adjustmentType: String(item.adjustmentType ?? 'ADJUST'),
          delta: Number(item.delta ?? 0),
          beforeOnHand: Number(item.beforeOnHand ?? 0),
          afterOnHand: Number(item.afterOnHand ?? 0),
          referenceType: typeof item.referenceType === 'string' ? item.referenceType : undefined,
          referenceId: typeof item.referenceId === 'string' ? item.referenceId : null,
          reason: typeof item.reason === 'string' ? item.reason : undefined,
          operatorId: typeof item.operatorId === 'string' ? item.operatorId : undefined,
          createdAt: String(item.createdAt ?? ''),
        })),
      );
    } catch {
      setLedgerRows([]);
    } finally {
      setLedgerLoading(false);
    }
  }

  async function submitAdjust(e: FormEvent) {
    e.preventDefault();
    if (!adjustTarget || adjustBusy) return;
    setAdjustError('');
    const qty = Number(adjustQty);
    if (!Number.isInteger(qty) || qty <= 0) {
      setAdjustError('Số lượng điều chỉnh phải là số nguyên dương.');
      return;
    }
    if (adjustReason.trim().length < 5) {
      setAdjustError('Vui lòng nhập lý do điều chỉnh (tối thiểu 5 ký tự).');
      return;
    }
    const projectedOnHand =
      adjustType === 'STOCK_IN' ? adjustTarget.onHand + qty : adjustTarget.onHand - qty;
    if (projectedOnHand < adjustTarget.reserved) {
      setAdjustError(
        `Không thể giảm tồn vật lý (${projectedOnHand}) thấp hơn số đang giữ (${adjustTarget.reserved}).`,
      );
      return;
    }

    setAdjustBusy(true);
    setNotice('');
    try {
      await requestApi('/fulfillments/inventory/adjust', {
        method: 'POST',
        body: {
          sku: adjustTarget.sku,
          warehouseId: adjustTarget.warehouseId,
          adjustmentType: adjustType,
          quantity: qty,
          reason: adjustReason.trim(),
        },
      });
      setNotice(`Đã cập nhật tồn kho SKU ${adjustTarget.sku}.`);
      setAdjustTarget(null);
      setAdjustReason('');
      await load();
    } catch (err) {
      setAdjustError(userMessage(err));
    } finally {
      setAdjustBusy(false);
    }
  }

  const projectedOnHand = adjustTarget
    ? adjustType === 'STOCK_IN'
      ? adjustTarget.onHand + (Number(adjustQty) || 0)
      : adjustTarget.onHand - (Number(adjustQty) || 0)
    : 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="admin-kicker">NEXUS / KHO HÀNG</p>
          <h1 className="mt-2">Giám sát tồn kho SKU</h1>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Làm mới
        </Button>
      </header>

      {notice && (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
        >
          {notice}
        </p>
      )}

      {/* Quick filters */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc mức tồn kho">
        {(
          [
            ['ALL', 'Tất cả SKU'],
            ['LOW', 'Sắp hết hàng (≤ 5)'],
            ['OUT_OF_STOCK', 'Hết hàng (0)'],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            type="button"
            size="sm"
            variant={stockFilter === key ? 'default' : 'outline'}
            onClick={() => {
              setStockFilter(key);
              setPage(1);
            }}
          >
            {label}
          </Button>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSkuSearch(queryInput.trim());
            setPage(1);
          }}
          className="flex flex-wrap items-end gap-3 border-b border-slate-200 p-4 sm:p-5"
        >
          <label className="relative min-w-52 flex-1">
            <Search
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400"
            />
            <span className="sr-only">Tìm SKU hoặc tên sản phẩm</span>
            <Input
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Tìm theo mã SKU hoặc tên sản phẩm…"
              className="pl-10"
            />
          </label>
          {warehouses.length > 0 && (
            <div className="w-52">
              <Select
                value={warehouseFilter}
                onValueChange={(v) => {
                  setWarehouseFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger aria-label="Chọn kho hàng">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả kho</SelectItem>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button type="submit" variant="outline">
            Lọc
          </Button>
        </form>

        {error ? (
          <div role="alert" className="p-8 text-sm text-red-700">
            <p>{error}</p>
            <Button variant="outline" className="mt-3" onClick={() => void load()}>
              Thử lại
            </Button>
          </div>
        ) : loading ? (
          <p role="status" className="p-8 text-center text-sm text-slate-500">
            Đang tải dữ liệu tồn kho…
          </p>
        ) : rows.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Boxes className="mx-auto size-8 text-slate-300" aria-hidden="true" />
            <h2 className="mt-3 text-base font-semibold text-slate-900">
              Không có bản ghi tồn kho phù hợp
            </h2>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                <tr>
                  <th className="px-5 py-3.5">SKU &amp; sản phẩm</th>
                  <th className="px-5 py-3.5">Kho hàng</th>
                  <th className="px-5 py-3.5 text-right">Tồn vật lý</th>
                  <th className="px-5 py-3.5 text-right">Đang giữ</th>
                  <th className="px-5 py-3.5 text-right">Khả dụng</th>
                  <th className="px-5 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={`${r.sku}-${r.warehouseId}`} className="hover:bg-slate-50/60">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-950">{r.productName}</p>
                      <p className="mt-0.5 font-mono text-xs text-slate-500">{r.sku}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-700">{r.warehouseName}</td>
                    <td className="px-5 py-4 text-right font-medium tabular-nums">{r.onHand}</td>
                    <td className="px-5 py-4 text-right text-slate-600 tabular-nums">
                      {r.reserved}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${
                          r.available <= 0
                            ? 'bg-red-50 text-red-700'
                            : r.available <= 5
                              ? 'bg-amber-50 text-amber-900'
                              : 'bg-emerald-50 text-emerald-800'
                        }`}
                      >
                        {r.available}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAdjustTarget(r);
                            setAdjustType('STOCK_IN');
                            setAdjustQty('1');
                            setAdjustReason('');
                            setAdjustError('');
                          }}
                        >
                          <SlidersHorizontal size={14} />
                          Điều chỉnh
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => void openLedger(r)}
                        >
                          <History size={14} />
                          Sổ kho
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <footer className="flex items-center justify-between border-t border-slate-200 px-5 py-3.5 text-sm text-slate-600">
          <span className="tabular-nums">
            Trang {page} / {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              size="icon"
              variant="outline"
              aria-label="Trang trước"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={16} />
            </Button>
            <Button
              size="icon"
              variant="outline"
              aria-label="Trang sau"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </footer>
      </section>

      {/* Adjust Inventory Dialog */}
      <Dialog
        open={!!adjustTarget}
        onOpenChange={(open) => {
          if (!open && !adjustBusy) setAdjustTarget(null);
        }}
      >
        <DialogContent className="admin-dialog max-w-md">
          <DialogTitle>Điều chỉnh tồn kho SKU</DialogTitle>
          <DialogDescription>
            {adjustTarget?.productName} ({adjustTarget?.sku})
          </DialogDescription>

          {adjustTarget && (
            <form onSubmit={submitAdjust} className="mt-4 space-y-4">
              <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center text-xs">
                <div>
                  <p className="text-slate-500">Hiện có</p>
                  <strong className="text-sm tabular-nums">{adjustTarget.onHand}</strong>
                </div>
                <div>
                  <p className="text-slate-500">Đang giữ</p>
                  <strong className="text-sm tabular-nums">{adjustTarget.reserved}</strong>
                </div>
                <div>
                  <p className="text-slate-500">Sau chỉnh</p>
                  <strong className="text-sm text-emerald-800 tabular-nums">
                    {projectedOnHand}
                  </strong>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5 text-sm font-medium">
                  Loại biến động
                  <Select
                    value={adjustType}
                    onValueChange={(v) => setAdjustType(v as 'STOCK_IN' | 'STOCK_OUT' | 'DAMAGE')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STOCK_IN">Nhập kho (+)</SelectItem>
                      <SelectItem value="STOCK_OUT">Xuất điều chỉnh (-)</SelectItem>
                      <SelectItem value="DAMAGE">Hư hỏng / hao hụt (-)</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
                <label className="block space-y-1.5 text-sm font-medium">
                  Số lượng *
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    className="tabular-nums"
                  />
                </label>
              </div>

              <label className="block space-y-1.5 text-sm font-medium">
                Lý do điều chỉnh *
                <Textarea
                  rows={3}
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Ghi rõ biên bản kiểm kê hoặc lý do xuất/nhập…"
                />
              </label>

              {adjustError && (
                <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                  {adjustError}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={adjustBusy}
                  onClick={() => setAdjustTarget(null)}
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={adjustBusy}>
                  {adjustBusy ? 'Đang lưu…' : 'Xác nhận'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Ledger Dialog */}
      <Dialog
        open={!!ledgerTarget}
        onOpenChange={(open) => {
          if (!open) setLedgerTarget(null);
        }}
      >
        <DialogContent className="admin-dialog max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogTitle>Sổ biến động tồn kho · {ledgerTarget?.sku}</DialogTitle>
          <DialogDescription>{ledgerTarget?.productName}</DialogDescription>

          {ledgerLoading ? (
            <p role="status" className="py-8 text-center text-sm text-slate-500">
              Đang tải sổ biến động…
            </p>
          ) : ledgerRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Chưa có lịch sử biến động cho SKU này.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100 text-sm">
              {ledgerRows.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {entry.adjustmentType}{' '}
                      <span
                        className={`ml-1 font-mono ${
                          entry.delta >= 0 ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {entry.delta >= 0 ? `+${entry.delta}` : entry.delta}
                      </span>
                    </p>
                    {entry.reason && (
                      <p className="mt-0.5 text-xs text-slate-600">{entry.reason}</p>
                    )}
                  </div>
                  <div className="text-right text-xs text-slate-500 tabular-nums">
                    <p className="font-medium text-slate-800">
                      {entry.beforeOnHand} → {entry.afterOnHand}
                    </p>
                    {entry.createdAt && <p>{new Date(entry.createdAt).toLocaleString('vi-VN')}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
