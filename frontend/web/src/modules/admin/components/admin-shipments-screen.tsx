'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  Search,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

type ShipmentRow = {
  id: string;
  trackingCode: string;
  orderId: string;
  carrier: string;
  recipientName: string;
  status: string;
  createdAt?: string;
};

type EligibleOrder = {
  id: string;
  orderCode?: string;
  recipientName: string;
  phone: string;
  address: string;
  province: string;
};

type CarrierQuoteOption = {
  optionId: string;
  carrier: string;
  carrierName: string;
  serviceName: string;
  fee: number;
  etaText: string;
  estimatedDeliveryAt?: string;
  recommended?: boolean;
};

const FALLBACK_CARRIERS: CarrierQuoteOption[] = [
  {
    optionId: 'GHN_STD',
    carrier: 'GHN',
    carrierName: 'Giao Hàng Nhanh',
    serviceName: 'Tiêu chuẩn',
    fee: 32000,
    etaText: 'Dự kiến 2–3 ngày',
    recommended: true,
  },
  {
    optionId: 'GHTK_FAST',
    carrier: 'GHTK',
    carrierName: 'Giao Hàng Tiết Kiệm',
    serviceName: 'Giao nhanh',
    fee: 45000,
    etaText: 'Dự kiến 1–2 ngày',
  },
  {
    optionId: 'VTP_ECO',
    carrier: 'VIETTEL_POST',
    carrierName: 'Viettel Post',
    serviceName: 'Tiết kiệm',
    fee: 28000,
    etaText: 'Dự kiến 3–4 ngày',
  },
];

const money = (v: number) => `${new Intl.NumberFormat('vi-VN').format(Math.round(v))} ₫`;

