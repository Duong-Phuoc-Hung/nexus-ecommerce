import '@/modules/seller/components/seller.css';
import type { ReactNode } from 'react';
import { SellerShell } from '@/modules/seller/components/seller-shell';

export default function SellerLayout({ children }: { children: ReactNode }) {
  return <SellerShell>{children}</SellerShell>;
}
