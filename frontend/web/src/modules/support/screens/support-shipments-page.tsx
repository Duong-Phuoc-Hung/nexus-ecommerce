'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { shipments, slug, Heading, DemoBanner } from '../components/support-shared';
export function SupportShipmentsPage() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(shipments[0]);
  const [notice, setNotice] = useState('');
  const filtered = useMemo(
    () =>
      shipments.filter((shipment) =>
        `${shipment.code} ${shipment.order} ${shipment.recipient} ${shipment.carrier}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [query],
  );
  return (
    <>
      <Heading
        label="SUPPORT STAFF / FULFILLMENT"
        title="Tra cứu vận đơn"
        description="Tìm theo mã vận đơn, mã đơn, người nhận hoặc hãng vận chuyển."
      />
      <DemoBanner />
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
          <span>{filtered.length} vận đơn minh họa</span>
        </div>
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
              {filtered.map((shipment) => (
                <tr key={shipment.code}>
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
                      onClick={() => {
                        setSelected(shipment);
                        setNotice('');
                      }}
                    >
                      Xem
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="support-empty">Không tìm thấy vận đơn phù hợp.</div>
          )}
        </div>
      </section>
      {selected && (
        <section className="support-panel support-shipment-card">
          <div className="support-panel-heading">
            <div>
              <p className="support-eyebrow">SHIPMENT DETAIL · DEMO</p>
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
                <strong>{selected.city} · Trung tâm phân loại</strong>
              </div>
              <div>
                <small>Cập nhật cuối</small>
                <strong>{selected.updated}</strong>
              </div>
            </div>
            <div className="support-shipment-timeline">
              <span className="done">Đã tạo vận đơn</span>
              <i />
              <span className="done">Đã lấy hàng</span>
              <i />
              <span className={selected.status === 'Đã giao' ? 'done' : 'current'}>
                {selected.status}
              </span>
              <i />
              <span>Đã giao</span>
            </div>
            <div className="support-action-buttons">
              <button
                type="button"
                onClick={() => setNotice('Demo: cập nhật trạng thái chưa gửi lên BE.')}
              >
                Cập nhật trạng thái
              </button>
              <button
                type="button"
                onClick={() => setNotice('Demo: điều chỉnh vận đơn thủ công chưa gửi lên BE.')}
              >
                Điều chỉnh thủ công
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
