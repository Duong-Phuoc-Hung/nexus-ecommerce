'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Pencil, Plus, RefreshCw, Search, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { requestApi } from '@/lib/axios/api-client';
import { userMessage } from '@/lib/axios/http';
import { rolesApi } from '../api/roles.api';

type RoleRecord = {
  code: string;
  name: string;
  description: string;
  permissions: string[];
  system?: boolean;
};

const SYSTEM_ROLES = new Set(['ADMIN', 'BUYER', 'SELLER', 'SUPPORT_STAFF']);

const ROLE_META: Record<string, { name: string; description: string }> = {
  ADMIN: {
    name: 'Quản trị viên',
    description: 'Quản trị toàn sàn, tài khoản, phân quyền và cấu hình.',
  },
  BUYER: { name: 'Người mua', description: 'Mua sắm, giỏ hàng, thanh toán và tham gia đấu giá.' },
  SELLER: { name: 'Người bán', description: 'Quản lý gian hàng, sản phẩm, đơn bán và phiên đấu.' },
  SUPPORT_STAFF: {
    name: 'Nhân viên hỗ trợ',
    description: 'Xử lý khiếu nại, tranh chấp và hỗ trợ vận hành.',
  },
};

const PERMISSION_CATALOG: Array<{ group: string; codes: string[] }> = [
  {
    group: 'Tài khoản & Hồ sơ',
    codes: [
      'AUTH.LOGIN',
      'AUTH.LOGOUT',
      'PROFILE.VIEW',
      'PROFILE.UPDATE',
      'PROFILE.CHANGE_PASSWORD',
      'PROFILE.RESET_PASSWORD',
      'USER.VIEW',
      'USER.LIST',
      'USER.CREATE',
      'USER.UPDATE',
      'USER.DELETE',
      'USER.CHANGE_PASSWORD',
    ],
  },
  {
    group: 'Vai trò & Quyền',
    codes: ['ROLE.VIEW', 'ROLE.LIST', 'ROLE.CREATE', 'ROLE.UPDATE', 'ROLE.DELETE'],
  },
  {
    group: 'Sản phẩm & Danh mục',
    codes: [
      'PRODUCT.VIEW',
      'PRODUCT.LIST',
      'PRODUCT.SEARCH',
      'PRODUCT.CREATE',
      'PRODUCT.UPDATE',
      'PRODUCT.DELETE',
      'CATEGORY.VIEW',
      'CATEGORY.LIST',
      'CATEGORY.CREATE',
      'CATEGORY.UPDATE',
      'CATEGORY.DELETE',
    ],
  },
  {
    group: 'Giỏ hàng, Đơn hàng & Vận chuyển',
    codes: [
      'CART.CREATE',
      'CART.UPDATE',
      'CART.REMOVE_ITEM',
      'CART.VIEW',
      'CHECKOUT.START',
      'ORDER.CREATE',
      'ORDER.VIEW',
      'ORDER.LIST',
      'ORDER.CANCEL',
      'ORDER.REFUND',
      'SHIPPING.QUOTE',
      'SHIPPING.CREATE_SHIPMENT',
      'SHIPPING.VIEW_SHIPMENT',
      'SHIPPING.UPDATE_STATUS',
      'SHIPPING.MANUAL_OVERRIDE',
    ],
  },
  {
    group: 'Đấu giá',
    codes: [
      'AUCTION.VIEW',
      'AUCTION.LIST',
      'AUCTION.VIEW_BID_HISTORY',
      'AUCTION.BID',
      'AUCTION.CREATE',
      'AUCTION.UPDATE',
      'AUCTION.CANCEL',
      'AUCTION.ADMIN_CANCEL',
    ],
  },
  {
    group: 'Uy tín & Hệ thống',
    codes: [
      'REPUTATION.VIEW',
      'REPUTATION.RATE',
      'USER.REPUTATION.VIEW',
      'USER.REPUTATION.ADJUST',
      'REPUTATION.PENALTY.VIEW',
      'REPUTATION.PENALTY.APPLY',
      'NOTIFICATION.VIEW',
      'NOTIFICATION.MANAGE_PREFERENCE',
      'EVENT_LOG.VIEW',
      'EVENT_LOG.VIEW_DETAIL',
      'AUDIT_LOG.VIEW',
      'SYSTEM.CONFIG.VIEW',
      'SYSTEM.CONFIG.UPDATE',
      'SYSTEM.HEALTH.VIEW',
    ],
  },
];

