'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { orders, money, slug, Heading, DemoBanner } from '../components/support-shared';
export function SupportOrdersPage() {
  const [query, setQuery] = useState('');
  const filtered = useMemo(
    () =>
      orders.filter((order) =>
        `${order.id} ${order.buyer} ${order.email} ${order.seller}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [query],
  );
  return (
    <>
      <Heading
        label="SUPPORT STAFF / ORDERS"
        title="Tra cứu đơn hàng"
        description="Tìm theo mã đơn, tên/email Buyer hoặc tên gian hàng."
      />
      <DemoBanner />
      <section className="support-panel">
        <div className="support-toolbar">
          <label className="support-search">
            <span>⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ví dụ: NX-ORD-8021 hoặc email khách hàng"
              aria-label="Tìm đơn hàng"
            />
          </label>
          <span>{filtered.length} kết quả minh họa</span>
        </div>
        <div className="support-table-wrap">
          <table className="support-table">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Buyer</th>
                <th>Gian hàng</th>
                <th>Sản phẩm</th>
                <th>Ngày đặt</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr key={order.id}>
                  <td>
                    <strong>{order.id}</strong>
                  </td>
                  <td>
                    {order.buyer}
                    <small>{order.email}</small>
                  </td>
                  <td>{order.seller}</td>
                  <td>{order.product}</td>
                  <td>{order.date}</td>
                  <td>{money(order.total)}</td>
                  <td>
                    <span className={`support-status ${slug(order.status)}`}>{order.status}</span>
                  </td>
                  <td>
                    <Link className="support-row-link" href={`/support/orders/${order.id}`}>
                      Chi tiết
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="support-empty">Không tìm thấy đơn hàng phù hợp.</div>
          )}
        </div>
      </section>
    </>
  );
}
