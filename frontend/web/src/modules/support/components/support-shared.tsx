'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { cases, orders, users, shipments } from '../fixtures/support';
import type { SupportCase } from '../api/support.api';
export { cases, orders, users, shipments } from '../fixtures/support';
export const money = (amount: number) => `${new Intl.NumberFormat('vi-VN').format(amount)} ₫`;
export const slug = (value: string) => value.toLowerCase().replaceAll(' ', '-');

export function supportStatusClass(status?: string): string {
  if (!status) return 'status-default';
  const s = status.toUpperCase().trim().replace(/[\s-]/g, '_');
  switch (s) {
    // Orders
    case 'PENDING':
    case 'CHỜ_XỬ_LÝ':
      return 'status-pending';
    case 'PROCESSING':
    case 'ĐANG_XỬ_LÝ':
      return 'status-processing';
    case 'SHIPPED':
    case 'ĐANG_GIAO_HÀNG':
    case 'ĐANG_GIAO':
      return 'status-shipped';
    case 'DELIVERED':
    case 'ĐÃ_GIAO_HÀNG':
    case 'ĐÃ_GIAO':
    case 'HOÀN_TẤT':
      return 'status-delivered';
    case 'CANCELLED':
    case 'ĐÃ_HỦY':
      return 'status-cancelled';
    case 'REFUNDED':
    case 'ĐÃ_HOÀN_TIỀN':
      return 'status-refunded';

    // Shipments
    case 'READY_TO_PICK':
    case 'CHỜ_LẤY_HÀNG':
      return 'status-ready-to-pick';
    case 'PICKED':
    case 'ĐÃ_LẤY_HÀNG':
      return 'status-picked';
    case 'IN_TRANSIT':
    case 'ĐANG_VẬN_CHUYỂN':
      return 'status-in-transit';
    case 'OUT_FOR_DELIVERY':
    case 'ĐANG_GIAO_HÀNG':
      return 'status-out-for-delivery';
    case 'FAILED':
    case 'GIAO_HÀNG_THẤT_BẠI':
      return 'status-failed';
    case 'RETURNED':
    case 'ĐÃ_TRẢ_HÀNG':
      return 'status-returned';

    // Users
    case 'ACTIVE':
    case 'ĐANG_HOẠT_ĐỘNG':
    case 'HOẠT_ĐỘNG':
      return 'status-active';
    case 'INACTIVE':
    case 'NGỪNG_HOẠT_ĐỘNG':
      return 'status-inactive';
    case 'LOCKED':
    case 'SUSPENDED':
    case 'BANNED':
    case 'TẠM_KHÓA':
      return 'status-locked';

    default:
      return slug(status);
  }
}

export function Heading({
  label,
  title,
  description,
  action,
}: {
  label: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="support-heading">
      <div>
        <p className="support-eyebrow">{label}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

export function DemoBanner(_props?: { message?: string }) {
  return null;
}

export function CaseTable({ compact = false, items }: { compact?: boolean; items: SupportCase[] }) {
  return (
    <div className="support-table-wrap">
      <table className="support-table">
        <thead>
          <tr>
            <th>Mã yêu cầu</th>
            <th>Loại</th>
            <th>Đơn liên quan</th>
            <th>Người gửi</th>
            <th>Nội dung</th>
            <th>Ưu tiên</th>
            <th>Thời gian chờ</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.slice(0, compact ? 3 : undefined).map((item) => (
            <tr key={item.id}>
              <td>
                <strong>{item.id}</strong>
              </td>
              <td>{item.type}</td>
              <td>
                <Link className="support-inline-link" href={`/support/orders/${item.order}`}>
                  {item.order}
                </Link>
              </td>
              <td>{item.customer}</td>
              <td>{item.reason}</td>
              <td>
                <span className={`support-priority ${slug(item.priority)}`}>{item.priority}</span>
              </td>
              <td>{item.age}</td>
              <td>
                <Link className="support-row-link" href={`/support/orders/${item.order}`}>
                  Mở hồ sơ
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
