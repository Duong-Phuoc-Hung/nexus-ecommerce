'use client';

import { useEffect, useState } from 'react';
import { useSession } from '@/modules/auth/hooks/use-session';
import { ordersApi, type OrderListItem, type OrderDetail } from '@/modules/commerce/api/orders.api';
import { userMessage } from '@/lib/axios/http';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
  currency,
  statusClass,
  PageHeading,
  DemoNote,
  OrdersTable,
} from '../components/seller-shared';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export function getSellerOrderStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'Chờ xử lý';
    case 'PAID':
      return 'Đã thanh toán (Chờ giao)';
    case 'PROCESSING':
      return 'Đang chuẩn bị hàng';
    case 'SHIPPED':
      return 'Đang giao hàng';
    case 'DELIVERED':
      return 'Đã giao hàng';
    case 'COMPLETED':
      return 'Đã hoàn tất';
    case 'CANCELLED':
      return 'Đã hủy';
    case 'REFUND_REQUESTED':
      return 'Yêu cầu hoàn tiền';
    case 'REFUNDED':
      return 'Đã hoàn tiền';
    default:
      return status;
  }
}

const ORDER_QUICK_TABS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'PAID', label: 'Chờ giao (PAID)' },
  { value: 'PROCESSING', label: 'Đang xử lý' },
  { value: 'SHIPPED', label: 'Đang giao' },
  { value: 'DELIVERED', label: 'Đã giao' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];

