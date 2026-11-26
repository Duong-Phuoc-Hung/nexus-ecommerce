'use client';

import { useState, type FormEvent } from 'react';
import { CheckCircle2, Mail, Search, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { requestApi } from '@/lib/axios/api-client';
import { unwrap, userMessage } from '@/lib/axios/http';

type EmailTemplateMode = 'CUSTOM' | 'WELCOME';

interface SentEmailLogItem {
  id: string;
  mode: EmailTemplateMode;
  email: string;
  title: string;
  sentAt: string;
  success: boolean;
  message: string;
}

interface NotificationLookupResult {
  id?: string;
  recipientId?: string;
  channel?: string;
  title?: string;
  body?: string;
  status?: string;
  createdAt?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AdminNotificationsScreen() {
  const [mode, setMode] = useState<EmailTemplateMode>('CUSTOM');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [fullName, setFullName] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [history, setHistory] = useState<SentEmailLogItem[]>([]);

  const [lookupId, setLookupId] = useState('');
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [lookupData, setLookupData] = useState<NotificationLookupResult | null>(null);

  async function handleSendEmail(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError('');
    setNotice('');

    const targetEmail = email.trim();
    if (!EMAIL_RE.test(targetEmail)) {
      setError('Vui lòng nhập địa chỉ email người nhận hợp lệ.');
      return;
    }

    if (mode === 'CUSTOM') {
      if (title.trim().length < 2) {
        setError('Vui lòng nhập tiêu đề thông báo.');
        return;
      }
      if (body.trim().length < 5) {
        setError('Vui lòng nhập nội dung thông báo (tối thiểu 5 ký tự).');
        return;
      }
    } else if (fullName.trim().length < 2) {
      setError('Vui lòng nhập họ tên người nhận.');
      return;
    }

    setBusy(true);
    try {
      const endpoint =
        mode === 'CUSTOM' ? '/notifications/email/send' : '/notifications/email/welcome';
      const payload =
        mode === 'CUSTOM'
          ? { email: targetEmail, title: title.trim(), body: body.trim() }
          : { email: targetEmail, fullName: fullName.trim() };

      const raw = await requestApi<{ success?: boolean; message?: string }>(endpoint, {
        method: 'POST',
        body: payload,
      });

      const ok = raw?.success !== false;
      const msg = raw?.message || (ok ? 'Đã gửi email thành công.' : 'Gửi email không thành công.');

      setHistory((prev) => [
        {
          id: `mail_${Date.now().toString(36)}`,
          mode,
          email: targetEmail,
          title: mode === 'CUSTOM' ? title.trim() : `Chào mừng ${fullName.trim()}`,
          sentAt: new Date().toLocaleTimeString('vi-VN'),
          success: ok,
          message: msg,
        },
        ...prev.slice(0, 19),
      ]);

      if (ok) {
        setNotice(msg);
        if (mode === 'CUSTOM') {
          setTitle('');
          setBody('');
        } else {
          setFullName('');
        }
      } else {
        setError(msg);
      }
    } catch (err) {
      setError(userMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleLookup(e: FormEvent) {
    e.preventDefault();
    if (lookupBusy || !lookupId.trim()) return;
    setLookupBusy(true);
    setLookupError('');
    setLookupData(null);
    try {
      const raw = await requestApi(`/notifications/${encodeURIComponent(lookupId.trim())}`);
      setLookupData(unwrap<NotificationLookupResult>(raw));
    } catch (err) {
      setLookupError(userMessage(err));
    } finally {
      setLookupBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="admin-kicker">KÊNH THÔNG BÁO &amp; EMAIL</p>
          <h1 className="mt-2">Thông báo &amp; Gửi Email</h1>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
          <Mail size={14} />
          Notification Service · Kênh Email
        </span>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[1.25fr_1fr]">
        <form
          onSubmit={handleSendEmail}
          noValidate
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-900">Soạn email gửi trực tiếp</h2>
            <div
              className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-medium"
              role="tablist"
              aria-label="Mẫu email"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'CUSTOM'}
                onClick={() => {
                  setMode('CUSTOM');
                  setError('');
                  setNotice('');
                }}
                className={`rounded-lg px-3 py-1.5 transition ${
                  mode === 'CUSTOM'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Thông báo tùy chỉnh
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'WELCOME'}
                onClick={() => {
                  setMode('WELCOME');
                  setError('');
                  setNotice('');
                }}
                className={`rounded-lg px-3 py-1.5 transition ${
                  mode === 'WELCOME'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Email chào mừng
              </button>
            </div>
          </div>

          <label className="block space-y-1.5 text-sm font-medium text-slate-800">
            Email người nhận *
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="khachhang@gmail.com"
            />
          </label>

          {mode === 'CUSTOM' ? (
            <>
              <label className="block space-y-1.5 text-sm font-medium text-slate-800">
                Tiêu đề thông báo *
                <Input
                  required
                  maxLength={140}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Thông báo cập nhật đơn hàng / phiên đấu giá"
                />
              </label>

              <label className="block space-y-1.5 text-sm font-medium text-slate-800">
                Nội dung *
                <Textarea
                  rows={5}
                  required
                  maxLength={2000}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Nhập nội dung email muốn gửi tới người dùng…"
                />
              </label>
            </>
          ) : (
            <label className="block space-y-1.5 text-sm font-medium text-slate-800">
              Họ và tên thành viên *
              <Input
                required
                maxLength={100}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nguyễn Văn A"
              />
            </label>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          {notice && (
            <p
              role="status"
              className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800"
            >
              <CheckCircle2 size={16} />
              {notice}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={busy}>
              <Send size={15} />
              {busy ? 'Đang gửi email…' : 'Gửi email ngay'}
            </Button>
          </div>
        </form>

        <div className="space-y-6">
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="font-semibold text-slate-900">Tra cứu thông báo theo mã</h2>
            <form onSubmit={handleLookup} className="flex gap-2">
              <Input
                value={lookupId}
                onChange={(e) => setLookupId(e.target.value)}
                placeholder="Nhập mã thông báo (vd: ntf_01hqz111welcome)"
              />
              <Button type="submit" variant="outline" disabled={lookupBusy || !lookupId.trim()}>
                <Search size={15} />
                {lookupBusy ? 'Đang tìm…' : 'Tra cứu'}
              </Button>
            </form>
            {lookupError && (
              <p role="alert" className="text-xs text-red-700">
                {lookupError}
              </p>
            )}
            {lookupData && (
              <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs">
                <div className="flex justify-between gap-4 py-2.5">
                  <dt className="text-slate-500">Mã</dt>
                  <dd className="font-mono font-semibold text-slate-900">{lookupData.id || '—'}</dd>
                </div>
                <div className="flex justify-between gap-4 py-2.5">
                  <dt className="text-slate-500">Tiêu đề</dt>
                  <dd className="font-medium text-slate-900">{lookupData.title || '—'}</dd>
                </div>
                <div className="flex justify-between gap-4 py-2.5">
                  <dt className="text-slate-500">Kênh</dt>
                  <dd className="text-slate-700">{lookupData.channel || '—'}</dd>
                </div>
                <div className="flex justify-between gap-4 py-2.5">
                  <dt className="text-slate-500">Trạng thái</dt>
                  <dd className="font-semibold text-emerald-700">{lookupData.status || '—'}</dd>
                </div>
              </dl>
            )}
          </section>

          <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Email đã gửi trong phiên</h2>
              <span className="text-xs text-slate-500 tabular-nums">{history.length}</span>
            </div>
            {history.length === 0 ? (
              <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-500">
                <Sparkles size={15} className="shrink-0 text-slate-400" />
                <span>Chưa có email nào được gửi trong phiên làm việc này.</span>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {history.map((item) => (
                  <li key={item.id} className="py-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="truncate text-slate-900">{item.title}</strong>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          item.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {item.success ? 'Đã gửi' : 'Thất bại'}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-500">
                      {item.email} · {item.sentAt}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
