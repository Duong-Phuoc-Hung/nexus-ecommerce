'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileEdit,
  History,
  MapPin,
  RotateCcw,
  ShieldCheck,
  Store,
  Undo2,
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
import { Textarea } from '../../../components/ui/textarea';
import { normalizeApiError } from '../../../lib/axios/http';
import { useSession } from '../../auth/hooks/use-session';
import { sellerApplicationsApi } from '../api/seller-applications.api';
import { useSellerApplication } from '../hooks/use-seller-application';
import {
  SELLER_APPLICATION_STATUS_META,
  type SellerApplicationBuyerDto,
  type SellerApplicationFormInput,
} from '../types/seller-application.types';
import { SellerActivationPanel } from './seller-activation-panel';
import { SellerApplicationForm } from './seller-application-form';

const ACTION_LABELS: Record<string, string> = {
  SUBMITTED: 'Nộp hồ sơ lần đầu',
  RESUBMITTED: 'Gửi lại hồ sơ đã chỉnh sửa',
  WITHDRAWN: 'Người đăng ký rút hồ sơ',
  APPROVED: 'Quản trị viên phê duyệt hồ sơ',
  REJECTED: 'Quản trị viên yêu cầu điều chỉnh / từ chối',
  APPROVAL_REVOKED: 'Quản trị viên thu hồi phê duyệt trước kích hoạt',
  ACTIVATED: 'Kích hoạt tài khoản Seller thành công',
};

