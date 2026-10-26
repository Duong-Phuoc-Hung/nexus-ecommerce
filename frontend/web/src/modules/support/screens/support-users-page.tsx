'use client';

import { useEffect, useState } from 'react';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { userApi, type SupportUser } from '@/modules/user/api/user.api';
import { userMessage } from '@/lib/axios/http';
import { Heading, DemoBanner, slug } from '../components/support-shared';

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
        label="SUPPORT STAFF / USERS"
        title="Tra cứu người dùng"
        description="Tra cứu thông tin cơ bản, vai trò, trạng thái và điểm uy tín."
      />
      <DemoBanner message="Danh sách và hồ sơ người dùng được tải từ User API." />
      <section className="support-panel">
        <div className="support-toolbar">
          <label className="support-search">
            <span>⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm tên, email, mã người dùng hoặc vai trò"
              aria-label="Tìm người dùng"
            />
          </label>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.7rem',
              color: '#687386',
            }}
          >
            Vai trò:
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{
                padding: '6px 10px',
                border: '1px solid #e1e5ea',
                borderRadius: '6px',
                background: 'white',
                fontSize: '0.7rem',
                color: '#334055',
              }}
            >
              <option value="ALL">Tất cả vai trò</option>
              <option value="BUYER">Người mua (BUYER)</option>
              <option value="SELLER">Người bán (SELLER)</option>
              <option value="SUPPORT_STAFF">Hỗ trợ (SUPPORT_STAFF)</option>
              <option value="ADMIN">Quản trị viên (ADMIN)</option>
            </select>
          </label>
          <span style={{ marginLeft: 'auto' }}>
            {loading ? 'Đang tải…' : `${users.length} kết quả`}
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
                  <th>Họ tên / gian hàng</th>
                  <th>Email</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Uy tín</th>
                  <th>Số đơn</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(users || []).map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.id}</strong>
                    </td>
                    <td>{user.fullName || (user as any).name || '—'}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className="support-role">{user.role}</span>
                    </td>
                    <td>
                      <span className={`support-status ${slug(user.status || 'ACTIVE')}`}>
                        {user.status}
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
                        Hồ sơ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && users.length === 0 && (
              <div className="support-empty">Không tìm thấy người dùng phù hợp.</div>
            )}
          </div>
        )}
      </section>
      {selectedUser && (
        <section className="support-panel support-user-card">
          <div className="support-panel-heading">
            <div>
              <p className="support-eyebrow">USER PROFILE · API</p>
              <h2>{selectedUser.fullName || (selectedUser as any).name}</h2>
            </div>
            <button
              className="support-row-link"
              type="button"
              onClick={() => setSelectedUser(null)}
            >
              Đóng
            </button>
          </div>
          <div className="support-detail-content">
            <div className="support-info-grid">
              <div>
                <small>Mã người dùng</small>
                <strong>{selectedUser.id}</strong>
              </div>
              <div>
                <small>Email</small>
                <strong>{selectedUser.email}</strong>
              </div>
              <div>
                <small>Vai trò</small>
                <strong>{selectedUser.role}</strong>
              </div>
              <div>
                <small>Trạng thái</small>
                <strong>{selectedUser.status}</strong>
              </div>
              <div>
                <small>Điểm uy tín</small>
                <strong>
                  {selectedUser.reputationScore ?? (selectedUser as any).reputation ?? 100} / 100
                </strong>
              </div>
              <div>
                <small>Số giao dịch</small>
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
