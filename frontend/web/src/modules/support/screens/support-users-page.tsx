'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { userApi, type SupportUser } from '@/modules/user/api/user.api';
import { userMessage } from '@/lib/axios/http';
import { Heading, DemoBanner, slug } from '../components/support-shared';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

export function SupportUsersPage() {
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('ALL');
  const search = useDebouncedValue(query, 500);
  const [users, setUsers] = useState<SupportUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<SupportUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      setSelectedUser(await userApi.getById(id));
    } catch (err) {
      setError(userMessage(err));
    }
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
                      <span className={`support-status ${slug(user.status || 'ACTIVE')}`}>
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
              <p className="support-eyebrow">HỒ SƠ NGƯỜI DÙNG · HỆ THỐNG</p>
              <h2>{selectedUser.fullName || (selectedUser as any).name}</h2>
            </div>
            <button
              className="support-row-link"
              type="button"
              onClick={() => setSelectedUser(null)}
            >
              Đóng lại
            </button>
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
                <strong>{getUserStatusLabel(selectedUser.status)}</strong>
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
          </div>
        </section>
      )}
    </>
  );
}
