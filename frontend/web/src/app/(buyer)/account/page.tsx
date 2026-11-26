'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  Award,
  Bell,
  Gavel,
  KeyRound,
  MapPin,
  Package,
  Pencil,
  ShieldCheck,
  Store,
  UserRound,
  X,
} from 'lucide-react';
import { StoreHeader } from '@/components/layout/store-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { requestApi } from '@/lib/axios/api-client';
import { unwrap, userMessage } from '@/lib/axios/http';
import { fetchDeduplicated } from '@/lib/axios/resource-cache';
import { useSession } from '@/modules/auth/hooks/use-session';
import { useSellerApplication } from '@/modules/user/hooks/use-seller-application';
import { SELLER_APPLICATION_STATUS_META } from '@/modules/user/types/seller-application.types';
import { readContactPhone, saveContactPhone } from '@/modules/user/utils/address-book';

const PASSWORD_POLICY_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,64}$/;

const GENDER_LABELS: Record<string, string> = {
  MALE: 'Nam',
  FEMALE: 'Nữ',
  OTHER: 'Khác',
  UNSPECIFIED: 'Chưa cung cấp',
};

type MyReputationSnapshot = {
  reputationScore: number;
  trustTierLabel: string;
  successRate?: number | null;
  completedTransactions?: number | null;
  averageRatingReceived?: number | null;
  totalRatingsReceived?: number;
  biddingEligible?: boolean;
  minScoreRequiredToBid?: number;
  activeRestrictions: Array<{ feature: string; reason: string; expiresAt?: string }>;
  recentHistory?: Array<{ id: string; delta: number; reason: string; createdAt: string }>;
};

