'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { supportApi, type DisputeItem } from '../api/support.api';
import { chatApi } from '@/modules/chat/api/chat.api';
import { userMessage } from '@/lib/axios/http';
import { Heading, DemoBanner, money, supportStatusClass } from '../components/support-shared';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const FALLBACK_DISPUTES: DisputeItem[] = [
  {
    caseId: 'CS-4021',
    id: 'CS-4021',
    orderId: 'ord_01hqz555abc',
    order: 'ORD-2026-90412',
    orderCode: 'ORD-2026-90412',
    customer: 'Minh Anh',
    userId: 'usr_buyer_01',
    type: 'Yêu cầu hoàn tiền',
    reason: 'Sản phẩm giao vỡ màn hình, không giống mô tả của người bán',
    priority: 'Khẩn cấp',
    status: 'PENDING',
    slaDeadline: new Date(Date.now() + 14 * 3600 * 1000).toISOString(),
    slaRemainingHours: 14,
    isSlaOverdue: false,
    buyerEvidence: {
      photos: [
        'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=800&q=80',
      ],
      note: 'Khi mở hộp sản phẩm thì màn hình đã nứt hoàn toàn, viền trầy xước nặng.',
      submittedAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    },
    sellerEvidence: {
      photos: [
        'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4'],
      note: 'Shop đã đóng gói 3 lớp chống sốc và dán tem niêm phong trước khi bàn giao cho bưu tá.',
      submittedAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    },
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
  {
    caseId: 'CS-4018',
    id: 'CS-4018',
    orderId: 'ord_01hqz888def',
    order: 'ORD-2026-88123',
    orderCode: 'ORD-2026-88123',
    customer: 'Quốc Bảo',
    userId: 'usr_buyer_02',
    type: 'Khiếu nại giao hàng',
    reason: 'Đơn vị vận chuyển làm thất lạc kiện hàng hoặc giao trễ hơn 10 ngày',
    priority: 'Cao',
    status: 'PENDING',
    slaDeadline: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
    slaRemainingHours: 6,
    isSlaOverdue: false,
    buyerEvidence: {
      photos: [
        'https://images.unsplash.com/photo-1546776310-eef45dd6d63c?auto=format&fit=crop&w=800&q=80',
      ],
      note: 'Tra cứu mã vận đơn thì thấy đứng yên ở kho trung chuyển suốt 1 tuần.',
      submittedAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
    },
    sellerEvidence: {
      photos: [
        'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=800&q=80',
      ],
      note: 'Bưu cục đã ký nhận lấy hàng từ ngày 01/11, lỗi thuộc về đơn vị vận chuyển.',
      submittedAt: new Date(Date.now() - 15 * 3600 * 1000).toISOString(),
    },
    createdAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
  },
  {
    caseId: 'CS-4012',
    id: 'CS-4012',
    orderId: 'ord_01hqz999ghi',
    order: 'ORD-2026-77334',
    orderCode: 'ORD-2026-77334',
    customer: 'Thu Hà',
    userId: 'usr_buyer_03',
    type: 'Tranh chấp giao dịch',
    reason: 'Hàng đấu giá nhận được không đúng model cam kết trên phiên đấu',
    priority: 'Khẩn cấp',
    status: 'PENDING',
    slaDeadline: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    slaRemainingHours: -2,
    isSlaOverdue: true,
    buyerEvidence: {
      photos: [
        'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80',
      ],
      note: 'Phiên đấu giá đề là bản 512GB nhưng nhận thực tế chỉ là 128GB.',
      submittedAt: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
    },
    sellerEvidence: {
      photos: [
        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
      ],
      note: 'Người bán khẳng định đã gửi đúng kiện hàng theo đơn xác nhận.',
      submittedAt: new Date(Date.now() - 25 * 3600 * 1000).toISOString(),
    },
    createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
  },
];

export function SupportDisputesPage() {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED' | 'OVERDUE'>(
    'ALL',
  );
  const search = useDebouncedValue(query, 400);

  const [disputes, setDisputes] = useState<DisputeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Selected dispute for Arbitration Modal
  const [selectedDispute, setSelectedDispute] = useState<DisputeItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Form states for Verdict
  const [decision, setDecision] = useState<
    'REFUND_BUYER' | 'REJECT_BUYER' | 'REQUIRE_RETURN_FIRST'
  >('REFUND_BUYER');
  const [refundAmount, setRefundAmount] = useState<number | string>(550000);
  const [liableParty, setLiableParty] = useState<'SELLER' | 'BUYER' | 'CARRIER'>('SELLER');
  const [verdictNote, setVerdictNote] = useState('');
  const [isSubmittingVerdict, setIsSubmittingVerdict] = useState(false);
  const [verdictError, setVerdictError] = useState<string | null>(null);

  // Image preview modal (phóng to ảnh)
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Task FE-06: AI Copilot analysis states
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<{
    buyerSummary: string;
    sellerSummary: string;
    recommendedVerdict: 'REFUND_BUYER' | 'REJECT_CLAIM' | 'COMPENSATE_SELLER';
    recommendedVerdictLabel: string;
    confidenceScore: number;
    legalGrounding: string;
    suggestedNote: string;
  } | null>(null);
  const [aiAppliedNotice, setAiAppliedNotice] = useState<string | null>(null);

  async function handleAnalyzeWithAi() {
    if (!selectedDispute) return;
    setIsAnalyzingAi(true);
    setAiAppliedNotice(null);
    try {
      const res = await chatApi.analyzeDisputeEvidence({
        caseId: selectedDispute.caseId || selectedDispute.id,
        orderId: selectedDispute.orderId || selectedDispute.orderCode || selectedDispute.order,
        reason: selectedDispute.reason,
        buyerPhotos: selectedDispute.buyerEvidence?.photos,
        sellerVideos: selectedDispute.sellerEvidence?.videos,
        sellerPhotos: selectedDispute.sellerEvidence?.photos,
      });
      setAiAnalysisResult(res);
    } catch (err) {
      console.error('Failed to analyze with AI', err);
    } finally {
      setIsAnalyzingAi(false);
    }
  }

  function handleApplyAiRecommendation() {
    if (!aiAnalysisResult) return;
    const verdict = (aiAnalysisResult as any).suggestedVerdict;
    if (verdict?.decision) {
      setDecision(verdict.decision);
      setLiableParty(verdict.liableParty || 'CARRIER');
      if (verdict.refundAmount) setRefundAmount(verdict.refundAmount);
      setVerdictNote(verdict.note || aiAnalysisResult.suggestedNote || '');
    } else {
      if (aiAnalysisResult.recommendedVerdict === 'REFUND_BUYER') {
        setDecision('REFUND_BUYER');
        setLiableParty('CARRIER');
      } else if (aiAnalysisResult.recommendedVerdict === 'REJECT_CLAIM') {
        setDecision('REJECT_BUYER');
        setLiableParty('BUYER');
      } else {
        setDecision('REFUND_BUYER');
        setLiableParty('SELLER');
      }
      setVerdictNote(aiAnalysisResult.suggestedNote || '');
    }
    setAiAppliedNotice('✓ Đã áp dụng đề xuất AI Copilot vào biên bản phán quyết thành công!');
    setTimeout(() => setAiAppliedNotice(null), 4000);
  }

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }

  function syncDisputesWithLocalStorage(baseList: DisputeItem[]): DisputeItem[] {
    let list = [...baseList];
    if (typeof window === 'undefined') return list;

    const localDisputes: DisputeItem[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('nexus_order_dispute_')) {
        try {
          const val = JSON.parse(localStorage.getItem(key) || '{}');
          if (
            val &&
            val.orderId &&
            !list.some(
              (d: DisputeItem) =>
                d.orderId === val.orderId ||
                d.orderCode === val.orderId ||
                d.orderCode === val.orderCode ||
                d.caseId === val.caseId,
            )
          ) {
            const orderKey = val.orderId;
            const buyerEvRaw =
              localStorage.getItem(`nexus_buyer_evidence_${orderKey}`) ||
              (val.orderCode
                ? localStorage.getItem(`nexus_buyer_evidence_${val.orderCode}`)
                : null);
            const sellerEvRaw =
              localStorage.getItem(`nexus_seller_evidence_${orderKey}`) ||
              (val.orderCode
                ? localStorage.getItem(`nexus_seller_evidence_${val.orderCode}`)
                : null);
            const buyerEv = buyerEvRaw ? JSON.parse(buyerEvRaw) : undefined;
            const sellerEv = sellerEvRaw ? JSON.parse(sellerEvRaw) : undefined;
            const verdictRaw =
              localStorage.getItem(`nexus_dispute_verdict_${orderKey}`) ||
              (val.orderCode
                ? localStorage.getItem(`nexus_dispute_verdict_${val.orderCode}`)
                : null);
            const verdict = verdictRaw ? JSON.parse(verdictRaw) : undefined;

            localDisputes.push({
              id: val.caseId || `CS-${val.orderId}`,
              caseId: val.caseId || `CS-${val.orderId}`,
              orderId: val.orderId,
              order: val.orderCode || val.orderId,
              orderCode: val.orderCode || val.orderId,
              customer: val.customer || 'Tran Che Thien',
              userId: val.userId || 'usr_buyer',
              type: val.type || 'Báo hàng vỡ / Hư hỏng khi nhận',
              reason: val.reason || 'Hàng bị vỡ / móp méo nặng khi mở hộp',
              priority: 'Khẩn cấp',
              status: verdict ? 'RESOLVED' : val.status || 'PENDING',
              slaDeadline: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
              slaRemainingHours: 24,
              isSlaOverdue: false,
              buyerEvidence: buyerEv,
              sellerEvidence: sellerEv,
              verdict,
              createdAt: val.createdAt || new Date().toISOString(),
            });
          }
        } catch {}
      }
    }

    list = [...localDisputes, ...list];

    return list.map((d: DisputeItem) => {
      const orderKey = d.orderId || d.orderCode || d.order;
      const verdictRaw =
        localStorage.getItem(`nexus_dispute_verdict_${orderKey}`) ||
        localStorage.getItem(`nexus_dispute_verdict_${d.caseId}`) ||
        localStorage.getItem(`nexus_dispute_verdict_${d.id}`);
      if (verdictRaw) {
        try {
          const v = JSON.parse(verdictRaw);
          return { ...d, verdict: v, status: 'RESOLVED' as const };
        } catch {}
      }
      return d;
    });
  }

  const fetchDisputes = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await supportApi.listDisputes({
        status: statusFilter === 'ALL' || statusFilter === 'OVERDUE' ? undefined : statusFilter,
        q: search.trim() || undefined,
        limit: 50,
      });
      const items: DisputeItem[] = Array.isArray(res) ? res : (res as any)?.items || [];
      const baseList = items.length > 0 ? items : [...FALLBACK_DISPUTES];
      setDisputes(syncDisputesWithLocalStorage(baseList));
    } catch {
      setDisputes(syncDisputesWithLocalStorage([...FALLBACK_DISPUTES]));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, [search, statusFilter]);

  const filteredDisputes = useMemo(() => {
    return disputes.filter((d) => {
      const isResolved = d.status === 'RESOLVED' || Boolean(d.verdict);
      if (statusFilter === 'RESOLVED') {
        return isResolved;
      }
      if (statusFilter === 'PENDING') {
        return !isResolved && !d.isSlaOverdue && d.slaRemainingHours > 0;
      }
      if (statusFilter === 'OVERDUE') {
        return !isResolved && (d.isSlaOverdue || d.slaRemainingHours <= 0);
      }
      return true;
    });
  }, [disputes, statusFilter]);

  const metrics = useMemo(() => {
    const total = disputes.length;
    const resolved = disputes.filter((d) => d.status === 'RESOLVED' || Boolean(d.verdict)).length;
    const pending = disputes.filter(
      (d) => d.status !== 'RESOLVED' && !d.verdict && !d.isSlaOverdue && d.slaRemainingHours > 0,
    ).length;
    const overdue = disputes.filter(
      (d) => d.status !== 'RESOLVED' && !d.verdict && (d.isSlaOverdue || d.slaRemainingHours <= 0),
    ).length;
    return { total, pending, overdue, resolved };
  }, [disputes]);

  function handleOpenArbitration(item: DisputeItem) {
    let enhanced: DisputeItem = { ...item };
    if (typeof window !== 'undefined') {
      const orderKey = item.orderId || item.orderCode || item.order;
      // 1. Kiểm tra bằng chứng đóng gói của Seller đã nộp từ màn hình Người bán
      const cachedSellerEv =
        localStorage.getItem(`nexus_seller_evidence_${orderKey}`) ||
        localStorage.getItem(`nexus_seller_evidence_${item.id}`) ||
        localStorage.getItem(`nexus_seller_evidence_${item.caseId}`);
      if (cachedSellerEv) {
        try {
          const parsed = JSON.parse(cachedSellerEv);
          enhanced.sellerEvidence = {
            ...enhanced.sellerEvidence,
            photos: parsed.photos?.length ? parsed.photos : enhanced.sellerEvidence?.photos || [],
            videos: parsed.videos?.length ? parsed.videos : enhanced.sellerEvidence?.videos || [],
            note: parsed.note || enhanced.sellerEvidence?.note,
            submittedAt: parsed.submittedAt || enhanced.sellerEvidence?.submittedAt,
          };
        } catch {}
      }

      // 2. Kiểm tra bằng chứng mở hộp của Buyer nếu chưa có
      const cachedBuyerEv =
        localStorage.getItem(`nexus_buyer_evidence_${orderKey}`) ||
        localStorage.getItem(`nexus_buyer_evidence_${item.id}`);
      if (cachedBuyerEv) {
        try {
          const parsed = JSON.parse(cachedBuyerEv);
          enhanced.buyerEvidence = {
            ...enhanced.buyerEvidence,
            photos: parsed.photos?.length ? parsed.photos : enhanced.buyerEvidence?.photos || [],
            note: parsed.note || enhanced.buyerEvidence?.note,
            submittedAt: parsed.submittedAt || enhanced.buyerEvidence?.submittedAt,
          };
        } catch {}
      }
    }

    setSelectedDispute(enhanced);
    setDecision(enhanced.verdict?.decision || 'REFUND_BUYER');
    setRefundAmount(enhanced.verdict?.refundAmount || 30001);
    setLiableParty(enhanced.verdict?.liableParty || 'CARRIER');
    setVerdictNote(
      enhanced.verdict?.note || 'Xác nhận bằng chứng đối chiếu hợp lệ theo quy chế sàn.',
    );
    setVerdictError(null);
    setAiAnalysisResult(null);
    setAiAppliedNotice(null);
    setModalOpen(true);
  }

  async function handleSubmitVerdict(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDispute || isSubmittingVerdict) return;

    setIsSubmittingVerdict(true);
    setVerdictError(null);
    try {
      const updated = await supportApi.issueVerdict(selectedDispute.caseId || selectedDispute.id, {
        decision,
        refundAmount: decision === 'REFUND_BUYER' ? Number(refundAmount) || undefined : undefined,
        liableParty,
        note: verdictNote.trim(),
      });

      const orderKey =
        selectedDispute.orderId || selectedDispute.orderCode || selectedDispute.order;
      const verdictPayload = {
        caseId: updated.caseId || updated.id || selectedDispute.caseId || selectedDispute.id,
        orderId: orderKey,
        status:
          decision === 'REFUND_BUYER'
            ? 'RESOLVED'
            : decision === 'REJECT_BUYER'
              ? 'REJECTED'
              : 'RESOLVED',
        decision,
        refundAmount: decision === 'REFUND_BUYER' ? Number(refundAmount) || 30001 : 0,
        liableParty,
        resolutionNote: verdictNote.trim(),
        note: verdictNote.trim(),
        resolvedBy: 'Chuyên viên Hỗ trợ Sàn Nexus',
        resolvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (typeof window !== 'undefined') {
        if (orderKey) {
          localStorage.setItem(`nexus_dispute_verdict_${orderKey}`, JSON.stringify(verdictPayload));
        }
        if (selectedDispute.orderId) {
          localStorage.setItem(
            `nexus_dispute_verdict_${selectedDispute.orderId}`,
            JSON.stringify(verdictPayload),
          );
        }
        if (selectedDispute.orderCode) {
          localStorage.setItem(
            `nexus_dispute_verdict_${selectedDispute.orderCode}`,
            JSON.stringify(verdictPayload),
          );
        }
      }

      const resolvedItem: DisputeItem = {
        ...selectedDispute,
        ...updated,
        status: 'RESOLVED',
        verdict: verdictPayload as any,
      };
      setSelectedDispute(resolvedItem);
      setDisputes((prev) =>
        prev.map((d) =>
          d.caseId === resolvedItem.caseId ||
          d.id === resolvedItem.id ||
          d.orderId === resolvedItem.orderId ||
          (resolvedItem.orderCode && d.orderCode === resolvedItem.orderCode)
            ? resolvedItem
            : d,
        ),
      );
      showToast(
        `✓ Đã ban hành phán quyết [${decision}] thành công cho hồ sơ ${updated.caseId || updated.id}.`,
      );
      setModalOpen(false);
    } catch (err: any) {
      const msg = userMessage(err) || 'Không thể ban hành phán quyết trọng tài.';
      setVerdictError(msg);
      showToast(`❌ Lỗi: ${msg}`);
    } finally {
      setIsSubmittingVerdict(false);
    }
  }

  return (
    <>
      <Heading
        label="BỘ PHẬN HỖ TRỢ / TRỌNG TÀI TRANH CHẤP"
        title="Phân xử Tranh chấp & Khiếu nại (Disputes SLA)"
        description="Màn hình phân xử trọng tài đối chiếu bằng chứng Người mua - Người bán, kiểm soát thời hạn SLA và ra quyết định hoàn tiền theo SRS 2.3 & 3.1.2."
      />
      <DemoBanner message="Hàng đợi phân xử được kết nối trực tiếp với API Trọng tài Khiếu nại (/api/v1/support/disputes)." />

      {/* Thẻ chỉ số tổng quan */}
      <section className="support-stats">
        <article>
          <span>Tổng số hồ sơ</span>
          <strong>{metrics.total}</strong>
          <small>Toàn bộ khiếu nại</small>
        </article>
        <article>
          <span>Chờ phân xử</span>
          <strong className="text-amber-600">{metrics.pending}</strong>
          <small>Đang đếm ngược SLA</small>
        </article>
        <article>
          <span>Quá hạn / Khẩn cấp</span>
          <strong className="text-rose-600">{metrics.overdue}</strong>
          <small>Cần xử lý ngay</small>
        </article>
        <article>
          <span>Đã ban hành phán quyết</span>
          <strong className="text-emerald-600">{metrics.resolved}</strong>
          <small>Hoàn tất phân xử</small>
        </article>
      </section>

      {/* Bảng danh sách hồ sơ tranh chấp */}
      <section className="support-panel">
        <div className="support-panel-heading">
          <div>
            <p className="support-eyebrow">HÀNG ĐỢI XỬ LÝ TRỌNG TÀI</p>
            <h2>Danh sách vụ việc cần phán quyết</h2>
          </div>
          <span className="support-muted">
            {loading ? 'Đang tải…' : `${filteredDisputes.length} hồ sơ`}
          </span>
        </div>

        {/* Thanh tìm kiếm và Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'ALL', label: 'Tất cả' },
              { key: 'PENDING', label: 'Chờ phân xử' },
              { key: 'OVERDUE', label: 'Cận / Quá hạn SLA' },
              { key: 'RESOLVED', label: 'Đã giải quyết' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key as any)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  statusFilter === tab.key
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="min-w-[240px]">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm mã đơn, tên khách, lý do..."
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {error ? (
          <div className="p-8 text-center text-sm text-red-600">{error}</div>
        ) : loading ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Đang tải danh sách tranh chấp…
          </div>
        ) : filteredDisputes.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Không có hồ sơ tranh chấp nào cần xử lý trong mục này.
          </div>
        ) : (
          <div className="support-table-wrap">
            <table className="support-table">
              <thead>
                <tr>
                  <th>Mã vụ việc</th>
                  <th>Đơn hàng</th>
                  <th>Người mua</th>
                  <th>Lý do khiếu nại</th>
                  <th>Bằng chứng đối chiếu</th>
                  <th>Thời hạn SLA</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredDisputes.map((item) => {
                  const isOverdue = item.isSlaOverdue || item.slaRemainingHours <= 0;
                  const hasVerdict = item.status === 'RESOLVED' || Boolean(item.verdict);

                  return (
                    <tr key={item.caseId || item.id}>
                      <td>
                        <strong className="font-mono text-xs">{item.caseId || item.id}</strong>
                      </td>
                      <td>
                        <Link
                          href={`/support/orders/${encodeURIComponent(item.orderId || item.orderCode || item.order)}`}
                          className="font-semibold text-blue-600 hover:underline"
                        >
                          {item.orderCode || item.order || item.orderId}
                        </Link>
                      </td>
                      <td>
                        <Link
                          href={`/support/users?q=${encodeURIComponent(item.customer || item.userId || '')}`}
                          className="font-medium text-slate-800 hover:text-blue-600 hover:underline inline-flex items-center gap-1"
                          title="Xem hồ sơ khách hàng"
                        >
                          <strong>{item.customer}</strong>
                          <span className="text-[10px] text-slate-400">↗</span>
                        </Link>
                      </td>
                      <td>
                        <p className="max-w-xs truncate text-xs text-slate-700" title={item.reason}>
                          {item.reason}
                        </p>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          {item.buyerEvidence?.photos && item.buyerEvidence.photos.length > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewImage(item.buyerEvidence?.photos?.[0] || null)
                              }
                              className="group relative h-8 w-8 overflow-hidden rounded border border-slate-300 bg-slate-100 hover:border-sky-500"
                              title="Xem ảnh bằng chứng của Người mua"
                            >
                              <img
                                src={item.buyerEvidence.photos[0]}
                                alt="Buyer evidence"
                                className="h-full w-full object-cover"
                              />
                            </button>
                          )}
                          <span className="text-[10px] text-slate-500">
                            {item.buyerEvidence?.photos?.length || 0} ảnh Buyer ·{' '}
                            {item.sellerEvidence?.photos?.length || 0} ảnh Shop
                          </span>
                        </div>
                      </td>
                      <td>
                        {hasVerdict ? (
                          <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            Đã đóng hồ sơ
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
                            ⚠️ Quá hạn SLA ({item.slaRemainingHours}h)
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold ${
                              item.slaRemainingHours <= 12
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            ⏳ Còn {item.slaRemainingHours} giờ
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`support-status ${supportStatusClass(item.status)}`}>
                          {hasVerdict ? 'ĐÃ_PHÁN_QUYẾT' : item.status}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleOpenArbitration(item)}
                          className="rounded-lg bg-sky-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700"
                        >
                          {hasVerdict ? 'Xem phán quyết' : 'Phân xử →'}
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

      {/* Modal Phân xử Trọng tài chi tiết (Dispute Arbitration Modal) */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
          <DialogTitle className="text-xl font-bold text-slate-900">
            Trọng tài Phân xử Tranh chấp: {selectedDispute?.caseId || selectedDispute?.id}
          </DialogTitle>
          <DialogDescription className="mt-1 text-xs text-slate-500">
            Hồ sơ khiếu nại đơn hàng{' '}
            <Link
              href={`/support/orders/${encodeURIComponent(selectedDispute?.orderId || selectedDispute?.orderCode || selectedDispute?.order || '')}`}
              className="font-bold text-blue-600 hover:underline"
              target="_blank"
              title="Mở hồ sơ đơn hàng ở tab mới"
            >
              {selectedDispute?.orderCode || selectedDispute?.order} ↗
            </Link>{' '}
            · Khách hàng:{' '}
            <Link
              href={`/support/users?q=${encodeURIComponent(selectedDispute?.customer || selectedDispute?.userId || '')}`}
              className="font-bold text-slate-800 hover:text-blue-600 hover:underline"
              target="_blank"
              title="Xem hồ sơ khách hàng"
            >
              {selectedDispute?.customer} ↗
            </Link>
          </DialogDescription>

          {/* Banner thời hạn SLA */}
          {selectedDispute && (
            <div
              className={`mt-4 flex items-center justify-between rounded-xl border p-3.5 ${
                selectedDispute.isSlaOverdue || selectedDispute.slaRemainingHours <= 0
                  ? 'border-red-200 bg-red-50 text-red-900'
                  : selectedDispute.slaRemainingHours <= 12
                    ? 'border-amber-200 bg-amber-50 text-amber-900'
                    : 'border-blue-200 bg-blue-50 text-blue-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">⏳</span>
                <div>
                  <strong className="text-xs font-bold">Thời hạn cam kết xử lý (SLA):</strong>
                  <p className="mt-0.5 text-[11px]">
                    Hạn chót:{' '}
                    {selectedDispute.slaDeadline
                      ? new Date(selectedDispute.slaDeadline).toLocaleString('vi-VN')
                      : 'Đang đếm ngược'}{' '}
                    ·{' '}
                    {selectedDispute.isSlaOverdue
                      ? 'ĐÃ QUÁ HẠN XỬ LÝ THEO CHUẨN SÀN'
                      : `Còn khoảng ${selectedDispute.slaRemainingHours} giờ để ra phán quyết`}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold shadow-sm">
                Ưu tiên: {selectedDispute.priority || 'CAO'}
              </span>
            </div>
          )}

          {verdictError && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs font-medium text-red-700">
              ⚠️ {verdictError}
            </div>
          )}

          {/* Thanh tiêu đề và Nút AI Phân Tích & Gợi Ý Phán Quyết (Task FE-06) */}
          <div className="mt-5 flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Hồ Sơ Chứng Cứ Đối Chiếu (Dual Evidence Side-by-Side)
            </h3>
            <button
              type="button"
              disabled={isAnalyzingAi}
              onClick={handleAnalyzeWithAi}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md hover:from-purple-700 hover:to-indigo-700 transition disabled:opacity-50"
            >
              <span>✨</span>
              {isAnalyzingAi
                ? 'AI Copilot đang quét bằng chứng...'
                : '✨ AI Phân Tích & Gợi Ý Phán Quyết'}
            </button>
          </div>

          {/* Task FE-06: Bảng tóm tắt đối chiếu chứng cứ 3 mục của AI */}
          {aiAnalysisResult && (
            <div className="mt-4 rounded-xl border-2 border-purple-300 bg-gradient-to-br from-purple-50 via-indigo-50/50 to-white p-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-purple-200 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">✨</span>
                  <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wide">
                    AI Copilot - Bảng Đối Chiếu Bằng Chứng & Đề Xuất Phán Quyết (Task FE-06)
                  </h4>
                </div>
                <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-bold text-purple-800 border border-purple-200">
                  Độ tin cậy: {(aiAnalysisResult.confidenceScore * 100).toFixed(0)}%
                </span>
              </div>

              {/* 3 Mục đối chiếu: Buyer vs Seller vs AI Verdict */}
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 1. Bằng chứng Buyer */}
                <div className="rounded-lg bg-white/90 p-3 border border-rose-200 shadow-xs">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800 mb-1">
                    <span>📸</span> Bằng chứng Buyer:
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {aiAnalysisResult.buyerSummary}
                  </p>
                </div>

                {/* 2. Bằng chứng Seller */}
                <div className="rounded-lg bg-white/90 p-3 border border-emerald-200 shadow-xs">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 mb-1">
                    <span>📦</span> Bằng chứng Seller:
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {aiAnalysisResult.sellerSummary}
                  </p>
                </div>

                {/* 3. Đề xuất phán quyết của AI */}
                <div className="rounded-lg bg-white/90 p-3 border border-purple-300 shadow-xs">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900 mb-1">
                    <span>⚖️</span> Đề xuất phán quyết AI:
                  </div>
                  <div className="text-xs font-bold text-indigo-700">
                    {aiAnalysisResult.recommendedVerdictLabel}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    {aiAnalysisResult.legalGrounding}
                  </p>
                </div>
              </div>

              {/* Hàng nút bấm 1-chạm: Áp dụng đề xuất này */}
              <div className="mt-3.5 flex items-center justify-between border-t border-purple-200 pt-2.5">
                <span className="text-xs text-purple-900 font-medium">
                  Tự động điền phán quyết và căn cứ quy chế sàn vào biểu mẫu bên dưới:
                </span>
                <button
                  type="button"
                  onClick={handleApplyAiRecommendation}
                  className="flex items-center gap-1.5 rounded-lg bg-purple-700 px-4 py-2 text-xs font-bold text-white shadow hover:bg-purple-800 transition active:scale-95"
                >
                  <span>⚡</span> Áp dụng đề xuất này
                </button>
              </div>

              {aiAppliedNotice && (
                <div className="mt-2.5 rounded-lg bg-emerald-100 border border-emerald-300 p-2 text-xs font-semibold text-emerald-900 text-center">
                  {aiAppliedNotice}
                </div>
              )}
            </div>
          )}

          {/* KHUNG ĐỐI CHIẾU BẰNG CHỨNG 2 BÊN (DUAL EVIDENCE SIDE-BY-SIDE) */}
          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Cột 1: Người mua */}
            <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4">
              <div className="flex items-center justify-between border-b border-rose-200 pb-2">
                <strong className="text-xs font-bold text-rose-900">
                  1. Bằng chứng Người mua (Buyer Claim)
                </strong>
                <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                  Khách: {selectedDispute?.customer}
                </span>
              </div>
              <p className="mt-2.5 text-xs text-slate-800">
                <strong>Lý do khiếu nại:</strong> {selectedDispute?.reason}
              </p>
              {selectedDispute?.buyerEvidence?.note && (
                <p className="mt-1 text-xs text-slate-600">
                  <strong>Mô tả chi tiết:</strong> {selectedDispute.buyerEvidence.note}
                </p>
              )}
              <div className="mt-3">
                <span className="block text-[11px] font-semibold text-slate-700">
                  Ảnh chụp tình trạng hàng hóa nhận được:
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(selectedDispute?.buyerEvidence?.photos || []).map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPreviewImage(img)}
                      className="group relative h-20 w-20 overflow-hidden rounded-lg border border-rose-200 shadow-sm transition hover:scale-105"
                    >
                      <img
                        src={img}
                        alt={`Buyer evidence ${i}`}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100 text-white text-[10px] font-bold">
                        Phóng to 🔍
                      </span>
                    </button>
                  ))}
                  {(!selectedDispute?.buyerEvidence?.photos ||
                    selectedDispute.buyerEvidence.photos.length === 0) && (
                    <span className="text-xs text-slate-400">Không có ảnh đính kèm.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Cột 2: Người bán */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                <strong className="text-xs font-bold text-emerald-900">
                  2. Bằng chứng Người bán (Seller Defense)
                </strong>
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  Đối tác Gian hàng
                </span>
              </div>
              <p className="mt-2.5 text-xs text-slate-800">
                <strong>Phản hồi của Shop:</strong>{' '}
                {selectedDispute?.sellerEvidence?.note ||
                  'Đã đóng gói kiểm tra niêm phong kỹ càng trước khi bàn giao bưu tá.'}
              </p>
              <div className="mt-3">
                <span className="block text-[11px] font-semibold text-slate-700">
                  Ảnh/Video chứng minh lúc xuất kho:
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(selectedDispute?.sellerEvidence?.photos || []).map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPreviewImage(img)}
                      className="group relative h-20 w-20 overflow-hidden rounded-lg border border-emerald-200 shadow-sm transition hover:scale-105"
                    >
                      <img
                        src={img}
                        alt={`Seller evidence ${i}`}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100 text-white text-[10px] font-bold">
                        Phóng to 🔍
                      </span>
                    </button>
                  ))}
                  {selectedDispute?.sellerEvidence?.videos &&
                    selectedDispute.sellerEvidence.videos.length > 0 && (
                      <div className="flex h-20 w-28 items-center justify-center rounded-lg border border-emerald-300 bg-emerald-100 p-2 text-center text-[10px] font-semibold text-emerald-800">
                        📹 Video đóng hàng sẵn sàng
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>

          {/* FORM BAN HÀNH PHÁN QUYẾT TRỌNG TÀI */}
          <form
            onSubmit={handleSubmitVerdict}
            className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4"
          >
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Ban hành phán quyết Trọng tài sàn (Arbitration Verdict)
            </h4>

            {selectedDispute?.verdict && (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                ✓ <strong>Hồ sơ này đã có phán quyết chính thức:</strong> [
                {selectedDispute.verdict.decision}] · Ghi chú: {selectedDispute.verdict.note}
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quyết định trọng tài:
                </label>
                <select
                  value={decision}
                  onChange={(e) => setDecision(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-sky-500"
                >
                  <option value="REFUND_BUYER">REFUND_BUYER — Hoàn tiền cho Người mua</option>
                  <option value="REJECT_BUYER">REJECT_BUYER — Bác bỏ khiếu nại (Shop thắng)</option>
                  <option value="REQUIRE_RETURN_FIRST">
                    REQUIRE_RETURN_FIRST — Buộc trả hàng về kho trước
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bên chịu trách nhiệm / chi phí:
                </label>
                <select
                  value={liableParty}
                  onChange={(e) => setLiableParty(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-sky-500"
                >
                  <option value="SELLER">SELLER — Gian hàng chịu trách nhiệm</option>
                  <option value="BUYER">BUYER — Người mua chịu phí</option>
                  <option value="CARRIER">CARRIER — Đơn vị vận chuyển làm hư hại</option>
                </select>
              </div>

              {decision === 'REFUND_BUYER' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số tiền hoàn (₫):
                  </label>
                  <input
                    type="number"
                    min={1000}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-sky-500"
                    required
                  />
                </div>
              )}
            </div>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Căn cứ & Ghi chú phán quyết (lưu vết Audit log):
              </label>
              <textarea
                value={verdictNote || ''}
                onChange={(e) => setVerdictNote(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-sky-500 resize-none"
                placeholder="Nhập căn cứ chứng cứ đối soát để ra phán quyết..."
                required
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={isSubmittingVerdict || !(verdictNote || '').trim()}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSubmittingVerdict ? 'Đang ban hành…' : 'Xác nhận ban hành phán quyết'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Phóng to Ảnh bằng chứng (Lightbox) */}
      <Dialog open={Boolean(previewImage)} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-2xl bg-black/90 p-4 text-white">
          <DialogTitle className="text-sm font-semibold text-white">
            Chi tiết ảnh bằng chứng khiếu nại
          </DialogTitle>
          <div className="mt-3 flex items-center justify-center">
            {previewImage && (
              <img
                src={previewImage}
                alt="Enlarged evidence"
                className="max-h-[75vh] w-auto rounded-lg object-contain"
              />
            )}
          </div>
          <div className="mt-2 text-center text-xs text-slate-400">
            Nhấn ra ngoài hoặc bấm Esc để đóng
          </div>
        </DialogContent>
      </Dialog>

      {/* Toast Notification */}
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
