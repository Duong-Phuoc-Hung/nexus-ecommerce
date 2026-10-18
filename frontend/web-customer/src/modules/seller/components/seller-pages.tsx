'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

type ProductStatus = 'ACTIVE' | 'DRAFT' | 'INACTIVE';
type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  status: ProductStatus;
  updated: string;
};

const products: Product[] = [
  {
    id: 'prd-101',
    name: 'Tai nghe không dây Nexus Air',
    sku: 'NX-AIR-01',
    category: 'Điện tử',
    price: 1290000,
    stock: 28,
    status: 'ACTIVE',
    updated: '18/10/2026',
  },
  {
    id: 'prd-102',
    name: 'Máy ảnh film Retro 35',
    sku: 'NX-CAM-35',
    category: 'Máy ảnh',
    price: 2450000,
    stock: 6,
    status: 'ACTIVE',
    updated: '17/10/2026',
  },
  {
    id: 'prd-103',
    name: 'Đèn bàn tối giản',
    sku: 'NX-LMP-02',
    category: 'Nhà cửa',
    price: 480000,
    stock: 0,
    status: 'DRAFT',
    updated: '16/10/2026',
  },
  {
    id: 'prd-104',
    name: 'Đồng hồ thể thao S2',
    sku: 'NX-WCH-S2',
    category: 'Điện tử',
    price: 890000,
    stock: 12,
    status: 'INACTIVE',
    updated: '12/10/2026',
  },
];

const auctions = [
  {
    id: 'AUC-2041',
    product: 'Máy ảnh film Retro 35',
    start: '18/10/2026 · 09:00',
    end: '19/10/2026 · 09:00',
    bid: 2600000,
    bids: 14,
    status: 'Đang diễn ra',
  },
  {
    id: 'AUC-2042',
    product: 'Đồng hồ thể thao S2',
    start: '20/10/2026 · 19:00',
    end: '21/10/2026 · 19:00',
    bid: 950000,
    bids: 0,
    status: 'Sắp mở',
  },
  {
    id: 'AUC-2038',
    product: 'Loa Bluetooth Mini',
    start: '15/10/2026 · 10:00',
    end: '16/10/2026 · 10:00',
    bid: 720000,
    bids: 9,
    status: 'Đã kết thúc',
  },
];

const orders = [
  {
    id: 'NX-ORD-8021',
    item: 'Tai nghe không dây Nexus Air',
    buyer: 'Minh Anh',
    date: '18/10/2026',
    total: 1290000,
    status: 'Chờ xác nhận',
  },
  {
    id: 'NX-ORD-8017',
    item: 'Máy ảnh film Retro 35',
    buyer: 'Quốc Bảo',
    date: '17/10/2026',
    total: 2450000,
    status: 'Đang giao',
  },
  {
    id: 'NX-ORD-8009',
    item: 'Đồng hồ thể thao S2',
    buyer: 'Thu Hà',
    date: '16/10/2026',
    total: 890000,
    status: 'Hoàn tất',
  },
];

const inventory = [
  {
    sku: 'NX-AIR-01',
    product: 'Tai nghe không dây Nexus Air',
    warehouse: 'Kho Hồ Chí Minh',
    onHand: 28,
    reserved: 3,
    available: 25,
  },
  {
    sku: 'NX-CAM-35',
    product: 'Máy ảnh film Retro 35',
    warehouse: 'Kho Hà Nội',
    onHand: 6,
    reserved: 1,
    available: 5,
  },
  {
    sku: 'NX-LMP-02',
    product: 'Đèn bàn tối giản',
    warehouse: 'Kho Hồ Chí Minh',
    onHand: 0,
    reserved: 0,
    available: 0,
  },
];

