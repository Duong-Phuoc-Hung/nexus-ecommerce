const workspaces = [
  {
    number: '01',
    title: 'Người dùng & phân quyền',
    description: 'Tài khoản, vai trò và quyền truy cập',
  },
  { number: '02', title: 'Kiểm duyệt sản phẩm', description: 'Danh mục và nội dung chờ duyệt' },
  {
    number: '03',
    title: 'Đấu giá & đơn hàng',
    description: 'Phiên đấu giá, giao dịch và đơn hàng',
  },
  { number: '04', title: 'Vận hành hệ thống', description: 'Fulfillment, nhật ký và cấu hình' },
];

export default function AdminHomePage() {
  return (
    <main className="admin-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="Nexus Admin home">
          <span className="brand-mark">N</span>
          <span>
            NEXUS<span className="brand-light"> / ADMIN</span>
          </span>
        </a>
        <p className="nav-caption">WORKSPACE</p>
        <div className="nav-item nav-item-active">
          <span>⌂</span> Tổng quan
        </div>
        <div className="nav-item">
          <span>◎</span> Quản trị
        </div>
        <div className="nav-item">
          <span>▤</span> Hoạt động
        </div>
        <div className="sidebar-bottom">
          PROJECT NEXUS
          <br />
          <span>Administration portal</span>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <span>
            Workspace <span className="crumb">/ Tổng quan</span>
          </span>
          <span className="environment">
            <i /> FRONTEND READY
          </span>
        </header>

        <div className="content">
          <p className="overline">PROJECT NEXUS · ADMINISTRATION</p>
          <h1>
            Không gian quản trị
            <br />
            <span>đã sẵn sàng.</span>
          </h1>
          <p className="intro">
            Nền tảng giao diện quản trị đã khởi chạy. Các khu vực nghiệp vụ sẽ được phát triển theo
            từng module.
          </p>

          <div className="section-heading">
            <div>
              <p className="overline">MODULES</p>
              <h2>Khu vực làm việc</h2>
            </div>
            <span>01 — 04</span>
          </div>

          <div className="workspace-grid">
            {workspaces.map((workspace) => (
              <article className="workspace-card" key={workspace.number}>
                <span className="card-number">{workspace.number}</span>
                <h3>{workspace.title}</h3>
                <p>{workspace.description}</p>
                <span className="card-arrow" aria-hidden="true">
                  ↗
                </span>
              </article>
            ))}
          </div>

          <footer className="page-footer">
            Project Nexus <span>·</span> Admin portal foundation
          </footer>
        </div>
      </section>
    </main>
  );
}
