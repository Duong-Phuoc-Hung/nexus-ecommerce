import type { ReactNode } from 'react';
import '@/modules/support/components/support.css';
import { SupportShell } from '@/modules/support/components/support-shell';
import { SupportRouteGuard } from '@/modules/support/components/support-route-guard';

export const metadata = {
  title: 'Hỗ trợ khách hàng | Nexus Support',
  robots: { index: false, follow: false },
};

export default function SupportLayout({ children }: { children: ReactNode }) {
  return (
    <SupportRouteGuard>
      <SupportShell>{children}</SupportShell>
    </SupportRouteGuard>
  );
}