export function AdminRolesScreen() {
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [notice, setNotice] = useState('');

  const [selected, setSelected] = useState<RoleRecord | null>(null);
  const [editorMode, setEditorMode] = useState<'create' | 'edit' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoleRecord | null>(null);

  const [codeInput, setCodeInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await rolesApi.getRoles();
      const mapped: RoleRecord[] = list.map((item) => {
        const raw = item as {
          role?: string;
          code?: string;
          name?: string;
          description?: string;
          permissions?: string[];
        };
        const code = String(raw.code || raw.role || '').toUpperCase();
        const meta = ROLE_META[code];
        return {
          code,
          name: meta?.name || raw.name || code,
          description: raw.description || meta?.description || `Vai trò ${code}`,
          permissions: Array.isArray(raw.permissions) ? raw.permissions : [],
          system: SYSTEM_ROLES.has(code),
        };
      });
      setRoles(mapped);
    } catch (err) {
      setError(userMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('vi');
    return roles
      .filter(
        (r) =>
          !needle ||
          `${r.code} ${r.name} ${r.description} ${r.permissions.join(' ')}`
            .toLocaleLowerCase('vi')
            .includes(needle),
      )
      .sort((a, b) =>
        sortDir === 'asc' ? a.name.localeCompare(b.name, 'vi') : b.name.localeCompare(a.name, 'vi'),
      );
  }, [query, roles, sortDir]);

  function openCreate() {
    setEditorMode('create');
    setCodeInput('');
    setNameInput('');
    setDescInput('');
    setSelectedPerms([]);
    setFormError('');
  }

  function openEdit(role: RoleRecord) {
    setEditorMode('edit');
    setCodeInput(role.code);
    setNameInput(role.name);
    setDescInput(role.description);
    setSelectedPerms([...role.permissions]);
    setFormError('');
  }

  function togglePerm(code: string) {
    setSelectedPerms((prev) =>
      prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code],
    );
  }

  async function saveRole(e: FormEvent) {
    e.preventDefault();
    if (busy || !editorMode) return;
    const normalizedCode = codeInput.trim().toUpperCase().replace(/\s+/g, '_');
    if (!/^[A-Z0-9_]{2,40}$/.test(normalizedCode)) {
      setFormError('Mã vai trò chỉ gồm chữ in hoa, số và dấu gạch dưới (2–40 ký tự).');
      return;
    }
    if (!nameInput.trim()) {
      setFormError('Vui lòng nhập tên hiển thị của vai trò.');
      return;
    }
    if (editorMode === 'create' && roles.some((r) => r.code === normalizedCode)) {
      setFormError('Mã vai trò đã tồn tại.');
      return;
    }

    setBusy(true);
    setFormError('');
    setNotice('');
    try {
      if (editorMode === 'create') {
        await requestApi('/auth/roles', {
          method: 'POST',
          body: {
            code: normalizedCode,
            name: nameInput.trim(),
            description: descInput.trim(),
            permissions: selectedPerms,
          },
        });
        setNotice(`Đã tạo vai trò ${normalizedCode}.`);
      } else {
        await requestApi(`/auth/roles/${encodeURIComponent(normalizedCode)}`, {
          method: 'PUT',
          body: {
            name: nameInput.trim(),
            description: descInput.trim(),
            permissions: selectedPerms,
          },
        });
        setNotice(`Đã cập nhật quyền cho vai trò ${normalizedCode}.`);
      }
      setEditorMode(null);
      await load();
    } catch (err) {
      setFormError(userMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || busy) return;
    setBusy(true);
    setFormError('');
    setNotice('');
    try {
      await requestApi(`/auth/roles/${encodeURIComponent(deleteTarget.code)}`, {
        method: 'DELETE',
      });
      setNotice(`Đã xóa vai trò ${deleteTarget.code}.`);
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
          <p className="admin-kicker">NEXUS / PHÂN QUYỀN</p>
          <h1 className="mt-2">Vai trò &amp; quyền hạn</h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Quản lý danh mục vai trò và tập quyền áp dụng trên toàn hệ thống.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Làm mới
          </Button>
          <Button onClick={openCreate}>
            <Plus size={16} />
            Tạo vai trò
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
              aria-hidden="true"
              size={16}
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400"
            />
            <span className="sr-only">Tìm vai trò hoặc mã quyền</span>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm tên vai trò, mã vai trò hoặc mã quyền…"
              className="pl-10"
            />
          </label>
          <Button
            type="button"
            variant="outline"
            onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
          >
            Sắp xếp tên: {sortDir === 'asc' ? 'A → Z' : 'Z → A'}
          </Button>
        </div>

        {error ? (
          <div role="alert" className="p-8 text-sm text-red-700">
            <p>{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => void load()}>
              Thử lại
            </Button>
          </div>
        ) : loading ? (
          <p role="status" className="p-8 text-sm text-slate-500">
            Đang tải danh sách vai trò…
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Vai trò</th>
                  <th className="px-5 py-3.5 font-semibold">Mã</th>
                  <th className="px-5 py-3.5 font-semibold">Mô tả</th>
                  <th className="px-5 py-3.5 text-right font-semibold">Số quyền</th>
                  <th className="px-5 py-3.5 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((role) => (
                  <tr key={role.code} className="hover:bg-slate-50/60">
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      <button
                        type="button"
                        onClick={() => setSelected(role)}
                        className="text-left hover:underline"
                      >
                        {role.name}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <span className="admin-neutral-badge font-mono text-xs">{role.code}</span>
                    </td>
                    <td className="max-w-80 px-5 py-4 text-slate-600">{role.description}</td>
                    <td className="px-5 py-4 text-right font-semibold tabular-nums">
                      {role.permissions.length} quyền
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(role)}
                        >
                          <Pencil size={14} />
                          Sửa
                        </Button>
                        {!role.system && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-red-200 text-red-700 hover:bg-red-50"
                            onClick={() => {
                              setFormError('');
                              setDeleteTarget(role);
                            }}
                          >
                            <Trash2 size={14} />
                            Xóa
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Role Detail Dialog */}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="admin-dialog max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck size={18} />
            {selected?.name} ({selected?.code})
          </DialogTitle>
          <DialogDescription>{selected?.description}</DialogDescription>
          <div className="mt-4 flex flex-wrap gap-2">
            {selected?.permissions.length ? (
              selected.permissions.map((perm) => (
                <span
                  key={perm}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs text-slate-700"
                >
                  {perm}
                </span>
              ))
            ) : (
              <p className="text-sm text-slate-500">Chưa gán quyền cụ thể.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create / Edit Role Dialog */}
      <Dialog
        open={!!editorMode}
        onOpenChange={(open) => {
          if (!open && !busy) setEditorMode(null);
        }}
      >
        <DialogContent className="admin-dialog max-h-[88vh] overflow-y-auto sm:max-w-2xl">
          <DialogTitle>
            {editorMode === 'create' ? 'Tạo vai trò mới' : `Chỉnh sửa vai trò ${codeInput}`}
          </DialogTitle>
          <DialogDescription>
            Khai báo mã vai trò, mô tả và chọn các quyền được phép thực thi.
          </DialogDescription>

          <form onSubmit={saveRole} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5 text-sm font-medium">
                Mã vai trò *
                <Input
                  value={codeInput}
                  disabled={editorMode === 'edit'}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  placeholder="VD: FINANCE_AUDITOR"
                />
              </label>
              <label className="block space-y-1.5 text-sm font-medium">
                Tên hiển thị *
                <Input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="VD: Kiểm soát tài chính"
                />
              </label>
            </div>
            <label className="block space-y-1.5 text-sm font-medium">
              Mô tả
              <Textarea
                rows={2}
                value={descInput}
                onChange={(e) => setDescInput(e.target.value)}
                placeholder="Phạm vi trách nhiệm của vai trò…"
              />
            </label>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>Danh sách quyền ({selectedPerms.length} đã chọn)</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {PERMISSION_CATALOG.map((group) => (
                  <div key={group.group} className="rounded-xl border border-slate-200 p-3.5">
                    <p className="mb-2 text-xs font-bold uppercase text-slate-600">{group.group}</p>
                    <div className="space-y-1.5">
                      {group.codes.map((perm) => (
                        <label
                          key={perm}
                          className="flex cursor-pointer items-center gap-2 text-xs text-slate-700"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPerms.includes(perm)}
                            onChange={() => togglePerm(perm)}
                            className="size-4 accent-emerald-700"
                          />
                          <span className="font-mono">{perm}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

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
                {busy ? 'Đang lưu…' : editorMode === 'create' ? 'Tạo vai trò' : 'Lưu thay đổi'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Role Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !busy) setDeleteTarget(null);
        }}
      >
        <DialogContent className="admin-dialog max-w-md">
          <DialogTitle>Xóa vai trò {deleteTarget?.code}?</DialogTitle>
          <DialogDescription>
            Thao tác này không thể hoàn tác. Hệ thống sẽ từ chối nếu vẫn còn tài khoản đang giữ vai
            trò này.
          </DialogDescription>
          {formError && (
            <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {formError}
            </p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setDeleteTarget(null)}
            >
              Quay lại
            </Button>
            <Button
              type="button"
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
