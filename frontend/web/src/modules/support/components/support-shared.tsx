'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { cases, orders, users, shipments } from '../fixtures/support';
import type { SupportCase } from '../api/support.api';
export { cases, orders, users, shipments } from '../fixtures/support';
export const money = (amount: number) => `${new Intl.NumberFormat('vi-VN').format(amount)} ₫`;
export const slug = (value: string) => value.toLowerCase().replaceAll(' ', '-');

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
