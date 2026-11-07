'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { normalizeApiError } from '../../../lib/axios/http';
import { useSession } from '../../auth/hooks/use-session';
import { saveSession } from '../../auth/utils/session';
import { sellerApplicationsApi } from '../api/seller-applications.api';
import type {
  SellerActivationEligibilityResponse,
  SellerApplicationBuyerDto,
  SellerEligibilityBlocker,
} from '../types/seller-application.types';

function resolveSafeBlockerHref(blocker: SellerEligibilityBlocker): string {
  const safeId = blocker.referenceId
    ? encodeURIComponent(blocker.referenceId.replace(/[^a-zA-Z0-9_-]/g, ''))
    : '';

  switch (blocker.referenceType) {
    case 'ORDER':
      return safeId ? `/account/orders/${safeId}` : '/account/orders';
    case 'AUCTION':
      return safeId ? `/auctions/${safeId}` : '/auctions';
    case 'SUPPORT':
      return safeId ? `/account/orders/${safeId}` : '/support';
    default:
      return '/account';
  }
}

interface SellerActivationPanelProps {
  application: SellerApplicationBuyerDto;
  onApplicationUpdated: () => Promise<unknown>;
}

export function SellerActivationPanel({
  application,
  onApplicationUpdated,
}: SellerActivationPanelProps) {
  const router = useRouter();
  const { retry: reloadSession } = useSession();

  const [eligibility, setEligibility] = useState<SellerActivationEligibilityResponse | null>(null);
  const [checking, setChecking] = useState<boolean>(true);
  const [checkError, setCheckError] = useState<string>('');
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const [confirmedUnderstand, setConfirmedUnderstand] = useState<boolean>(false);
  const [activating, setActivating] = useState<boolean>(false);
  const [activationError, setActivationError] = useState<string>('');

  // Giữ nguyên idempotency key cho cùng một phiên xác nhận để chống gửi trùng khi timeout
  const idempotencyKeyRef = useRef<string>(
    `act_${application.id}_v${application.version}_${Date.now().toString(36)}`,
  );

  const runEligibilityCheck = useCallback(async () => {
    setChecking(true);
    setCheckError('');
    setActivationError('');
    try {
      const res = await sellerApplicationsApi.checkActivationEligibility(application.id);
      setEligibility(res);
    } catch (err) {
      const apiErr = normalizeApiError(err);
      setCheckError(apiErr.message);
    } finally {
      setChecking(false);
    }
  }, [application.id]);

  useEffect(() => {
    void runEligibilityCheck();
  }, [runEligibilityCheck]);

  const handleConfirmActivate = async () => {
    if (!confirmedUnderstand || activating) return;
    setActivating(true);
    setActivationError('');

    try {
      const result = await sellerApplicationsApi.activateSeller(application.id, {
        expectedVersion: application.version,
        idempotencyKey: idempotencyKeyRef.current,
      });

      // Chỉ cập nhật session sau khi BE đã trả về user role = SELLER và token mới
      if (result.user?.role === 'SELLER' && result.accessToken) {
        const remember =
          typeof window !== 'undefined' && Boolean(localStorage.getItem('nexus.accessToken'));
        saveSession(
          result.accessToken,
          {
            id: result.user.id,
            email: result.user.email,
            fullName: result.user.fullName,
            role: result.user.role,
            status: result.user.status,
            reputationScore: result.user.reputationScore,
            permissions: result.user.permissions,
          },
          remember,
        );
      }

      setConfirmOpen(false);
      reloadSession();
      await onApplicationUpdated();
      router.push('/seller');
    } catch (err) {
      const apiErr = normalizeApiError(err);

      // Nếu timeout, đọc lại hồ sơ/profile trước khi cho thử lại
      if (apiErr.code === 'ETIMEDOUT' || apiErr.code === 'ECONNABORTED') {
        await reloadSession();
        const refreshed = await onApplicationUpdated();
        const refreshedRole = (refreshed as { accountRole?: string } | null)?.accountRole;
        if (refreshedRole === 'SELLER') {
          setConfirmOpen(false);
          router.push('/seller');
          return;
        }
      }

      if (apiErr.code === 'VERSION_CONFLICT' || apiErr.code === 'INVALID_STATUS_TRANSITION') {
        await onApplicationUpdated();
      } else {
        await runEligibilityCheck();
      }

      setActivationError(apiErr.message);
    } finally {
      setActivating(false);
    }
  };

  const canOpenActivateModal =
    !checking &&
    Boolean(eligibility?.serviceAvailable) &&
    Boolean(eligibility?.eligible) &&
    (eligibility?.blockers.length ?? 0) === 0;

  return (
    <div className="space-y-5 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/70 via-white to-white p-6 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">Bước 2/2 · Hồ sơ đã được duyệt (APPROVED)</Badge>
            <span className="text-xs text-muted">
              Vai trò hiện tại: <strong className="text-ink">BUYER</strong>
            </span>
          </div>
          <h3 className="text-lg font-bold text-ink">
            Kiểm tra điều kiện &amp; Kích hoạt kênh Người bán (Seller)
          </h3>
          <p className="text-sm text-muted">
            Quản trị viên đã chấp thuận hồ sơ gian hàng{' '}
            <strong className="text-ink">{application.snapshot.shopName}</strong>. Trước khi chuyển
            đổi sang vai trò Seller, hệ thống kiểm tra các nghĩa vụ đơn hàng và đấu giá Buyer đang
            mở của bạn.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void runEligibilityCheck()}
          disabled={checking || activating}
        >
          <RefreshCw className={`size-4 ${checking ? 'animate-spin' : ''}`} aria-hidden="true" />
          <span>{checking ? 'Đang kiểm tra...' : 'Kiểm tra lại điều kiện'}</span>
        </Button>
      </div>

      {/* Warning box on role change implications */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs leading-relaxed text-amber-950">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden="true" />
          <div>
            <p className="font-semibold text-amber-900">
              Quyền hạn thay đổi ngay khi bạn xác nhận kích hoạt Seller:
            </p>
            <p className="mt-1">
              Sau khi kích hoạt, tài khoản chuyển sang vai trò <strong>SELLER</strong>: bạn được tạo
              sản phẩm, mở phiên đấu giá và quản lý đơn bán, nhưng{' '}
              <strong>ngưng quyền giỏ hàng, thanh toán mua hàng và trả giá đấu giá</strong>. Lịch sử
              các đơn bạn đã mua trước đây vẫn được giữ nguyên để tra cứu.
            </p>
          </div>
        </div>
      </div>

      {/* Eligibility Status Body */}
      {checking ? (
        <div className="space-y-3 rounded-xl border border-line bg-white p-5">
          <div className="h-4 w-56 animate-pulse rounded bg-canvas" />
          <div className="h-3 w-full animate-pulse rounded bg-canvas" />
          <div className="h-3 w-3/4 animate-pulse rounded bg-canvas" />
        </div>
      ) : checkError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
        >
          <p className="font-semibold">Không thể kiểm tra điều kiện kích hoạt</p>
          <p className="mt-1 text-xs">{checkError}</p>
        </div>
      ) : eligibility && !eligibility.serviceAvailable ? (
        <div
          role="alert"
          className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-semibold">Chưa kiểm tra được nghĩa vụ giao dịch lúc này</p>
              <p className="text-xs leading-relaxed">
                Hệ thống kiểm tra đơn hàng hoặc đấu giá đang tạm thời bận. Để đảm bảo an toàn, hệ
                thống không mặc định đủ điều kiện khi dịch vụ chưa phản hồi. Vui lòng bấm
                &ldquo;Kiểm tra lại điều kiện&rdquo; sau ít phút.
              </p>
            </div>
          </div>
        </div>
      ) : eligibility && eligibility.blockers.length > 0 ? (
        <div className="space-y-3 rounded-xl border border-red-200 bg-red-50/70 p-5">
          <div className="flex items-start gap-2.5 text-red-900">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600" aria-hidden="true" />
            <div>
              <p className="text-sm font-bold">
                Chưa đủ điều kiện kích hoạt ({eligibility.blockers.length} vướng mắc cần hoàn tất)
              </p>
              <p className="mt-0.5 text-xs text-red-800">
                Vui lòng hoàn tất các đơn hàng hoặc phiên đấu giá đang mở dưới đây rồi bấm
                &ldquo;Kiểm tra lại điều kiện&rdquo;:
              </p>
            </div>
          </div>

          <ul className="space-y-2.5 pt-1">
            {eligibility.blockers.map((blocker, idx) => {
              const safeHref = resolveSafeBlockerHref(blocker);
              return (
                <li
                  key={`${blocker.code}-${blocker.referenceId ?? idx}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200/80 bg-white p-3.5 text-sm shadow-2xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">{blocker.code}</Badge>
                      {blocker.referenceId ? (
                        <span className="font-mono text-xs text-muted">
                          Mã: {blocker.referenceId}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs leading-relaxed text-ink">{blocker.message}</p>
                  </div>

                  {blocker.referenceType !== 'ACCOUNT' ? (
                    <Button asChild variant="outline" size="sm">
                      <Link href={safeHref}>
                        <span>{blocker.referenceLabel || 'Xem chi tiết'}</span>
                        <ExternalLink className="size-3.5" aria-hidden="true" />
                      </Link>
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : canOpenActivateModal ? (
        <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden="true" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-emerald-950">
                Tài khoản đủ điều kiện kích hoạt Seller!
              </p>
              <p className="text-xs leading-relaxed text-emerald-900">
                Không có đơn hàng mua đang mở, khoản hoàn tiền chưa đối soát hay phiên đấu giá đang
                tham gia. Bạn có thể kích hoạt kênh Người bán ngay bây giờ.
              </p>
            </div>
          </div>

          {activationError ? (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800"
            >
              {activationError}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <span className="text-xs text-emerald-800">
              Kiểm tra lúc:{' '}
              {eligibility?.checkedAt
                ? new Date(eligibility.checkedAt).toLocaleString('vi-VN')
                : 'Vừa xong'}
            </span>
            <Button
              type="button"
              onClick={() => {
                setConfirmedUnderstand(false);
                setActivationError('');
                setConfirmOpen(true);
              }}
            >
              <Sparkles className="size-4" aria-hidden="true" />
              <span>Kích hoạt tài khoản Seller ngay</span>
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : null}

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận kích hoạt tài khoản Seller</DialogTitle>
            <DialogDescription>
              Bạn sắp chuyển đổi tài khoản từ <strong>BUYER</strong> sang <strong>SELLER</strong>{' '}
              cho gian hàng <strong>{application.snapshot.shopName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4 text-sm">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-950">
              <p className="font-semibold">Trước khi xác nhận, vui lòng lưu ý:</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4">
                <li>
                  Tài khoản sẽ chuyển sang vai trò <strong>SELLER</strong> ngay khi hệ thống xác
                  nhận thành công.
                </li>
                <li>
                  Bạn sẽ{' '}
                  <strong>
                    không thể tiếp tục thêm giỏ hàng, tạo đơn mua hoặc đặt giá đấu giá
                  </strong>
                  .
                </li>
                <li>
                  Bạn vẫn xem được sản phẩm trên sàn và lịch sử các đơn hàng đã mua trước đây của
                  mình.
                </li>
                <li>Không hỗ trợ tự chuyển ngược từ Seller về Buyer trong phạm vi MVP.</li>
              </ul>
            </div>

            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-line bg-canvas/60 p-3.5 text-xs">
              <input
                type="checkbox"
                checked={confirmedUnderstand}
                onChange={(e) => setConfirmedUnderstand(e.target.checked)}
                disabled={activating}
                className="mt-0.5 size-4 rounded border-line accent-brand-dark"
              />
              <span className="leading-relaxed text-ink">
                Tôi xác nhận đã hiểu rõ sự thay đổi quyền hạn và đồng ý kích hoạt vai trò{' '}
                <strong>SELLER</strong> cho tài khoản này.
              </span>
            </label>

            {activationError ? (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800"
              >
                {activationError}
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={activating}
            >
              Để sau
            </Button>
            <Button
              type="button"
              onClick={() => void handleConfirmActivate()}
              disabled={!confirmedUnderstand || activating}
            >
              {activating ? 'Đang kích hoạt Seller...' : 'Xác nhận kích hoạt Seller'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
