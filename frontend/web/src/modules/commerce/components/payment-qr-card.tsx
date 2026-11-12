'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Check, Copy, ExternalLink, RefreshCw, AlertTriangle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { commerceApi } from '../api/commerce.api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface PaymentQrCardProps {
  orderId?: string;
  amount?: number;
  onCancelOrder?: () => void;
}

interface PaymentInfo {
  qrCode?: string | null;
  bin?: string | null;
  accountNumber?: string | null;
  accountName?: string | null;
  description?: string | null;
  checkoutUrl?: string | null;
  amount?: number | null;
}

export function PaymentQrCard({ orderId, amount, onCancelOrder }: PaymentQrCardProps) {
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const requestSeq = useRef(0);

  const loadLink = useCallback(() => {
    if (!orderId) return;
    const seq = ++requestSeq.current;
    setLoading(true);
    setLoadError('');
    commerceApi
      .getPaymentLink(orderId, false)
      .then((res) => {
        if (seq !== requestSeq.current) return;
        setPaymentInfo({
          qrCode: res?.qrCode || null,
          bin: res?.bin || null,
          accountNumber: res?.accountNumber || null,
          accountName: res?.accountName || null,
          description: res?.description || null,
          checkoutUrl: res?.checkoutUrl || null,
          amount: typeof amount === 'number' && amount > 0 ? amount : undefined,
        });
      })
      .catch(() => {
        if (seq === requestSeq.current) {
          setLoadError('Chưa tải được mã thanh toán. Vui lòng thử lại.');
        }
      })
      .finally(() => {
        if (seq === requestSeq.current) setLoading(false);
      });
  }, [orderId, amount]);

  useEffect(() => {
    loadLink();
  }, [loadLink]);

  const copyField = async (value: string, field: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const input = document.createElement('textarea');
        input.value = value;
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        const copied = document.execCommand('copy');
        input.remove();
        if (!copied) throw new Error('Copy failed');
      }
      setCopiedField(field);
      window.setTimeout(
        () => setCopiedField((current) => (current === field ? null : current)),
        2000,
      );
    } catch {
      setCopiedField(`error-${field}`);
      window.setTimeout(
        () => setCopiedField((current) => (current === `error-${field}` ? null : current)),
        2000,
      );
    }
  };

  const handleConfirmCancel = async () => {
    if (!orderId) return;
    setCancelling(true);
    try {
      await commerceApi.cancelOrder(orderId, 'Người mua hủy thanh toán');
      setCancelDialogOpen(false);
      if (onCancelOrder) onCancelOrder();
    } catch {
      // error handled in caller
    } finally {
      setCancelling(false);
    }
  };

  const transferAmount = paymentInfo?.amount ?? amount ?? 0;
  const qrString = paymentInfo?.qrCode || '';
  const accountNumber = paymentInfo?.accountNumber;
  const description = paymentInfo?.description;
  const bankName =
    paymentInfo?.bin === '970416'
      ? 'Ngân hàng TMCP Á Châu (ACB)'
      : paymentInfo?.bin
        ? `Mã ngân hàng ${paymentInfo.bin}`
        : null;
  const checkoutUrl = paymentInfo?.checkoutUrl;
  const safeCheckoutUrl = checkoutUrl && /^https:\/\//i.test(checkoutUrl) ? checkoutUrl : null;

  return (
    <>
      <section
        className="w-full rounded-2xl border border-stone-200 bg-white p-3 text-left shadow-sm sm:p-4"
        aria-label="Thanh toán PayOS"
      >
        <h2 className="mb-2 text-base font-bold text-stone-900">Quét mã để thanh toán</h2>

        <div className="grid items-center gap-4 md:grid-cols-[minmax(0,240px)_1fr]">
          <div className="flex flex-col items-center rounded-2xl border border-stone-200 bg-white p-2">
            {qrString ? (
              <QRCodeSVG
                value={qrString}
                size={224}
                level="M"
                marginSize={4}
                className="h-auto w-full max-w-56"
                title="Mã QR thanh toán PayOS"
              />
            ) : (
              <div className="flex aspect-square w-full max-w-56 flex-col items-center justify-center gap-3 text-center text-sm text-stone-600">
                <RefreshCw
                  aria-hidden="true"
                  className={`size-6 ${loading ? 'animate-spin' : ''}`}
                />
                <span>
                  {loading ? 'Đang tải mã thanh toán…' : loadError || 'Chưa có mã thanh toán'}
                </span>
              </div>
            )}
          </div>

          <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
            {bankName && (
              <div className="min-w-0">
                <p className="text-xs text-stone-600">Ngân hàng</p>
                <p className="font-semibold text-stone-900">{bankName}</p>
              </div>
            )}
            {paymentInfo?.accountName && (
              <div className="min-w-0">
                <p className="text-xs text-stone-600">Chủ tài khoản</p>
                <p className="font-semibold text-stone-900">{paymentInfo.accountName}</p>
              </div>
            )}
            {accountNumber && (
              <div className="flex min-w-0 items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-stone-600">Số tài khoản thanh toán</p>
                  <p className="break-all font-semibold text-stone-900">{accountNumber}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11 shrink-0 px-2"
                  onClick={() => copyField(accountNumber, 'account')}
                >
                  {copiedField === 'account' ? (
                    <Check aria-hidden="true" className="mr-1 size-4" />
                  ) : (
                    <Copy aria-hidden="true" className="mr-1 size-4" />
                  )}
                  {copiedField === 'account'
                    ? 'Đã chép'
                    : copiedField === 'error-account'
                      ? 'Không chép được'
                      : 'Sao chép'}
                </Button>
              </div>
            )}
            {transferAmount > 0 && (
              <div className="flex min-w-0 items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-stone-600">Số tiền</p>
                  <p className="text-lg font-bold text-brand-dark">
                    {new Intl.NumberFormat('vi-VN').format(transferAmount)} ₫
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11 shrink-0 px-2"
                  onClick={() => copyField(String(transferAmount), 'amount')}
                >
                  {copiedField === 'amount' ? (
                    <Check aria-hidden="true" className="mr-1 size-4" />
                  ) : (
                    <Copy aria-hidden="true" className="mr-1 size-4" />
                  )}
                  {copiedField === 'amount'
                    ? 'Đã chép'
                    : copiedField === 'error-amount'
                      ? 'Không chép được'
                      : 'Sao chép'}
                </Button>
              </div>
            )}
            {description && (
              <div className="flex min-w-0 items-center justify-between gap-2 sm:col-span-2">
                <div className="min-w-0">
                  <p className="text-xs text-stone-600">Nội dung chuyển khoản</p>
                  <p className="break-all font-semibold text-stone-900">{description}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11 shrink-0 px-2"
                  onClick={() => copyField(description, 'description')}
                >
                  {copiedField === 'description' ? (
                    <Check aria-hidden="true" className="mr-1 size-4" />
                  ) : (
                    <Copy aria-hidden="true" className="mr-1 size-4" />
                  )}
                  {copiedField === 'description'
                    ? 'Đã chép'
                    : copiedField === 'error-description'
                      ? 'Không chép được'
                      : 'Sao chép'}
                </Button>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
              {safeCheckoutUrl && (
                <a
                  href={safeCheckoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-dark px-4 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
                >
                  Mở trang thanh toán PayOS <ExternalLink aria-hidden="true" className="size-4" />
                </a>
              )}
              {!qrString && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={loadLink}
                  disabled={loading}
                  className="min-h-11"
                >
                  {loading ? 'Đang tải…' : 'Thử lại'}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => setCancelDialogOpen(true)}
                className="min-h-11"
              >
                Hủy đơn
              </Button>
            </div>
          </div>
        </div>
        {accountNumber && description && (
          <p className="mt-2 border-t border-stone-100 pt-2 text-xs leading-relaxed text-stone-600">
            Nếu chuyển khoản thủ công, dùng đúng số tài khoản, số tiền và nội dung của đơn này.
          </p>
        )}
      </section>

      {/* Hộp thoại xác nhận hủy thanh toán */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-stone-900">
              <AlertTriangle className="size-5 text-amber-600" />
              <span>Xác nhận hủy đơn hàng này?</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted leading-relaxed pt-2">
              Nếu bạn chưa thực hiện chuyển khoản, đơn hàng #{orderId} sẽ được chuyển về trạng thái
              đã hủy và giải phóng sản phẩm tồn kho.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={cancelling}
              onClick={() => setCancelDialogOpen(false)}
            >
              Tiếp tục thanh toán
            </Button>
            <Button
              type="button"
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={cancelling}
              onClick={handleConfirmCancel}
            >
              {cancelling ? 'Đang hủy…' : 'Xác nhận hủy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
