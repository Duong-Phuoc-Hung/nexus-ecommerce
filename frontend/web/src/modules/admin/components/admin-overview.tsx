import Link from 'next/link';
import { ArrowUpRight, PackageSearch, Gavel, Store, ShieldCheck, ReceiptText } from 'lucide-react';
import { Button } from '@/components/ui/button';
export function AdminOverview({ productsPath = '/admin/products' }: { productsPath?: string }) {
  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold tracking-[.16em] text-brand-dark">
            NEXUS · KHÔNG GIAN QUẢN TRỊ
          </p>
          <h1>Tổng quan vận hành</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted">
            Truy cập nhanh sản phẩm và phiên đấu giá. Theo dõi nội dung trước khi thực hiện thay
            đổi.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/">
            <Store size={17} />
            Xem cửa hàng
          </Link>
        </Button>
      </header>
      <div className="grid gap-5 md:grid-cols-2">
        {[
          {
            href: productsPath,
            title: 'Danh mục sản phẩm',
            caption: 'QUẢN LÝ NỘI DUNG',
            text: 'Tra cứu sản phẩm, xem thông tin và đối chiếu trạng thái hiển thị trên sàn.',
            action: 'Xem sản phẩm',
            Icon: PackageSearch,
          },
          {
            href: '/admin/auctions',
            title: 'Phiên đấu giá',
            caption: 'ĐIỀU HÀNH PHIÊN',
            text: 'Theo dõi các phiên, kiểm tra lịch và lịch sử trả giá trong cùng một không gian.',
            action: 'Quản lý phiên',
            Icon: Gavel,
          },
          {
            href: '/admin/orders',
            title: 'Giám sát đơn hàng',
            caption: 'COMMERCE OPERATIONS',
            text: 'Tra cứu đơn mua, cửa hàng và trạng thái giao dịch từ hệ thống.',
            action: 'Xem đơn hàng',
            Icon: ReceiptText,
          },
        ].map(({ href, title, caption, text, action, Icon }) => (
          <section
            key={href}
            className="flex flex-col rounded-3xl border border-line bg-white p-6 sm:p-8"
          >
            <div className="mb-6 flex items-center justify-between">
              <span className="grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                <Icon size={23} />
              </span>
              <span className="text-xs font-semibold tracking-widest text-muted">{caption}</span>
            </div>
            <h2>{title}</h2>
            <p className="mt-3 mb-7 max-w-lg text-sm leading-6 text-muted">{text}</p>
            <Button asChild variant="outline" className="mt-auto self-start">
              <Link href={href}>
                {action}
                <ArrowUpRight size={17} />
              </Link>
            </Button>
          </section>
        ))}
      </div>
      <section className="rounded-3xl border border-line bg-white p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <ShieldCheck size={21} className="text-slate-600" />
          <h2>Trước khi thực hiện thay đổi</h2>
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {[
            [
              '01',
              'Đối chiếu thông tin',
              'Kiểm tra đúng sản phẩm, người bán và nội dung cần xử lý.',
            ],
            ['02', 'Kiểm tra trạng thái', 'Phiên đã bắt đầu không được sửa cấu hình giá và lịch.'],
            [
              '03',
              'Xác nhận thao tác',
              'Đọc lại thay đổi trước khi lưu. Hủy phiên cần có lý do rõ ràng.',
            ],
          ].map(([step, title, text]) => (
            <div key={step}>
              <span className="text-xs font-semibold text-muted">{step}</span>
              <h3 className="mt-2 text-base font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