export function AdminShipmentsScreen() {
  const [rows, setRows] = useState<ShipmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [queryInput, setQueryInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // 3-step Create Shipment Wizard
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [eligibleOrders, setEligibleOrders] = useState<EligibleOrder[]>([]);
  const [orderId, setOrderId] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [destinationProvince, setDestinationProvince] = useState('');
  const [warehouseId, setWarehouseId] = useState('WH-HCM-01');
  const [quoteOptions, setQuoteOptions] = useState<CarrierQuoteOption[]>(FALLBACK_CARRIERS);
  const [selectedOptionId, setSelectedOptionId] = useState('GHN_STD');
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [wizardError, setWizardError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) qs.set('q', search);
      if (statusFilter !== 'ALL') qs.set('status', statusFilter);
      const raw = await requestApi(`/fulfillments/shipments?${qs}`);
      const env = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
      const data = unwrap<unknown>(raw);
      const list = Array.isArray(data)
        ? data
        : Array.isArray((data as Record<string, unknown>)?.items)
          ? ((data as Record<string, unknown>).items as unknown[])
          : [];
      setRows(
        (list as Array<Record<string, unknown>>).map((r, idx) => ({
          id: String(r.id ?? `shp-${idx}`),
          trackingCode: String(r.trackingCode ?? '—'),
          orderId: String(r.orderId ?? '—'),
          carrier: String(r.carrier ?? '—'),
          recipientName: String(r.recipientName ?? '—'),
          status: String(r.status ?? 'PENDING'),
          createdAt: typeof r.createdAt === 'string' ? r.createdAt : undefined,
        })),
      );
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
  }, [page, search, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  function openWizard() {
    setWizardOpen(true);
    setStep(1);
    setOrderId('');
    setRecipientName('');
    setRecipientPhone('');
    setShippingAddress('');
    setDestinationProvince('');
    setQuoteOptions(FALLBACK_CARRIERS);
    setSelectedOptionId('GHN_STD');
    setWizardError('');

    requestApi('/orders?page=1&limit=30')
      .then((raw) => {
        const data = unwrap<unknown>(raw);
        const list = Array.isArray(data)
          ? data
          : Array.isArray((data as Record<string, unknown>)?.items)
            ? ((data as Record<string, unknown>).items as unknown[])
            : [];
        const ready = (list as Array<Record<string, unknown>>)
          .filter((o) =>
            ['PAID', 'CONFIRMED', 'PROCESSING'].includes(
              String(o.orderStatus ?? o.status ?? '').toUpperCase(),
            ),
          )
          .map((o) => {
            const addr = (o.shippingAddress ?? {}) as Record<string, unknown>;
            return {
              id: String(o.id ?? ''),
              orderCode: o.orderCode ? String(o.orderCode) : undefined,
              recipientName: String(addr.fullName ?? o.buyer ?? ''),
              phone: String(addr.phone ?? ''),
              province: String(addr.province ?? ''),
              address: [addr.addressLine, addr.ward, addr.province].filter(Boolean).join(', '),
            };
          });
        setEligibleOrders(ready);
      })
      .catch(() => setEligibleOrders([]));
  }

  function pickOrder(id: string) {
    setOrderId(id);
    const found = eligibleOrders.find((o) => o.id === id);
    if (found) {
      if (found.recipientName) setRecipientName(found.recipientName);
      if (found.phone) setRecipientPhone(found.phone);
      if (found.address) setShippingAddress(found.address);
      if (found.province) setDestinationProvince(found.province);
    }
  }

  async function fetchCarrierQuotes() {
    setWizardError('');
    if (
      !orderId.trim() ||
      !recipientName.trim() ||
      !recipientPhone.trim() ||
      !shippingAddress.trim()
    ) {
      setWizardError('Vui lòng nhập đầy đủ mã đơn, người nhận, số điện thoại và địa chỉ.');
      return;
    }
    setQuoteBusy(true);
    try {
      const raw = await requestApi('/fulfillments/shipments/quote', {
        method: 'POST',
        body: {
          orderId: orderId.trim(),
          warehouseId,
          destinationProvince: destinationProvince || undefined,
          destinationAddress: shippingAddress.trim(),
        },
      });
      const data = unwrap<Record<string, unknown>>(raw);
      if (Array.isArray(data?.options) && data.options.length > 0) {
        const opts = data.options as CarrierQuoteOption[];
        setQuoteOptions(opts);
        setSelectedOptionId(opts.find((o) => o.recommended)?.optionId || opts[0].optionId);
      }
    } catch {
      setQuoteOptions(FALLBACK_CARRIERS);
      setSelectedOptionId(FALLBACK_CARRIERS[0].optionId);
    } finally {
      setQuoteBusy(false);
      setStep(2);
    }
  }

  async function confirmCreateShipment() {
    const chosen = quoteOptions.find((o) => o.optionId === selectedOptionId) ?? quoteOptions[0];
    if (!chosen || createBusy) return;
    setCreateBusy(true);
    setWizardError('');
    setNotice('');
    try {
      await requestApi('/fulfillments/shipments', {
        method: 'POST',
        body: {
          orderId: orderId.trim(),
          warehouseId,
          carrier: chosen.carrier,
          serviceName: chosen.serviceName,
          shippingFee: chosen.fee,
          estimatedDeliveryAt: chosen.estimatedDeliveryAt,
          recipientName: recipientName.trim(),
          recipientPhone: recipientPhone.trim(),
          shippingAddress: shippingAddress.trim(),
        },
      });
      setWizardOpen(false);
      setNotice(`Đã tạo vận đơn ${chosen.carrierName} cho đơn ${orderId.trim()}.`);
      await load();
    } catch (err) {
      setWizardError(userMessage(err));
    } finally {
      setCreateBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="admin-kicker">NEXUS / VẬN CHUYỂN</p>
          <h1 className="mt-2">Quản lý vận đơn</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Làm mới
          </Button>
          <Button onClick={openWizard}>
            <Plus size={16} />
            Tạo vận đơn
          </Button>
        </div>
      </header>

      {notice && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
        >
          <CheckCircle2 size={16} />
          {notice}
        </p>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(queryInput.trim());
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
            <span className="sr-only">Tìm mã vận đơn hoặc mã đơn</span>
            <Input
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Tìm mã vận đơn, mã đơn hoặc người nhận…"
              className="pl-10"
            />
          </label>
          <div className="w-44">
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger aria-label="Trạng thái vận đơn">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                <SelectItem value="PENDING">Chờ lấy hàng</SelectItem>
                <SelectItem value="PICKED_UP">Đã lấy hàng</SelectItem>
                <SelectItem value="IN_TRANSIT">Đang giao</SelectItem>
                <SelectItem value="DELIVERED">Đã giao</SelectItem>
                <SelectItem value="FAILED_DELIVERY">Giao thất bại</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
            Đang tải danh sách vận đơn…
          </p>
        ) : rows.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Truck className="mx-auto size-8 text-slate-300" aria-hidden="true" />
            <h2 className="mt-3 text-base font-semibold text-slate-900">Chưa có vận đơn phù hợp</h2>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                <tr>
                  <th className="px-5 py-3.5">Mã vận đơn</th>
                  <th className="px-5 py-3.5">Đơn hàng</th>
                  <th className="px-5 py-3.5">Đơn vị vận chuyển</th>
                  <th className="px-5 py-3.5">Người nhận</th>
                  <th className="px-5 py-3.5">Trạng thái</th>
                  <th className="px-5 py-3.5 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-4 font-mono text-xs font-semibold text-slate-900">
                      {r.trackingCode}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-600">{r.orderId}</td>
                    <td className="px-5 py-4 font-medium text-slate-800">{r.carrier}</td>
                    <td className="px-5 py-4 text-slate-700">{r.recipientName}</td>
                    <td className="px-5 py-4">
                      <span className="admin-neutral-badge">{r.status}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/shipments/${encodeURIComponent(r.id)}`}>
                          Xem
                          <ArrowUpRight size={15} />
                        </Link>
                      </Button>
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

      {/* Create Shipment Wizard */}
      <Dialog
        open={wizardOpen}
        onOpenChange={(open) => {
          if (!open && !createBusy) setWizardOpen(false);
        }}
      >
        <DialogContent className="admin-dialog max-h-[88vh] overflow-y-auto sm:max-w-xl">
          <DialogTitle>Tạo vận đơn · Bước {step}/2</DialogTitle>
          <DialogDescription>
            {step === 1
              ? 'Chọn đơn hàng hợp lệ và xác nhận thông tin giao nhận.'
              : 'So sánh báo giá hãng vận chuyển, thời gian dự kiến và tạo vận đơn.'}
          </DialogDescription>

          {step === 1 ? (
            <div className="mt-4 space-y-4">
              {eligibleOrders.length > 0 && (
                <label className="block space-y-1.5 text-sm font-medium">
                  Chọn nhanh đơn sẵn sàng giao
                  <Select value={orderId} onValueChange={pickOrder}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn đơn hàng…" />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleOrders.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.orderCode || o.id.slice(0, 12)} · {o.recipientName || 'Buyer'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5 text-sm font-medium">
                  Mã đơn hàng *
                  <Input
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    placeholder="UUID đơn hàng"
                  />
                </label>
                <label className="block space-y-1.5 text-sm font-medium">
                  Kho lấy hàng
                  <Select value={warehouseId} onValueChange={setWarehouseId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WH-HCM-01">Kho TP. Hồ Chí Minh</SelectItem>
                      <SelectItem value="WH-HN-01">Kho Hà Nội</SelectItem>
                      <SelectItem value="WH-DN-01">Kho Đà Nẵng</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5 text-sm font-medium">
                  Người nhận *
                  <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
                </label>
                <label className="block space-y-1.5 text-sm font-medium">
                  Số điện thoại *
                  <Input
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                  />
                </label>
              </div>

              <label className="block space-y-1.5 text-sm font-medium">
                Địa chỉ giao hàng *
                <Input
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                />
              </label>

              {wizardError && (
                <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                  {wizardError}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setWizardOpen(false)}>
                  Hủy
                </Button>
                <Button disabled={quoteBusy} onClick={() => void fetchCarrierQuotes()}>
                  {quoteBusy ? 'Đang tra báo giá…' : 'Tra báo giá vận chuyển'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="space-y-2.5" role="radiogroup" aria-label="Chọn hãng vận chuyển">
                {quoteOptions.map((opt) => {
                  const active = selectedOptionId === opt.optionId;
                  return (
                    <label
                      key={opt.optionId}
                      className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3.5 transition ${
                        active
                          ? 'border-emerald-700 bg-emerald-50/60'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="adminCarrierQuote"
                          checked={active}
                          onChange={() => setSelectedOptionId(opt.optionId)}
                          className="size-4 accent-emerald-700"
                        />
                        <span>
                          <strong className="text-sm text-slate-950">
                            {opt.carrierName} · {opt.serviceName}
                          </strong>
                          <span className="mt-0.5 block text-xs text-slate-500">{opt.etaText}</span>
                        </span>
                      </span>
                      <strong className="text-sm font-bold text-slate-950 tabular-nums">
                        {money(opt.fee)}
                      </strong>
                    </label>
                  );
                })}
              </div>

              {wizardError && (
                <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                  {wizardError}
                </p>
              )}

              <div className="flex justify-between gap-2 pt-1">
                <Button variant="outline" disabled={createBusy} onClick={() => setStep(1)}>
                  Quay lại
                </Button>
                <Button disabled={createBusy} onClick={() => void confirmCreateShipment()}>
                  {createBusy ? 'Đang tạo vận đơn…' : 'Xác nhận tạo vận đơn'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
