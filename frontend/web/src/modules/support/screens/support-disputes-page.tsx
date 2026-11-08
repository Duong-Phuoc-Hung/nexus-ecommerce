'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { supportApi, type DisputeCase, type DisputeVerdictPayload } from '../api/support.api';
import { userMessage } from '@/lib/axios/http';
import { Heading, DemoBanner, money, supportStatusClass } from '../components/support-shared';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export function SupportDisputesPage() {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const search = useDebouncedValue(query, 500);

  const [disputes, setDisputes] = useState<DisputeCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal phán quyết trọng tài
  const [selectedCase, setSelectedCase] = useState<DisputeCase | null>(null);
  const [verdictOpen, setVerdictOpen] = useState(false);
  const [verdictDecision, setVerdictDecision] = useState<
    'REFUND_BUYER' | 'REJECT_BUYER' | 'REQUIRE_RETURN_FIRST'
  >('REFUND_BUYER');
  const [liableParty, setLiableParty] = useState<'SELLER' | 'BUYER' | 'CARRIER' | 'PLATFORM'>(
    'SELLER',
  );
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [verdictNote, setVerdictNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }

  function loadDisputes() {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    supportApi
      .listDisputes(
        {
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          q: search.trim() || undefined,
          limit: 50,
        },
        controller.signal,
      )
      .then((res) => {
        setDisputes(res.items);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(userMessage(err));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }

  useEffect(() => {
    return loadDisputes();
  }, [search, statusFilter]);

  function openVerdictModal(dispute: DisputeCase) {
    setSelectedCase(dispute);
    setVerdictDecision('REFUND_BUYER');
    setLiableParty('SELLER');
    setRefundAmount(1290000);
    setVerdictNote(
      'Sau khi đối soát bằng chứng ảnh mở hộp từ Buyer và mã vận đơn đối soát của 3PL, hội đồng Support Staff ra phán quyết hoàn tiền cho khách.',
    );
    setVerdictOpen(true);
  }

  async function handleConfirmVerdict(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCase) return;

    if (!verdictNote.trim()) {
      alert('Vui lòng nhập căn cứ phán quyết (ghi chú kiểm toán trọng tài).');
      return;
    }

    setSubmitting(true);
    try {
      const payload: DisputeVerdictPayload = {
        decision: verdictDecision,
        liableParty,
        refundAmount: verdictDecision === 'REFUND_BUYER' ? refundAmount : undefined,
        note: verdictNote.trim(),
      };

      await supportApi.issueVerdict(selectedCase.caseId || selectedCase.id, payload);
      showToast(
        `Đã ban hành phán quyết trọng tài cho ca #${selectedCase.orderCode || selectedCase.orderId} thành công!`,
      );
      setVerdictOpen(false);
      loadDisputes();
    } catch (err) {
      alert(`Lỗi khi ban hành phán quyết: ${userMessage(err)}`);
    } finally {
      setSubmitting(false);
    }
  }

  const urgentCount = disputes.filter(
    (d) => d.isSlaOverdue || (d.slaRemainingHours !== undefined && d.slaRemainingHours < 4),
  ).length;

  return (
    <>
      <Heading
        label="SUPPORT STAFF / ARBITRATION"
        title="Trọng tài tranh chấp (Disputes SLA Queue)"
        description="Hàng đợi phân xử tranh chấp khiếu nại Buyer - Seller theo chuẩn SRS 2.3 & 3.1.2 kèm thời hạn SLA và đối soát bằng chứng 2 bên."
      />

      <DemoBanner message="Hàng đợi kết nối trực tiếp với Arbitration & Dispute Engine của Fulfillment Service (Port 5435)." />

      {toastMessage && (
        <div className="support-toast" role="status">
          ✓ {toastMessage}
        </div>
      )}

      {/* SLA Metric Cards */}
      <section className="support-stats">
        <article>
          <span>Tổng ca tranh chấp</span>
          <strong>{disputes.length}</strong>
          <small>Hồ sơ cần phân xử</small>
        </article>
        <article>
          <span>Khẩn cấp & Quá hạn SLA</span>
          <strong style={{ color: urgentCount > 0 ? '#ef4444' : '#10b981' }}>{urgentCount}</strong>
          <small>{urgentCount > 0 ? 'Cần ban hành phán quyết gấp' : 'An toàn trong SLA'}</small>
        </article>
        <article>
          <span>Độ ưu tiên cao (URGENT)</span>
          <strong>
            {disputes.filter((d) => d.priority === 'URGENT' || d.priority === 'HIGH').length}
          </strong>
          <small>Ảnh hưởng điểm uy tín Seller</small>
        </article>
        <article>
          <span>Cơ chế bảo lãnh</span>
          <strong style={{ color: '#0ea5e9' }}>SRS 2.3</strong>
          <small>Phạt điểm Seller & Bồi hoàn Buyer</small>
        </article>
      </section>

      {/* Filters */}
      <section className="support-panel">
        <div className="support-toolbar">
          <input
            type="search"
            placeholder="Tìm theo mã đơn (NX-ORD-8021), mã case hoặc lý do tranh chấp..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="support-search-input"
          />

          <div style={{ width: 220 }}>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                <SelectItem value="PENDING">Đang chờ phán quyết (PENDING)</SelectItem>
                <SelectItem value="RESOLVED">Đã giải quyết (RESOLVED)</SelectItem>
                <SelectItem value="REJECTED">Đã bác bỏ (REJECTED)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {error ? (
          <p className="support-empty" style={{ color: '#ef4444' }}>
            {error}
          </p>
        ) : loading ? (
          <p className="support-empty">Đang tải danh sách hồ sơ tranh chấp...</p>
        ) : disputes.length === 0 ? (
          <p className="support-empty">
            Hiện không có ca tranh chấp nào cần giải quyết trong tiêu chí lọc.
          </p>
        ) : (
          <div className="support-table-wrap">
            <table className="support-table">
              <thead>
                <tr>
                  <th>MÃ CASE</th>
                  <th>ĐƠN HÀNG</th>
                  <th>KHÁCH HÀNG</th>
                  <th>LÝ DO TRANH CHẤP</th>
                  <th>ĐỘ ƯU TIÊN</th>
                  <th>THỜI HẠN SLA</th>
                  <th>TRẠNG THÁI</th>
                  <th style={{ textAlign: 'right' }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {disputes.map((item) => {
                  const isOverdue =
                    item.isSlaOverdue ||
                    (item.slaRemainingHours !== undefined && item.slaRemainingHours <= 0);
                  const isUrgent =
                    item.slaRemainingHours !== undefined &&
                    item.slaRemainingHours > 0 &&
                    item.slaRemainingHours < 4;

                  return (
                    <tr key={item.id || item.caseId}>
                      <td>
                        <strong style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                          {(item.id || item.caseId || '').slice(0, 8)}...
                        </strong>
                      </td>
                      <td>
                        <Link
                          href={`/support/orders/${item.orderCode || item.order || item.orderId}`}
                          style={{ color: '#0284c7', fontWeight: 600 }}
                        >
                          {item.orderCode || item.order || item.orderId}
                        </Link>
                      </td>
                      <td>
                        <strong>{item.customer || 'Người mua'}</strong>
                        <br />
                        <small style={{ color: '#64748b' }}>
                          User: {(item.userId || '').slice(0, 8)}...
                        </small>
                      </td>
                      <td>
                        <span style={{ maxWidth: 260, display: 'inline-block' }}>
                          {item.reason}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`support-priority ${
                            item.priority === 'URGENT' ? 'priority-high' : 'priority-normal'
                          }`}
                        >
                          {item.priority}
                        </span>
                      </td>
                      <td>
                        {isOverdue ? (
                          <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.82rem' }}>
                            ⚠️ Đã quá hạn SLA
                          </span>
                        ) : isUrgent ? (
                          <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.82rem' }}>
                            ⏳ Còn {item.slaRemainingHours} giờ (Gấp)
                          </span>
                        ) : (
                          <span style={{ color: '#10b981', fontSize: '0.82rem' }}>
                            ✓ Còn {item.slaRemainingHours || 24} giờ
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`support-status-badge ${supportStatusClass(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="support-action-btn primary"
                          onClick={() => openVerdictModal(item)}
                          disabled={item.status === 'RESOLVED' || item.status === 'REJECTED'}
                        >
                          ⚖ Phán quyết
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal Phán quyết Trọng tài */}
      <Dialog open={verdictOpen} onOpenChange={setVerdictOpen}>
        <DialogContent style={{ maxWidth: 640 }}>
          <DialogTitle>⚖ Ban hành phán quyết Trọng tài (SRS 2.3)</DialogTitle>
          <DialogDescription>
            Đưa ra kết luận trọng tài giải quyết tranh chấp giữa Người mua và Gian hàng.
          </DialogDescription>

          {selectedCase && (
            <form
              onSubmit={handleConfirmVerdict}
              style={{ display: 'grid', gap: 16, marginTop: 12 }}
            >
              <div
                style={{
                  background: '#f8fafc',
                  padding: 12,
                  borderRadius: 6,
                  border: '1px solid #e2e8f0',
                  fontSize: '0.88rem',
                }}
              >
                <p>
                  <strong>Mã ca:</strong> {selectedCase.id || selectedCase.caseId}
                </p>
                <p>
                  <strong>Đơn hàng:</strong> {selectedCase.orderCode || selectedCase.orderId}
                </p>
                <p>
                  <strong>Khách hàng:</strong> {selectedCase.customer}
                </p>
                <p>
                  <strong>Lý do khiếu nại:</strong> {selectedCase.reason}
                </p>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    marginBottom: 6,
                  }}
                >
                  Quyết định của Trọng tài (Decision):
                </label>
                <Select
                  value={verdictDecision}
                  onValueChange={(val: any) => setVerdictDecision(val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REFUND_BUYER">
                      ✓ Chấp thuận hoàn tiền cho Người mua (REFUND_BUYER)
                    </SelectItem>
                    <SelectItem value="REJECT_BUYER">
                      ✕ Bác bỏ khiếu nại, bảo vệ Người bán (REJECT_BUYER)
                    </SelectItem>
                    <SelectItem value="REQUIRE_RETURN_FIRST">
                      ↻ Yêu cầu hoàn trả hàng về kho trước khi hoàn tiền (REQUIRE_RETURN_FIRST)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    marginBottom: 6,
                  }}
                >
                  Bên chịu trách nhiệm & Chế tài vi phạm (Liable Party):
                </label>
                <Select value={liableParty} onValueChange={(val: any) => setLiableParty(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SELLER">
                      Gian hàng Người bán (Trừ 5 điểm uy tín SRS 2.3)
                    </SelectItem>
                    <SelectItem value="BUYER">
                      Người mua (Gian lận hoặc từ chối không lý do)
                    </SelectItem>
                    <SelectItem value="CARRIER">
                      Đơn vị vận chuyển (Làm hư hỏng hàng hóa)
                    </SelectItem>
                    <SelectItem value="PLATFORM">Nền tảng Nexus bảo lãnh thanh toán</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {verdictDecision === 'REFUND_BUYER' && (
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      marginBottom: 6,
                    }}
                  >
                    Số tiền hoàn cho Buyer (VNĐ):
                  </label>
                  <input
                    type="number"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(Number(e.target.value))}
                    className="support-search-input"
                    style={{ width: '100%' }}
                    min={0}
                    step={1000}
                  />
                  <small style={{ color: '#64748b' }}>Tương đương: {money(refundAmount)}</small>
                </div>
              )}

              <div>
                <label
                  style={{
                    display: 'block',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    marginBottom: 6,
                  }}
                >
                  Căn cứ phán quyết & Ghi chú kiểm toán (Audited Note):
                </label>
                <textarea
                  rows={3}
                  value={verdictNote}
                  onChange={(e) => setVerdictNote(e.target.value)}
                  className="support-search-input"
                  style={{ width: '100%', resize: 'vertical' }}
                  placeholder="Ghi rõ lý do, bằng chứng đối soát giữa 2 bên để lưu vết kiểm toán..."
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  className="support-action-btn secondary"
                  onClick={() => setVerdictOpen(false)}
                >
                  Hủy bỏ
                </button>
                <button type="submit" className="support-action-btn primary" disabled={submitting}>
                  {submitting ? 'Đang ban hành...' : 'Xác nhận ban hành phán quyết'}
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
