import type { ReactNode } from 'react';
import '@/modules/support/components/support.css';
import { SupportShell } from '@/modules/support/components/support-shell';

export default function SupportLayout({ children }: { children: ReactNode }) {
  return <SupportShell>{children}</SupportShell>;
}
