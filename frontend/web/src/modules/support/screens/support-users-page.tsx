'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { orders, users, Heading, DemoBanner } from '../components/support-shared';
export function SupportUsersPage() {
  const [query, setQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const filtered = useMemo(
    () =>
      users.filter((user) =>
        `${user.id} ${user.name} ${user.email} ${user.role}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [query],
  );
  const selectedUser = users.find((user) => user.id === selectedUserId);
  return (
    <>
      <Heading
        label="SUPPORT STAFF / USERS"
        title="Tra cứu người dùng"
        description="Tra cứu thông tin cơ bản, vai trò, trạng thái và điểm uy tín."
      />
      <DemoBanner />
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
          <span>{filtered.length} kết quả minh họa</span>
        </div>
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
              {filtered.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.id}</strong>
                  </td>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className="support-role">{user.role}</span>
                  </td>
                  <td>
                    <span className="support-status hoạt-động">{user.status}</span>
                  </td>
                  <td>{user.reputation} / 100</td>
                  <td>{user.orders}</td>
                  <td>
                    <button
                      className="support-row-link"
                      type="button"
                      onClick={() => setSelectedUserId(user.id)}
                    >
                      Hồ sơ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="support-empty">Không tìm thấy người dùng phù hợp.</div>
          )}
        </div>
      </section>
      {selectedUser && (
        <section className="support-panel support-user-card">
          <div className="support-panel-heading">
            <div>
              <p className="support-eyebrow">USER PROFILE · READ ONLY</p>
              <h2>{selectedUser.name}</h2>
            </div>
            <button
              className="support-row-link"
              type="button"
              onClick={() => setSelectedUserId(null)}
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
                <strong>{selectedUser.reputation} / 100</strong>
              </div>
              <div>
                <small>Số giao dịch</small>
                <strong>{selectedUser.orders}</strong>
              </div>
            </div>
          </div>
        </section>
      )}
      <p className="support-readonly-note">
        Hồ sơ chỉ đọc. Chỉnh sửa người dùng hoặc điều chỉnh điểm uy tín không thuộc quyền Support
        Staff theo ma trận hiện tại.
      </p>
    </>
  );
}
