import { Clock3 } from 'lucide-react';
import { auctionStatusLabel, type AuctionStatus } from '../api/auction.api';

export const auctionMoney = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

export const auctionDate = (value: number) =>
  new Date(value).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

export function getDisplayTimezoneLabel(): string {
  try {
    const offsetMin = -new Date().getTimezoneOffset();
    const sign = offsetMin >= 0 ? '+' : '-';
    const absHours = Math.floor(Math.abs(offsetMin) / 60);
    const absMins = Math.abs(offsetMin) % 60;
    const gmt = absMins
      ? `GMT${sign}${absHours}:${String(absMins).padStart(2, '0')}`
      : `GMT${sign}${absHours}`;
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return zone ? `${gmt} (${zone})` : gmt;
  } catch {
    return 'GMT+7';
  }
}

export const auctionDateWithTz = (value: number) => {
  const offsetMin = -new Date().getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const hours = Math.floor(Math.abs(offsetMin) / 60);
  return `${auctionDate(value)} (GMT${sign}${hours})`;
};

const colors: Record<AuctionStatus, string> = {
  SCHEDULED: 'bg-sky-50 text-sky-900 border border-sky-200',
  ACTIVE: 'bg-emerald-50 text-emerald-900 border border-emerald-200',
  EXTENDED: 'bg-amber-50 text-amber-950 border border-amber-300',
  ENDED: 'bg-slate-100 text-slate-700 border border-slate-200',
  CANCELLED: 'bg-red-50 text-red-800 border border-red-200',
};

export function AuctionBadge({ status }: { status: AuctionStatus }) {
  return (
    <span
      className={
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ' +
        colors[status]
      }
    >
      {status === 'EXTENDED' ? (
        <Clock3 aria-hidden="true" className="size-3.5 shrink-0" />
      ) : (
        <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      )}
      {auctionStatusLabel[status]}
    </span>
  );
}
