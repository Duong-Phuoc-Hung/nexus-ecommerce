'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Check,
  Copy,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Trash2,
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

type Promotion = {
  id: string;
  code: string;
  name: string;
  description: string;
  discountType: 'FIXED' | 'PERCENT';
  discountValue: number;
  maxDiscountAmount: number | null;
  minOrderAmount: number;
  usageLimit: number;
  usedCount: number;
  perUserLimit: number;
  scope: 'ALL_USERS' | 'NEW_BUYERS' | 'CATEGORY';
  startsAt: string;
  endsAt: string;
  status: 'ACTIVE' | 'PAUSED' | 'SCHEDULED' | 'EXPIRED';
};

const STATUS_STYLE: Record<Promotion['status'], { label: string; className: string }> = {
  ACTIVE: { label: 'Đang chạy', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  SCHEDULED: { label: 'Sắp chạy', className: 'bg-sky-50 text-sky-900 border-sky-200' },
  PAUSED: { label: 'Tạm dừng', className: 'bg-amber-50 text-amber-950 border-amber-200' },
  EXPIRED: { label: 'Hết hạn', className: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const SCOPE_LABELS: Record<Promotion['scope'], string> = {
  ALL_USERS: 'Toàn sàn',
  NEW_BUYERS: 'Người mua mới',
  CATEGORY: 'Theo danh mục',
};

const money = (v: number) => `${new Intl.NumberFormat('vi-VN').format(Math.round(v))} ₫`;

function toLocalDateTime(iso?: string): string {
  const d = iso && Number.isFinite(Date.parse(iso)) ? new Date(iso) : new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function AdminPromotionsScreen() {
  const [rows, setRows] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [copiedCode, setCopiedCode] = useState('');
  const [notice, setNotice] = useState('');

  const [editorMode, setEditorMode] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Promotion | null>(null);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'FIXED' | 'PERCENT'>('FIXED');
  const [discountValue, setDiscountValue] = useState('50000');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState('100000');
  const [minOrderAmount, setMinOrderAmount] = useState('300000');
  const [usageLimit, setUsageLimit] = useState('200');
  const [perUserLimit, setPerUserLimit] = useState('1');
  const [scope, setScope] = useState<Promotion['scope']>('ALL_USERS');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ status: statusFilter });
      if (query.trim()) qs.set('q', query.trim());
      const raw = await requestApi(`/checkout/admin/promotions?${qs}`);
      const data = unwrap<unknown>(raw);
      const list = Array.isArray(data)
        ? data
        : Array.isArray((data as Record<string, unknown>)?.items)
          ? ((data as Record<string, unknown>).items as unknown[])
          : [];
      setRows(
        (list as Array<Record<string, unknown>>).map((r, idx) => ({
          id: String(r.id ?? `promo-${idx}`),
          code: String(r.code ?? ''),
          name: String(r.name ?? ''),
          description: String(r.description ?? ''),
          discountType:
            String(r.discountType ?? 'FIXED').toUpperCase() === 'PERCENT' ? 'PERCENT' : 'FIXED',
          discountValue: Number(r.discountValue ?? 0),
          maxDiscountAmount: r.maxDiscountAmount != null ? Number(r.maxDiscountAmount) : null,
          minOrderAmount: Number(r.minOrderAmount ?? 0),
          usageLimit: Number(r.usageLimit ?? 0),
          usedCount: Number(r.usedCount ?? 0),
          perUserLimit: Number(r.perUserLimit ?? 1),
          scope: String(r.scope ?? 'ALL_USERS').toUpperCase() as Promotion['scope'],
          startsAt: String(r.startsAt ?? ''),
          endsAt: String(r.endsAt ?? ''),
          status: String(r.status ?? 'ACTIVE').toUpperCase() as Promotion['status'],
        })),
      );
    } catch (err) {
      const msg = userMessage(err);
      if (msg.includes('404')) {
        setRows([]);
        setError('');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [query, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('vi');
    return rows.filter(
      (r) =>
        (statusFilter === 'ALL' || r.status === statusFilter) &&
        (!needle || `${r.code} ${r.name}`.toLocaleLowerCase('vi').includes(needle)),
    );
  }, [query, rows, statusFilter]);

  function openCreate() {
    setEditorMode('create');
    setEditing(null);
    setCode('');
    setName('');
    setDescription('');
    setDiscountType('FIXED');
    setDiscountValue('50000');
    setMaxDiscountAmount('100000');
    setMinOrderAmount('300000');
    setUsageLimit('200');
    setPerUserLimit('1');
    setScope('ALL_USERS');
    setStartsAt(toLocalDateTime(new Date().toISOString()));
    setEndsAt(toLocalDateTime(new Date(Date.now() + 7 * 86400000).toISOString()));
    setFormError('');
  }

  function openEdit(p: Promotion) {
    setEditorMode('edit');
    setEditing(p);
    setCode(p.code);
    setName(p.name);
    setDescription(p.description);
    setDiscountType(p.discountType);
    setDiscountValue(String(p.discountValue));
    setMaxDiscountAmount(p.maxDiscountAmount != null ? String(p.maxDiscountAmount) : '');
    setMinOrderAmount(String(p.minOrderAmount));
    setUsageLimit(String(p.usageLimit));
    setPerUserLimit(String(p.perUserLimit));
    setScope(p.scope);
    setStartsAt(toLocalDateTime(p.startsAt));
    setEndsAt(toLocalDateTime(p.endsAt));
    setFormError('');
  }

  async function savePromotion(e: FormEvent) {
    e.preventDefault();
    if (busy || !editorMode) return;
    const cleanCode = code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,32}$/.test(cleanCode)) {
      setFormError('Mã chỉ gồm chữ hoa, số, "_" hoặc "-" (3–32 ký tự).');
      return;
    }
    if (!name.trim()) {
      setFormError('Vui lòng nhập tên chiến dịch.');
      return;
    }
    const val = Number(discountValue);
    if (!Number.isFinite(val) || val <= 0) {
      setFormError('Giá trị giảm phải lớn hơn 0.');
      return;
    }
    if (discountType === 'PERCENT' && (val > 90 || Number(maxDiscountAmount) <= 0)) {
      setFormError('Giảm theo % từ 1–90% và cần mức giảm tối đa lớn hơn 0.');
      return;
    }
    const startMs = new Date(startsAt).getTime();
    const endMs = new Date(endsAt).getTime();
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
      setFormError('Thời gian kết thúc phải sau thời gian bắt đầu.');
      return;
    }

    setBusy(true);
    setFormError('');
    setNotice('');
    try {
      const payload = {
        code: cleanCode,
        name: name.trim(),
        description: description.trim(),
        discountType,
        discountValue: val,
        maxDiscountAmount: discountType === 'PERCENT' ? Number(maxDiscountAmount) : val,
        minOrderAmount: Math.max(0, Number(minOrderAmount) || 0),
        usageLimit: Math.max(1, Number(usageLimit) || 1),
        perUserLimit: Math.max(1, Number(perUserLimit) || 1),
        scope,
        startsAt: new Date(startMs).toISOString(),
        endsAt: new Date(endMs).toISOString(),
      };
      if (editorMode === 'create') {
        await requestApi('/checkout/admin/promotions', { method: 'POST', body: payload });
        setNotice(`Đã tạo mã giảm giá ${cleanCode}.`);
      } else if (editing) {
        await requestApi(`/checkout/admin/promotions/${encodeURIComponent(editing.id)}`, {
          method: 'PUT',
          body: payload,
        });
        setNotice(`Đã cập nhật mã ${cleanCode}.`);
      }
      setEditorMode(null);
      await load();
    } catch (err) {
      setFormError(userMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(p: Promotion) {
    const nextStatus = p.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED';
    setNotice('');
    try {
      await requestApi(`/checkout/admin/promotions/${encodeURIComponent(p.id)}/status`, {
        method: 'PATCH',
        body: { status: nextStatus },
      });
      setNotice(
        nextStatus === 'PAUSED' ? `Đã tạm dừng mã ${p.code}.` : `Đã kích hoạt lại mã ${p.code}.`,
      );
      await load();
    } catch (err) {
      setError(userMessage(err));
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || busy) return;
    setBusy(true);
    setFormError('');
    try {
      await requestApi(`/checkout/admin/promotions/${encodeURIComponent(deleteTarget.id)}`, {
        method: 'DELETE',
      });
      setNotice(`Đã xóa mã ${deleteTarget.code}.`);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setFormError(userMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="admin-kicker">NEXUS / VẬN HÀNH</p>
          <h1 className="mt-2">Khuyến mãi &amp; mã giảm giá</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Làm mới
          </Button>
          <Button onClick={openCreate}>
            <Plus size={16} />
            Tạo mã giảm giá
          </Button>
        </div>
      </header>

      {notice && (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
        >
          {notice}
        </p>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4 sm:p-5">
          <label className="relative min-w-52 flex-1">
            <Search
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400"
            />
            <span className="sr-only">Tìm mã giảm giá hoặc tên chiến dịch</span>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm mã hoặc tên chiến dịch…"
              className="pl-10"
            />
          </label>
          <div className="w-44">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger aria-label="Lọc trạng thái mã">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                <SelectItem value="ACTIVE">Đang chạy</SelectItem>
                <SelectItem value="SCHEDULED">Sắp chạy</SelectItem>
                <SelectItem value="PAUSED">Tạm dừng</SelectItem>
                <SelectItem value="EXPIRED">Hết hạn</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {error ? (
          <div role="alert" className="p-8 text-sm text-red-700">
            <p>{error}</p>
            <Button variant="outline" className="mt-3" onClick={() => void load()}>
              Thử lại
            </Button>
          </div>
        ) : loading ? (
          <p role="status" className="p-8 text-center text-sm text-slate-500">
            Đang tải danh sách mã giảm giá…
          </p>
        ) : visible.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Tag className="mx-auto size-8 text-slate-300" aria-hidden="true" />
            <h2 className="mt-3 text-base font-semibold text-slate-900">Chưa có mã giảm giá</h2>
            <p className="mt-1 text-sm text-slate-500">
              Tạo chiến dịch mới để áp dụng ưu đãi tại Giỏ hàng và Checkout.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                <tr>
                  <th className="px-5 py-3.5">Mã &amp; chiến dịch</th>
                  <th className="px-5 py-3.5">Mức giảm</th>
                  <th className="px-5 py-3.5">Điều kiện</th>
                  <th className="px-5 py-3.5">Lượt dùng</th>
                  <th className="px-5 py-3.5">Hiệu lực</th>
                  <th className="px-5 py-3.5">Trạng thái</th>
                  <th className="px-5 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((p) => {
                  const st = STATUS_STYLE[p.status] ?? STATUS_STYLE.ACTIVE;
                  const pct =
                    p.usageLimit > 0 ? Math.min(100, (p.usedCount / p.usageLimit) * 100) : 0;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <code className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-900">
                            {p.code}
                          </code>
                          <button
                            type="button"
                            aria-label={`Sao chép mã ${p.code}`}
                            onClick={() => {
                              void navigator.clipboard.writeText(p.code);
                              setCopiedCode(p.code);
                              window.setTimeout(() => setCopiedCode(''), 1500);
                            }}
                            className="text-slate-400 hover:text-slate-900"
                          >
                            {copiedCode === p.code ? (
                              <Check size={14} className="text-emerald-700" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                        </div>
                        <p className="mt-1 font-medium text-slate-800">{p.name}</p>
                      </td>
                      <td className="px-5 py-4 font-semibold text-emerald-800 tabular-nums">
                        {p.discountType === 'PERCENT'
                          ? `-${p.discountValue}%${p.maxDiscountAmount ? ` (tối đa ${money(p.maxDiscountAmount)})` : ''}`
                          : `-${money(p.discountValue)}`}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-600">
                        <p>Đơn từ {money(p.minOrderAmount)}</p>
                        <p className="mt-0.5 text-slate-500">
                          {SCOPE_LABELS[p.scope]} · {p.perUserLimit} lượt/tài khoản
                        </p>
                      </td>
                      <td className="px-5 py-4 text-xs tabular-nums">
                        <p className="font-semibold text-slate-900">
                          {p.usedCount} / {p.usageLimit}
                        </p>
                        <div className="mt-1.5 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-emerald-600"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-600 tabular-nums">
                        <p>{p.startsAt ? new Date(p.startsAt).toLocaleDateString('vi-VN') : '—'}</p>
                        <p className="text-slate-400">
                          → {p.endsAt ? new Date(p.endsAt).toLocaleDateString('vi-VN') : '—'}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${st.className}`}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Sửa mã"
                            onClick={() => openEdit(p)}
                          >
                            <Pencil size={15} />
                          </Button>
                          {p.status !== 'EXPIRED' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={p.status === 'PAUSED' ? 'Kích hoạt lại' : 'Tạm dừng'}
                              onClick={() => void toggleStatus(p)}
                            >
                              {p.status === 'PAUSED' ? <Play size={15} /> : <Pause size={15} />}
                            </Button>
                          )}
                          {p.usedCount === 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Xóa mã"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => {
                                setFormError('');
                                setDeleteTarget(p);
                              }}
                            >
                              <Trash2 size={15} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Create / Edit Dialog */}
      <Dialog
        open={!!editorMode}
        onOpenChange={(open) => {
          if (!open && !busy) setEditorMode(null);
        }}
      >
        <DialogContent className="admin-dialog max-h-[88vh] overflow-y-auto sm:max-w-xl">
          <DialogTitle>
            {editorMode === 'create' ? 'Tạo mã giảm giá mới' : `Chỉnh sửa mã ${code}`}
          </DialogTitle>
          <DialogDescription>
            Thiết lập mức ưu đãi, hạn mức và thời gian hiệu lực.
          </DialogDescription>

          <form onSubmit={savePromotion} className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5 text-sm font-medium">
                Mã giảm giá *
                <Input
                  value={code}
                  disabled={editorMode === 'edit' && (editing?.usedCount ?? 0) > 0}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="VD: NEXUS50K"
                  className="font-mono uppercase"
                />
              </label>
              <label className="block space-y-1.5 text-sm font-medium">
                Tên chiến dịch *
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block space-y-1.5 text-sm font-medium">
                Loại giảm
                <Select
                  value={discountType}
                  onValueChange={(v) => setDiscountType(v as 'FIXED' | 'PERCENT')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIXED">Số tiền (VND)</SelectItem>
                    <SelectItem value="PERCENT">Phần trăm (%)</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <label className="block space-y-1.5 text-sm font-medium">
                {discountType === 'PERCENT' ? 'Mức giảm (%) *' : 'Số tiền giảm (VND) *'}
                <Input
                  type="number"
                  min={1}
                  max={discountType === 'PERCENT' ? 90 : undefined}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="tabular-nums"
                />
              </label>
              {discountType === 'PERCENT' ? (
                <label className="block space-y-1.5 text-sm font-medium">
                  Giảm tối đa (VND) *
                  <Input
                    type="number"
                    min={1}
                    value={maxDiscountAmount}
                    onChange={(e) => setMaxDiscountAmount(e.target.value)}
                    className="tabular-nums"
                  />
                </label>
              ) : (
                <label className="block space-y-1.5 text-sm font-medium">
                  Đơn tối thiểu (VND)
                  <Input
                    type="number"
                    min={0}
                    value={minOrderAmount}
                    onChange={(e) => setMinOrderAmount(e.target.value)}
                    className="tabular-nums"
                  />
                </label>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {discountType === 'PERCENT' && (
                <label className="block space-y-1.5 text-sm font-medium">
                  Đơn tối thiểu (VND)
                  <Input
                    type="number"
                    min={0}
                    value={minOrderAmount}
                    onChange={(e) => setMinOrderAmount(e.target.value)}
                    className="tabular-nums"
                  />
                </label>
              )}
              <label className="block space-y-1.5 text-sm font-medium">
                Tổng lượt dùng *
                <Input
                  type="number"
                  min={1}
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(e.target.value)}
                  className="tabular-nums"
                />
              </label>
              <label className="block space-y-1.5 text-sm font-medium">
                Lượt / tài khoản *
                <Input
                  type="number"
                  min={1}
                  value={perUserLimit}
                  onChange={(e) => setPerUserLimit(e.target.value)}
                  className="tabular-nums"
                />
              </label>
              <label className="block space-y-1.5 text-sm font-medium">
                Đối tượng áp dụng
                <Select value={scope} onValueChange={(v) => setScope(v as Promotion['scope'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL_USERS">Toàn sàn</SelectItem>
                    <SelectItem value="NEW_BUYERS">Người mua mới</SelectItem>
                    <SelectItem value="CATEGORY">Theo danh mục</SelectItem>
                  </SelectContent>
                </Select>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5 text-sm font-medium">
                Bắt đầu *
                <Input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                />
              </label>
              <label className="block space-y-1.5 text-sm font-medium">
                Kết thúc *
                <Input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                />
              </label>
            </div>

            <label className="block space-y-1.5 text-sm font-medium">
              Mô tả ngắn
              <Textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>

            {formError && (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {formError}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setEditorMode(null)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? 'Đang lưu…' : editorMode === 'create' ? 'Tạo mã' : 'Lưu thay đổi'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !busy) setDeleteTarget(null);
        }}
      >
        <DialogContent className="admin-dialog max-w-md">
          <DialogTitle>Xóa mã giảm giá {deleteTarget?.code}?</DialogTitle>
          <DialogDescription>Thao tác này không thể hoàn tác.</DialogDescription>
          {formError && (
            <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {formError}
            </p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" disabled={busy} onClick={() => setDeleteTarget(null)}>
              Quay lại
            </Button>
            <Button
              disabled={busy}
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => void confirmDelete()}
            >
              {busy ? 'Đang xóa…' : 'Xác nhận xóa'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
