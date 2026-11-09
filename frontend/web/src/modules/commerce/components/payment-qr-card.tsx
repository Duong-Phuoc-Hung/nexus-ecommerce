'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Copy, Check, RefreshCw, Lightbulb, AlertTriangle } from 'lucide-react';
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
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const requestSeq = useRef(0);

  const loadLink = useCallback(
    (renew = false) => {
      if (!orderId) return;
      const seq = ++requestSeq.current;
      setLoading(true);
      setLoadError('');
      commerceApi
        .getPaymentLink(orderId, renew)
        .then((res) => {
          if (seq !== requestSeq.current) return;
          setPaymentInfo({
            qrCode: res?.qrCode || null,
            bin: res?.bin || '970416',
            accountNumber: res?.accountNumber || 'LOCCASS000341571',
            accountName: res?.accountName || 'PHAM VO HUNG NGHI',
            description: res?.description || (orderId ? `CSFRRN18T51 Nexus ${orderId}` : ''),
            checkoutUrl: res?.checkoutUrl || null,
            amount: typeof amount === 'number' && amount > 0 ? amount : undefined,
          });
        })
        .catch(() => {
          if (seq === requestSeq.current) {
            setLoadError('Chưa nạp được thông tin VietQR. Hãy bấm Làm mới mã.');
          }
        })
        .finally(() => {
          if (seq === requestSeq.current) setLoading(false);
        });
    },
    [orderId, amount],
  );

  useEffect(() => {
    loadLink(false);
  }, [loadLink]);

  const copyText = (text: string, field: string) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
      })
      .catch(() => setCopiedField(null));
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

  const accountNumber = paymentInfo?.accountNumber || 'LOCCASS000341571';
  const accountName = paymentInfo?.accountName || 'PHAM VO HUNG NGHI';
  const transferDescription =
    paymentInfo?.description || (orderId ? `CSFRRN18T51 Nexus ${orderId}` : 'Nexus Thanh toan');
  const transferAmount = paymentInfo?.amount ?? amount ?? 0;
  const qrString = paymentInfo?.qrCode || paymentInfo?.checkoutUrl || '';

  return (
    <>
      <div className="w-full rounded-2xl sm:rounded-3xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-sm text-left">
        {/* Dòng hướng dẫn đầu bảng có icon bóng đèn */}
        <div className="flex items-center gap-2 rounded-xl bg-amber-50/70 border border-amber-200/60 px-3 py-2 text-xs text-amber-950">
          <Lightbulb className="size-4 shrink-0 text-amber-600" />
          <p className="leading-snug">
            Mở App Ngân hàng bất kỳ để <strong className="font-bold">quét mã VietQR</strong> hoặc{' '}
            <strong className="font-bold">chuyển khoản</strong> chính xác số tiền, nội dung bên dưới
          </p>
        </div>

        {/* Khung 2 cột: Cột trái Mã QR VietQR PRO, Cột phải Thông tin chuyển khoản */}
        <div className="mt-4 grid gap-5 md:grid-cols-[240px_1fr] items-center">
          {/* CỘT TRÁI: VIETQR PRO + MÃ QR + LOGO ACB + NÚT HỦY */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50/50 p-3 sm:p-4 text-center">
            {/* Logo VietQR PRO */}
            <div className="mb-2 flex items-center justify-center gap-1">
              <span className="text-sm font-extrabold tracking-tight">
                <span className="text-[#003B70]">Viet</span>
                <span className="text-[#E61B23]">QR</span>
              </span>
              <span className="rounded bg-gradient-to-r from-emerald-600 to-teal-600 px-1.5 py-0.5 text-[9px] font-black uppercase text-white shadow-xs">
                PRO
              </span>
            </div>

            {/* Khung chứa mã QR nét, tương phản cao */}
            <div className="relative overflow-hidden rounded-xl border border-stone-200 bg-white p-2.5 shadow-xs">
              {qrString ? (
                <div className="relative flex items-center justify-center">
                  <QRCodeSVG
                    value={qrString}
                    size={170}
                    level="M"
                    marginSize={2}
                    title="Mã VietQR thanh toán 24/7"
                  />
                  {/* Logo V nhỏ ở giữa chuẩn VietQR */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="grid size-6 place-items-center rounded-full bg-white shadow-sm border border-red-200">
                      <span className="text-xs font-black text-[#E61B23]">V</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex size-[170px] flex-col items-center justify-center text-center p-3">
                  <RefreshCw className={`size-6 text-brand ${loading ? 'animate-spin' : ''}`} />
                  <p className="mt-2 text-xs text-muted">
                    {loading ? 'Đang tạo VietQR…' : loadError || 'Chưa lấy được mã'}
                  </p>
                </div>
              )}
            </div>

            {/* Thương hiệu liên kết napas 247 | ACB */}
            <div className="mt-2 flex items-center justify-center gap-2 text-[11px] font-bold text-stone-600">
              <span className="text-teal-700">napas 247</span>
              <span className="text-stone-300">|</span>
              <span className="text-[#005baa]">ACB</span>
            </div>

            {/* Nút Huỷ thanh toán */}
            <div className="mt-3 w-full flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCancelDialogOpen(true)}
                className="h-8 rounded-lg px-6 text-xs text-stone-600 hover:text-red-700 hover:border-red-200 hover:bg-red-50"
              >
                Huỷ
              </Button>
              <button
                type="button"
                onClick={() => loadLink(true)}
                disabled={loading}
                title="Làm mới lại mã thanh toán"
                className="p-1.5 text-stone-400 hover:text-brand transition"
              >
                <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* CỘT PHẢI: BẢNG THÔNG TIN TÀI KHOẢN & SAO CHÉP */}
          <div className="space-y-2.5 text-xs sm:text-sm">
            {/* Hàng 1: Ngân hàng */}
            <div className="flex items-center gap-3 rounded-xl border border-stone-100 bg-stone-50/70 p-2.5">
              <div className="grid size-8 place-items-center rounded-full bg-[#005baa] text-white font-extrabold text-[11px] shadow-xs">
                ACB
              </div>
              <div className="flex-1">
                <span className="block text-[11px] text-muted">Ngân hàng</span>
                <strong className="block text-stone-900 font-bold">Ngân hàng TMCP Á Châu</strong>
              </div>
            </div>

            {/* Hàng 2: Chủ tài khoản */}
            <div className="rounded-xl border border-stone-100 bg-stone-50/70 p-2.5">
              <span className="block text-[11px] text-muted">Chủ tài khoản:</span>
              <strong className="block font-bold text-stone-900 uppercase tracking-wide">
                {accountName}
              </strong>
            </div>

            {/* Hàng 3: Số tài khoản + Nút sao chép */}
            <div className="flex items-center justify-between rounded-xl border border-stone-100 bg-stone-50/70 p-2.5">
              <div>
                <span className="block text-[11px] text-muted">Số tài khoản:</span>
                <strong className="font-mono text-sm font-bold text-blue-900 tracking-wider">
                  {accountNumber}
                </strong>
              </div>
              <button
                type="button"
                onClick={() => copyText(accountNumber, 'acc')}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 shadow-2xs hover:bg-slate-50 transition"
              >
                {copiedField === 'acc' ? (
                  <>
                    <Check className="size-3 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">Đã chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3 text-stone-400" />
                    <span>Sao chép</span>
                  </>
                )}
              </button>
            </div>

            {/* Hàng 4: Số tiền + Nút sao chép */}
            <div className="flex items-center justify-between rounded-xl border border-stone-100 bg-stone-50/70 p-2.5">
              <div>
                <span className="block text-[11px] text-muted">Số tiền:</span>
                <strong className="font-bold text-sm text-emerald-700">
                  {new Intl.NumberFormat('vi-VN').format(transferAmount)} vnd
                </strong>
              </div>
              <button
                type="button"
                onClick={() => copyText(String(transferAmount), 'amt')}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 shadow-2xs hover:bg-slate-50 transition"
              >
                {copiedField === 'amt' ? (
                  <>
                    <Check className="size-3 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">Đã chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3 text-stone-400" />
                    <span>Sao chép</span>
                  </>
                )}
              </button>
            </div>

            {/* Hàng 5: Nội dung + Nút sao chép */}
            <div className="flex items-center justify-between rounded-xl border border-stone-100 bg-stone-50/70 p-2.5">
              <div className="min-w-0 pr-2">
                <span className="block text-[11px] text-muted">Nội dung:</span>
                <strong className="font-mono text-xs sm:text-sm font-bold text-stone-900 break-all">
                  {transferDescription}
                </strong>
              </div>
              <button
                type="button"
                onClick={() => copyText(transferDescription, 'desc')}
                className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 shadow-2xs hover:bg-slate-50 transition"
              >
                {copiedField === 'desc' ? (
                  <>
                    <Check className="size-3 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">Đã chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3 text-stone-400" />
                    <span>Sao chép</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Dòng ghi chú nhắc nhở bên dưới đúng như ảnh mẫu */}
        <div className="mt-3 pt-3 border-t border-stone-100 text-xs text-stone-600 leading-relaxed">
          <span>Lưu ý : Nhập chính xác số tiền </span>
          <strong className="font-bold text-stone-900">
            {new Intl.NumberFormat('vi-VN').format(transferAmount)}
          </strong>
          <span>, nội dung </span>
          <strong className="font-bold text-stone-900 font-mono">{transferDescription}</strong>
          <span> khi chuyển khoản.</span>
        </div>
      </div>

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
