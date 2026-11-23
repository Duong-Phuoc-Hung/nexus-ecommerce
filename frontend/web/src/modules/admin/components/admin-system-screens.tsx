'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { apiClient, requestApi } from '@/lib/axios/api-client';
import { unwrap, userMessage } from '@/lib/axios/http';
import { useSession } from '@/modules/auth/hooks/use-session';
import { appConfig } from '@/configs/app.config';
import { resources } from '../config/resources';
import { displayAdminValue } from './admin-resource-screen';
import { AdminShipmentActions } from './admin-shipment-actions';
import { AdminOrderActions } from './admin-order-actions';
import { AdminReputationActions } from './admin-reputation-actions';

type Row = Record<string, unknown>;
const row = (v: unknown): Row =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Row) : {};

const PASSWORD_POLICY_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,64}$/;

export function AdminDetailScreen({ section, id }: { section: string; id: string }) {
  const config = resources[section];
  const [data, setData] = useState<Row | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const c = new AbortController();
    setData(null);
    setError('');
    const path =
      section === 'reputation'
        ? '/users'
        : section === 'shipments'
          ? '/fulfillments/shipments'
          : section === 'events'
            ? '/notifications/event-logs'
            : '/' + section;
    requestApi(path + '/' + encodeURIComponent(id), { signal: c.signal })
      .then((v) => {
        if (!c.signal.aborted) setData(row(unwrap(v)));
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(userMessage(e));
      });
    return () => c.abort();
  }, [section, id, revision]);

  const fields = [
    ...config.columns,
    ['id', 'Mã định danh'],
    ['email', 'Email'],
    ['phone', 'Điện thoại'],
    ['fullName', 'Họ tên'],
    ['reputationScore', 'Điểm uy tín'],
    ['shippingAddress', 'Địa chỉ giao hàng'],
    ['paymentStatus', 'Thanh toán'],
    ['createdAt', 'Ngày tạo'],
    ['updatedAt', 'Cập nhật gần nhất'],
  ].filter(([k], i, a) => a.findIndex((x) => x[0] === k) === i);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost">
        <Link href={'/admin/' + section}>
          <ArrowLeft size={16} />
          Về danh sách
        </Link>
      </Button>
      <header>
        <p className="admin-kicker">HỒ SƠ CHI TIẾT</p>
        <h1 className="mt-2">{config.title}</h1>
        <p className="mt-1.5 break-all font-mono text-xs text-slate-500">{id}</p>
      </header>
      {error ? (
        <section role="alert" className="admin-card">
          <p className="text-sm text-red-700">{error}</p>
          <Button className="mt-4" variant="outline" onClick={() => setRevision((v) => v + 1)}>
            Thử lại
          </Button>
        </section>
      ) : !data ? (
        <p role="status" className="text-sm text-slate-500">
          Đang tải hồ sơ…
        </p>
      ) : (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="font-semibold text-slate-900">Thông tin chung</h2>
            <dl className="mt-4 grid gap-x-8 sm:grid-cols-2">
              {fields.map(([key, label]) => (
                <div key={key} className="border-t border-slate-100 py-3.5">
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="mt-1 break-words text-sm font-medium text-slate-900">
                    {displayAdminValue(data[key])}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {section === 'orders' && (
            <AdminOrderActions data={data} onSaved={() => setRevision((v) => v + 1)} />
          )}
          {section === 'reputation' && (
            <AdminReputationActions data={data} onSaved={() => setRevision((v) => v + 1)} />
          )}
          {section === 'shipments' && (
            <AdminShipmentActions data={data} onSaved={() => setRevision((v) => v + 1)} />
          )}

          {['items', 'timeline'].map(
            (key) =>
              Array.isArray(data[key]) && (
                <section key={key} className="rounded-2xl border border-slate-200 bg-white p-6">
                  <h2 className="font-semibold text-slate-900">
                    {key === 'items' ? 'Sản phẩm trong đơn' : 'Hành trình xử lý'}
                  </h2>
                  <ul className="mt-4 divide-y divide-slate-100">
                    {(data[key] as unknown[]).map((v, i) => {
                      const r = row(v);
                      return (
                        <li key={i} className="py-3.5 text-sm">
                          <strong className="text-slate-900">
                            {displayAdminValue(
                              r.productName ?? r.title ?? r.name ?? r.productId ?? r.status,
                            )}
                          </strong>
                          <p className="mt-1 text-xs text-slate-500">
                            {[
                              r.quantity != null ? 'SL: ' + r.quantity : null,
                              r.unitPrice != null
                                ? `Đơn giá: ${new Intl.NumberFormat('vi-VN').format(Number(r.unitPrice))} ₫`
                                : r.price != null
                                  ? `Đơn giá: ${new Intl.NumberFormat('vi-VN').format(Number(r.price))} ₫`
                                  : null,
                              r.note ?? r.description,
                              r.timestamp,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ),
          )}
        </>
      )}
    </div>
  );
}

export function AdminProfile() {
  const { user, retry } = useSession();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [invalidField, setInvalidField] = useState('');
  const [notice, setNotice] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwNotice, setPwNotice] = useState('');

  useEffect(() => {
    const c = new AbortController();
    requestApi('/users/profile', { signal: c.signal })
      .then((v) => {
        if (c.signal.aborted) return;
        const p = row(unwrap(v));
        setName(String(p.fullName ?? ''));
        setPhone(String(p.phone ?? ''));
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(userMessage(e));
      });
    return () => c.abort();
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError('');
    setInvalidField('');
    setNotice('');
    if (!name.trim() || name.trim().length > 100) {
      setInvalidField('name');
      setError('Họ tên cần từ 1 đến 100 ký tự.');
      return;
    }
    if (phone.trim() && !/^(?:0|\+84)\d{9}$/.test(phone.replace(/[\s.-]/g, ''))) {
      setInvalidField('phone');
      setError('Số điện thoại không đúng định dạng Việt Nam.');
      return;
    }
    setBusy(true);
    try {
      await requestApi('/users/profile', {
        method: 'PATCH',
        body: { fullName: name.trim(), ...(phone.trim() ? { phone: phone.trim() } : {}) },
      });
      setNotice('Đã cập nhật hồ sơ.');
      retry();
    } catch (e) {
      setError(userMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    if (pwBusy) return;
    setPwError('');
    setPwNotice('');
    if (!currentPassword) {
      setPwError('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (!PASSWORD_POLICY_RE.test(newPassword)) {
      setPwError('Mật khẩu mới cần 8–64 ký tự, có chữ hoa, chữ thường và số.');
      return;
    }
    if (newPassword === currentPassword) {
      setPwError('Mật khẩu mới không được trùng mật khẩu cũ.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Xác nhận mật khẩu chưa khớp.');
      return;
    }
    setPwBusy(true);
    try {
      await requestApi('/users/change-password', {
        method: 'POST',
        body: { currentPassword, newPassword },
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwNotice('Đã cập nhật mật khẩu.');
    } catch (e) {
      setPwError(userMessage(e));
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="admin-kicker">TÀI KHOẢN CỦA BẠN</p>
        <h1 className="mt-2">Hồ sơ quản trị viên</h1>
      </header>
      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <form
          onSubmit={save}
          noValidate
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6"
        >
          <div className="flex items-center gap-2">
            <UserRound size={18} className="text-slate-600" />
            <h2 className="font-semibold text-slate-900">Thông tin cá nhân</h2>
          </div>
          <label className="block space-y-2 text-sm font-medium">
            Họ và tên
            <Input
              required
              maxLength={100}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (invalidField === 'name') setError('');
              }}
              aria-invalid={invalidField === 'name' && Boolean(error)}
            />
            {invalidField === 'name' && error && (
              <span role="alert" className="text-xs text-red-700">
                {error}
              </span>
            )}
          </label>
          <label className="block space-y-2 text-sm font-medium">
            Email
            <Input value={user?.email ?? ''} readOnly className="bg-slate-50 text-slate-500" />
          </label>
          <label className="block space-y-2 text-sm font-medium">
            Điện thoại
            <Input
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (invalidField === 'phone') setError('');
              }}
              aria-invalid={invalidField === 'phone' && Boolean(error)}
            />
            {invalidField === 'phone' && error && (
              <span role="alert" className="text-xs text-red-700">
                {error}
              </span>
            )}
          </label>
          {error && !invalidField && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="text-sm text-emerald-800">
              {notice}
            </p>
          )}
          <Button disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu thông tin'}</Button>
        </form>

        <form
          onSubmit={savePassword}
          noValidate
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6"
        >
          <div className="flex items-center gap-2">
            <KeyRound size={18} className="text-slate-600" />
            <h2 className="font-semibold text-slate-900">Đổi mật khẩu</h2>
          </div>
          <label className="block space-y-1.5 text-sm font-medium">
            Mật khẩu hiện tại
            <Input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            Mật khẩu mới
            <Input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            Xác nhận mật khẩu mới
            <Input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </label>
          {pwError && (
            <p role="alert" className="text-xs text-red-700">
              {pwError}
            </p>
          )}
          {pwNotice && (
            <p role="status" className="text-xs text-emerald-800">
              {pwNotice}
            </p>
          )}
          <div className="flex items-center justify-between pt-1">
            <Link
              href="/forgot-password"
              className="text-xs text-slate-500 underline underline-offset-4 hover:text-slate-900"
            >
              Khôi phục mật khẩu
            </Link>
            <Button type="submit" disabled={pwBusy}>
              {pwBusy ? 'Đang đổi…' : 'Cập nhật mật khẩu'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

type ConfigField = { key: string; label: string; defaultValue: number; min: number; max: number };

const CONFIG_GROUPS: Array<{ title: string; fields: ConfigField[] }> = [
  {
    title: 'Đấu giá',
    fields: [
      {
        key: 'auctionMinDurationMin',
        label: 'Thời lượng phiên tối thiểu (phút)',
        defaultValue: 60,
        min: 15,
        max: 1440,
      },
      {
        key: 'auctionMaxDurationHours',
        label: 'Thời lượng phiên tối đa (giờ)',
        defaultValue: 168,
        min: 1,
        max: 720,
      },
      {
        key: 'auctionMaxActivePerSeller',
        label: 'Giới hạn phiên đang mở / Seller',
        defaultValue: 10,
        min: 1,
        max: 500,
      },
    ],
  },
  {
    title: 'Thanh toán & đơn hàng',
    fields: [
      {
        key: 'orderPaymentTtlMin',
        label: 'Hạn thanh toán đơn thường (phút)',
        defaultValue: 30,
        min: 5,
        max: 1440,
      },
      {
        key: 'auctionPaymentTtlHours',
        label: 'Hạn thanh toán đơn thắng (giờ)',
        defaultValue: 24,
        min: 1,
        max: 168,
      },
      {
        key: 'cartReserveMin',
        label: 'Thời gian giữ hàng (phút)',
        defaultValue: 15,
        min: 5,
        max: 120,
      },
    ],
  },
  {
    title: 'Uy tín & kiểm soát',
    fields: [
      {
        key: 'minReputationBid',
        label: 'Điểm tối thiểu để đặt giá',
        defaultValue: 50,
        min: 0,
        max: 100,
      },
      {
        key: 'minReputationAuction',
        label: 'Điểm tối thiểu để mở phiên',
        defaultValue: 70,
        min: 0,
        max: 100,
      },
      {
        key: 'nonPaymentPenalty',
        label: 'Mức phạt không thanh toán (điểm)',
        defaultValue: 15,
        min: 1,
        max: 100,
      },
    ],
  },
  {
    title: 'Bảo mật & sản phẩm',
    fields: [
      {
        key: 'maxLoginFailures',
        label: 'Số lần đăng nhập sai tối đa',
        defaultValue: 5,
        min: 3,
        max: 20,
      },
      {
        key: 'maxProductImages',
        label: 'Số ảnh tối đa mỗi sản phẩm',
        defaultValue: 8,
        min: 1,
        max: 20,
      },
      { key: 'maxCategoryDepth', label: 'Độ sâu tối đa danh mục', defaultValue: 3, min: 1, max: 5 },
    ],
  },
];

const ALL_CONFIG_FIELDS = CONFIG_GROUPS.flatMap((g) => g.fields);

function defaultConfigValues(): Record<string, number> {
  return Object.fromEntries(ALL_CONFIG_FIELDS.map((f) => [f.key, f.defaultValue]));
}

export function AdminSettings() {
  const [baseline, setBaseline] = useState<Record<string, number>>(defaultConfigValues);
  const [draft, setDraft] = useState<Record<string, number>>(defaultConfigValues);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    requestApi('/system/config')
      .then((raw) => {
        const data = row(unwrap(raw));
        const merged = { ...defaultConfigValues() };
        for (const f of ALL_CONFIG_FIELDS) {
          const val = Number(data[f.key]);
          if (Number.isFinite(val)) merged[f.key] = val;
        }
        setBaseline(merged);
        setDraft(merged);
      })
      .catch(() => {
        // Giữ thông số mặc định SRS khi BE chưa mở GET /system/config
      });
  }, []);

  const changedFields = ALL_CONFIG_FIELDS.filter((f) => draft[f.key] !== baseline[f.key]);

  async function confirmSave() {
    if (busy || !changedFields.length) return;
    if (reason.trim().length < 5) {
      setError('Nhập lý do thay đổi (tối thiểu 5 ký tự) để lưu nhật ký kiểm toán.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await requestApi('/system/config', {
        method: 'PUT',
        body: {
          config: draft,
          reason: reason.trim(),
        },
      });
      setBaseline(draft);
      setConfirmOpen(false);
      setReason('');
      setNotice('Đã lưu cấu hình hệ thống.');
    } catch (err) {
      setError(userMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="admin-kicker">CHÍNH SÁCH VẬN HÀNH</p>
          <h1 className="mt-2">Cấu hình hệ thống</h1>
        </div>
        <div className="flex gap-2">
          {changedFields.length > 0 && (
            <Button type="button" variant="outline" onClick={() => setDraft(baseline)}>
              Khôi phục
            </Button>
          )}
          <Button
            type="button"
            disabled={!changedFields.length}
            onClick={() => {
              setError('');
              setConfirmOpen(true);
            }}
          >
            Xem thay đổi &amp; lưu ({changedFields.length})
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

      <div className="grid items-start gap-5 xl:grid-cols-2">
        {CONFIG_GROUPS.map((group) => (
          <section
            key={group.title}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6"
          >
            <div className="flex items-center gap-2">
              <Settings size={18} className="text-slate-500" />
              <h2 className="font-semibold text-slate-900">{group.title}</h2>
            </div>
            {group.fields.map((field) => (
              <label key={field.key} className="block space-y-1.5 text-sm">
                <span className="flex items-center justify-between text-slate-700">
                  <span>{field.label}</span>
                  <span className="text-xs text-slate-400 tabular-nums">
                    ({field.min}–{field.max})
                  </span>
                </span>
                <Input
                  type="number"
                  min={field.min}
                  max={field.max}
                  value={draft[field.key]}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      [field.key]: Number(e.target.value),
                    }))
                  }
                  className="tabular-nums"
                />
              </label>
            ))}
          </section>
        ))}
      </div>

      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open && !busy) setConfirmOpen(false);
        }}
      >
        <DialogContent className="admin-dialog max-w-lg">
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck size={18} />
            Xác nhận cập nhật cấu hình
          </DialogTitle>
          <DialogDescription>
            Kiểm tra các thông số thay đổi và ghi lý do lưu nhật ký kiểm toán.
          </DialogDescription>
          <ul className="my-4 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs">
            {changedFields.map((f) => (
              <li key={f.key} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-slate-700">{f.label}</span>
                <span className="font-mono font-semibold text-slate-900">
                  {baseline[f.key]} → {draft[f.key]}
                </span>
              </li>
            ))}
          </ul>
          <label className="block space-y-1.5 text-sm font-medium">
            Lý do thay đổi *
            <Textarea
              rows={3}
              maxLength={400}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ghi rõ mục đích điều chỉnh thông số…"
            />
          </label>
          {error && (
            <p role="alert" className="mt-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" disabled={busy} onClick={() => setConfirmOpen(false)}>
              Quay lại
            </Button>
            <Button disabled={busy} onClick={() => void confirmSave()}>
              {busy ? 'Đang lưu…' : 'Xác nhận lưu'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const SERVICE_LABELS: Record<string, string> = {
  user: 'User & IAM Service',
  catalog: 'Catalog Service',
  commerce: 'Commerce & Order Service',
  auction: 'Auction & Bidding Service',
  fulfillment: 'Fulfillment & Support Service',
  chat: 'AI Chat & Messaging Service',
  notification: 'Notification Service',
};

interface GeminiAiStatus {
  configured: boolean;
  model: string;
  damageModel: string;
  fallbackModels: string[];
}

export function AdminHealth() {
  const [result, setResult] = useState<Row | null>(null);
  const [aiStatus, setAiStatus] = useState<GeminiAiStatus | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [time, setTime] = useState('');

  async function check() {
    setBusy(true);
    setError('');
    const started = performance.now();
    try {
      const url = new URL(appConfig.api.baseUrl);
      url.pathname = '/health';
      url.search = '';
      url.hash = '';
      const [response, aiRaw] = await Promise.all([
        apiClient.get(url.href),
        requestApi('/chat/ai/status').catch(() => null),
      ]);
      setResult(row(response.data));
      setAiStatus(aiRaw ? (unwrap<GeminiAiStatus>(aiRaw) ?? null) : null);
      setLatencyMs(Math.round(performance.now() - started));
      setTime(new Date().toLocaleString('vi-VN'));
    } catch (e) {
      setResult(null);
      setAiStatus(null);
      setLatencyMs(null);
      setError(userMessage(e));
      setTime(new Date().toLocaleString('vi-VN'));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void check();
  }, []);

  const servicesMap = row(result?.services);
  const serviceEntries = Object.entries(SERVICE_LABELS).map(([key, label]) => ({
    key,
    label,
    endpoint: typeof servicesMap[key] === 'string' ? String(servicesMap[key]) : null,
  }));

  const isGatewayUp = !error && result?.status === 'UP';

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="admin-kicker">GIÁM SÁT HỆ THỐNG</p>
          <h1 className="mt-2">Tình trạng dịch vụ</h1>
        </div>
        <Button onClick={() => void check()} disabled={busy}>
          <RefreshCw size={16} className={busy ? 'animate-spin' : ''} />
          {busy ? 'Đang kiểm tra…' : 'Kiểm tra lại'}
        </Button>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3.5">
            <div
              className={`grid size-11 place-items-center rounded-xl ${
                isGatewayUp ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
              }`}
            >
              <Activity size={20} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">API Gateway</h2>
              <p role="status" className="mt-0.5 text-sm text-slate-600">
                {error ||
                  (busy
                    ? 'Đang đo kết nối…'
                    : isGatewayUp
                      ? 'Đang hoạt động ổn định'
                      : 'Mất phản hồi')}
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-slate-500 tabular-nums">
            {latencyMs !== null && <p className="font-semibold text-slate-800">{latencyMs} ms</p>}
            {time && <p className="mt-0.5">{time}</p>}
          </div>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3.5">
            <div
              className={`grid size-11 place-items-center rounded-xl ${
                aiStatus?.configured
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700'
              }`}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Google Gemini AI</h2>
              <p className="mt-0.5 text-sm text-slate-600">
                {aiStatus
                  ? aiStatus.configured
                    ? `Hoạt động · ${aiStatus.model}`
                    : 'Chưa cấu hình API Key (đang chạy dự phòng)'
                  : busy
                    ? 'Đang kiểm tra…'
                    : 'Chưa kết nối dịch vụ AI'}
              </p>
            </div>
          </div>
          {aiStatus && (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                aiStatus.configured
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'bg-amber-50 text-amber-800'
              }`}
            >
              {aiStatus.configured ? 'Đã kích hoạt' : 'Chế độ dự phòng'}
            </span>
          )}
        </section>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {serviceEntries.map((svc) => (
          <section
            key={svc.key}
            className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">{svc.label}</h3>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  svc.endpoint && isGatewayUp
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {svc.endpoint && isGatewayUp ? 'Đã định tuyến' : 'Chưa xác nhận'}
              </span>
            </div>
            <p className="truncate font-mono text-xs text-slate-500">
              {svc.endpoint || 'Chưa cấu hình cổng'}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}