const currency = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)} ₫`;
const statusClass = (status: string) => status.toLowerCase().replaceAll(' ', '-');

function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="seller-page-heading">
      <div>
        <p className="seller-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function DemoNote() {
  return (
    <div className="seller-demo-note">
      <span>●</span> Dữ liệu minh họa cho bản demo · Chưa ghi vào hệ thống
    </div>
  );
}

function MetricCard({
  label,
  value,
  change,
  icon,
}: {
  label: string;
  value: string;
  change: string;
  icon: string;
}) {
  return (
    <article className="seller-metric">
      <span className="seller-metric-icon">{icon}</span>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{change}</small>
    </article>
  );
}

export function SellerDashboard() {
  return (
    <>
      <PageHeading
        eyebrow="SELLER CENTER / OVERVIEW"
        title="Chào mừng trở lại"
        description="Theo dõi cửa hàng và các hoạt động bán hàng gần đây."
      />
      <DemoNote />
      <section className="seller-metrics-grid" aria-label="Chỉ số minh họa">
        <MetricCard
          label="Sản phẩm đang bán"
          value="12"
          change="2 bản nháp cần hoàn thiện"
          icon="▦"
        />
        <MetricCard label="Đơn hàng mới" value="08" change="3 đơn cần theo dõi" icon="▤" />
        <MetricCard label="Phiên đấu giá" value="02" change="1 phiên đang diễn ra" icon="◷" />
        <MetricCard label="Điểm uy tín" value="96 / 100" change="Mức uy tín tốt" icon="✦" />
      </section>
      <section className="seller-panel seller-shortcuts">
        <div className="seller-panel-heading">
          <div>
            <p className="seller-eyebrow">LỐI TẮT</p>
            <h2>Công việc của cửa hàng</h2>
          </div>
          <span className="seller-muted">Chọn khu vực để tiếp tục</span>
        </div>
        <div className="seller-shortcut-grid">
          <Link href="/seller/products">
            <span>▦</span>
            <strong>Quản lý sản phẩm</strong>
            <small>Danh sách, trạng thái và biểu mẫu</small>
            <b>→</b>
          </Link>
          <Link href="/seller/auctions">
            <span>◷</span>
            <strong>Quản lý đấu giá</strong>
            <small>Theo dõi phiên và lịch đấu</small>
            <b>→</b>
          </Link>
          <Link href="/seller/orders">
            <span>▤</span>
            <strong>Tra cứu đơn hàng</strong>
            <small>Xem trạng thái đơn gần đây</small>
            <b>→</b>
          </Link>
          <Link href="/seller/inventory">
            <span>▥</span>
            <strong>Tồn kho theo SKU</strong>
            <small>Tra cứu số lượng khả dụng</small>
            <b>→</b>
          </Link>
        </div>
      </section>
      <section className="seller-panel">
        <div className="seller-panel-heading">
          <div>
            <p className="seller-eyebrow">HOẠT ĐỘNG GẦN ĐÂY</p>
            <h2>Đơn hàng mới</h2>
          </div>
          <Link href="/seller/orders">Xem danh sách →</Link>
        </div>
        <OrdersTable compact />
      </section>
    </>
  );
}

export function SellerProductsPage() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const filtered = useMemo(
    () =>
      products.filter(
        (item) =>
          `${item.name} ${item.sku}`.toLowerCase().includes(query.toLowerCase()) &&
          (status === 'ALL' || item.status === status),
      ),
    [query, status],
  );
  return (
    <>
      <PageHeading
        eyebrow="SELLER CENTER / CATALOG"
        title="Sản phẩm"
        description="Quản lý nội dung và trạng thái các sản phẩm của cửa hàng."
        action={
          <Link className="seller-button seller-button-primary" href="/seller/products/new">
            ＋ Thêm sản phẩm
          </Link>
        }
      />
      <DemoNote />
      <section className="seller-panel">
        <div className="seller-toolbar">
          <label className="seller-search">
            <span>⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm tên sản phẩm hoặc SKU"
              aria-label="Tìm sản phẩm"
            />
          </label>
          <label className="seller-filter">
            Trạng thái
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="ALL">Tất cả</option>
              <option value="ACTIVE">Đang bán</option>
              <option value="DRAFT">Bản nháp</option>
              <option value="INACTIVE">Đã ẩn</option>
            </select>
          </label>
          <span className="seller-result-count">{filtered.length} sản phẩm</span>
        </div>
        {filtered.length ? (
          <div className="seller-table-wrap">
            <table className="seller-table">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>SKU</th>
                  <th>Danh mục</th>
                  <th>Giá bán</th>
                  <th>Tồn</th>
                  <th>Trạng thái</th>
                  <th>Cập nhật</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                      <small>{item.id}</small>
                    </td>
                    <td>{item.sku}</td>
                    <td>{item.category}</td>
                    <td>{currency(item.price)}</td>
                    <td>{item.stock}</td>
                    <td>
                      <span className={`seller-status ${statusClass(item.status)}`}>
                        {item.status === 'ACTIVE'
                          ? 'Đang bán'
                          : item.status === 'DRAFT'
                            ? 'Bản nháp'
                            : 'Đã ẩn'}
                      </span>
                    </td>
                    <td>{item.updated}</td>
                    <td>
                      <Link className="seller-row-link" href={`/seller/products/${item.id}/edit`}>
                        Sửa
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="seller-empty">
            <strong>Không tìm thấy sản phẩm</strong>
            <p>Thử từ khóa khác hoặc đổi bộ lọc trạng thái.</p>
          </div>
        )}
      </section>
    </>
  );
}

export function SellerProductForm({ productId }: { productId?: string }) {
  const item = products.find((product) => product.id === productId);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextErrors: string[] = [];
    if (!String(data.get('name') ?? '').trim()) nextErrors.push('Nhập tên sản phẩm.');
    if (!String(data.get('sku') ?? '').trim()) nextErrors.push('Nhập mã SKU.');
    if (Number(data.get('price')) <= 0) nextErrors.push('Giá bán phải lớn hơn 0.');
    if (Number(data.get('stock')) < 0) nextErrors.push('Tồn kho không được âm.');
    setErrors(nextErrors);
    setSubmitted(nextErrors.length === 0);
  }
  return (
    <>
      <PageHeading
        eyebrow="SELLER CENTER / CATALOG"
        title={item ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm'}
        description="Tạo hoặc cập nhật nội dung sản phẩm. Bản demo chỉ kiểm tra biểu mẫu."
        action={
          <Link className="seller-button seller-button-quiet" href="/seller/products">
            ← Danh sách
          </Link>
        }
      />
      <DemoNote />
      <form className="seller-panel seller-form" onSubmit={submit} noValidate>
        <div className="seller-panel-heading">
          <div>
            <p className="seller-eyebrow">THÔNG TIN CƠ BẢN</p>
            <h2>{item?.name ?? 'Thông tin sản phẩm'}</h2>
          </div>
          <span className="seller-muted">Trạng thái khởi tạo: Bản nháp</span>
        </div>
        <div className="seller-form-grid">
          <label>
            Tên sản phẩm *
            <input name="name" defaultValue={item?.name} placeholder="Ví dụ: Tai nghe không dây" />
          </label>
          <label>
            Mã SKU *<input name="sku" defaultValue={item?.sku} placeholder="Ví dụ: NX-AIR-01" />
          </label>
          <label>
            Danh mục
            <select name="category" defaultValue={item?.category ?? 'Điện tử'}>
              <option>Điện tử</option>
              <option>Nhà cửa</option>
              <option>Máy ảnh</option>
              <option>Thời trang</option>
            </select>
          </label>
          <label>
            Giá bán (₫) *
            <input name="price" type="number" min="1" defaultValue={item?.price} placeholder="0" />
          </label>
          <label>
            Số lượng tồn *
            <input name="stock" type="number" min="0" defaultValue={item?.stock} placeholder="0" />
          </label>
          <label className="seller-form-full">
            Mô tả
            <textarea
              name="description"
              rows={4}
              placeholder="Mô tả đặc điểm và thông tin sản phẩm"
            />
          </label>
          <label>
            Trạng thái
            <select name="status" defaultValue="DRAFT">
              <option value="DRAFT">Bản nháp</option>
              <option value="ACTIVE">Đang bán</option>
              <option value="INACTIVE">Ẩn sản phẩm</option>
            </select>
          </label>
        </div>
        {errors.length > 0 && (
          <div className="seller-form-alert error" role="alert">
            {errors.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        )}
        {submitted && (
          <div className="seller-form-alert success" role="status">
            Biểu mẫu hợp lệ. Dữ liệu chưa được gửi vì API quản lý sản phẩm chưa được tích hợp.
          </div>
        )}
        <div className="seller-form-actions">
          <Link className="seller-button seller-button-quiet" href="/seller/products">
            Hủy
          </Link>
          <button className="seller-button seller-button-primary" type="submit">
            Kiểm tra biểu mẫu
          </button>
        </div>
      </form>
    </>
  );
}

export function SellerAuctionsPage() {
  return (
    <>
      <PageHeading
        eyebrow="SELLER CENTER / AUCTIONS"
        title="Phiên đấu giá"
        description="Theo dõi các phiên do cửa hàng tổ chức và lịch bắt đầu/kết thúc."
        action={
          <Link className="seller-button seller-button-primary" href="/seller/auctions/new">
            ＋ Tạo phiên
          </Link>
        }
      />
      <DemoNote />
      <div className="seller-policy-strip">
        <span>◎</span>
        <div>
          <strong>Quy tắc đấu giá</strong>
          <p>
            Thời lượng 60 phút–168 giờ · Tối đa 5 phiên đang hoạt động · Điểm uy tín tối thiểu 50 ·
            Bước giá mặc định 10 ₫ · Gia hạn chống đấu giá phút cuối: 5 phút.
          </p>
        </div>
      </div>
      <section className="seller-panel">
        <div className="seller-panel-heading">
          <div>
            <p className="seller-eyebrow">DANH SÁCH PHIÊN</p>
            <h2>Phiên của cửa hàng</h2>
          </div>
          <span className="seller-muted">2 / 5 phiên đang hoạt động (minh họa)</span>
        </div>
        <div className="seller-table-wrap">
          <table className="seller-table">
            <thead>
              <tr>
                <th>Mã phiên</th>
                <th>Sản phẩm</th>
                <th>Bắt đầu</th>
                <th>Kết thúc</th>
                <th>Giá hiện tại</th>
                <th>Lượt trả</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {auctions.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.id}</strong>
                  </td>
                  <td>{item.product}</td>
                  <td>{item.start}</td>
                  <td>{item.end}</td>
                  <td>{currency(item.bid)}</td>
                  <td>{item.bids}</td>
                  <td>
                    <span className={`seller-status ${statusClass(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export function SellerAuctionForm() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const duration = Number(data.get('duration'));
    if (!String(data.get('product') ?? '').trim())
      return setError('Chọn sản phẩm đủ điều kiện để đấu giá.');
    if (Number(data.get('price')) <= 0) return setError('Giá khởi điểm phải lớn hơn 0.');
    if (duration < 1 || duration > 168)
      return setError('Thời lượng phiên phải từ 1 đến 168 giờ (tối thiểu 60 phút).');
    setError('');
    setMessage(
      'Thông tin hợp lệ. API tạo phiên đấu giá chưa được tích hợp nên dữ liệu chưa được lưu.',
    );
  }
  return (
    <>
      <PageHeading
        eyebrow="SELLER CENTER / AUCTIONS"
        title="Tạo phiên đấu giá"
        description="Thiết lập sản phẩm, giá khởi điểm và thời lượng phiên."
        action={
          <Link className="seller-button seller-button-quiet" href="/seller/auctions">
            ← Danh sách phiên
          </Link>
        }
      />
      <DemoNote />
      <div className="seller-policy-strip">
        <span>◎</span>
        <div>
          <strong>Giới hạn SRS</strong>
          <p>
            Thời lượng 1–168 giờ; tối đa 5 phiên hoạt động; bước giá mặc định 10 ₫; anti-sniping gia
            hạn 5 phút. Điểm uy tín tối thiểu 50 để tạo phiên.
          </p>
        </div>
      </div>
      <form className="seller-panel seller-form" onSubmit={submit} noValidate>
        <div className="seller-panel-heading">
          <div>
            <p className="seller-eyebrow">THIẾT LẬP PHIÊN</p>
            <h2>Thông tin đấu giá</h2>
          </div>
          <span className="seller-muted">2 / 5 phiên đang hoạt động (demo)</span>
        </div>
        <div className="seller-form-grid">
          <label>
            Sản phẩm *
            <select name="product" defaultValue="">
              <option value="" disabled>
                Chọn sản phẩm
              </option>
              <option>Máy ảnh film Retro 35</option>
              <option>Đồng hồ thể thao S2</option>
            </select>
          </label>
          <label>
            Giá khởi điểm (₫) *
            <input name="price" type="number" min="1" placeholder="Ví dụ: 500000" />
          </label>
          <label>
            Bước giá (₫)
            <input name="increment" type="number" min="10" defaultValue="10" />
          </label>
          <label>
            Thời lượng (giờ) *
            <input name="duration" type="number" min="1" max="168" defaultValue="24" />
            <small>Từ 1 đến 168 giờ</small>
          </label>
          <label className="seller-form-full">
            Thời gian bắt đầu *<input name="start" type="datetime-local" />
          </label>
        </div>
        <div className="seller-check-row">
          <span>✓</span>
          <p>Phiên đấu giá bật gia hạn chống trả giá phút cuối thêm 5 phút.</p>
        </div>
        {error && (
          <div className="seller-form-alert error" role="alert">
            {error}
          </div>
        )}
        {message && (
          <div className="seller-form-alert success" role="status">
            {message}
          </div>
        )}
        <div className="seller-form-actions">
          <Link className="seller-button seller-button-quiet" href="/seller/auctions">
            Hủy
          </Link>
          <button className="seller-button seller-button-primary" type="submit">
            Kiểm tra thông tin
          </button>
        </div>
      </form>
    </>
  );
}

