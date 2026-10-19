'use client';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useState } from 'react';
import { useSession } from '@/modules/auth/hooks/use-session';
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
  return (
    <div className="flex max-w-full items-center gap-3">
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
