'use client';

import { useState } from 'react';
import { Copy, Check, QrCode, ShieldCheck, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { PAYMENT_QR_CONFIG } from '../config/payment-qr';

export interface PaymentQrCardProps {
  orderId?: string;
  amount?: number;
  compact?: boolean;
}

export function PaymentQrCard({ orderId, amount, compact = false }: PaymentQrCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const transferNote = orderId
    ? `${PAYMENT_QR_CONFIG.transferNotePrefix} ${orderId}`
    : PAYMENT_QR_CONFIG.transferNotePrefix;

  const copyText = (text: string, field: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  if (compact) {
    return (
      <>
        <div className="mt-3 rounded-xl border border-brand/20 bg-brand-soft/30 p-4 text-xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-brand/30 bg-white">
                <img
                  src={PAYMENT_QR_CONFIG.imageUrl}
                  alt="Mã VietQR"
                  className="size-full object-cover"
                />
              </div>
              <div>
                <p className="font-semibold text-brand-dark">VietQR / MoMo liên ngân hàng</p>
                <p className="text-muted">Chủ TK: {PAYMENT_QR_CONFIG.accountName}</p>
                <p className="text-muted">STK: {PAYMENT_QR_CONFIG.accountNumber}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(true)}
              className="shrink-0 text-xs"
            >
              <QrCode aria-hidden="true" className="mr-1 size-3.5" />
              Xem mã QR
            </Button>
          </div>
        </div>

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-md p-6 sm:p-8">
            <DialogTitle className="text-center text-lg font-bold">
              Mã QR Chuyển khoản (VietQR / MoMo)
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-muted">
              Quét mã bằng ứng dụng Ngân hàng hoặc ví MoMo để chuyển khoản
            </DialogDescription>

            <div className="mt-4 flex flex-col items-center">
              <div className="overflow-hidden rounded-2xl border-2 border-brand/20 bg-white p-2 shadow-sm">
                <img
                  src={PAYMENT_QR_CONFIG.imageUrl}
                  alt="Mã QR thanh toán VietQR MoMo"
                  className="size-64 object-contain sm:size-72"
                />
              </div>

              <div className="mt-4 w-full space-y-2 rounded-xl bg-stone-50 p-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Chủ tài khoản:</span>
                  <span className="font-semibold">{PAYMENT_QR_CONFIG.accountName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Số tài khoản / SĐT ví:</span>
                  <button
                    type="button"
                    onClick={() => copyText(PAYMENT_QR_CONFIG.accountNumber, 'acc')}
                    className="flex items-center gap-1 font-semibold text-brand-dark hover:underline"
                  >
                    {PAYMENT_QR_CONFIG.accountNumber}
                    {copiedField === 'acc' ? (
                      <Check className="size-3 text-emerald-600" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </button>
                </div>
                {amount && (
                  <div className="flex items-center justify-between border-t border-line/50 pt-2 font-medium">
                    <span className="text-muted">Số tiền:</span>
                    <span className="text-brand-dark font-bold">
                      {new Intl.NumberFormat('vi-VN').format(amount)} ₫
                    </span>
                  </div>
                )}
                {orderId && (
                  <div className="flex items-center justify-between border-t border-line/50 pt-2">
                    <span className="text-muted">Nội dung chuyển khoản:</span>
                    <button
                      type="button"
                      onClick={() => copyText(transferNote, 'note')}
                      className="flex items-center gap-1 font-mono font-bold text-brand-dark hover:underline"
                    >
                      {transferNote}
                      {copiedField === 'note' ? (
                        <Check className="size-3 text-emerald-600" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="mt-4 w-full"
              onClick={() => setModalOpen(false)}
            >
              Đóng
            </Button>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Full card (dành cho trang Checkout Result hoặc xem đơn mua)
  return (
    <div className="mt-6 rounded-3xl border border-brand/20 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-dark">
        <QrCode aria-hidden="true" className="size-4" />
        MÃ VIETQR / MOMO CHUYỂN KHOẢN TRỰC TIẾP
      </div>

      <div className="mt-5 flex flex-col items-center">
        <div className="overflow-hidden rounded-2xl border-2 border-brand/20 bg-white p-3 shadow-sm transition-transform hover:scale-[1.01]">
          <img
            src={PAYMENT_QR_CONFIG.imageUrl}
            alt="Mã VietQR thanh toán MoMo Napas 247"
            className="size-64 object-contain sm:size-80"
          />
        </div>

        <div className="mt-5 w-full max-w-md space-y-2.5 rounded-2xl bg-stone-50 p-4 text-xs sm:text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted">Chủ tài khoản:</span>
            <span className="font-semibold text-stone-900">{PAYMENT_QR_CONFIG.accountName}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted">Số tài khoản / SĐT ví:</span>
            <button
              type="button"
              onClick={() => copyText(PAYMENT_QR_CONFIG.accountNumber, 'acc_full')}
              className="flex items-center gap-1.5 font-semibold text-brand-dark hover:underline"
            >
              {PAYMENT_QR_CONFIG.accountNumber}
              {copiedField === 'acc_full' ? (
                <span className="flex items-center text-xs text-emerald-600">
                  <Check className="size-3.5" /> Đã chép
                </span>
              ) : (
                <Copy className="size-3.5 text-muted hover:text-brand-dark" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted">Ngân hàng / Cổng:</span>
            <span className="font-medium text-stone-800">{PAYMENT_QR_CONFIG.bankName}</span>
          </div>

          {amount && (
            <div className="flex items-center justify-between border-t border-line/60 pt-2 font-medium">
              <span className="text-muted">Số tiền cần chuyển:</span>
              <span className="text-base font-bold text-brand-dark">
                {new Intl.NumberFormat('vi-VN').format(amount)} ₫
              </span>
            </div>
          )}

          {orderId && (
            <div className="flex items-center justify-between border-t border-line/60 pt-2">
              <span className="text-muted">Nội dung chuyển:</span>
              <button
                type="button"
                onClick={() => copyText(transferNote, 'note_full')}
                className="flex items-center gap-1.5 font-mono font-bold text-brand-dark hover:underline"
              >
                {transferNote}
                {copiedField === 'note_full' ? (
                  <span className="flex items-center text-xs text-emerald-600">
                    <Check className="size-3.5" /> Đã chép
                  </span>
                ) : (
                  <Copy className="size-3.5 text-muted hover:text-brand-dark" />
                )}
              </button>
            </div>
          )}
        </div>

        <ul className="mt-4 w-full max-w-md space-y-1 text-left text-xs text-muted">
          {PAYMENT_QR_CONFIG.instructions.map((step, idx) => (
            <li key={idx} className="flex items-start gap-1.5">
              <span className="font-semibold text-brand-dark">•</span>
              <span>{step}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
