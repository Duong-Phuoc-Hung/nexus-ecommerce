'use client';
import { useEffect, useState } from 'react';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { ordersApi, type OrderListItem, type OrderDetail } from '@/modules/commerce/api/orders.api';
import { userMessage } from '@/lib/axios/http';
import { useSession } from '@/modules/auth/hooks/use-session';
import {
  PageHeading,
  DemoNote,
  OrdersTable,
  currency,
  statusClass,
} from '../components/seller-shared';

export function SellerOrdersPage() {
  const { user } = useSession();
  const [items, setItems] = useState<OrderListItem[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const search = useDebouncedValue(query, 500);

  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [cancelActing, setCancelActing] = useState(false);
  const [actionNotice, setActionNotice] = useState('');
  const [actionError, setActionError] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    if (!user?.id) {
      setLoading(false);
      setError('Vui lòng đăng nhập tài khoản Seller để xem đơn hàng.');
      return () => controller.abort();
    }
    setLoading(true);
    setError('');
    ordersApi
      .list(
        {
          sellerId: user.id,
          q: search.trim() || undefined,
          status: status !== 'ALL' ? status : undefined,
          limit: 50,
        },
        controller.signal,
      )
      .then((page) => setItems(page.items))
      .catch((err) => !controller.signal.aborted && setError(userMessage(err)))
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [user?.id, search, status]);

  async function handleViewDetail(orderId: string) {
    setDetailLoading(true);
    setActionNotice('');
    setActionError('');
    try {
      const detail = await ordersApi.getById(orderId);
      setSelectedOrder(detail);
    } catch (err) {
      setActionError(userMessage(err));
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleCancelOrder(orderId: string) {
    const reason = window.prompt(
      'Nhập lý do hủy đơn hàng:',
      'Người bán hết hàng hoặc thay đổi thỏa thuận',
    );
    if (reason === null || !reason.trim()) return;

    setCancelActing(true);
    setActionNotice('');
    setActionError('');
    try {
      const updated = await ordersApi.cancel(orderId, reason.trim());
      setSelectedOrder(updated);
      setItems((prev) =>
        prev.map((item) => (item.id === updated.id ? { ...item, status: updated.status } : item)),
      );
      setActionNotice('Đơn hàng đã được hủy thành công.');
    } catch (err) {
      setActionError(userMessage(err));
    } finally {
      setCancelActing(false);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="SELLER CENTER / ORDERS"
        title="Đơn hàng"
        description="Quản lý và tra cứu đơn hàng của gian hàng từ Commerce API."
      />
      <DemoNote message="Dữ liệu đơn hàng và chi tiết kết nối trực tiếp với Commerce Service." />

      <section className="seller-panel">
        <div className="seller-panel-heading">
          <div>
            <p className="seller-eyebrow">ĐƠN HÀNG CỦA SHOP</p>
            <h2>Danh sách đơn</h2>
          </div>
          <span className="seller-muted">{loading ? 'Đang tải…' : `${items.length} đơn hàng`}</span>
        </div>

        <div className="seller-toolbar">
          <label className="seller-search">
            <span>⌕</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo mã đơn, sản phẩm hoặc người mua"
              aria-label="Tìm đơn hàng"
            />
          </label>

          <label className="seller-filter">
            Trạng thái
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="ALL">Tất cả</option>
              <option value="PENDING">Chờ xử lý (PENDING)</option>
              <option value="PROCESSING">Đang xử lý (PROCESSING)</option>
              <option value="SHIPPED">Đang giao (SHIPPED)</option>
              <option value="DELIVERED">Đã giao (DELIVERED)</option>
              <option value="CANCELLED">Đã hủy (CANCELLED)</option>
            </select>
          </label>

          <span className="seller-result-count">
            {loading ? 'Đang lọc…' : `${items.length} kết quả`}
          </span>
        </div>

        {loading ? (
          <p className="seller-readonly-note" style={{ padding: '20px' }}>
            Đang tải đơn hàng…
          </p>
        ) : error ? (
          <p className="seller-readonly-note" style={{ padding: '20px', color: '#c51c25' }}>
            {error}
          </p>
        ) : (
          <OrdersTable items={items} onViewDetail={handleViewDetail} />
        )}
      </section>

      {detailLoading && (
        <section className="seller-panel" style={{ padding: '20px' }}>
          <p className="seller-readonly-note">Đang tải chi tiết đơn hàng…</p>
        </section>
      )}

      {selectedOrder && (
        <section className="seller-panel" style={{ padding: '20px' }}>
          <div
            className="seller-panel-heading"
            style={{ margin: '-20px -20px 20px', borderBottom: '1px solid #edf0f3' }}
          >
            <div>
              <p className="seller-eyebrow">ORDER DETAIL · COMMERCE API</p>
              <h2>Mã đơn: {selectedOrder.id}</h2>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span className={`seller-status ${statusClass(selectedOrder.status)}`}>
                {selectedOrder.status}
              </span>
              <button
                type="button"
                className="seller-button seller-button-quiet"
                onClick={() => setSelectedOrder(null)}
              >
                Đóng
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '20px',
            }}
          >
            <div>
              <small style={{ color: '#8d97a5', display: 'block', fontSize: '0.7rem' }}>
                Người mua
              </small>
              <strong style={{ color: '#263247' }}>{selectedOrder.buyer}</strong>
              <span style={{ display: 'block', color: '#687386', fontSize: '0.72rem' }}>
                {selectedOrder.email}
              </span>
            </div>
            <div>
              <small style={{ color: '#8d97a5', display: 'block', fontSize: '0.7rem' }}>
                Mã vận đơn
              </small>
              <strong style={{ color: '#263247' }}>
                {selectedOrder.tracking || 'Chưa phát hành'}
              </strong>
            </div>
            <div>
              <small style={{ color: '#8d97a5', display: 'block', fontSize: '0.7rem' }}>
                Tổng tiền đơn hàng
              </small>
              <strong style={{ color: '#c51c25', fontSize: '1rem' }}>
                {currency(selectedOrder.totalAmount)}
              </strong>
            </div>
            <div>
              <small style={{ color: '#8d97a5', display: 'block', fontSize: '0.7rem' }}>
                Ngày đặt
              </small>
              <strong style={{ color: '#263247' }}>
                {new Date(selectedOrder.createdAt).toLocaleString('vi-VN')}
              </strong>
            </div>
          </div>

          <h3 style={{ fontSize: '0.85rem', marginBottom: '10px', color: '#263247' }}>
            Sản phẩm trong đơn:
          </h3>
          <div className="seller-table-wrap" style={{ marginBottom: '20px' }}>
            <table className="seller-table">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Mã SP</th>
                  <th>Số lượng</th>
                  <th>Đơn giá</th>
                  <th>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrder.items.map((item, idx) => (
                  <tr key={`${item.productId}-${idx}`}>
                    <td>
                      <strong>{item.productName || item.productId}</strong>
                    </td>
                    <td>{item.productId}</td>
                    <td>{item.quantity}</td>
                    <td>{currency(item.unitPrice)}</td>
                    <td>{currency(item.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedOrder.timeline && selectedOrder.timeline.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '0.85rem', marginBottom: '10px', color: '#263247' }}>
                Diễn biến đơn hàng:
              </h3>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: '20px',
                  fontSize: '0.72rem',
                  color: '#596579',
                  display: 'grid',
                  gap: '6px',
                }}
              >
                {selectedOrder.timeline.map((step, idx) => (
                  <li key={idx}>
                    <strong>{step.title}</strong> —{' '}
                    {new Date(step.timestamp).toLocaleString('vi-VN')}
                    {step.note ? ` (${step.note})` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              borderTop: '1px solid #edf0f3',
              paddingTop: '15px',
            }}
          >
            {selectedOrder.status !== 'CANCELLED' && selectedOrder.status !== 'DELIVERED' && (
              <button
                type="button"
                className="seller-button"
                style={{ background: '#fff0f0', color: '#b32029', borderColor: '#f1bdc0' }}
                disabled={cancelActing}
                onClick={() => handleCancelOrder(selectedOrder.id)}
              >
                {cancelActing ? 'Đang hủy…' : 'Hủy đơn hàng'}
              </button>
            )}
            {actionNotice && (
              <span style={{ color: '#24784f', fontSize: '0.75rem', fontWeight: 600 }}>
                {actionNotice}
              </span>
            )}
            {actionError && (
              <span style={{ color: '#b32029', fontSize: '0.75rem', fontWeight: 600 }}>
                {actionError}
              </span>
            )}
          </div>
        </section>
      )}
    </>
  );
}
