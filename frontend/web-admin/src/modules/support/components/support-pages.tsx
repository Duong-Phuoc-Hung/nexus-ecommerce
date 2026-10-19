'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

const cases = [
  {
    id: 'CS-4021',
    type: 'Yêu cầu hoàn tiền',
    order: 'NX-ORD-8021',
    customer: 'Minh Anh',
    reason: 'Sản phẩm chưa đúng mô tả',
    priority: 'Cao',
    age: '12 phút',
  },
  {
    id: 'CS-4018',
    type: 'Khiếu nại giao hàng',
    order: 'NX-ORD-8017',
    customer: 'Quốc Bảo',
    reason: 'Đơn hàng giao chậm',
    priority: 'Trung bình',
    age: '46 phút',
  },
  {
    id: 'CS-4012',
    type: 'Tranh chấp giao dịch',
    order: 'NX-ORD-8009',
    customer: 'Thu Hà',
    reason: 'Cần xác nhận trạng thái đơn',
    priority: 'Thấp',
    age: '2 giờ',
  },
];

const orders = [
  {
    id: 'NX-ORD-8021',
    buyer: 'Minh Anh',
    email: 'minhanh@example.com',
    seller: 'Nexus Audio',
    product: 'Tai nghe không dây Nexus Air',
    total: 1290000,
    status: 'Chờ xử lý',
    date: '18/10/2026',
    tracking: 'GHN8829103VN',
  },
  {
    id: 'NX-ORD-8017',
    buyer: 'Quốc Bảo',
    email: 'quocbao@example.com',
    seller: 'Retro Lab',
    product: 'Máy ảnh film Retro 35',
    total: 2450000,
    status: 'Đang giao',
    date: '17/10/2026',
    tracking: 'GHTK5908112',
  },
  {
    id: 'NX-ORD-8009',
    buyer: 'Thu Hà',
    email: 'thuha@example.com',
    seller: 'Nexus Sport',
    product: 'Đồng hồ thể thao S2',
    total: 890000,
    status: 'Hoàn tất',
    date: '16/10/2026',
    tracking: 'VTP22100831',
  },
  {
    id: 'NX-ORD-7998',
    buyer: 'Gia Huy',
    email: 'giahuy@example.com',
    seller: 'Home & Co.',
    product: 'Đèn bàn tối giản',
    total: 480000,
    status: 'Đã hủy',
    date: '15/10/2026',
    tracking: '—',
  },
];

const users = [
  {
    id: 'USR-2104',
    name: 'Minh Anh',
    email: 'minhanh@example.com',
    role: 'BUYER',
    status: 'Hoạt động',
    reputation: 98,
    orders: 12,
  },
  {
    id: 'USR-1872',
    name: 'Quốc Bảo',
    email: 'quocbao@example.com',
    role: 'BUYER',
    status: 'Hoạt động',
    reputation: 86,
    orders: 7,
  },
  {
    id: 'USR-1209',
    name: 'Retro Lab',
    email: 'seller@retrolab.vn',
    role: 'SELLER',
    status: 'Hoạt động',
    reputation: 92,
    orders: 43,
  },
];

const shipments = [
  {
    code: 'GHN8829103VN',
    order: 'NX-ORD-8021',
    carrier: 'GHN',
    recipient: 'Minh Anh',
    status: 'Đang lấy hàng',
    updated: '18/10/2026 · 14:30',
    city: 'TP. Hồ Chí Minh',
  },
  {
    code: 'GHTK5908112',
    order: 'NX-ORD-8017',
    carrier: 'GHTK',
    recipient: 'Quốc Bảo',
    status: 'Đang giao',
    updated: '18/10/2026 · 11:05',
    city: 'Hà Nội',
  },
  {
    code: 'VTP22100831',
    order: 'NX-ORD-8009',
    carrier: 'Viettel Post',
    recipient: 'Thu Hà',
    status: 'Đã giao',
    updated: '17/10/2026 · 16:40',
    city: 'Đà Nẵng',
  },
];

const money = (amount: number) => `${new Intl.NumberFormat('vi-VN').format(amount)} ₫`;
const slug = (value: string) => value.toLowerCase().replaceAll(' ', '-');

