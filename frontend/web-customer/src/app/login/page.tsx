'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthPage } from '@/modules/user/auth/AuthPage';

function ExistingAuthEntry() {
  const params = useSearchParams();
  const mode = params?.get('mode') === 'register' ? 'register' : 'login';
  return <AuthPage key={mode} initialMode={mode} />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center">Đang mở tài khoản Nexus…</p>}>
      <ExistingAuthEntry />
    </Suspense>
  );
}
