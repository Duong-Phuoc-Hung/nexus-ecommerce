'use client';
import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { StoreHeader } from '@/components/layout/store-header';
import { useSession } from '@/modules/auth/hooks/use-session';
import { userMessage } from '@/lib/axios/http';
import { ordersApi } from '@/modules/commerce/api/orders.api';
import { readCart, type CartLine } from '../utils/cart';
export default function CheckoutPage() {
  const { user, phase } = useSession();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [address, setAddress] = useState({ fullName: '', phone: '', street: '', city: '' });
  useEffect(() => setLines(readCart()), []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!user) {
      setError('Vui lòng đăng nhập để tiếp tục.');
      return;
    }
    if (!lines.length) {
      setError('Giỏ hàng đang trống.');
      return;
    }
    if (Object.values(address).some((x) => !x.trim())) {
      setError('Vui lòng điền đầy đủ thông tin nhận hàng.');
      return;
    }
    setBusy(true);
    try {
      await ordersApi.checkout({
        items: lines.map((x) => ({ productId: x.productId, quantity: x.quantity })),
        shippingAddress: address,
      });
      setError('Máy chủ chưa xác nhận giao dịch. Vui lòng kiểm tra lại sau.');
    } catch (e) {
      setError(userMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <StoreHeader />
      <main className="nexus-container min-h-[70vh] py-8">
        <Link href="/cart" className="inline-flex min-h-11 items-center text-sm text-muted">
          ← Giỏ hàng
        </Link>
        <p className="mt-3 text-xs font-bold uppercase tracking-widest text-brand-dark">
          HOÀN TẤT ĐƠN MUA
        </p>
        <h1 className="mt-2 text-3xl font-bold">Thông tin nhận hàng</h1>
        {!user && phase !== 'loading' && (
          <div className="mt-5 rounded-xl border border-line bg-white p-4 text-sm">
            Đăng nhập để tiếp tục.{' '}
            <Link
              className="font-semibold text-brand-dark underline"
              href="/login?next=%2Fcheckout"
            >
              Đăng nhập
            </Link>
          </div>
        )}
        <form onSubmit={submit} className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]">
          <section className="rounded-2xl border border-line bg-white p-5 sm:p-7">
            <h2 className="font-semibold">Địa chỉ giao hàng</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {(
                [
                  ['fullName', 'Người nhận'],
                  ['phone', 'Số điện thoại'],
                  ['street', 'Địa chỉ cụ thể'],
                  ['city', 'Tỉnh / thành phố'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="grid gap-2 text-sm font-medium">
                  {label}
                  <input
                    required
                    value={address[key]}
                    onChange={(e) => setAddress({ ...address, [key]: e.target.value })}
                    className="min-h-11 rounded-xl border border-line px-3 font-normal outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </label>
              ))}
            </div>
            <p className="mt-5 rounded-xl bg-stone-50 p-4 text-xs leading-5 text-muted">
              Phương thức thanh toán sẽ hiển thị khi BE hoàn thành API payment. Nexus chưa gửi giao
              dịch thật.
            </p>
            {error && (
              <p
                className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                role="alert"
              >
                {error}
              </p>
            )}
          </section>
          <aside className="h-fit rounded-2xl border border-line bg-white p-5">
            <h2 className="font-semibold">Tóm tắt</h2>
            <div className="mt-4 space-y-3 text-sm">
              {lines.map((x) => (
                <div key={x.productId} className="flex justify-between gap-3">
                  <span>
                    {x.title} × {x.quantity}
                  </span>
                  <strong>{new Intl.NumberFormat('vi-VN').format(x.price * x.quantity)} ₫</strong>
                </div>
              ))}
            </div>
            <button
              disabled={busy || !user || !lines.length}
              className="mt-5 min-h-12 w-full rounded-xl bg-brand-dark px-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? 'Đang kiểm tra…' : 'Xác nhận thông tin'}
            </button>
            <p className="mt-3 text-xs leading-5 text-muted">
              Checkout BE hiện trả dữ liệu skeleton. FE sẽ từ chối trạng thái đó, không tạo đơn giả.
            </p>
          </aside>
        </form>
      </main>
    </>
  );
}
