'use client';

import { useEffect, useRef } from 'react';
import type { MarketplaceProduct } from '../types/marketplace.types';
import { MarketplaceIcon } from './marketplace-icon';
import { ProductPhoto } from './marketplace-card';
import { NexusLogo } from '@/shared/components/nexus-logo';

export function AccountPromptDialog({
  product,
  onClose,
}: {
  product?: MarketplaceProduct;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (element && !element.open) element.showModal();
    return () => {
      document.body.style.overflow = overflow;
      // React removes the dialog on unmount. Closing it here also fires onClose
      // during Strict Mode's effect replay and can dismiss the newly opened prompt.
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      onClose={(event) => {
        // Strict Mode can queue a cleanup close event before the dialog is reopened.
        if (!event.currentTarget.open) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialog.current?.close();
      }}
      aria-labelledby="account-prompt-title"
      aria-describedby="account-prompt-description"
      className="marketplace-dialog m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-3xl border-0 bg-white p-0 text-ink shadow-2xl"
    >
      <div className="flex items-center justify-between border-b border-line px-6 py-3">
        <NexusLogo className="marketplace-logo" />
        <button
          autoFocus
          aria-label="Đóng lời mời đăng nhập"
          onClick={() => dialog.current?.close()}
          className="grid size-11 place-items-center rounded-full text-muted hover:bg-stone-100"
        >
          <MarketplaceIcon name="close" />
        </button>
      </div>
      <div className="p-6 sm:p-8">
        <span className="mb-5 grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand-dark">
          <MarketplaceIcon name="users" className="size-7" />
        </span>
        <h2 id="account-prompt-title" className="text-2xl font-bold tracking-tight">
          Một tài khoản.
          <br />
          Thêm nhiều khám phá.
        </h2>
        <p id="account-prompt-description" className="mt-3 text-sm leading-6 text-muted">
          {product
            ? 'Đăng nhập hoặc tạo tài khoản để xem chi tiết món đồ bạn quan tâm và tiếp tục khám phá Nexus.'
            : 'Đăng nhập hoặc tạo tài khoản để lưu món đồ yêu thích và theo dõi những phiên đấu dành cho bạn.'}
        </p>
        {product && (
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-line bg-stone-50 p-3">
            <ProductPhoto product={product} className="size-14 shrink-0 rounded-lg object-cover" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-dark">
                {product.mode === 'auction' ? 'Phiên đấu bạn quan tâm' : 'Món đồ bạn quan tâm'}
              </p>
              <p className="mt-1 line-clamp-2 text-sm font-semibold">{product.name}</p>
            </div>
          </div>
        )}
        <a
          href="/login"
          className="mt-6 flex min-h-12 items-center justify-center gap-3 rounded-xl bg-brand-dark text-sm font-semibold text-white transition hover:bg-brand"
        >
          Đăng nhập
          <MarketplaceIcon name="arrow" className="size-4" />
        </a>
        <a
          href="/register"
          className="mt-3 flex min-h-12 items-center justify-center rounded-xl border border-line text-sm font-semibold transition hover:border-brand hover:text-brand-dark"
        >
          Tạo tài khoản mới
        </a>
        <button
          onClick={() => dialog.current?.close()}
          className="mt-3 min-h-11 w-full text-xs font-medium text-muted hover:text-ink"
        >
          Tiếp tục xem trang chủ
        </button>
      </div>
    </dialog>
  );
}
