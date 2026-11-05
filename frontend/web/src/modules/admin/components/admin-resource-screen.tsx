'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  RefreshCw,
  Plus,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Inbox,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { requestApi } from '@/lib/axios/api-client';
import { unwrap, userMessage } from '@/lib/axios/http';
import { useSession } from '@/modules/auth/hooks/use-session';
import { resources } from '../config/resources';

type Row = Record<string, unknown>;
const obj = (v: unknown): Row =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Row) : {};
export function displayAdminValue(v: unknown): string {
  if (v == null || v === '') return 'Chưa cung cấp';
  if (Array.isArray(v))
    return (
      v
        .map((x) => (typeof x === 'string' ? x : String(obj(x).name ?? obj(x).title ?? '')))
        .filter(Boolean)
        .join(', ') || 'Chưa cung cấp'
    );
  return typeof v === 'object' ? 'Xem thông tin chi tiết' : String(v);
}
function flattenCategories(rows: Row[], parent: string | null = null, depth = 1): Row[] {
  return rows.flatMap((row) => [
    { ...row, parentId: row.parentId ?? parent, level: row.level ?? depth },
    ...(depth < 3 && Array.isArray(row.children)
      ? flattenCategories(row.children.map(obj), String(row.id), depth + 1)
      : []),
  ]);
}
export function AdminResourceScreen({ section }: { section: string }) {
  const config = resources[section];
  const { user } = useSession();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(Boolean(config.path));
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [selected, setSelected] = useState<Row | null>(null);
  const [action, setAction] = useState('');
  const [role, setRole] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  useEffect(() => {
    if (!config.path) return;
    const c = new AbortController();
    setLoading(true);
    setError('');
    setRows([]);
    const suffix = config.paged
      ? '?' + new URLSearchParams({ q: search, page: String(page), limit: '20' })
      : '';
    requestApi(config.path + suffix, { signal: c.signal })
      .then((raw) => {
        if (c.signal.aborted) return;
        const data = unwrap<unknown>(raw);
        const env = obj(raw),
          body = obj(data);
        const values = Array.isArray(data) ? data : body.items;
        if (!Array.isArray(values)) throw new Error('Dữ liệu danh sách chưa đúng định dạng.');
        const meta = obj(env.pagination ?? env.meta ?? body.pagination);
        setRows(section === 'categories' ? flattenCategories(values.map(obj)) : values.map(obj));
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
        if (!c.signal.aborted) setError(userMessage(e));
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [config.path, config.paged, section, search, page, revision]);
  const visible = useMemo(
    () =>
      config.paged
        ? rows
        : rows.filter((r) =>
            config.columns.some(([key]) =>
              displayAdminValue(r[key])
                .toLocaleLowerCase('vi')
                .includes(search.toLocaleLowerCase('vi')),
            ),
          ),
    [rows, search, config],
  );
  const canAssign = action === 'Đổi vai trò' && !!selected?.id && String(selected.id) !== user?.id;
  function openAction(label: string, row: Row | null = null) {
    setSelected(row);
    setAction(label);
    setRole('');
    setActionError('');
  }
  async function confirmRole() {
    if (!canAssign || !role || busy) return;
    setBusy(true);
    setActionError('');
    try {
      await requestApi('/users/' + encodeURIComponent(String(selected!.id)) + '/role', {
        method: 'PUT',
        body: { role },
      });
      setNotice('Đã cập nhật vai trò. Quyền sẽ được áp dụng theo phiên xác thực của người dùng.');
      setAction('');
      setSelected(null);
      setRevision((v) => v + 1);
    } catch (e) {
      setActionError(userMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="admin-kicker">NEXUS / QUẢN TRỊ</p>
          <h1 className="mt-2">{config.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">{config.subtitle}</p>
        </div>
        <div className="flex gap-2">
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
      {notice && (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
        >
          {notice}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="admin-metric">
          <span>Phạm vi</span>
          <strong>{config.path ? 'Dữ liệu hệ thống' : 'Đang hoàn thiện'}</strong>
        </div>
        <div className="admin-metric">
          <span>Hiển thị trên trang</span>
          <strong>
            {loading ? 'Đang tải' : config.path ? visible.length + ' bản ghi' : 'Chưa có số liệu'}
          </strong>
        </div>
        <div className="admin-metric">
          <span>Quy tắc xử lý</span>
          <strong>
            {['audit', 'events', 'reports', 'notifications'].includes(section)
              ? 'Chỉ đọc & đối chiếu'
              : 'Xác nhận trước thay đổi'}
          </strong>
        </div>
      </div>
      {config.note && (
        <p className="flex gap-2 rounded-xl bg-slate-100 p-4 text-sm text-slate-600">
          <Info size={18} className="shrink-0" />
          {config.note}
        </p>
      )}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(query.trim());
            setPage(1);
          }}
          className="flex flex-wrap items-end gap-3 border-b border-slate-200 p-5"
        >
          <label className="min-w-48 flex-1 space-y-2 text-sm font-medium">
            Tìm kiếm
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nhập tên, mã hoặc nội dung cần tìm…"
            />
          </label>
          {['reports', 'events', 'audit', 'notifications'].includes(section) && (
            <>
              <label className="space-y-2 text-sm">
                Từ ngày
                <Input type="date" disabled={!config.path} />
              </label>
              <label className="space-y-2 text-sm">
                Đến ngày
                <Input type="date" disabled={!config.path} />
              </label>
            </>
          )}
          <Button type="submit" variant="outline" disabled={!config.path}>
            <Search size={16} />
            Tìm kiếm
          </Button>
        </form>
        {error ? (
          <div role="alert" className="p-8">
            <h2 className="font-semibold">Chưa tải được dữ liệu</h2>
            <p className="mt-2 text-sm text-slate-600">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => setRevision((v) => v + 1)}>
              Thử lại
            </Button>
          </div>
        ) : loading ? (
          <div role="status" className="space-y-4 p-6">
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
                        className="whitespace-nowrap px-5 py-4 font-medium text-slate-600"
                      >
                        {label}
                      </th>
                    ))}
                    <th className="px-5 py-4">
                      <span className="sr-only">Chi tiết</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row, index) => (
                    <tr
                      key={String(row.id ?? row.role ?? index)}
                      className="border-t border-slate-100 hover:bg-slate-50/60"
                    >
                      {config.columns.map(([key]) => (
                        <td key={key} className="max-w-72 px-5 py-4">
                          <span
                            className={
                              key === 'status' || key === 'role'
                                ? 'admin-neutral-badge'
                                : 'line-clamp-2 break-words'
                            }
                          >
                            {key === 'permissions' && Array.isArray(row[key])
                              ? String(row[key].length) + ' quyền'
                              : displayAdminValue(
                                  row[key] ?? (key === 'totalAmount' ? row.total : undefined),
                                )}
                          </span>
                        </td>
                      ))}
                      <td className="px-5 py-4">
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
                <Inbox className="mx-auto text-slate-400" size={36} />
                <h2 className="mt-4 font-semibold">
                  {config.path ? 'Không có kết quả phù hợp' : 'Chức năng đang được hoàn thiện'}
                </h2>
                <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">
                  {config.path
                    ? 'Thử thay đổi từ khóa hoặc làm mới danh sách.'
                    : 'Khu vực đã được chuẩn bị. Dữ liệu sẽ hiển thị khi dịch vụ sẵn sàng.'}
                </p>
              </div>
            )}
          </>
        )}
        {config.paged && (
          <footer className="flex items-center justify-between border-t border-slate-200 p-4 text-sm">
            <span>
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
      <Dialog
        open={!!selected && !action}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="admin-dialog max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogTitle>Chi tiết {config.title.toLocaleLowerCase('vi')}</DialogTitle>
          <DialogDescription>Thông tin của bản ghi được chọn trong danh sách.</DialogDescription>
          <dl className="divide-y divide-slate-100">
            {config.columns
              .concat([
                ['id', 'Mã định danh'],
                ['createdAt', 'Ngày tạo'],
              ])
              .filter(([key], i, all) => all.findIndex((x) => x[0] === key) === i)
              .map(([key, label]) => (
                <div key={key} className="grid gap-2 py-3 sm:grid-cols-[140px_1fr]">
                  <dt className="text-sm text-slate-500">{label}</dt>
                  <dd className="break-words text-sm font-medium">
                    {displayAdminValue(selected?.[key])}
                  </dd>
                </div>
              ))}
          </dl>
          {!!selected?.id && ['users', 'orders', 'shipments', 'reputation'].includes(section) && (
            <Button asChild variant="outline">
              <Link href={'/admin/' + section + '/' + encodeURIComponent(String(selected.id))}>
                Mở hồ sơ đầy đủ
                <ArrowUpRight size={16} />
              </Link>
            </Button>
          )}
          <div className="flex flex-wrap gap-2">
            {config.actions?.map((label) => (
              <Button key={label} variant="outline" onClick={() => openAction(label, selected)}>
                {label}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!action}
        onOpenChange={(open) => {
          if (!open && !busy) setAction('');
        }}
      >
        <DialogContent className="admin-dialog">
          <DialogTitle>{action}</DialogTitle>
          <DialogDescription>
            {action === 'Đổi vai trò'
              ? 'Chọn vai trò và xác nhận quyền truy cập mới của tài khoản.'
              : 'Chức năng này chưa được mở để lưu thay đổi.'}
          </DialogDescription>
          {selected && (
            <div className="rounded-xl bg-slate-50 p-4 text-sm">
              <strong>
                {displayAdminValue(
                  selected.fullName ?? selected.name ?? selected.id ?? selected.role,
                )}
              </strong>
              <p className="mt-1 text-slate-500">
                {displayAdminValue(selected.email ?? selected.status)}
              </p>
            </div>
          )}
          {action === 'Đổi vai trò' ? (
            <label className="space-y-2 text-sm font-medium">
              Vai trò mới
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn vai trò" />
                </SelectTrigger>
                <SelectContent>
                  {['BUYER', 'SELLER', 'SUPPORT_STAFF', 'ADMIN'].map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          ) : null}
          {!canAssign && (
            <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
              {action === 'Đổi vai trò'
                ? 'Không đổi vai trò của chính bạn tại đây để tránh mất quyền truy cập.'
                : 'Nhóm đang hoàn thiện phần xử lý. Bạn có thể xem danh sách và chi tiết hiện có.'}
            </p>
          )}
          {canAssign && (
            <p className="flex gap-2 text-sm text-slate-600">
              <ShieldCheck size={18} />
              Thay đổi vai trò ảnh hưởng quyền truy cập của tài khoản.
            </p>
          )}
          {actionError && (
            <p role="alert" className="text-sm text-red-700">
              {actionError}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={busy} onClick={() => setAction('')}>
              Đóng
            </Button>
            {action === 'Đổi vai trò' && (
              <Button disabled={!canAssign || !role || busy} onClick={() => void confirmRole()}>
                {busy ? 'Đang cập nhật…' : 'Xác nhận thay đổi'}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
