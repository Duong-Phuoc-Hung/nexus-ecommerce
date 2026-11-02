'use client';
import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { CreditCard, MapPin, Plus, ShieldCheck } from 'lucide-react';
import { StoreHeader } from '@/components/layout/store-header';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useSession } from '@/modules/auth/hooks/use-session';
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
import { PaymentQrCard } from './payment-qr-card';

export default function CheckoutPage() {
  const { user, phase } = useSession();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'BANK_TRANSFER' | 'COD'>('BANK_TRANSFER');
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [addressDialog, setAddressDialog] = useState(false);
  const [addDialog, setAddDialog] = useState(false);

  // Thông tin báo giá từ server
  const [quote, setQuote] = useState<{
    quoteId: string;
    shippingFee: number;
    totalAmount: number;
  } | null>(null);

  useEffect(() => setLines(readCart()), []);

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

  // Tự động gọi quote khi có sản phẩm và địa chỉ
  useEffect(() => {
    if (!lines.length || !selectedAddress || user?.role !== 'BUYER') return;
    let active = true;

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
    };

    commerceApi
      .getQuote(payload)
      .then((res) => {
        if (active) {
          setQuote({
            quoteId: res.quoteId,
            shippingFee: res.shippingFee,
            totalAmount: res.totalAmount,
          });
        }
      })
      .catch(() => {
        // Fallback tạm thời nếu backend quote chưa khởi chạy
        if (active) setQuote(null);
      });

    return () => {
      active = false;
    };
  }, [lines, selectedAddress, user?.role]);

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

    setBusy(true);
    try {
      const idempotencyKey = crypto.randomUUID();
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
            paymentMethod: 'COD',
          },
          idempotencyKey,
        );

        writeCart([]);
        window.location.assign(
          `/checkout/result?orderId=${encodeURIComponent(result.orderId)}&method=COD`,
        );
        return;
      }

      // 2. Luồng BANK_TRANSFER (PayOS / VietQR MoMo)
      const result = await commerceApi.checkout(
        {
          items: lines.map((x) => ({ productId: x.productId, quantity: x.quantity })),
          shippingAddress: shippingAddressPayload,
          quoteId: quote?.quoteId,
          paymentMethod: 'PAYOS',
        },
        idempotencyKey,
      );

      writeCart([]);

      const checkoutUrl = result.checkoutUrl;
      if (typeof checkoutUrl === 'string' && checkoutUrl.startsWith('http')) {
        const destination = new URL(checkoutUrl);
        if (
          destination.protocol === 'https:' &&
          (destination.hostname === 'payos.vn' || destination.hostname.endsWith('.payos.vn'))
        ) {
          window.location.assign(destination.href);
          return;
        }
      }

      // Trường hợp máy chủ trả mã đơn hoặc chưa sinh URL PayOS tự động:
      // Chuyển hướng đến trang thanh toán hiển thị mã VietQR MoMo đã được cài đặt!
      window.location.assign(
        `/checkout/result?orderId=${encodeURIComponent(result.orderId)}&method=BANK_TRANSFER`,
      );
    } catch (e) {
      setError(userMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const shippingFeeDisplay = quote
    ? `${new Intl.NumberFormat('vi-VN').format(quote.shippingFee)} ₫`
    : 'Miễn phí';
  const totalAmountDisplay = quote
    ? `${new Intl.NumberFormat('vi-VN').format(quote.totalAmount)} ₫`
    : `${new Intl.NumberFormat('vi-VN').format(subtotal)} ₫`;

  return (
    <>
      <StoreHeader />
      <main className="nexus-container min-h-[70vh] py-8">
        <Link href="/cart" className="inline-flex min-h-11 items-center text-sm text-muted">
          ← Giỏ hàng
        </Link>
        <p className="mt-3 text-xs font-bold uppercase tracking-widest text-brand-dark">
          CHECKOUT · BƯỚC 1 / 2
        </p>
        <h1 className="mt-2 text-3xl font-bold">Xác nhận giao hàng</h1>
        <p className="mt-2 text-sm text-muted">
          Chọn nơi nhận và kiểm tra sản phẩm trước khi thanh toán.
        </p>
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
              <fieldset className="mt-5 space-y-3">
                <legend className="sr-only">Chọn phương thức thanh toán</legend>
                {(
                  [
                    {
                      value: 'BANK_TRANSFER',
                      title: 'Chuyển khoản trực tuyến (VietQR / MoMo / PayOS)',
                      description:
                        'Quét mã VietQR chuyển khoản nhanh hoặc thanh toán an toàn qua cổng trực tuyến.',
                    },
                    {
                      value: 'COD',
                      title: 'Thanh toán khi nhận hàng (COD)',
                      description: 'Trả tiền mặt trực tiếp cho nhân viên giao vận khi nhận hàng.',
                    },
                  ] as const
                ).map((method) => (
                  <div key={method.value}>
                    <label
                      className={`flex min-h-20 cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                        paymentMethod === method.value
                          ? 'border-brand bg-brand-soft/30'
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
                      <span>
                        <strong className="text-sm">{method.title}</strong>
                        <span className="mt-1 block text-xs leading-5 text-muted">
                          {method.description}
                        </span>
                      </span>
                    </label>

                    {/* Hiển thị thẻ VietQR MoMo tiện lợi ngay khi chọn Chuyển khoản */}
                    {method.value === 'BANK_TRANSFER' && paymentMethod === 'BANK_TRANSFER' && (
                      <PaymentQrCard compact amount={quote ? quote.totalAmount : subtotal} />
                    )}
                  </div>
                ))}
              </fieldset>
              {paymentMethod === 'BANK_TRANSFER' && (
                <p className="mt-3 text-xs text-muted">
                  Giao dịch sẽ được hệ thống đối soát và xác nhận tự động ngay sau khi nhận được
                  chuyển khoản.
                </p>
              )}
            </section>
            {error && (
              <p
                className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                role="alert"
              >
                {error}
              </p>
            )}
          </div>
          <aside className="h-fit rounded-2xl border border-line bg-white p-5">
            <h2 className="font-semibold">Đơn hàng của bạn</h2>
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
            <div className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Tạm tính từ giỏ</span>
                <strong>{new Intl.NumberFormat('vi-VN').format(subtotal)} ₫</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Phí giao hàng</span>
                <span>{shippingFeeDisplay}</span>
              </div>
              <div className="flex justify-between border-t border-line pt-3 font-semibold">
                <span>Tổng thanh toán</span>
                <span className="text-brand-dark text-base">{totalAmountDisplay}</span>
              </div>
            </div>
            <Button
              type="submit"
              disabled={busy || user?.role !== 'BUYER' || !lines.length || !selectedAddress}
              className="mt-5 w-full"
            >
              {busy
                ? 'Đang xử lý…'
                : paymentMethod === 'COD'
                  ? 'Đặt hàng (Thanh toán COD)'
                  : 'Tiến hành thanh toán'}
            </Button>
            <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted">
              <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              Thanh toán an toàn, bảo vệ người mua theo quy định thương mại điện tử Nexus.
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
