'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { supportShipmentsApi, type Shipment } from '@/modules/fulfillment/api/shipments.api';
import { userMessage } from '@/lib/axios/http';
import { slug, supportStatusClass, Heading, DemoBanner } from '../components/support-shared';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export const SHIPMENT_STATUSES: { value: string; label: string }[] = [
  { value: 'READY_TO_PICK', label: 'Chờ lấy hàng' },
  { value: 'PICKED', label: 'Đã lấy hàng' },
  { value: 'IN_TRANSIT', label: 'Đang vận chuyển' },
  { value: 'OUT_FOR_DELIVERY', label: 'Đang giao hàng' },
  { value: 'DELIVERED', label: 'Đã giao hàng' },
  { value: 'FAILED', label: 'Giao hàng thất bại' },
  { value: 'RETURNED', label: 'Đã trả hàng' },
];

export function getShipmentStatusLabel(statusCode: string, fallback?: string): string {
  const match = SHIPMENT_STATUSES.find((s) => s.value === statusCode);
  return match ? match.label : fallback || statusCode;
}

function formatSafeDate(val?: string): string {
  if (!val) return '';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} · ${hours}:${minutes}`;
  } catch {
    return val;
  }
}

const LIFECYCLE_STEPS = [
  { key: 'READY_TO_PICK', label: 'Tạo vận đơn', classKey: 'step-ready-to-pick' },
  { key: 'PICKED', label: 'Lấy hàng', classKey: 'step-picked' },
  { key: 'IN_TRANSIT', label: 'Đang vận chuyển', classKey: 'step-in-transit' },
  { key: 'OUT_FOR_DELIVERY', label: 'Đang giao hàng', classKey: 'step-out-for-delivery' },
  { key: 'DELIVERED', label: 'Đã giao hàng', classKey: 'step-delivered' },
];

export function SupportShipmentsPage() {
  const [query, setQuery] = useState('');
  const search = useDebouncedValue(query, 500);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selected, setSelected] = useState<Shipment | null>(null);
  const [nextStatus, setNextStatus] = useState('IN_TRANSIT');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  // Dialog state for manual area override
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideCity, setOverrideCity] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    supportShipmentsApi
      .list({ q: search.trim(), limit: 50 }, controller.signal)
      .then((page) => setShipments(page.items))
      .catch((err) => !controller.signal.aborted && setError(userMessage(err)))
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [search]);

  async function openShipment(id: string) {
    setNotice('');
    try {
      const detail = await supportShipmentsApi.getById(id);
      setSelected(detail);
      setNextStatus(detail.statusCode);
    } catch (err) {
      setError(userMessage(err));
    }
  }

  async function updateStatus() {
    if (!selected) return;
    setActing(true);
    setNotice('');
    try {
      const updated = await supportShipmentsApi.updateStatus(selected.id, {
        status: nextStatus,
        location: selected.currentLocation,
        note: 'Cập nhật từ Support Staff.',
      });
      setSelected(updated);
      setShipments((items) => items.map((item) => (item.id === updated.id ? updated : item)));
      setNotice('Đã cập nhật trạng thái vận đơn thành công.');
    } catch (err) {
      setNotice(userMessage(err));
    } finally {
      setActing(false);
    }
  }

  function handleOpenOverride() {
    if (!selected) return;
    setOverrideCity(selected.city || '');
    setOverrideOpen(true);
  }

  async function handleConfirmOverride(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !overrideCity.trim()) return;
    setActing(true);
    setNotice('');
    try {
      const updated = await supportShipmentsApi.override(selected.id, {
        city: overrideCity.trim(),
        reason: 'Điều chỉnh thủ công từ Support Staff.',
      });
      setSelected(updated);
      setShipments((items) => items.map((item) => (item.id === updated.id ? updated : item)));
      setNotice('Đã điều chỉnh khu vực vận đơn thành công.');
      setOverrideOpen(false);
    } catch (err) {
      setNotice(userMessage(err));
    } finally {
      setActing(false);
    }
  }

  // Handler kích hoạt luồng hoàn hàng
  async function handleTriggerReturn(reason?: string) {
    if (!selected) return;
    setActing(true);
    setNotice('');
    try {
      const updated = await supportShipmentsApi.updateStatus(selected.id, {
        status: 'RETURNED',
        location: `${selected.city || 'Kho người bán'} · Trung tâm chuyển hoàn`,
        note: reason || 'Kích hoạt quy trình chuyển hoàn hàng về kho người bán.',
      });
      setSelected(updated);
      setShipments((items) => items.map((item) => (item.id === updated.id ? updated : item)));
      setNotice(
        'Đã kích hoạt quy trình chuyển hoàn và cập nhật trạng thái "Đã trả hàng" thành công.',
      );
    } catch (err) {
      setNotice(userMessage(err));
    } finally {
      setActing(false);
    }
  }

  // Handler kích hoạt báo giao thất bại
  async function handleTriggerFailed() {
    if (!selected) return;
    setActing(true);
    setNotice('');
    try {
      const updated = await supportShipmentsApi.updateStatus(selected.id, {
        status: 'FAILED',
        location: selected.currentLocation || selected.city,
        note: 'Giao hàng không thành công: Người nhận từ chối hoặc không liên lạc được.',
      });
      setSelected(updated);
      setShipments((items) => items.map((item) => (item.id === updated.id ? updated : item)));
      setNotice('Đã cập nhật trạng thái vận đơn sang: Giao hàng thất bại.');
    } catch (err) {
      setNotice(userMessage(err));
    } finally {
      setActing(false);
    }
  }

  // Xây dựng Stepper động tuân thủ State Machine một chiều theo SRS 3.6.2 & 2.8
  const stepperSteps = useMemo(() => {
    if (!selected) return [];
    const code = selected.statusCode || selected.status;
    const isFailed = code === 'FAILED';
    const isReturned = code === 'RETURNED';

    if (isFailed || isReturned) {
      return [
        {
          key: 'READY_TO_PICK',
          label: 'Tạo vận đơn',
          state: 'done',
          icon: '✓',
          classKey: 'step-ready-to-pick',
        },
        {
          key: 'PICKED',
          label: 'Đã lấy hàng',
          state: 'done',
          icon: '✓',
          classKey: 'step-picked',
        },
        {
          key: 'IN_TRANSIT',
          label: 'Đang vận chuyển',
          state: 'done',
          icon: '✓',
          classKey: 'step-in-transit',
        },
        {
          key: 'FAILED',
          label: 'Giao thất bại',
          state: isReturned ? 'done' : 'failed',
          icon: isReturned ? '✓' : '✕',
          classKey: 'step-failed',
        },
        {
          key: 'RETURNED',
          label: isReturned ? 'Đã hoàn hàng' : 'Đang hoàn hàng',
          state: isReturned ? 'returned' : 'pending',
          icon: isReturned ? '✓' : '↻',
          classKey: 'step-returned',
        },
      ];
    }

    const stepIdx = (() => {
      switch (code) {
        case 'DELIVERED':
          return 4;
        case 'OUT_FOR_DELIVERY':
          return 3;
        case 'IN_TRANSIT':
          return 2;
        case 'PICKED':
          return 1;
        case 'READY_TO_PICK':
        default:
          return 0;
      }
    })();

    const baseSteps = [
      { key: 'READY_TO_PICK', label: 'Tạo vận đơn', classKey: 'step-ready-to-pick' },
      { key: 'PICKED', label: 'Lấy hàng', classKey: 'step-picked' },
      { key: 'IN_TRANSIT', label: 'Đang vận chuyển', classKey: 'step-in-transit' },
      { key: 'OUT_FOR_DELIVERY', label: 'Đang giao hàng', classKey: 'step-out-for-delivery' },
      { key: 'DELIVERED', label: 'Đã giao hàng', classKey: 'step-delivered' },
    ];

    return baseSteps.map((step, idx) => {
      const isDone = stepIdx > idx;
      const isCurrent = stepIdx === idx;
      return {
        key: step.key,
        label: step.label,
        state: isDone ? 'done' : isCurrent ? 'current' : 'pending',
        icon: isDone || (isCurrent && step.key === 'DELIVERED') ? '✓' : String(idx + 1),
        classKey: step.classKey,
      };
    });
  }, [selected]);

  // Synchronize timeline with lifecycle steps including failure and returns
  const cleanTimeline = useMemo(() => {
    if (!selected) return [];
    const code = selected.statusCode || selected.status;
    const isFailed = code === 'FAILED';
    const isReturned = code === 'RETURNED';

    const stepIdx = (() => {
      if (isFailed || isReturned) return 3;
      switch (code) {
        case 'DELIVERED':
          return 4;
        case 'OUT_FOR_DELIVERY':
          return 3;
        case 'IN_TRANSIT':
          return 2;
        case 'PICKED':
          return 1;
        case 'READY_TO_PICK':
        default:
          return 0;
      }
    })();

    const createdTime = formatSafeDate(selected.createdAt) || selected.updated;
    const updatedTime = selected.updated || formatSafeDate(selected.updatedAt);
    const location = selected.currentLocation || selected.city || 'Trung tâm xử lý';
    const recipient = selected.recipient || selected.recipientName || 'người nhận';

    const items: {
      key: string;
      title: string;
      status: 'done' | 'current' | 'pending';
      statusClass?: string;
      timestamp?: string;
      location?: string;
      description?: string;
    }[] = [
      {
        key: 'READY_TO_PICK',
        title: 'Đã tạo vận đơn',
        status: stepIdx > 0 ? 'done' : 'current',
        statusClass: stepIdx === 0 ? 'timeline-ready-to-pick' : undefined,
        timestamp: createdTime,
        location: stepIdx === 0 ? location : undefined,
        description: 'Hệ thống đã phát hành vận đơn và mã vận chuyển thành công.',
      },
      {
        key: 'PICKED',
        title: stepIdx >= 1 ? 'Đã lấy hàng' : 'Lấy hàng',
        status: stepIdx > 1 ? 'done' : stepIdx === 1 ? 'current' : 'pending',
        statusClass: stepIdx === 1 ? 'timeline-picked' : undefined,
        timestamp: stepIdx >= 1 ? updatedTime : undefined,
        location: stepIdx === 1 ? location : undefined,
        description:
          stepIdx >= 1
            ? 'Bưu tá đã lấy hàng thành công từ kho của người bán.'
            : 'Đang đợi bưu tá tới kho người bán để lấy hàng.',
      },
      {
        key: 'IN_TRANSIT',
        title: stepIdx >= 2 ? 'Đang vận chuyển' : 'Vận chuyển liên tỉnh',
        status: stepIdx > 2 ? 'done' : stepIdx === 2 ? 'current' : 'pending',
        statusClass: stepIdx === 2 ? 'timeline-in-transit' : undefined,
        timestamp: stepIdx >= 2 ? updatedTime : undefined,
        location: stepIdx === 2 ? location : undefined,
        description:
          stepIdx >= 2
            ? `Kiện hàng đang trung chuyển qua: ${location}.`
            : 'Kiện hàng sẽ được chuyển tới trung tâm phân loại.',
      },
    ];

    if (isFailed || isReturned) {
      items.push({
        key: 'FAILED',
        title: 'Giao hàng thất bại',
        status: isReturned ? 'done' : 'current',
        statusClass: 'timeline-failed',
        timestamp: updatedTime,
        location,
        description:
          'Bưu tá phát hàng không thành công. Kiện hàng đang chờ chuyển hoàn hoặc xử lý lại.',
      });
      if (isReturned) {
        items.push({
          key: 'RETURNED',
          title: 'Đã hoàn hàng về kho người bán',
          status: 'current',
          statusClass: 'timeline-delivered',
          timestamp: updatedTime,
          location: `${selected.city || 'Kho người bán'} · Trung tâm hoàn trả`,
          description: 'Kiện hàng đã được chuyển hoàn về kho của người bán thành công.',
        });
      }
    } else {
      items.push(
        {
          key: 'OUT_FOR_DELIVERY',
          title: stepIdx >= 3 ? 'Đang giao hàng' : 'Giao hàng tận nơi',
          status: stepIdx > 3 ? 'done' : stepIdx === 3 ? 'current' : 'pending',
          statusClass: stepIdx === 3 ? 'timeline-out-for-delivery' : undefined,
          timestamp: stepIdx >= 3 ? updatedTime : undefined,
          location: stepIdx === 3 ? location : undefined,
          description:
            stepIdx >= 3
              ? `Bưu tá đang phát hàng tới ${recipient}.`
              : 'Bưu cục phát sẽ phân công bưu tá giao hàng tới địa chỉ người nhận.',
        },
        {
          key: 'DELIVERED',
          title: stepIdx === 4 ? 'Đã giao hàng thành công' : 'Đã giao hàng',
          status: stepIdx === 4 ? 'current' : 'pending',
          statusClass: stepIdx === 4 ? 'timeline-delivered' : undefined,
          timestamp: stepIdx === 4 ? updatedTime : undefined,
          location: stepIdx === 4 ? location : undefined,
          description:
            stepIdx === 4
              ? `Đã giao kiện hàng thành công tới ${recipient}.`
              : 'Dự kiến phát hàng trong 24-48 giờ tới.',
        },
      );
    }

    return items;
  }, [selected]);

  return (
    <>
      <Heading
        label="BỘ PHẬN HỖ TRỢ / VẬN CHUYỂN"
        title="Tra cứu vận đơn"
        description="Tìm theo mã vận đơn, mã đơn hàng, người nhận hoặc hãng vận chuyển."
      />
      <DemoBanner message="Vận đơn được tải và cập nhật trực tiếp qua API." />
      <section className="support-panel">
        <div className="support-toolbar">
          <label className="support-search">
            <span>⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ví dụ: GHN8829103VN"
              aria-label="Tìm vận đơn"
            />
          </label>
          <span>{loading ? 'Đang tải…' : `${shipments.length} vận đơn`}</span>
        </div>
        {error ? (
          <div className="support-empty">{error}</div>
        ) : (
          <div className="support-table-wrap">
            <table className="support-table">
              <thead>
                <tr>
                  <th>Mã vận đơn</th>
                  <th>Mã đơn</th>
                  <th>Hãng vận chuyển</th>
                  <th>Người nhận</th>
                  <th>Trạng thái</th>
                  <th>Cập nhật gần nhất</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(shipments || []).map((shipment) => (
                  <tr key={shipment.id}>
                    <td>
                      <strong>{shipment.code}</strong>
                    </td>
                    <td>{shipment.order}</td>
                    <td>{shipment.carrier}</td>
                    <td>{shipment.recipient}</td>
                    <td>
                      <span
                        className={`support-status ${supportStatusClass(shipment.statusCode || shipment.status)}`}
                      >
                        {getShipmentStatusLabel(shipment.statusCode, shipment.status)}
                      </span>
                    </td>
                    <td>{shipment.updated}</td>
                    <td>
                      <button
                        className="support-row-link"
                        type="button"
                        onClick={() => openShipment(shipment.id)}
                      >
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && shipments.length === 0 && (
              <div className="support-empty">Không tìm thấy vận đơn phù hợp.</div>
            )}
          </div>
        )}
      </section>

      {selected && (
        <section className="support-panel support-shipment-card">
          <div className="support-panel-heading">
            <div>
              <p className="support-eyebrow">CHI TIẾT VẬN ĐƠN · HỆ THỐNG</p>
              <h2>{selected.code}</h2>
            </div>
            <span
              className={`support-status ${supportStatusClass(selected.statusCode || selected.status)}`}
            >
              {getShipmentStatusLabel(selected.statusCode, selected.status)}
            </span>
          </div>
          <div className="support-detail-content">
            <div className="support-info-grid">
              <div>
                <small>Đơn hàng liên kết</small>
                <strong>{selected.order}</strong>
              </div>
              <div>
                <small>Đơn vị vận chuyển</small>
                <strong>{selected.carrier}</strong>
              </div>
              <div>
                <small>Người nhận</small>
                <strong>{selected.recipient}</strong>
              </div>
              <div>
                <small>Khu vực giao</small>
                <strong>{selected.city}</strong>
              </div>
              <div>
                <small>Vị trí ghi nhận</small>
                <strong>{selected.currentLocation}</strong>
              </div>
              <div>
                <small>Thời gian cập nhật</small>
                <strong>{selected.updated}</strong>
              </div>
            </div>

            {/* Thanh tiến trình giao hàng tuân thủ State Machine một chiều */}
            <div className="support-stepper-container">
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <h3 className="support-section-subtitle">Tiến trình vận chuyển đơn hàng</h3>
                {(selected.statusCode === 'FAILED' || selected.statusCode === 'RETURNED') && (
                  <span
                    className="support-role"
                    style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' }}
                  >
                    Luồng sự cố / Hoàn hàng
                  </span>
                )}
              </div>
              <div className="support-stepper">
                {stepperSteps.map((step, idx) => {
                  const isDone = step.state === 'done';
                  const isCurrent = step.state === 'current';
                  const isFailed = step.state === 'failed';
                  const isReturned = step.state === 'returned';

                  return (
                    <div
                      key={step.key}
                      className={`support-step-item ${
                        isDone
                          ? 'is-done'
                          : isFailed
                            ? `is-current is-failed ${step.classKey}`
                            : isReturned
                              ? `is-current is-returned ${step.classKey}`
                              : isCurrent
                                ? `is-current ${step.classKey}`
                                : 'is-pending'
                      }`}
                    >
                      <div className="support-step-indicator">
                        <div className="support-step-badge">{step.icon}</div>
                        {idx < stepperSteps.length - 1 && (
                          <div
                            className={`support-step-line ${
                              isDone
                                ? 'is-active'
                                : isFailed
                                  ? 'is-failed'
                                  : isReturned
                                    ? 'is-returned'
                                    : ''
                            }`}
                          />
                        )}
                      </div>
                      <span className="support-step-text">{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chi tiết nhật ký hành trình */}
            <h3 className="support-section-subtitle" style={{ marginTop: '24px' }}>
              Nhật ký hành trình vận đơn
            </h3>
            <ol className="support-timeline">
              {cleanTimeline.map((item, idx) => (
                <li
                  className={`${item.status === 'done' ? 'complete' : item.status} ${item.statusClass || ''}`}
                  key={item.key || `${item.title}-${item.timestamp ?? idx}`}
                >
                  <span />
                  <div>
                    <strong>{item.title}</strong>
                    <small>
                      {item.timestamp}
                      {item.location ? ` · ${item.location}` : ''}
                    </small>
                    {item.description && (
                      <p className="support-timeline-desc">{item.description}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>

            <div className="support-action-buttons">
              <div style={{ minWidth: 200 }}>
                <Select value={nextStatus} onValueChange={setNextStatus}>
                  <SelectTrigger aria-label="Trạng thái vận đơn">
                    <SelectValue placeholder="Chọn trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIPMENT_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <button type="button" disabled={acting} onClick={updateStatus}>
                {acting ? 'Đang cập nhật…' : 'Cập nhật trạng thái'}
              </button>
              <button
                type="button"
                className="support-secondary-button"
                disabled={acting}
                onClick={handleOpenOverride}
              >
                Điều chỉnh khu vực
              </button>
              {selected.statusCode === 'FAILED' && (
                <button
                  type="button"
                  className="support-button-return"
                  disabled={acting}
                  onClick={() =>
                    handleTriggerReturn(
                      'Kích hoạt chuyển hoàn kiện hàng về kho người bán do giao thất bại.',
                    )
                  }
                >
                  ↻ Yêu cầu hoàn hàng / Chuyển hoàn
                </button>
              )}
              {selected.statusCode === 'OUT_FOR_DELIVERY' && (
                <button
                  type="button"
                  className="support-button-danger"
                  disabled={acting}
                  onClick={handleTriggerFailed}
                >
                  ✕ Báo giao hàng thất bại
                </button>
              )}
              {selected.statusCode === 'DELIVERED' && (
                <button
                  type="button"
                  className="support-button-return"
                  disabled={acting}
                  onClick={() =>
                    handleTriggerReturn('Xử lý yêu cầu trả hàng / hoàn tiền sau khi đã nhận hàng.')
                  }
                >
                  ↻ Xử lý yêu cầu trả hàng
                </button>
              )}
            </div>

            {notice && (
              <p className="support-action-notice" role="status">
                {notice}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Form Dialog Modal điều chỉnh khu vực thay thế prompt */}
      <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
        <DialogContent className="p-6 bg-white rounded-2xl shadow-2xl max-w-md w-full">
          <DialogTitle className="text-lg font-bold text-slate-800">
            Điều chỉnh khu vực vận đơn
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 mt-1">
            Cập nhật thông tin khu vực / thành phố giao hàng cho mã vận đơn{' '}
            <strong className="text-slate-700">{selected?.code}</strong>.
          </DialogDescription>
          <form onSubmit={handleConfirmOverride} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Khu vực / Tỉnh, Thành phố:
              </label>
              <input
                type="text"
                value={overrideCity}
                onChange={(e) => setOverrideCity(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 outline-none focus:outline-none focus:border-sky-400 focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:border-sky-400 transition-colors"
                placeholder="Ví dụ: TP. Hồ Chí Minh"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOverrideOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={acting || !overrideCity.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {acting ? 'Đang lưu…' : 'Xác nhận cập nhật'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
