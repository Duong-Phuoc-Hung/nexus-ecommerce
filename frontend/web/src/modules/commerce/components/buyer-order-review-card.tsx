'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Lock, RefreshCw, Star, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { requestApi } from '@/lib/axios/api-client';
import { ApiError, unwrap, userMessage } from '@/lib/axios/http';
import type { OrderDetail } from '../types/order.types';

type SavedReview = {
  id?: string;
  rating: number;
  comment: string;
  createdAt: string;
};

type SellerEligibilityState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | {
      phase: 'ready';
      eligible: boolean;
      reasonCode: string;
      reason: string;
      openCaseId?: string | null;
      existingReview: SavedReview | null;
      canonicalOrderId: string;
    };

type Props = {
  order: OrderDetail;
  buyerId: string;
  buyerRole: string;
  hasActiveDispute: boolean;
  revision?: number;
  onViewDispute?: (caseId?: string | null) => void;
};

function StarPicker({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} sao`}
          onClick={() => onChange(star)}
          className="grid size-9 place-items-center rounded-lg transition hover:bg-amber-50 focus-visible:outline-2 focus-visible:outline-brand"
        >
          <Star
            className={`size-5 ${
              star <= value ? 'fill-amber-400 text-amber-500' : 'text-stone-300'
            }`}
            aria-hidden="true"
          />
        </button>
      ))}
      <span className="ml-2 text-xs font-semibold text-stone-700 tabular-nums">{value}/5</span>
    </div>
  );
}

export function BuyerOrderReviewCard({
  order,
  buyerId,
  buyerRole,
  hasActiveDispute,
  revision = 0,
  onViewDispute,
}: Props) {
  const canonicalOrderId = String(order.internalId || order.id || '').trim();
  const normalizedStatus = String(order.orderStatus || order.status || '').toUpperCase();
  const isPostDeliveryOrder = ['DELIVERED', 'COMPLETED'].includes(normalizedStatus);

  const [eligibility, setEligibility] = useState<SellerEligibilityState>({ phase: 'loading' });
  const [sellerRating, setSellerRating] = useState(5);
  const [sellerComment, setSellerComment] = useState('');
  const [sellerBusy, setSellerBusy] = useState(false);
  const [sellerError, setSellerError] = useState('');

  const [productDrafts, setProductDrafts] = useState<
    Record<string, { rating: number; comment: string; busy?: boolean; error?: string }>
  >({});
  const [productSaved, setProductSaved] = useState<Record<string, SavedReview>>({});

  // R1/R2/R3/R5: Kiểm tra quyền đánh giá Seller tập trung từ server (không dùng localStorage giả thành công)
  const checkSellerEligibility = useCallback(
    async (signal?: AbortSignal) => {
      if (buyerRole !== 'BUYER' || !buyerId || !canonicalOrderId || !order.sellerId) {
        setEligibility({
          phase: 'ready',
          eligible: false,
          reasonCode: 'NOT_BUYER',
          reason: 'Chỉ tài khoản Người mua của đơn hàng này mới có thể gửi đánh giá.',
          existingReview: null,
          canonicalOrderId,
        });
        return;
      }

      if (!isPostDeliveryOrder) {
        setEligibility({
          phase: 'ready',
          eligible: false,
          reasonCode: 'ORDER_NOT_DELIVERED',
          reason: 'Bạn có thể đánh giá sau khi đơn hàng được giao thành công.',
          existingReview: null,
          canonicalOrderId,
        });
        return;
      }

      setEligibility({ phase: 'loading' });
      try {
        const raw = await requestApi(
          `/users/${encodeURIComponent(order.sellerId)}/reviews/eligibility?orderId=${encodeURIComponent(canonicalOrderId)}`,
          { signal },
        );
        if (signal?.aborted) return;
        const data = unwrap<Record<string, unknown>>(raw);
        const existingRaw = data?.existingReview as Record<string, unknown> | null | undefined;
        const existingReview: SavedReview | null =
          existingRaw && typeof existingRaw === 'object'
            ? {
                id: typeof existingRaw.id === 'string' ? existingRaw.id : undefined,
                rating: Number(existingRaw.rating ?? 5),
                comment: String(existingRaw.comment ?? ''),
                createdAt: String(existingRaw.createdAt ?? ''),
              }
            : null;

        setEligibility({
          phase: 'ready',
          eligible: Boolean(data?.eligible),
          reasonCode: String(data?.reasonCode ?? (data?.eligible ? 'ELIGIBLE' : 'UNAVAILABLE')),
          reason: String(data?.reason ?? ''),
          openCaseId: typeof data?.openCaseId === 'string' ? data.openCaseId : null,
          existingReview,
          canonicalOrderId: String(data?.canonicalOrderId || canonicalOrderId),
        });
      } catch (err) {
        if (signal?.aborted) return;
        setEligibility({
          phase: 'error',
          message: userMessage(err) || 'Chưa kiểm tra được quyền đánh giá. Vui lòng thử lại.',
        });
      }
    },
    [buyerId, buyerRole, canonicalOrderId, isPostDeliveryOrder, order.sellerId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void checkSellerEligibility(controller.signal);
    return () => controller.abort();
  }, [checkSellerEligibility, hasActiveDispute, revision]);

  // R4: Tải lại đánh giá sản phẩm thật từ Catalog Service, đối chiếu đúng buyerId + orderId
  useEffect(() => {
    if (!buyerId || !canonicalOrderId || !isPostDeliveryOrder) return;
    const controller = new AbortController();

    setProductDrafts((prev) => {
      const next = { ...prev };
      for (const item of order.items) {
        if (!next[item.productId]) {
          next[item.productId] = { rating: 5, comment: '' };
        }
      }
      return next;
    });

    const candidateOrderIds = new Set(
      [order.id, order.internalId, canonicalOrderId]
        .map((v) =>
          String(v || '')
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean),
    );

    order.items.forEach((item) => {
      requestApi(`/products/${encodeURIComponent(item.productId)}/reviews`, {
        signal: controller.signal,
      })
        .then((raw) => {
          if (controller.signal.aborted) return;
          const data = unwrap<unknown>(raw);
          const list = Array.isArray(data)
            ? data
            : Array.isArray((data as Record<string, unknown>)?.reviews)
              ? ((data as Record<string, unknown>).reviews as unknown[])
              : [];

          // Ưu tiên khớp đúng (buyerId + orderId); chỉ fallback nếu review cũ không lưu orderId
          const mineForOrder = list.find((r) => {
            const row = r as Record<string, unknown>;
            const sameBuyer = String(row.userId ?? row.buyerId ?? '') === buyerId;
            if (!sameBuyer) return false;
            const rowOrderId = String(row.orderId ?? '')
              .trim()
              .toLowerCase();
            if (rowOrderId) return candidateOrderIds.has(rowOrderId);
            return false;
          }) as Record<string, unknown> | undefined;

          if (mineForOrder) {
            setProductSaved((prev) => ({
              ...prev,
              [item.productId]: {
                id: typeof mineForOrder.id === 'string' ? mineForOrder.id : undefined,
                rating: Number(mineForOrder.rating ?? 5),
                comment: String(mineForOrder.comment ?? ''),
                createdAt: String(mineForOrder.createdAt ?? ''),
              },
            }));
          }
        })
        .catch(() => {
          // Không giả lập trạng thái đã đánh giá khi lỗi tải
        });
    });

    return () => controller.abort();
  }, [buyerId, canonicalOrderId, isPostDeliveryOrder, order.id, order.internalId, order.items]);

  // Chỉ ẩn hoàn toàn khi không phải Buyer hoặc đơn chưa từng đến giai đoạn giao hàng
  if (buyerRole !== 'BUYER' || !isPostDeliveryOrder) return null;

  async function submitSellerReview() {
    if (sellerBusy || eligibility.phase !== 'ready' || !eligibility.eligible) return;
    setSellerBusy(true);
    setSellerError('');
    try {
      const raw = await requestApi(`/users/${encodeURIComponent(order.sellerId)}/reviews`, {
        method: 'POST',
        body: {
          orderId: eligibility.canonicalOrderId || canonicalOrderId,
          rating: sellerRating,
          comment: sellerComment.trim() || undefined,
        },
      });
      const saved = unwrap<Record<string, unknown>>(raw);
      setEligibility({
        phase: 'ready',
        eligible: false,
        reasonCode: 'ALREADY_REVIEWED',
        reason: 'Bạn đã đánh giá người bán cho đơn hàng này.',
        canonicalOrderId: eligibility.canonicalOrderId || canonicalOrderId,
        existingReview: {
          id: typeof saved?.id === 'string' ? saved.id : undefined,
          rating: Number(saved?.rating ?? sellerRating),
          comment: String(saved?.comment ?? sellerComment.trim()),
          createdAt: String(saved?.createdAt ?? new Date().toISOString()),
        },
      });
    } catch (err) {
      // R3 · P0: Không bao giờ lưu giả vào localStorage khi API lỗi! Giữ bản nháp để Buyer thử lại.
      if (err instanceof ApiError && err.status === 409) {
        await checkSellerEligibility();
      } else {
        setSellerError(userMessage(err));
      }
    } finally {
      setSellerBusy(false);
    }
  }

  async function submitProductReview(productId: string) {
    const draft = productDrafts[productId];
    if (!draft || draft.busy || productSaved[productId]) return;
    setProductDrafts((prev) => ({ ...prev, [productId]: { ...draft, busy: true, error: '' } }));
    try {
      const raw = await requestApi(`/products/${encodeURIComponent(productId)}/reviews`, {
        method: 'POST',
        body: {
          rating: draft.rating,
          comment: draft.comment.trim() || undefined,
          orderId: canonicalOrderId,
        },
      });
      const saved = unwrap<Record<string, unknown>>(raw);
      setProductSaved((prev) => ({
        ...prev,
        [productId]: {
          id: typeof saved?.id === 'string' ? saved.id : undefined,
          rating: Number(saved?.rating ?? draft.rating),
          comment: String(saved?.comment ?? draft.comment.trim()),
          createdAt: String(saved?.createdAt ?? new Date().toISOString()),
        },
      }));
      setProductDrafts((prev) => ({ ...prev, [productId]: { ...draft, busy: false, error: '' } }));
    } catch (err) {
      setProductDrafts((prev) => ({
        ...prev,
        [productId]: { ...draft, busy: false, error: userMessage(err) },
      }));
    }
  }

  const isLockedByDispute =
    hasActiveDispute ||
    (eligibility.phase === 'ready' && eligibility.reasonCode === 'HAS_OPEN_DISPUTE');

  return (
    <section
      id="order-review-section"
      className="scroll-mt-24 rounded-2xl border border-line bg-white p-5 shadow-xs sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <Star className="size-4 text-amber-500" aria-hidden="true" />
          <h2 className="text-sm font-bold text-stone-900 sm:text-base">
            Đánh giá người bán &amp; sản phẩm
          </h2>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => void checkSellerEligibility()}
          className="h-8 rounded-lg px-2.5 text-xs text-muted"
        >
          <RefreshCw
            className={`mr-1 size-3.5 ${eligibility.phase === 'loading' ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          Kiểm tra lại
        </Button>
      </div>

      {/* Đánh giá Người bán (tác động uy tín đối tác) */}
      <div className="mt-4 rounded-2xl border border-line bg-stone-50/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-stone-900">
            <Store className="size-4 text-brand-dark" aria-hidden="true" />
            <span>Đánh giá người bán: {order.seller || 'Gian hàng Nexus'}</span>
          </div>
          {eligibility.phase === 'ready' && eligibility.existingReview && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              Đã đánh giá
            </span>
          )}
        </div>

        {eligibility.phase === 'loading' ? (
          <p role="status" className="mt-3 text-xs text-muted">
            Đang kiểm tra điều kiện đánh giá từ máy chủ…
          </p>
        ) : eligibility.phase === 'error' ? (
          <div
            role="alert"
            className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-950"
          >
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
              {eligibility.message}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void checkSellerEligibility()}
              className="h-8 rounded-lg bg-white text-xs"
            >
              Thử lại
            </Button>
          </div>
        ) : eligibility.existingReview ? (
          <div className="mt-3 space-y-1.5 text-sm">
            <div className="flex flex-wrap items-center gap-2 text-emerald-800">
              <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
              <span className="font-semibold">
                Đã đánh giá {eligibility.existingReview.rating}/5 sao
              </span>
              {eligibility.existingReview.createdAt && (
                <span className="text-xs text-muted tabular-nums">
                  · {new Date(eligibility.existingReview.createdAt).toLocaleString('vi-VN')}
                </span>
              )}
            </div>
            {eligibility.existingReview.comment && (
              <p className="text-xs leading-5 text-stone-700">
                “{eligibility.existingReview.comment}”
              </p>
            )}
          </div>
        ) : isLockedByDispute ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs text-amber-950">
            <div className="flex items-start gap-2">
              <Lock className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden="true" />
              <span>
                Đánh giá người bán tạm khóa trong khi đơn hàng đang có khiếu nại chờ xử lý.
              </span>
            </div>
            {onViewDispute && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  onViewDispute(eligibility.phase === 'ready' ? eligibility.openCaseId : null)
                }
                className="h-8 rounded-lg border-amber-300 bg-white text-xs font-semibold text-amber-950"
              >
                Xem hồ sơ
              </Button>
            )}
          </div>
        ) : !eligibility.eligible ? (
          <p className="mt-3 text-xs text-stone-600">{eligibility.reason}</p>
        ) : (
          <div className="mt-3 space-y-3">
            <StarPicker
              value={sellerRating}
              onChange={setSellerRating}
              label="Chọn số sao đánh giá người bán"
            />
            <Textarea
              rows={2}
              maxLength={500}
              value={sellerComment}
              onChange={(e) => setSellerComment(e.target.value)}
              placeholder="Nhận xét về đóng gói, tốc độ giao hàng hoặc hỗ trợ của shop (tùy chọn)…"
              className="rounded-xl bg-white text-sm"
            />
            {sellerError && (
              <p role="alert" className="text-xs font-medium text-red-700">
                {sellerError}
              </p>
            )}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                disabled={sellerBusy}
                onClick={() => void submitSellerReview()}
                className="min-h-10 rounded-xl bg-emerald-700 px-4 text-xs font-semibold text-white hover:bg-emerald-800"
              >
                {sellerBusy ? 'Đang gửi…' : 'Gửi đánh giá người bán'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Đánh giá từng sản phẩm (Catalog) */}
      {order.items.length > 0 && !isLockedByDispute && (
        <div className="mt-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Đánh giá sản phẩm
          </p>
          {order.items.map((item, idx) => {
            const saved = productSaved[item.productId];
            const draft = productDrafts[item.productId] ?? { rating: 5, comment: '' };
            return (
              <div
                key={`${item.productId}-${idx}`}
                className="rounded-2xl border border-line bg-white p-4"
              >
                <p className="text-sm font-semibold text-stone-900">{item.productName}</p>
                {saved ? (
                  <div className="mt-2 space-y-1 text-xs">
                    <p className="flex items-center gap-1.5 font-semibold text-emerald-800">
                      <CheckCircle2 className="size-3.5" aria-hidden="true" />
                      Đã đánh giá {saved.rating}/5 sao
                      {saved.createdAt && (
                        <span className="font-normal text-muted tabular-nums">
                          · {new Date(saved.createdAt).toLocaleString('vi-VN')}
                        </span>
                      )}
                    </p>
                    {saved.comment && <p className="text-stone-700">“{saved.comment}”</p>}
                  </div>
                ) : (
                  <div className="mt-2.5 space-y-2.5">
                    <StarPicker
                      value={draft.rating}
                      onChange={(n) =>
                        setProductDrafts((prev) => ({
                          ...prev,
                          [item.productId]: { ...draft, rating: n },
                        }))
                      }
                      label={`Chọn số sao cho ${item.productName}`}
                    />
                    <Textarea
                      rows={2}
                      maxLength={500}
                      value={draft.comment}
                      onChange={(e) =>
                        setProductDrafts((prev) => ({
                          ...prev,
                          [item.productId]: { ...draft, comment: e.target.value },
                        }))
                      }
                      placeholder="Chia sẻ trải nghiệm thực tế về sản phẩm (tùy chọn)…"
                      className="rounded-xl text-sm"
                    />
                    {draft.error && (
                      <p role="alert" className="text-xs font-medium text-red-700">
                        {draft.error}
                      </p>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={Boolean(draft.busy)}
                      onClick={() => void submitProductReview(item.productId)}
                      className="min-h-9 rounded-xl border-stone-300 text-xs font-semibold"
                    >
                      {draft.busy ? 'Đang gửi…' : 'Gửi đánh giá sản phẩm'}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
