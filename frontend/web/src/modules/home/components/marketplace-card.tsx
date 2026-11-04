'use client';
import { Button } from '@/components/ui/button';

import type { MarketplaceProduct } from '../types/marketplace.types';
import { MarketplaceIcon } from './marketplace-icon';

export const money = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)} ₫`;
export function timeLeft(seconds: number) {
  const value = Math.max(0, seconds);
  return [Math.floor(value / 3600), Math.floor((value % 3600) / 60), value % 60]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
}
export function ProductPhoto({
  product,
  className = '',
  priority = false,
}: {
  product: Pick<MarketplaceProduct, 'image' | 'imageAlt'>;
  className?: string;
  priority?: boolean;
}) {
  return (
    <img
      src={product.image}
      alt={product.imageAlt}
      width={800}
      height={800}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={className}
      onError={(event) => {
        if (!event.currentTarget.src.endsWith('/images/nexus-product-placeholder.svg'))
          event.currentTarget.src = '/images/nexus-product-placeholder.svg';
      }}
    />
  );
}
export function MarketplaceCard({
  product,
  elapsed,
  favorite,
  canFavorite,
  onFavorite,
  onOpen,
  compact = false,
}: {
  product: MarketplaceProduct;
  elapsed: number;
  favorite: boolean;
  canFavorite: boolean;
  onFavorite: () => void;
  onOpen: () => void;
  compact?: boolean;
}) {
  const ended =
    product.mode === 'auction' &&
    product.status === 'active' &&
    product.remainingSeconds <= elapsed;
  return (
    <article className="group overflow-hidden rounded-2xl border border-line bg-white transition duration-200 hover:-translate-y-1 hover:border-brand/30 hover:shadow-lg motion-reduce:transform-none">
      <div
        className={`relative overflow-hidden bg-stone-100 ${compact ? 'aspect-[5/4]' : 'aspect-square'}`}
      >
        <Button
          variant="ghost"
          size="plain"
          onClick={onOpen}
          className="block size-full"
          aria-label={`Xem ${product.name}`}
        >
          <ProductPhoto
            product={product}
            className="size-full object-cover transition duration-500 group-hover:scale-105 motion-reduce:transform-none"
          />
        </Button>
        {product.mode === 'auction' && (
          <span className="absolute left-3 top-3 rounded-md bg-brand-dark px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            {product.status === 'scheduled' ? 'Sắp mở phiên' : ended ? 'Đã kết thúc' : 'Đấu giá'}
          </span>
        )}
        {canFavorite && (
          <Button
            variant="ghost"
            size="plain"
            onClick={onFavorite}
            aria-label={`${favorite ? 'Bỏ lưu' : 'Lưu'} ${product.name}`}
            aria-pressed={favorite}
            className={`absolute right-2 top-2 grid size-11 place-items-center rounded-full bg-white/95 shadow-sm transition hover:text-brand ${favorite ? 'text-brand' : 'text-ink/65'}`}
          >
            <MarketplaceIcon name="heart" className="size-[18px]" filled={favorite} />
          </Button>
        )}
        {product.mode === 'auction' && (
          <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 rounded-lg bg-white/95 px-3 py-2 text-xs font-semibold text-ink shadow-sm">
            <span className="flex items-center gap-1.5">
              <MarketplaceIcon name="clock" className="size-3.5" />
              {product.status === 'scheduled' ? 'Mở sau' : ended ? 'Hết thời gian' : 'Còn lại'}
            </span>
            <span className="font-mono text-brand-dark tabular-nums">
              {timeLeft(product.remainingSeconds - elapsed)}
            </span>
          </div>
        )}
      </div>
      <div className="p-3 sm:p-4">
        <p className="mb-1.5 text-[11px] font-medium text-muted">
          {product.categoryName} <span className="mx-1 text-line">/</span>{' '}
          {product.condition.split(' · ')[0]}
        </p>
        <Button
          variant="ghost"
          size="plain"
          onClick={onOpen}
          className="mb-3 min-h-11 text-left text-[14px] font-semibold leading-5 text-ink hover:text-brand-dark"
        >
          <span className="line-clamp-2">{product.name}</span>
        </Button>
        {product.mode === 'auction' && (
          <p className="text-[11px] text-muted">
            {product.status === 'scheduled' ? 'Giá khởi điểm' : 'Giá hiện tại'}
          </p>
        )}
        <p className="mt-1 text-lg font-bold tracking-tight text-brand-dark">
          {money(product.price)}
        </p>
        {product.mode === 'fixed' && (
          <p className="mt-2 flex items-center gap-1 text-[11px] text-muted">
            <MarketplaceIcon name="star" className="size-3 text-amber-600" filled />
            <span>{product.rating?.toFixed(1) ?? '4.8'}</span>
            <span className="mx-1 text-line">|</span>
            <span>Đã bán {product.soldCount ?? 24}</span>
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-[10px] text-muted">
          <span className="truncate">{product.seller}</span>
          <span>
            {product.mode === 'auction'
              ? product.bidCountKnown === false
                ? 'Lượt trả giá đang cập nhật'
                : `${product.bids} lượt trả giá`
              : product.location}
          </span>
        </div>
        <Button
          variant="ghost"
          size="plain"
          onClick={onOpen}
          className={`mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg text-xs font-bold transition ${compact ? 'bg-brand-soft text-brand-dark hover:bg-brand hover:text-white' : 'border border-line text-ink hover:border-brand hover:text-brand-dark'}`}
        >
          {product.mode === 'auction' ? 'Xem phiên đấu' : 'Xem sản phẩm'}
          <MarketplaceIcon name="arrow" className="size-3.5" />
        </Button>
      </div>
    </article>
  );
}
