'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Store,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { requestApi } from '@/lib/axios/api-client';
import { unwrap, userMessage } from '@/lib/axios/http';
import { useSession } from '@/modules/auth/hooks/use-session';
import { resources } from '../config/resources';
import { AdminSellerApplicationsPage } from './seller-applications-page';

type Row = Record<string, unknown>;

const PASSWORD_POLICY_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,64}$/;

const roleDescriptions = {
  BUYER: {
    label: 'Người mua',
    summary: 'Mua sắm, quản lý giỏ hàng và tham gia đấu giá.',
  },
  SELLER: {
    label: 'Người bán',
    summary: 'Đăng bán sản phẩm và vận hành gian hàng.',
  },
  SUPPORT_STAFF: {
    label: 'Nhân viên hỗ trợ',
    summary: 'Tra cứu tài khoản, đơn hàng và xử lý khiếu nại.',
  },
  ADMIN: {
    label: 'Quản trị viên',
    summary: 'Quản lý tài khoản, danh mục, đơn hàng và hệ thống.',
  },
} as const;

const obj = (v: unknown): Row =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Row) : {};

export function displayAdminValue(v: unknown, key?: string): string {
  if (v == null || v === '') return '—';
  if (key === 'totalAmount' || key === 'total') {
    const n = Number(v);
    if (Number.isFinite(n)) return `${new Intl.NumberFormat('vi-VN').format(n)} ₫`;
  }
  if (key === 'createdAt' || key === 'updatedAt' || key === 'occurredAt') {
    const ts = Date.parse(String(v));
    if (Number.isFinite(ts)) return new Date(ts).toLocaleString('vi-VN');
  }
  if (Array.isArray(v)) {
    return (
      v
        .map((x) => (typeof x === 'string' ? x : String(obj(x).name ?? obj(x).title ?? '')))
        .filter(Boolean)
        .join(', ') || '—'
    );
  }
  return typeof v === 'object' ? 'Chi tiết' : String(v);
}

function flattenCategories(rows: Row[], parent: string | null = null, depth = 1): Row[] {
  return rows.flatMap((row) => [
    { ...row, parentId: row.parentId ?? parent, level: row.level ?? depth },
    ...(depth < 3 && Array.isArray(row.children)
      ? flattenCategories(row.children.map(obj), String(row.id), depth + 1)
      : []),
  ]);
}

function collectDescendantIds(allCategories: Row[], rootId: string): Set<string> {
  const blocked = new Set<string>([rootId]);
  let expanded = true;
  while (expanded) {
    expanded = false;
    for (const c of allCategories) {
      const id = String(c.id ?? '');
      const pid = c.parentId ? String(c.parentId) : '';
      if (id && pid && blocked.has(pid) && !blocked.has(id)) {
        blocked.add(id);
        expanded = true;
      }
    }
  }
  return blocked;
}

