'use client';

import { useState, useEffect } from 'react';
import {
  Copy,
  Check,
  QrCode,
  ShieldCheck,
  ExternalLink,
  Loader2,
  Clock,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { PAYMENT_QR_CONFIG, markOrderAsPaid } from '../config/payment-qr';
import { commerceApi } from '../api/commerce.api';

export interface PayOsPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  amount: number;
  checkoutUrl?: string;
  onDone?: () => void;
}

const DEFAULT_TIMEOUT_SECONDS = 900; // 15 phút

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Hộp thoại thanh toán qua cổng PayOS (VietQR 24/7)
 * - Tự động đối soát và phát hiện thanh toán thành công qua Polling (không cần bấm nút thủ công)
 * - Đếm ngược thời gian hiệu lực của mã QR (15 phút)
 * - Khi hết giờ có nút reload tạo mã mới
 */
export function PayOsPaymentDialog({
  open,
  onOpenChange,
  orderId,
  amount,
  checkoutUrl: initialCheckoutUrl,
  onDone,
}: PayOsPaymentDialogProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [payUrl, setPayUrl] = useState<string>(initialCheckoutUrl || '');
  const [loadingLink, setLoadingLink] = useState(false);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_TIMEOUT_SECONDS);
  const [isExpired, setIsExpired] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Lấy link thanh toán PayOS ban đầu
  const loadPaymentLink = (renew = false) => {
    if (!orderId) return;
    setLoadingLink(true);
    setIsExpired(false);
    commerceApi
      .getPaymentLink(orderId, renew)
      .then((res) => {
        if (res?.checkoutUrl) {
          setPayUrl(res.checkoutUrl);
        }
        setTimeLeft(DEFAULT_TIMEOUT_SECONDS);
      })
      .catch((e) => {
        console.error('Lỗi khi lấy link PayOS:', e);
      })
      .finally(() => setLoadingLink(false));
  };

  useEffect(() => {
    if (!open || !orderId) return;
    if (initialCheckoutUrl) {
      setPayUrl(initialCheckoutUrl);
      setTimeLeft(DEFAULT_TIMEOUT_SECONDS);
      setIsExpired(false);
      return;
    }
    loadPaymentLink(false);
  }, [open, orderId, initialCheckoutUrl]);

  // Bộ đếm ngược thời gian hiệu lực của mã QR
  useEffect(() => {
    if (!open || isExpired || isSuccess) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, isExpired, isSuccess]);

  // Tự động kiểm tra trạng thái thanh toán (Auto Polling mỗi 2.5s)
  useEffect(() => {
    if (!open || !orderId || isSuccess || isExpired) return;

    const poll = setInterval(async () => {
      try {
        const data = await commerceApi.getPaymentStatus(orderId);
        if (data?.paymentStatus === 'PAID' || data?.orderStatus === 'PAID') {
          clearInterval(poll);
          setIsSuccess(true);
          markOrderAsPaid(orderId);
          setTimeout(() => {
            if (onDone) {
              onDone();
            } else {
              window.location.assign(
                `/checkout/result?orderId=${encodeURIComponent(orderId)}&method=PAYOS&status=PAID`,
              );
            }
          }, 1500);
        }
      } catch {
        // Tiếp tục thử lại ở lần sau
      }
    }, 2500);

    return () => clearInterval(poll);
  }, [open, orderId, isSuccess, isExpired, onDone]);

  const copyText = (text: string, field: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const qrImageUrl = payUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=8&data=${encodeURIComponent(payUrl)}`
    : `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=8&data=${encodeURIComponent('https://pay.payos.vn')}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-5 sm:p-7 max-h-[92vh] overflow-y-auto sm:overflow-visible">
        {isSuccess ? (
          /* MÀN HÌNH CHÚC MỪNG KHI THANH TOÁN TỰ ĐỘNG THÀNH CÔNG */
          <div className="flex flex-col items-center justify-center py-10 text-center animate-in fade-in duration-300">
            <div className="relative grid size-20 place-items-center rounded-3xl bg-emerald-50 text-emerald-600 shadow-inner">
              <span className="absolute -inset-1 rounded-3xl bg-emerald-500/20 animate-ping" />
              <CheckCircle2 className="size-12 text-emerald-600" />
            </div>
            <h2 className="mt-5 text-2xl font-bold text-stone-900">Thanh toán thành công!</h2>
            <p className="mt-1.5 text-sm text-muted max-w-md">
              Cổng PayOS đã tự động xác nhận giao dịch của bạn. Đang chuyển hướng đến trang kết
              quả...
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            {/* CỘT TRÁI: MÃ QR ĐỘNG PAYOS & ĐẾM NGƯỢC */}
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-blue-200 bg-gradient-to-b from-blue-50/50 via-white to-blue-50/30 p-4 text-center md:w-[320px] md:shrink-0">
              <div className="relative overflow-hidden rounded-xl border border-blue-100 bg-white p-2 shadow-sm min-h-[260px] min-w-[260px] flex items-center justify-center">
                {loadingLink ? (
                  <div className="flex size-64 flex-col items-center justify-center gap-2 text-blue-600">
                    <Loader2 className="size-8 animate-spin" />
                    <span className="text-xs font-semibold">Đang tạo mã PayOS...</span>
                  </div>
                ) : isExpired ? (
                  /* OVERLAY KHI MÃ QR HẾT HẠN KÈM NÚT RELOAD */
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-900/85 p-4 text-center text-white backdrop-blur-sm rounded-xl">
                    <Clock className="size-9 text-amber-400 mb-2" />
                    <span className="text-sm font-bold">Mã thanh toán đã hết hạn</span>
                    <span className="text-xs text-stone-300 mt-1 mb-4">
                      Vui lòng tải lại để tạo mã QR mới
                    </span>
                    <Button
                      type="button"
                      onClick={() => loadPaymentLink(true)}
                      disabled={loadingLink}
                      className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-md"
                    >
                      <RefreshCw
                        className={`mr-1.5 size-3.5 ${loadingLink ? 'animate-spin' : ''}`}
                      />
                      Tạo mã mới
                    </Button>
                  </div>
                ) : (
                  <img
                    src={qrImageUrl}
                    alt="Mã VietQR thanh toán cổng PayOS"
                    className="size-64 sm:size-72 object-contain"
                  />
                )}
              </div>

              {/* Bộ đếm ngược thời gian */}
              {!isExpired && (
                <div className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
                  <Clock className="size-3.5 text-amber-600 animate-pulse" />
                  <span>
                    Mã hết hạn sau: <strong className="font-mono">{formatTime(timeLeft)}</strong>
                  </span>
                </div>
              )}

              <div className="mt-2.5 flex items-center justify-center gap-1.5 text-xs font-bold text-blue-800">
                <QrCode className="size-4" />
                <span>Quét mã PayOS VietQR liên ngân hàng</span>
              </div>
              <p className="mt-0.5 text-[11px] text-muted">
                Nhận diện tự động qua App Ngân hàng 24/7
              </p>

              {/* Nút reload thủ công nếu người dùng muốn làm mới bất kỳ lúc nào */}
              {!isExpired && (
                <button
                  type="button"
                  onClick={() => loadPaymentLink(true)}
                  disabled={loadingLink}
                  className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 underline"
                >
                  <RefreshCw className={`size-3 ${loadingLink ? 'animate-spin' : ''}`} />
                  Làm mới mã QR
                </button>
              )}
            </div>

            {/* CỘT PHẢI: CHI TIẾT SỐ TIỀN & THÔNG TIN CỔNG PAYOS */}
            <div className="flex flex-1 flex-col justify-between text-left">
              <div>
                {/* Badge & Order Code */}
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                    <span className="size-1.5 rounded-full bg-blue-600 animate-pulse" />
                    CỔNG THANH TOÁN PAYOS · VIETQR
                  </div>
                  {orderId && (
                    <span className="font-mono text-xs font-medium text-muted">
                      Mã đơn: <strong className="text-stone-800">#{orderId}</strong>
                    </span>
                  )}
                </div>

                <DialogTitle className="mt-2 text-xl font-bold text-stone-900">
                  Quét mã PayOS để thanh toán
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-xs text-muted">
                  Hệ thống tự động xác nhận và cập nhật đơn hàng ngay khi tiền vào tài khoản
                </DialogDescription>

                {/* Ô Số tiền thanh toán */}
                <div className="mt-3.5 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/70 to-white p-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    Số tiền cần thanh toán
                  </span>
                  <div className="mt-0.5 flex items-center justify-between">
                    <span className="text-2xl font-black tracking-tight text-blue-700 sm:text-3xl">
                      {new Intl.NumberFormat('vi-VN').format(amount)} ₫
                    </span>
                    <button
                      type="button"
                      onClick={() => copyText(String(amount), 'amount')}
                      title="Sao chép số tiền"
                      className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                    >
                      {copiedField === 'amount' ? (
                        <>
                          <Check className="size-3.5 text-emerald-600" />
                          <span className="text-emerald-600">Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5" />
                          <span>Sao chép</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Chi tiết thông tin đối soát PayOS */}
                <div className="mt-3 space-y-2 rounded-xl bg-stone-50 p-3 text-xs sm:text-[13px]">
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Chủ tài khoản thụ hưởng:</span>
                    <span className="font-bold text-stone-900">
                      {PAYMENT_QR_CONFIG.accountName}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-line/60 pt-2">
                    <span className="text-muted">Hạ tầng cổng thanh toán:</span>
                    <span className="font-semibold text-blue-800">
                      {PAYMENT_QR_CONFIG.bankName}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-line/60 pt-2">
                    <span className="text-muted">Mã đơn hàng đối soát:</span>
                    <span className="font-mono font-bold text-stone-800">#{orderId}</span>
                  </div>

                  <div className="flex items-center justify-between border-t border-line/60 pt-2">
                    <span className="text-muted">Cơ chế đối soát:</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                      <ShieldCheck className="size-3.5" /> Tự động xác nhận 24/7
                    </span>
                  </div>
                </div>

                {/* Thanh trạng thái tự động nhận diện thanh toán */}
                <div className="mt-3.5 flex items-center gap-2.5 rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900">
                  <span className="relative flex size-2.5 shrink-0">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-blue-600" />
                  </span>
                  <span className="font-medium leading-relaxed">
                    Đang chờ chuyển khoản… Hệ thống tự động phát hiện và hoàn tất đơn hàng ngay tức
                    thì.
                  </span>
                </div>
              </div>

              {/* Nút hành động */}
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                {payUrl && (
                  <Button
                    type="button"
                    className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                    onClick={() => window.location.assign(payUrl)}
                  >
                    Mở trang PayOS <ExternalLink className="ml-1.5 size-4" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl py-2.5 text-sm text-stone-600"
                  onClick={() => {
                    onOpenChange(false);
                    window.location.assign('/account/orders');
                  }}
                >
                  Xem đơn mua sau
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Giữ lại alias MoMoPaymentDialog để tương thích ngược nếu có file gọi
export const MoMoPaymentDialog = PayOsPaymentDialog;
export type MoMoPaymentDialogProps = PayOsPaymentDialogProps;

export interface PaymentQrCardProps {
  orderId?: string;
  amount?: number;
}

/**
 * Thẻ hiển thị mã QR VietQR PayOS trên trang kết quả thanh toán
 */
export function PaymentQrCard({ orderId, amount }: PaymentQrCardProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [payUrl, setPayUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const loadLink = (renew = false) => {
    if (!orderId) return;
    setLoading(true);
    commerceApi
      .getPaymentLink(orderId, renew)
      .then((res) => {
        if (res?.checkoutUrl) setPayUrl(res.checkoutUrl);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLink(false);
  }, [orderId]);

  const copyText = (text: string, field: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const qrImageUrl = payUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=8&data=${encodeURIComponent(payUrl)}`
    : `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=8&data=${encodeURIComponent('https://pay.payos.vn')}`;

  return (
    <div className="mt-6 rounded-3xl border border-blue-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-800">
        <QrCode aria-hidden="true" className="size-4" />
        MÃ VIETQR CỔNG THANH TOÁN PAYOS 24/7
      </div>

      <div className="mt-5 flex flex-col items-center">
        {/* Số tiền cần thanh toán */}
        {amount && (
          <div className="mb-4 w-full max-w-md rounded-2xl border border-blue-200 bg-blue-50/60 p-3.5 text-center">
            <span className="text-xs uppercase font-semibold text-muted">
              Số tiền cần thanh toán
            </span>
            <div className="mt-1 flex items-center justify-center gap-2">
              <span className="text-2xl font-extrabold text-blue-700 sm:text-3xl">
                {new Intl.NumberFormat('vi-VN').format(amount)} ₫
              </span>
              <button
                type="button"
                onClick={() => copyText(String(amount), 'amount_full')}
                title="Sao chép số tiền"
                className="rounded-lg border border-line bg-white p-1 text-xs text-stone-600 hover:bg-stone-50"
              >
                {copiedField === 'amount_full' ? (
                  <Check className="size-3 text-emerald-600" />
                ) : (
                  <Copy className="size-3" />
                )}
              </button>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border-2 border-blue-200 bg-white p-3 shadow-sm transition-transform hover:scale-[1.01]">
          <img
            src={qrImageUrl}
            alt="Mã VietQR thanh toán cổng PayOS"
            className="size-64 object-contain sm:size-80"
          />
        </div>

        <div className="mt-3 flex items-center gap-3">
          {payUrl && (
            <a
              href={payUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
            >
              <ExternalLink className="size-3.5" />
              <span>Mở cổng PayOS</span>
            </a>
          )}
          <button
            type="button"
            onClick={() => loadLink(true)}
            disabled={loading}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Làm mới mã
          </button>
        </div>

        <div className="mt-5 w-full max-w-md space-y-2.5 rounded-2xl bg-stone-50 p-4 text-xs sm:text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted">Chủ tài khoản thụ hưởng:</span>
            <span className="font-semibold text-stone-900">{PAYMENT_QR_CONFIG.accountName}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted">Cổng thanh toán:</span>
            <span className="font-medium text-stone-800">{PAYMENT_QR_CONFIG.bankName}</span>
          </div>

          {orderId && (
            <div className="flex items-center justify-between border-t border-line/60 pt-2">
              <span className="text-muted">Mã đơn hàng:</span>
              <span className="font-mono font-bold text-blue-800">#{orderId}</span>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-line/60 pt-2">
            <span className="text-muted">Đối soát:</span>
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
              <ShieldCheck className="size-3.5" /> Tự động 24/7 qua PayOS
            </span>
          </div>
        </div>

        <ul className="mt-4 w-full max-w-md space-y-1 text-left text-xs text-muted">
          {PAYMENT_QR_CONFIG.instructions.map((step, idx) => (
            <li key={idx} className="flex items-start gap-1.5">
              <span className="font-semibold text-blue-600">•</span>
              <span>{step}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
