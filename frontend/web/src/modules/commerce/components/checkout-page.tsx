'use client';
import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  CreditCard,
  MapPin,
  Plus,
  ShieldCheck,
  AlertCircle,
  Check,
  Tag,
  Truck,
  X,
} from 'lucide-react';
import { StoreHeader } from '@/components/layout/store-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useSession } from '@/modules/auth/hooks/use-session';
import { useBuyerAssistant } from '@/modules/chat/context/buyer-assistant-provider';
import { userMessage } from '@/lib/axios/http';
import { AddressForm } from '@/modules/user/components/address-form';
import {
  ADDRESS_CHANGE_EVENT,
  formatAddress,
  readAddresses,
  readContactPhone,
  saveAddressAsync,
  syncAddressesFromServer,
  type AddressInput,
  type ShippingAddress,
} from '@/modules/user/utils/address-book';
import { commerceApi } from '../api/commerce.api';

import { readCart, writeCart, type CartLine } from '../utils/cart';
import {
  clearBuyNowLine,
  clearCheckoutSelection,
  readBuyNowLine,
  readCheckoutSelection,
  rememberPendingPayosCart,
} from '../utils/cart-selection';

/** crypto.randomUUID chỉ có trong secure context (https/localhost); mở qua IP LAN trên điện thoại sẽ không có. */
function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export default function CheckoutPage() {
  const { user, phase } = useSession();
  const { setCheckoutContext } = useBuyerAssistant();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [isBuyNowMode, setIsBuyNowMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'PAYOS' | 'COD'>('PAYOS');
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [addressDialog, setAddressDialog] = useState(false);
  const [addDialog, setAddDialog] = useState(false);

  // Thông tin báo giá từ server
  const [quote, setQuote] = useState<{
    quoteId: string;
    shippingFee: number;
    discountAmount: number;
    taxAmount: number;
    totalAmount: number;
    expiresAt?: string;
    selectedShippingOptionId?: string;
    shippingOptions?: Array<{
      optionId: string;
      carrier: string;
      carrierName: string;
      serviceName: string;
      fee: number;
      etaText: string;
      recommended?: boolean;
    }>;
    promo?: {
      code: string;
      applied: boolean;
      discountAmount: number;
      message?: string;
    } | null;
  } | null>(null);
  const [quoteStatus, setQuoteStatus] = useState<
    'idle' | 'loading' | 'ready' | 'expired' | 'error'
  >('idle');
  const [quoteError, setQuoteError] = useState('');
  const [quoteRevision, setQuoteRevision] = useState(0);
  const [selectedShippingOptionId, setSelectedShippingOptionId] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromoCode, setAppliedPromoCode] = useState('');
  const [promoFeedback, setPromoFeedback] = useState('');
  const idempotencyRef = useRef<{ fingerprint: string; key: string } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = window.sessionStorage.getItem('nexus.checkout.promo.v1') || '';
      if (saved) {
        setPromoInput(saved);
        setAppliedPromoCode(saved);
      }
    } catch {
      // Ignore storage error
    }
  }, []);

  useEffect(() => {
    const params =
      typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    if (params?.get('mode') === 'buy-now') {
      const buyNowLine = readBuyNowLine();
      if (buyNowLine) {
        setIsBuyNowMode(true);
        setLines([buyNowLine]);
        return;
      }
    }
    setIsBuyNowMode(false);
    const cart = readCart();
    const selected = readCheckoutSelection();
    setLines(selected === null ? cart : cart.filter((line) => selected.includes(line.productId)));
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const sync = () => setAddresses(readAddresses(user.id));
    sync();
    syncAddressesFromServer(user.id).then((items) => {
      if (items.length) setAddresses(items);
    });
    window.addEventListener(ADDRESS_CHANGE_EVENT, sync);
    return () => window.removeEventListener(ADDRESS_CHANGE_EVENT, sync);
  }, [user?.id]);

  useEffect(() => {
    if (!addresses.length) {
      setSelectedId('');
      return;
    }
    if (!addresses.some((item) => item.id === selectedId)) {
      setSelectedId((addresses.find((item) => item.isDefault) || addresses[0]).id);
    }
  }, [addresses, selectedId]);

  const selectedAddress = addresses.find((item) => item.id === selectedId);
  const subtotal = lines.reduce((total, line) => total + line.price * line.quantity, 0);

  useEffect(() => {
    setCheckoutContext({
      stage: 'CHECKOUT',
      itemsCount: lines.length,
      subtotal,
      shippingFee: quote?.shippingFee ?? null,
      totalAmount: quote?.totalAmount ?? subtotal,
      paymentMethod,
      dialogOpen: addressDialog || addDialog || busy,
    });
    return () => setCheckoutContext(null);
  }, [
    addDialog,
    addressDialog,
    busy,
    lines.length,
    paymentMethod,
    quote?.shippingFee,
    quote?.totalAmount,
    setCheckoutContext,
    subtotal,
  ]);

  // Kiểm tra tồn kho & số lượng
  const hasOutOfStock = lines.some((x) => x.stock !== null && x.stock === 0);
  const hasExceedStock = lines.some((x) => x.stock !== null && x.quantity > x.stock);

  // Tự động gọi quote khi có sản phẩm và địa chỉ
  useEffect(() => {
    // Bỏ báo giá cũ ngay khi giỏ/địa chỉ thay đổi để không gửi quoteId lệch dữ liệu.
    setQuote(null);
    setQuoteError('');
    if (!lines.length || !selectedAddress || user?.role !== 'BUYER' || hasOutOfStock) {
      setQuoteStatus('idle');
      return;
    }
    let active = true;
    setQuoteStatus('loading');

    const payload = {
      items: lines.map((x) => ({ productId: x.productId, quantity: x.quantity })),
      shippingAddress: {
        fullName: selectedAddress.recipientName,
        phone: selectedAddress.phone,
        province: selectedAddress.province,
        ward: selectedAddress.ward || undefined,
        addressLine: selectedAddress.street,
        country: 'VN',
      },
      promoCode: appliedPromoCode || undefined,
      shippingOptionId: selectedShippingOptionId || undefined,
    };

    commerceApi
      .getQuote(payload)
      .then((res) => {
        if (!active) return;
        setQuote({
          quoteId: res.quoteId,
          shippingFee: res.shippingFee,
          discountAmount: res.discountAmount ?? res.promo?.discountAmount ?? 0,
          taxAmount: res.taxAmount ?? 0,
          totalAmount: res.totalAmount,
          expiresAt: res.expiresAt,
          selectedShippingOptionId: res.selectedShippingOptionId,
          shippingOptions: res.shippingOptions,
          promo: res.promo ?? null,
        });
        if (res.selectedShippingOptionId && !selectedShippingOptionId) {
          setSelectedShippingOptionId(res.selectedShippingOptionId);
        }
        if (appliedPromoCode && res.promo && !res.promo.applied) {
          setPromoFeedback(res.promo.message || 'Mã giảm giá chưa đủ điều kiện áp dụng.');
        } else {
          setPromoFeedback('');
        }
        setQuoteStatus('ready');
      })
      .catch((err) => {
        if (!active) return;
        setQuote(null);
        setQuoteStatus('error');
        setQuoteError(userMessage(err));
      });

    return () => {
      active = false;
    };
  }, [
    appliedPromoCode,
    hasOutOfStock,
    lines,
    quoteRevision,
    selectedAddress,
    selectedShippingOptionId,
    user?.role,
  ]);

  // Theo dõi hết hạn báo giá
  useEffect(() => {
    if (!quote?.expiresAt || quoteStatus !== 'ready') return;
    const msLeft = Date.parse(quote.expiresAt) - Date.now();
    if (!Number.isFinite(msLeft)) return;
    if (msLeft <= 0) {
      setQuoteStatus('expired');
      return;
    }
    const timer = window.setTimeout(() => setQuoteStatus('expired'), msLeft);
    return () => window.clearTimeout(timer);
  }, [quote?.expiresAt, quoteStatus]);

  async function addAddress(input: AddressInput, makeDefault: boolean) {
    if (!user) return;
    try {
      const saved = await saveAddressAsync(user.id, input, { makeDefault });
      setSelectedId(saved.id);
      setAddDialog(false);
      setAddressDialog(false);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Chưa lưu được địa chỉ.');
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (user?.role !== 'BUYER') {
      setError('Vui lòng đăng nhập bằng tài khoản Buyer để tiếp tục.');
      return;
    }
    if (!lines.length) {
      setError('Giỏ hàng đang trống.');
      return;
    }
    if (!selectedAddress) {
      setError('Vui lòng chọn hoặc thêm địa chỉ nhận hàng.');
      return;
    }

    // Nghiệp vụ kiểm tra tồn kho
    const outOfStockLine = lines.find((x) => x.stock !== null && x.stock === 0);
    if (outOfStockLine) {
      setError(
        `Sản phẩm "${outOfStockLine.title}" đã hết hàng. Vui lòng xóa khỏi giỏ để tiếp tục.`,
      );
      return;
    }
    const exceedStockLine = lines.find((x) => x.stock !== null && x.quantity > x.stock);
    if (exceedStockLine) {
      setError(
        `Sản phẩm "${exceedStockLine.title}" chỉ còn ${exceedStockLine.stock} sản phẩm trong kho.`,
      );
      return;
    }

    if (quoteStatus === 'loading') {
      setError('Đang tính báo giá giao hàng, vui lòng chờ giây lát.');
      return;
    }
    if (quoteStatus === 'expired' || !quote) {
      setError(
        'Báo giá chưa sẵn sàng hoặc đã hết hạn. Vui lòng cập nhật báo giá trước khi đặt hàng.',
      );
      return;
    }

    setBusy(true);
    try {
      // Giữ cùng một khóa cho cùng nội dung đơn: nếu lần trước timeout và Buyer bấm lại,
      // BE nhận ra yêu cầu trùng thay vì tạo đơn thứ hai.
      const fingerprint = JSON.stringify([
        paymentMethod,
        selectedAddress.id,
        appliedPromoCode,
        selectedShippingOptionId,
        lines.map((x) => [x.productId, x.quantity]),
      ]);
      if (idempotencyRef.current?.fingerprint !== fingerprint) {
        idempotencyRef.current = { fingerprint, key: newIdempotencyKey() };
      }
      const idempotencyKey = idempotencyRef.current.key;
      const shippingAddressPayload = {
        fullName: selectedAddress.recipientName,
        phone: selectedAddress.phone,
        province: selectedAddress.province,
        ward: selectedAddress.ward || undefined,
        addressLine: selectedAddress.street,
        country: 'VN',
      };

      // 1. Luồng COD (Thanh toán khi nhận hàng)
      if (paymentMethod === 'COD') {
        const result = await commerceApi.checkout(
          {
            items: lines.map((x) => ({ productId: x.productId, quantity: x.quantity })),
            shippingAddress: shippingAddressPayload,
            quoteId: quote?.quoteId,
            promoCode: appliedPromoCode || undefined,
            shippingOptionId: selectedShippingOptionId || undefined,
            paymentMethod: 'COD',
          },
          idempotencyKey,
        );

        // Bỏ các sản phẩm đã mua khỏi giỏ hàng (chỉ thực hiện khi đi từ Giỏ hàng; Mua ngay giữ nguyên giỏ)
        if (isBuyNowMode) {
          clearBuyNowLine();
        } else {
          const purchasedIds = lines.map((x) => x.productId);
          const currentCart = readCart();
          const remainingCart = currentCart.filter((x) => !purchasedIds.includes(x.productId));
          writeCart(remainingCart);
          clearCheckoutSelection();
        }
        window.location.assign(
          `/checkout/result?orderId=${encodeURIComponent(result.orderId)}&method=COD`,
        );
        return;
      }

      // 2. Luồng PAYOS (Cổng thanh toán PayOS / VietQR)
      const result = await commerceApi.checkout(
        {
          items: lines.map((x) => ({ productId: x.productId, quantity: x.quantity })),
          shippingAddress: shippingAddressPayload,
          quoteId: quote?.quoteId,
          promoCode: appliedPromoCode || undefined,
          shippingOptionId: selectedShippingOptionId || undefined,
          paymentMethod: 'PAYOS',
        },
        idempotencyKey,
      );

      // Tạo đơn chưa đồng nghĩa đã thanh toán. PayOS hiển thị QR trên trang thanh toán của họ.
      // Nếu link chưa trả về cùng checkout, lấy lại qua endpoint payment-link.
      const checkoutUrl =
        result.checkoutUrl || (await commerceApi.getPaymentLink(result.orderId)).checkoutUrl;
      if (!checkoutUrl || !/^https:\/\//i.test(checkoutUrl)) {
        throw new Error(
          'Chưa nhận được liên kết thanh toán PayOS. Vui lòng mở đơn hàng để thử lại.',
        );
      }
      if (isBuyNowMode) {
        clearBuyNowLine();
      } else {
        rememberPendingPayosCart(result.orderId, lines);
        clearCheckoutSelection();
      }
      sessionStorage.setItem('nexus-pending-payos-order', result.orderId);
      window.location.assign(checkoutUrl);
      return;
    } catch (e) {
      setError(userMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const hasConfirmedQuote = Boolean(quote && quoteStatus === 'ready');
  const shippingFeeDisplay =
    quoteStatus === 'loading'
      ? 'Đang tính phí…'
      : hasConfirmedQuote && quote
        ? quote.shippingFee === 0
          ? 'Miễn phí'
          : `${new Intl.NumberFormat('vi-VN').format(quote.shippingFee)} ₫`
        : quoteStatus === 'expired'
          ? 'Báo giá hết hạn'
          : 'Chưa xác nhận phí';
  const totalAmountDisplay =
    hasConfirmedQuote && quote
      ? `${new Intl.NumberFormat('vi-VN').format(quote.totalAmount)} ₫`
      : `${new Intl.NumberFormat('vi-VN').format(subtotal)} ₫`;
  const backHref =
    isBuyNowMode && lines[0]?.productId
      ? `/products/${encodeURIComponent(lines[0].productId)}`
      : '/cart';
  const backLabel = isBuyNowMode ? '← Quay lại sản phẩm' : '← Giỏ hàng';

  return (
    <>
      <StoreHeader />
      <main className="nexus-container min-h-[70vh] py-8">
        <Link
          href={backHref}
          className="inline-flex min-h-11 items-center text-sm text-muted hover:text-stone-900"
        >
          {backLabel}
        </Link>

        {/* Thanh tiến trình 3 bước kiểu Shopee */}
        <div
          aria-label="Các bước đặt hàng"
          className="mt-3 grid grid-cols-3 gap-2 sm:gap-4 rounded-2xl border border-line bg-white p-3 sm:p-4 shadow-2xs"
        >
          <div className="flex items-center gap-2 text-xs">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
              <Check className="size-3.5" />
            </span>
            <div className="min-w-0">
              <span className="block font-semibold text-stone-900 truncate">
                {isBuyNowMode ? 'Chọn sản phẩm' : 'Chọn giỏ hàng'}
              </span>
              <span className="hidden sm:block text-[11px] text-emerald-700">Đã xong</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-dark text-white font-bold">
              2
            </span>
            <div className="min-w-0">
              <span className="block font-bold text-brand-dark truncate">Địa chỉ & Thanh toán</span>
              <span className="hidden sm:block text-[11px] text-muted">Bước hiện tại</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs opacity-70">
            <span className="grid size-6 shrink-0 place-items-center rounded-full border border-line bg-stone-50 text-stone-600 font-bold">
              3
            </span>
            <div className="min-w-0">
              <span className="block font-semibold text-stone-700 truncate">Xác nhận đơn hàng</span>
              <span className="hidden sm:block text-[11px] text-muted">Theo dõi vận đơn</span>
            </div>
          </div>
        </div>

        <h1 className="mt-5 text-2xl sm:text-3xl font-bold text-stone-900">
          Xác nhận giao hàng & đặt đơn
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          Kiểm tra địa chỉ nhận hàng, sản phẩm và chọn phương thức thanh toán trước khi đặt đơn.
        </p>
        {!user && phase !== 'loading' && (
          <div className="mt-5 rounded-xl border border-line bg-white p-4 text-sm">
            Đăng nhập để tiếp tục.{' '}
            <Link
              className="font-semibold text-brand-dark underline"
              href={
                isBuyNowMode
                  ? '/login?next=%2Fcheckout%3Fmode%3Dbuy-now'
                  : '/login?next=%2Fcheckout'
              }
            >
              Đăng nhập
            </Link>
          </div>
        )}
        <form onSubmit={submit} className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <section className="rounded-2xl border border-line bg-white p-5 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand-dark">
                    <MapPin aria-hidden="true" className="size-5" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-muted">
                      01 · GIAO HÀNG
                    </p>
                    <h2 className="font-semibold">Địa chỉ nhận hàng</h2>
                  </div>
                </div>
                {user?.role === 'BUYER' && addresses.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAddressDialog(true)}
                  >
                    Thay đổi
                  </Button>
                )}
              </div>
              {selectedAddress ? (
                <div className="mt-5 rounded-xl border border-brand/25 bg-brand-soft/40 p-4">
                  <div className="flex items-center gap-2">
                    <strong>{selectedAddress.recipientName}</strong>
                    <span className="text-sm text-muted">{selectedAddress.phone}</span>
                    {selectedAddress.isDefault && (
                      <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-brand-dark">
                        Mặc định
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {formatAddress(selectedAddress)}
                  </p>
                  {selectedAddress.note && (
                    <p className="mt-1 text-xs text-muted">Ghi chú: {selectedAddress.note}</p>
                  )}
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-dashed border-line p-6 text-center">
                  <p className="text-sm text-muted">Bạn chưa có địa chỉ nhận hàng.</p>
                  {user?.role === 'BUYER' && (
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-3"
                      onClick={() => setAddDialog(true)}
                    >
                      <Plus aria-hidden="true" className="size-4" /> Thêm địa chỉ
                    </Button>
                  )}
                </div>
              )}
              {user?.role === 'BUYER' && (
                <Link
                  href="/account/addresses"
                  className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-brand-dark underline underline-offset-4"
                >
                  Quản lý sổ địa chỉ
                </Link>
              )}
            </section>

            <section className="rounded-2xl border border-line bg-white p-5 sm:p-7">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand-dark">
                  <CreditCard aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted">
                    02 · THANH TOÁN
                  </p>
                  <h2 className="font-semibold">Phương thức thanh toán</h2>
                </div>
              </div>

              {/* Danh sách phương thức thanh toán không hiện sẵn mã QR */}
              <fieldset className="mt-5 space-y-3">
                <legend className="sr-only">Chọn phương thức thanh toán</legend>
                {(
                  [
                    {
                      value: 'PAYOS',
                      title: 'Cổng thanh toán PayOS (VietQR 24/7)',
                      badge: 'Khuyên dùng',
                      description:
                        'Quét mã VietQR chuẩn PayOS tự động qua mọi app ngân hàng và ví điện tử, đối soát tức thì 24/7.',
                    },
                    {
                      value: 'COD',
                      title: 'Thanh toán khi nhận hàng (COD)',
                      badge: null,
                      description:
                        'Kiểm tra sản phẩm và trả tiền mặt trực tiếp cho nhân viên giao vận khi nhận hàng.',
                    },
                  ] as const
                ).map((method) => (
                  <div key={method.value}>
                    <label
                      className={`flex min-h-20 cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                        paymentMethod === method.value
                          ? 'border-brand bg-brand-soft/30 ring-1 ring-brand-dark/20'
                          : 'border-line hover:border-brand/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method.value}
                        checked={paymentMethod === method.value}
                        onChange={() => {
                          setPaymentMethod(method.value);
                          setError('');
                        }}
                        className="mt-0.5 size-4 shrink-0 accent-brand"
                      />
                      <span className="flex-1">
                        <span className="flex items-center gap-2">
                          <strong className="text-sm">{method.title}</strong>
                          {method.badge && (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                              {method.badge}
                            </span>
                          )}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-muted">
                          {method.description}
                        </span>
                      </span>
                    </label>
                  </div>
                ))}
              </fieldset>

              <p className="mt-3 text-xs text-muted">
                {paymentMethod === 'PAYOS'
                  ? 'Sau khi đặt hàng, bạn sẽ được chuyển đến trang PayOS để quét mã và thanh toán.'
                  : 'Đơn hàng sẽ được chuyển đến người bán để chuẩn bị và giao đến bạn.'}
              </p>
            </section>

            {/* Chọn đơn vị & gói vận chuyển (khi BE trả nhiều phương án) */}
            {quote?.shippingOptions && quote.shippingOptions.length > 0 && (
              <section className="mt-4 rounded-2xl border border-line bg-white p-5">
                <div className="flex items-center gap-2">
                  <Truck className="size-4 text-brand-dark" aria-hidden="true" />
                  <h2 className="text-sm font-bold text-stone-900">Đơn vị vận chuyển</h2>
                </div>
                <div
                  className="mt-3 space-y-2.5"
                  role="radiogroup"
                  aria-label="Chọn đơn vị vận chuyển"
                >
                  {quote.shippingOptions.map((opt) => {
                    const active =
                      (selectedShippingOptionId || quote.selectedShippingOptionId) === opt.optionId;
                    return (
                      <label
                        key={opt.optionId}
                        className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3.5 transition ${
                          active
                            ? 'border-brand-dark bg-brand-soft/30'
                            : 'border-line bg-white hover:bg-stone-50'
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="shippingOptionId"
                            checked={active}
                            onChange={() => setSelectedShippingOptionId(opt.optionId)}
                            className="size-4 accent-brand"
                          />
                          <span>
                            <span className="flex items-center gap-2 text-sm font-semibold text-stone-900">
                              <span>
                                {opt.carrierName} · {opt.serviceName}
                              </span>
                              {opt.recommended && (
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                  Đề xuất
                                </span>
                              )}
                            </span>
                            <span className="mt-0.5 block text-xs text-muted">{opt.etaText}</span>
                          </span>
                        </span>
                        <strong className="shrink-0 text-sm font-bold text-stone-900 tabular-nums">
                          {opt.fee === 0
                            ? 'Miễn phí'
                            : `${new Intl.NumberFormat('vi-VN').format(opt.fee)} ₫`}
                        </strong>
                      </label>
                    );
                  })}
                </div>
              </section>
            )}

            {error && (
              <p
                className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                role="alert"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </p>
            )}
          </div>

          <aside className="h-fit rounded-2xl border border-line bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h2 className="font-bold text-stone-900">Đơn hàng của bạn</h2>
              <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-semibold text-stone-700">
                {lines.reduce((acc, item) => acc + item.quantity, 0)} sản phẩm
              </span>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              {lines.map((x) => (
                <div key={x.productId} className="flex items-center gap-3">
                  <img
                    src={x.image || '/images/nexus-product-placeholder.svg'}
                    onError={(e) => {
                      if (!e.currentTarget.src.endsWith('/images/nexus-product-placeholder.svg')) {
                        e.currentTarget.src = '/images/nexus-product-placeholder.svg';
                      }
                    }}
                    alt={x.title}
                    width={48}
                    height={48}
                    className="size-12 shrink-0 rounded-xl border border-line/70 bg-stone-50 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-stone-900 line-clamp-2 leading-snug">
                      {x.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {new Intl.NumberFormat('vi-VN').format(x.price)} ₫ × {x.quantity}
                    </p>
                  </div>
                  <strong className="shrink-0 font-semibold text-stone-900">
                    {new Intl.NumberFormat('vi-VN').format(x.price * x.quantity)} ₫
                  </strong>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-line pt-4">
              <label
                htmlFor="checkout-promo"
                className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-stone-800"
              >
                <Tag className="size-3.5 text-brand-dark" aria-hidden="true" />
                Mã giảm giá
              </label>
              {appliedPromoCode ? (
                <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-950">
                  <span className="font-mono font-bold">{appliedPromoCode}</span>
                  <button
                    type="button"
                    aria-label="Bỏ mã giảm giá"
                    onClick={() => {
                      setAppliedPromoCode('');
                      setPromoInput('');
                      setPromoFeedback('');
                      try {
                        window.sessionStorage.removeItem('nexus.checkout.promo.v1');
                      } catch {
                        // Ignore
                      }
                    }}
                    className="rounded-md p-1 text-emerald-800 hover:bg-emerald-100"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    id="checkout-promo"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    placeholder="Nhập mã ưu đãi…"
                    className="min-h-10 rounded-xl font-mono text-xs uppercase"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!promoInput.trim()}
                    onClick={() => {
                      const code = promoInput.trim().toUpperCase();
                      setAppliedPromoCode(code);
                      try {
                        window.sessionStorage.setItem('nexus.checkout.promo.v1', code);
                      } catch {
                        // Ignore
                      }
                    }}
                    className="min-h-10 shrink-0 rounded-xl px-3.5 text-xs font-semibold"
                  >
                    Áp dụng
                  </Button>
                </div>
              )}
              {promoFeedback && (
                <p role="alert" className="mt-1.5 text-xs text-amber-800">
                  {promoFeedback}
                </p>
              )}
            </div>

            <div className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Tạm tính tiền hàng</span>
                <strong className="tabular-nums">
                  {new Intl.NumberFormat('vi-VN').format(subtotal)} ₫
                </strong>
              </div>
              {(quote?.discountAmount ?? 0) > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Giảm giá</span>
                  <strong className="tabular-nums">
                    -{new Intl.NumberFormat('vi-VN').format(quote?.discountAmount ?? 0)} ₫
                  </strong>
                </div>
              )}
              {(quote?.taxAmount ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted">Thuế</span>
                  <span className="tabular-nums">
                    {new Intl.NumberFormat('vi-VN').format(quote?.taxAmount ?? 0)} ₫
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted">Phí giao hàng</span>
                <span className="tabular-nums">{shippingFeeDisplay}</span>
              </div>
              <div className="flex justify-between border-t border-line pt-3 font-semibold">
                <span>{hasConfirmedQuote ? 'Tổng thanh toán cuối' : 'Tổng tạm tính'}</span>
                <span className="text-brand-dark text-base tabular-nums">{totalAmountDisplay}</span>
              </div>
              {(quoteStatus === 'expired' || quoteStatus === 'error') && (
                <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
                  <p>
                    {quoteStatus === 'expired'
                      ? 'Báo giá đã hết hiệu lực. Cập nhật lại để xác nhận tổng tiền mới nhất.'
                      : quoteError || 'Chưa nhận được báo giá vận chuyển từ máy chủ.'}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setQuoteRevision((v) => v + 1)}
                    className="mt-2 min-h-9 rounded-lg border-amber-300 bg-white text-xs font-semibold text-amber-950"
                  >
                    Cập nhật báo giá
                  </Button>
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={
                busy ||
                user?.role !== 'BUYER' ||
                !lines.length ||
                !selectedAddress ||
                hasOutOfStock ||
                hasExceedStock ||
                !hasConfirmedQuote
              }
              className="mt-5 w-full bg-brand-dark py-3 text-sm font-semibold text-white hover:bg-brand"
            >
              {busy
                ? 'Đang xử lý đơn…'
                : paymentMethod === 'COD'
                  ? 'Đặt hàng (Thanh toán COD)'
                  : 'Tiến hành thanh toán PayOS'}
            </Button>

            <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted">
              <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              Bảo vệ người mua: Đơn hàng chỉ được xác nhận khi giao dịch hoàn tất hợp lệ.
            </p>
          </aside>
        </form>
      </main>

      <Dialog open={addressDialog} onOpenChange={setAddressDialog}>
        <DialogContent className="p-6 sm:p-8">
          <DialogTitle>Chọn địa chỉ giao hàng</DialogTitle>
          <DialogDescription className="mt-1">
            Chọn nơi nhận cho đơn hàng này. Địa chỉ mặc định trong tài khoản sẽ không tự đổi.
          </DialogDescription>
          <div className="mt-5 space-y-3">
            {addresses.map((item) => (
              <Button
                key={item.id}
                type="button"
                variant="outline"
                className={`min-h-20 w-full justify-start whitespace-normal p-4 text-left ${
                  item.id === selectedId ? 'border-brand bg-brand-soft' : ''
                }`}
                aria-pressed={item.id === selectedId}
                onClick={() => {
                  setSelectedId(item.id);
                  setAddressDialog(false);
                }}
              >
                <span className="grid gap-1">
                  <strong>
                    {item.recipientName} · {item.phone}
                  </strong>
                  <span className="text-xs font-normal text-muted">{formatAddress(item)}</span>
                </span>
              </Button>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-5 w-full"
            onClick={() => {
              setAddressDialog(false);
              setAddDialog(true);
            }}
            disabled={addresses.length >= 5}
          >
            <Plus aria-hidden="true" className="size-4" /> Thêm địa chỉ khác
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="max-w-xl p-6 sm:p-8">
          <DialogTitle>Thêm địa chỉ nhận hàng</DialogTitle>
          <DialogDescription className="mt-1 mb-5">
            Địa chỉ này được lưu vào sổ địa chỉ tài khoản Buyer trên hệ thống Nexus.
          </DialogDescription>
          {user && (
            <AddressForm
              fullName={user.fullName}
              phone={readContactPhone(user.id)}
              onSave={addAddress}
              onCancel={() => setAddDialog(false)}
            />
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm text-brand-dark">
              {error}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