export function AdminResourceScreen({ section }: { section: string }) {
  const config = resources[section];
  const { user } = useSession();

  const [usersTab, setUsersTab] = useState<'accounts' | 'seller-applications'>('accounts');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(Boolean(config.path));
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  // Filters & Pagination
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [userSortAsc, setUserSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  // Selected row & active dialog action
  const [selected, setSelected] = useState<Row | null>(null);
  const [action, setAction] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');

  // Action form fields
  const [role, setRole] = useState('');
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formStatus, setFormStatus] = useState('ACTIVE');
  const [formPassword, setFormPassword] = useState('');
  const [formPasswordConfirm, setFormPasswordConfirm] = useState('');
  const [formReason, setFormReason] = useState('');
  const [formParentId, setFormParentId] = useState('NONE');
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDelta, setFormDelta] = useState('-10');
  const [formOrderId, setFormOrderId] = useState('');
  const [formCarrier, setFormCarrier] = useState('GHN');
  const [formAddress, setFormAddress] = useState('');

  useEffect(() => {
    if (!config.path) return;
    const c = new AbortController();
    setLoading(true);
    setError('');
    setRows([]);

    const params = new URLSearchParams();
    if (config.paged) {
      if (search) params.set('q', search);
      params.set('page', String(page));
      params.set('limit', '20');
      if (section === 'users' && roleFilter !== 'ALL') params.set('role', roleFilter);
      if ((section === 'users' || section === 'orders') && statusFilter !== 'ALL') {
        params.set('status', statusFilter);
      }
    }
    const qs = params.toString();
    const url = qs ? `${config.path}${config.path.includes('?') ? '&' : '?'}${qs}` : config.path;

    requestApi(url, { signal: c.signal })
      .then((raw) => {
        if (c.signal.aborted) return;
        const data = unwrap<unknown>(raw);
        const env = obj(raw);
        const body = obj(data);
        const values = Array.isArray(data)
          ? data
          : Array.isArray(body.items)
            ? body.items
            : Array.isArray(body.logs)
              ? body.logs
              : [];
        const meta = obj(env.pagination ?? env.meta ?? body.pagination);
        const mapped =
          section === 'categories' ? flattenCategories(values.map(obj)) : values.map(obj);
        setRows(mapped);
        setPages(
          Math.max(
            1,
            Number(
              meta.totalPages ??
                env.totalPages ??
                body.totalPages ??
                Math.ceil(Number(meta.total ?? env.total ?? values.length) / 20),
            ),
          ),
        );
      })
      .catch((e) => {
        if (c.signal.aborted) return;
        const msg = userMessage(e);
        if (['events', 'audit', 'notifications'].includes(section) && msg.includes('404')) {
          setRows([]);
          setError('');
        } else {
          setError(msg);
        }
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [config.path, config.paged, section, search, roleFilter, statusFilter, page, revision]);

  const visible = useMemo(() => {
    const fromMs = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
    const toMs = toDate ? new Date(`${toDate}T23:59:59.999`).getTime() : null;
    const needle = search.toLocaleLowerCase('vi');

    let list = rows.filter((r) => {
      if (!config.paged && needle) {
        const hit = config.columns.some(([key]) =>
          displayAdminValue(r[key]).toLocaleLowerCase('vi').includes(needle),
        );
        if (!hit) return false;
      }
      if (fromMs !== null || toMs !== null) {
        const rawTs = r.occurredAt ?? r.createdAt ?? r.date;
        const ts = rawTs ? Date.parse(String(rawTs)) : NaN;
        if (Number.isFinite(ts)) {
          if (fromMs !== null && ts < fromMs) return false;
          if (toMs !== null && ts > toMs) return false;
        }
      }
      return true;
    });

    if (section === 'users') {
      list = [...list].sort((a, b) => {
        const na = String(a.fullName ?? '');
        const nb = String(b.fullName ?? '');
        return userSortAsc ? na.localeCompare(nb, 'vi') : nb.localeCompare(na, 'vi');
      });
    } else if (['events', 'audit', 'notifications'].includes(section)) {
      list = [...list].sort((a, b) => {
        const ta = Date.parse(String(a.occurredAt ?? a.createdAt ?? '')) || 0;
        const tb = Date.parse(String(b.occurredAt ?? b.createdAt ?? '')) || 0;
        return tb - ta;
      });
    }
    return list;
  }, [rows, search, config, fromDate, toDate, section, userSortAsc]);

  const currentSelectedRole = String(selected?.role ?? '').toUpperCase();
  const isBlockedBuyerToSeller = currentSelectedRole === 'BUYER' && role === 'SELLER';
  const isBlockedSellerToBuyer = currentSelectedRole === 'SELLER' && role === 'BUYER';
  const isSelfUser = Boolean(selected?.id && String(selected.id) === user?.id);
  const canAssign =
    action === 'Đổi vai trò' &&
    !!selected?.id &&
    !isSelfUser &&
    !isBlockedBuyerToSeller &&
    !isBlockedSellerToBuyer;
  const rolePreview = roleDescriptions[role as keyof typeof roleDescriptions];

  function openAction(label: string, row: Row | null = null) {
    setSelected(row);
    setAction(label);
    setActionError('');
    setNotice('');
    setRole('');
    setFormName(String(row?.fullName ?? row?.name ?? ''));
    setFormEmail(String(row?.email ?? ''));
    setFormPhone(String(row?.phone ?? ''));
    setFormStatus(String(row?.status ?? 'ACTIVE').toUpperCase());
    setFormPassword('');
    setFormPasswordConfirm('');
    setFormReason('');
    setFormParentId(row?.parentId ? String(row.parentId) : 'NONE');
    setFormDescription(String(row?.description ?? ''));
    setFormAmount(row?.totalAmount ? String(row.totalAmount) : row?.total ? String(row.total) : '');
    setFormDelta('-10');
    setFormOrderId(String(row?.orderId ?? ''));
    setFormCarrier('GHN');
    setFormAddress('');
  }

  async function submitAction(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setActionError('');

    try {
      setBusy(true);

      // --- USERS (A02) ---
      if (action === 'Đổi vai trò') {
        if (!canAssign || !role) throw new Error('Chọn vai trò hợp lệ trước khi xác nhận.');
        await requestApi('/users/' + encodeURIComponent(String(selected!.id)) + '/role', {
          method: 'PUT',
          body: { role, source: 'ADMIN_USER_DROPDOWN' },
        });
        setNotice('Đã cập nhật vai trò người dùng.');
      } else if (action === 'Tạo tài khoản') {
        if (!formName.trim() || !formEmail.trim()) {
          throw new Error('Vui lòng nhập đầy đủ họ tên và email.');
        }
        if (!PASSWORD_POLICY_RE.test(formPassword)) {
          throw new Error('Mật khẩu cần 8–64 ký tự, gồm chữ hoa, chữ thường và chữ số.');
        }
        await requestApi('/users', {
          method: 'POST',
          body: {
            fullName: formName.trim(),
            email: formEmail.trim(),
            phone: formPhone.trim() || undefined,
            password: formPassword,
            role: role || 'BUYER',
          },
        });
        setNotice(`Đã tạo tài khoản ${formEmail.trim()}.`);
      } else if (action === 'Sửa hồ sơ' && selected?.id) {
        if (!formName.trim()) throw new Error('Họ tên không được để trống.');
        const uid = encodeURIComponent(String(selected.id));
        const prevStatus = String(selected.status ?? '').toUpperCase();
        if (formStatus && formStatus !== prevStatus) {
          await requestApi(`/users/${uid}/status`, {
            method: 'PATCH',
            body: { status: formStatus, reason: formReason.trim() || undefined },
          });
        }
        const nameChanged = formName.trim() !== String(selected.fullName ?? '');
        const phoneChanged = formPhone.trim() !== String(selected.phone ?? '');
        if (nameChanged || phoneChanged) {
          await requestApi(`/users/${uid}`, {
            method: 'PATCH',
            body: {
              fullName: formName.trim(),
              phone: formPhone.trim() || undefined,
            },
          });
        }
        setNotice('Đã cập nhật hồ sơ tài khoản.');
      } else if (action === 'Đổi mật khẩu' && selected?.id) {
        if (!PASSWORD_POLICY_RE.test(formPassword)) {
          throw new Error('Mật khẩu mới cần 8–64 ký tự, gồm chữ hoa, chữ thường và chữ số.');
        }
        if (formPassword !== formPasswordConfirm) {
          throw new Error('Xác nhận mật khẩu chưa khớp.');
        }
        await requestApi(`/users/${encodeURIComponent(String(selected.id))}/change-password`, {
          method: 'POST',
          body: { newPassword: formPassword, reason: formReason.trim() || undefined },
        });
        setNotice('Đã đổi mật khẩu cho tài khoản.');
      } else if (action === 'Xóa tài khoản' && selected?.id) {
        if (isSelfUser) throw new Error('Không thể tự xóa tài khoản đang đăng nhập.');
        if (formReason.trim().length < 3) throw new Error('Nhập lý do xóa tài khoản.');
        await requestApi(`/users/${encodeURIComponent(String(selected.id))}`, {
          method: 'DELETE',
          body: { reason: formReason.trim() },
        });
        setNotice('Đã xóa tài khoản.');
      }

      // --- CATEGORIES (A07) ---
      else if (action === 'Tạo danh mục') {
        if (!formName.trim()) throw new Error('Vui lòng nhập tên danh mục.');
        await requestApi('/categories', {
          method: 'POST',
          body: {
            name: formName.trim(),
            parentId: formParentId === 'NONE' ? null : formParentId,
            description: formDescription.trim() || undefined,
          },
        });
        setNotice(`Đã tạo danh mục “${formName.trim()}”.`);
      } else if (action === 'Sửa danh mục' && selected?.id) {
        if (!formName.trim()) throw new Error('Tên danh mục không được để trống.');
        await requestApi(`/categories/${encodeURIComponent(String(selected.id))}`, {
          method: 'PUT',
          body: {
            name: formName.trim(),
            parentId: formParentId === 'NONE' ? null : formParentId,
            description: formDescription.trim() || undefined,
          },
        });
        setNotice(`Đã cập nhật danh mục “${formName.trim()}”.`);
      } else if (action === 'Xóa danh mục' && selected?.id) {
        await requestApi(`/categories/${encodeURIComponent(String(selected.id))}`, {
          method: 'DELETE',
        });
        setNotice('Đã xóa danh mục.');
      }

      // --- ORDERS (A09) ---
      else if (action === 'Hủy đơn' && selected?.id) {
        if (formReason.trim().length < 3) throw new Error('Vui lòng nhập lý do hủy đơn.');
        await requestApi(`/orders/${encodeURIComponent(String(selected.id))}/cancel`, {
          method: 'POST',
          body: { reason: formReason.trim() },
        });
        setNotice('Đã hủy đơn hàng.');
      } else if (action === 'Hoàn tiền' && selected?.id) {
        if (formReason.trim().length < 3) throw new Error('Vui lòng nhập lý do hoàn tiền.');
        const oid = encodeURIComponent(String(selected.id));
        const amt = Number(formAmount);
        const body = {
          reason: formReason.trim(),
          ...(Number.isFinite(amt) && amt > 0 ? { amount: amt } : {}),
        };
        try {
          await requestApi(`/orders/${oid}/refund/execute`, { method: 'POST', body });
        } catch {
          await requestApi(`/orders/${oid}/refund`, { method: 'POST', body });
        }
        setNotice('Đã thực hiện hoàn tiền cho đơn hàng.');
      } else if (action === 'Cập nhật trạng thái' && selected?.id) {
        await requestApi(`/orders/${encodeURIComponent(String(selected.id))}/status`, {
          method: 'PATCH',
          body: { status: formStatus, reason: formReason.trim() || undefined },
        });
        setNotice(`Đã cập nhật trạng thái đơn sang ${formStatus}.`);
      }

      // --- SHIPMENTS (A10) ---
      else if (action === 'Tạo vận đơn') {
        if (!formOrderId.trim() || !formName.trim() || !formPhone.trim() || !formAddress.trim()) {
          throw new Error('Vui lòng nhập mã đơn hàng, người nhận, số điện thoại và địa chỉ.');
        }
        await requestApi('/fulfillments/shipments', {
          method: 'POST',
          body: {
            orderId: formOrderId.trim(),
            carrier: formCarrier,
            recipientName: formName.trim(),
            recipientPhone: formPhone.trim(),
            shippingAddress: formAddress.trim(),
            note: formReason.trim() || undefined,
          },
        });
        setNotice('Đã tạo vận đơn mới.');
      }

      // --- REPUTATION (A04) ---
      else if (action === 'Điều chỉnh uy tín' && selected?.id) {
        const delta = Number(formDelta);
        if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 100) {
          throw new Error('Mức điều chỉnh phải là số nguyên khác 0 (-100 đến +100).');
        }
        if (formReason.trim().length < 5) throw new Error('Vui lòng nhập lý do tối thiểu 5 ký tự.');
        await requestApi(`/users/${encodeURIComponent(String(selected.id))}/adjust-reputation`, {
          method: 'POST',
          body: { delta, points: delta, reason: formReason.trim() },
        });
        setNotice(`Đã điều chỉnh ${delta > 0 ? `+${delta}` : delta} điểm uy tín.`);
      } else if (action === 'Áp dụng hình phạt' && selected?.id) {
        if (formReason.trim().length < 5) throw new Error('Vui lòng nhập lý do tối thiểu 5 ký tự.');
        await requestApi(`/users/${encodeURIComponent(String(selected.id))}/restrict-features`, {
          method: 'POST',
          body: {
            restrictedFeatures: ['AUCTION_BID'],
            features: ['AUCTION_BID'],
            reason: formReason.trim(),
          },
        });
        setNotice('Đã áp dụng chế tài cho tài khoản.');
      }

      setAction('');
      setSelected(null);
      setRevision((v) => v + 1);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : userMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const categoryParentOptions = useMemo(() => {
    if (section !== 'categories') return [];
    const blocked =
      action === 'Sửa danh mục' && selected?.id
        ? collectDescendantIds(rows, String(selected.id))
        : new Set<string>();
    return rows.filter((c) => Number(c.level ?? 1) < 3 && !blocked.has(String(c.id ?? '')));
  }, [action, rows, section, selected?.id]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="admin-kicker">NEXUS / QUẢN TRỊ</p>
          <h1 className="mt-2">{config.title}</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-600">{config.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {section === 'users' && (
            <Button asChild variant="outline">
              <Link href="/admin/seller-applications">
                <Store size={16} />
                Hàng chờ hồ sơ Seller
              </Link>
            </Button>
          )}
          {config.path && (
            <Button variant="outline" onClick={() => setRevision((v) => v + 1)} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Làm mới
            </Button>
          )}
          {config.create && (
            <Button onClick={() => openAction(config.create!)}>
              <Plus size={16} />
              {config.create}
            </Button>
          )}
        </div>
      </header>

      {section === 'users' && (
        <div
          role="tablist"
          aria-label="Phân mục quản lý tài khoản"
          className="flex flex-wrap gap-2 border-b border-slate-200 pb-3"
        >
          <button
            type="button"
            role="tab"
            aria-selected={usersTab === 'accounts'}
            onClick={() => setUsersTab('accounts')}
            className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              usersTab === 'accounts'
                ? 'bg-brand-dark text-white'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Users size={16} aria-hidden="true" />
            <span>Danh sách tài khoản</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={usersTab === 'seller-applications'}
            onClick={() => setUsersTab('seller-applications')}
            className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              usersTab === 'seller-applications'
                ? 'bg-brand-dark text-white'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Store size={16} aria-hidden="true" />
            <span>Đăng ký bán hàng</span>
          </button>
        </div>
      )}

      {section === 'users' && usersTab === 'seller-applications' ? (
        <AdminSellerApplicationsPage embedded />
      ) : (
        <>
          {notice && (
            <p
              role="status"
              className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
            >
              {notice}
            </p>
          )}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSearch(query.trim());
                setPage(1);
              }}
              className="flex flex-wrap items-end gap-3 border-b border-slate-200 p-4 sm:p-5"
            >
              <label className="min-w-48 flex-1 space-y-1.5 text-xs font-semibold text-slate-600">
                Tìm kiếm
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Nhập tên, mã hoặc nội dung…"
                />
              </label>

              {section === 'users' && (
                <>
                  <div className="w-40 space-y-1.5 text-xs font-semibold text-slate-600">
                    <span>Vai trò</span>
                    <Select
                      value={roleFilter}
                      onValueChange={(v) => {
                        setRoleFilter(v);
                        setPage(1);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Tất cả</SelectItem>
                        <SelectItem value="BUYER">Người mua</SelectItem>
                        <SelectItem value="SELLER">Người bán</SelectItem>
                        <SelectItem value="SUPPORT_STAFF">Hỗ trợ</SelectItem>
                        <SelectItem value="ADMIN">Quản trị</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-40 space-y-1.5 text-xs font-semibold text-slate-600">
                    <span>Trạng thái</span>
                    <Select
                      value={statusFilter}
                      onValueChange={(v) => {
                        setStatusFilter(v);
                        setPage(1);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Tất cả</SelectItem>
                        <SelectItem value="ACTIVE">Đang hoạt động</SelectItem>
                        <SelectItem value="SUSPENDED">Đình chỉ</SelectItem>
                        <SelectItem value="INACTIVE">Tạm ngưng</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="button" variant="outline" onClick={() => setUserSortAsc((v) => !v)}>
                    Họ tên: {userSortAsc ? 'A → Z' : 'Z → A'}
                  </Button>
                </>
              )}

              {section === 'orders' && (
                <div className="w-44 space-y-1.5 text-xs font-semibold text-slate-600">
                  <span>Trạng thái</span>
                  <Select
                    value={statusFilter}
                    onValueChange={(v) => {
                      setStatusFilter(v);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Tất cả</SelectItem>
                      <SelectItem value="PENDING_PAYMENT">Chờ thanh toán</SelectItem>
                      <SelectItem value="PAID">Đã thanh toán</SelectItem>
                      <SelectItem value="PROCESSING">Đang xử lý</SelectItem>
                      <SelectItem value="SHIPPED">Đang giao</SelectItem>
                      <SelectItem value="DELIVERED">Đã giao</SelectItem>
                      <SelectItem value="CANCELLED">Đã hủy</SelectItem>
                      <SelectItem value="REFUNDED">Đã hoàn tiền</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {['orders', 'reports', 'events', 'audit', 'notifications'].includes(section) && (
                <>
                  <label className="space-y-1.5 text-xs font-semibold text-slate-600">
                    Từ ngày
                    <Input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                    />
                  </label>
                  <label className="space-y-1.5 text-xs font-semibold text-slate-600">
                    Đến ngày
                    <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                  </label>
                </>
              )}

              <Button type="submit" variant="outline" disabled={!config.path}>
                <Search size={16} />
                Lọc
              </Button>
            </form>

            {error ? (
              <div role="alert" className="p-8">
                <h2 className="font-semibold text-slate-900">Chưa tải được dữ liệu</h2>
                <p className="mt-1.5 text-sm text-red-700">{error}</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setRevision((v) => v + 1)}
                >
                  Thử lại
                </Button>
              </div>
            ) : loading ? (
              <div role="status" className="space-y-3 p-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
                ))}
                <span className="sr-only">Đang tải danh sách</span>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        {config.columns.map(([key, label]) => (
                          <th
                            key={key}
                            className="whitespace-nowrap px-5 py-3.5 text-xs font-semibold uppercase text-slate-600"
                          >
                            {label}
                          </th>
                        ))}
                        <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase text-slate-600">
                          Chi tiết
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((row, index) => (
                        <tr
                          key={String(row.id ?? row.eventId ?? row.role ?? index)}
                          className="border-t border-slate-100 hover:bg-slate-50/60"
                        >
                          {config.columns.map(([key]) => (
                            <td key={key} className="max-w-72 px-5 py-4">
                              <span
                                className={
                                  key === 'status' || key === 'role'
                                    ? 'admin-neutral-badge'
                                    : key === 'totalAmount' || key === 'reputationScore'
                                      ? 'font-semibold tabular-nums text-slate-900'
                                      : 'line-clamp-2 break-words text-slate-800'
                                }
                              >
                                {displayAdminValue(
                                  row[key] ?? (key === 'totalAmount' ? row.total : undefined),
                                  key,
                                )}
                              </span>
                            </td>
                          ))}
                          <td className="px-5 py-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelected(row);
                                setAction('');
                              }}
                            >
                              Xem
                              <ArrowUpRight size={15} />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {!visible.length && (
                  <div className="px-6 py-14 text-center">
                    <Inbox className="mx-auto text-slate-300" size={34} />
                    <h2 className="mt-3 text-base font-semibold text-slate-900">
                      Không có bản ghi phù hợp
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Thử thay đổi bộ lọc hoặc làm mới danh sách.
                    </p>
                  </div>
                )}
              </>
            )}

            {config.paged && (
              <footer className="flex items-center justify-between border-t border-slate-200 px-5 py-3.5 text-sm text-slate-600">
                <span className="tabular-nums">
                  Trang {page} / {pages}
                </span>
                <div className="flex gap-2">
                  <Button
                    aria-label="Trang trước"
                    size="icon"
                    variant="outline"
                    disabled={page === 1 || loading}
                    onClick={() => setPage((v) => v - 1)}
                  >
                    <ChevronLeft size={16} />
                  </Button>
                  <Button
                    aria-label="Trang sau"
                    size="icon"
                    variant="outline"
                    disabled={page >= pages || loading}
                    onClick={() => setPage((v) => v + 1)}
                  >
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </footer>
            )}
          </section>
        </>
      )}

      {/* Detail Dialog */}
      <Dialog
        open={!!selected && !action}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="admin-dialog max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogTitle>Chi tiết {config.title.toLocaleLowerCase('vi')}</DialogTitle>
          <DialogDescription>Thông tin bản ghi được chọn.</DialogDescription>
          <dl className="divide-y divide-slate-100">
            {config.columns
              .concat([
                ['id', 'Mã định danh'],
                ['createdAt', 'Ngày tạo'],
              ])
              .filter(([key], i, all) => all.findIndex((x) => x[0] === key) === i)
              .map(([key, label]) => (
                <div key={key} className="grid gap-2 py-3 sm:grid-cols-[150px_1fr]">
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="break-words text-sm font-medium text-slate-900">
                    {displayAdminValue(selected?.[key], key)}
                  </dd>
                </div>
              ))}
          </dl>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {!!(selected?.id || selected?.eventId) &&
              ['users', 'orders', 'shipments', 'reputation', 'events'].includes(section) && (
                <Button asChild variant="outline">
                  <Link
                    href={
                      '/admin/' +
                      section +
                      '/' +
                      encodeURIComponent(String(selected?.id ?? selected?.eventId))
                    }
                  >
                    Mở hồ sơ đầy đủ
                    <ArrowUpRight size={15} />
                  </Link>
                </Button>
              )}
            {config.actions?.map((label) => (
              <Button
                key={label}
                variant="outline"
                className={
                  label.startsWith('Xóa') || label.startsWith('Hủy') || label.includes('hình phạt')
                    ? 'border-red-200 text-red-700 hover:bg-red-50'
                    : ''
                }
                onClick={() => openAction(label, selected)}
              >
                {label}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Real Action Dialog (no dead ends!) */}
      <Dialog
        open={!!action}
        onOpenChange={(open) => {
          if (!open && !busy) setAction('');
        }}
      >
        <DialogContent className="admin-dialog max-h-[88vh] overflow-y-auto sm:max-w-lg">
          <DialogTitle>{action}</DialogTitle>
          <DialogDescription>
            {selected
              ? `Đối tượng: ${displayAdminValue(selected.fullName ?? selected.name ?? selected.id)}`
              : 'Điền đầy đủ thông tin trước khi xác nhận.'}
          </DialogDescription>

          <form onSubmit={submitAction} className="mt-4 space-y-4">
            {/* ĐỔI VAI TRÒ */}
            {action === 'Đổi vai trò' && (
              <div className="space-y-3">
                <label className="block space-y-1.5 text-sm font-medium">
                  Vai trò mới
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn vai trò…" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(roleDescriptions).map(([value, description]) => (
                        <SelectItem key={value} value={value}>
                          {description.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>

                {isBlockedBuyerToSeller && (
                  <div
                    role="alert"
                    className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-950"
                  >
                    <p className="font-semibold">
                      Buyer cần được duyệt qua hồ sơ đăng ký bán hàng trước khi thành Seller.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAction('');
                        setSelected(null);
                        setUsersTab('seller-applications');
                      }}
                    >
                      Mở tab Đăng ký bán hàng
                    </Button>
                  </div>
                )}

                {isBlockedSellerToBuyer && (
                  <p role="alert" className="rounded-xl bg-red-50 p-3.5 text-xs text-red-900">
                    Không hỗ trợ chuyển ngược Seller về Buyer. Sử dụng Sửa hồ sơ để tạm đình chỉ tài
                    khoản.
                  </p>
                )}

                {isSelfUser && (
                  <p role="alert" className="rounded-xl bg-amber-50 p-3.5 text-xs text-amber-900">
                    Không thể đổi vai trò của chính tài khoản đang đăng nhập.
                  </p>
                )}

                {rolePreview && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700">
                    <strong className="text-slate-900">{rolePreview.label}:</strong>{' '}
                    {rolePreview.summary}
                  </div>
                )}
              </div>
            )}

            {/* TẠO TÀI KHOẢN */}
            {action === 'Tạo tài khoản' && (
              <div className="space-y-3">
                <label className="block space-y-1.5 text-sm font-medium">
                  Họ và tên *
                  <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
                </label>
                <label className="block space-y-1.5 text-sm font-medium">
                  Email *
                  <Input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1.5 text-sm font-medium">
                    Điện thoại
                    <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
                  </label>
                  <label className="block space-y-1.5 text-sm font-medium">
                    Vai trò
                    <Select value={role || 'BUYER'} onValueChange={setRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BUYER">Người mua</SelectItem>
                        <SelectItem value="SELLER">Người bán</SelectItem>
                        <SelectItem value="SUPPORT_STAFF">Nhân viên hỗ trợ</SelectItem>
                        <SelectItem value="ADMIN">Quản trị viên</SelectItem>
                      </SelectContent>
                    </Select>
                  </label>
                </div>
                <label className="block space-y-1.5 text-sm font-medium">
                  Mật khẩu khởi tạo *
                  <Input
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Tối thiểu 8 ký tự, gồm hoa, thường và số"
                  />
                </label>
              </div>
            )}

            {/* SỬA HỒ SƠ USER */}
            {action === 'Sửa hồ sơ' && (
              <div className="space-y-3">
                <label className="block space-y-1.5 text-sm font-medium">
                  Họ và tên *
                  <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1.5 text-sm font-medium">
                    Điện thoại
                    <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
                  </label>
                  <label className="block space-y-1.5 text-sm font-medium">
                    Trạng thái tài khoản
                    <Select value={formStatus} onValueChange={setFormStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Đang hoạt động</SelectItem>
                        <SelectItem value="SUSPENDED">Đình chỉ</SelectItem>
                        <SelectItem value="INACTIVE">Tạm ngưng</SelectItem>
                      </SelectContent>
                    </Select>
                  </label>
                </div>
                <label className="block space-y-1.5 text-sm font-medium">
                  Ghi chú thay đổi (tùy chọn)
                  <Textarea
                    rows={2}
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                  />
                </label>
              </div>
            )}

            {/* ĐỔI MẬT KHẨU NGƯỜI DÙNG */}
            {action === 'Đổi mật khẩu' && (
              <div className="space-y-3">
                <label className="block space-y-1.5 text-sm font-medium">
                  Mật khẩu mới *
                  <Input
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                  />
                </label>
                <label className="block space-y-1.5 text-sm font-medium">
                  Xác nhận mật khẩu mới *
                  <Input
                    type="password"
                    value={formPasswordConfirm}
                    onChange={(e) => setFormPasswordConfirm(e.target.value)}
                  />
                </label>
                <label className="block space-y-1.5 text-sm font-medium">
                  Lý do cấp lại mật khẩu
                  <Input value={formReason} onChange={(e) => setFormReason(e.target.value)} />
                </label>
              </div>
            )}

            {/* XÓA TÀI KHOẢN */}
            {action === 'Xóa tài khoản' && (
              <div className="space-y-3">
                <p className="rounded-xl bg-red-50 p-3.5 text-xs text-red-800">
                  Tài khoản sẽ bị vô hiệu hóa và gỡ khỏi danh sách hoạt động.
                </p>
                <label className="block space-y-1.5 text-sm font-medium">
                  Lý do xóa tài khoản *
                  <Textarea
                    rows={3}
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                  />
                </label>
              </div>
            )}

            {/* TẠO / SỬA DANH MỤC */}
            {(action === 'Tạo danh mục' || action === 'Sửa danh mục') && (
              <div className="space-y-3">
                <label className="block space-y-1.5 text-sm font-medium">
                  Tên danh mục *
                  <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
                </label>
                <label className="block space-y-1.5 text-sm font-medium">
                  Danh mục cha
                  <Select value={formParentId} onValueChange={setFormParentId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Danh mục gốc (Cấp 1)</SelectItem>
                      {categoryParentOptions.map((c) => (
                        <SelectItem key={String(c.id)} value={String(c.id)}>
                          {'— '.repeat(Math.max(0, Number(c.level ?? 1) - 1))}
                          {String(c.name)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="block space-y-1.5 text-sm font-medium">
                  Mô tả ngắn
                  <Textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                  />
                </label>
              </div>
            )}

            {/* XÓA DANH MỤC */}
            {action === 'Xóa danh mục' && (
              <p className="rounded-xl bg-red-50 p-3.5 text-sm text-red-800">
                Xác nhận xóa danh mục <strong>{String(selected?.name ?? '')}</strong>? Hệ thống sẽ
                từ chối nếu danh mục đang còn sản phẩm hoặc danh mục con.
              </p>
            )}

            {/* XỬ LÝ ĐƠN HÀNG (HỦY / HOÀN / TRẠNG THÁI) */}
            {action === 'Cập nhật trạng thái' && (
              <div className="space-y-3">
                <label className="block space-y-1.5 text-sm font-medium">
                  Trạng thái mới
                  <Select value={formStatus} onValueChange={setFormStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CONFIRMED">CONFIRMED — Đã xác nhận</SelectItem>
                      <SelectItem value="PROCESSING">PROCESSING — Đang chuẩn bị</SelectItem>
                      <SelectItem value="SHIPPED">SHIPPED — Đang giao hàng</SelectItem>
                      <SelectItem value="DELIVERED">DELIVERED — Đã giao</SelectItem>
                      <SelectItem value="COMPLETED">COMPLETED — Hoàn tất</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
                <label className="block space-y-1.5 text-sm font-medium">
                  Ghi chú (tùy chọn)
                  <Textarea
                    rows={2}
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                  />
                </label>
              </div>
            )}

            {action === 'Hoàn tiền' && (
              <div className="space-y-3">
                <label className="block space-y-1.5 text-sm font-medium">
                  Số tiền hoàn (VND)
                  <Input
                    type="number"
                    min={1}
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="tabular-nums"
                  />
                </label>
                <label className="block space-y-1.5 text-sm font-medium">
                  Lý do hoàn tiền *
                  <Textarea
                    rows={3}
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                  />
                </label>
              </div>
            )}

            {action === 'Hủy đơn' && (
              <label className="block space-y-1.5 text-sm font-medium">
                Lý do hủy đơn *
                <Textarea
                  rows={3}
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                />
              </label>
            )}

            {/* TẠO VẬN ĐƠN */}
            {action === 'Tạo vận đơn' && (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1.5 text-sm font-medium">
                    Mã đơn hàng *
                    <Input
                      value={formOrderId}
                      onChange={(e) => setFormOrderId(e.target.value)}
                      placeholder="UUID hoặc mã đơn"
                    />
                  </label>
                  <label className="block space-y-1.5 text-sm font-medium">
                    Đơn vị vận chuyển
                    <Select value={formCarrier} onValueChange={setFormCarrier}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GHN">Giao Hàng Nhanh (GHN)</SelectItem>
                        <SelectItem value="GHTK">Giao Hàng Tiết Kiệm (GHTK)</SelectItem>
                        <SelectItem value="VIETTEL_POST">Viettel Post</SelectItem>
                        <SelectItem value="JT_EXPRESS">J&amp;T Express</SelectItem>
                      </SelectContent>
                    </Select>
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1.5 text-sm font-medium">
                    Người nhận *
                    <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
                  </label>
                  <label className="block space-y-1.5 text-sm font-medium">
                    Số điện thoại *
                    <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
                  </label>
                </div>
                <label className="block space-y-1.5 text-sm font-medium">
                  Địa chỉ giao hàng *
                  <Input value={formAddress} onChange={(e) => setFormAddress(e.target.value)} />
                </label>
                <label className="block space-y-1.5 text-sm font-medium">
                  Ghi chú lấy hàng
                  <Input value={formReason} onChange={(e) => setFormReason(e.target.value)} />
                </label>
              </div>
            )}

            {/* UY TÍN & HÌNH PHẠT */}
            {action === 'Điều chỉnh uy tín' && (
              <div className="space-y-3">
                <label className="block space-y-1.5 text-sm font-medium">
                  Điểm điều chỉnh (-100 đến +100) *
                  <Input
                    type="number"
                    min={-100}
                    max={100}
                    value={formDelta}
                    onChange={(e) => setFormDelta(e.target.value)}
                    className="tabular-nums"
                  />
                </label>
                <label className="block space-y-1.5 text-sm font-medium">
                  Lý do điều chỉnh *
                  <Textarea
                    rows={3}
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                  />
                </label>
              </div>
            )}

            {action === 'Áp dụng hình phạt' && (
              <div className="space-y-3">
                <p className="rounded-xl bg-amber-50 p-3.5 text-xs text-amber-950">
                  Sẽ tạm hạn chế quyền đặt giá đấu giá của tài khoản này. Mở hồ sơ chi tiết để chọn
                  thêm phạm vi chế tài khác.
                </p>
                <label className="block space-y-1.5 text-sm font-medium">
                  Lý do xử phạt *
                  <Textarea
                    rows={3}
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                  />
                </label>
              </div>
            )}

            {actionError && (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {actionError}
              </p>
            )}

            <div className="flex items-center justify-between pt-2">
              {action === 'Đổi vai trò' && canAssign ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                  <ShieldCheck size={15} />
                  Áp dụng ngay theo phiên mới
                </span>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setAction('')}
                >
                  Đóng
                </Button>
                <Button
                  type="submit"
                  disabled={
                    busy ||
                    (action === 'Đổi vai trò' && (!canAssign || !role)) ||
                    (action === 'Xóa tài khoản' && isSelfUser)
                  }
                  className={
                    action.startsWith('Xóa') ||
                    action.startsWith('Hủy') ||
                    action.includes('hình phạt')
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : ''
                  }
                >
                  {busy ? 'Đang xử lý…' : 'Xác nhận'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
