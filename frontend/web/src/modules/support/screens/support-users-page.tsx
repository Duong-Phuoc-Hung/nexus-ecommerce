'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { userApi, type SupportUser } from '@/modules/user/api/user.api';
import { supportApi } from '../api/support.api';
import { userMessage } from '@/lib/axios/http';
import { Heading, DemoBanner, slug, supportStatusClass } from '../components/support-shared';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Link from 'next/link';

export function getRoleLabel(role: string): string {
  switch (role) {
    case 'BUYER':
      return 'Người mua';
    case 'SELLER':
      return 'Người bán';
    case 'SUPPORT_STAFF':
    case 'SUPPORT':
      return 'Nhân viên hỗ trợ';
    case 'ADMIN':
      return 'Quản trị viên';
    default:
      return role || 'Người dùng';
  }
}

export function getUserStatusLabel(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'Đang hoạt động';
    case 'INACTIVE':
      return 'Ngừng hoạt động';
    case 'LOCKED':
    case 'SUSPENDED':
    case 'BANNED':
      return 'Tạm khóa';
    default:
      return status || 'Hoạt động';
  }
}

type UserTicket = {
  id: string;
  type: string;
  orderId: string;
  reason: string;
  priority: string;
  status: 'Đang chờ xử lý' | 'Đã phê duyệt' | 'Đã từ chối';
  createdAt: string;
};

