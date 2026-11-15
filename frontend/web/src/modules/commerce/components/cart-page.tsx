'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { StoreHeader } from '@/components/layout/store-header';
import { useSession } from '@/modules/auth/hooks/use-session';
import { readCart, syncCartFromServer, writeCart, type CartLine } from '../utils/cart';
import { cartApi } from '../api/cart.api';
import { readCheckoutSelection, writeCheckoutSelection } from '../utils/cart-selection';
const cash = (n: number) => `${new Intl.NumberFormat('vi-VN').format(n)} ₫`;
export default function CartPage() {
  const { user } = useSession();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [quantityErrors, setQuantityErrors] = useState<Record<string, string>>({});
  const isNonBuyerRole = Boolean(user && user.role !== 'BUYER');
  useEffect(() => {
    const localLines = readCart();
    setLines(localLines);
    const saved = readCheckoutSelection();
    setSelectedIds(saved === null ? localLines.map((line) => line.productId) : saved);
    if (!user || user.role === 'BUYER') {
      syncCartFromServer().then((remoteLines) => {
        setLines(remoteLines);
        setSelectedIds((current) => {
          const savedIds = readCheckoutSelection();
          return savedIds === null ? remoteLines.map((line) => line.productId) : current;
        });
      });
    }
    const sync = () => setLines(readCart());
    window.addEventListener('nexus-cart-change', sync);
    return () => window.removeEventListener('nexus-cart-change', sync);
  }, [user]);

  const selectItems = (ids: string[]) => {
    setSelectedIds(ids);
    writeCheckoutSelection(ids);
  };

  const handleQuantityChange = async (line: CartLine, newQuantity: number) => {
    if (isNonBuyerRole) return;
    if (!Number.isInteger(newQuantity) || newQuantity < 1 || newQuantity > (line.stock ?? 99)) {
      setQuantityErrors((current) => ({
        ...current,
        [line.productId]: `Số lượng phải từ 1 đến ${line.stock ?? 99}.`,
      }));
      return;
    }
    setQuantityErrors((current) => ({ ...current, [line.productId]: '' }));
    const q = newQuantity;
    const next = lines.map((x) => (x.productId === line.productId ? { ...x, quantity: q } : x));
    setLines(next);
    writeCart(next);
    if (line.cartItemId) {
      try {
        await cartApi.updateItem(line.cartItemId, q);
      } catch {
        // Máy chủ từ chối (vd. vượt tồn kho): trả lại số lượng cũ để giỏ không lệch với BE.
        setLines((current) => {
          const reverted = current.map((x) =>
            x.productId === line.productId ? { ...x, quantity: line.quantity } : x,
          );
          writeCart(reverted);
          return reverted;
        });
        setQuantityErrors((current) => ({
          ...current,
          [line.productId]: 'Chưa cập nhật được số lượng. Vui lòng thử lại.',
        }));
      }
    }
  };

  const handleRemove = async (line: CartLine) => {
    if (isNonBuyerRole) return;
    const next = lines.filter((x) => x.productId !== line.productId);
    setLines(next);
    writeCart(next);
    selectItems(selectedIds.filter((id) => id !== line.productId));
    if (line.cartItemId) {
      try {
        await cartApi.removeItem(line.cartItemId);
      } catch {
        // Fallback locally
      }
    }
  };
  const selectedLines = lines.filter((line) => selectedIds.includes(line.productId));
  const total = selectedLines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  return (
    <>
      <StoreHeader />
      <main className="nexus-container min-h-[70vh] py-8">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-dark">GIỎ HÀNG</p>
        <h1 className="mt-2 text-3xl font-bold">Sản phẩm đã chọn</h1>
        <p className="mt-2 text-sm text-muted">Chọn những món bạn muốn thanh toán trong lần này.</p>

        {isNonBuyerRole && (
          <div
            role="status"
            className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
          >
            <p className="font-semibold">
              Tài khoản {user?.role} không có quyền mua hàng / thanh toán (CART.*, CHECKOUT.START)
            </p>
            <p className="mt-1 text-xs leading-relaxed text-amber-900">
              Dữ liệu giỏ hàng cũ trên thiết bị vẫn được giữ nguyên để đối chiếu nhưng thao tác
              thanh toán đã bị khóa sau khi chuyển đổi vai trò. Bạn vẫn có thể xem{' '}
              <Link href="/account/orders" className="font-semibold underline">
                lịch sử đơn mua trước đây
              </Link>{' '}
              hoặc mở{' '}
              <Link href="/seller" className="font-semibold underline">
                Kênh người bán
              </Link>
              .
            </p>
          </div>
        )}

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
              <label className="flex min-h-12 items-center gap-3 border-b border-line px-4 text-sm font-semibold sm:px-5">
                <input
                  type="checkbox"
                  aria-label="Chọn tất cả sản phẩm"
                  checked={selectedLines.length === lines.length}
                  onChange={(event) =>
                    selectItems(event.target.checked ? lines.map((line) => line.productId) : [])
                  }
                  disabled={isNonBuyerRole}
                  className="size-5 accent-brand"
                />
                Chọn tất cả ({lines.length})
              </label>
              {lines.map((line) => (
                <article
                  key={line.productId}
                  className="flex flex-wrap items-center gap-4 border-b border-line p-4 sm:p-5"
                >
                  <input
                    type="checkbox"
                    aria-label={`Chọn mua ${line.title}`}
                    checked={selectedIds.includes(line.productId)}
                    onChange={(event) =>
                      selectItems(
                        event.target.checked
                          ? [...selectedIds, line.productId]
                          : selectedIds.filter((id) => id !== line.productId),
                      )
                    }
                    disabled={isNonBuyerRole}
                    className="size-5 shrink-0 accent-brand"
                  />
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
                  <div className="text-sm">
                    <label htmlFor={`cart-quantity-${line.productId}`}>Số lượng</label>{' '}
                    <input
                      id={`cart-quantity-${line.productId}`}
                      aria-label={`Số lượng ${line.title}`}
                      aria-invalid={Boolean(quantityErrors[line.productId])}
                      aria-describedby={
                        quantityErrors[line.productId]
                          ? `cart-quantity-error-${line.productId}`
                          : undefined
                      }
                      className="ml-2 h-11 w-20 rounded-lg border border-line px-3 disabled:bg-stone-100"
                      type="number"
                      min={1}
                      max={line.stock ?? 99}
                      step={1}
                      value={line.quantity}
                      disabled={isNonBuyerRole}
                      onChange={(e) => void handleQuantityChange(line, Number(e.target.value))}
                    />
                    {quantityErrors[line.productId] && (
                      <p
                        id={`cart-quantity-error-${line.productId}`}
                        role="alert"
                        className="mt-1 text-xs text-red-700"
                      >
                        {quantityErrors[line.productId]}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={isNonBuyerRole}
                    className="min-h-11 rounded-lg px-3 text-sm text-brand-dark underline disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => handleRemove(line)}
                  >
                    Xóa
                  </button>
                </article>
              ))}
            </section>
            <aside className="h-fit rounded-2xl border border-line bg-white p-5">
              <h2 className="font-semibold">Tóm tắt đơn</h2>
              <p className="mt-1 text-sm text-muted">Đã chọn {selectedLines.length} sản phẩm</p>
              <div className="mt-4 flex justify-between text-sm">
                <span className="text-muted">Tạm tính</span>
                <span>{cash(total)}</span>
              </div>
              <div className="mt-4 flex justify-between border-t border-line pt-4 font-bold">
                <span>Tổng cộng</span>
                <span className="text-brand-dark">{cash(total)}</span>
              </div>
              {isNonBuyerRole || selectedLines.length === 0 ? (
                <button
                  type="button"
                  disabled
                  className="mt-5 inline-flex min-h-12 w-full cursor-not-allowed items-center justify-center rounded-xl bg-stone-200 px-5 text-sm font-semibold text-stone-600"
                >
                  {isNonBuyerRole ? 'Thanh toán chỉ dành cho Buyer' : 'Chọn sản phẩm để thanh toán'}
                </button>
              ) : (
                <Link
                  href="/checkout"
                  className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brand-dark px-5 text-sm font-semibold text-white"
                >
                  Tiếp tục thanh toán
                </Link>
              )}
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
