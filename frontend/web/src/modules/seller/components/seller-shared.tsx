'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { products, auctions, orders, inventory } from '../fixtures/seller';
import type { OrderListItem } from '@/modules/commerce/api/orders.api';
export { products, auctions, orders, inventory } from '../fixtures/seller';
export type { Product, ProductStatus } from '../types/product.types';
export const currency = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)} ₫`;
export const statusClass = (status: string) => status.toLowerCase().replaceAll(' ', '-');

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="seller-page-heading">
      <div>
        <p className="seller-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

export function DemoNote(_props?: { message?: string }) {
  return null;
}

export function MetricCard({
  label,
  value,
  change,
  icon,
}: {
  label: string;
  value: string;
  change: string;
  icon: string;
}) {
  return (
    <article className="seller-metric">
      <span className="seller-metric-icon">{icon}</span>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{change}</small>
    </article>
  );
}

export function OrdersTable({
  compact = false,
  items,
  onViewDetail,
}: {
  compact?: boolean;
  items?: OrderListItem[];
  onViewDetail?: (id: string) => void;
}) {
  const rows = items || [];
  return (
    <div className="seller-table-wrap">
      <table className="seller-table">
        <thead>
          <tr>
            <th>Mã đơn</th>
            <th>Sản phẩm</th>
            <th>Người mua</th>
            <th>Ngày đặt</th>
            <th>Tổng tiền</th>
            <th>Trạng thái</th>
            {onViewDetail && <th />}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={onViewDetail ? 7 : 6} style={{ textAlign: 'center', padding: '24px' }}>
                Không tìm thấy đơn hàng phù hợp.
              </td>
            </tr>
          ) : (
            rows.slice(0, compact ? 2 : undefined).map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.id}</strong>
                </td>
                <td>{item.product}</td>
                <td>{item.buyer}</td>
                <td>{item.date}</td>
                <td>{currency(item.total)}</td>
                <td>
                  <span className={`seller-status ${statusClass(item.status)}`}>{item.status}</span>
                </td>
                {onViewDetail && (
                  <td>
                    <button
                      type="button"
                      className="seller-row-link"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      onClick={() => onViewDetail(item.id)}
                    >
                      Chi tiết
                    </button>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
