'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Eye, RefreshCw, Search, ShieldAlert, XCircle } from 'lucide-react';
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
import { catalogApi } from '@/modules/catalog/api/catalog.api';

type ModerationStatus = 'PENDING' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED';

type ModerationItem = {
  productId: string;
  title: string;
  thumbnailUrl: string;
  price: number;
  sellerName: string;
  description?: string;
  moderationStatus: ModerationStatus;
  lastReason?: string | null;
  submittedAt?: string;
};

const VIOLATION_CATEGORIES = [
  { value: 'PROHIBITED_ITEM', label: 'Hàng hóa bị cấm / hạn chế' },
  { value: 'MISLEADING_INFO', label: 'Mô tả sai sự thật / gây hiểu nhầm' },
  { value: 'COPYRIGHT', label: 'Vi phạm bản quyền / hình ảnh' },
  { value: 'FRAUD_SUSPECTED', label: 'Nghi ngờ giao dịch ngoài sàn / lừa đảo' },
  { value: 'OTHER', label: 'Vi phạm khác' },
];

const STATUS_TABS: Array<{ key: ModerationStatus; label: string }> = [
  { key: 'PENDING', label: 'Chờ duyệt' },
  { key: 'CHANGES_REQUESTED', label: 'Cần chỉnh sửa' },
  { key: 'APPROVED', label: 'Đã duyệt' },
  { key: 'REJECTED', label: 'Đã gỡ' },
];

