'use client';

import { useEffect, useState } from 'react';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { supportShipmentsApi, type Shipment } from '@/modules/fulfillment/api/shipments.api';
import { userMessage } from '@/lib/axios/http';
import { slug, Heading, DemoBanner } from '../components/support-shared';

const statuses = [
  'READY_TO_PICK',
  'PICKED',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'FAILED',
  'RETURNED',
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
      setNotice('Đã cập nhật trạng thái vận đơn.');
    } catch (err) {
      setNotice(userMessage(err));
    } finally {
      setActing(false);
    }
  }

  async function manualOverride() {
    if (!selected) return;
    const city = window.prompt('Nhập khu vực vận đơn cần điều chỉnh:', selected.city);
    if (city === null || !city.trim()) return;
    setActing(true);
    setNotice('');
    try {
      const updated = await supportShipmentsApi.override(selected.id, {
        city: city.trim(),
        reason: 'Điều chỉnh thủ công từ Support Staff.',
      });
      setSelected(updated);
      setShipments((items) => items.map((item) => (item.id === updated.id ? updated : item)));
      setNotice('Đã điều chỉnh thông tin vận đơn.');
    } catch (err) {
      setNotice(userMessage(err));
    } finally {
      setActing(false);
    }
  }

  return (
    <>
      <Heading
        label="SUPPORT STAFF / FULFILLMENT"
        title="Tra cứu vận đơn"
        description="Tìm theo mã vận đơn, mã đơn, người nhận hoặc hãng vận chuyển."
      />
      <DemoBanner message="Vận đơn được tải và cập nhật qua Support/Fulfillment API." />
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
                  <th>Hãng</th>
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
                      <span className={`support-status ${slug(shipment.status)}`}>
                        {shipment.status}
                      </span>
                    </td>
                    <td>{shipment.updated}</td>
                    <td>
                      <button
                        className="support-row-link"
                        type="button"
                        onClick={() => openShipment(shipment.id)}
                      >
                        Xem
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
              <p className="support-eyebrow">SHIPMENT DETAIL · API</p>
              <h2>{selected.code}</h2>
            </div>
            <span className={`support-status ${slug(selected.status)}`}>{selected.status}</span>
          </div>
          <div className="support-detail-content">
            <div className="support-info-grid">
              <div>
                <small>Đơn hàng</small>
                <strong>{selected.order}</strong>
              </div>
              <div>
                <small>Hãng vận chuyển</small>
                <strong>{selected.carrier}</strong>
              </div>
              <div>
                <small>Người nhận</small>
                <strong>{selected.recipient}</strong>
              </div>
              <div>
                <small>Khu vực</small>
                <strong>{selected.city}</strong>
              </div>
              <div>
                <small>Vị trí cập nhật</small>
                <strong>{selected.currentLocation}</strong>
              </div>
              <div>
                <small>Cập nhật cuối</small>
                <strong>{selected.updated}</strong>
              </div>
            </div>
            <ol className="support-timeline">
              {selected.timeline.map((item) => (
                <li className={item.status} key={`${item.title}-${item.timestamp ?? ''}`}>
                  <span />
                  <div>
                    <strong>{item.title}</strong>
                    <small>
                      {item.timestamp}
                      {item.location ? ` · ${item.location}` : ''}
                    </small>
                  </div>
                </li>
              ))}
            </ol>
            <div className="support-action-buttons">
              <select
                value={nextStatus}
                onChange={(event) => setNextStatus(event.target.value)}
                aria-label="Trạng thái vận đơn"
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <button type="button" disabled={acting} onClick={updateStatus}>
                Cập nhật trạng thái
              </button>
              <button type="button" disabled={acting} onClick={manualOverride}>
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
    </>
  );
}
