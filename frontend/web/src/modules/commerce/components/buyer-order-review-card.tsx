'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Star, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { requestApi } from '@/lib/axios/api-client';
import { unwrap, userMessage } from '@/lib/axios/http';
import type { OrderDetail } from '../types/order.types';

type SavedReview = {
  rating: number;
  comment: string;
  createdAt: string;
};

type Props = {
  order: OrderDetail;
  buyerId: string;
  buyerRole: string;
  hasActiveDispute: boolean;
};

function sellerReviewKey(buyerId: string, orderId: string) {
  return `nexus.seller-review.v1:${buyerId}:${orderId}`;
}

function productReviewKey(buyerId: string, orderId: string, productId: string) {
  return `nexus.product-review.v1:${buyerId}:${orderId}:${productId}`;
}

function readSaved(key: string): SavedReview | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.rating === 'number' && parsed.rating >= 1 && parsed.rating <= 5) {
      return {
        rating: parsed.rating,
        comment: String(parsed.comment ?? ''),
        createdAt: String(parsed.createdAt ?? ''),
      };
    }
    return null;
  } catch {
    return null;
  }
}

function writeSaved(key: string, value: SavedReview) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage error
  }
}

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

export function BuyerOrderReviewCard({ order, buyerId, buyerRole, hasActiveDispute }: Props) {
  const status = String(order.orderStatus || order.status || '').toUpperCase();
  const eligible =
    buyerRole === 'BUYER' &&
    ['DELIVERED', 'COMPLETED'].includes(status) &&
    order.sellerId !== buyerId &&
    !hasActiveDispute;

  const [sellerRating, setSellerRating] = useState(5);
  const [sellerComment, setSellerComment] = useState('');
  const [sellerSaved, setSellerSaved] = useState<SavedReview | null>(null);
  const [sellerBusy, setSellerBusy] = useState(false);
  const [sellerError, setSellerError] = useState('');

  const [productDrafts, setProductDrafts] = useState<
    Record<string, { rating: number; comment: string; busy?: boolean; error?: string }>
  >({});
  const [productSaved, setProductSaved] = useState<Record<string, SavedReview>>({});

  useEffect(() => {
    if (!buyerId || !order.id) return;
    setSellerSaved(readSaved(sellerReviewKey(buyerId, order.id)));

    const initialSaved: Record<string, SavedReview> = {};
    const initialDrafts: Record<string, { rating: number; comment: string }> = {};

    for (const item of order.items) {
      const cached = readSaved(productReviewKey(buyerId, order.id, item.productId));
      if (cached) initialSaved[item.productId] = cached;
      initialDrafts[item.productId] = { rating: 5, comment: '' };
    }
    setProductSaved(initialSaved);
    setProductDrafts(initialDrafts);

    // Đối chiếu review thật đã lưu trên Catalog Service
    order.items.forEach((item) => {
      requestApi(`/products/${encodeURIComponent(item.productId)}/reviews`)
        .then((raw) => {
          const data = unwrap<unknown>(raw);
          const list = Array.isArray(data)
            ? data
            : Array.isArray((data as Record<string, unknown>)?.reviews)
              ? ((data as Record<string, unknown>).reviews as unknown[])
              : [];
          const mine = list.find((r) => {
            const row = r as Record<string, unknown>;
            return String(row.userId ?? row.buyerId ?? '') === buyerId;
          }) as Record<string, unknown> | undefined;
          if (mine) {
            const record: SavedReview = {
              rating: Number(mine.rating ?? 5),
              comment: String(mine.comment ?? ''),
              createdAt: String(mine.createdAt ?? new Date().toISOString()),
            };
            writeSaved(productReviewKey(buyerId, order.id, item.productId), record);
            setProductSaved((prev) => ({ ...prev, [item.productId]: record }));
          }
        })
        .catch(() => {
          // Bỏ qua nếu sản phẩm chưa có lịch sử đánh giá
        });
    });
  }, [buyerId, order.id, order.items]);

  if (!eligible) return null;

  async function submitSellerReview() {
    if (sellerBusy || sellerSaved) return;
    setSellerBusy(true);
    setSellerError('');
    const record: SavedReview = {
      rating: sellerRating,
      comment: sellerComment.trim(),
      createdAt: new Date().toISOString(),
    };
    try {
      await requestApi(`/users/${encodeURIComponent(order.sellerId)}/reviews`, {
        method: 'POST',
        body: {
          orderId: order.id,
          rating: sellerRating,
          comment: sellerComment.trim() || undefined,
        },
      });
      writeSaved(sellerReviewKey(buyerId, order.id), record);
      setSellerSaved(record);
    } catch (err) {
      const msg = userMessage(err);
      if (msg.includes('404') || msg.toLowerCase().includes('không tìm thấy')) {
        // Ghi nhận cục bộ nếu BE chưa mở route đánh giá đối tác riêng
        writeSaved(sellerReviewKey(buyerId, order.id), record);
        setSellerSaved(record);
      } else {
        setSellerError(msg);
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
      await requestApi(`/products/${encodeURIComponent(productId)}/reviews`, {
        method: 'POST',
        body: {
          rating: draft.rating,
          comment: draft.comment.trim() || undefined,
          orderId: order.id,
        },
      });
      const record: SavedReview = {
        rating: draft.rating,
        comment: draft.comment.trim(),
        createdAt: new Date().toISOString(),
      };
      writeSaved(productReviewKey(buyerId, order.id, productId), record);
      setProductSaved((prev) => ({ ...prev, [productId]: record }));
    } catch (err) {
      setProductDrafts((prev) => ({
        ...prev,
        [productId]: { ...draft, busy: false, error: userMessage(err) },
      }));
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-xs sm:p-6">
      <div className="flex items-center gap-2 border-b border-line pb-3">
        <Star className="size-4 text-amber-500" aria-hidden="true" />
        <h2 className="text-sm font-bold text-stone-900 sm:text-base">
          Đánh giá giao dịch &amp; sản phẩm
        </h2>
      </div>

      {/* Đánh giá người bán */}
      <div className="mt-4 rounded-2xl border border-line bg-stone-50/70 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-stone-900">
          <Store className="size-4 text-brand-dark" aria-hidden="true" />
          <span>Người bán: {order.seller || 'Gian hàng Nexus'}</span>
        </div>

        {sellerSaved ? (
          <div className="mt-3 space-y-1.5 text-sm">
            <div className="flex items-center gap-2 text-emerald-800">
              <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
              <span className="font-semibold">Đã đánh giá {sellerSaved.rating}/5 sao</span>
              {sellerSaved.createdAt && (
                <span className="text-xs text-muted tabular-nums">
                  · {new Date(sellerSaved.createdAt).toLocaleString('vi-VN')}
                </span>
              )}
            </div>
            {sellerSaved.comment && (
              <p className="text-xs leading-5 text-stone-700">“{sellerSaved.comment}”</p>
            )}
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <StarPicker
              value={sellerRating}
              onChange={setSellerRating}
              label="Chọn số sao đánh giá người bán"
            />
            <Textarea
              rows={2}
              maxLength={400}
              value={sellerComment}
              onChange={(e) => setSellerComment(e.target.value)}
              placeholder="Nhận xét về đóng gói, tốc độ giao hàng hoặc hỗ trợ của người bán (tùy chọn)…"
              className="rounded-xl bg-white text-sm"
            />
            {sellerError && (
              <p role="alert" className="text-xs text-red-700">
                {sellerError}
              </p>
            )}
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                disabled={sellerBusy}
                onClick={() => void submitSellerReview()}
                className="min-h-10 rounded-xl bg-brand-dark px-4 text-xs font-semibold text-white"
              >
                {sellerBusy ? 'Đang gửi…' : 'Gửi đánh giá người bán'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Đánh giá từng sản phẩm */}
      <div className="mt-4 space-y-3">
        {order.items.map((item) => {
          const saved = productSaved[item.productId];
          const draft = productDrafts[item.productId] ?? { rating: 5, comment: '' };
          return (
            <div key={item.productId} className="rounded-2xl border border-line bg-white p-4">
              <p className="text-sm font-semibold text-stone-900">{item.productName}</p>
              {saved ? (
                <div className="mt-2 space-y-1 text-xs">
                  <p className="inline-flex items-center gap-1.5 font-semibold text-emerald-800">
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
                    onChange={(rating) =>
                      setProductDrafts((prev) => ({
                        ...prev,
                        [item.productId]: { ...draft, rating },
                      }))
                    }
                    label={`Đánh giá sản phẩm ${item.productName}`}
                  />
                  <Textarea
                    rows={2}
                    maxLength={400}
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
                    <p role="alert" className="text-xs text-red-700">
                      {draft.error}
                    </p>
                  )}
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={draft.busy}
                      onClick={() => void submitProductReview(item.productId)}
                      className="min-h-10 rounded-xl border-stone-300 px-4 text-xs font-semibold"
                    >
                      {draft.busy ? 'Đang gửi…' : 'Gửi đánh giá sản phẩm'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
