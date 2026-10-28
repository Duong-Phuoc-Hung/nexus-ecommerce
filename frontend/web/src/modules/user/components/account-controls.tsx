'use client';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useState } from 'react';
import { useSession } from '@/modules/auth/hooks/use-session';
import { LayoutDashboard } from 'lucide-react';
export function AccountControls() {
  const { user, phase, retry, logout, error } = useSession();
  const [busy, setBusy] = useState(false);
  if (phase === 'loading')
    return (
      <span className="inline-flex min-h-11 items-center gap-2 text-xs text-muted" role="status">
        <span className="size-3 animate-pulse rounded-full bg-stone-300" />
        Kiểm tra phiên…
      </span>
    );
  if (phase === 'error')
    return (
      <Button
        variant="ghost"
        size="plain"
        type="button"
        onClick={retry}
        className="min-h-11 text-sm font-semibold text-brand-dark"
      >
        Thử lại kết nối tài khoản
      </Button>
    );
  if (!user)
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-dark"
        >
          Đăng nhập
        </Link>
        <Link
          href="/register"
          className="hidden min-h-11 items-center rounded-lg border border-line px-3 text-xs font-semibold sm:inline-flex"
        >
          Đăng ký
        </Link>
        {error && (
          <span className="max-w-xs text-xs text-muted" role="status">
            {error}
          </span>
        )}
      </div>
    );
  const isSeller = user.role === 'SELLER';
  const isSupport = user.role === 'SUPPORT_STAFF' || user.role === 'SUPPORT';

  return (
    <div className="flex max-w-full items-center gap-2.5 sm:gap-3">
      {user.role === 'ADMIN' && (
        <Link
          href="/admin"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-brand/25 bg-brand-soft px-3 text-xs font-semibold text-brand-dark shadow-sm transition hover:border-brand/40 hover:bg-brand/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          aria-label="Quay lại trang quản trị"
          title="Quay lại trang quản trị"
        >
          <LayoutDashboard aria-hidden="true" className="size-4" />
          <span>Trang quản trị</span>
        </Link>
      )}{' '}
      {isSeller && (
        <Link
          href="/seller"
          className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 shadow-sm transition hover:bg-amber-100 hover:border-amber-400"
          title="Quay lại bảng điều khiển Người bán"
        >
          <span aria-hidden="true">▦</span>
          <span>Dashboard Seller</span>
        </Link>
      )}
      {isSupport && (
        <Link
          href="/support"
          className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-900 shadow-sm transition hover:bg-sky-100 hover:border-sky-400"
          title="Quay lại bảng điều khiển Hỗ trợ"
        >
          <span aria-hidden="true">⌂</span>
          <span>Dashboard Support</span>
        </Link>
      )}
      <Link
        href="/account"
        className="max-w-40 truncate text-sm font-semibold text-ink"
        aria-label={`Tài khoản ${user.fullName}`}
      >
        {user.fullName}
      </Link>
      <Button
        variant="ghost"
        size="plain"
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await logout();
          } finally {
            setBusy(false);
          }
        }}
        className="min-h-11 text-xs text-muted underline underline-offset-4 disabled:opacity-50"
      >
        {busy ? 'Đang thoát…' : 'Đăng xuất'}
      </Button>
      {error && (
        <span role="status" className="sr-only">
          {error}
        </span>
      )}
    </div>
  );
}
