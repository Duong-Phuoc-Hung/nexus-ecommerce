'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { supportShipmentsApi, type Shipment } from '@/modules/fulfillment/api/shipments.api';
import { userMessage } from '@/lib/axios/http';
import { slug, Heading, DemoBanner } from '../components/support-shared';
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

const LIFECYCLE_STEPS = [
  { key: 'READY_TO_PICK', label: 'Tạo vận đơn' },
  { key: 'PICKED', label: 'Lấy hàng' },
  { key: 'IN_TRANSIT', label: 'Đang giao' },
  { key: 'DELIVERED', label: 'Đã giao' },
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

  // Calculate current lifecycle step index (0: Tạo, 1: Lấy, 2: Giao, 3: Đã giao)
  const currentStepIndex = useMemo(() => {
    if (!selected) return 0;
    const code = selected.statusCode || selected.status;
    switch (code) {
      case 'DELIVERED':
        return 4; // all done
      case 'OUT_FOR_DELIVERY':
      case 'IN_TRANSIT':
        return 2; // currently delivering
      case 'PICKED':
        return 1; // picked up
      case 'READY_TO_PICK':
      default:
        return 0; // created
    }
  }, [selected]);

  // Deduplicate timeline entries to fix duplicate "Đã giao" or repeating titles
  const cleanTimeline = useMemo(() => {
    if (!selected?.timeline) return [];
    const filtered: typeof selected.timeline = [];
    for (const item of selected.timeline) {
      const last = filtered[filtered.length - 1];
      const isDuplicate =
        last &&
        (last.title.trim().toLowerCase() === item.title.trim().toLowerCase() ||
          (last.title.includes('Đã giao') && item.title.includes('Đã giao')));
      if (isDuplicate) {
        if (!last.location && item.location) last.location = item.location;
        if (!last.timestamp && item.timestamp) last.timestamp = item.timestamp;
        continue;
      }
      filtered.push({ ...item });
    }
    return filtered;
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
                        className={`support-status ${slug(shipment.statusCode || shipment.status)}`}
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
            <span className={`support-status ${slug(selected.statusCode || selected.status)}`}>
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

            {/* Thanh tiến trình giao hàng 4 bước trực quan có màu sắc */}
            <div className="support-stepper-container">
              <h3 className="support-section-subtitle">Tiến trình vận chuyển đơn hàng</h3>
              <div className="support-stepper">
                {LIFECYCLE_STEPS.map((step, idx) => {
                  const isDone = currentStepIndex > idx;
                  const isCurrent = currentStepIndex === idx;
                  return (
                    <div
                      key={step.key}
                      className={`support-step-item ${isDone ? 'is-done' : isCurrent ? 'is-current' : 'is-pending'}`}
                    >
                      <div className="support-step-indicator">
                        <div className="support-step-badge">{isDone ? '✓' : idx + 1}</div>
                        {idx < LIFECYCLE_STEPS.length - 1 && (
                          <div className={`support-step-line ${isDone ? 'is-active' : ''}`} />
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
                  className={item.status === 'done' ? 'complete' : item.status}
                  key={`${item.title}-${item.timestamp ?? idx}`}
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