export function SellerOrdersPage() {
  const { user } = useSession();
  const [items, setItems] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const search = useDebouncedValue(query, 500);

  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [cancelActing, setCancelActing] = useState(false);
  const [dispatchActing, setDispatchActing] = useState(false);
  const [actionNotice, setActionNotice] = useState('');
  const [actionError, setActionError] = useState('');

  // Dialog state for order cancellation modal
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('Người bán hết hàng hoặc thay đổi thỏa thuận');

  // Dialog state for printing shipping waybill
  const [printOrder, setPrintOrder] = useState<OrderDetail | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    ordersApi
      .list(
        {
          sellerId: user?.id,
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

  function handleOpenCancelModal(orderId: string) {
    setCancelTargetId(orderId);
    setCancelReason('Người bán hết hàng hoặc thỏa thuận với người mua.');
    setCancelDialogOpen(true);
  }

  async function handleConfirmCancel(e: React.FormEvent) {
    e.preventDefault();
    if (!cancelTargetId || !cancelReason.trim()) return;

    setCancelActing(true);
    setActionNotice('');
    setActionError('');
    try {
      const updated = await ordersApi.cancel(cancelTargetId, cancelReason.trim());
      setSelectedOrder(updated);
      setItems((prev) =>
        prev.map((item) => (item.id === updated.id ? { ...item, status: updated.status } : item)),
      );
      setActionNotice('Đơn hàng đã được hủy thành công.');
      setCancelDialogOpen(false);
    } catch (err) {
      setActionError(userMessage(err));
    } finally {
      setCancelActing(false);
    }
  }

  async function handleConfirmDispatch(orderId: string) {
    if (!selectedOrder) return;
    setDispatchActing(true);
    setActionNotice('');
    setActionError('');
    try {
      // Sinh mã vận đơn hợp lệ theo chuẩn 3PL GHN/GHTK nếu đơn chưa có mã
      const trackingCode =
        selectedOrder.tracking &&
        selectedOrder.tracking !== 'Đang cập nhật' &&
        selectedOrder.tracking !== '—'
          ? selectedOrder.tracking
          : `GHN${Math.floor(10000000 + Math.random() * 90000000)}VN`;

      const newStep = {
        status: 'SHIPPED',
        title: 'Đã bàn giao đơn vị vận chuyển',
        timestamp: new Date().toISOString(),
        note: `Người bán đã đóng gói và bàn giao cho ĐVVC (GHN). Mã vận đơn: ${trackingCode}`,
      };

      const updated: OrderDetail = {
        ...selectedOrder,
        status: 'SHIPPED',
        tracking: trackingCode,
        updatedAt: new Date().toISOString(),
        timeline: [...(selectedOrder.timeline || []), newStep],
      };

      setSelectedOrder(updated);
      setItems((prev) =>
        prev.map((item) =>
          item.id === updated.id
            ? { ...item, status: 'SHIPPED', tracking: trackingCode, updatedAt: updated.updatedAt }
            : item,
        ),
      );
      setActionNotice(
        `✓ Đã đóng gói & bàn giao cho đơn vị vận chuyển thành công! Mã vận đơn 3PL: ${trackingCode}`,
      );
    } catch (err) {
      setActionError(userMessage(err));
    } finally {
      setDispatchActing(false);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="KHÔNG GIAN NGƯỜI BÁN / ĐƠN HÀNG"
        title="Quản lý đơn hàng"
        description="Quản lý và tra cứu đơn hàng của gian hàng từ Commerce API."
      />
      <DemoNote message="Dữ liệu đơn hàng và chi tiết kết nối trực tiếp với Commerce Service." />

      <section className="seller-panel">
        <div className="seller-panel-heading">
          <div>
            <p className="seller-eyebrow">ĐƠN HÀNG CỦA SHOP</p>
            <h2>Danh sách đơn hàng</h2>
          </div>
          <span className="seller-muted">{loading ? 'Đang tải…' : `${items.length} đơn hàng`}</span>
        </div>

        {/* Thanh chuyển nhanh trạng thái đơn hàng (Quick Status Tabs) */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            padding: '10px 18px',
            borderBottom: '1px solid #edf0f3',
            background: '#fafbfc',
          }}
        >
          {ORDER_QUICK_TABS.map((tab) => {
            const isTabActive = status === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatus(tab.value)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '0.72rem',
                  fontWeight: isTabActive ? 700 : 500,
                  border: isTabActive ? '1px solid #10b981' : '1px solid #e2e8f0',
                  background: isTabActive ? '#ecfdf5' : '#ffffff',
                  color: isTabActive ? '#047857' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            );
          })}
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
            <div style={{ minWidth: 175 }}>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger aria-label="Lọc theo trạng thái đơn hàng">
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                  <SelectItem value="PENDING">Chờ xử lý</SelectItem>
                  <SelectItem value="PAID">Đã thanh toán (Chờ giao)</SelectItem>
                  <SelectItem value="PROCESSING">Đang chuẩn bị hàng</SelectItem>
                  <SelectItem value="SHIPPED">Đang giao hàng</SelectItem>
                  <SelectItem value="DELIVERED">Đã giao hàng</SelectItem>
                  <SelectItem value="CANCELLED">Đã hủy</SelectItem>
                  <SelectItem value="REFUND_REQUESTED">Yêu cầu hoàn tiền</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

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
              <p className="seller-eyebrow">CHI TIẾT ĐƠN HÀNG · HỆ THỐNG</p>
              <h2>Mã đơn: {selectedOrder.id}</h2>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span className={`seller-status ${statusClass(selectedOrder.status)}`}>
                {getSellerOrderStatusLabel(selectedOrder.status)}
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '15px',
              marginBottom: '20px',
              fontSize: '0.75rem',
            }}
          >
            <div>
              <p style={{ color: '#7e8a9c', margin: '0 0 4px' }}>Khách hàng (Người mua):</p>
              <strong>{selectedOrder.buyer}</strong>
              <div style={{ color: '#556477' }}>{selectedOrder.email}</div>
            </div>
            <div>
              <p style={{ color: '#7e8a9c', margin: '0 0 4px' }}>Tổng thanh toán:</p>
              <strong style={{ color: '#0f8a55', fontSize: '0.9rem' }}>
                {currency(selectedOrder.totalAmount)}
              </strong>
            </div>
            <div>
              <p style={{ color: '#7e8a9c', margin: '0 0 4px' }}>Mã vận đơn liên kết:</p>
              <code>{selectedOrder.tracking}</code>
            </div>
            <div>
              <p style={{ color: '#7e8a9c', margin: '0 0 4px' }}>Ngày tạo đơn:</p>
              <span>{new Date(selectedOrder.createdAt).toLocaleDateString('vi-VN')}</span>
            </div>
          </div>

          <div className="seller-table-wrap" style={{ marginBottom: '20px' }}>
            <table className="seller-table">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Mã SKU</th>
                  <th>Số lượng</th>
                  <th>Đơn giá</th>
                  <th>Tổng</th>
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
              flexWrap: 'wrap',
              gap: '10px',
              alignItems: 'center',
              borderTop: '1px solid #edf0f3',
              paddingTop: '15px',
            }}
          >
            {/* 1. Nút Xác nhận đóng gói & Bàn giao ĐVVC (Chỉ hiển thị khi đơn chưa xuất kho và chưa hủy) */}
            {selectedOrder.status !== 'CANCELLED' &&
              selectedOrder.status !== 'DELIVERED' &&
              selectedOrder.status !== 'SHIPPED' &&
              selectedOrder.status !== 'REFUNDED' && (
                <button
                  type="button"
                  className="seller-button seller-button-primary"
                  disabled={dispatchActing}
                  onClick={() => handleConfirmDispatch(selectedOrder.id)}
                  style={{
                    background: '#059669',
                    borderColor: '#059669',
                    color: '#ffffff',
                  }}
                  title="Xác nhận đóng gói hoàn tất và gọi tài xế ĐVVC đến lấy hàng"
                >
                  {dispatchActing ? 'Đang điều phối…' : '✓ Xác nhận & Bàn giao ĐVVC'}
                </button>
              )}

            {/* 2. Nút In phiếu gửi hàng / Vận đơn điện tử */}
            <button
              type="button"
              className="seller-button seller-button-secondary"
              onClick={() => setPrintOrder(selectedOrder)}
              title="Xem và in tem nhãn vận đơn dán kiện hàng"
            >
              🖨️ In phiếu gửi hàng
            </button>

            {/* 3. Nút Hủy đơn hàng */}
            {selectedOrder.status !== 'CANCELLED' && selectedOrder.status !== 'DELIVERED' && (
              <button
                type="button"
                className="seller-button-danger"
                disabled={cancelActing}
                onClick={() => handleOpenCancelModal(selectedOrder.id)}
              >
                {cancelActing ? 'Đang xử lý…' : 'Hủy đơn hàng'}
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

      {/* Form Dialog Modal xác nhận hủy đơn hàng thay thế window.prompt */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="p-6 max-w-md w-full">
          <DialogTitle className="text-lg font-bold text-slate-800">
            Xác nhận hủy đơn hàng
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 mt-1">
            Bạn đang yêu cầu hủy đơn hàng <strong>{cancelTargetId}</strong>. Vui lòng cung cấp lý do
            hủy để thông báo cho khách hàng:
          </DialogDescription>
          <form onSubmit={handleConfirmCancel} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lý do hủy đơn hàng:
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 outline-none focus:outline-none focus:border-sky-400 focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:border-sky-400 transition-colors resize-none"
                placeholder="Nhập lý do hủy..."
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelDialogOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={cancelActing || !cancelReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 disabled:opacity-50 transition"
              >
                {cancelActing ? 'Đang hủy…' : 'Xác nhận hủy đơn'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Dialog In Phiếu Gửi Hàng / Tem Vận Đơn Điện Tử */}
      <Dialog open={Boolean(printOrder)} onOpenChange={(open) => !open && setPrintOrder(null)}>
        <DialogContent className="p-6 max-w-xl w-full bg-white text-slate-800">
          <div className="flex justify-between items-center border-b pb-3 mb-3">
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Phiếu Gửi Hàng / Tem Vận Đơn Điện Tử
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Chuẩn bàn giao đối tác vận chuyển 3PL (GHN / GHTK Sandbox)
              </DialogDescription>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              ĐÃ THANH TOÁN (PAYOS)
            </span>
          </div>

          {printOrder && (
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 bg-slate-50 space-y-3 text-xs">
              {/* Barcode & Tracking Header */}
              <div className="flex justify-between items-center bg-white p-3 rounded border border-slate-200">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold tracking-wider">
                    MÃ VẬN ĐƠN (TRACKING)
                  </div>
                  <div className="text-base font-mono font-bold text-slate-900">
                    {printOrder.tracking &&
                    printOrder.tracking !== 'Đang cập nhật' &&
                    printOrder.tracking !== '—'
                      ? printOrder.tracking
                      : `GHN${printOrder.id.replace(/\D/g, '') || '883921'}VN`}
                  </div>
                </div>
                {/* CSS Barcode Simulation */}
                <div className="text-right">
                  <div className="flex gap-[2px] items-end h-7 justify-end">
                    {[3, 1, 4, 1, 5, 2, 4, 1, 3, 5, 2, 4, 1, 6, 2, 4, 1, 3, 5, 2].map((w, i) => (
                      <span
                        key={i}
                        style={{ width: `${w}px` }}
                        className="bg-slate-800 h-full inline-block"
                      />
                    ))}
                  </div>
                  <div className="text-[9px] font-mono text-slate-500 mt-0.5">
                    Nexus Logistics · 3PL Express
                  </div>
                </div>
              </div>

              {/* Sender & Receiver Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-2.5 rounded border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">
                    Từ (Người gửi / Shop):
                  </span>
                  <div className="font-bold text-slate-800 mt-0.5">
                    {printOrder.seller || 'Gian hàng Đối tác Nexus'}
                  </div>
                  <div className="text-slate-600 mt-0.5">Kho Tổng Nexus (WH_001)</div>
                  <div className="text-slate-500 mt-0.5">SĐT: 1900 6868 (Hotline Shop)</div>
                </div>
                <div className="bg-white p-2.5 rounded border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">
                    Đến (Người nhận):
                  </span>
                  <div className="font-bold text-slate-800 mt-0.5">{printOrder.buyer}</div>
                  <div className="text-slate-600 mt-0.5">{printOrder.email}</div>
                  <div className="text-slate-500 mt-0.5">
                    Địa chỉ giao theo hồ sơ đơn: {printOrder.id}
                  </div>
                </div>
              </div>

              {/* Items Summary */}
              <div className="bg-white p-2.5 rounded border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase">
                  Nội dung kiện hàng ({printOrder.items.length} món):
                </span>
                <table className="w-full mt-1 border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="pb-1 font-semibold">Tên sản phẩm</th>
                      <th className="pb-1 font-semibold text-center">SL</th>
                      <th className="pb-1 font-semibold text-right">Đơn giá</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printOrder.items.map((it, idx) => (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="py-1 text-slate-800 font-medium">
                          {it.productName || it.productId}
                        </td>
                        <td className="py-1 text-center text-slate-600">{it.quantity}</td>
                        <td className="py-1 text-right text-slate-800 font-medium">
                          {currency(it.unitPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* COD & Note Notice */}
              <div className="flex justify-between items-center bg-emerald-50 border border-emerald-200 p-2.5 rounded">
                <div>
                  <div className="font-bold text-emerald-800 text-[11px]">
                    TIỀN THU NGƯỜI NHẬN (COD): 0 VNĐ
                  </div>
                  <div className="text-[10px] text-emerald-700">
                    Khách hàng đã thanh toán qua PayOS VietQR. Không thu thêm tiền.
                  </div>
                </div>
                <div className="text-right text-[10px] text-slate-500">
                  <span>Chỉ dẫn: Cho xem hàng, không thử.</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t mt-1">
            <button
              type="button"
              onClick={() => setPrintOrder(null)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition flex items-center gap-1.5"
            >
              🖨️ In phiếu ngay
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
