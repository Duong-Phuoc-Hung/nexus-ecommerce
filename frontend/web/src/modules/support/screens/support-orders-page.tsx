'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { ordersApi, type OrderListItem } from '@/modules/commerce/api/orders.api';
import { userMessage } from '@/lib/axios/http';
import { money, slug, supportStatusClass, Heading, DemoBanner } from '../components/support-shared';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function getOrderStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'Chờ xử lý';
    case 'PROCESSING':
      return 'Đang xử lý';
    case 'SHIPPED':
      return 'Đang giao hàng';
    case 'DELIVERED':
      return 'Đã giao hàng';
    case 'CANCELLED':
      return 'Đã hủy';
    case 'REFUNDED':
      return 'Đã hoàn tiền';
    case 'REFUND_CANCELLED':
      return 'Đã từ chối hoàn tiền';
    default:
      return status;
  }
}

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
        label="BỘ PHẬN HỖ TRỢ / ĐƠN HÀNG"
        title="Tra cứu đơn hàng"
        description="Tìm theo mã đơn, thông tin khách hàng (Người mua) hoặc gian hàng đối tác."
      />
      <DemoBanner message="Danh sách đơn hàng được tải trực tiếp qua Commerce API." />
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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.75rem',
              color: '#687386',
            }}
          >
            <span>Trạng thái:</span>
            <div style={{ minWidth: 180 }}>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger aria-label="Lọc theo trạng thái">
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                  <SelectItem value="PENDING">Chờ xử lý</SelectItem>
                  <SelectItem value="PROCESSING">Đang xử lý</SelectItem>
                  <SelectItem value="SHIPPED">Đang giao hàng</SelectItem>
                  <SelectItem value="DELIVERED">Đã giao hàng</SelectItem>
                  <SelectItem value="CANCELLED">Đã hủy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
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
                  <th>Khách hàng</th>
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
                      <span className={`support-status ${supportStatusClass(order.status)}`}>
                        {getOrderStatusLabel(order.status)}
                      </span>
                    </td>
                    <td>
                      <Link className="support-row-link" href={`/support/orders/${order.id}`}>
                        Xem chi tiết
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
