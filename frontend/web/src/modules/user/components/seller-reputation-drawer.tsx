'use client';

import { useEffect, useState } from 'react';
import { Award, CheckCircle2, ShieldCheck, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { requestApi } from '@/lib/axios/api-client';
import { unwrap } from '@/lib/axios/http';

type SellerPublicProfile = {
  sellerId: string;
  displayName: string;
  joinedAt?: string;
  reputationScore?: number;
  trustTierLabel?: string;
  averageRating: number | null;
  totalReviews: number;
  completedOrders?: number;
  successRate?: number;
};

type SellerReviewItem = {
  id: string;
  buyerAlias: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export function SellerReputationTrigger({
  sellerId,
  sellerName,
}: {
  sellerId?: string;
  sellerName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<SellerPublicProfile | null>(null);
  const [reviews, setReviews] = useState<SellerReviewItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!open || !sellerId) return;
    let alive = true;
    setLoading(true);

    Promise.allSettled([
      requestApi(`/users/${encodeURIComponent(sellerId)}/public-profile`),
      requestApi(`/users/${encodeURIComponent(sellerId)}/reviews?page=${page}&limit=6`),
    ])
      .then(([profileRes, reviewsRes]) => {
        if (!alive) return;
        if (profileRes.status === 'fulfilled') {
          const data = unwrap<Record<string, unknown>>(profileRes.value);
          if (data && typeof data === 'object') {
            setProfile({
              sellerId,
              displayName: String(data.displayName ?? sellerName ?? 'Gian hàng Nexus'),
              joinedAt: typeof data.joinedAt === 'string' ? data.joinedAt : undefined,
              reputationScore:
                typeof data.reputationScore === 'number' ? data.reputationScore : undefined,
              trustTierLabel:
                typeof data.trustTierLabel === 'string' ? data.trustTierLabel : undefined,
              averageRating: typeof data.averageRating === 'number' ? data.averageRating : null,
              totalReviews: Number(data.totalReviews ?? 0),
              completedOrders:
                typeof data.completedOrders === 'number' ? data.completedOrders : undefined,
              successRate: typeof data.successRate === 'number' ? data.successRate : undefined,
            });
          }
        } else {
          setProfile({
            sellerId,
            displayName: sellerName || 'Gian hàng Nexus',
            averageRating: null,
            totalReviews: 0,
          });
        }

        if (reviewsRes.status === 'fulfilled') {
          const raw = unwrap<Record<string, unknown>>(reviewsRes.value);
          const list = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];
          setReviews(
            (list as Array<Record<string, unknown>>).map((r, idx) => ({
              id: String(r.id ?? `rev-${idx}`),
              buyerAlias: String(r.buyerAlias ?? 'Người mua Nexus'),
              rating: Number(r.rating ?? 5),
              comment: String(r.comment ?? ''),
              createdAt: String(r.createdAt ?? ''),
            })),
          );
          const pag = (raw?.pagination ?? {}) as Record<string, unknown>;
          setTotalPages(Math.max(1, Number(pag.totalPages ?? 1)));
        } else {
          setReviews([]);
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [open, page, sellerId, sellerName]);

  if (!sellerId) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setPage(1);
          setOpen(true);
        }}
        className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-line bg-stone-50 px-2.5 text-xs font-semibold text-emerald-800 hover:border-emerald-300 hover:bg-emerald-50"
      >
        <ShieldCheck className="size-3.5" aria-hidden="true" />
        Xem uy tín
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto p-6 sm:max-w-lg sm:p-7">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-stone-950">
            <Award className="size-5 text-emerald-700" aria-hidden="true" />
            {profile?.displayName || sellerName || 'Hồ sơ gian hàng'}
          </DialogTitle>
          <DialogDescription className="text-xs text-stone-500">
            Thông tin uy tín và đánh giá giao dịch từ người mua trên Nexus.
          </DialogDescription>

          {loading && !profile ? (
            <p role="status" className="py-8 text-center text-sm text-muted">
              Đang tải hồ sơ gian hàng…
            </p>
          ) : (
            <div className="mt-4 space-y-5">
              <div className="grid grid-cols-3 gap-3 rounded-2xl border border-line bg-stone-50 p-4 text-center">
                <div>
                  <p className="text-[11px] text-muted">Đánh giá</p>
                  <p className="mt-1 flex items-center justify-center gap-1 text-base font-bold text-stone-950 tabular-nums">
                    {profile?.averageRating !== null && profile?.averageRating !== undefined ? (
                      <>
                        <Star className="size-4 fill-amber-400 text-amber-500" aria-hidden="true" />
                        {profile.averageRating.toFixed(1)}
                      </>
                    ) : (
                      <span className="text-xs font-medium text-muted">Chưa có</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted">Điểm uy tín</p>
                  <p className="mt-1 text-base font-bold text-emerald-800 tabular-nums">
                    {profile?.reputationScore ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted">Hoàn tất</p>
                  <p className="mt-1 text-base font-bold text-stone-950 tabular-nums">
                    {profile?.successRate !== undefined
                      ? `${profile.successRate.toFixed(0)}%`
                      : profile?.completedOrders !== undefined
                        ? `${profile.completedOrders} đơn`
                        : '—'}
                  </p>
                </div>
              </div>

              {profile?.trustTierLabel && (
                <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">
                  <CheckCircle2 className="size-3.5" aria-hidden="true" />
                  {profile.trustTierLabel}
                </p>
              )}

              <div>
                <h3 className="text-sm font-bold text-stone-900">
                  Đánh giá gần đây ({profile?.totalReviews ?? reviews.length})
                </h3>
                {reviews.length === 0 ? (
                  <p className="mt-3 rounded-xl bg-stone-50 py-6 text-center text-xs text-muted">
                    Gian hàng chưa có nhận xét nào.
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-line">
                    {reviews.map((rev) => (
                      <li key={rev.id} className="py-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-stone-900">{rev.buyerAlias}</span>
                          <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-amber-600 tabular-nums">
                            <Star className="size-3.5 fill-amber-400" aria-hidden="true" />
                            {rev.rating}/5
                          </span>
                        </div>
                        {rev.comment && (
                          <p className="mt-1 text-xs leading-5 text-stone-700">{rev.comment}</p>
                        )}
                        {rev.createdAt && (
                          <p className="mt-1 text-[11px] text-muted tabular-nums">
                            {new Date(rev.createdAt).toLocaleDateString('vi-VN')}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {totalPages > 1 && (
                  <div className="mt-3 flex items-center justify-between text-xs text-muted">
                    <span className="tabular-nums">
                      Trang {page}/{totalPages}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        Trước
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Sau
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