export function AdminModerationScreen() {
  const [tab, setTab] = useState<ModerationStatus>('PENDING');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [selected, setSelected] = useState<ModerationItem | null>(null);
  const [decision, setDecision] = useState<'APPROVE' | 'REQUEST_CHANGES' | 'REJECT'>('APPROVE');
  const [violationCategory, setViolationCategory] = useState('MISLEADING_INFO');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ status: tab, page: '1', limit: '30' });
      if (query.trim()) qs.set('q', query.trim());
      const raw = await requestApi(`/products/moderation/queue?${qs}`);
      const data = unwrap<unknown>(raw);
      const list = Array.isArray(data)
        ? data
        : Array.isArray((data as Record<string, unknown>)?.items)
          ? ((data as Record<string, unknown>).items as unknown[])
          : [];
      setItems(
        (list as Array<Record<string, unknown>>).map((r) => ({
          productId: String(r.productId ?? r.id ?? ''),
          title: String(r.title ?? 'Sản phẩm'),
          thumbnailUrl: String(r.thumbnailUrl ?? '/images/nexus-product-placeholder.svg'),
          price: Number(r.price ?? 0),
          sellerName: String(r.sellerName ?? 'Người bán'),
          description: typeof r.description === 'string' ? r.description : undefined,
          moderationStatus: String(r.moderationStatus ?? tab) as ModerationStatus,
          lastReason: typeof r.lastReason === 'string' ? r.lastReason : null,
          submittedAt: typeof r.submittedAt === 'string' ? r.submittedAt : undefined,
        })),
      );
      setLoading(false);
      return;
    } catch {
      // Fallback sang catalogApi nếu BE chưa mở /products/moderation/queue
    }

    try {
      const statusMap: Record<ModerationStatus, string> = {
        PENDING: 'DRAFT',
        CHANGES_REQUESTED: 'DRAFT',
        APPROVED: 'ACTIVE',
        REJECTED: 'INACTIVE',
      };
      const page = await catalogApi.list({
        q: query.trim(),
        categoryId: '',
        minPrice: '',
        maxPrice: '',
        condition: '',
        sort: '',
        page: 1,
        pageSize: 30,
        scope: 'admin',
        status: statusMap[tab],
      });
      setItems(
        page.items.map((p) => ({
          productId: p.id,
          title: p.title,
          thumbnailUrl: p.images[0] || '/images/nexus-product-placeholder.svg',
          price: p.price ?? 0,
          sellerName: p.sellerName || p.sellerId || 'Người bán',
          description: p.description,
          moderationStatus: tab,
        })),
      );
    } catch (err) {
      setError(userMessage(err));
    } finally {
      setLoading(false);
    }
  }, [query, tab]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitDecision() {
    if (!selected || busy) return;
    setActionError('');
    if ((decision === 'REQUEST_CHANGES' || decision === 'REJECT') && reason.trim().length < 10) {
      setActionError('Vui lòng nhập lý do rõ ràng (tối thiểu 10 ký tự).');
      return;
    }

    setBusy(true);
    setNotice('');
    try {
      try {
        await requestApi(`/products/${encodeURIComponent(selected.productId)}/moderate`, {
          method: 'POST',
          body: {
            decision,
            violationCategory: decision === 'APPROVE' ? undefined : violationCategory,
            reason: reason.trim() || undefined,
          },
        });
      } catch {
        const nextStatus =
          decision === 'APPROVE' ? 'ACTIVE' : decision === 'REQUEST_CHANGES' ? 'DRAFT' : 'INACTIVE';
        await requestApi(`/products/${encodeURIComponent(selected.productId)}`, {
          method: 'PUT',
          body: { status: nextStatus },
        });
      }
      setNotice(
        decision === 'APPROVE'
          ? `Đã phê duyệt hiển thị “${selected.title}”.`
          : decision === 'REQUEST_CHANGES'
            ? `Đã gửi yêu cầu chỉnh sửa cho “${selected.title}”.`
            : `Đã gỡ bỏ sản phẩm vi phạm “${selected.title}”.`,
      );
      setSelected(null);
      setReason('');
      await load();
    } catch (err) {
      setActionError(userMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="admin-kicker">NEXUS / KIỂM DUYỆT</p>
          <h1 className="mt-2">Hàng chờ kiểm duyệt nội dung</h1>
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

      <div role="tablist" aria-label="Trạng thái kiểm duyệt" className="flex flex-wrap gap-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`min-h-10 rounded-xl px-4 text-sm font-semibold transition ${
              tab === t.key
                ? 'bg-slate-900 text-white'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4 sm:p-5">
          <label className="relative block max-w-md">
            <Search
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400"
            />
            <span className="sr-only">Tìm sản phẩm hoặc người bán</span>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm tên sản phẩm, mã hoặc Seller…"
              className="pl-10"
            />
          </label>
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
            Đang tải hàng chờ kiểm duyệt…
          </p>
        ) : items.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <ShieldAlert className="mx-auto size-8 text-slate-300" aria-hidden="true" />
            <h2 className="mt-3 text-base font-semibold text-slate-900">
              Không có nội dung cần xử lý
            </h2>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <li
                key={item.productId}
                className="flex flex-wrap items-center justify-between gap-4 p-4 hover:bg-slate-50/60 sm:px-5"
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <img
                    src={item.thumbnailUrl}
                    alt=""
                    className="size-14 shrink-0 rounded-xl border border-slate-100 bg-slate-50 object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-950">{item.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Seller: {item.sellerName} ·{' '}
                      <strong className="tabular-nums text-slate-800">
                        {new Intl.NumberFormat('vi-VN').format(item.price)} ₫
                      </strong>
                    </p>
                    {item.lastReason && (
                      <p className="mt-1 text-xs text-amber-800">Ghi chú: {item.lastReason}</p>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelected(item);
                    setDecision('APPROVE');
                    setReason('');
                    setActionError('');
                  }}
                >
                  <Eye size={15} />
                  Thẩm định
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Moderation review dialog */}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open && !busy) setSelected(null);
        }}
      >
        <DialogContent className="admin-dialog max-h-[88vh] overflow-y-auto sm:max-w-xl">
          <DialogTitle>Thẩm định nội dung sản phẩm</DialogTitle>
          <DialogDescription>{selected?.title}</DialogDescription>

          {selected && (
            <div className="mt-4 space-y-4">
              <div className="flex gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <img
                  src={selected.thumbnailUrl}
                  alt={selected.title}
                  className="size-20 shrink-0 rounded-xl bg-white object-cover"
                />
                <div className="min-w-0 text-xs space-y-1">
                  <p className="text-sm font-semibold text-slate-950">{selected.title}</p>
                  <p className="text-slate-600">Người bán: {selected.sellerName}</p>
                  <p className="font-semibold text-emerald-800 tabular-nums">
                    {new Intl.NumberFormat('vi-VN').format(selected.price)} ₫
                  </p>
                  {selected.description && (
                    <p className="line-clamp-3 text-slate-600">{selected.description}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <Button
                  type="button"
                  variant={decision === 'APPROVE' ? 'default' : 'outline'}
                  onClick={() => setDecision('APPROVE')}
                >
                  <CheckCircle2 size={15} />
                  Phê duyệt
                </Button>
                <Button
                  type="button"
                  variant={decision === 'REQUEST_CHANGES' ? 'default' : 'outline'}
                  onClick={() => setDecision('REQUEST_CHANGES')}
                >
                  Yêu cầu sửa
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={
                    decision === 'REJECT'
                      ? 'border-red-600 bg-red-600 text-white hover:bg-red-700'
                      : 'border-red-200 text-red-700 hover:bg-red-50'
                  }
                  onClick={() => setDecision('REJECT')}
                >
                  <XCircle size={15} />
                  Gỡ vi phạm
                </Button>
              </div>

              {decision !== 'APPROVE' && (
                <div className="space-y-3">
                  <label className="block space-y-1.5 text-sm font-medium">
                    Nhóm vi phạm
                    <Select value={violationCategory} onValueChange={setViolationCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VIOLATION_CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="block space-y-1.5 text-sm font-medium">
                    Lý do gửi về người bán *
                    <Textarea
                      rows={3}
                      maxLength={500}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Ghi rõ nội dung cần chỉnh sửa hoặc lý do gỡ bỏ (tối thiểu 10 ký tự)…"
                    />
                  </label>
                </div>
              )}

              {actionError && (
                <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                  {actionError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" disabled={busy} onClick={() => setSelected(null)}>
                  Quay lại
                </Button>
                <Button
                  disabled={busy}
                  className={decision === 'REJECT' ? 'bg-red-600 text-white hover:bg-red-700' : ''}
                  onClick={() => void submitDecision()}
                >
                  {busy ? 'Đang lưu…' : 'Xác nhận quyết định'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
