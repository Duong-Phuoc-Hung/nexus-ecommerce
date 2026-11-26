'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  ClipboardCheck,
  History,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { StoreHeader } from '@/components/layout/store-header';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useSession } from '@/modules/auth/hooks/use-session';
import { useMyReputation, type ReputationLedgerItem } from '@/modules/user/hooks/use-my-reputation';
import { userMessage } from '@/lib/axios/http';

const RECOVERY_QUESTIONS = [
  {
    q: 'Khi bạn thắng một phiên đấu giá, hạn thanh toán đơn là bao lâu?',
    options: ['24 giờ từ khi đơn sẵn sàng', '7 ngày tùy chọn', 'Không giới hạn'],
    correct: 0,
  },
  {
    q: 'Nếu quá hạn thanh toán đơn trúng đấu giá do lỗi người mua, hệ thống sẽ xử lý thế nào?',
    options: [
      'Không ảnh hưởng điểm uy tín',
      'Trừ 10 điểm uy tín sau khi đối soát',
      'Tự động chuyển sang người về nhì',
    ],
    correct: 1,
  },
  {
    q: 'Ngưỡng uy tín tối thiểu để Buyer tham gia đặt giá là bao nhiêu?',
    options: ['20/100', '50/100', '75/100'],
    correct: 1,
  },
];

function tierPillClass(tier: string) {
  switch (tier) {
    case 'HIGH_TRUST':
      return 'border-emerald-300 bg-emerald-50 text-emerald-900';
    case 'GOOD':
      return 'border-teal-200 bg-teal-50 text-teal-900';
    case 'STANDARD':
      return 'border-stone-300 bg-stone-100 text-stone-800';
    case 'AUCTION_ELIGIBLE':
      return 'border-sky-200 bg-sky-50 text-sky-900';
    default:
      return 'border-red-200 bg-red-50 text-red-800';
  }
}

