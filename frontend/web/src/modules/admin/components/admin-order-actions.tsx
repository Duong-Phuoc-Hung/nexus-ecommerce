'use client';

import { useCallback, useEffect, useState } from 'react';
import { Ban, CheckCircle2, RefreshCw, RotateCcw, ShieldAlert, XCircle } from 'lucide-react';
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
import { requestApi } from '@/lib/axios/api-client';
import { unwrap, userMessage } from '@/lib/axios/http';

type Row = Record<string, unknown>;

const ORDER_STATUS_TRANSITIONS: Record<string, Array<{ value: string; label: string }>> = {
  PENDING: [
    { value: 'CONFIRMED', label: 'Xác nhận đơn' },
    { value: 'PROCESSING', label: 'Đang chuẩn bị hàng' },
  ],
  PENDING_PAYMENT: [{ value: 'PAID', label: 'Đã thanh toán' }],
  PAID: [
    { value: 'PROCESSING', label: 'Đang xử lý' },
    { value: 'SHIPPED', label: 'Đang giao hàng' },
  ],
  CONFIRMED: [
    { value: 'PROCESSING', label: 'Đang xử lý' },
    { value: 'SHIPPED', label: 'Đang giao hàng' },
  ],
  PROCESSING: [{ value: 'SHIPPED', label: 'Đang giao hàng' }],
  SHIPPED: [{ value: 'DELIVERED', label: 'Đã giao thành công' }],
  DELIVERED: [{ value: 'COMPLETED', label: 'Hoàn tất đơn hàng' }],
};

