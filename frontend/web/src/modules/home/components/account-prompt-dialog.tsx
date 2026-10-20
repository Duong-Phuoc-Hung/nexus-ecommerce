'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useSession } from '@/modules/auth/hooks/use-session';
import { safeNextPath } from '../../../lib/utils/navigation';
import type { MarketplaceProduct } from '../types/marketplace.types';
import { MarketplaceIcon } from './marketplace-icon';
import { ProductPhoto } from './marketplace-card';
import { NexusLogo } from '@/components/layout/nexus-logo';

export function AccountPromptDialog({
  product,
  onClose,
  nextPath,
}: {
  product?: Pick<MarketplaceProduct, 'id' | 'name' | 'image' | 'imageAlt' | 'mode'>;
  nextPath?: string;
  onClose: () => void;
}) {
  const returnFocus = useRef<HTMLElement | null>(
    typeof document === 'undefined' ? null : (document.activeElement as HTMLElement),
  );
  const { user } = useSession();
  const preview = !!user && product?.mode === 'auction';
  const next = safeNextPath(
    nextPath ||
      (product?.mode === 'fixed' ? '/products/' + encodeURIComponent(product.id) : '/auctions'),
  );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocus.current?.focus();
        }}
        className="max-w-md p-0"
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-3">
          <NexusLogo className="marketplace-logo" />
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon"
              autoFocus
              aria-label="Đóng lời mời đăng nhập"
              className="grid size-11 place-items-center rounded-full text-muted hover:bg-stone-100"
            >
              <MarketplaceIcon name="close" />
            </Button>
          </DialogClose>
        </div>
        <div className="p-6 sm:p-8">
          <span className="mb-5 grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand-dark">
            <MarketplaceIcon name="users" className="size-7" />
          </span>
          <DialogTitle className="text-2xl font-bold tracking-tight">
            {preview ? (
              'Khám phá phiên đấu'
            ) : (
              <>
                Một tài khoản.
                <br />
                Thêm nhiều khám phá.
              </>
            )}
          </DialogTitle>
          <DialogDescription className="mt-3 text-sm leading-6 text-muted">
            {preview
              ? 'Thông tin tham gia phiên đang được cập nhật. Bạn có thể tiếp tục khám phá các món đồ khác.'
              : product || next.startsWith('/products/')
                ? 'Đăng nhập hoặc tạo tài khoản để tiếp tục với món đồ bạn quan tâm.'
                : 'Đăng nhập hoặc tạo tài khoản để lưu món đồ yêu thích và theo dõi những phiên đấu dành cho bạn.'}
          </DialogDescription>
          {product && (
            <div className="mt-5 flex items-center gap-3 rounded-xl border border-line bg-stone-50 p-3">
              <ProductPhoto
                product={product}
                className="size-14 shrink-0 rounded-lg object-cover"
              />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-brand-dark">
                  {product.mode === 'auction' ? 'Phiên đấu bạn quan tâm' : 'Món đồ bạn quan tâm'}
                </p>
                <p className="mt-1 line-clamp-2 text-sm font-semibold">{product.name}</p>
              </div>
            </div>
          )}
          {!preview && (
            <>
              <Button asChild variant="default" size="lg" className="mt-6 w-full">
                <a
                  href={'/login?next=' + encodeURIComponent(next)}
                  className="mt-6 flex min-h-12 items-center justify-center gap-3 rounded-xl bg-brand-dark text-sm font-semibold text-white transition hover:bg-brand"
                >
                  Đăng nhập
                  <MarketplaceIcon name="arrow" className="size-4" />
                </a>
              </Button>
              <Button asChild variant="outline" size="lg" className="mt-3 w-full">
                <a
                  href={'/register?next=' + encodeURIComponent(next)}
                  className="mt-3 flex min-h-12 items-center justify-center rounded-xl border border-line text-sm font-semibold transition hover:border-brand hover:text-brand-dark"
                >
                  Tạo tài khoản mới
                </a>
              </Button>
            </>
          )}
          <DialogClose asChild>
            <Button
              variant="ghost"
              className="mt-3 min-h-11 w-full text-xs font-medium text-muted hover:text-ink"
            >
              Tiếp tục xem trang chủ
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