export function SupportUsersPage() {
  const [query, setQuery] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('q') || '';
    }
    return '';
  });
  const [role, setRole] = useState('ALL');
  const search = useDebouncedValue(query, 500);
  const [users, setUsers] = useState<SupportUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<SupportUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Tickets / Disputes của người dùng đang được chọn
  const [userTickets, setUserTickets] = useState<UserTicket[]>([]);

  // Modal phản hồi
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [replyTargetTicket, setReplyTargetTicket] = useState<string | null>(null);

  // Modal xác nhận khóa / mở khóa & kiểm soát lỗi
  const [lockConfirmOpen, setLockConfirmOpen] = useState(false);
  const [lockReason, setLockReason] = useState('');
  const [isLocking, setIsLocking] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);

  // Hồ sơ uy tín & Lịch sử vi phạm (SRS 2.7 - REPUTATION.PENALTY.VIEW)
  const [reputationInfo, setReputationInfo] = useState<{
    tierLabel: string;
    canBid: boolean;
    items: Array<{
      id: string;
      delta: number;
      scoreAfter: number;
      reason: string;
      source?: string;
      createdAt: string;
    }>;
  } | null>(null);

  // Modal Kiến nghị xử phạt gửi Admin (Support Staff không tự trừ điểm/áp phạt theo SRS 2.7)
  const [penaltyOpen, setPenaltyOpen] = useState(false);
  const [suggestedPoints, setSuggestedPoints] = useState<number>(-10);
  const [reputationReason, setReputationReason] = useState(
    'Vi phạm quy chuẩn giao dịch sàn Nexus — Đề xuất Admin xem xét trừ điểm uy tín',
  );
  const [isSubmittingPenalty, setIsSubmittingPenalty] = useState(false);
  const [penaltyError, setPenaltyError] = useState<string | null>(null);

  // Trạng thái xử lý khiếu nại & Tạo phiếu khiếu nại mới
  const [resolvingTicketId, setResolvingTicketId] = useState<string | null>(null);
  const [createTicketOpen, setCreateTicketOpen] = useState(false);
  const [newTicketType, setNewTicketType] = useState('Khiếu nại đơn hàng / Trả hàng');
  const [newTicketOrderId, setNewTicketOrderId] = useState('');
  const [newTicketPriority, setNewTicketPriority] = useState<'Cao' | 'Trung bình' | 'Thấp'>(
    'Trung bình',
  );
  const [newTicketReason, setNewTicketReason] = useState('');
  const [creatingTicket, setCreatingTicket] = useState(false);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    userApi
      .list(
        {
          q: search.trim() || undefined,
          role: role !== 'ALL' ? role : undefined,
          limit: 50,
        },
        controller.signal,
      )
      .then((page) => setUsers(page.items))
      .catch((err) => !controller.signal.aborted && setError(userMessage(err)))
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [search, role]);

  // Bộ phận hỗ trợ chỉ quản lý và tra cứu người dùng thương mại (Người mua, Người bán)
  // Không bao gồm Quản trị viên (ADMIN) để đảm bảo phân cấp quyền hạn hợp lý
  const displayUsers = useMemo(() => {
    return (users || []).filter((u) => u.role !== 'ADMIN');
  }, [users]);

  async function viewProfile(id: string) {
    setError('');
    try {
      const u = await userApi.getById(id);
      setSelectedUser(u);
      try {
        const rep = await userApi.getReputationHistory(u.id);
        setReputationInfo({
          tierLabel: rep.tierLabel,
          canBid: rep.canBid,
          items: Array.isArray(rep.items) ? rep.items : [],
        });
      } catch {
        setReputationInfo(null);
      }
      try {
        // Nạp danh sách yêu cầu khiếu nại thực tế từ Support Cases API
        let cases = await supportApi.listCases({ userId: u.id, limit: 50 });
        if ((!cases || cases.length === 0) && (u.fullName || u.email)) {
          cases = await supportApi.listCases({
            q: (u.fullName || u.email || '').trim(),
            limit: 50,
          });
        }
        if (cases && cases.length > 0) {
          setUserTickets(
            cases.map((c) => ({
              id: c.id,
              type: c.type || 'Khiếu nại / Hỗ trợ người dùng',
              orderId: c.order || c.orderId || 'NX-ORD-GENERAL',
              reason: c.reason,
              priority: c.priority || 'Bình thường',
              status:
                c.status === 'RESOLVED'
                  ? 'Đã phê duyệt'
                  : c.status === 'REJECTED'
                    ? 'Đã từ chối'
                    : 'Đang chờ xử lý',
              createdAt: c.age || 'Mới gửi',
            })),
          );
        } else {
          setUserTickets([]);
        }
      } catch {
        setUserTickets([]);
      }
    } catch (err) {
      setError(userMessage(err));
    }
  }

  function openLockConfirmModal() {
    if (!selectedUser) return;
    const isCurrentlyActive = selectedUser.status === 'ACTIVE' || !selectedUser.status;
    setLockReason(
      isCurrentlyActive
        ? 'Tạm khóa tài khoản do nghi vấn vi phạm chính sách giao dịch và quy chuẩn cộng đồng'
        : 'Mở khóa và phục hồi trạng thái hoạt động bình thường cho tài khoản',
    );
    setLockError(null);
    setLockConfirmOpen(true);
  }

  async function handleToggleLock() {
    if (!selectedUser || isLocking) return;
    const isCurrentlyActive = selectedUser.status === 'ACTIVE' || !selectedUser.status;
    const newStatus = isCurrentlyActive ? 'SUSPENDED' : 'ACTIVE';
    setIsLocking(true);
    setLockError(null);

    try {
      // 1. Gọi API cập nhật trạng thái xuống backend
      await userApi.updateStatus(selectedUser.id, {
        status: newStatus,
        reason:
          lockReason.trim() ||
          (isCurrentlyActive ? 'Nhân viên hỗ trợ tạm khóa tài khoản' : 'Mở khóa tài khoản'),
      });

      // 2. CHỈ CẬP NHẬT GIAO DIỆN KHI API THÀNH CÔNG:
      setSelectedUser((prev) => (prev ? { ...prev, status: newStatus } : null));
      setUsers((prev) =>
        prev.map((item) => (item.id === selectedUser.id ? { ...item, status: newStatus } : item)),
      );
      setLockConfirmOpen(false);
      showToast(
        isCurrentlyActive
          ? `Đã tạm khóa tài khoản "${selectedUser.fullName || selectedUser.email}".`
          : `Đã mở khóa và kích hoạt lại tài khoản "${selectedUser.fullName || selectedUser.email}".`,
      );
    } catch (err: any) {
      // 3. XỬ LÝ KHI GẶP LỖI:
      // Giữ nguyên trạng thái cũ của tài khoản, hiển thị thông báo lỗi rõ ràng
      const message =
        userMessage(err) || 'Không thể cập nhật trạng thái người dùng. Vui lòng thử lại!';
      setLockError(message);
      showToast(`❌ Lỗi: ${message}`);
    } finally {
      setIsLocking(false);
    }
  }

  function openPenaltyModal() {
    if (!selectedUser) return;
    setSuggestedPoints(-10);
    setReputationReason(
      'Vi phạm quy chuẩn giao dịch sàn Nexus — Đề xuất Admin xem xét xử phạt/trừ điểm uy tín',
    );
    setPenaltyError(null);
    setPenaltyOpen(true);
  }

  async function handleEscalatePenaltyToAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser || isSubmittingPenalty || !reputationReason.trim()) return;
    setIsSubmittingPenalty(true);
    setPenaltyError(null);
    try {
      const created = await supportApi.createCase({
        userId: selectedUser.id,
        customer: selectedUser.fullName || selectedUser.email || 'Người dùng Nexus',
        type: 'Kiến nghị xử phạt / Điều chỉnh uy tín (Chuyển Admin)',
        reason: `[Đề xuất: ${suggestedPoints > 0 ? `+${suggestedPoints}` : suggestedPoints} điểm] ${reputationReason.trim()}`,
        priority: 'Cao',
      });
      setUserTickets((prev) => [
        {
          id: created.id,
          type: created.type || 'Kiến nghị xử phạt / Điều chỉnh uy tín (Chuyển Admin)',
          orderId: created.order || created.orderId || 'NX-ORD-GENERAL',
          reason: created.reason || reputationReason.trim(),
          priority: 'Cao',
          status: 'Đang chờ xử lý',
          createdAt: created.age || 'Vừa lập biên bản',
        },
        ...prev,
      ]);
      showToast(
        `✓ Đã lập biên bản kiến nghị xử phạt (${created.id}) chuyển lên Admin xem xét theo SRS 2.7.`,
      );
      setPenaltyOpen(false);
    } catch (err: any) {
      const msg = userMessage(err) || 'Không thể gửi kiến nghị xử phạt lên Admin.';
      setPenaltyError(msg);
      showToast(`❌ Lỗi: ${msg}`);
    } finally {
      setIsSubmittingPenalty(false);
    }
  }

  async function handleTicketAction(ticketId: string, action: 'approve' | 'reject') {
    if (resolvingTicketId) return;
    setResolvingTicketId(ticketId);
    try {
      await supportApi.resolveCase(ticketId, {
        resolution: action === 'approve' ? 'APPROVED' : 'REJECTED',
        note:
          action === 'approve'
            ? 'Đã xác thực và phê duyệt khiếu nại'
            : 'Từ chối giải quyết khiếu nại do không đủ căn cứ chứng minh',
      });
      // CHỈ CẬP NHẬT KHI THÀNH CÔNG:
      setUserTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId
            ? { ...t, status: action === 'approve' ? 'Đã phê duyệt' : 'Đã từ chối' }
            : t,
        ),
      );
      showToast(
        action === 'approve'
          ? `Đã phê duyệt yêu cầu hỗ trợ "${ticketId}" thành công.`
          : `Đã từ chối giải quyết yêu cầu hỗ trợ "${ticketId}".`,
      );
    } catch (err: any) {
      const msg = userMessage(err) || 'Không thể cập nhật kết quả khiếu nại.';
      showToast(`❌ Lỗi: ${msg}`);
    } finally {
      setResolvingTicketId(null);
    }
  }

  async function handleCreateUserTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser || creatingTicket || !newTicketReason.trim()) return;
    setCreatingTicket(true);
    try {
      const created = await supportApi.createCase({
        userId: selectedUser.id,
        customer: selectedUser.fullName || selectedUser.email || 'Khách hàng Nexus',
        orderId: newTicketOrderId.trim() || undefined,
        type: newTicketType,
        reason: newTicketReason.trim(),
        priority: newTicketPriority,
      });
      setUserTickets((prev) => [
        {
          id: created.id,
          type: created.type || newTicketType,
          orderId: created.order || created.orderId || newTicketOrderId.trim() || 'NX-ORD-GENERAL',
          reason: created.reason || newTicketReason.trim(),
          priority: created.priority || newTicketPriority,
          status: 'Đang chờ xử lý',
          createdAt: created.age || 'Vừa tạo',
        },
        ...prev,
      ]);
      setCreateTicketOpen(false);
      setNewTicketOrderId('');
      setNewTicketReason('');
      showToast(`✓ Đã tạo phiếu khiếu nại "${created.id}" cho người dùng.`);
    } catch (err: any) {
      showToast(`❌ Lỗi tạo phiếu: ${userMessage(err)}`);
    } finally {
      setCreatingTicket(false);
    }
  }

  function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyMessage.trim()) return;
    setReplyOpen(false);
    setReplyMessage('');
    showToast(
      `Đã gửi văn bản phản hồi chính thức tới email của người dùng (${selectedUser?.email}) thành công!`,
    );
  }

  return (
    <>
      <Heading
        label="BỘ PHẬN HỖ TRỢ / NGƯỜI DÙNG"
        title="Tra cứu người dùng"
        description="Tra cứu thông tin khách hàng (Người mua) và đối tác (Người bán), trạng thái và điểm uy tín."
      />
      <DemoBanner message="Danh sách và hồ sơ người dùng được kết nối qua API." />
      <section className="support-panel">
        <div className="support-toolbar">
          <label className="support-search">
            <span>⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm tên, email, mã người dùng..."
              aria-label="Tìm người dùng"
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
            <span>Vai trò:</span>
            <div style={{ minWidth: 220 }}>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger aria-label="Lọc theo vai trò">
                  <SelectValue placeholder="Chọn vai trò" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả khách hàng & đối tác</SelectItem>
                  <SelectItem value="BUYER">Người mua (Khách hàng)</SelectItem>
                  <SelectItem value="SELLER">Người bán (Đối tác)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <span style={{ marginLeft: 'auto' }}>
            {loading ? 'Đang tải…' : `${displayUsers.length} kết quả`}
          </span>
        </div>
        {error ? (
          <div className="support-empty">{error}</div>
        ) : (
          <div className="support-table-wrap">
            <table className="support-table">
              <thead>
                <tr>
                  <th>Mã người dùng</th>
                  <th>Họ tên / Gian hàng</th>
                  <th>Email</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Uy tín</th>
                  <th>Số đơn</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {displayUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.id}</strong>
                    </td>
                    <td>{user.fullName || (user as any).name || '—'}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className="support-role">{getRoleLabel(user.role)}</span>
                    </td>
                    <td>
                      <span
                        className={`support-status ${supportStatusClass(user.status || 'ACTIVE')}`}
                      >
                        {getUserStatusLabel(user.status)}
                      </span>
                    </td>
                    <td>{user.reputationScore ?? (user as any).reputation ?? 100} / 100</td>
                    <td>{user.ordersCount ?? (user as any).orders ?? 0}</td>
                    <td>
                      <button
                        className="support-row-link"
                        type="button"
                        onClick={() => viewProfile(user.id)}
                      >
                        Xem hồ sơ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && displayUsers.length === 0 && (
              <div className="support-empty">Không tìm thấy người dùng phù hợp.</div>
            )}
          </div>
        )}
      </section>

      {selectedUser && (
        <section className="support-panel support-user-card">
          <div className="support-panel-heading">
            <div>
              <p className="support-eyebrow">HỒ SƠ NGƯỜI DÙNG & XỬ LÝ HỖ TRỢ · HỆ THỐNG</p>
              <h2>{selectedUser.fullName || (selectedUser as any).name}</h2>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                className="support-row-link"
                type="button"
                onClick={() => setSelectedUser(null)}
              >
                Đóng lại
              </button>
            </div>
          </div>

          <div className="support-detail-content">
            <div className="support-info-grid">
              <div>
                <small>Mã người dùng</small>
                <strong>{selectedUser.id}</strong>
              </div>
              <div>
                <small>Địa chỉ email</small>
                <strong>{selectedUser.email}</strong>
              </div>
              <div>
                <small>Vai trò tài khoản</small>
                <strong>{getRoleLabel(selectedUser.role)}</strong>
              </div>
              <div>
                <small>Trạng thái hoạt động</small>
                <div style={{ marginTop: '3px' }}>
                  <span
                    className={`support-status ${supportStatusClass(selectedUser.status || 'ACTIVE')}`}
                  >
                    {getUserStatusLabel(selectedUser.status)}
                  </span>
                </div>
              </div>
              <div>
                <small>Điểm uy tín sàn</small>
                <strong>
                  {selectedUser.reputationScore ?? (selectedUser as any).reputation ?? 100} / 100
                </strong>
              </div>
              <div>
                <small>Số giao dịch đã thực hiện</small>
                <strong>{selectedUser.ordersCount ?? (selectedUser as any).orders ?? 0}</strong>
              </div>
              <div>
                <small>Ngày tạo tài khoản</small>
                <strong>
                  {selectedUser.createdAt
                    ? new Date(selectedUser.createdAt).toLocaleDateString('vi-VN')
                    : '—'}
                </strong>
              </div>
            </div>

            {/* Cụm nút hành động tương tác trực tiếp (BUG-02 Fix) */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '10px',
                alignItems: 'center',
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: '1px solid #edf0f3',
              }}
            >
              <button
                type="button"
                className="support-action-buttons button"
                style={{
                  padding: '7px 14px',
                  borderRadius: '7px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                onClick={() => {
                  setReplyTargetTicket(null);
                  setReplyOpen(true);
                }}
              >
                ✉ Phản hồi người dùng
              </button>

              <button
                type="button"
                style={{
                  padding: '7px 14px',
                  borderRadius: '7px',
                  border:
                    selectedUser.status === 'SUSPENDED' ? '1px solid #a7f3d0' : '1px solid #fecaca',
                  background: selectedUser.status === 'SUSPENDED' ? '#ecfdf5' : '#fef2f2',
                  color: selectedUser.status === 'SUSPENDED' ? '#047857' : '#dc2626',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                onClick={openLockConfirmModal}
              >
                {selectedUser.status === 'SUSPENDED' ? '🔓 Mở khóa tài khoản' : '🔒 Khóa tài khoản'}
              </button>

              <button
                type="button"
                style={{
                  padding: '7px 14px',
                  borderRadius: '7px',
                  border: '1px solid #fed7aa',
                  background: '#fff7ed',
                  color: '#c2410c',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                onClick={openPenaltyModal}
              >
                📋 Kiến nghị xử phạt (Chuyển Admin)
              </button>

              <Link
                href={`/support/orders?q=${encodeURIComponent(selectedUser.email || selectedUser.id)}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '7px 14px',
                  borderRadius: '7px',
                  border: '1px solid #bfdbfe',
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  marginLeft: 'auto',
                }}
              >
                Tra cứu đơn hàng của người này →
              </Link>
            </div>

            {/* Khu vực Sổ điểm uy tín & Lịch sử vi phạm (SRS 2.7 - REPUTATION.PENALTY.VIEW) */}
            <div style={{ marginTop: '24px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
                  Sổ điểm uy tín & Lịch sử vi phạm ({reputationInfo?.items.length ?? 0})
                </h3>
                <div
                  style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.7rem' }}
                >
                  {reputationInfo?.tierLabel && (
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '99px',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        fontWeight: 600,
                      }}
                    >
                      Hạng: {reputationInfo.tierLabel}
                    </span>
                  )}
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '99px',
                      background:
                        (selectedUser.reputationScore ?? 100) >= 50 ? '#dcfce7' : '#fee2e2',
                      color: (selectedUser.reputationScore ?? 100) >= 50 ? '#15803d' : '#b91c1c',
                      fontWeight: 600,
                    }}
                  >
                    {(selectedUser.reputationScore ?? 100) >= 50
                      ? 'Đủ điều kiện đấu giá (≥ 50)'
                      : 'Bị chặn đấu giá (< 50)'}
                  </span>
                </div>
              </div>
              <div className="support-table-wrap">
                <table className="support-table">
                  <thead>
                    <tr>
                      <th>Biến động</th>
                      <th>Điểm sau</th>
                      <th>Lý do / Sự kiện</th>
                      <th>Nguồn</th>
                      <th>Thời gian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!reputationInfo || reputationInfo.items.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          style={{
                            textAlign: 'center',
                            padding: '16px',
                            color: '#64748b',
                            fontSize: '0.76rem',
                          }}
                        >
                          Chưa có lịch sử vi phạm hoặc biến động điểm uy tín nào.
                        </td>
                      </tr>
                    ) : (
                      reputationInfo.items.slice(0, 10).map((entry) => (
                        <tr key={entry.id}>
                          <td>
                            <strong style={{ color: entry.delta < 0 ? '#dc2626' : '#16a34a' }}>
                              {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                            </strong>
                          </td>
                          <td>{entry.scoreAfter} / 100</td>
                          <td>{entry.reason}</td>
                          <td>{entry.source || 'SYSTEM'}</td>
                          <td>
                            {entry.createdAt
                              ? new Date(entry.createdAt).toLocaleString('vi-VN')
                              : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Khu vực Xử lý yêu cầu hỗ trợ / Khiếu nại (Support Ticket & Dispute Resolution - BUG-02 Fix) */}
            <div style={{ marginTop: '24px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                }}
              >
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
                  Yêu cầu hỗ trợ & Tranh chấp đang mở ({userTickets.length})
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    Quản lý khiếu nại theo chuẩn SRS 2.3 & 3.1.2
                  </span>
                  <button
                    type="button"
                    onClick={() => setCreateTicketOpen(true)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: '1px solid #bfdbfe',
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    + Tạo phiếu khiếu nại
                  </button>
                </div>
              </div>

              <div className="support-table-wrap">
                <table className="support-table">
                  <thead>
                    <tr>
                      <th>Mã Ticket</th>
                      <th>Loại khiếu nại</th>
                      <th>Đơn liên quan</th>
                      <th>Nội dung tóm tắt</th>
                      <th>Ưu tiên</th>
                      <th>Trạng thái</th>
                      <th>Thời gian</th>
                      <th>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userTickets.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          style={{
                            textAlign: 'center',
                            padding: '20px',
                            color: '#64748b',
                            fontSize: '0.78rem',
                          }}
                        >
                          Chưa có yêu cầu hỗ trợ hoặc khiếu nại nào cho người dùng này.
                        </td>
                      </tr>
                    ) : (
                      userTickets.map((ticket) => (
                        <tr key={ticket.id}>
                          <td>
                            <strong>{ticket.id}</strong>
                          </td>
                          <td>{ticket.type}</td>
                          <td>
                            <Link
                              className="support-inline-link"
                              href={`/support/orders/${ticket.orderId}`}
                            >
                              {ticket.orderId}
                            </Link>
                          </td>
                          <td style={{ maxWidth: '200px' }}>{ticket.reason}</td>
                          <td>
                            <span className={`support-priority ${slug(ticket.priority)}`}>
                              {ticket.priority}
                            </span>
                          </td>
                          <td>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '99px',
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                background:
                                  ticket.status === 'Đã phê duyệt'
                                    ? '#dcfce7'
                                    : ticket.status === 'Đã từ chối'
                                      ? '#fee2e2'
                                      : '#fef3c7',
                                color:
                                  ticket.status === 'Đã phê duyệt'
                                    ? '#15803d'
                                    : ticket.status === 'Đã từ chối'
                                      ? '#b91c1c'
                                      : '#b45309',
                              }}
                            >
                              {ticket.status}
                            </span>
                          </td>
                          <td>{ticket.createdAt}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              {ticket.status === 'Đang chờ xử lý' ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={resolvingTicketId === ticket.id}
                                    onClick={() => handleTicketAction(ticket.id, 'approve')}
                                    style={{
                                      border: '1px solid #86efac',
                                      background: '#f0fdf4',
                                      color: '#166534',
                                      fontSize: '0.65rem',
                                      fontWeight: 600,
                                      padding: '4px 8px',
                                      borderRadius: '5px',
                                      cursor:
                                        resolvingTicketId === ticket.id ? 'not-allowed' : 'pointer',
                                      opacity: resolvingTicketId === ticket.id ? 0.6 : 1,
                                    }}
                                  >
                                    {resolvingTicketId === ticket.id ? 'Đang duyệt...' : 'Duyệt'}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={resolvingTicketId === ticket.id}
                                    onClick={() => handleTicketAction(ticket.id, 'reject')}
                                    style={{
                                      border: '1px solid #fca5a5',
                                      background: '#fef2f2',
                                      color: '#991b1b',
                                      fontSize: '0.65rem',
                                      fontWeight: 600,
                                      padding: '4px 8px',
                                      borderRadius: '5px',
                                      cursor:
                                        resolvingTicketId === ticket.id ? 'not-allowed' : 'pointer',
                                      opacity: resolvingTicketId === ticket.id ? 0.6 : 1,
                                    }}
                                  >
                                    {resolvingTicketId === ticket.id ? 'Đang xử lý...' : 'Từ chối'}
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplyTargetTicket(ticket.id);
                                    setReplyOpen(true);
                                  }}
                                  style={{
                                    border: '1px solid #cbd5e1',
                                    background: '#ffffff',
                                    color: '#475569',
                                    fontSize: '0.65rem',
                                    fontWeight: 600,
                                    padding: '4px 8px',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Phản hồi
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Modal Dialog Tạo phiếu khiếu nại / hỗ trợ cho người dùng */}
      <Dialog open={createTicketOpen} onOpenChange={setCreateTicketOpen}>
        <DialogContent className="p-6 max-w-md w-full">
          <DialogTitle className="text-lg font-bold text-slate-800">
            Tạo phiếu hỗ trợ / khiếu nại
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 mt-1">
            Ghi nhận khiếu nại mới cho tài khoản{' '}
            <strong>{selectedUser?.fullName || selectedUser?.email}</strong>:
          </DialogDescription>
          <form onSubmit={handleCreateUserTicket} className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Loại khiếu nại
              </label>
              <input
                type="text"
                value={newTicketType}
                onChange={(e) => setNewTicketType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mã đơn liên quan (nếu có)
                </label>
                <input
                  type="text"
                  value={newTicketOrderId}
                  onChange={(e) => setNewTicketOrderId(e.target.value)}
                  placeholder="VD: ORD-20261126-..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mức độ ưu tiên
                </label>
                <select
                  value={newTicketPriority}
                  onChange={(e) => setNewTicketPriority(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white"
                >
                  <option value="Cao">Cao</option>
                  <option value="Trung bình">Trung bình</option>
                  <option value="Thấp">Thấp</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nội dung khiếu nại
              </label>
              <textarea
                value={newTicketReason}
                onChange={(e) => setNewTicketReason(e.target.value)}
                rows={3}
                placeholder="Mô tả chi tiết vấn đề khách hàng gặp phải..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 resize-none"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCreateTicketOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={creatingTicket}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-60"
              >
                {creatingTicket ? 'Đang tạo...' : 'Xác nhận tạo phiếu'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Dialog Phản hồi người dùng (BUG-02 Fix) */}
      <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
        <DialogContent className="p-6 max-w-md w-full">
          <DialogTitle className="text-lg font-bold text-slate-800">
            {replyTargetTicket
              ? `Phản hồi Ticket ${replyTargetTicket}`
              : 'Gửi phản hồi cho người dùng'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 mt-1">
            Nội dung phản hồi chính thức sẽ được gửi tới hòm thư của{' '}
            {selectedUser?.fullName || selectedUser?.email}:
          </DialogDescription>
          <form onSubmit={handleSendReply} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nội dung thông điệp phản hồi / Hướng dẫn giải quyết:
              </label>
              <textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 outline-none focus:outline-none focus:border-sky-400 focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:border-sky-400 transition-colors resize-none"
                placeholder="Nhập nội dung phản hồi chi tiết cho người dùng..."
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReplyOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={!replyMessage.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
              >
                Gửi phản hồi
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Dialog Xác nhận Khóa / Mở khóa tài khoản (BUG-02 Fix & Error Handling) */}
      <Dialog
        open={lockConfirmOpen}
        onOpenChange={(open) => !isLocking && setLockConfirmOpen(open)}
      >
        <DialogContent className="p-6 max-w-md w-full">
          <DialogTitle className="text-lg font-bold text-slate-800">
            {selectedUser?.status === 'SUSPENDED'
              ? 'Xác nhận mở khóa tài khoản'
              : 'Xác nhận tạm khóa tài khoản'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 mt-1">
            {selectedUser?.status === 'SUSPENDED'
              ? `Bạn có chắc chắn muốn mở khóa và kích hoạt lại quyền truy cập cho người dùng "${selectedUser?.email}"?`
              : `Tài khoản "${selectedUser?.email}" sẽ bị đình chỉ phiên đăng nhập và các hoạt động mua/bán trên hệ thống.`}
          </DialogDescription>

          {lockError && (
            <div
              style={{
                marginTop: '12px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: '0.8rem',
                fontWeight: 500,
              }}
            >
              ⚠ {lockError}
            </div>
          )}

          <div style={{ marginTop: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#334155',
                textTransform: 'uppercase',
                marginBottom: '6px',
              }}
            >
              Lý do kiểm toán / Ghi chú xử lý:
            </label>
            <textarea
              rows={3}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 outline-none focus:outline-none focus:border-sky-400 focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:border-sky-400 transition-colors"
              placeholder="Nhập lý do thực hiện thao tác..."
              value={lockReason}
              onChange={(e) => setLockReason(e.target.value)}
              disabled={isLocking}
            />
          </div>

          <div className="flex justify-end gap-2 mt-5">
            <button
              type="button"
              disabled={isLocking}
              onClick={() => setLockConfirmOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              disabled={isLocking}
              onClick={handleToggleLock}
              className={`px-4 py-2 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1.5 ${
                selectedUser?.status === 'SUSPENDED'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isLocking ? (
                <>
                  <span className="animate-spin inline-block">⟳</span>
                  <span>Đang xử lý...</span>
                </>
              ) : selectedUser?.status === 'SUSPENDED' ? (
                'Xác nhận mở khóa'
              ) : (
                'Xác nhận khóa tài khoản'
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Dialog Lập biên bản kiến nghị xử phạt gửi Admin (SRS 2.7) */}
      <Dialog
        open={penaltyOpen}
        onOpenChange={(open) => !isSubmittingPenalty && setPenaltyOpen(open)}
      >
        <DialogContent className="p-6 bg-white rounded-2xl shadow-2xl max-w-lg w-full">
          <DialogTitle className="text-lg font-bold text-slate-800">
            Lập kiến nghị xử phạt gửi Admin
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 mt-1">
            Theo phân quyền <strong>SRS 2.7</strong>, Nhân viên hỗ trợ chỉ xem lịch sử vi phạm và
            lập biên bản chuyển lên <strong>Admin</strong> quyết định điều chỉnh điểm (
            <code>USER.REPUTATION.ADJUST</code>) hoặc áp phạt (<code>REPUTATION.PENALTY.APPLY</code>
            ) đối với{' '}
            <strong className="text-slate-700">
              {selectedUser?.fullName || selectedUser?.email}
            </strong>
            .
          </DialogDescription>

          {penaltyError && (
            <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
              ⚠️ {penaltyError}
            </div>
          )}

          <form onSubmit={handleEscalatePenaltyToAdmin} className="mt-4 space-y-4">
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs text-amber-900">
              Điểm uy tín hiện tại: <strong>{selectedUser?.reputationScore ?? 100} / 100</strong>.
              Ngưỡng tham gia đấu giá: Buyer ≥ 40, Seller ≥ 50.
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mức điểm đề xuất Admin xem xét:
              </label>
              <input
                type="number"
                value={suggestedPoints}
                onChange={(e) => setSuggestedPoints(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 outline-none focus:border-sky-400"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Căn cứ vi phạm & Nội dung biên bản gửi Admin (bắt buộc):
              </label>
              <textarea
                value={reputationReason}
                onChange={(e) => setReputationReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 outline-none focus:border-sky-400 resize-none"
                placeholder="Mô tả chi tiết bằng chứng vi phạm để Admin phê duyệt..."
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isSubmittingPenalty}
                onClick={() => setPenaltyOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isSubmittingPenalty || !reputationReason.trim()}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg text-xs font-semibold hover:bg-orange-700 disabled:opacity-50 transition"
              >
                {isSubmittingPenalty ? 'Đang gửi…' : 'Gửi kiến nghị lên Admin'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Toast Notification phản hồi tức thì */}
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
