import { notFound } from 'next/navigation';
import { AdminShell } from '@/modules/admin/components/admin-shell';
import '@/modules/admin/styles/admin.css';
export const metadata = { title: 'Quản trị | Nexus', robots: { index: false, follow: false } };
export default function Layout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <AdminShell>{children}</AdminShell>;
}
