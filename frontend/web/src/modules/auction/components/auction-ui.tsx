import { auctionStatusLabel, type AuctionStatus } from '../api/auction.api';
export const auctionMoney = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
export const auctionDate = (value: number) => new Date(value).toLocaleString('vi-VN');
const colors: Record<AuctionStatus, string> = {
  SCHEDULED: 'bg-blue-50 text-blue-800',
  ACTIVE: 'bg-emerald-50 text-emerald-800',
  ENDED: 'bg-slate-100 text-slate-700',
  CANCELLED: 'bg-red-50 text-red-800',
};
export function AuctionBadge({ status }: { status: AuctionStatus }) {
  return (
    <span
      className={
        'inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ' +
        colors[status]
      }
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {auctionStatusLabel[status]}
    </span>
  );
}
