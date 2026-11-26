'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  History,
  ReceiptText,
  RefreshCw,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { requestApi } from '@/lib/axios/api-client';
import { unwrap, userMessage } from '@/lib/axios/http';
import { AdminReputationActions } from './admin-reputation-actions';

type Row = Record<string, unknown>;

const GENDER_LABELS: Record<string, string> = {
  MALE: 'Nam',
  FEMALE: 'Nữ',
  OTHER: 'Khác',
  UNSPECIFIED: 'Chưa cung cấp',
};

function maskIdentity(raw: unknown): string {
  const s = String(raw ?? '').trim();
  if (!s) return 'Chưa cung cấp';
  if (s.includes('•') || s.includes('*')) return s;
  if (s.length <= 4) return '••••';
  return '••••••••' + s.slice(-4);
}

export function AdminUserReputationDetail({
  id,
  mode,
}: {
  id: string;
  mode: 'users' | 'reputation';
}) {
  const [user, setUser] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'reputation' | 'reviews' | 'disputes'>('reputation');

  const [repHistory, setRepHistory] = useState<Row[]>([]);
  const [repError, setRepError] = useState('');
  const [repAppeals, setRepAppeals] = useState<Row[]>([]);
  const [repTierLabel, setRepTierLabel] = useState('');
  const [appealBusyId, setAppealBusyId] = useState<string | null>(null);
  const [appealNotice, setAppealNotice] = useState('');
  const [reviews, setReviews] = useState<Row[]>([]);
  const [reviewsError, setReviewsError] = useState('');
  const [reviewDirection, setReviewDirection] = useState<'received' | 'authored'>('received');
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [reviewTotalPages, setReviewTotalPages] = useState(1);
  const [orders, setOrders] = useState<Row[]>([]);
  const [ordersError, setOrdersError] = useState('');
  const [cases, setCases] = useState<Row[]>([]);
  const [casesError, setCasesError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    let loadedProfile: Row | null = null;
    try {
      const raw = await requestApi(`/users/${encodeURIComponent(id)}`);
      const profile = unwrap<Row>(raw);
      loadedProfile = profile && typeof profile === 'object' ? profile : null;
      setUser(loadedProfile);
    } catch (err) {
      setError(userMessage(err));
      setLoading(false);
      return;
    }

    const effectiveDirection =
      String(loadedProfile?.role ?? '').toUpperCase() === 'BUYER' ? 'authored' : reviewDirection;
    if (
      String(loadedProfile?.role ?? '').toUpperCase() === 'BUYER' &&
      reviewDirection !== 'authored'
    ) {
      setReviewDirection('authored');
    }

    const [repRes, revRes, ordRes, caseRes] = await Promise.allSettled([
      requestApi(`/users/${encodeURIComponent(id)}/reputation-history?page=1&limit=20`),
      requestApi(
        `/users/${encodeURIComponent(id)}/reviews?direction=${effectiveDirection}&page=${reviewPage}&limit=20`,
      ),
      requestApi(`/orders?buyerId=${encodeURIComponent(id)}&page=1&limit=10`),
      requestApi(`/support/cases?userId=${encodeURIComponent(id)}`),
    ]);

    const extractList = (res: PromiseSettledResult<unknown>): Row[] => {
      if (res.status !== 'fulfilled') return [];
      const data = unwrap<unknown>(res.value);
      const list = Array.isArray(data)
        ? data
        : Array.isArray((data as Row)?.items)
          ? ((data as Row).items as unknown[])
          : [];
      return list.filter((x): x is Row => Boolean(x && typeof x === 'object'));
    };

    if (repRes.status === 'fulfilled') {
      setRepError('');
      const repData = unwrap<Row>(repRes.value);
      if (repData && typeof repData === 'object') {
        if (typeof repData.tierLabel === 'string') setRepTierLabel(repData.tierLabel);
        if (Array.isArray(repData.appeals)) {
          setRepAppeals(
            repData.appeals.filter((x): x is Row => Boolean(x && typeof x === 'object')),
          );
        }
      }
      setRepHistory(extractList(repRes));
    } else {
      setRepHistory([]);
      setRepError(userMessage(repRes.reason));
    }

    if (revRes.status === 'fulfilled') {
      setReviewsError('');
      const revData = unwrap<Row>(revRes.value);
      const pag = (revData?.pagination ?? {}) as Row;
      setReviewTotal(Number(pag.total ?? extractList(revRes).length));
      setReviewTotalPages(Math.max(1, Number(pag.totalPages ?? 1)));
      setReviews(extractList(revRes));
    } else {
      setReviews([]);
      setReviewsError(userMessage(revRes.reason));
    }

    if (ordRes.status === 'fulfilled') {
      setOrdersError('');
      setOrders(extractList(ordRes));
    } else {
      setOrders([]);
      setOrdersError(userMessage(ordRes.reason));
    }

    if (caseRes.status === 'fulfilled') {
      setCasesError('');
      setCases(extractList(caseRes));
    } else {
      setCases([]);
      setCasesError(userMessage(caseRes.reason));
    }

    setLoading(false);
  }, [id, reviewDirection, reviewPage]);

  async function resolveAppeal(appealId: string, decision: 'APPROVE_REVERSE' | 'REJECT') {
    setAppealBusyId(appealId);
    setAppealNotice('');
    try {
      await requestApi(`/users/admin/reputation/appeals/${encodeURIComponent(appealId)}/resolve`, {
        method: 'POST',
        body: {
          decision,
          resolutionNote:
            decision === 'APPROVE_REVERSE'
              ? 'Quản trị viên chấp thuận đảo bút toán sau đối soát'
              : 'Giữ nguyên bút toán gốc theo kết quả đối soát',
        },
      });
      setAppealNotice(
        decision === 'APPROVE_REVERSE'
          ? 'Đã chấp thuận đảo bút toán và tính lại điểm uy tín.'
          : 'Đã từ chối yêu cầu xem lại bút toán.',
      );
      await load();
    } catch (err) {
      setAppealNotice(userMessage(err));
    } finally {
      setAppealBusyId(null);
    }
  }

  useEffect(() => {
    void load();
  }, [load]);

  const backHref = mode === 'reputation' ? '/admin/reputation' : '/admin/users';
  const backLabel = mode === 'reputation' ? 'Danh sách uy tín' : 'Danh sách tài khoản';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost">
          <Link href={backHref}>
            <ArrowLeft size={16} />
            {backLabel}
          </Link>
        </Button>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Làm mới
        </Button>
      </div>

      <header>
        <p className="admin-kicker">
          {mode === 'reputation' ? 'HỒ SƠ UY TÍN & CHẾ TÀI' : 'HỒ SƠ NGƯỜI DÙNG'}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1>{String(user?.fullName ?? 'Hồ sơ tài khoản')}</h1>
          {repTierLabel && (
            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">
              {repTierLabel}
            </span>
          )}
        </div>
        <p className="mt-1 font-mono text-xs text-slate-500">{id}</p>
      </header>

      {error ? (
        <section role="alert" className="rounded-2xl border border-red-200 bg-white p-6">
          <p className="text-sm text-red-700">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => void load()}>
            Thử lại
          </Button>
        </section>
      ) : loading && !user ? (
        <p
          role="status"
          className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500"
        >
          Đang tải hồ sơ người dùng…
        </p>
      ) : user ? (
        <>
          {/* Full SRS Profile Card */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="font-semibold text-slate-950">Thông tin hồ sơ</h2>
            <dl className="mt-4 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['Họ và tên', String(user.fullName ?? '—')],
                ['Email', String(user.email ?? '—')],
                ['Điện thoại', String(user.phone ?? 'Chưa cung cấp')],
                ['Vai trò', String(user.role ?? '—')],
                ['Trạng thái', String(user.status ?? '—')],
                [
                  'Ngày sinh',
                  user.dateOfBirth ? String(user.dateOfBirth).slice(0, 10) : 'Chưa cung cấp',
                ],
                [
                  'Giới tính',
                  GENDER_LABELS[String(user.gender ?? 'UNSPECIFIED').toUpperCase()] ??
                    'Chưa cung cấp',
                ],
                ['Số định danh', maskIdentity(user.identityNumberMasked ?? user.identityNumber)],
                [
                  'Địa chỉ mặc định',
                  String(user.defaultAddress ?? user.address ?? 'Chưa cung cấp'),
                ],
                [
                  'Ngày tạo',
                  user.createdAt && Number.isFinite(Date.parse(String(user.createdAt)))
                    ? new Date(String(user.createdAt)).toLocaleString('vi-VN')
                    : '—',
                ],
              ].map(([label, value]) => (
                <div key={label} className="border-t border-slate-100 py-3.5">
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="mt-1 break-words text-sm font-medium text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Reputation & Penalty Action Panel (real POST adjust-reputation & restrict-features) */}
          <AdminReputationActions data={user} onSaved={() => void load()} />

          {/* 3-tab operational history */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div
              role="tablist"
              aria-label="Lịch sử hoạt động của người dùng"
              className="flex flex-wrap gap-2 border-b border-slate-200 p-4"
            >
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'reputation'}
                onClick={() => setTab('reputation')}
                className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl px-4 text-xs font-semibold transition ${
                  tab === 'reputation'
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <History size={14} aria-hidden="true" />
                Lịch sử uy tín &amp; phạt ({repHistory.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'reviews'}
                onClick={() => setTab('reviews')}
                className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl px-4 text-xs font-semibold transition ${
                  tab === 'reviews'
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Star size={14} aria-hidden="true" />
                Lịch sử đánh giá ({reviews.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'disputes'}
                onClick={() => setTab('disputes')}
                className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl px-4 text-xs font-semibold transition ${
                  tab === 'disputes'
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <AlertTriangle size={14} aria-hidden="true" />
                Đơn hàng &amp; tranh chấp ({orders.length + cases.length})
              </button>
            </div>

            <div className="p-5">
              {tab === 'reputation' ? (
                <div className="space-y-5">
                  {appealNotice && (
                    <p
                      role="status"
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-900"
                    >
                      {appealNotice}
                    </p>
                  )}

                  {repAppeals.length > 0 && (
                    <div className="space-y-2.5 rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-amber-900">
                        Yêu cầu xem lại bút toán ({repAppeals.length})
                      </p>
                      <ul className="divide-y divide-amber-200/70 text-xs">
                        {repAppeals.map((ap, idx) => {
                          const apId = String(ap.id ?? idx);
                          const status = String(ap.status ?? 'PENDING');
                          return (
                            <li
                              key={apId}
                              className="flex flex-wrap items-center justify-between gap-3 py-2.5"
                            >
                              <div>
                                <p className="font-semibold text-slate-900">
                                  {String(ap.reason ?? '')}
                                </p>
                                {typeof ap.evidenceNote === 'string' && ap.evidenceNote && (
                                  <p className="mt-0.5 text-slate-600">
                                    Chứng từ: {ap.evidenceNote}
                                  </p>
                                )}
                              </div>
                              {status === 'PENDING' ? (
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={appealBusyId === apId}
                                    onClick={() => void resolveAppeal(apId, 'APPROVE_REVERSE')}
                                    className="h-8 rounded-lg bg-emerald-700 px-3 text-xs text-white hover:bg-emerald-800"
                                  >
                                    Chấp thuận &amp; đảo điểm
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={appealBusyId === apId}
                                    onClick={() => void resolveAppeal(apId, 'REJECT')}
                                    className="h-8 rounded-lg bg-white px-3 text-xs"
                                  >
                                    Từ chối
                                  </Button>
                                </div>
                              ) : (
                                <span className="rounded-full bg-white px-2.5 py-1 font-medium text-slate-700">
                                  {status === 'APPROVED_REVERSED' ? 'Đã đảo điểm' : 'Đã từ chối'}
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {repError ? (
                    <div
                      role="alert"
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800"
                    >
                      <span>Chưa tải được sổ lịch sử uy tín: {repError}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void load()}
                        className="bg-white"
                      >
                        Thử lại
                      </Button>
                    </div>
                  ) : repHistory.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500">
                      Chưa có bản ghi điều chỉnh uy tín hoặc hình phạt.
                    </p>
                  ) : (
                    <ul className="divide-y divide-slate-100 text-sm">
                      {repHistory.map((item, idx) => {
                        const delta = Number(item.appliedDelta ?? item.delta ?? item.points ?? 0);
                        return (
                          <li
                            key={String(item.id ?? idx)}
                            className="flex flex-wrap items-center justify-between gap-3 py-3.5"
                          >
                            <div>
                              <p className="font-semibold text-slate-900">
                                {String(item.ruleCode ?? item.actionType ?? 'ADJUST_SCORE')}
                                {delta !== 0 && (
                                  <span
                                    className={`ml-2 font-mono ${
                                      delta > 0 ? 'text-emerald-700' : 'text-red-700'
                                    }`}
                                  >
                                    {delta > 0 ? `+${delta}` : delta}
                                  </span>
                                )}
                                {typeof item.scoreBefore === 'number' &&
                                  typeof item.scoreAfter === 'number' && (
                                    <span className="ml-2 text-xs font-normal text-slate-500 tabular-nums">
                                      ({item.scoreBefore} → {item.scoreAfter}/100)
                                    </span>
                                  )}
                              </p>
                              {typeof item.reason === 'string' && (
                                <p className="mt-0.5 text-xs text-slate-600">{item.reason}</p>
                              )}
                              {typeof item.internalNote === 'string' && item.internalNote && (
                                <p className="mt-0.5 text-xs text-amber-800">
                                  Ghi chú nội bộ: {item.internalNote}
                                </p>
                              )}
                            </div>
                            <div className="text-right text-xs text-slate-500 tabular-nums">
                              {(typeof item.actorName === 'string' ||
                                typeof item.actorId === 'string') && (
                                <p>{String(item.actorName ?? item.actorId)}</p>
                              )}
                              {typeof item.createdAt === 'string' && (
                                <p>{new Date(item.createdAt).toLocaleString('vi-VN')}</p>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ) : tab === 'reviews' ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex gap-2">
                      {String(user.role ?? '').toUpperCase() !== 'BUYER' && (
                        <Button
                          type="button"
                          size="sm"
                          variant={reviewDirection === 'received' ? 'default' : 'outline'}
                          onClick={() => {
                            setReviewDirection('received');
                            setReviewPage(1);
                          }}
                          className="h-8 rounded-lg text-xs"
                        >
                          Đánh giá nhận được
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant={reviewDirection === 'authored' ? 'default' : 'outline'}
                        onClick={() => {
                          setReviewDirection('authored');
                          setReviewPage(1);
                        }}
                        className="h-8 rounded-lg text-xs"
                      >
                        Đánh giá đã gửi
                      </Button>
                    </div>
                    <span className="text-xs text-slate-500 tabular-nums">
                      Tổng: {reviewTotal} · Trang {reviewPage}/{reviewTotalPages}
                    </span>
                  </div>

                  {reviewsError ? (
                    <div
                      role="alert"
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800"
                    >
                      <span>Chưa tải được danh sách đánh giá: {reviewsError}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void load()}
                        className="bg-white"
                      >
                        Thử lại
                      </Button>
                    </div>
                  ) : reviews.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500">
                      Chưa có đánh giá nào ở mục này.
                    </p>
                  ) : (
                    <>
                      <ul className="divide-y divide-slate-100 text-sm">
                        {reviews.map((rev, idx) => (
                          <li key={String(rev.id ?? idx)} className="py-3.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-slate-900">
                                  {rev.direction === 'AUTHORED'
                                    ? `Gửi tới gian hàng ${String(rev.targetUserId ?? '—').slice(0, 12)}`
                                    : String(rev.buyerAlias ?? 'Người mua')}
                                </span>
                                {typeof rev.orderId === 'string' && rev.orderId && (
                                  <Link
                                    href={`/admin/orders/${encodeURIComponent(rev.orderId)}`}
                                    className="font-mono text-xs text-emerald-800 underline underline-offset-4"
                                  >
                                    Đơn #{rev.orderId.slice(0, 14)}
                                  </Link>
                                )}
                              </div>
                              <span className="font-semibold text-amber-600 tabular-nums">
                                ★ {String(rev.rating ?? 5)}/5
                              </span>
                            </div>
                            {typeof rev.comment === 'string' && rev.comment && (
                              <p className="mt-1 text-xs text-slate-600">{rev.comment}</p>
                            )}
                          </li>
                        ))}
                      </ul>
                      {reviewTotalPages > 1 && (
                        <div className="flex items-center justify-end gap-2 pt-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={reviewPage <= 1}
                            onClick={() => setReviewPage((p) => Math.max(1, p - 1))}
                          >
                            Trước
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={reviewPage >= reviewTotalPages}
                            onClick={() => setReviewPage((p) => Math.min(reviewTotalPages, p + 1))}
                          >
                            Sau
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase text-slate-500">
                      <AlertTriangle size={14} className="text-amber-600" />
                      Hồ sơ khiếu nại / tranh chấp ({cases.length})
                    </h3>
                    {casesError ? (
                      <div
                        role="alert"
                        className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"
                      >
                        <span>Chưa tải được hồ sơ tranh chấp: {casesError}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void load()}
                          className="bg-white"
                        >
                          Thử lại
                        </Button>
                      </div>
                    ) : cases.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-500">
                        Không có hồ sơ tranh chấp liên quan.
                      </p>
                    ) : (
                      <ul className="mt-2 divide-y divide-slate-100 text-sm">
                        {cases.map((c, idx) => (
                          <li
                            key={String(c.id ?? c.caseId ?? idx)}
                            className="flex items-center justify-between gap-3 py-3"
                          >
                            <div>
                              <p className="font-semibold text-slate-900">
                                {String(c.caseCode ?? c.id ?? 'Khiếu nại')} ·{' '}
                                {String(c.status ?? '')}
                              </p>
                              <p className="text-xs text-slate-500">
                                Đơn hàng: {String(c.orderId ?? '—')}
                              </p>
                            </div>
                            {Boolean(c.orderId) && (
                              <Button asChild variant="outline" size="sm">
                                <Link
                                  href={`/admin/orders/${encodeURIComponent(String(c.orderId))}`}
                                >
                                  Mở đơn
                                  <ArrowUpRight size={14} />
                                </Link>
                              </Button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase text-slate-500">
                      <ReceiptText size={14} />
                      Đơn hàng gần đây ({orders.length})
                    </h3>
                    {ordersError ? (
                      <div
                        role="alert"
                        className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"
                      >
                        <span>Chưa tải được đơn hàng: {ordersError}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void load()}
                          className="bg-white"
                        >
                          Thử lại
                        </Button>
                      </div>
                    ) : orders.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-500">Chưa có đơn hàng gần đây.</p>
                    ) : (
                      <ul className="mt-2 divide-y divide-slate-100 text-sm">
                        {orders.map((o, idx) => (
                          <li
                            key={String(o.id ?? idx)}
                            className="flex items-center justify-between gap-3 py-3"
                          >
                            <div>
                              <p className="font-mono text-xs font-semibold text-slate-900">
                                {String(o.orderCode ?? o.id ?? '')}
                              </p>
                              <p className="text-xs text-slate-500">
                                {String(o.status ?? '')} ·{' '}
                                {new Intl.NumberFormat('vi-VN').format(
                                  Number(o.totalAmount ?? o.total ?? 0),
                                )}{' '}
                                ₫
                              </p>
                            </div>
                            <Button asChild variant="ghost" size="sm">
                              <Link href={`/admin/orders/${encodeURIComponent(String(o.id))}`}>
                                Xem đơn
                                <ArrowUpRight size={14} />
                              </Link>
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