export function SellerRegistrationPage() {
  const { phase, user } = useSession();
  const isAuthenticated = phase === 'ready' && Boolean(user);

  const { data: meData, loading, error, reload } = useSellerApplication(isAuthenticated);

  const [isEditingResubmit, setIsEditingResubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitFieldErrors, setSubmitFieldErrors] = useState<Record<string, string>>({});
  const [bannerNotice, setBannerNotice] = useState('');

  // Withdraw confirmation modal state
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');

  const application = meData?.application ?? null;
  const effectiveRole = (meData?.accountRole || user?.role || '').toUpperCase();

  useEffect(() => {
    if (application?.status === 'PENDING' || application?.status === 'APPROVED') {
      setIsEditingResubmit(false);
    }
  }, [application?.status]);

  // 1. Loading Session State
  if (phase === 'loading' || (isAuthenticated && loading && !meData)) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-8">
        <div className="h-8 w-64 animate-pulse rounded-xl bg-canvas" />
        <div className="h-44 animate-pulse rounded-2xl border border-line bg-white p-6" />
        <div className="h-64 animate-pulse rounded-2xl border border-line bg-white p-6" />
      </div>
    );
  }

  // 2. Guest State -> Safe login redirect link
  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="space-y-4 rounded-2xl border border-line bg-white p-8 text-center shadow-xs">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-dark">
            <Store className="size-6" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold text-ink">Đăng nhập để đăng ký bán hàng trên Nexus</h1>
          <p className="text-sm text-muted">
            Bạn cần đăng nhập bằng tài khoản Người mua (Buyer) để nộp hồ sơ đăng ký mở gian hàng
            hoặc theo dõi tiến độ xét duyệt.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button asChild>
              <Link href="/login?next=%2Faccount%2Fseller-registration">Đăng nhập ngay</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/register">Tạo tài khoản Buyer mới</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Admin / Support Staff -> Do not show self-registration form
  if (effectiveRole === 'ADMIN' || effectiveRole === 'SUPPORT_STAFF') {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div className="rounded-2xl border border-line bg-white p-6 shadow-xs">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-6 shrink-0 text-brand-dark" aria-hidden="true" />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-ink">
                  Tài khoản vận hành hệ thống ({effectiveRole})
                </h1>
                <Badge variant="secondary">{effectiveRole}</Badge>
              </div>
              <p className="text-sm text-muted">
                Theo quy định phân quyền MVP, tài khoản Quản trị viên (ADMIN) và Nhân viên hỗ trợ
                (SUPPORT_STAFF) không thực hiện tự đăng ký chuyển đổi sang Seller.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                {effectiveRole === 'ADMIN' ? (
                  <Button asChild>
                    <Link href="/admin/seller-applications">
                      Mở hàng chờ xét duyệt hồ sơ Seller
                    </Link>
                  </Button>
                ) : (
                  <Button asChild>
                    <Link href="/support">Về cổng Hỗ trợ vận hành</Link>
                  </Button>
                )}
                <Button asChild variant="outline">
                  <Link href="/account">Quay lại Tài khoản</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handlers for Create / Resubmit / Withdraw
  const handleFormSubmit = async (payload: SellerApplicationFormInput) => {
    setSubmitting(true);
    setSubmitError('');
    setSubmitFieldErrors({});
    setBannerNotice('');

    try {
      const idemKey = `sub_${user.id}_v${payload.expectedVersion ?? 0}_${Date.now().toString(36)}`;
      if (
        application &&
        (application.status === 'REJECTED' || application.status === 'WITHDRAWN')
      ) {
        await sellerApplicationsApi.resubmitApplication(application.id, payload, idemKey);
        setBannerNotice(
          'Đã gửi lại hồ sơ đăng ký bán hàng thành công! Hồ sơ của bạn đang chờ Quản trị viên xét duyệt.',
        );
      } else {
        await sellerApplicationsApi.submitApplication(payload, idemKey);
        setBannerNotice(
          'Đã gửi hồ sơ đăng ký bán hàng thành công! Hồ sơ của bạn đang chờ Quản trị viên xét duyệt.',
        );
      }
      setIsEditingResubmit(false);
      await reload();
    } catch (err) {
      const apiErr = normalizeApiError(err);
      setSubmitError(apiErr.message);
      setSubmitFieldErrors(apiErr.fieldErrors || {});
      if (
        apiErr.code === 'DUPLICATE_ACTIVE_APPLICATION' ||
        apiErr.code === 'VERSION_CONFLICT' ||
        apiErr.code === 'INVALID_STATUS_TRANSITION'
      ) {
        await reload();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmWithdraw = async () => {
    if (!application || withdrawing) return;
    setWithdrawing(true);
    setWithdrawError('');
    try {
      await sellerApplicationsApi.withdrawApplication(application.id, {
        expectedVersion: application.version,
        reason: withdrawReason.trim() || undefined,
      });
      setWithdrawOpen(false);
      setWithdrawReason('');
      setBannerNotice(
        'Đã rút hồ sơ đăng ký bán hàng. Bạn có thể chỉnh sửa thông tin và gửi lại bất kỳ lúc nào.',
      );
      await reload();
    } catch (err) {
      const apiErr = normalizeApiError(err);
      setWithdrawError(apiErr.message);
      if (apiErr.code === 'VERSION_CONFLICT' || apiErr.code === 'INVALID_STATUS_TRANSITION') {
        await reload();
      }
    } finally {
      setWithdrawing(false);
    }
  };

  const statusMeta = application ? SELLER_APPLICATION_STATUS_META[application.status] : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      {/* Top breadcrumb & header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Link
            href="/account"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-dark hover:underline"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            <span>Quay lại Tài khoản của tôi</span>
          </Link>
          <h1 className="text-2xl font-bold text-ink">
            Đăng ký bán hàng &amp; Kích hoạt kênh Seller
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Vai trò hiện tại:</span>
          <Badge variant={effectiveRole === 'SELLER' ? 'success' : 'secondary'}>
            {effectiveRole}
          </Badge>
        </div>
      </div>

      {/* Global load error if any */}
      {error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="size-5 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void reload()}>
            Thử tải lại
          </Button>
        </div>
      ) : null}

      {/* Success / Info Banner */}
      {bannerNotice ? (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"
        >
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden="true" />
          <div className="space-y-0.5">
            <p className="font-semibold">Cập nhật hồ sơ thành công</p>
            <p className="text-xs leading-relaxed text-emerald-900">{bannerNotice}</p>
          </div>
        </div>
      ) : null}

      {/* CASE A: Account is already SELLER or application is ACTIVATED */}
      {effectiveRole === 'SELLER' || application?.status === 'ACTIVATED' ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-white to-white p-6 shadow-xs">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="size-6" aria-hidden="true" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="success">Đã kích hoạt Seller (ACTIVATED)</Badge>
                    {application ? (
                      <span className="font-mono text-xs text-muted">
                        Mã hồ sơ: {application.id} · v{application.version}
                      </span>
                    ) : null}
                  </div>
                  <h2 className="text-xl font-bold text-ink">
                    Gian hàng {application?.snapshot.shopName || user.fullName} đã hoạt động!
                  </h2>
                  <p className="text-sm text-muted">
                    Tài khoản của bạn đã chuyển sang vai trò{' '}
                    <strong className="text-ink">SELLER</strong>. Bạn có thể quản lý sản phẩm, tạo
                    phiên đấu giá và xử lý đơn bán tại Kênh người bán.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <Button asChild>
                  <Link href="/seller">
                    <span>Đi tới Kênh người bán</span>
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/account/orders">Xem đơn mua trước đây</Link>
                </Button>
              </div>
            </div>
          </div>

          {application ? <ApplicationSnapshotSummaryCard application={application} /> : null}
        </div>
      ) : !application ? (
        /* CASE B: Buyer has no application yet -> Show Registration Form */
        <SellerApplicationForm
          mode="create"
          accountEmail={meData?.accountEmail || user.email}
          accountFullName={meData?.accountFullName || user.fullName}
          accountPhone={meData?.accountPhone || ''}
          emailVerified={meData?.emailVerified ?? true}
          isSubmitting={submitting}
          serverErrorMessage={submitError}
          serverFieldErrors={submitFieldErrors}
          onSubmit={handleFormSubmit}
        />
      ) : (
        /* CASE C: Buyer has an application in PENDING / REJECTED / WITHDRAWN / APPROVED */
        <div className="space-y-6">
          {/* Status Overview Header Card */}
          <div className="rounded-2xl border border-line bg-white p-6 shadow-xs">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  {statusMeta ? (
                    <Badge variant={statusMeta.badgeVariant}>{statusMeta.label}</Badge>
                  ) : null}
                  <span className="font-mono text-xs text-muted">
                    Mã hồ sơ: <strong className="text-ink">{application.id}</strong>
                  </span>
                  <span className="text-xs text-muted">
                    · Phiên bản: <strong className="text-ink">v{application.version}</strong>
                  </span>
                  <span className="text-xs text-muted">
                    · Ngày gửi: {new Date(application.submittedAt).toLocaleString('vi-VN')}
                  </span>
                </div>

                <h2 className="text-xl font-bold text-ink">
                  Gian hàng: {application.snapshot.shopName}
                </h2>
                <p className="text-sm leading-relaxed text-muted">{statusMeta?.buyerSummary}</p>
              </div>

              {/* Contextual Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                {application.allowedActions.includes('WITHDRAW') ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setWithdrawError('');
                      setWithdrawOpen(true);
                    }}
                  >
                    <Undo2 className="size-4" aria-hidden="true" />
                    <span>Rút hồ sơ</span>
                  </Button>
                ) : null}

                {application.allowedActions.includes('RESUBMIT') && !isEditingResubmit ? (
                  <Button
                    type="button"
                    onClick={() => {
                      setSubmitError('');
                      setSubmitFieldErrors({});
                      setIsEditingResubmit(true);
                    }}
                  >
                    <FileEdit className="size-4" aria-hidden="true" />
                    <span>Chỉnh sửa &amp; Gửi lại hồ sơ</span>
                  </Button>
                ) : null}
              </div>
            </div>

            {/* Public Rejection / Revocation Reason Box */}
            {application.status === 'REJECTED' && application.rejectionReason ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50/90 p-4 text-sm text-red-900">
                <p className="font-semibold">Phản hồi từ Quản trị viên (lý do cần điều chỉnh):</p>
                <p className="mt-1 leading-relaxed">{application.rejectionReason}</p>
              </div>
            ) : null}

            {/* PENDING info note */}
            {application.status === 'PENDING' ? (
              <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-950">
                <Clock className="size-4 shrink-0 text-amber-700" aria-hidden="true" />
                <span>
                  Hồ sơ đang ở trạng thái <strong>Chờ xét duyệt</strong> nên được khóa chỉnh sửa
                  trực tiếp để đảm bảo tính nhất quán. Nếu bạn muốn thay đổi thông tin, vui lòng bấm{' '}
                  <strong>&ldquo;Rút hồ sơ&rdquo;</strong> rồi cập nhật và gửi lại.
                </span>
              </div>
            ) : null}
          </div>

          {/* Step 2 Activation Panel when APPROVED */}
          {application.status === 'APPROVED' ? (
            <SellerActivationPanel application={application} onApplicationUpdated={reload} />
          ) : null}

          {/* Resubmit Form when REJECTED or WITHDRAWN and user clicked Edit */}
          {isEditingResubmit &&
          (application.status === 'REJECTED' || application.status === 'WITHDRAWN') ? (
            <SellerApplicationForm
              mode="resubmit"
              accountEmail={meData?.accountEmail || user.email}
              accountFullName={meData?.accountFullName || user.fullName}
              accountPhone={meData?.accountPhone || ''}
              emailVerified={meData?.emailVerified ?? true}
              initialSnapshot={application.snapshot}
              expectedVersion={application.version}
              rejectionReason={application.rejectionReason}
              isSubmitting={submitting}
              serverErrorMessage={submitError}
              serverFieldErrors={submitFieldErrors}
              onSubmit={handleFormSubmit}
              onCancelEdit={() => setIsEditingResubmit(false)}
            />
          ) : (
            <ApplicationSnapshotSummaryCard application={application} />
          )}
        </div>
      )}

      {/* Withdraw Confirmation Dialog */}
      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận rút hồ sơ đăng ký bán hàng</DialogTitle>
            <DialogDescription>
              Hồ sơ <strong>{application?.id}</strong> sẽ chuyển sang trạng thái{' '}
              <strong>Đã rút hồ sơ (WITHDRAWN)</strong>. Bạn có thể chỉnh sửa thông tin và gửi lại
              phiên bản mới bất kỳ lúc nào.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-3">
            <label htmlFor="withdraw-reason-input" className="block text-sm font-medium text-ink">
              Ghi chú lý do rút hồ sơ (không bắt buộc)
            </label>
            <Textarea
              id="withdraw-reason-input"
              value={withdrawReason}
              onChange={(e) => setWithdrawReason(e.target.value)}
              maxLength={300}
              placeholder="Ví dụ: Cần cập nhật lại địa chỉ kho lấy hàng hoặc số điện thoại liên hệ..."
              disabled={withdrawing}
            />
            {withdrawError ? (
              <p role="alert" className="text-xs font-medium text-red-600">
                {withdrawError}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setWithdrawOpen(false)}
              disabled={withdrawing}
            >
              Giữ nguyên hồ sơ
            </Button>
            <Button
              type="button"
              onClick={() => void handleConfirmWithdraw()}
              disabled={withdrawing}
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              <span>{withdrawing ? 'Đang rút hồ sơ...' : 'Xác nhận rút hồ sơ'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ApplicationSnapshotSummaryCard({
  application,
}: {
  application: SellerApplicationBuyerDto;
}) {
  const snap = application.snapshot;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left 2 columns: Submitted Shop Snapshot */}
      <div className="space-y-4 rounded-2xl border border-line bg-white p-6 shadow-xs lg:col-span-2">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <h3 className="text-base font-bold text-ink">
            Thông tin hồ sơ đã gửi (Phiên bản v{application.version})
          </h3>
          <span className="text-xs text-muted">
            Cập nhật: {new Date(application.submittedAt).toLocaleDateString('vi-VN')}
          </span>
        </div>

        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted">Tên cửa hàng</dt>
            <dd className="mt-0.5 font-semibold text-ink">{snap.shopName}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Người liên hệ</dt>
            <dd className="mt-0.5 font-semibold text-ink">
              {snap.contactName} · {snap.contactPhone}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="flex items-center gap-1 text-xs text-muted">
              <MapPin className="size-3.5" aria-hidden="true" />
              <span>Địa chỉ lấy hàng</span>
            </dt>
            <dd className="mt-0.5 font-medium text-ink">
              {snap.pickupAddress.street}, {snap.pickupAddress.wardName},{' '}
              {snap.pickupAddress.provinceName}
              {snap.pickupAddress.note ? ` (${snap.pickupAddress.note})` : ''}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-muted">Nhóm ngành hàng đăng ký</dt>
            <dd className="mt-1.5 flex flex-wrap gap-1.5">
              {(snap.categoryNames?.length ? snap.categoryNames : snap.categoryIds).map((cat) => (
                <Badge key={cat} variant="secondary">
                  {cat}
                </Badge>
              ))}
            </dd>
          </div>
          {snap.shopDescription ? (
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted">Giới thiệu cửa hàng</dt>
              <dd className="mt-1 whitespace-pre-line rounded-xl bg-canvas p-3 text-xs leading-relaxed text-ink">
                {snap.shopDescription}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      {/* Right column: Public Decision & Version Timeline */}
      <div className="space-y-4 rounded-2xl border border-line bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2 border-b border-line pb-3">
          <History className="size-4 text-brand-dark" aria-hidden="true" />
          <h3 className="text-base font-bold text-ink">Lịch sử xử lý hồ sơ</h3>
        </div>

        <ol className="space-y-3.5">
          {[...application.history].reverse().map((item) => (
            <li
              key={item.id}
              className="relative rounded-xl border border-line bg-canvas/40 p-3 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="font-bold text-ink">
                  {ACTION_LABELS[item.action] || item.action}
                </span>
                <Badge variant="outline">v{item.version}</Badge>
              </div>
              <p className="mt-0.5 text-[11px] text-muted">
                {new Date(item.occurredAt).toLocaleString('vi-VN')} · Thực hiện bởi{' '}
                {item.actorRole === 'ADMIN' ? 'Quản trị viên' : 'Bạn'}
              </p>
              {item.publicReason ? (
                <p className="mt-1.5 leading-relaxed text-ink">{item.publicReason}</p>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
