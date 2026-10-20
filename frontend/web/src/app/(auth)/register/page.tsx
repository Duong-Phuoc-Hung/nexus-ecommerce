import { Suspense } from 'react';
import { AuthPage } from '@/modules/auth/components/AuthPage';
export const metadata = { title: 'Đăng ký | Nexus', referrer: 'no-referrer' as const };
export default function Page() {
  return (
    <Suspense
      fallback={
        <p className="p-8" role="status">
          Đang tải biểu mẫu…
        </p>
      }
    >
      <AuthPage initialMode="register" />
    </Suspense>
  );
}
