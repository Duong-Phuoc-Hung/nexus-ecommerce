'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw, UserRound, ShieldCheck, Settings, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { requestApi, apiClient } from '@/lib/axios/api-client';
import { unwrap, userMessage } from '@/lib/axios/http';
import { useSession } from '@/modules/auth/hooks/use-session';
import { appConfig } from '@/configs/app.config';
import { resources } from '../config/resources';
import { displayAdminValue } from './admin-resource-screen';
import { AdminShipmentActions } from './admin-shipment-actions';
type Row = Record<string, unknown>;
const row = (v: unknown): Row =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Row) : {};
export function AdminDetailScreen({ section, id }: { section: string; id: string }) {
  const config = resources[section];
  const [data, setData] = useState<Row | null>(null),
    [error, setError] = useState(''),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    setData(null);
    setError('');
    const path =
      section === 'reputation'
        ? '/users'
        : section === 'shipments'
          ? '/fulfillments/shipments'
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
        <p className="mt-2 break-all text-sm text-slate-500">{id}</p>
      </header>
      {error ? (
        <section role="alert" className="admin-card">
          <p>{error}</p>
          <Button className="mt-4" onClick={() => setRevision((v) => v + 1)}>
            Thử lại
          </Button>
        </section>
      ) : !data ? (
        <p role="status">Đang tải hồ sơ…</p>
      ) : (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="font-semibold">Thông tin chung</h2>
            <dl className="mt-4 grid gap-x-8 sm:grid-cols-2">
              {fields.map(([key, label]) => (
                <div key={key} className="border-t border-slate-100 py-4">
                  <dt className="text-sm text-slate-500">{label}</dt>
                  <dd className="mt-1 break-words font-medium">{displayAdminValue(data[key])}</dd>
                </div>
              ))}
            </dl>
          </section>
          {['items', 'timeline'].map(
            (key) =>
              Array.isArray(data[key]) && (
                <section key={key} className="rounded-2xl border border-slate-200 bg-white p-6">
                  <h2 className="font-semibold">
                    {key === 'items' ? 'Sản phẩm trong đơn' : 'Hành trình xử lý'}
                  </h2>
                  <ul className="mt-4 divide-y divide-slate-100">
                    {(data[key] as unknown[]).map((v, i) => {
                      const r = row(v);
                      return (
                        <li key={i} className="py-4">
                          <strong>
                            {displayAdminValue(r.title ?? r.name ?? r.productId ?? r.status)}
                          </strong>
                          <p className="mt-1 text-sm text-slate-500">
                            {[
                              r.quantity != null ? 'Số lượng: ' + r.quantity : null,
                              r.price != null ? 'Đơn giá: ' + r.price : null,
                              r.description,
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
      {section === 'shipments' && data && (
        <AdminShipmentActions data={data} onSaved={() => setRevision((v) => v + 1)} />
      )}
    </div>
  );
}
export function AdminProfile() {
  const { user, retry } = useSession();
  const [name, setName] = useState(''),
    [phone, setPhone] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
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
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError('');
    setNotice('');
    if (!name.trim() || name.trim().length > 100) {
      setError('Họ tên cần từ 1 đến 100 ký tự.');
      return;
    }
    if (phone && !/^[+0-9\s-]{8,15}$/.test(phone)) {
      setError('Vui lòng kiểm tra số điện thoại.');
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
  return (
    <div className="space-y-6">
      <header>
        <p className="admin-kicker">TÀI KHOẢN CỦA BẠN</p>
        <h1 className="mt-2">Hồ sơ quản trị viên</h1>
        <p className="mt-2 text-sm text-slate-600">
          Giữ thông tin liên hệ chính xác để phối hợp xử lý công việc.
        </p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <form
          onSubmit={save}
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6"
        >
          <UserRound className="text-slate-500" />
          <h2 className="font-semibold">Thông tin cá nhân</h2>
          <label className="block space-y-2 text-sm font-medium">
            Họ và tên
            <Input
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block space-y-2 text-sm font-medium">
            Email
            <Input value={user?.email ?? ''} readOnly />
          </label>
          <label className="block space-y-2 text-sm font-medium">
            Điện thoại
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          {error && (
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
        <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
          <ShieldCheck className="text-slate-500" />
          <h2 className="font-semibold">Bảo mật tài khoản</h2>
          <p className="text-sm leading-6 text-slate-600">
            Vai trò quản trị được kiểm tra theo phiên đăng nhập. Chức năng đổi mật khẩu trực tiếp
            đang được hoàn thiện.
          </p>
          <Button asChild variant="outline">
            <Link href="/forgot-password">Khôi phục mật khẩu</Link>
          </Button>
        </aside>
      </div>
    </div>
  );
}
export function AdminSettings() {
  const groups = [
    {
      title: 'Đấu giá',
      fields: [
        'Thời lượng phiên tối thiểu (phút)',
        'Thời lượng phiên tối đa (giờ)',
        'Giới hạn phiên đang mở của Seller',
      ],
    },
    {
      title: 'Thanh toán & đơn hàng',
      fields: [
        'Thời hạn thanh toán đơn thường (phút)',
        'Thời hạn thanh toán đơn thắng (giờ)',
        'Thời gian giữ hàng (phút)',
      ],
    },
    {
      title: 'Uy tín & kiểm soát',
      fields: [
        'Điểm tối thiểu để đặt giá',
        'Điểm tối thiểu để mở phiên',
        'Mức phạt không thanh toán',
      ],
    },
    {
      title: 'Tài khoản & bảo mật',
      fields: [
        'Thời gian hết phiên (phút)',
        'Số lần đăng nhập sai tối đa',
        'Thời hạn access token (phút)',
      ],
    },
    {
      title: 'Sản phẩm & danh mục',
      fields: ['Số ảnh tối đa của sản phẩm', 'Độ sâu tối đa danh mục'],
    },
    {
      title: 'Kho hàng & vận chuyển',
      fields: [
        'Thời gian giữ tồn kho (phút)',
        'Số kho tối đa mỗi đơn',
        'Số lần thử lại giao vận',
        'Ngưỡng miễn phí giao hàng',
      ],
    },
    { title: 'Thông báo', fields: ['Số lần thử lại gửi thông báo'] },
  ];
  return (
    <div className="space-y-6">
      <header>
        <p className="admin-kicker">CHÍNH SÁCH VẬN HÀNH</p>
        <h1 className="mt-2">Cấu hình hệ thống</h1>
        <p className="mt-2 text-sm text-slate-600">Kiểm soát các ngưỡng nghiệp vụ tại một nơi.</p>
      </header>
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Chưa tải được cấu hình đang áp dụng. Các ô bên dưới chỉ dùng chuẩn bị đề xuất, chưa lưu vào
        hệ thống.
      </p>
      <div className="grid items-start gap-5 xl:grid-cols-3">
        {groups.map((group) => (
          <section
            key={group.title}
            className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6"
          >
            <Settings size={22} className="text-slate-500" />
            <h2 className="font-semibold">{group.title}</h2>
            {group.fields.map((label) => (
              <label key={label} className="block space-y-2 text-sm">
                {label}
                <Input type="number" min="0" placeholder="Chưa có giá trị hiện hành" />
              </label>
            ))}
          </section>
        ))}
      </div>
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-600">
          Thay đổi chính sách cần lý do và lịch sử kiểm toán.
        </p>
        <Button disabled>Lưu cấu hình</Button>
      </div>
    </div>
  );
}
export function AdminHealth() {
  const [result, setResult] = useState<Row | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [time, setTime] = useState('');
  async function check() {
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const url = new URL(appConfig.api.baseUrl);
      url.pathname = '/health';
      url.search = '';
      url.hash = '';
      const response = await apiClient.get(url.href);
      setResult(row(response.data));
      setTime(new Date().toLocaleString('vi-VN'));
    } catch (e) {
      setError(userMessage(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void check();
  }, []);
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="admin-kicker">GIÁM SÁT KẾT NỐI</p>
          <h1 className="mt-2">Tình trạng dịch vụ</h1>
        </div>
        <Button onClick={() => void check()} disabled={busy}>
          <RefreshCw size={16} />
          {busy ? 'Đang kiểm tra…' : 'Kiểm tra lại'}
        </Button>
      </header>
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <Activity className="text-slate-500" />
        <h2 className="mt-4 font-semibold">Cổng kết nối hệ thống</h2>
        <p role="status" className="mt-2 text-sm">
          {error ||
            (busy
              ? 'Đang kiểm tra…'
              : result?.status === 'UP'
                ? 'Gateway đang phản hồi.'
                : 'Chưa xác nhận được trạng thái.')}
        </p>
        {time && <p className="mt-2 text-xs text-slate-500">Lần kiểm tra: {time}</p>}
      </section>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {['Người dùng', 'Sản phẩm', 'Đơn hàng', 'Đấu giá', 'Vận chuyển', 'Thông báo'].map(
          (name) => (
            <section key={name} className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="font-semibold">{name}</h2>
              <p className="mt-2 text-sm text-slate-500">
                Chưa có kiểm tra sức khỏe riêng qua Gateway.
              </p>
            </section>
          ),
        )}
      </div>
      <p className="text-sm text-slate-500">
        Gateway phản hồi không đồng nghĩa tất cả dịch vụ bên trong đang hoạt động.
      </p>
    </div>
  );
}
