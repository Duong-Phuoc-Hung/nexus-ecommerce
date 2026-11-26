'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useState } from 'react';
import { useSession } from '@/modules/auth/hooks/use-session';
import { useMyReputation } from '@/modules/user/hooks/use-my-reputation';
import { LayoutDashboard, ShieldCheck } from 'lucide-react';

export function AccountControls() {
  const { user, phase, retry, logout, error } = useSession();
  const isBuyer = phase === 'ready' && user?.role === 'BUYER';
  const { data: rep, error: repError, refresh: refreshRep } = useMyReputation(isBuyer);
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
    <div className="flex max-w-full items-center gap-2 sm:gap-3">
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
      )}
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
      {isBuyer &&
        (repError && !rep ? (
          <button
            type="button"
            onClick={refreshRep}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
            aria-label="Chưa tải được điểm uy tín. Nhấn để thử lại"
          >
            <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Uy tín ·</span>
            <span>Thử lại</span>
          </button>
        ) : rep ? (
          <Link
            href="/account/reputation"
            className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold tabular-nums transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
              rep.score < 40
                ? 'border-red-200 bg-red-50 text-red-800 hover:bg-red-100'
                : 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
            }`}
            aria-label={`Uy tín của bạn, ${rep.score} trên 100 điểm. Xem nhiệm vụ`}
            title={`${rep.tierLabel} · Nhấn để xem nhiệm vụ uy tín`}
          >
            <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Uy tín</span>
            <span>{rep.score}/100</span>
          </Link>
        ) : null)}
      <Link
        href="/account"
        className="max-w-32 truncate text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand rounded-md sm:max-w-40"
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
