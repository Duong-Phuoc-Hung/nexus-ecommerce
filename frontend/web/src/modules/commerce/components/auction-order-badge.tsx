'use client';

import Link from 'next/link';
import { ArrowUpRight, Gavel } from 'lucide-react';
import { isAuctionOrder } from '../api/orders.api';

export type AuctionOrderMeta = {
  id?: string;
  orderCode?: string;
  orderSource?: string;
  auctionId?: string | null;
  auctionWinningBid?: number | null;
};

export function AuctionOrderBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-900 ${className}`}
    >
      <Gavel className="size-3 shrink-0 text-violet-700" aria-hidden="true" />
      Đấu giá
    </span>
  );
}

export function AuctionOrderSourceBanner({
  order,
  adminMode = false,
}: {
  order?: AuctionOrderMeta | null;
  adminMode?: boolean;
}) {
  if (!isAuctionOrder(order)) return null;
  const auctionId = order?.auctionId ? String(order.auctionId).trim() : '';
  const href = auctionId
    ? adminMode
      ? `/admin/auctions/${encodeURIComponent(auctionId)}`
      : `/auctions/${encodeURIComponent(auctionId)}`
    : null;
  const winningBid =
    typeof order?.auctionWinningBid === 'number' && order.auctionWinningBid > 0
      ? order.auctionWinningBid
      : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-violet-200 bg-violet-50/70 px-3.5 py-2.5 text-xs text-violet-950">
      <div className="flex flex-wrap items-center gap-2">
        <AuctionOrderBadge />
        <span className="font-medium">
          Nguồn đơn:{' '}
          {href ? (
            <Link
              href={href}
              className="inline-flex items-center gap-0.5 font-semibold text-violet-900 underline underline-offset-4 hover:text-violet-700"
            >
              Phiên đấu giá #{auctionId}
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          ) : (
            <strong>Phiên đấu giá Nexus</strong>
          )}
        </span>
      </div>
      {winningBid !== null && (
        <span className="font-semibold tabular-nums text-violet-900">
          Giá chốt: {new Intl.NumberFormat('vi-VN').format(winningBid)} ₫
        </span>
      )}
    </div>
  );
}
