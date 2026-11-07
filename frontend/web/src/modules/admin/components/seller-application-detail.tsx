'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  History,
  Layers,
  Lock,
  MapPin,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Store,
  User,
  XCircle,
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
import { sellerApplicationsApi } from '../../user/api/seller-applications.api';
import {
  SELLER_APPLICATION_STATUS_META,
  type SellerApplicationAdminDto,
} from '../../user/types/seller-application.types';

const DECISION_ACTION_LABELS: Record<string, string> = {
  SUBMITTED: 'Buyer nộp hồ sơ lần đầu',
  RESUBMITTED: 'Buyer chỉnh sửa & gửi lại hồ sơ',
  WITHDRAWN: 'Buyer chủ động rút hồ sơ',
  APPROVED: 'Admin phê duyệt hồ sơ (Chờ Buyer kích hoạt)',
  REJECTED: 'Admin từ chối / yêu cầu điều chỉnh',
  APPROVAL_REVOKED: 'Admin thu hồi phê duyệt trước kích hoạt',
  ACTIVATED: 'Buyer xác nhận kích hoạt thành Seller',
};

interface AdminSellerApplicationDetailProps {
  applicationId: string;
}

export function AdminSellerApplicationDetail({ applicationId }: AdminSellerApplicationDetailProps) {
  const [application, setApplication] = useState<SellerApplicationAdminDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [actionBanner, setActionBanner] = useState<string>('');
  const [conflictAlert, setConflictAlert] = useState<string>('');

  // Approve dialog state
  const [approveOpen, setApproveOpen] = useState<boolean>(false);
  const [approveInternalNote, setApproveInternalNote] = useState<string>('');
  const [approving, setApproving] = useState<boolean>(false);
  const [approveError, setApproveError] = useState<string>('');

  // Reject dialog state
  const [rejectOpen, setRejectOpen] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [rejectInternalNote, setRejectInternalNote] = useState<string>('');
  const [rejecting, setRejecting] = useState<boolean>(false);
  const [rejectError, setRejectError] = useState<string>('');

  // Revoke Approval dialog state
  const [revokeOpen, setRevokeOpen] = useState<boolean>(false);
  const [revokeReason, setRevokeReason] = useState<string>('');
  const [revokeInternalNote, setRevokeInternalNote] = useState<string>('');
  const [revoking, setRevoking] = useState<boolean>(false);
  const [revokeError, setRevokeError] = useState<string>('');

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const dto = await sellerApplicationsApi.getAdminApplicationDetail(applicationId);
      setApplication(dto);
    } catch (err) {
      const apiErr = normalizeApiError(err);
      setError(apiErr.message);
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const handleApprove = async () => {
    if (!application || approving) return;
    setApproving(true);
    setApproveError('');
    setConflictAlert('');
    setActionBanner('');

    try {
      const updated = await sellerApplicationsApi.approveApplication(application.id, {
        expectedVersion: application.version,
        internalNote: approveInternalNote.trim() || undefined,
      });
      setApplication(updated);
      setApproveOpen(false);
      setApproveInternalNote('');
      setActionBanner(
        'Đã duyệt hồ sơ (APPROVED). Lưu ý: Tài khoản người dùng vẫn giữ vai trò BUYER và sẽ chuyển sang SELLER sau khi người dùng kiểm tra điều kiện nghĩa vụ và xác nhận kích hoạt.',
      );
    } catch (err) {
      const apiErr = normalizeApiError(err);
      if (apiErr.code === 'VERSION_CONFLICT' || apiErr.code === 'INVALID_STATUS_TRANSITION') {
        setApproveOpen(false);
        setConflictAlert(apiErr.message);
        await loadDetail();
      } else {
        setApproveError(apiErr.message);
      }
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!application || rejecting) return;
    const cleanReason = rejectReason.trim();
    if (cleanReason.length < 5) {
      setRejectError(
        'Vui lòng nhập lý do từ chối cụ thể gửi cho người đăng ký (tối thiểu 5 ký tự).',
      );
      return;
    }

    setRejecting(true);
    setRejectError('');
    setConflictAlert('');
    setActionBanner('');

    try {
      const updated = await sellerApplicationsApi.rejectApplication(application.id, {
        reason: cleanReason,
        internalNote: rejectInternalNote.trim() || undefined,
        expectedVersion: application.version,
      });
      setApplication(updated);
      setRejectOpen(false);
      setRejectReason('');
      setRejectInternalNote('');
      setActionBanner(
        'Đã từ chối hồ sơ đăng ký bán hàng (REJECTED). Người đăng ký có thể xem lý do phản hồi, chỉnh sửa và gửi lại phiên bản mới.',
      );
    } catch (err) {
      const apiErr = normalizeApiError(err);
      if (apiErr.code === 'VERSION_CONFLICT' || apiErr.code === 'INVALID_STATUS_TRANSITION') {
        setRejectOpen(false);
        setConflictAlert(apiErr.message);
        await loadDetail();
      } else {
        setRejectError(apiErr.message);
      }
    } finally {
      setRejecting(false);
    }
  };

  const handleRevokeApproval = async () => {
    if (!application || revoking) return;
    const cleanReason = revokeReason.trim();
    if (cleanReason.length < 5) {
      setRevokeError(
        'Vui lòng nhập lý do thu hồi phê duyệt gửi cho người đăng ký (tối thiểu 5 ký tự).',
      );
      return;
    }

    setRevoking(true);
    setRevokeError('');
    setConflictAlert('');
    setActionBanner('');

    try {
      const updated = await sellerApplicationsApi.revokeApproval(application.id, {
        reason: cleanReason,
        internalNote: revokeInternalNote.trim() || undefined,
        expectedVersion: application.version,
      });
      setApplication(updated);
      setRevokeOpen(false);
      setRevokeReason('');
      setRevokeInternalNote('');
      setActionBanner(
        'Đã thu hồi phê duyệt trước khi kích hoạt. Hồ sơ đã chuyển về trạng thái Cần điều chỉnh (REJECTED).',
      );
    } catch (err) {
      const apiErr = normalizeApiError(err);
      if (apiErr.code === 'VERSION_CONFLICT' || apiErr.code === 'INVALID_STATUS_TRANSITION') {
        setRevokeOpen(false);
        setConflictAlert(apiErr.message);
        await loadDetail();
      } else {
        setRevokeError(apiErr.message);
      }
    } finally {
      setRevoking(false);
    }
  };

  if (loading && !application) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded-xl bg-canvas" />
        <div className="h-44 animate-pulse rounded-2xl border border-line bg-white p-6" />
        <div className="h-64 animate-pulse rounded-2xl border border-line bg-white p-6" />
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/seller-applications"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-dark hover:underline"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          <span>Quay lại danh sách hồ sơ đăng ký bán hàng</span>
        </Link>
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-900"
        >
          <p className="font-bold">{error || 'Không tìm thấy hồ sơ đăng ký bán hàng.'}</p>
          <div className="mt-4 flex gap-3">
            <Button type="button" variant="outline" size="sm" onClick={() => void loadDetail()}>
              Thử lại
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/seller-applications">Về danh sách</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const statusMeta = SELLER_APPLICATION_STATUS_META[application.status];
  const snap = application.snapshot;

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Link
            href="/admin/seller-applications"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-dark hover:underline"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            <span>Quay lại danh sách hồ sơ đăng ký bán hàng</span>
          </Link>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold text-ink">Chi tiết hồ sơ {application.id}</h1>
            <Badge variant={statusMeta?.badgeVariant ?? 'outline'}>
              {statusMeta?.label ?? application.status}
            </Badge>
            <Badge variant="outline">Phiên bản v{application.version}</Badge>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void loadDetail()}
          disabled={loading}
        >
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          <span>Tải lại dữ liệu mới nhất</span>
        </Button>
      </div>

      {/* Conflict Alert */}
      {conflictAlert ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
        >
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-700" />
          <div>
            <p className="font-bold">Dữ liệu hồ sơ vừa thay đổi (Xung đột phiên bản)</p>
            <p className="mt-0.5 text-xs leading-relaxed">{conflictAlert}</p>
          </div>
        </div>
      ) : null}

      {/* Action Success Banner */}
      {actionBanner ? (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"
        >
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
          <div>
            <p className="font-bold">Đã cập nhật quyết định xét duyệt</p>
            <p className="mt-0.5 text-xs leading-relaxed">{actionBanner}</p>
          </div>
        </div>
      ) : null}

      {/* Admin Decision Action Bar */}
      <div className="rounded-2xl border border-line bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-dark">
              Bảng điều khiển quyết định của Quản trị viên
            </p>
            {application.status === 'PENDING' ? (
              <p className="text-sm text-muted">
                Hồ sơ đang chờ xét duyệt. Kiểm tra kỹ thông tin cửa hàng, địa chỉ lấy hàng và nhóm
                ngành hàng trước khi ra quyết định.
              </p>
            ) : application.status === 'APPROVED' ? (
              <p className="text-sm text-muted">
                Hồ sơ đã được duyệt và đang chờ người dùng ({application.applicantEmail}) kiểm tra
                nghĩa vụ và xác nhận kích hoạt Seller. Bạn có thể thu hồi phê duyệt nếu phát hiện
                sai sót trước khi tài khoản kích hoạt.
              </p>
            ) : application.status === 'ACTIVATED' ? (
              <p className="text-sm text-muted">
                Tài khoản đã hoàn tất kích hoạt thành <strong>SELLER</strong> lúc{' '}
                {application.activatedAt
                  ? new Date(application.activatedAt).toLocaleString('vi-VN')
                  : 'N/A'}
                . Để đình chỉ hoặc khóa tài khoản Seller vi phạm, vui lòng sử dụng{' '}
                <Link href="/admin/users" className="font-semibold text-brand-dark underline">
                  Quản lý tài khoản
                </Link>
                .
              </p>
            ) : (
              <p className="text-sm text-muted">
                Hồ sơ hiện ở trạng thái <strong>{statusMeta?.label}</strong>. Người đăng ký có thể
                chỉnh sửa và gửi lại phiên bản mới.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {application.allowedActions.includes('APPROVE') ? (
              <Button
                type="button"
                onClick={() => {
                  setApproveError('');
                  setApproveOpen(true);
                }}
              >
                <CheckCircle2 className="size-4" aria-hidden="true" />
                <span>Duyệt hồ sơ</span>
              </Button>
            ) : null}

            {application.allowedActions.includes('REJECT') ? (
              <Button
                type="button"
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
                onClick={() => {
                  setRejectError('');
                  setRejectOpen(true);
                }}
              >
                <XCircle className="size-4" aria-hidden="true" />
                <span>Từ chối hồ sơ</span>
              </Button>
            ) : null}

            {application.allowedActions.includes('REVOKE_APPROVAL') ? (
              <Button
                type="button"
                variant="outline"
                className="border-amber-300 text-amber-800 hover:bg-amber-50"
                onClick={() => {
                  setRevokeError('');
                  setRevokeOpen(true);
                }}
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                <span>Thu hồi phê duyệt</span>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Main Grid: Account Info + Shop Snapshot + Decision History */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Card 1: Submitted Shop Information */}
          <div className="space-y-4 rounded-2xl border border-line bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <Store className="size-5 text-brand-dark" aria-hidden="true" />
                <h2 className="text-base font-bold text-ink">
                  Nội dung hồ sơ đăng ký bán hàng (v{application.version})
                </h2>
              </div>
              <span className="text-xs text-muted">
                Gửi lúc: {new Date(application.submittedAt).toLocaleString('vi-VN')}
              </span>
            </div>

            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted">Tên cửa hàng đăng ký</dt>
                <dd className="mt-0.5 text-base font-bold text-ink">{snap.shopName}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Người liên hệ</dt>
                <dd className="mt-0.5 font-semibold text-ink">{snap.contactName}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Số điện thoại liên hệ</dt>
                <dd className="mt-0.5 font-mono font-semibold text-ink">{snap.contactPhone}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Email liên hệ (tài khoản)</dt>
                <dd className="mt-0.5 flex items-center gap-2 font-medium text-ink">
                  <span>{snap.contactEmail}</span>
                  <Badge variant="success">Đã xác thực</Badge>
                </dd>
              </div>

              <div className="sm:col-span-2">
                <dt className="flex items-center gap-1 text-xs text-muted">
                  <MapPin className="size-3.5" aria-hidden="true" />
                  <span>Địa chỉ lấy hàng của cửa hàng</span>
                </dt>
                <dd className="mt-1 rounded-xl border border-line bg-canvas/50 p-3 text-sm font-medium text-ink">
                  {snap.pickupAddress.street}, {snap.pickupAddress.wardName},{' '}
                  {snap.pickupAddress.provinceName}
                  {snap.pickupAddress.note ? (
                    <span className="mt-1 block text-xs text-muted">
                      Ghi chú lấy hàng: {snap.pickupAddress.note}
                    </span>
                  ) : null}
                </dd>
              </div>

              <div className="sm:col-span-2">
                <dt className="text-xs text-muted">
                  Nhóm ngành hàng dự kiến bán ({snap.categoryIds.length})
                </dt>
                <dd className="mt-1.5 flex flex-wrap gap-1.5">
                  {(snap.categoryNames?.length ? snap.categoryNames : snap.categoryIds).map(
                    (cat) => (
                      <Badge key={cat} variant="secondary">
                        {cat}
                      </Badge>
                    ),
                  )}
                </dd>
              </div>

              <div className="sm:col-span-2">
                <dt className="text-xs text-muted">Giới thiệu cửa hàng</dt>
                <dd className="mt-1 whitespace-pre-line rounded-xl bg-canvas p-3.5 text-xs leading-relaxed text-ink">
                  {snap.shopDescription || 'Không có mô tả giới thiệu.'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Card 2: Submitted Versions History */}
          <div className="space-y-4 rounded-2xl border border-line bg-white p-6 shadow-xs">
            <div className="flex items-center gap-2 border-b border-line pb-3">
              <Layers className="size-4 text-brand-dark" aria-hidden="true" />
              <h2 className="text-base font-bold text-ink">
                Các phiên bản hồ sơ đã gửi ({application.versions.length})
              </h2>
            </div>

            <div className="space-y-3">
              {[...application.versions].reverse().map((ver) => (
                <div
                  key={ver.version}
                  className="rounded-xl border border-line bg-canvas/30 p-3.5 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-ink">
                      Phiên bản nộp v{ver.version} — Gian hàng: {ver.snapshot.shopName}
                    </span>
                    <span className="text-muted">
                      {new Date(ver.submittedAt).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <p className="mt-1 text-muted">
                    Liên hệ: {ver.snapshot.contactName} ({ver.snapshot.contactPhone}) · Địa chỉ:{' '}
                    {ver.snapshot.pickupAddress.street}, {ver.snapshot.pickupAddress.wardName},{' '}
                    {ver.snapshot.pickupAddress.provinceName}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Account Info + Audit Decision Log */}
        <div className="space-y-6">
          {/* Card 3: Applicant Account Info */}
          <div className="space-y-4 rounded-2xl border border-line bg-white p-6 shadow-xs">
            <div className="flex items-center gap-2 border-b border-line pb-3">
              <User className="size-4 text-brand-dark" aria-hidden="true" />
              <h2 className="text-base font-bold text-ink">Thông tin tài khoản người nộp</h2>
            </div>

            <dl className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <dt className="text-muted">Mã tài khoản (User ID)</dt>
                <dd className="font-mono font-semibold text-ink">{application.applicantId}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted">Họ và tên</dt>
                <dd className="font-semibold text-ink">
                  {application.applicant?.fullName || application.applicantName}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted">Email đăng nhập</dt>
                <dd className="font-medium text-ink">
                  {application.applicant?.email || application.applicantEmail}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted">Vai trò hiện tại trên hệ thống</dt>
                <dd>
                  <Badge
                    variant={application.applicant?.role === 'SELLER' ? 'success' : 'secondary'}
                  >
                    {application.applicant?.role || 'BUYER'}
                  </Badge>
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted">Trạng thái tài khoản</dt>
                <dd>
                  <Badge
                    variant={application.applicant?.status === 'ACTIVE' ? 'success' : 'destructive'}
                  >
                    {application.applicant?.status || 'ACTIVE'}
                  </Badge>
                </dd>
              </div>
              {application.applicant?.reputationScore !== undefined ? (
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Điểm uy tín</dt>
                  <dd className="font-bold text-ink">
                    {application.applicant.reputationScore} điểm
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>

          {/* Card 4: Full Decision History (including internal notes) */}
          <div className="space-y-4 rounded-2xl border border-line bg-white p-6 shadow-xs">
            <div className="flex items-center gap-2 border-b border-line pb-3">
              <History className="size-4 text-brand-dark" aria-hidden="true" />
              <h2 className="text-base font-bold text-ink">
                Lịch sử quyết định &amp; Ghi chú nội bộ
              </h2>
            </div>

            <ol className="space-y-3.5">
              {[...application.decisionHistory].reverse().map((item) => (
                <li
                  key={item.id}
                  className="space-y-2 rounded-xl border border-line bg-canvas/40 p-3.5 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="font-bold text-ink">
                      {DECISION_ACTION_LABELS[item.action] || item.action}
                    </span>
                    <Badge variant="outline">v{item.version}</Badge>
                  </div>

                  <p className="text-[11px] text-muted">
                    {new Date(item.occurredAt).toLocaleString('vi-VN')} · Thực hiện bởi{' '}
                    <strong className="text-ink">
                      {item.actorName || item.actorId} ({item.actorRole})
                    </strong>
                  </p>

                  {item.publicReason ? (
                    <div className="rounded-lg border border-line bg-white p-2.5">
                      <span className="block text-[11px] font-semibold text-muted">
                        Phản hồi hiển thị cho Buyer:
                      </span>
                      <p className="mt-0.5 leading-relaxed text-ink">{item.publicReason}</p>
                    </div>
                  ) : null}

                  {item.internalNote ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-2.5 text-amber-950">
                      <span className="flex items-center gap-1 text-[11px] font-bold text-amber-800">
                        <Lock className="size-3" aria-hidden="true" />
                        <span>Ghi chú nội bộ Admin (Buyer không thấy):</span>
                      </span>
                      <p className="mt-0.5 leading-relaxed">{item.internalNote}</p>
                    </div>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {/* DIALOG 1: APPROVE APPLICATION */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Phê duyệt hồ sơ đăng ký bán hàng</DialogTitle>
            <DialogDescription>
              Xác nhận phê duyệt hồ sơ <strong>{application.id}</strong> (gian hàng{' '}
              <strong>{snap.shopName}</strong>).
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4 text-sm">
            <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-3.5 text-xs leading-relaxed text-blue-950">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-blue-700" aria-hidden="true" />
                <div>
                  <p className="font-semibold">Phân tách bước Duyệt hồ sơ và Kích hoạt Seller:</p>
                  <p className="mt-1">
                    Sau khi bạn bấm Duyệt, hồ sơ chuyển sang trạng thái{' '}
                    <strong>APPROVED (Đã duyệt, chờ kích hoạt)</strong>. Tài khoản của người dùng
                    vẫn giữ vai trò <strong>BUYER</strong> cho tới khi họ kiểm tra xong nghĩa vụ đơn
                    hàng/đấu giá và tự xác nhận kích hoạt Seller.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="approve-internal-note"
                className="block text-xs font-semibold text-ink"
              >
                Ghi chú nội bộ của Quản trị viên (không bắt buộc — không hiển thị cho Buyer)
              </label>
              <Textarea
                id="approve-internal-note"
                value={approveInternalNote}
                onChange={(e) => setApproveInternalNote(e.target.value)}
                maxLength={500}
                placeholder="Ví dụ: Đã đối chiếu thông tin liên hệ và danh mục hàng hóa hợp lệ."
                disabled={approving}
              />
            </div>

            {approveError ? (
              <p role="alert" className="text-xs font-medium text-red-600">
                {approveError}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setApproveOpen(false)}
              disabled={approving}
            >
              Hủy
            </Button>
            <Button type="button" onClick={() => void handleApprove()} disabled={approving}>
              {approving ? 'Đang phê duyệt...' : 'Xác nhận Duyệt hồ sơ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: REJECT APPLICATION */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối / Yêu cầu điều chỉnh hồ sơ</DialogTitle>
            <DialogDescription>
              Hồ sơ <strong>{application.id}</strong> sẽ chuyển sang trạng thái{' '}
              <strong>REJECTED (Cần điều chỉnh)</strong>. Người đăng ký có thể sửa theo lý do bạn
              cung cấp và gửi lại phiên bản mới.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4 text-sm">
            <div className="space-y-1.5">
              <label
                htmlFor="reject-public-reason"
                className="block text-xs font-semibold text-ink"
              >
                Lý do từ chối gửi cho người đăng ký (hiển thị cho Buyer){' '}
                <span className="text-red-600">*</span>
              </label>
              <Textarea
                id="reject-public-reason"
                value={rejectReason}
                onChange={(e) => {
                  setRejectReason(e.target.value);
                  if (rejectError) setRejectError('');
                }}
                maxLength={500}
                placeholder="Ví dụ: Vui lòng bổ sung địa chỉ lấy hàng cụ thể (số nhà, tên đường) và kiểm tra lại tên gian hàng."
                disabled={rejecting}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="reject-internal-note"
                className="block text-xs font-semibold text-ink"
              >
                Ghi chú nội bộ Admin (không bắt buộc — tuyệt đối không lộ cho Buyer)
              </label>
              <Textarea
                id="reject-internal-note"
                value={rejectInternalNote}
                onChange={(e) => setRejectInternalNote(e.target.value)}
                maxLength={500}
                placeholder="Ghi chú lưu nội bộ dành cho đội vận hành Admin..."
                disabled={rejecting}
              />
            </div>

            {rejectError ? (
              <p role="alert" className="text-xs font-medium text-red-600">
                {rejectError}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRejectOpen(false)}
              disabled={rejecting}
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={() => void handleReject()}
              disabled={rejecting}
              className="bg-red-700 text-white hover:bg-red-800"
            >
              {rejecting ? 'Đang xử lý...' : 'Xác nhận Từ chối hồ sơ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: REVOKE APPROVAL BEFORE ACTIVATION */}
      <Dialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thu hồi phê duyệt trước khi kích hoạt</DialogTitle>
            <DialogDescription>
              Thu hồi trạng thái APPROVED của hồ sơ <strong>{application.id}</strong> trước khi
              người dùng kích hoạt Seller. Hồ sơ sẽ quay về trạng thái <strong>REJECTED</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4 text-sm">
            <div className="space-y-1.5">
              <label
                htmlFor="revoke-public-reason"
                className="block text-xs font-semibold text-ink"
              >
                Lý do thu hồi phê duyệt gửi cho người đăng ký{' '}
                <span className="text-red-600">*</span>
              </label>
              <Textarea
                id="revoke-public-reason"
                value={revokeReason}
                onChange={(e) => {
                  setRevokeReason(e.target.value);
                  if (revokeError) setRevokeError('');
                }}
                maxLength={500}
                placeholder="Nhập lý do thu hồi phê duyệt để người dùng điều chỉnh lại hồ sơ..."
                disabled={revoking}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="revoke-internal-note"
                className="block text-xs font-semibold text-ink"
              >
                Ghi chú nội bộ Admin (không bắt buộc — không lộ cho Buyer)
              </label>
              <Textarea
                id="revoke-internal-note"
                value={revokeInternalNote}
                onChange={(e) => setRevokeInternalNote(e.target.value)}
                maxLength={500}
                placeholder="Ghi chú nội bộ..."
                disabled={revoking}
              />
            </div>

            {revokeError ? (
              <p role="alert" className="text-xs font-medium text-red-600">
                {revokeError}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRevokeOpen(false)}
              disabled={revoking}
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={() => void handleRevokeApproval()}
              disabled={revoking}
              className="bg-amber-700 text-white hover:bg-amber-800"
            >
              {revoking ? 'Đang thu hồi...' : 'Xác nhận Thu hồi phê duyệt'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
