'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ordersApi, type OrderDetail } from '@/modules/commerce/api/orders.api';
import { userMessage } from '@/lib/axios/http';
import { money, slug, supportStatusClass, Heading, DemoBanner } from '../components/support-shared';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { getOrderStatusLabel } from './support-orders-page';
import { supportApi, type SupportCase } from '../api/support.api';

export function SupportOrderDetailPage({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [disputeCase, setDisputeCase] = useState<SupportCase | any | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [acting, setActing] = useState(false);

  // Modal dialog state for Cancel / Refund actions
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionKind, setActionKind] = useState<'cancel' | 'refund' | 'reject_refund' | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [isPayOsRefund, setIsPayOsRefund] = useState(true);
  const [customRefundAmount, setCustomRefundAmount] = useState<number | string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }

  useEffect(() => {
    const controller = new AbortController();
    setError('');
    ordersApi
      .getById(orderId, controller.signal)
      .then(setOrder)
      .catch((err) => !controller.signal.aborted && setError(userMessage(err)));

    // Ưu tiên nạp phán quyết từ localStorage nếu có
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(`nexus_dispute_verdict_${orderId}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && (parsed.orderId === orderId || parsed.orderCode === orderId)) {
            setDisputeCase(parsed);
          }
        } catch {}
      }
    }

    supportApi
      .listCases({ q: orderId } as any, controller.signal)
      .then((items) => {
        if (Array.isArray(items) && items.length > 0) {
          const matched = items.find(
            (c) =>
              c.orderId === orderId ||
              c.order === orderId ||
              (c as any).orderCode === orderId ||
              (c as any).order_code === orderId,
          );

          if (matched) {
            // Chỉ gán và cập nhật localStorage nếu hồ sơ thực sự thuộc về đơn hàng này
            setDisputeCase((prev: any) => {
              if (prev?.decision && !(matched as any).resolutionNote) return prev;
              return matched;
            });

            if (
              typeof window !== 'undefined' &&
              (matched.status === 'RESOLVED' ||
                matched.status === 'REJECTED' ||
                (matched as any).verdict)
            ) {
              localStorage.setItem(
                `nexus_dispute_verdict_${orderId}`,
                JSON.stringify({
                  caseId: matched.id,
                  orderId,
                  status: matched.status,
                  decision:
                    (matched as any).verdict?.decision ||
                    (matched.status === 'REJECTED' ? 'REJECT_BUYER' : 'REFUND_BUYER'),
                  note:
                    (matched as any).resolutionNote ||
                    (matched as any).verdict?.note ||
                    matched.reason ||
                    'Trọng tài sàn đã hoàn tất phân xử vụ việc.',
                  resolvedBy: (matched as any).resolvedBy || 'Chuyên viên Hỗ trợ Sàn Nexus',
                  updatedAt: (matched as any).updatedAt || new Date().toISOString(),
                }),
              );
            }
          } else {
            setDisputeCase(null);
          }
        } else {
          setDisputeCase(null);
        }
      })
      .catch(() => {
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem(`nexus_dispute_verdict_${orderId}`);
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              if (parsed && (parsed.orderId === orderId || parsed.orderCode === orderId)) {
                setDisputeCase(parsed);
              }
            } catch {}
          }
        }
      });

    return () => controller.abort();
  }, [orderId]);

  const isCancelled = order?.status === 'CANCELLED' || order?.status === 'ĐÃ_HỦY';
  const isRefunded = order?.status === 'REFUNDED' || order?.status === 'ĐÃ_HOÀN_TIỀN';
  const isDelivered =
    order?.status === 'DELIVERED' ||
    order?.status === 'ĐÃ_GIAO_HÀNG' ||
    order?.status === 'ĐÃ_GIAO';
  const isDisputed =
    order?.status === 'REFUND_REQUESTED' ||
    order?.status === 'YÊU_CẦU_HOÀN_TIỀN' ||
    order?.status === 'TRANH_CHẤP';

  // Hủy đơn hàng chỉ được thực hiện 1 lần, không cho phép hủy khi đã hủy, đã hoàn tiền hoặc đã giao
  const canCancel = !acting && !isCancelled && !isRefunded && !isDelivered;
  const canRefund = !acting && !isRefunded;

  function handleOpenDialog(kind: 'cancel' | 'refund' | 'reject_refund') {
    if (kind === 'cancel' && !canCancel) return;
    if (kind === 'refund' && !canRefund) return;

    setActionKind(kind);
    if (kind === 'refund') {
      setIsPayOsRefund(true);
      setCustomRefundAmount(order?.totalAmount ?? 0);
    }
    setActionReason(
      kind === 'cancel'
        ? 'Xử lý hủy đơn từ bộ phận Chăm sóc khách hàng.'
        : kind === 'refund'
          ? 'Yêu cầu hoàn tiền được bộ phận CSKH phê duyệt qua PayOS.'
          : 'Từ chối / Hủy bỏ yêu cầu hoàn tiền từ người mua do không đủ điều kiện chính sách sàn.',
    );
    setDialogOpen(true);
  }

  async function handleConfirmAction(e: React.FormEvent) {
    e.preventDefault();
    if (!actionKind || !actionReason.trim()) return;
    if (actionKind === 'cancel' && !canCancel) return;
    if (actionKind === 'refund' && !canRefund) return;

    setActing(true);
    setNotice('');
    try {
      if (actionKind === 'cancel') {
        const updated = await ordersApi.cancel(orderId, actionReason.trim());
        setOrder(updated);
        showToast('Đã hủy đơn hàng thành công');
        setNotice('Đơn hàng đã được hủy thành công.');
      } else if (actionKind === 'refund') {
        if (isPayOsRefund) {
          const refundNum =
            typeof customRefundAmount === 'number'
              ? customRefundAmount
              : Number(customRefundAmount) || order?.totalAmount;
          const res = await ordersApi.executeRefund(orderId, {
            refundAmount: refundNum,
            reason: actionReason.trim(),
          });
          setOrder((prev) =>
            prev
              ? {
                  ...prev,
                  status: 'REFUNDED',
                  refundTransactionId: res.refundTransactionId,
                  refundAmount: res.amount,
                  timeline: [
                    ...prev.timeline,
                    {
                      status: 'REFUNDED',
                      title: 'Hoàn tiền tự động qua PayOS',
                      timestamp: res.completedAt || new Date().toISOString(),
                      note: `${res.message} (Mã GD: ${res.refundTransactionId})`,
                    },
                  ],
                }
              : prev,
          );
          showToast(`Đã kích hoạt hoàn tiền PayOS thành công (Mã GD: ${res.refundTransactionId})`);
          setNotice(
            `Đã hoàn tiền tự động qua PayOS thành công: ${money(res.amount)} (Mã GD: ${res.refundTransactionId})`,
          );
        } else {
          const updated = await ordersApi.refund(orderId, actionReason.trim());
          setOrder(updated);
          showToast('Đã xử lý hoàn tiền thành công');
          setNotice('Yêu cầu hoàn tiền cho đơn hàng đã được xử lý thành công.');
        }
      } else if (actionKind === 'reject_refund') {
        // Hủy yêu cầu hoàn tiền (BUG-04) - Gọi trực tiếp API Backend POST /api/v1/orders/:id/refund/cancel
        const updated = await ordersApi.rejectRefund(orderId, actionReason.trim());
        setOrder(updated);
        showToast('Đã hủy yêu cầu hoàn tiền thành công');
        setNotice(
          'Đã hủy yêu cầu hoàn tiền thành công. Trạng thái đơn được chuyển lại "Đang xử lý".',
        );
      }
      setDialogOpen(false);
    } catch (err) {
      setNotice(userMessage(err));
    } finally {
      setActing(false);
    }
  }

  async function handleMarkAsDelivered() {
    if (!order || isDelivered || isCancelled || isRefunded) return;
    setActing(true);
    setNotice('');
    try {
      const updated = await ordersApi.updateStatus(
        orderId,
        'DELIVERED',
        'Xác nhận giao hàng thành công bởi bộ phận Chăm sóc khách hàng (Support Staff)',
      );
      setOrder(updated);
      showToast('Đã xác nhận giao hàng và trừ tồn kho thành công');
      setNotice('Đơn hàng đã chuyển sang trạng thái ĐÃ GIAO HÀNG và đồng bộ trừ kho thành công.');
    } catch (err) {
      setNotice(userMessage(err));
    } finally {
      setActing(false);
    }
  }

  return (
    <>
      <Heading
        label="BỘ PHẬN HỖ TRỢ / CHI TIẾT ĐƠN HÀNG"
        title="Hồ sơ đơn hàng"
        description="Thông tin giao dịch, khách hàng, người bán và lịch sử cập nhật trạng thái."
        action={
          <Link className="support-secondary-button" href="/support/orders">
            ← Danh sách đơn
          </Link>
        }
      />
      <DemoBanner message="Chi tiết và thao tác đơn hàng được xử lý trực tiếp qua Commerce API." />
      {error ? (
        <div className="support-empty">{error}</div>
      ) : !order ? (
        <div className="support-empty">Đang tải thông tin đơn hàng…</div>
      ) : (
        <>
          <div className="support-detail-grid">
            <section className="support-panel">
              <div className="support-panel-heading">
                <div>
                  <p className="support-eyebrow">MÃ ĐƠN HÀNG</p>
                  <h2>{order.id}</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Link
                    href={`/support/disputes?q=${encodeURIComponent(order.id)}&open=1`}
                    className="support-secondary-button"
                    style={{
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      borderColor: '#bfdbfe',
                      fontSize: '0.75rem',
                      padding: '4px 8px',
                    }}
                    title="Mở ngay phiên phân xử tranh chấp cho đơn hàng này"
                  >
                    ⚖ Giải quyết tranh chấp
                  </Link>
                  <span className={`support-status ${supportStatusClass(order.status)}`}>
                    {getOrderStatusLabel(order.status)}
                  </span>
                </div>
              </div>
              <div className="support-detail-content">
                <div className="support-info-grid">
                  <div>
                    <small>Khách hàng (Người mua)</small>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <strong>{order.buyer}</strong>
                      <Link
                        href={`/support/users?q=${encodeURIComponent(order.email || order.buyerId || order.buyer)}`}
                        style={{
                          fontSize: '0.68rem',
                          color: '#2563eb',
                          background: '#eff6ff',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          border: '1px solid #bfdbfe',
                          textDecoration: 'none',
                        }}
                        title="Xem hồ sơ người dùng"
                      >
                        Hồ sơ ↗
                      </Link>
                    </div>
                    <span>{order.email}</span>
                  </div>
                  <div>
                    <small>Đối tác (Người bán)</small>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <strong>{order.seller}</strong>
                      <Link
                        href={`/support/users?q=${encodeURIComponent(order.sellerId || order.seller)}`}
                        style={{
                          fontSize: '0.68rem',
                          color: '#b45309',
                          background: '#fef3c7',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          border: '1px solid #fde68a',
                          textDecoration: 'none',
                        }}
                        title="Xem hồ sơ và uy tín gian hàng"
                      >
                        Hồ sơ ↗
                      </Link>
                    </div>
                    <span>{order.sellerId}</span>
                  </div>
                  <div>
                    <small>Sản phẩm chính</small>
                    <strong>
                      {order.items[0]?.productName ?? order.product ?? 'Đang cập nhật'}
                    </strong>
                    <span>Số lượng món: {order.items?.length ?? 1}</span>
                  </div>
                  <div>
                    <small>Tổng giá trị thanh toán</small>
                    <strong>{money(order.totalAmount)}</strong>
                    <span>Mã giao dịch: {order.paymentTransactionId ?? 'Đang cập nhật'}</span>
                  </div>
                  <div>
                    <small>Mã vận đơn</small>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <strong>
                        {order.tracking && order.tracking !== '—' && order.tracking !== 'Chưa cấp'
                          ? order.tracking
                          : 'Chưa phát sinh vận đơn'}
                      </strong>
                      <Link
                        href={`/support/shipments?q=${encodeURIComponent(
                          order.tracking && order.tracking !== '—' && order.tracking !== 'Chưa cấp'
                            ? order.tracking
                            : order.id,
                        )}`}
                        style={{
                          fontSize: '0.68rem',
                          color: '#0284c7',
                          background: '#f0f9ff',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          border: '1px solid #bae6fd',
                          fontWeight: 600,
                          textDecoration: 'none',
                        }}
                        title="Tra cứu hành trình vận đơn tại mục Vận đơn"
                      >
                        {order.tracking && order.tracking !== '—' && order.tracking !== 'Chưa cấp'
                          ? 'Theo dõi vận đơn ↗'
                          : 'Tra cứu theo mã đơn ↗'}
                      </Link>
                    </div>
                    <span>
                      {order.tracking && order.tracking !== '—' && order.tracking !== 'Chưa cấp'
                        ? 'Kênh: Sàn thương mại điện tử Nexus'
                        : 'Đơn mới đặt · Chờ người bán đóng gói & bàn giao vận chuyển'}
                    </span>
                  </div>
                  <div>
                    <small>Thời gian đặt hàng</small>
                    <strong>{new Date(order.createdAt).toLocaleDateString('vi-VN')}</strong>
                    <span>Cập nhật: {new Date(order.updatedAt).toLocaleString('vi-VN')}</span>
                  </div>
                </div>
              </div>
            </section>
            <section className="support-panel">
              <div className="support-panel-heading">
                <div>
                  <p className="support-eyebrow">TIẾN TRÌNH ĐƠN HÀNG</p>
                  <h2>Lịch sử trạng thái</h2>
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  padding: '16px 20px',
                }}
              >
                {(order.timeline && order.timeline.length > 0
                  ? order.timeline
                  : [
                      {
                        status: order.status || 'CREATED',
                        title:
                          order.status === 'PROCESSING' || order.status === 'ĐANG_XỬ_LÝ'
                            ? 'Đơn hàng được tạo thành công · Đang xử lý'
                            : getOrderStatusLabel(order.status) || 'Đơn hàng được tạo thành công',
                        timestamp: order.createdAt || new Date().toISOString(),
                        note: 'Đơn hàng đã được ghi nhận trên hệ thống và đang trong quá trình chuẩn bị hàng.',
                      },
                    ]
                ).map((item, index, arr) => {
                  const isLatest = index === arr.length - 1;
                  return (
                    <div
                      key={`${item.status}-${item.timestamp}-${index}`}
                      style={{
                        borderRadius: '10px',
                        border: isLatest ? '1.5px solid #38bdf8' : '1px solid #e2e8f0',
                        background: isLatest ? '#f0f9ff' : '#ffffff',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        boxShadow: isLatest ? '0 1px 4px rgba(56, 189, 248, 0.15)' : 'none',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            color: isLatest ? '#0284c7' : '#94a3b8',
                          }}
                        >
                          MỐC #{index + 1}
                        </span>
                        {isLatest ? (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              background: '#0284c7',
                              color: '#ffffff',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                            }}
                          >
                            Mới nhất
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              background: '#ecfdf5',
                              color: '#047857',
                            }}
                          >
                            Đã ghi nhận
                          </span>
                        )}
                      </div>
                      <strong
                        style={{
                          fontSize: '0.86rem',
                          color: isLatest ? '#0c4a6e' : '#1e293b',
                          fontWeight: 700,
                          lineHeight: 1.35,
                        }}
                      >
                        {item.title}
                      </strong>
                      <div
                        style={{
                          fontSize: '0.72rem',
                          color: '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span>🕒</span>
                        <span style={{ fontFamily: 'monospace' }}>
                          {new Date(item.timestamp).toLocaleString('vi-VN')}
                        </span>
                      </div>
                      {item.note && (
                        <p
                          style={{
                            margin: '4px 0 0 0',
                            fontSize: '0.74rem',
                            color: '#475569',
                            background: isLatest ? 'rgba(255,255,255,0.7)' : '#f8fafc',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: '1px solid #f1f5f9',
                            lineHeight: 1.4,
                          }}
                        >
                          {item.note}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
          {order.items && order.items.length > 0 && (
            <section className="support-panel" style={{ padding: '17px 19px' }}>
              <h3 style={{ fontSize: '0.85rem', marginBottom: '12px', color: '#2c394d' }}>
                Danh sách sản phẩm trong đơn ({order.items.length})
              </h3>
              <div className="support-table-wrap">
                <table className="support-table">
                  <thead>
                    <tr>
                      <th>Mã SP</th>
                      <th>Tên sản phẩm</th>
                      <th>Số lượng</th>
                      <th>Đơn giá</th>
                      <th>Tổng tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((it, idx) => (
                      <tr key={`${it.productId}-${idx}`}>
                        <td>
                          <strong>{it.productId}</strong>
                        </td>
                        <td>{it.productName || 'Sản phẩm Nexus'}</td>
                        <td>{it.quantity}</td>
                        <td>{money(it.unitPrice)}</td>
                        <td>{money(it.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Biên bản Phán quyết Trọng tài Tranh chấp (Dispute Arbitration Verdict) */}
          {disputeCase &&
            (disputeCase.status === 'RESOLVED' ||
              disputeCase.status === 'REJECTED' ||
              disputeCase.status === 'APPROVED' ||
              disputeCase.decision ||
              disputeCase.verdict) && (
              <section
                className="support-panel"
                style={{
                  border:
                    disputeCase.status === 'REJECTED'
                      ? '1.5px solid #6366f1'
                      : disputeCase.status === 'RESOLVED' || disputeCase.status === 'APPROVED'
                        ? '1.5px solid #10b981'
                        : '1.5px solid #f59e0b',
                  background:
                    disputeCase.status === 'REJECTED'
                      ? '#f5f3ff'
                      : disputeCase.status === 'RESOLVED' || disputeCase.status === 'APPROVED'
                        ? '#ecfdf5'
                        : '#fffbeb',
                  padding: '16px 20px',
                  borderRadius: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>⚖️</span>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '8px',
                        marginBottom: '6px',
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                          fontSize: '0.88rem',
                          color:
                            disputeCase.status === 'REJECTED'
                              ? '#4338ca'
                              : disputeCase.status === 'RESOLVED' ||
                                  disputeCase.status === 'APPROVED'
                                ? '#065f46'
                                : '#b45309',
                          fontWeight: 700,
                        }}
                      >
                        {disputeCase.status === 'REJECTED'
                          ? 'Biên bản Trọng tài: Đã BÁC BỎ khiếu nại của Người mua (REJECTED)'
                          : disputeCase.status === 'RESOLVED' || disputeCase.status === 'APPROVED'
                            ? 'Biên bản Trọng tài: Đã CHẤP THUẬN bồi hoàn cho Người mua (RESOLVED)'
                            : 'Hồ sơ đang trong quá trình thụ lý Trọng tài tranh chấp (PENDING)'}
                      </h3>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background:
                            disputeCase.status === 'REJECTED'
                              ? '#ede9fe'
                              : disputeCase.status === 'RESOLVED' ||
                                  disputeCase.status === 'APPROVED'
                                ? '#d1fae5'
                                : '#fef3c7',
                          color:
                            disputeCase.status === 'REJECTED'
                              ? '#5b21b6'
                              : disputeCase.status === 'RESOLVED' ||
                                  disputeCase.status === 'APPROVED'
                                ? '#047857'
                                : '#92400e',
                          border: `1px solid ${
                            disputeCase.status === 'REJECTED'
                              ? '#c4b5fd'
                              : disputeCase.status === 'RESOLVED' ||
                                  disputeCase.status === 'APPROVED'
                                ? '#a7f3d0'
                                : '#fde68a'
                          }`,
                        }}
                      >
                        HỒ SƠ #{disputeCase.id || 'CS-ARBITRATION'}
                      </span>
                    </div>
                    <p
                      style={{
                        margin: '0 0 10px',
                        fontSize: '0.78rem',
                        color:
                          disputeCase.status === 'REJECTED'
                            ? '#4c1d95'
                            : disputeCase.status === 'RESOLVED' || disputeCase.status === 'APPROVED'
                              ? '#064e3b'
                              : '#78350f',
                        lineHeight: 1.5,
                      }}
                    >
                      <strong>Căn cứ phán quyết:</strong>{' '}
                      {disputeCase.resolutionNote ||
                        disputeCase.note ||
                        disputeCase.verdict?.note ||
                        'Trọng tài sàn đã hoàn tất phân xử vụ việc theo đúng quy chế sàn.'}
                    </p>
                    <div
                      style={{
                        fontSize: '0.72rem',
                        color: '#64748b',
                        display: 'flex',
                        gap: '16px',
                        flexWrap: 'wrap',
                        borderTop: '1px dashed #cbd5e1',
                        paddingTop: '8px',
                      }}
                    >
                      <span>
                        Loại khiếu nại:{' '}
                        <strong>{disputeCase.type || 'Hàng bị hư hỏng / nứt vỡ'}</strong>
                      </span>
                      {disputeCase.resolvedBy && (
                        <span>
                          Chuyên viên phân xử: <strong>{disputeCase.resolvedBy}</strong>
                        </span>
                      )}
                      {disputeCase.updatedAt && (
                        <span>
                          Thời điểm phán quyết:{' '}
                          <strong>{new Date(disputeCase.updatedAt).toLocaleString('vi-VN')}</strong>
                        </span>
                      )}
                      {disputeCase.status === 'REJECTED' && (
                        <span style={{ color: '#059669', fontWeight: 600 }}>
                          ✓ Quyền lợi Người bán: Bảo toàn 100% doanh thu & điểm uy tín
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

          {/* Thông báo Hoàn tiền PayOS thành công */}
          {isRefunded && (
            <section
              className="support-panel"
              style={{
                border: '1.5px solid #10b981',
                background: '#ecfdf5',
                padding: '16px 20px',
                borderRadius: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ fontSize: '1.3rem' }}>✓</span>
                <div>
                  <h3
                    style={{
                      margin: '0 0 4px',
                      fontSize: '0.85rem',
                      color: '#065f46',
                      fontWeight: 700,
                    }}
                  >
                    Đơn hàng đã được xử lý hoàn tiền thành công
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#047857', lineHeight: 1.5 }}>
                    {order.refundTransactionId ? (
                      <>
                        Mã giao dịch hoàn tiền (PayOS):{' '}
                        <strong className="font-mono text-emerald-900">
                          {order.refundTransactionId}
                        </strong>{' '}
                        · Số tiền hoàn:{' '}
                        <strong>{money(order.refundAmount || order.totalAmount)}</strong> · Cổng
                        thanh toán: <strong>PayOS Gateway</strong>
                      </>
                    ) : (
                      <>
                        Số tiền hoàn:{' '}
                        <strong>{money(order.refundAmount || order.totalAmount)}</strong> · Trạng
                        thái: <strong>ĐÃ_HOÀN_TIỀN</strong>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Cảnh báo khiếu nại Trả hàng / Hoàn tiền (Dispute Alert) */}
          {isDisputed && (
            <section
              className="support-panel"
              style={{
                border: '1.5px solid #f87171',
                background: '#fef2f2',
                padding: '16px 20px',
                borderRadius: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ fontSize: '1.3rem' }}>⚠️</span>
                <div>
                  <h3
                    style={{
                      margin: '0 0 4px',
                      fontSize: '0.85rem',
                      color: '#991b1b',
                      fontWeight: 700,
                    }}
                  >
                    Đơn hàng đang có khiếu nại Trả hàng / Hoàn tiền từ Người mua
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: '#7f1d1d', lineHeight: 1.5 }}>
                    Người mua đã gửi yêu cầu khiếu nại. Nhân viên Hỗ trợ cần xem xét bằng chứng và
                    lịch sử vận chuyển trước khi đưa ra phán quyết:{' '}
                    <strong>Chấp thuận hoàn tiền</strong> (qua nút &ldquo;Xử lý hoàn tiền&rdquo;)
                    hoặc <strong>Bác bỏ khiếu nại</strong> (qua nút &ldquo;Hủy yêu cầu hoàn
                    tiền&rdquo;).
                  </p>
                  <div style={{ marginTop: '10px' }}>
                    <Link
                      href={`/support/disputes?q=${encodeURIComponent(order.id)}&open=1`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#b91c1c',
                        color: '#ffffff',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '6px 12px',
                        borderRadius: '6px',
                        textDecoration: 'none',
                      }}
                    >
                      ⚖️ Chuyển sang giải quyết tranh chấp ngay →
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          )}

          <section className="support-panel support-actions-panel">
            <div>
              <p className="support-eyebrow">THAO TÁC HỖ TRỢ · HỆ THỐNG</p>
              <h2>Thao tác can thiệp đơn</h2>
              <p>
                Thao tác gửi yêu cầu tới Commerce API và tuân theo phân quyền của bộ phận Hỗ trợ.
              </p>
            </div>
            <div className="support-action-buttons">
              {!isCancelled && !isRefunded && !isDelivered && (
                <button
                  type="button"
                  style={{ background: '#059669', borderColor: '#059669', color: '#ffffff' }}
                  disabled={acting}
                  onClick={handleMarkAsDelivered}
                  title="Xác nhận đơn hàng đã giao thành công cho khách và đồng bộ trừ tồn kho"
                >
                  {acting ? 'Đang cập nhật…' : '✓ Xác nhận đã giao hàng'}
                </button>
              )}
              <button
                type="button"
                disabled={!canCancel}
                onClick={() => handleOpenDialog('cancel')}
                title={
                  isCancelled
                    ? 'Đơn hàng này đã được hủy'
                    : isDelivered
                      ? 'Không thể hủy đơn hàng đã giao thành công'
                      : isRefunded
                        ? 'Đơn hàng này đã được hoàn tiền'
                        : undefined
                }
              >
                {isCancelled ? 'Đã hủy đơn hàng' : 'Hủy đơn hàng'}
              </button>
              <button
                type="button"
                disabled={!canRefund}
                onClick={() => handleOpenDialog('refund')}
                title={isRefunded ? 'Đơn hàng này đã được xử lý hoàn tiền' : undefined}
              >
                {isRefunded ? 'Đã hoàn tiền' : 'Xử lý hoàn tiền'}
              </button>
              {!isCancelled && !isRefunded && (
                <button
                  type="button"
                  className="support-secondary-button"
                  disabled={acting}
                  onClick={() => handleOpenDialog('reject_refund')}
                  title="Hủy hoặc từ chối yêu cầu hoàn tiền của người mua"
                >
                  Hủy yêu cầu hoàn tiền
                </button>
              )}
            </div>
            {notice && (
              <p className="support-action-notice" role="status">
                {notice}
              </p>
            )}
          </section>
        </>
      )}

      {/* Form Dialog Modal chuẩn Design System không bị chồng lớp màu (BUG-03) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="p-6 max-w-md w-full">
          <DialogTitle className="text-lg font-bold text-slate-800">
            {actionKind === 'cancel'
              ? 'Xác nhận hủy đơn hàng'
              : actionKind === 'refund'
                ? 'Xác nhận xử lý hoàn tiền'
                : 'Xác nhận hủy yêu cầu hoàn tiền'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 mt-1">
            {actionKind === 'cancel'
              ? `Bạn đang thực hiện hủy đơn hàng ${order?.id}. Vui lòng nhập lý do can thiệp bên dưới:`
              : actionKind === 'refund'
                ? `Bạn đang phê duyệt hoàn tiền cho đơn hàng ${order?.id}. Vui lòng nhập ghi chú lý do hoàn tiền:`
                : `Bạn đang hủy / từ chối yêu cầu hoàn tiền cho đơn ${order?.id}. Vui lòng nhập lý do từ chối:`}
          </DialogDescription>
          <form onSubmit={handleConfirmAction} className="mt-4 space-y-4">
            {actionKind === 'refund' && (
              <div className="space-y-3 rounded-lg border border-sky-100 bg-sky-50/70 p-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPayOsRefund}
                    onChange={(e) => setIsPayOsRefund(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    Kích hoạt hoàn tiền tự động qua cổng PayOS (VietQR)
                  </span>
                </label>
                {isPayOsRefund && (
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Số tiền hoàn (₫):
                    </label>
                    <input
                      type="number"
                      min={1000}
                      max={order?.totalAmount ?? undefined}
                      value={customRefundAmount}
                      onChange={(e) => setCustomRefundAmount(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 outline-none focus:border-sky-500 bg-white"
                      required
                    />
                    <p className="mt-1 text-[10px] text-slate-500">
                      Mặc định hoàn toàn phần: {money(order?.totalAmount ?? 0)}. Bạn có thể điều
                      chỉnh để hoàn tiền một phần (Partial Refund).
                    </p>
                  </div>
                )}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lý do thao tác:
              </label>
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 outline-none focus:outline-none focus:border-sky-400 focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:border-sky-400 transition-colors resize-none"
                placeholder="Nhập lý do chi tiết..."
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={acting || !actionReason.trim()}
                className={`px-4 py-2 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition ${
                  actionKind === 'cancel'
                    ? 'bg-red-600 hover:bg-red-700'
                    : actionKind === 'refund'
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {acting
                  ? 'Đang xử lý…'
                  : actionKind === 'cancel'
                    ? 'Xác nhận hủy đơn'
                    : actionKind === 'refund'
                      ? 'Xác nhận hoàn tiền'
                      : 'Xác nhận hủy yêu cầu'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Toast Notification phản hồi tức thì (BUG-04) */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#047857',
            color: '#ffffff',
            fontSize: '0.82rem',
            fontWeight: 600,
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25)',
          }}
        >
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </>
  );
}