export function BuyerReputationPage() {
  const searchParams = useSearchParams();
  const returnTo = searchParams?.get('returnTo') ?? null;
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const { user, phase } = useSession();
  const { data, loading, error, refresh, completeRecovery, submitAppeal } = useMyReputation(true);

  const [tab, setTab] = useState<'missions' | 'history'>('missions');
  const [quizOpen, setQuizOpen] = useState(false);
  const [answers, setAnswers] = useState<number[]>([-1, -1, -1]);
  const [quizBusy, setQuizBusy] = useState(false);
  const [quizError, setQuizError] = useState('');
  const [notice, setNotice] = useState('');

  const [appealTarget, setAppealTarget] = useState<ReputationLedgerItem | null>(null);
  const [appealReason, setAppealReason] = useState('');
  const [appealEvidence, setAppealEvidence] = useState('');
  const [appealBusy, setAppealBusy] = useState(false);
  const [appealError, setAppealError] = useState('');

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  async function handleSubmitQuiz() {
    setQuizError('');
    const allCorrect = RECOVERY_QUESTIONS.every((item, idx) => answers[idx] === item.correct);
    if (!allCorrect) {
      setQuizError('Vui lòng chọn đúng cả 3 câu hỏi quy tắc để hoàn tất bài phục hồi.');
      return;
    }
    setQuizBusy(true);
    try {
      await completeRecovery();
      setQuizOpen(false);
      setNotice('Hoàn thành bài phục hồi! Hệ thống đã cộng +3 điểm uy tín.');
    } catch (err) {
      setQuizError(userMessage(err));
    } finally {
      setQuizBusy(false);
    }
  }

  async function handleSubmitAppeal() {
    if (!appealTarget) return;
    if (!appealReason.trim()) {
      setAppealError('Vui lòng nhập lý do yêu cầu xem lại.');
      return;
    }
    setAppealBusy(true);
    setAppealError('');
    try {
      await submitAppeal(appealTarget.id, appealReason.trim(), appealEvidence.trim() || undefined);
      setAppealTarget(null);
      setAppealReason('');
      setAppealEvidence('');
      setNotice('Đã gửi yêu cầu xem lại bút toán điểm tới quản trị viên.');
    } catch (err) {
      setAppealError(userMessage(err));
    } finally {
      setAppealBusy(false);
    }
  }

  return (
    <>
      <StoreHeader />
      <main className="nexus-container py-8 sm:py-10">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href={returnTo && returnTo.startsWith('/') ? returnTo : '/account'}
              className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-950"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              {returnTo && returnTo.startsWith('/auctions/') ? 'Quay lại phòng đấu' : 'Tài khoản'}
            </Link>
            {user && (
              <Button
                type="button"
                variant="outline"
                onClick={refresh}
                disabled={loading}
                className="min-h-11 rounded-xl border-stone-300"
              >
                <RefreshCw
                  className={`size-4 ${loading ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                Làm mới
              </Button>
            )}
          </div>

          <header>
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="text-2xl font-bold tracking-tight text-stone-950 outline-none focus:outline-none focus-visible:outline-none sm:text-3xl"
            >
              Uy tín của tôi
            </h1>
          </header>

          {notice && (
            <div
              role="status"
              className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900"
            >
              <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
              <span>{notice}</span>
            </div>
          )}

          {phase === 'loading' ? (
            <div className="rounded-3xl border border-line bg-white p-8 text-sm text-muted">
              Đang kiểm tra tài khoản…
            </div>
          ) : !user ? (
            <div className="rounded-3xl border border-line bg-white p-8 text-center">
              <ShieldCheck className="mx-auto size-9 text-stone-400" aria-hidden="true" />
              <p className="mt-3 text-sm text-muted">Đăng nhập để xem điểm uy tín và nhiệm vụ.</p>
              <Button
                asChild
                className="mt-5 min-h-11 rounded-xl bg-emerald-700 px-6 text-white hover:bg-emerald-800"
              >
                <Link href="/login?next=%2Faccount%2Freputation">Đăng nhập</Link>
              </Button>
            </div>
          ) : error && !data ? (
            <div className="rounded-3xl border border-red-200 bg-red-50/70 p-6 text-sm text-red-900">
              <p className="font-semibold">Chưa tải được điểm uy tín</p>
              <p className="mt-1 text-xs">{error}</p>
              <Button
                type="button"
                variant="outline"
                onClick={refresh}
                className="mt-4 min-h-11 rounded-xl bg-white"
              >
                Thử lại
              </Button>
            </div>
          ) : data ? (
            <>
              {/* Thẻ tổng quan điểm uy tín */}
              <section className="rounded-3xl border border-line bg-white p-6 shadow-xs sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-4xl font-bold tracking-tight text-stone-950 tabular-nums">
                        {data.score}
                        <span className="text-lg font-medium text-stone-400">/100</span>
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${tierPillClass(data.tier)}`}
                      >
                        {data.tierLabel}
                      </span>
                      {data.hasNoCompletedTransactions && (
                        <span className="inline-flex items-center rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs text-stone-600">
                          Chưa có giao dịch hoàn tất
                        </span>
                      )}
                    </div>

                    <div className="mt-4 h-2.5 w-full max-w-md overflow-hidden rounded-full bg-stone-100">
                      <div
                        className={`h-full rounded-full transition-all ${
                          data.score >= 75
                            ? 'bg-emerald-600'
                            : data.score >= 40
                              ? 'bg-emerald-500'
                              : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(2, data.score))}%` }}
                      />
                    </div>

                    <p className="mt-2.5 text-xs text-stone-600">
                      {!data.canBid && data.pointsToBid > 0 ? (
                        <span className="font-semibold text-red-700">
                          Còn {data.pointsToBid} điểm để mở lại quyền đặt giá (ngưỡng 50/100).
                        </span>
                      ) : data.nextTierLabel && data.pointsToNextTier > 0 ? (
                        <>
                          Còn <strong>{data.pointsToNextTier} điểm</strong> để đạt hạng{' '}
                          <strong>{data.nextTierLabel}</strong> ({data.nextTierScore}/100).
                        </>
                      ) : (
                        'Bạn đang ở mức hạng cao nhất của hệ thống.'
                      )}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-2xl border border-line bg-stone-50 px-4 py-3">
                      <span className="text-muted">Đặt giá đấu giá</span>
                      <strong
                        className={`mt-1 block ${data.canBid ? 'text-emerald-800' : 'text-red-700'}`}
                      >
                        {data.canBid ? 'Đủ điều kiện (≥ 50)' : 'Đang bị hạn chế'}
                      </strong>
                    </div>
                    <div className="rounded-2xl border border-line bg-stone-50 px-4 py-3">
                      <span className="text-muted">Giao dịch hoàn tất</span>
                      <strong className="mt-1 block tabular-nums text-stone-950">
                        {data.completedTransactions} đơn
                      </strong>
                    </div>
                  </div>
                </div>

                {data.restrictionReason && !data.canBid && (
                  <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950">
                    <AlertTriangle
                      className="mt-0.5 size-4 shrink-0 text-amber-700"
                      aria-hidden="true"
                    />
                    <span>{data.restrictionReason}</span>
                  </div>
                )}
              </section>

              {/* Tabs: Nhiệm vụ của tôi / Lịch sử điểm */}
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Mục uy tín">
                <Button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'missions'}
                  variant={tab === 'missions' ? 'default' : 'outline'}
                  onClick={() => setTab('missions')}
                  className={`min-h-11 rounded-xl ${tab === 'missions' ? 'bg-emerald-700 text-white hover:bg-emerald-800' : ''}`}
                >
                  <Sparkles className="size-4" aria-hidden="true" />
                  Nhiệm vụ của tôi
                </Button>
                <Button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'history'}
                  variant={tab === 'history' ? 'default' : 'outline'}
                  onClick={() => setTab('history')}
                  className={`min-h-11 rounded-xl ${tab === 'history' ? 'bg-emerald-700 text-white hover:bg-emerald-800' : ''}`}
                >
                  <History className="size-4" aria-hidden="true" />
                  Lịch sử điểm ({data.history.length})
                </Button>
              </div>

              {tab === 'missions' ? (
                <section aria-label="Nhiệm vụ của tôi" className="space-y-3">
                  {data.missions.length === 0 ? (
                    <div className="rounded-3xl border border-line bg-white p-8 text-center text-sm text-muted">
                      Bạn đã đạt mức uy tín tốt. Hiện không có nhiệm vụ bổ sung nào cần hoàn thành.
                    </div>
                  ) : (
                    data.missions.map((mission) => (
                      <article
                        key={mission.code}
                        className="flex flex-col justify-between gap-4 rounded-2xl border border-line bg-white p-5 sm:flex-row sm:items-center"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-sm font-semibold text-stone-950">
                              {mission.title}
                            </h2>
                            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 tabular-nums">
                              +{mission.points} điểm
                            </span>
                          </div>
                          <p className="text-xs text-stone-600">{mission.frequencyLabel}</p>
                          <p className="text-xs font-medium text-stone-800">
                            {mission.progressText}
                          </p>
                        </div>

                        <div className="shrink-0">
                          {mission.status === 'COMPLETED' ? (
                            <span className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 text-xs font-semibold text-emerald-900">
                              <CheckCircle2 className="size-4" aria-hidden="true" />
                              Đã hoàn thành
                            </span>
                          ) : mission.interactiveType === 'RECOVERY_QUIZ' ? (
                            <Button
                              type="button"
                              onClick={() => {
                                setAnswers([-1, -1, -1]);
                                setQuizError('');
                                setQuizOpen(true);
                              }}
                              className="min-h-11 rounded-xl bg-emerald-700 text-xs font-semibold text-white hover:bg-emerald-800"
                            >
                              <ClipboardCheck className="size-4" aria-hidden="true" />
                              {mission.actionLabel || 'Làm bài phục hồi'}
                            </Button>
                          ) : mission.actionHref ? (
                            <Button
                              asChild
                              variant="outline"
                              className="min-h-11 rounded-xl border-stone-300 text-xs font-semibold"
                            >
                              <Link href={mission.actionHref}>
                                {mission.actionLabel || 'Thực hiện'}
                                <ArrowUpRight className="ml-1 size-3.5" aria-hidden="true" />
                              </Link>
                            </Button>
                          ) : null}
                        </div>
                      </article>
                    ))
                  )}
                </section>
              ) : (
                <section
                  aria-label="Lịch sử điểm uy tín"
                  className="rounded-3xl border border-line bg-white"
                >
                  {data.history.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted">
                      Chưa có biến động điểm nào.
                    </div>
                  ) : (
                    <div className="divide-y divide-line">
                      {data.history.map((item) => {
                        const existingAppeal = data.appeals.find(
                          (a) => a.ledgerEntryId === item.id,
                        );
                        return (
                          <div
                            key={item.id}
                            className="flex flex-col justify-between gap-3 p-5 sm:flex-row sm:items-center"
                          >
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${
                                    item.appliedDelta > 0
                                      ? 'bg-emerald-50 text-emerald-800'
                                      : item.appliedDelta < 0
                                        ? 'bg-red-50 text-red-700'
                                        : 'bg-stone-100 text-stone-700'
                                  }`}
                                >
                                  {item.appliedDelta > 0
                                    ? `+${item.appliedDelta}`
                                    : item.appliedDelta}{' '}
                                  điểm
                                </span>
                                {item.requestedDelta !== item.appliedDelta && (
                                  <span className="text-[11px] text-stone-500">
                                    (mức gốc{' '}
                                    {item.requestedDelta > 0
                                      ? `+${item.requestedDelta}`
                                      : item.requestedDelta}
                                    , áp trần/sàn)
                                  </span>
                                )}
                                {item.reversed && (
                                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                                    Đã đảo bút toán
                                  </span>
                                )}
                              </div>
                              <p className="text-sm font-medium text-stone-900">{item.reason}</p>
                              <p className="text-xs text-stone-500 tabular-nums">
                                {item.scoreBefore} → {item.scoreAfter}/100 ·{' '}
                                {new Date(item.createdAt).toLocaleString('vi-VN')}
                              </p>
                            </div>

                            {item.appliedDelta < 0 && !item.reversed && (
                              <div className="shrink-0">
                                {existingAppeal ? (
                                  <span className="inline-flex rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900">
                                    {existingAppeal.status === 'PENDING'
                                      ? 'Đang chờ xem lại'
                                      : existingAppeal.status === 'APPROVED_REVERSED'
                                        ? 'Đã chấp thuận đảo điểm'
                                        : 'Đã từ chối khiếu nại'}
                                  </span>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setAppealTarget(item);
                                      setAppealReason('');
                                      setAppealEvidence('');
                                      setAppealError('');
                                    }}
                                    className="min-h-10 rounded-xl text-xs"
                                  >
                                    Yêu cầu xem lại
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}
            </>
          ) : null}
        </div>
      </main>

      {/* Dialog bài hướng dẫn phục hồi (+3 điểm khi < 40) */}
      <Dialog open={quizOpen} onOpenChange={setQuizOpen}>
        <DialogContent className="max-w-lg rounded-3xl">
          <DialogTitle>Hướng dẫn phục hồi uy tín (+3 điểm)</DialogTitle>
          <DialogDescription>
            Trả lời đúng 3 câu hỏi về quy tắc đấu giá để nhận +3 điểm (áp dụng 1 lần suốt tài
            khoản).
          </DialogDescription>
          <div className="mt-3 space-y-4">
            {RECOVERY_QUESTIONS.map((item, idx) => (
              <fieldset key={idx} className="space-y-2 rounded-2xl border border-line p-3.5">
                <legend className="text-xs font-semibold text-stone-900">
                  Câu {idx + 1}. {item.q}
                </legend>
                <div className="space-y-1.5">
                  {item.options.map((opt, optIdx) => (
                    <label
                      key={optIdx}
                      className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs hover:bg-stone-50"
                    >
                      <input
                        type="radio"
                        name={`recovery-q-${idx}`}
                        checked={answers[idx] === optIdx}
                        onChange={() =>
                          setAnswers((prev) => prev.map((v, i) => (i === idx ? optIdx : v)))
                        }
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            {quizError && <p className="text-xs font-medium text-red-700">{quizError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setQuizOpen(false)}>
                Đóng
              </Button>
              <Button
                type="button"
                disabled={quizBusy}
                onClick={() => void handleSubmitQuiz()}
                className="bg-emerald-700 text-white hover:bg-emerald-800"
              >
                {quizBusy ? 'Đang xác nhận…' : 'Hoàn thành & nhận +3 điểm'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Yêu cầu xem lại bút toán */}
      <Dialog open={Boolean(appealTarget)} onOpenChange={(o) => !o && setAppealTarget(null)}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogTitle>Yêu cầu xem lại bút toán điểm</DialogTitle>
          <DialogDescription>
            {appealTarget ? `${appealTarget.appliedDelta} điểm · ${appealTarget.reason}` : ''}
          </DialogDescription>
          <div className="mt-2 space-y-3">
            <label className="block text-xs font-semibold text-stone-800">
              Lý do yêu cầu xem lại
              <textarea
                rows={3}
                value={appealReason}
                onChange={(e) => setAppealReason(e.target.value)}
                placeholder="Mô tả ngắn gọn lý do bạn cho rằng bút toán cần đối soát lại…"
                className="mt-1.5 w-full rounded-xl border border-line p-2.5 text-sm font-normal"
              />
            </label>
            <label className="block text-xs font-semibold text-stone-800">
              Mã đơn / chứng từ tham chiếu (tùy chọn)
              <input
                type="text"
                value={appealEvidence}
                onChange={(e) => setAppealEvidence(e.target.value)}
                placeholder="Ví dụ: ORD-20261124-00012 hoặc mã giao dịch PayOS"
                className="mt-1.5 w-full rounded-xl border border-line px-3 py-2 text-sm font-normal"
              />
            </label>
            {appealError && <p className="text-xs font-medium text-red-700">{appealError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAppealTarget(null)}>
                Quay lại
              </Button>
              <Button
                type="button"
                disabled={appealBusy}
                onClick={() => void handleSubmitAppeal()}
                className="bg-emerald-700 text-white hover:bg-emerald-800"
              >
                {appealBusy ? 'Đang gửi…' : 'Gửi yêu cầu'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
