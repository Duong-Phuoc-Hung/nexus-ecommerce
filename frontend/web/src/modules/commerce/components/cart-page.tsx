'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { StoreHeader } from '@/components/layout/store-header';
import { readCart, writeCart, type CartLine } from '../utils/cart';
const cash = (n: number) => `${new Intl.NumberFormat('vi-VN').format(n)} ₫`;
export default function CartPage() {
  const [lines, setLines] = useState<CartLine[]>([]);
  useEffect(() => {
    setLines(readCart());
    const sync = () => setLines(readCart());
    window.addEventListener('nexus-cart-change', sync);
    return () => window.removeEventListener('nexus-cart-change', sync);
  }, []);
  const update = (next: CartLine[]) => {
    setLines(next);
    writeCart(next);
  };
  const total = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  return (
    <>
      <StoreHeader />
      <main className="nexus-container min-h-[70vh] py-8">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-dark">GIỎ HÀNG</p>
        <h1 className="mt-2 text-3xl font-bold">Sản phẩm đã chọn</h1>
        <p className="mt-2 text-sm text-muted">Danh sách giỏ hàng được lưu trên trình duyệt này.</p>
        {!lines.length ? (
          <section className="mt-6 rounded-2xl border border-line bg-white p-10 text-center">
            <h2 className="text-lg font-semibold">Giỏ hàng đang trống</h2>
            <p className="mt-2 text-sm text-muted">Khám phá các sản phẩm mua ngay trên Nexus.</p>
            <Link
              href="/products"
              className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-brand-dark px-5 text-sm font-semibold text-white"
            >
              Xem sản phẩm
            </Link>
          </section>
        ) : (
          <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_340px]">
            <section className="overflow-hidden rounded-2xl border border-line bg-white">
              {lines.map((line) => (
                <article
                  key={line.productId}
                  className="flex flex-wrap items-center gap-4 border-b border-line p-4 sm:p-5"
                >
                  <img
                    src={line.image}
                    alt=""
                    className="size-20 rounded-xl bg-stone-50 object-cover"
                  />
                  <div className="min-w-40 flex-1">
                    <Link
                      href={`/products/${encodeURIComponent(line.productId)}`}
                      className="font-semibold hover:underline"
                    >
                      {line.title}
                    </Link>
                    <p className="mt-1 text-sm text-muted">{cash(line.price)}</p>
                  </div>
                  <label className="text-sm">
                    Số lượng{' '}
                    <input
                      aria-label={`Số lượng ${line.title}`}
                      className="ml-2 h-11 w-20 rounded-lg border border-line px-3"
                      type="number"
                      min={1}
                      max={line.stock ?? 99}
                      value={line.quantity}
                      onChange={(e) => {
                        const q = Math.max(
                          1,
                          Math.min(Number(e.target.value) || 1, line.stock ?? 99),
                        );
                        update(
                          lines.map((x) =>
                            x.productId === line.productId ? { ...x, quantity: q } : x,
                          ),
                        );
                      }}
                    />
                  </label>
                  <button
                    className="min-h-11 rounded-lg px-3 text-sm text-brand-dark underline"
                    onClick={() => update(lines.filter((x) => x.productId !== line.productId))}
                  >
                    Xóa
                  </button>
                </article>
              ))}
            </section>
            <aside className="h-fit rounded-2xl border border-line bg-white p-5">
              <h2 className="font-semibold">Tóm tắt đơn</h2>
              <div className="mt-4 flex justify-between text-sm">
                <span className="text-muted">Tạm tính</span>
                <span>{cash(total)}</span>
              </div>
              <div className="mt-4 flex justify-between border-t border-line pt-4 font-bold">
                <span>Tổng cộng</span>
                <span className="text-brand-dark">{cash(total)}</span>
              </div>
              <Link
                href="/checkout"
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brand-dark px-5 text-sm font-semibold text-white"
              >
                Tiếp tục thanh toán
              </Link>
              <p className="mt-3 text-xs leading-5 text-muted">
                Số tiền cuối cùng cần được xác nhận lại từ máy chủ khi checkout.
              </p>
            </aside>
          </div>
        )}
      </main>
    </>
  );
}