function Heading({
  label,
  title,
  description,
  action,
}: {
  label: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="support-heading">
      <div>
        <p className="support-eyebrow">{label}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function DemoBanner() {
  return (
    <div className="support-demo-banner">
      <span>●</span> Dữ liệu minh họa cho bản demo · Chưa kết nối API nghiệp vụ Support
    </div>
  );
}

function CaseTable({ compact = false }: { compact?: boolean }) {
  return (
    <div className="support-table-wrap">
      <table className="support-table">
        <thead>
          <tr>
            <th>Mã yêu cầu</th>
            <th>Loại</th>
            <th>Đơn liên quan</th>
            <th>Người gửi</th>
            <th>Nội dung</th>
            <th>Ưu tiên</th>
            <th>Thời gian chờ</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {cases.slice(0, compact ? 3 : undefined).map((item) => (
            <tr key={item.id}>
              <td>
                <strong>{item.id}</strong>
              </td>
              <td>{item.type}</td>
              <td>
                <Link className="support-inline-link" href={`/support/orders/${item.order}`}>
                  {item.order}
                </Link>
              </td>
              <td>{item.customer}</td>
              <td>{item.reason}</td>
              <td>
                <span className={`support-priority ${slug(item.priority)}`}>{item.priority}</span>
              </td>
              <td>{item.age}</td>
              <td>
                <Link className="support-row-link" href={`/support/orders/${item.order}`}>
                  Mở hồ sơ
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SupportDashboard() {
  return (
    <>
      <Heading
        label="SUPPORT STAFF / OVERVIEW"
        title="Chào ca trực"
        description="Tổng quan yêu cầu hỗ trợ và các hồ sơ cần tra cứu."
      />
      <DemoBanner />
      <section className="support-stats">
        <article>
          <span>Đang chờ xử lý</span>
          <strong>08</strong>
          <small>3 ưu tiên cao</small>
        </article>
        <article>
          <span>Đang xử lý</span>
          <strong>05</strong>
          <small>2 hồ sơ gần quá hạn</small>
        </article>
        <article>
          <span>Đã giải quyết hôm nay</span>
          <strong>17</strong>
          <small>Thời gian xử lý TB 24 phút</small>
        </article>
        <article>
          <span>Vận đơn cần theo dõi</span>
          <strong>04</strong>
          <small>2 đơn cập nhật hôm nay</small>
        </article>
      </section>
      <section className="support-panel">
        <div className="support-panel-heading">
          <div>
            <p className="support-eyebrow">WORK QUEUE · DEMO</p>
            <h2>Yêu cầu đang chờ</h2>
          </div>
          <Link href="/support/orders">Tra cứu đơn hàng →</Link>
        </div>
        <CaseTable compact />
      </section>
      <section className="support-quick-links">
        <Link href="/support/orders">
          <span>▤</span>
          <strong>Tra cứu đơn</strong>
          <small>Tìm thông tin, xem chi tiết và lịch sử trạng thái</small>
          <b>→</b>
        </Link>
        <Link href="/support/users">
          <span>◎</span>
          <strong>Tra cứu người dùng</strong>
          <small>Xem hồ sơ Buyer/Seller và thông tin uy tín</small>
          <b>→</b>
        </Link>
        <Link href="/support/shipments">
          <span>⇢</span>
          <strong>Tra cứu vận đơn</strong>
          <small>Theo dõi hãng vận chuyển và cập nhật gần nhất</small>
          <b>→</b>
        </Link>
      </section>
    </>
  );
}

export function SupportOrdersPage() {
  const [query, setQuery] = useState('');
  const filtered = useMemo(
    () =>
      orders.filter((order) =>
        `${order.id} ${order.buyer} ${order.email} ${order.seller}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [query],
  );
  return (
    <>
      <Heading
        label="SUPPORT STAFF / ORDERS"
        title="Tra cứu đơn hàng"
        description="Tìm theo mã đơn, tên/email Buyer hoặc tên gian hàng."
      />
      <DemoBanner />
      <section className="support-panel">
        <div className="support-toolbar">
          <label className="support-search">
            <span>⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ví dụ: NX-ORD-8021 hoặc email khách hàng"
              aria-label="Tìm đơn hàng"
            />
          </label>
          <span>{filtered.length} kết quả minh họa</span>
        </div>
        <div className="support-table-wrap">
          <table className="support-table">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Buyer</th>
                <th>Gian hàng</th>
                <th>Sản phẩm</th>
                <th>Ngày đặt</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr key={order.id}>
                  <td>
                    <strong>{order.id}</strong>
                  </td>
                  <td>
                    {order.buyer}
                    <small>{order.email}</small>
                  </td>
                  <td>{order.seller}</td>
                  <td>{order.product}</td>
                  <td>{order.date}</td>
                  <td>{money(order.total)}</td>
                  <td>
                    <span className={`support-status ${slug(order.status)}`}>{order.status}</span>
                  </td>
                  <td>
                    <Link className="support-row-link" href={`/support/orders/${order.id}`}>
                      Chi tiết
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="support-empty">Không tìm thấy đơn hàng phù hợp.</div>
          )}
        </div>
      </section>
    </>
  );
}

export function SupportOrderDetailPage({ orderId }: { orderId: string }) {
  const order = orders.find((item) => item.id === orderId) ?? orders[0];
  const [notice, setNotice] = useState('');
  return (
    <>
      <Heading
        label="SUPPORT STAFF / ORDER DETAIL"
        title="Hồ sơ đơn hàng"
        description="Thông tin giao dịch, người mua/người bán và diễn biến trạng thái."
        action={
          <Link className="support-secondary-button" href="/support/orders">
            ← Danh sách đơn
          </Link>
        }
      />
      <DemoBanner />
      <div className="support-detail-grid">
        <section className="support-panel">
          <div className="support-panel-heading">
            <div>
              <p className="support-eyebrow">ORDER ID</p>
              <h2>{order.id}</h2>
            </div>
            <span className={`support-status ${slug(order.status)}`}>{order.status}</span>
          </div>
          <div className="support-detail-content">
            <div className="support-info-grid">
              <div>
                <small>Người mua</small>
                <strong>{order.buyer}</strong>
                <span>{order.email}</span>
              </div>
              <div>
                <small>Người bán</small>
                <strong>{order.seller}</strong>
                <span>seller@nexus.demo</span>
              </div>
              <div>
                <small>Sản phẩm</small>
                <strong>{order.product}</strong>
                <span>Số lượng: 1</span>
              </div>
              <div>
                <small>Tổng thanh toán</small>
                <strong>{money(order.total)}</strong>
                <span>Thanh toán: COD (demo)</span>
              </div>
              <div>
                <small>Mã vận đơn</small>
                <strong>{order.tracking}</strong>
                <span>Hãng vận chuyển: {order.tracking.startsWith('GHN') ? 'GHN' : 'GHTK'}</span>
              </div>
              <div>
                <small>Ngày đặt</small>
                <strong>{order.date}</strong>
                <span>Kênh: Nexus Marketplace</span>
              </div>
            </div>
          </div>
        </section>
        <section className="support-panel">
          <div className="support-panel-heading">
            <div>
              <p className="support-eyebrow">ORDER LIFECYCLE</p>
              <h2>Lịch sử trạng thái</h2>
            </div>
          </div>
          <ol className="support-timeline">
            <li className="complete">
              <span />
              <div>
                <strong>Đơn hàng được tạo</strong>
                <small>{order.date} · 09:12</small>
              </div>
            </li>
            <li className="complete">
              <span />
              <div>
                <strong>Đã xác nhận thanh toán</strong>
                <small>{order.date} · 09:14</small>
              </div>
            </li>
            <li className={order.status === 'Chờ xử lý' ? 'current' : 'complete'}>
              <span />
              <div>
                <strong>
                  {order.status === 'Chờ xử lý' ? 'Chờ người bán xử lý' : 'Đã bàn giao vận chuyển'}
                </strong>
                <small>18/10/2026 · 14:30</small>
              </div>
            </li>
            <li>
              <span />
              <div>
                <strong>Giao hàng hoàn tất</strong>
                <small>Chưa cập nhật</small>
              </div>
            </li>
          </ol>
        </section>
      </div>
      <section className="support-panel support-actions-panel">
        <div>
          <p className="support-eyebrow">SUPPORT ACTIONS · PREVIEW</p>
          <h2>Thao tác xử lý</h2>
          <p>Các nút chỉ minh họa giao diện, hiện chưa gọi API hay thay đổi đơn hàng.</p>
        </div>
        <div className="support-action-buttons">
          <button
            type="button"
            onClick={() => setNotice('Demo: thao tác hủy đơn chưa gửi lên BE.')}
          >
            Hủy đơn
          </button>
          <button
            type="button"
            onClick={() => setNotice('Demo: thao tác hoàn tiền chưa gửi lên BE.')}
          >
            Xử lý hoàn tiền
          </button>
          <button
            type="button"
            onClick={() => setNotice('Demo: thao tác cập nhật vận chuyển chưa gửi lên BE.')}
          >
            Cập nhật vận chuyển
          </button>
        </div>
        {notice && (
          <p className="support-action-notice" role="status">
            {notice}
          </p>
        )}
      </section>
    </>
  );
}

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
