'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Tag, Trash2, X } from 'lucide-react';
import { StoreHeader } from '@/components/layout/store-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { requestApi } from '@/lib/axios/api-client';
import { unwrap, userMessage } from '@/lib/axios/http';
import { useSession } from '@/modules/auth/hooks/use-session';
import { useBuyerAssistant } from '@/modules/chat/context/buyer-assistant-provider';
import { readCart, syncCartFromServer, writeCart, type CartLine } from '../utils/cart';
import { cartApi } from '../api/cart.api';
import { readCheckoutSelection, writeCheckoutSelection } from '../utils/cart-selection';

const PROMO_STORAGE_KEY = 'nexus.checkout.promo.v1';

const cash = (n: number) => `${new Intl.NumberFormat('vi-VN').format(Math.round(n))} ₫`;

type ItemValidation = {
  productId: string;
  itemStatus: 'OK' | 'PRICE_CHANGED' | 'INSUFFICIENT_STOCK' | 'OUT_OF_STOCK' | 'UNAVAILABLE';
  currentUnitPrice?: number;
  availableStock?: number;
  warningMessage?: string;
  canCheckout: boolean;
};

type AvailablePromo = {
  code: string;
  name: string;
  discountType: 'FIXED' | 'PERCENT';
  discountValue: number;
  minOrderAmount: number;
  eligible: boolean;
  estimatedDiscount: number;
  ineligibleReason?: string | null;
};

type AppliedPromo = {
  code: string;
  name?: string;
  discountAmount: number;
};

