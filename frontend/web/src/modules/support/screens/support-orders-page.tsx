'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { ordersApi, type OrderListItem } from '@/modules/commerce/api/orders.api';
import { userMessage } from '@/lib/axios/http';
import { money, slug, Heading, DemoBanner } from '../components/support-shared';

export function SupportOrdersPage() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const search = useDebouncedValue(query, 500);
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    ordersApi
      .list(
        {
          q: search.trim() || undefined,
          status: status !== 'ALL' ? status : undefined,
          limit: 50,
        },
        controller.signal,
      )
      .then((page) => setOrders(page.items))
      .catch((err) => !controller.signal.aborted && setError(userMessage(err)))
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [search, status]);

  return (
    <>
      <Heading
        label="SUPPORT STAFF / ORDERS"
        title="Tra cứu đơn hàng"
        description="Tìm theo mã đơn, tên/email Buyer hoặc tên gian hàng."
      />
      <DemoBanner message="Danh sách đơn hàng được tải từ Commerce API." />
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
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.7rem',
              color: '#687386',
            }}
          >
            Trạng thái:
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{
                padding: '6px 10px',
                border: '1px solid #e1e5ea',
                borderRadius: '6px',
                background: 'white',
                fontSize: '0.7rem',
                color: '#334055',
              }}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING">Chờ xử lý (PENDING)</option>
              <option value="PROCESSING">Đang xử lý (PROCESSING)</option>
              <option value="SHIPPED">Đang giao (SHIPPED)</option>
              <option value="DELIVERED">Đã giao (DELIVERED)</option>
              <option value="CANCELLED">Đã hủy (CANCELLED)</option>
            </select>
          </label>
          <span style={{ marginLeft: 'auto' }}>
            {loading ? 'Đang tải…' : `${orders.length} kết quả`}
          </span>
        </div>
        {error ? (
          <div className="support-empty">{error}</div>
        ) : (
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
                {(orders || []).map((order) => (
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
            {!loading && orders.length === 0 && (
              <div className="support-empty">Không tìm thấy đơn hàng phù hợp.</div>
            )}
          </div>
        )}
      </section>
    </>
  );
}
