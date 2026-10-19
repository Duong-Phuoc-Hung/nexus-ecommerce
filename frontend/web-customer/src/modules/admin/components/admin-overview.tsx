import Link from 'next/link';
export function AdminOverview({ productsPath = '/products' }: { productsPath?: string }) {
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">NEXUS ADMIN</p>
          <h1>Quản lý sản phẩm có hệ thống</h1>
          <p className="admin-muted">
            Bắt đầu với nội dung rõ ràng, thông tin nhất quán và quyền truy cập phù hợp.
          </p>
        </div>
      </div>
      <section className="admin-overview-hero">
        <div>
          <p className="admin-eyebrow">CATALOG WORKSPACE</p>
          <h2>
            Mỗi món đồ xứng đáng
            <br />
            được giới thiệu đúng cách.
          </h2>
          <p>Kiểm tra tên, hình ảnh, tình trạng và giá trước khi đưa sản phẩm đến người mua.</p>
          <Link href={productsPath + '/new'} className="admin-button">
            Thêm sản phẩm mới
          </Link>
        </div>
        <div className="admin-hero-art" aria-hidden="true">
          <span>N</span>
          <div></div>
        </div>
      </section>
      <section className="admin-overview-grid">
        <Link href={productsPath} className="admin-card">
          <span className="admin-step">01</span>
          <h2>Đối chiếu danh sách</h2>
          <p className="admin-muted">Tìm sản phẩm và xem trạng thái hiển thị hiện tại.</p>
          <strong>Xem sản phẩm →</strong>
        </Link>
        <Link href={productsPath + '/new'} className="admin-card">
          <span className="admin-step">02</span>
          <h2>Chuẩn bị nội dung</h2>
          <p className="admin-muted">Tạo thông tin và hình ảnh rõ ràng cho từng món đồ.</p>
          <strong>Thêm sản phẩm →</strong>
        </Link>
        <div className="admin-card">
          <span className="admin-step">03</span>
          <h2>Kiểm tra trước khi lưu</h2>
          <p className="admin-muted">
            Quyền thao tác và điều kiện nghiệp vụ được xác minh khi gửi yêu cầu.
          </p>
        </div>
      </section>
    </>
  );
}