function readStoredPromo(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.sessionStorage.getItem(PROMO_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function writeStoredPromo(code: string) {
  if (typeof window === 'undefined') return;
  try {
    if (code) window.sessionStorage.setItem(PROMO_STORAGE_KEY, code);
    else window.sessionStorage.removeItem(PROMO_STORAGE_KEY);
  } catch {
    // Ignore storage error
  }
}

export default function CartPage() {
  const { user } = useSession();
  const { setCheckoutContext } = useBuyerAssistant();

  const [lines, setLines] = useState<CartLine[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [quantityErrors, setQuantityErrors] = useState<Record<string, string>>({});

  const [validations, setValidations] = useState<Record<string, ItemValidation>>({});
  const [estimatedTax, setEstimatedTax] = useState(0);
  const [estimatedShipping, setEstimatedShipping] = useState<number | null>(null);

  const [promoInput, setPromoInput] = useState('');
  const [availablePromos, setAvailablePromos] = useState<AvailablePromo[]>([]);
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoError, setPromoError] = useState('');

  const isNonBuyerRole = Boolean(user && user.role !== 'BUYER');

  useEffect(() => {
    const localLines = readCart();
    setLines(localLines);
    const saved = readCheckoutSelection();
    setSelectedIds(saved === null ? localLines.map((line) => line.productId) : saved);
    const storedCode = readStoredPromo();
    if (storedCode) setPromoInput(storedCode);

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

  const selectedLines = useMemo(
    () => lines.filter((line) => selectedIds.includes(line.productId)),
    [lines, selectedIds],
  );

  // Derive local stock checks immediately + merge server validation if endpoint exists
  const lineValidationMap = useMemo(() => {
    const map: Record<string, ItemValidation> = {};
    for (const line of lines) {
      const srv = validations[line.productId];
      if (srv) {
        map[line.productId] = srv;
      } else if (line.stock !== null && line.stock === 0) {
        map[line.productId] = {
          productId: line.productId,
          itemStatus: 'OUT_OF_STOCK',
          warningMessage: 'Sản phẩm đã hết hàng.',
          canCheckout: false,
        };
      } else if (line.stock !== null && line.quantity > line.stock) {
        map[line.productId] = {
          productId: line.productId,
          itemStatus: 'INSUFFICIENT_STOCK',
          availableStock: line.stock,
          warningMessage: `Chỉ còn ${line.stock} sản phẩm trong kho.`,
          canCheckout: false,
        };
      } else {
        map[line.productId] = {
          productId: line.productId,
          itemStatus: 'OK',
          canCheckout: true,
        };
      }
    }
    return map;
  }, [lines, validations]);

  const subtotal = useMemo(
    () =>
      selectedLines.reduce((sum, line) => {
        const unit = lineValidationMap[line.productId]?.currentUnitPrice ?? line.price;
        return sum + unit * line.quantity;
      }, 0),
    [lineValidationMap, selectedLines],
  );

  // Validate selected lines with BE when available
  useEffect(() => {
    if (!selectedLines.length || user?.role !== 'BUYER') {
      setValidations({});
      setEstimatedTax(0);
      setEstimatedShipping(null);
      return;
    }
    let alive = true;
    requestApi('/cart/validate', {
      method: 'POST',
      body: {
        items: selectedLines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        promoCode: appliedPromo?.code || undefined,
      },
    })
      .then((raw) => {
        if (!alive) return;
        const data = unwrap<Record<string, unknown>>(raw);
        if (Array.isArray(data?.items)) {
          const next: Record<string, ItemValidation> = {};
          for (const entry of data.items as Array<Record<string, unknown>>) {
            const pid = String(entry.productId ?? '');
            if (!pid) continue;
            next[pid] = {
              productId: pid,
              itemStatus: String(entry.itemStatus ?? 'OK') as ItemValidation['itemStatus'],
              currentUnitPrice:
                typeof entry.currentUnitPrice === 'number' ? entry.currentUnitPrice : undefined,
              availableStock:
                typeof entry.availableStock === 'number' ? entry.availableStock : undefined,
              warningMessage:
                typeof entry.warningMessage === 'string' ? entry.warningMessage : undefined,
              canCheckout: entry.canCheckout !== false,
            };
          }
          setValidations(next);
        }
        const summary = data?.summary as Record<string, unknown> | undefined;
        if (summary) {
          setEstimatedTax(Number(summary.estimatedTax ?? 0) || 0);
          setEstimatedShipping(
            typeof summary.estimatedShipping === 'number' ? summary.estimatedShipping : null,
          );
        }
      })
      .catch(() => {
        // Fallback giữ kiểm tra cục bộ
      });

    requestApi(`/checkout/promotions?subtotal=${Math.round(subtotal)}`)
      .then((raw) => {
        if (!alive) return;
        const data = unwrap<unknown>(raw);
        setAvailablePromos(Array.isArray(data) ? (data as AvailablePromo[]) : []);
      })
      .catch(() => {
        if (alive) setAvailablePromos([]);
      });

    return () => {
      alive = false;
    };
  }, [appliedPromo?.code, selectedLines, subtotal, user?.role]);

  const discountAmount = appliedPromo?.discountAmount ?? 0;
  const estimatedTotal = Math.max(
    0,
    subtotal - discountAmount + estimatedTax + (estimatedShipping ?? 0),
  );

  const hasBlockingSelected = selectedLines.some(
    (line) => lineValidationMap[line.productId]?.canCheckout === false,
  );

  useEffect(() => {
    setCheckoutContext({
      stage: 'CART',
      itemsCount: selectedLines.length,
      subtotal,
      totalAmount: estimatedTotal,
    });
    return () => setCheckoutContext(null);
  }, [estimatedTotal, selectedLines.length, setCheckoutContext, subtotal]);

  const selectItems = (ids: string[]) => {
    setSelectedIds(ids);
    writeCheckoutSelection(ids);
  };

  const handleQuantityChange = async (line: CartLine, newQuantity: number) => {
    if (isNonBuyerRole) return;
    const maxStock = lineValidationMap[line.productId]?.availableStock ?? line.stock ?? 99;
    if (!Number.isInteger(newQuantity) || newQuantity < 1 || newQuantity > maxStock) {
      setQuantityErrors((current) => ({
        ...current,
        [line.productId]: `Số lượng từ 1 đến ${maxStock}.`,
      }));
      return;
    }
    setQuantityErrors((current) => ({ ...current, [line.productId]: '' }));
    const next = lines.map((x) =>
      x.productId === line.productId ? { ...x, quantity: newQuantity } : x,
    );
    setLines(next);
    writeCart(next);
    if (line.cartItemId) {
      try {
        await cartApi.updateItem(line.cartItemId, newQuantity);
      } catch {
        setLines((current) => {
          const reverted = current.map((x) =>
            x.productId === line.productId ? { ...x, quantity: line.quantity } : x,
          );
          writeCart(reverted);
          return reverted;
        });
        setQuantityErrors((current) => ({
          ...current,
          [line.productId]: 'Chưa cập nhật được số lượng.',
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

  async function applyPromo(codeRaw?: string) {
    const code = (codeRaw ?? promoInput).trim().toUpperCase();
    if (!code || promoBusy || !selectedLines.length) return;
    setPromoBusy(true);
    setPromoError('');
    try {
      const raw = await requestApi('/checkout/promotions/validate', {
        method: 'POST',
        body: {
          code,
          items: selectedLines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        },
      });
      const data = unwrap<Record<string, unknown>>(raw);
      if (data?.valid === false) {
        setAppliedPromo(null);
        writeStoredPromo('');
        setPromoError(String(data.message || 'Mã giảm giá không hợp lệ cho đơn hàng này.'));
      } else {
        const discount = Number(data?.discountAmount ?? 0);
        setAppliedPromo({
          code: String(data?.code ?? code),
          name: typeof data?.name === 'string' ? data.name : undefined,
          discountAmount: Number.isFinite(discount) ? discount : 0,
        });
        setPromoInput(String(data?.code ?? code));
        writeStoredPromo(String(data?.code ?? code));
      }
    } catch (err) {
      setAppliedPromo(null);
      writeStoredPromo('');
      setPromoError(userMessage(err));
    } finally {
      setPromoBusy(false);
    }
  }

  function removePromo() {
    setAppliedPromo(null);
    setPromoInput('');
    setPromoError('');
    writeStoredPromo('');
  }

  return (
    <>
      <StoreHeader />
      <main className="nexus-container min-h-[70vh] py-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-dark">Giỏ hàng</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-stone-950 sm:text-3xl">
          Sản phẩm đã chọn
        </h1>

        {isNonBuyerRole && (
          <div
            role="status"
            className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
          >
            Tài khoản {user?.role} không hỗ trợ đặt mua. Bạn vẫn có thể xem{' '}
            <Link href="/account/orders" className="font-semibold underline">
              đơn mua trước đây
            </Link>
            .
          </div>
        )}

        {!lines.length ? (
          <section className="mt-6 rounded-3xl border border-line bg-white p-10 text-center">
            <h2 className="text-lg font-semibold text-stone-950">Giỏ hàng đang trống</h2>
            <p className="mt-1.5 text-sm text-muted">Khám phá sản phẩm phù hợp trên Nexus.</p>
            <Link
              href="/products"
              className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-brand-dark px-5 text-sm font-semibold text-white"
            >
              Xem sản phẩm
            </Link>
          </section>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
            <section className="overflow-hidden rounded-3xl border border-line bg-white">
              <label className="flex min-h-12 items-center gap-3 border-b border-line px-5 text-sm font-semibold text-stone-900">
                <input
                  type="checkbox"
                  aria-label="Chọn tất cả sản phẩm"
                  checked={selectedLines.length === lines.length}
                  onChange={(event) =>
                    selectItems(event.target.checked ? lines.map((line) => line.productId) : [])
                  }
                  disabled={isNonBuyerRole}
                  className="size-4 accent-brand"
                />
                Chọn tất cả ({lines.length})
              </label>

              {lines.map((line) => {
                const v = lineValidationMap[line.productId];
                const isBlocked = v && !v.canCheckout;
                const priceChanged =
                  v?.itemStatus === 'PRICE_CHANGED' &&
                  typeof v.currentUnitPrice === 'number' &&
                  v.currentUnitPrice !== line.price;

                return (
                  <article
                    key={line.productId}
                    className={`border-b border-line p-4 last:border-b-0 sm:p-5 ${
                      isBlocked ? 'bg-red-50/40' : ''
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-4">
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
                        className="size-4 shrink-0 accent-brand"
                      />
                      <img
                        src={line.image || '/images/nexus-product-placeholder.svg'}
                        alt=""
                        className="size-20 shrink-0 rounded-xl border border-stone-100 bg-stone-50 object-cover"
                      />
                      <div className="min-w-44 flex-1">
                        <Link
                          href={`/products/${encodeURIComponent(line.productId)}`}
                          className="font-semibold text-stone-950 hover:underline"
                        >
                          {line.title}
                        </Link>
                        <div className="mt-1 flex flex-wrap items-baseline gap-2">
                          <span className="text-sm font-semibold text-stone-900 tabular-nums">
                            {cash(v?.currentUnitPrice ?? line.price)}
                          </span>
                          {priceChanged && (
                            <span className="text-xs text-stone-400 line-through tabular-nums">
                              {cash(line.price)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <label
                          htmlFor={`cart-quantity-${line.productId}`}
                          className="text-xs text-muted"
                        >
                          SL
                        </label>
                        <input
                          id={`cart-quantity-${line.productId}`}
                          aria-label={`Số lượng ${line.title}`}
                          aria-invalid={Boolean(quantityErrors[line.productId])}
                          className="h-10 w-20 rounded-xl border border-line px-3 text-center font-medium tabular-nums disabled:bg-stone-100"
                          type="number"
                          min={1}
                          max={v?.availableStock ?? line.stock ?? 99}
                          step={1}
                          value={line.quantity}
                          disabled={
                            isNonBuyerRole ||
                            v?.itemStatus === 'OUT_OF_STOCK' ||
                            v?.itemStatus === 'UNAVAILABLE'
                          }
                          onChange={(e) => void handleQuantityChange(line, Number(e.target.value))}
                        />
                      </div>

                      <button
                        type="button"
                        disabled={isNonBuyerRole}
                        aria-label={`Xóa ${line.title}`}
                        className="grid size-10 place-items-center rounded-xl text-stone-500 hover:bg-stone-100 hover:text-red-700 disabled:opacity-40"
                        onClick={() => void handleRemove(line)}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </div>

                    {v && v.itemStatus !== 'OK' && (
                      <p
                        role="alert"
                        className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium ${
                          isBlocked ? 'bg-red-100/70 text-red-800' : 'bg-amber-50 text-amber-900'
                        }`}
                      >
                        <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
                        <span>
                          {v.warningMessage ||
                            (v.itemStatus === 'OUT_OF_STOCK'
                              ? 'Sản phẩm đã hết hàng.'
                              : v.itemStatus === 'UNAVAILABLE'
                                ? 'Sản phẩm hiện ngừng bán.'
                                : v.itemStatus === 'PRICE_CHANGED'
                                  ? 'Giá sản phẩm vừa được cập nhật.'
                                  : 'Số lượng vượt quá tồn kho khả dụng.')}
                        </span>
                      </p>
                    )}

                    {quantityErrors[line.productId] && (
                      <p role="alert" className="mt-2 text-xs text-red-700">
                        {quantityErrors[line.productId]}
                      </p>
                    )}
                  </article>
                );
              })}
            </section>

            {/* Summary & Promo Code */}
            <aside className="h-fit space-y-5 rounded-3xl border border-line bg-white p-5 sm:p-6">
              <div>
                <h2 className="text-base font-bold text-stone-950">Tóm tắt đơn hàng</h2>
                <p className="mt-0.5 text-xs text-muted">Đã chọn {selectedLines.length} sản phẩm</p>
              </div>

              {/* Promo input */}
              {!isNonBuyerRole && (
                <div className="space-y-2.5 border-y border-line py-4">
                  <label
                    htmlFor="cart-promo-input"
                    className="flex items-center gap-1.5 text-xs font-semibold text-stone-800"
                  >
                    <Tag className="size-3.5 text-brand-dark" aria-hidden="true" />
                    Mã giảm giá
                  </label>
                  {appliedPromo ? (
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-950">
                      <div className="flex items-center gap-2">
                        <CheckCircle2
                          className="size-4 shrink-0 text-emerald-700"
                          aria-hidden="true"
                        />
                        <div>
                          <span className="font-mono font-bold">{appliedPromo.code}</span>
                          <span className="ml-1.5 text-emerald-800 tabular-nums">
                            (-{cash(appliedPromo.discountAmount)})
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-label="Bỏ mã giảm giá"
                        onClick={removePromo}
                        className="rounded-lg p-1 text-emerald-800 hover:bg-emerald-100"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        id="cart-promo-input"
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                        placeholder="Nhập mã ưu đãi…"
                        className="min-h-10 rounded-xl font-mono text-xs uppercase"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={promoBusy || !promoInput.trim() || !selectedLines.length}
                        onClick={() => void applyPromo()}
                        className="min-h-10 shrink-0 rounded-xl px-4 text-xs font-semibold"
                      >
                        {promoBusy ? 'Kiểm tra…' : 'Áp dụng'}
                      </Button>
                    </div>
                  )}

                  {promoError && (
                    <p role="alert" className="text-xs text-red-700">
                      {promoError}
                    </p>
                  )}

                  {!appliedPromo && availablePromos.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {availablePromos.slice(0, 3).map((p) => (
                        <button
                          key={p.code}
                          type="button"
                          disabled={!p.eligible || promoBusy}
                          onClick={() => void applyPromo(p.code)}
                          className="rounded-lg border border-line bg-stone-50 px-2.5 py-1 font-mono text-[11px] font-semibold text-stone-800 hover:border-brand disabled:opacity-50"
                        >
                          {p.code}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Price breakdown */}
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Tạm tính</span>
                  <span className="font-medium text-stone-900 tabular-nums">{cash(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Giảm giá</span>
                    <span className="font-semibold tabular-nums">-{cash(discountAmount)}</span>
                  </div>
                )}
                {estimatedTax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted">Thuế ước tính</span>
                    <span className="tabular-nums">{cash(estimatedTax)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted">Phí vận chuyển</span>
                  <span className="text-xs text-muted tabular-nums">
                    {estimatedShipping !== null
                      ? cash(estimatedShipping)
                      : 'Tính ở bước thanh toán'}
                  </span>
                </div>
                <div className="flex items-baseline justify-between border-t border-line pt-3.5 font-bold">
                  <span className="text-stone-950">Tổng ước tính</span>
                  <span className="text-lg text-brand-dark tabular-nums">
                    {cash(estimatedTotal)}
                  </span>
                </div>
              </div>

              {isNonBuyerRole || selectedLines.length === 0 || hasBlockingSelected ? (
                <button
                  type="button"
                  disabled
                  className="inline-flex min-h-12 w-full cursor-not-allowed items-center justify-center rounded-xl bg-stone-200 px-5 text-sm font-semibold text-stone-600"
                >
                  {isNonBuyerRole
                    ? 'Chỉ dành cho Buyer'
                    : hasBlockingSelected
                      ? 'Vui lòng xử lý sản phẩm lỗi trước'
                      : 'Chọn sản phẩm để thanh toán'}
                </button>
              ) : (
                <Link
                  href="/checkout"
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brand-dark px-5 text-sm font-semibold text-white hover:bg-brand"
                >
                  Tiếp tục thanh toán
                </Link>
              )}
            </aside>
          </div>
        )}
      </main>
    </>
  );
}
