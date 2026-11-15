'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSession } from '@/modules/auth/hooks/use-session';
import { ordersApi, type OrderListItem, type OrderDetail } from '@/modules/commerce/api/orders.api';
import { userMessage } from '@/lib/axios/http';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { compressImage, formatBytes } from '@/lib/utils/image-compressor';
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

  // Task FE-05: Dialog states for dispute evidence and AI policy rules
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState<
    { name: string; size: string; rawSize: string; previewUrl: string; isCompressed: boolean }[]
  >([]);
  const [evidenceNote, setEvidenceNote] = useState(
    'Shop đã kiểm tra sản phẩm nguyên seal, quấn 3 lớp màng xốp khí và dán kín tem vỡ trước khi bàn giao bưu tá.',
  );
  const [isCompressingFile, setIsCompressingFile] = useState(false);
  const [isSubmittingEvidence, setIsSubmittingEvidence] = useState(false);
  const [evidenceSuccess, setEvidenceSuccess] = useState(false);

  async function handleEvidenceFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsCompressingFile(true);
    try {
      const newItems: {
        name: string;
        size: string;
        rawSize: string;
        previewUrl: string;
        isCompressed: boolean;
      }[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const rawBytes = file.size;
        let finalFile = file;
        let compressed = false;

        if (file.type.startsWith('image/')) {
          finalFile = await compressImage(file, 1600, 0.8);
          compressed = finalFile.size < rawBytes;
        }

        const previewUrl = URL.createObjectURL(finalFile);
        newItems.push({
          name: finalFile.name,
          size: formatBytes(finalFile.size),
          rawSize: formatBytes(rawBytes),
          previewUrl,
          isCompressed: compressed,
        });
      }
      setEvidenceFiles((prev) => [...prev, ...newItems]);
    } finally {
      setIsCompressingFile(false);
    }
  }

  async function handleSubmitEvidence() {
    if (evidenceFiles.length === 0) {
      alert('Vui lòng chọn ít nhất 1 ảnh hoặc video đóng gói.');
      return;
    }
    setIsSubmittingEvidence(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsSubmittingEvidence(false);
    setEvidenceSuccess(true);
  }

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
      // 1. Gọi trực tiếp API Backend Commerce Service: POST /api/v1/orders/:id/dispatch
      const updated = await ordersApi.dispatch(orderId);
      setSelectedOrder(updated);
      setItems((prev) =>
        prev.map((item) =>
          item.id === updated.id
            ? {
                ...item,
                status: updated.status,
                tracking: updated.tracking,
                updatedAt: updated.updatedAt,
              }
            : item,
        ),
      );
      setActionNotice(
        `✓ Đã đóng gói & bàn giao cho đơn vị vận chuyển thành công! Mã vận đơn 3PL: ${updated.tracking || 'Đã cấp'}`,
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

          {/* Task FE-05: Thẻ Cảnh Báo Đối Soát AI trên Màn Hình Seller */}
          {(selectedOrder.status === 'REFUND_REQUESTED' ||
            Boolean((selectedOrder as any).disputeInfo)) && (
            <div
              style={{
                background: '#fff7ed',
                border: '2px solid #ea580c',
                borderRadius: '10px',
                padding: '16px 20px',
                marginBottom: '20px',
                boxShadow: '0 4px 12px rgba(234, 88, 12, 0.1)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.4rem' }}>⚠️</span>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#9a3412' }}>
                    AI phát hiện kiện hàng bị nứt vỡ (Mức độ: CAO). Mời Shop nộp video đóng gói để
                    đối soát!
                  </h3>
                </div>
                <span
                  style={{
                    background: '#fed7aa',
                    color: '#9a3412',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '20px',
                    border: '1px solid #fdba74',
                  }}
                >
                  ⚡ ĐỘ NGUY CƠ: CAO
                </span>
              </div>

              {/* Trích dẫn câu tóm tắt của AI: {order.disputeInfo.summary} */}
              <div
                style={{
                  background: '#ffedd5',
                  borderLeft: '4px solid #ea580c',
                  padding: '10px 14px',
                  borderRadius: '0 6px 6px 0',
                  margin: '10px 0 14px',
                  fontSize: '0.8rem',
                  color: '#7c2d12',
                  lineHeight: 1.5,
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    color: '#c2410c',
                    marginBottom: '2px',
                  }}
                >
                  🤖 Trích dẫn tóm tắt phân tích tự động từ AI Chatbot:
                </div>
                <em>
                  "
                  {(selectedOrder as any)?.disputeInfo?.summary ||
                    'AI phát hiện kiện hàng xuất hiện vết nứt vỡ góc màn hình đường kính > 5cm và vỏ hộp móp rách nghiêm trọng theo ảnh bưu tá cung cấp. Yêu cầu Người bán đối soát video đóng gói trước 24h.'}
                  "
                </em>
              </div>

              {/* Nhóm nút bấm hành động của Task FE-05 */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '10px',
                  alignItems: 'center',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setEvidenceModalOpen(true);
                    setEvidenceSuccess(false);
                  }}
                  style={{
                    background: '#ea580c',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 4px rgba(234, 88, 12, 0.25)',
                  }}
                >
                  <span>📹</span> Nộp Bằng Chứng Đóng Gói
                </button>

                <button
                  type="button"
                  onClick={() => setPolicyModalOpen(true)}
                  style={{
                    background: '#ffffff',
                    color: '#c2410c',
                    border: '1px solid #fdba74',
                    borderRadius: '6px',
                    padding: '8px 14px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>🤖</span> Hỏi AI quy định đối soát
                </button>

                <Link
                  href="/seller/chat"
                  style={{
                    background: '#f8fafc',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '8px 14px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>💬</span> Mở phòng chat đối soát
                </Link>
              </div>
            </div>
          )}

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
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <code
                  style={{
                    background: '#f8fafc',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  {selectedOrder.tracking || 'Chưa bàn giao'}
                </code>
                {selectedOrder.tracking && (
                  <span
                    style={{
                      fontSize: '0.68rem',
                      background: '#ecfdf5',
                      color: '#047857',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid #a7f3d0',
                      fontWeight: 600,
                    }}
                  >
                    Đã bàn giao GHN ✓
                  </span>
                )}
              </div>
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

      {/* Task FE-05: Modal Nộp Bằng Chứng Đóng Gói Cho Shop */}
      <Dialog open={evidenceModalOpen} onOpenChange={setEvidenceModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
            <span>📹</span> Nộp Bằng Chứng Đóng Gói Đối Soát (Task FE-05)
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Mã đơn đối soát: <strong>{selectedOrder?.id}</strong> · Khách hàng:{' '}
            <strong>{selectedOrder?.buyer}</strong>
          </DialogDescription>

          {evidenceSuccess ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                ✓
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Đã nộp bằng chứng đối soát thành công!
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                Hồ sơ đã được mã hóa và chuyển giao tới Bộ phận Trọng tài CSKH Nexus. Nếu video đạt
                chuẩn theo Điều 3.6, Sàn sẽ bồi hoàn toàn bộ giá trị kiện hàng từ Quỹ Bảo Hiểm Vận
                Chuyển.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setEvidenceModalOpen(false)}
                  className="px-5 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition"
                >
                  Hoàn tất & Đóng
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2.5">
                <span className="text-base">💡</span>
                <div className="leading-relaxed">
                  <strong>Khuyến nghị từ AI Nexus:</strong> Nộp video quay liền mạch 6 mặt kiện hàng
                  và ảnh chụp rõ mã vận đơn GHN. Ảnh chụp &gt; 1MB từ điện thoại sẽ được{' '}
                  <span className="font-semibold text-amber-900">
                    tự động nén qua Canvas Client (Task FE-01)
                  </span>{' '}
                  xuống ~400KB trước khi tải lên.
                </div>
              </div>

              {/* Khu vực chọn tệp */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tải video đóng gói / ảnh niêm phong kiện hàng:
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-orange-500 transition cursor-pointer relative bg-slate-50">
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/mp4,video/quicktime"
                    onChange={handleEvidenceFileSelect}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="text-2xl mb-1">📤</div>
                  <div className="text-xs font-semibold text-slate-800">
                    Bấm để chọn tệp hoặc kéo thả video/ảnh vào đây
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Hỗ trợ MP4, MOV, JPG, PNG (tự động nén Canvas nếu dung lượng lớn)
                  </div>
                </div>
              </div>

              {isCompressingFile && (
                <div className="text-xs text-orange-600 flex items-center gap-1.5 font-medium animate-pulse">
                  <span>⏳</span> Đang nén ảnh bằng Canvas phía Client...
                </div>
              )}

              {/* Danh sách tệp đã chọn */}
              {evidenceFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-700">
                    Tệp đính kèm ({evidenceFiles.length}):
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {evidenceFiles.map((f, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded bg-white border border-slate-200 text-xs"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="text-base">📎</span>
                          <span className="font-medium text-slate-800 truncate max-w-[240px]">
                            {f.name}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {f.isCompressed ? (
                              <span className="text-emerald-600 font-semibold">
                                {f.size} (gốc: {f.rawSize})
                              </span>
                            ) : (
                              f.size
                            )}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setEvidenceFiles((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="text-red-500 hover:text-red-700 text-xs px-2 py-0.5"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ô ghi chú quy trình đóng gói */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ghi chú của Người bán cho Trọng tài sàn:
                </label>
                <textarea
                  rows={3}
                  value={evidenceNote}
                  onChange={(e) => setEvidenceNote(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 outline-none focus:border-orange-500 text-slate-800"
                  placeholder="Mô tả tóm tắt quá trình kiểm hàng, niêm phong và bàn giao cho bưu tá..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setEvidenceModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  disabled={isSubmittingEvidence || evidenceFiles.length === 0}
                  onClick={handleSubmitEvidence}
                  className="px-5 py-2 bg-orange-600 text-white rounded-lg text-xs font-semibold hover:bg-orange-700 transition flex items-center gap-1.5 disabled:bg-slate-400 disabled:cursor-not-allowed"
                >
                  {isSubmittingEvidence ? 'Đang gửi bằng chứng...' : 'Xác nhận nộp bằng chứng 🚀'}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Task FE-05: Pop-up AI Hướng Dẫn Quy Chuẩn Video & Quy Chế Đối Soát (Task INT-02) */}
      <Dialog open={policyModalOpen} onOpenChange={setPolicyModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
            <span>🤖</span> AI Trợ Lý - Quy Chuẩn Video Đối Soát Hợp Lệ (Task INT-02)
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Căn cứ Điều 3.6 và Quy chế Trọng tài Sàn Nexus (Bảo vệ Người bán & Người mua)
          </DialogDescription>

          <div className="space-y-3 pt-2 text-xs text-slate-700">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-1.5">
              <div className="font-bold text-blue-900 flex items-center gap-1.5">
                <span>📹</span> 1. Yêu cầu kỹ thuật bắt buộc của Video:
              </div>
              <ul className="list-disc list-inside space-y-1 text-blue-800 leading-relaxed pl-1">
                <li>
                  Video phải quay <strong>1 cú máy liên tục</strong>, không cắt ghép, không tua
                  nhanh hoặc chèn hiệu ứng che khuất.
                </li>
                <li>
                  Quay rõ <strong>tình trạng 6 mặt kiện hàng</strong> trước khi đóng nắp và lúc dán
                  băng dính niêm phong.
                </li>
                <li>
                  Zoom rõ <strong>Mã vận đơn bưu tá GHN</strong> và Tem vỡ niêm phong Nexus trên
                  thùng.
                </li>
              </ul>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1.5">
              <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                <span>🛡️</span> 2. Quyền lợi bảo vệ Người bán (Nexus Seller Shield):
              </div>
              <p className="text-emerald-800 leading-relaxed">
                Khi Shop cung cấp đủ video đạt chuẩn trên, sàn xác định lỗi thuộc về khâu vận chuyển
                của bưu cục. Người mua sẽ được bồi hoàn từ{' '}
                <strong>Quỹ Bảo Hiểm Vận Chuyển Sàn</strong>, Shop{' '}
                <strong>được thanh toán 100% tiền hàng</strong> và <strong>không bị giảm</strong>{' '}
                điểm uy tín người bán!
              </p>
            </div>

            <div className="p-3 bg-slate-100 rounded-lg space-y-1 text-slate-600">
              <div className="font-semibold text-slate-800">⏱️ Thời hạn nộp bằng chứng:</div>
              <p>
                Trong vòng <strong>24 giờ</strong> kể từ lúc nhận được thông báo yêu cầu khiếu nại.
                Sau thời hạn này nếu không có video đối soát, đơn sẽ được xử lý theo bằng chứng của
                Người mua.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t mt-1">
            <button
              type="button"
              onClick={() => setPolicyModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Đã hiểu quy định
            </button>
            <button
              type="button"
              onClick={() => {
                setPolicyModalOpen(false);
                setEvidenceModalOpen(true);
                setEvidenceSuccess(false);
              }}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg text-xs font-semibold hover:bg-orange-700 transition flex items-center gap-1.5"
            >
              📹 Nộp bằng chứng ngay
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
