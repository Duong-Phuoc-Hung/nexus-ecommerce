import type { Metadata } from 'next';
import './marketplace.css';
import { SessionProvider } from '@/modules/auth/context/session-provider';

export const metadata: Metadata = {
  title: 'Nexus — Khám phá giá trị, kết nối đam mê',
  description:
    'Khám phá công nghệ, đồng hồ, âm thanh và đồ sưu tầm. Theo dõi các phiên đấu giá tại Nexus Marketplace.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      {/* Browser extensions such as Grammarly add attributes to body before hydration.
          Keep this exception at body; child components still receive hydration checks. */}
      <body suppressHydrationWarning>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