export default function AccountPage() {
  const { user, phase, error, retry, logout } = useSession();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('UNSPECIFIED');
  const [reputation, setReputation] = useState<MyReputationSnapshot | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileNotice, setProfileNotice] = useState('');

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordNotice, setPasswordNotice] = useState('');

  const isActiveBuyer = phase === 'ready' && user?.role === 'BUYER' && user.status === 'ACTIVE';
  const { data: sellerApplicationMe, loading: loadingSellerApplication } =
    useSellerApplication(isActiveBuyer);

  useEffect(() => {
    if (!user?.id) {
      setFullName('');
      setPhone('');
      setDateOfBirth('');
      setGender('UNSPECIFIED');
      setReputation(null);
      return;
    }
    setFullName(user.fullName || '');
    setPhone(readContactPhone(user.id));

    const controller = new AbortController();
    fetchDeduplicated(
      'user:profile:detail',
      () => requestApi('/users/profile', { signal: controller.signal }),
      { ttlMs: 10_000 },
    )
      .then((raw) => {
        if (controller.signal.aborted) return;
        const data = unwrap<Record<string, unknown>>(raw);
        if (typeof data?.fullName === 'string' && data.fullName.trim()) {
          setFullName(data.fullName.trim());
        }
        if (typeof data?.phone === 'string' && data.phone.trim()) {
          setPhone(data.phone.trim());
          saveContactPhone(user.id, data.phone.trim());
        }
        if (typeof data?.dateOfBirth === 'string' && data.dateOfBirth.trim()) {
          setDateOfBirth(data.dateOfBirth.slice(0, 10));
        }
        if (typeof data?.gender === 'string' && data.gender.trim()) {
          setGender(data.gender.toUpperCase());
        }
        if (typeof data?.reputationScore === 'number') {
          const score = data.reputationScore;
          setReputation(
            (prev) =>
              prev ?? {
                reputationScore: score,
                trustTierLabel:
                  score >= 90
                    ? 'Uy tín cao'
                    : score >= 75
                      ? 'Tốt'
                      : score >= 50
                        ? 'Tiêu chuẩn'
                        : score >= 40
                          ? 'Đủ điều kiện đấu giá'
                          : 'Cần khôi phục',
                activeRestrictions: [],
              },
          );
        }
      })
      .catch(() => {
        // Giữ thông tin phiên hiện tại
      });

    fetchDeduplicated(
      'user:me:reputation:raw',
      () => requestApi('/users/me/reputation', { signal: controller.signal }),
      { ttlMs: 15_000 },
    )
      .then((raw) => {
        if (controller.signal.aborted) return;
        const data = unwrap<Record<string, unknown>>(raw);
        if (data && typeof data === 'object' && typeof data.reputationScore === 'number') {
          const stats = (data.stats ?? {}) as Record<string, unknown>;
          const restrictions = Array.isArray(data.activeRestrictions)
            ? (data.activeRestrictions as Array<Record<string, unknown>>).map((r) => ({
                feature: String(r.feature ?? ''),
                reason: String(r.reason ?? ''),
                expiresAt: typeof r.expiresAt === 'string' ? r.expiresAt : undefined,
              }))
            : [];
          const recentHistory = Array.isArray(data.recentHistory)
            ? (data.recentHistory as Array<Record<string, unknown>>).map((h, idx) => ({
                id: String(h.id ?? `rh-${idx}`),
                delta: Number(h.appliedDelta ?? h.delta ?? 0),
                reason: String(h.reason ?? ''),
                createdAt: String(h.createdAt ?? ''),
              }))
            : [];
          setReputation({
            reputationScore: data.reputationScore,
            trustTierLabel: String(data.tierLabel ?? data.trustTierLabel ?? 'Tiêu chuẩn'),
            successRate: typeof stats.successRate === 'number' ? stats.successRate : null,
            completedTransactions:
              typeof stats.completedTransactions === 'number' ? stats.completedTransactions : null,
            averageRatingReceived:
              typeof stats.averageRatingReceived === 'number' ? stats.averageRatingReceived : null,
            totalRatingsReceived:
              typeof stats.totalRatingsReceived === 'number'
                ? stats.totalRatingsReceived
                : undefined,
            biddingEligible:
              typeof data.biddingEligible === 'boolean' ? data.biddingEligible : undefined,
            minScoreRequiredToBid:
              typeof data.minScoreRequiredToBid === 'number'
                ? data.minScoreRequiredToBid
                : undefined,
            activeRestrictions: restrictions,
            recentHistory,
          });
        }
      })
      .catch(() => {
        // Bỏ qua nếu endpoint /users/me/reputation chưa mở
      });

    return () => controller.abort();
  }, [user?.id, user?.fullName]);

  const sellerApplication = sellerApplicationMe?.application ?? null;
  const applicationStatusMeta = sellerApplication
    ? SELLER_APPLICATION_STATUS_META[sellerApplication.status]
    : null;

  const sellerCtaLabel =
    !sellerApplication || sellerApplication.status === 'WITHDRAWN'
      ? 'Đăng ký bán hàng'
      : sellerApplication.status === 'APPROVED'
        ? 'Kích hoạt gian hàng'
        : sellerApplication.status === 'REJECTED'
          ? 'Chỉnh sửa & gửi lại'
          : 'Xem hồ sơ đăng ký';

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (!user || profileBusy) return;
    setProfileError('');
    setProfileNotice('');

    const cleanName = fullName.trim();
    const cleanPhone = phone.replace(/[\s.-]/g, '').trim();

    if (!cleanName || cleanName.length > 100) {
      setProfileError('Họ và tên cần từ 1 đến 100 ký tự.');
      return;
    }
    if (cleanPhone && !/^(?:0|\+84)\d{9}$/.test(cleanPhone)) {
      setProfileError('Số điện thoại không đúng định dạng Việt Nam (10 số).');
      return;
    }

    setProfileBusy(true);
    try {
      await requestApi('/users/profile', {
        method: 'PATCH',
        body: {
          fullName: cleanName,
          ...(cleanPhone ? { phone: cleanPhone } : {}),
          dateOfBirth: dateOfBirth || null,
          gender: gender || null,
        },
      });
      if (cleanPhone) saveContactPhone(user.id, cleanPhone);
      setPhone(cleanPhone);
      setEditingProfile(false);
      setProfileNotice('Đã lưu thông tin hồ sơ.');
      retry();
    } catch (err) {
      setProfileError(userMessage(err));
    } finally {
      setProfileBusy(false);
    }
  }

  async function submitPasswordChange(e: FormEvent) {
    e.preventDefault();
    if (passwordBusy) return;
    setPasswordError('');
    setPasswordNotice('');

    if (!currentPassword) {
      setPasswordError('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (!PASSWORD_POLICY_RE.test(newPassword)) {
      setPasswordError('Mật khẩu mới cần 8–64 ký tự, gồm chữ hoa, chữ thường và chữ số.');
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setPasswordBusy(true);
    try {
      await requestApi('/users/change-password', {
        method: 'POST',
        body: { currentPassword, newPassword },
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordOpen(false);
      setPasswordNotice(
        'Đã đổi mật khẩu thành công. Phiên hiện tại đã được đăng xuất để bảo mật, vui lòng đăng nhập lại.',
      );
      await logout();
    } catch (err) {
      setPasswordError(userMessage(err));
    } finally {
      setPasswordBusy(false);
    }
  }

  const roleLabel =
    user?.role === 'BUYER'
      ? 'Người mua'
      : user?.role === 'SELLER'
        ? 'Người bán'
        : user?.role === 'ADMIN'
          ? 'Quản trị viên'
          : user?.role || '';

  return (
    <>
      <StoreHeader />
      <main className="nexus-container py-8 sm:py-10">
        <div className="mx-auto max-w-4xl space-y-6">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-dark">
                Tài khoản Nexus
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-stone-950 sm:text-3xl">
                Thông tin cá nhân
              </h1>
            </div>
            {user && (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingProfile((v) => !v);
                    setProfileError('');
                    setProfileNotice('');
                  }}
                  className="min-h-11 rounded-xl border-stone-300"
                >
                  {editingProfile ? (
                    <>
                      <X className="size-4" aria-hidden="true" />
                      Đóng chỉnh sửa
                    </>
                  ) : (
                    <>
                      <Pencil className="size-4" aria-hidden="true" />
                      Chỉnh sửa hồ sơ
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPasswordError('');
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordOpen(true);
                  }}
                  className="min-h-11 rounded-xl border-stone-300"
                >
                  <KeyRound className="size-4" aria-hidden="true" />
                  Đổi mật khẩu
                </Button>
              </div>
            )}
          </header>

          {phase === 'loading' ? (
            <section className="rounded-3xl border border-line bg-white p-8">
              <p className="text-sm text-muted" role="status">
                Đang xác minh phiên đăng nhập…
              </p>
            </section>
          ) : phase === 'error' ? (
            <section className="rounded-3xl border border-red-200 bg-white p-8" role="alert">
              <p className="text-sm text-red-700">{error}</p>
              <Button type="button" variant="outline" onClick={retry} className="mt-4 min-h-11">
                Thử lại
              </Button>
            </section>
          ) : !user ? (
            <section className="rounded-3xl border border-line bg-white p-8 text-center sm:p-10">
              <UserRound className="mx-auto size-9 text-stone-400" aria-hidden="true" />
              <p className="mt-3 text-sm text-muted">
                Đăng nhập để quản lý hồ sơ, đơn hàng, phiên đấu giá và thông báo.
              </p>
              <Button asChild className="mt-5 min-h-11 rounded-xl bg-brand-dark px-6 text-white">
                <Link href="/login?next=%2Faccount">Đăng nhập</Link>
              </Button>
            </section>
          ) : (
            <>
              {(profileNotice || passwordNotice) && (
                <p
                  role="status"
                  className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3.5 text-sm font-medium text-emerald-900"
                >
                  {profileNotice || passwordNotice}
                </p>
              )}

              {/* Quick navigation grid */}
              <nav aria-label="Lối tắt tài khoản" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {user.role === 'BUYER' && (
                  <Link
                    href="/account/addresses"
                    className="flex min-h-20 flex-col justify-between rounded-2xl border border-line bg-white p-4 transition hover:border-brand-dark/40 hover:shadow-xs"
                  >
                    <MapPin className="size-5 text-brand-dark" aria-hidden="true" />
                    <span className="mt-3 text-sm font-semibold text-stone-900">Sổ địa chỉ</span>
                  </Link>
                )}
                <Link
                  href="/account/orders"
                  className="flex min-h-20 flex-col justify-between rounded-2xl border border-line bg-white p-4 transition hover:border-brand-dark/40 hover:shadow-xs"
                >
                  <Package className="size-5 text-brand-dark" aria-hidden="true" />
                  <span className="mt-3 text-sm font-semibold text-stone-900">
                    {user.role === 'SELLER' ? 'Đơn mua cũ' : 'Đơn hàng'}
                  </span>
                </Link>
                {user.role === 'BUYER' && (
                  <Link
                    href="/account/auctions"
                    className="flex min-h-20 flex-col justify-between rounded-2xl border border-line bg-white p-4 transition hover:border-emerald-700/40 hover:shadow-xs"
                  >
                    <Gavel className="size-5 text-emerald-700" aria-hidden="true" />
                    <span className="mt-3 text-sm font-semibold text-stone-900">Phiên của tôi</span>
                  </Link>
                )}
                <Link
                  href="/account/notifications"
                  className="flex min-h-20 flex-col justify-between rounded-2xl border border-line bg-white p-4 transition hover:border-brand-dark/40 hover:shadow-xs"
                >
                  <Bell className="size-5 text-brand-dark" aria-hidden="true" />
                  <span className="mt-3 text-sm font-semibold text-stone-900">Thông báo</span>
                </Link>
              </nav>

              {/* Profile info / inline edit */}
              <section className="rounded-3xl border border-line bg-white p-6 sm:p-8">
                {editingProfile ? (
                  <form onSubmit={saveProfile} noValidate className="space-y-4">
                    <h2 className="text-base font-bold text-stone-950">Cập nhật thông tin hồ sơ</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="account-full-name"
                          className="mb-1.5 block text-sm font-semibold text-stone-900"
                        >
                          Họ và tên
                        </label>
                        <Input
                          id="account-full-name"
                          value={fullName}
                          maxLength={100}
                          onChange={(e) => setFullName(e.target.value)}
                          className="min-h-11 rounded-xl"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="account-phone"
                          className="mb-1.5 block text-sm font-semibold text-stone-900"
                        >
                          Điện thoại liên hệ
                        </label>
                        <Input
                          id="account-phone"
                          type="tel"
                          placeholder="09xxxxxxxx"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="min-h-11 rounded-xl tabular-nums"
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="account-dob"
                          className="mb-1.5 block text-sm font-semibold text-stone-900"
                        >
                          Ngày sinh
                        </label>
                        <Input
                          id="account-dob"
                          type="date"
                          value={dateOfBirth}
                          onChange={(e) => setDateOfBirth(e.target.value)}
                          className="min-h-11 rounded-xl tabular-nums"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="account-gender"
                          className="mb-1.5 block text-sm font-semibold text-stone-900"
                        >
                          Giới tính
                        </label>
                        <Select value={gender} onValueChange={setGender}>
                          <SelectTrigger id="account-gender" className="min-h-11 w-full rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="UNSPECIFIED">Chưa cung cấp</SelectItem>
                            <SelectItem value="MALE">Nam</SelectItem>
                            <SelectItem value="FEMALE">Nữ</SelectItem>
                            <SelectItem value="OTHER">Khác</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="account-email-readonly"
                        className="mb-1.5 block text-sm font-semibold text-stone-900"
                      >
                        Email
                      </label>
                      <Input
                        id="account-email-readonly"
                        value={user.email}
                        readOnly
                        className="min-h-11 rounded-xl bg-stone-50 text-stone-500"
                      />
                    </div>
                    {profileError && (
                      <p role="alert" className="text-sm text-red-700">
                        {profileError}
                      </p>
                    )}
                    <div className="flex flex-wrap justify-end gap-2.5 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={profileBusy}
                        onClick={() => {
                          setEditingProfile(false);
                          setFullName(user.fullName);
                          setPhone(readContactPhone(user.id));
                          setProfileError('');
                        }}
                        className="min-h-11 rounded-xl"
                      >
                        Hủy
                      </Button>
                      <Button
                        type="submit"
                        disabled={profileBusy}
                        className="min-h-11 rounded-xl bg-brand-dark px-5 text-white"
                      >
                        {profileBusy ? 'Đang lưu…' : 'Lưu thay đổi'}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <dl className="divide-y divide-line text-sm">
                    {[
                      ['Họ và tên', fullName || user.fullName],
                      ['Email', user.email],
                      ['Điện thoại liên hệ', phone || 'Chưa bổ sung'],
                      ['Ngày sinh', dateOfBirth || 'Chưa bổ sung'],
                      ['Giới tính', GENDER_LABELS[gender] || 'Chưa cung cấp'],
                      ['Vai trò', roleLabel],
                      ['Trạng thái', user.status === 'ACTIVE' ? 'Đang hoạt động' : user.status],
                    ].map(([label, value]) => (
                      <div key={label} className="grid gap-2 py-4 sm:grid-cols-[160px_1fr]">
                        <dt className="text-muted">{label}</dt>
                        <dd className="break-words font-semibold text-stone-900">{value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </section>

              {/* Personal Reputation & Trust Card */}
              {reputation && (
                <section className="rounded-3xl border border-line bg-white p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                        <Award className="size-6" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-xs text-muted">Uy tín tài khoản</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2">
                          <strong className="text-xl font-bold text-stone-950 tabular-nums">
                            {reputation.reputationScore} điểm
                          </strong>
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-900">
                            {reputation.trustTierLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-right text-xs">
                      {reputation.completedTransactions !== undefined && (
                        <div>
                          <p className="text-muted">Giao dịch thành công</p>
                          <p className="mt-0.5 text-sm font-bold text-stone-900 tabular-nums">
                            {reputation.completedTransactions != null
                              ? reputation.completedTransactions
                              : 'Chưa có dữ liệu'}
                          </p>
                        </div>
                      )}
                      {reputation.successRate !== undefined && (
                        <div>
                          <p className="text-muted">Tỷ lệ hoàn tất</p>
                          <p className="mt-0.5 text-sm font-bold text-emerald-800 tabular-nums">
                            {reputation.successRate != null
                              ? `${reputation.successRate.toFixed(0)}%`
                              : 'Chưa có dữ liệu'}
                          </p>
                        </div>
                      )}
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="min-h-10 rounded-xl border-emerald-700/30 text-xs font-semibold text-emerald-900 hover:bg-emerald-50"
                      >
                        <Link href="/account/reputation">Nhiệm vụ &amp; sổ điểm</Link>
                      </Button>
                    </div>
                  </div>

                  {reputation.recentHistory && reputation.recentHistory.length > 0 && (
                    <div className="mt-4 border-t border-line pt-3.5">
                      <p className="text-xs font-semibold text-stone-700">
                        Biến động uy tín gần đây
                      </p>
                      <ul className="mt-2 divide-y divide-stone-100 text-xs">
                        {reputation.recentHistory.slice(0, 5).map((item) => (
                          <li
                            key={item.id}
                            className="flex items-center justify-between gap-3 py-2"
                          >
                            <span className="text-stone-700">
                              {item.reason || 'Điều chỉnh điểm'}
                            </span>
                            <span
                              className={`shrink-0 font-mono font-bold ${
                                item.delta >= 0 ? 'text-emerald-700' : 'text-red-700'
                              }`}
                            >
                              {item.delta >= 0 ? `+${item.delta}` : item.delta}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {reputation.activeRestrictions.length > 0 && (
                    <div
                      role="alert"
                      className="mt-4 space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-950"
                    >
                      <p className="flex items-center gap-1.5 font-bold">
                        <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
                        Tài khoản đang có giới hạn tạm thời
                      </p>
                      <ul className="space-y-1 pl-5 list-disc">
                        {reputation.activeRestrictions.map((r, idx) => (
                          <li key={`${r.feature}-${idx}`}>
                            <strong>{r.feature}:</strong> {r.reason}
                            {r.expiresAt &&
                              ` (đến ${new Date(r.expiresAt).toLocaleDateString('vi-VN')})`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              )}

              {/* Seller onboarding / status card */}
              {user.role === 'BUYER' && (
                <section className="rounded-3xl border border-brand-dark/20 bg-brand-soft/40 p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="flex items-center gap-2 text-sm font-bold text-brand-dark">
                          <Store className="size-4 shrink-0" aria-hidden="true" />
                          <span>Trở thành Người bán trên Nexus</span>
                        </p>
                        {applicationStatusMeta && (
                          <Badge variant={applicationStatusMeta.badgeVariant}>
                            {applicationStatusMeta.label}
                          </Badge>
                        )}
                      </div>
                      {user.status !== 'ACTIVE' ? (
                        <p className="text-xs leading-relaxed text-muted">
                          Chỉ tài khoản Người mua đang hoạt động mới đủ điều kiện gửi hồ sơ đăng ký.
                        </p>
                      ) : loadingSellerApplication && !sellerApplicationMe ? (
                        <p className="text-xs leading-relaxed text-muted">
                          Đang kiểm tra trạng thái hồ sơ…
                        </p>
                      ) : applicationStatusMeta ? (
                        <div className="space-y-1">
                          <p className="text-xs leading-relaxed text-muted">
                            {applicationStatusMeta.buyerSummary}
                          </p>
                          {sellerApplication?.status === 'REJECTED' &&
                            sellerApplication.rejectionReason && (
                              <p className="text-xs font-medium text-red-700">
                                Lý do cần chỉnh sửa: {sellerApplication.rejectionReason}
                              </p>
                            )}
                        </div>
                      ) : (
                        <p className="text-xs leading-relaxed text-muted">
                          Gửi hồ sơ mở gian hàng để Admin xét duyệt và kích hoạt kênh bán hàng.
                        </p>
                      )}
                    </div>
                    {user.status === 'ACTIVE' && (
                      <Link
                        href="/account/seller-registration"
                        className="inline-flex min-h-11 shrink-0 items-center rounded-xl bg-brand-dark px-5 text-xs font-semibold text-white hover:bg-brand"
                      >
                        {sellerCtaLabel}
                      </Link>
                    )}
                  </div>
                </section>
              )}

              {user.role === 'SELLER' && (
                <section className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="flex items-center gap-2 text-sm font-bold text-emerald-900">
                        <Store className="size-4" aria-hidden="true" />
                        <span>Tài khoản Người bán đang hoạt động</span>
                      </p>
                      <p className="text-xs text-emerald-800">
                        Truy cập Kênh người bán hoặc xem lại hồ sơ đăng ký gian hàng của bạn.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href="/seller"
                        className="inline-flex min-h-11 items-center rounded-xl bg-brand-dark px-4 text-xs font-semibold text-white"
                      >
                        Kênh người bán
                      </Link>
                      <Link
                        href="/account/seller-registration"
                        className="inline-flex min-h-11 items-center rounded-xl border border-line bg-white px-4 text-xs font-semibold text-ink"
                      >
                        Hồ sơ gian hàng
                      </Link>
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>

      {/* Change Password Dialog */}
      <Dialog
        open={passwordOpen}
        onOpenChange={(next) => {
          if (!passwordBusy) setPasswordOpen(next);
        }}
      >
        <DialogContent className="max-w-md p-6 sm:p-7">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-stone-950">
            <ShieldCheck className="size-5 text-brand-dark" aria-hidden="true" />
            Đổi mật khẩu
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-xs text-stone-600">
            Mật khẩu mới cần 8–64 ký tự, bao gồm chữ hoa, chữ thường và chữ số.
          </DialogDescription>

          <form onSubmit={submitPasswordChange} noValidate className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="current-password"
                className="mb-1.5 block text-sm font-semibold text-stone-900"
              >
                Mật khẩu hiện tại
              </label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="min-h-11 rounded-xl"
              />
            </div>

            <div>
              <label
                htmlFor="new-password"
                className="mb-1.5 block text-sm font-semibold text-stone-900"
              >
                Mật khẩu mới
              </label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="min-h-11 rounded-xl"
              />
            </div>

            <div>
              <label
                htmlFor="confirm-new-password"
                className="mb-1.5 block text-sm font-semibold text-stone-900"
              >
                Xác nhận mật khẩu mới
              </label>
              <Input
                id="confirm-new-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="min-h-11 rounded-xl"
              />
            </div>

            {passwordError && (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700">
                {passwordError}
              </p>
            )}

            <div className="flex items-center justify-between pt-1">
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-stone-500 underline underline-offset-4 hover:text-stone-900"
              >
                Quên mật khẩu?
              </Link>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={passwordBusy}
                  onClick={() => setPasswordOpen(false)}
                  className="min-h-11 rounded-xl"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={passwordBusy}
                  className="min-h-11 rounded-xl bg-brand-dark px-5 text-white"
                >
                  {passwordBusy ? 'Đang cập nhật…' : 'Cập nhật'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