export function AdminOrderActions({ data, onSaved }: { data: Row; onSaved: () => void }) {
  const orderId = String(data.id ?? '');
  const rawStatus = String(data.orderStatus ?? data.status ?? '').toUpperCase();
  const totalAmount = Number(data.totalAmount ?? data.total ?? 0);

  const [refundInfo, setRefundInfo] = useState<Row | null>(null);
  const [loadingRefund, setLoadingRefund] = useState(false);

  const [mode, setMode] = useState<'none' | 'status' | 'cancel' | 'refund' | 'reject-refund'>(
    'none',
  );
  const [nextStatus, setNextStatus] = useState('');
  const [reason, setReason] = useState('');
  const [refundAmount, setRefundAmount] = useState(
    totalAmount > 0 ? String(Math.round(totalAmount)) : '',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadRefundStatus = useCallback(async () => {
    if (!orderId) return;
    setLoadingRefund(true);
    try {
      const raw = await requestApi(`/orders/${encodeURIComponent(orderId)}/refund/status`);
      const parsed = unwrap<Row>(raw);
      setRefundInfo(parsed && typeof parsed === 'object' ? parsed : null);
    } catch {
      setRefundInfo(null);
    } finally {
      setLoadingRefund(false);
    }
  }, [orderId]);

  useEffect(() => {
    void loadRefundStatus();
  }, [loadRefundStatus]);

  const transitions = ORDER_STATUS_TRANSITIONS[rawStatus] ?? [];
  const canCancel = !['CANCELLED', 'REFUNDED', 'COMPLETED'].includes(rawStatus);
  const canRefund = !['PENDING_PAYMENT', 'REFUNDED'].includes(rawStatus);

  async function runAction() {
    if (!orderId || busy || mode === 'none') return;
    setError('');
    setNotice('');

    if (mode === 'status' && !nextStatus) {
      setError('Chọn trạng thái tiếp theo.');
      return;
    }
    if (['cancel', 'refund', 'reject-refund'].includes(mode) && reason.trim().length < 3) {
      setError('Vui lòng nhập lý do xử lý (tối thiểu 3 ký tự).');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'status') {
        await requestApi(`/orders/${encodeURIComponent(orderId)}/status`, {
          method: 'PATCH',
          body: { status: nextStatus, reason: reason.trim() || undefined },
        });
        setNotice(`Đã chuyển trạng thái đơn sang ${nextStatus}.`);
      } else if (mode === 'cancel') {
        await requestApi(`/orders/${encodeURIComponent(orderId)}/cancel`, {
          method: 'POST',
          body: { reason: reason.trim() },
        });
        setNotice('Đã hủy đơn hàng.');
      } else if (mode === 'refund') {
        const parsedAmount = Number(refundAmount);
        const body = {
          reason: reason.trim(),
          ...(Number.isFinite(parsedAmount) && parsedAmount > 0 ? { amount: parsedAmount } : {}),
        };
        try {
          await requestApi(`/orders/${encodeURIComponent(orderId)}/refund/execute`, {
            method: 'POST',
            body,
          });
        } catch {
          await requestApi(`/orders/${encodeURIComponent(orderId)}/refund`, {
            method: 'POST',
            body,
          });
        }
        setNotice('Đã ghi nhận yêu cầu thực thi hoàn tiền.');
      } else if (mode === 'reject-refund') {
        await requestApi(`/orders/${encodeURIComponent(orderId)}/reject-refund`, {
          method: 'POST',
          body: { reason: reason.trim() },
        });
        setNotice('Đã từ chối yêu cầu hoàn tiền.');
      }
      setMode('none');
      setReason('');
      setNextStatus('');
      await loadRefundStatus();
      onSaved();
    } catch (err) {
      setError(userMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">Xử lý đơn hàng &amp; hoàn tiền</h2>
          <p className="mt-1 text-xs text-slate-500">
            Trạng thái hiện tại: <strong className="text-slate-800">{rawStatus || 'N/A'}</strong>
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loadingRefund}
          onClick={() => void loadRefundStatus()}
        >
          <RefreshCw size={14} className={loadingRefund ? 'animate-spin' : ''} />
          Đối soát hoàn tiền
        </Button>
      </div>

      {refundInfo && (
        <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs sm:grid-cols-3">
          <div>
            <p className="text-slate-500">Trạng thái hoàn tiền</p>
            <p className="mt-1 font-semibold text-slate-900">
              {String(refundInfo.status ?? refundInfo.refundStatus ?? 'Chưa có yêu cầu')}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Số tiền hoàn</p>
            <p className="mt-1 font-semibold text-slate-900 tabular-nums">
              {Number(refundInfo.amount ?? refundInfo.refundAmount ?? 0) > 0
                ? `${new Intl.NumberFormat('vi-VN').format(
                    Number(refundInfo.amount ?? refundInfo.refundAmount),
                  )} ₫`
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Ghi chú / Kênh</p>
            <p className="mt-1 font-medium text-slate-700">
              {String(refundInfo.channel ?? refundInfo.reason ?? '—')}
            </p>
          </div>
        </div>
      )}

      {notice && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-900"
        >
          <CheckCircle2 size={16} />
          {notice}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {transitions.length > 0 && (
          <Button
            type="button"
            variant={mode === 'status' ? 'default' : 'outline'}
            onClick={() => {
              setMode(mode === 'status' ? 'none' : 'status');
              setNextStatus(transitions[0].value);
              setError('');
            }}
          >
            Cập nhật trạng thái
          </Button>
        )}
        {canRefund && (
          <Button
            type="button"
            variant={mode === 'refund' ? 'default' : 'outline'}
            onClick={() => {
              setMode(mode === 'refund' ? 'none' : 'refund');
              setError('');
            }}
          >
            <RotateCcw size={15} />
            Thực hiện hoàn tiền
          </Button>
        )}
        {canRefund && (
          <Button
            type="button"
            variant={mode === 'reject-refund' ? 'default' : 'outline'}
            onClick={() => {
              setMode(mode === 'reject-refund' ? 'none' : 'reject-refund');
              setError('');
            }}
          >
            <XCircle size={15} />
            Từ chối hoàn tiền
          </Button>
        )}
        {canCancel && (
          <Button
            type="button"
            variant="outline"
            className="border-red-200 text-red-700 hover:bg-red-50"
            onClick={() => {
              setMode(mode === 'cancel' ? 'none' : 'cancel');
              setError('');
            }}
          >
            <Ban size={15} />
            Hủy đơn hàng
          </Button>
        )}
      </div>

      {mode !== 'none' && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          {mode === 'status' && (
            <label className="block space-y-1.5 text-sm font-medium">
              Trạng thái tiếp theo
              <Select value={nextStatus} onValueChange={setNextStatus}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Chọn trạng thái…" />
                </SelectTrigger>
                <SelectContent>
                  {transitions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label} ({opt.value})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          )}

          {mode === 'refund' && (
            <label className="block space-y-1.5 text-sm font-medium">
              Số tiền hoàn (VND)
              <Input
                type="number"
                min={1}
                max={totalAmount > 0 ? totalAmount : undefined}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="bg-white tabular-nums"
              />
            </label>
          )}

          <label className="block space-y-1.5 text-sm font-medium">
            Lý do / ghi chú đối soát {mode !== 'status' ? '*' : '(tùy chọn)'}
            <Textarea
              rows={3}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ghi rõ căn cứ quyết định để lưu vào nhật ký đơn hàng…"
              className="bg-white"
            />
          </label>

          {error && (
            <p
              role="alert"
              className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"
            >
              <ShieldAlert size={16} />
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setMode('none');
                setError('');
              }}
            >
              Quay lại
            </Button>
            <Button
              type="button"
              disabled={busy}
              className={mode === 'cancel' ? 'bg-red-600 text-white hover:bg-red-700' : ''}
              onClick={() => void runAction()}
            >
              {busy ? 'Đang xử lý…' : 'Xác nhận thực hiện'}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
