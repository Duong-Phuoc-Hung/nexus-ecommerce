import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Project Nexus',
  description: 'Project Nexus e-commerce and auction platform',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
