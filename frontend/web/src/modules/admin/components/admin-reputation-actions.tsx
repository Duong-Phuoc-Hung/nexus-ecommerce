'use client';

import { useState } from 'react';
import { Award, CheckCircle2, ShieldAlert, ShieldBan } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { requestApi } from '@/lib/axios/api-client';
import { userMessage } from '@/lib/axios/http';

type Row = Record<string, unknown>;

const RESTRICTION_FEATURES = [
  { code: 'AUCTION_BID', label: 'Tạm chặn đặt giá đấu giá' },
  { code: 'ORDER_CREATE', label: 'Tạm chặn tạo đơn mua mới' },
  { code: 'SELLER_LISTING', label: 'Tạm chặn đăng bán sản phẩm' },
];

export function AdminReputationActions({ data, onSaved }: { data: Row; onSaved: () => void }) {
  const userId = String(data.id ?? '');
  const score = Number(data.reputationScore ?? 100);
  const tier =
    score >= 85
      ? 'Rất cao (HIGH_TRUST)'
      : score >= 75
        ? 'Tốt (GOOD)'
        : score >= 50
          ? 'Tiêu chuẩn (STANDARD)'
          : score >= 40
            ? 'Đủ điều kiện đấu giá (AUCTION_ELIGIBLE)'
            : 'Cần khôi phục (NEEDS_RECOVERY)';

  const [mode, setMode] = useState<'none' | 'adjust' | 'restrict'>('none');
  const [delta, setDelta] = useState('-10');
  const [reason, setReason] = useState('');
  const [features, setFeatures] = useState<string[]>(['AUCTION_BID']);
  const [durationDays, setDurationDays] = useState('7');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function toggleFeature(code: string) {
    setFeatures((prev) =>
      prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code],
    );
  }

  async function submit() {
    if (!userId || busy || mode === 'none') return;
    setError('');
    setNotice('');

    if (reason.trim().length < 5) {
      setError('Vui lòng nhập lý do rõ ràng (tối thiểu 5 ký tự).');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'adjust') {
        const numericDelta = Number(delta);
        if (!Number.isInteger(numericDelta) || numericDelta === 0 || Math.abs(numericDelta) > 100) {
          setError('Điểm điều chỉnh phải là số nguyên khác 0 trong khoảng -100 đến +100.');
          setBusy(false);
          return;
        }
        await requestApi(`/users/${encodeURIComponent(userId)}/adjust-reputation`, {
          method: 'POST',
          body: {
            delta: numericDelta,
            points: numericDelta,
            reason: reason.trim(),
          },
        });
        setNotice(
          `Đã điều chỉnh ${numericDelta > 0 ? `+${numericDelta}` : numericDelta} điểm uy tín.`,
        );
      } else {
        if (!features.length) {
          setError('Chọn ít nhất một tính năng cần hạn chế.');
          setBusy(false);
          return;
        }
        const parsedDays = Number(durationDays);
        if (!Number.isInteger(parsedDays) || parsedDays <= 0 || parsedDays > 36500) {
          setError('Thời hạn chế tài phải là số nguyên dương (1 - 36500 ngày).');
          setBusy(false);
          return;
        }
        for (const restriction of features) {
          await requestApi(`/users/${encodeURIComponent(userId)}/restrict-features`, {
            method: 'POST',
            body: {
              restriction,
              durationDays: parsedDays,
              reason: reason.trim(),
            },
          });
        }
        setNotice(`Đã áp dụng ${features.length} chế tài (${parsedDays} ngày) cho tài khoản.`);
      }

      setMode('none');
      setReason('');
      onSaved();
    } catch (err) {
      setError(userMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-800">
            <Award size={20} />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Hồ sơ uy tín &amp; chế tài</h2>
            <p className="text-xs text-slate-500">
              Điểm hiện tại: <strong className="tabular-nums text-slate-900">{score}</strong> · Cấp:{' '}
              <strong className="text-slate-900">{tier}</strong>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={mode === 'adjust' ? 'default' : 'outline'}
            onClick={() => {
              setMode(mode === 'adjust' ? 'none' : 'adjust');
              setError('');
            }}
          >
            Điều chỉnh điểm uy tín
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-red-200 text-red-700 hover:bg-red-50"
            onClick={() => {
              setMode(mode === 'restrict' ? 'none' : 'restrict');
              setError('');
            }}
          >
            <ShieldBan size={15} />
            Áp dụng hình phạt
          </Button>
        </div>
      </div>

      {notice && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-900"
        >
          <CheckCircle2 size={16} />
          {notice}
        </p>
      )}

      {mode !== 'none' && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          {mode === 'adjust' ? (
            <label className="block max-w-xs space-y-1.5 text-sm font-medium">
              Mức điều chỉnh điểm (-100 đến +100)
              <Input
                type="number"
                min={-100}
                max={100}
                step={1}
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                className="bg-white tabular-nums"
              />
            </label>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-900">Phạm vi hạn chế</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {RESTRICTION_FEATURES.map((item) => (
                  <label
                    key={item.code}
                    className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-xs font-medium text-slate-800"
                  >
                    <input
                      type="checkbox"
                      checked={features.includes(item.code)}
                      onChange={() => toggleFeature(item.code)}
                      className="size-4 accent-red-600"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
              <label className="block max-w-xs space-y-1.5 text-sm font-medium">
                Thời hạn áp dụng (ngày)
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  className="bg-white tabular-nums"
                />
              </label>
            </div>
          )}

          <label className="block space-y-1.5 text-sm font-medium">
            Lý do quyết định *
            <Textarea
              rows={3}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Nêu rõ mã đơn/phiên vi phạm hoặc căn cứ điều chỉnh…"
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
              className={mode === 'restrict' ? 'bg-red-600 text-white hover:bg-red-700' : ''}
              onClick={() => void submit()}
            >
              {busy ? 'Đang lưu…' : 'Xác nhận áp dụng'}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