function OrdersTable({ compact = false }: { compact?: boolean }) {
  return (
    <div className="seller-table-wrap">
      <table className="seller-table">
        <thead>
          <tr>
            <th>Mã đơn</th>
            <th>Sản phẩm</th>
            <th>Người mua</th>
            <th>Ngày đặt</th>
            <th>Tổng tiền</th>
            <th>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {orders.slice(0, compact ? 2 : undefined).map((item) => (
            <tr key={item.id}>
              <td>
                <strong>{item.id}</strong>
              </td>
              <td>{item.item}</td>
              <td>{item.buyer}</td>
              <td>{item.date}</td>
              <td>{currency(item.total)}</td>
              <td>
                <span className={`seller-status ${statusClass(item.status)}`}>{item.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SellerOrdersPage() {
  return (
    <>
      <PageHeading
        eyebrow="SELLER CENTER / ORDERS"
        title="Đơn hàng"
        description="Bảng tra cứu chỉ đọc để theo dõi đơn và trạng thái hiện tại."
      />
      <DemoNote />
      <section className="seller-panel">
        <div className="seller-panel-heading">
          <div>
            <p className="seller-eyebrow">ĐƠN HÀNG GẦN ĐÂY</p>
            <h2>Đơn của cửa hàng</h2>
          </div>
          <span className="seller-muted">Chế độ chỉ đọc</span>
        </div>
        <OrdersTable />
      </section>
      <p className="seller-readonly-note">
        Các thao tác xác nhận, hủy, hoàn tiền và tạo vận đơn chưa được bật; cần thống nhất quyền và
        API trước khi nối.
      </p>
    </>
  );
}

export function SellerInventoryPage() {
  return (
    <>
      <PageHeading
        eyebrow="SELLER CENTER / INVENTORY"
        title="Tồn kho"
        description="Tra cứu số lượng theo SKU và vị trí kho."
      />
      <DemoNote />
      <section className="seller-panel">
        <div className="seller-panel-heading">
          <div>
            <p className="seller-eyebrow">SKU INVENTORY</p>
            <h2>Số lượng khả dụng</h2>
          </div>
          <span className="seller-muted">Chế độ chỉ đọc</span>
        </div>
        <div className="seller-table-wrap">
          <table className="seller-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Sản phẩm</th>
                <th>Kho</th>
                <th>Tồn hiện tại</th>
                <th>Đã giữ</th>
                <th>Khả dụng</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => (
                <tr key={item.sku}>
                  <td>
                    <strong>{item.sku}</strong>
                  </td>
                  <td>{item.product}</td>
                  <td>{item.warehouse}</td>
                  <td>{item.onHand}</td>
                  <td>{item.reserved}</td>
                  <td>
                    <strong>{item.available}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="seller-readonly-note">
        Dữ liệu tồn kho minh họa, chưa kết nối Fulfillment API.
      </p>
    </>
  );
}
