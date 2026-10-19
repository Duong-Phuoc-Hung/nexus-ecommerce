'use client';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { useAdminCatalog } from './admin-catalog-context';
import { defaultQuery, formatPrice, type CatalogPage } from '../../../../../shared/catalog';
import { userMessage } from '../../../../../shared/http';
const statusLabel: Record<string, string> = {
  ACTIVE: 'Đang hiển thị',
  DRAFT: 'Bản nháp',
  INACTIVE: 'Tạm ngừng',
};
export function AdminProducts() {
  const { api: catalogApi } = useAdminCatalog();
  const [data, setData] = useState<CatalogPage | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setData(null);
    catalogApi
      .list({ ...defaultQuery, scope: 'admin' }, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(userMessage(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision, catalogApi]);
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">CATALOG</p>
          <h1>Quản lý sản phẩm</h1>
          <p className="admin-muted">Đối chiếu nội dung, giá và trạng thái hiển thị tại một nơi.</p>
        </div>
        <span className="admin-muted">Danh sách từ Catalog API</span>
      </div>

      <section className="admin-card">
        {data?.querySupported === false && (
          <p className="admin-notice">
            Catalog API hiện cung cấp danh sách cơ bản; tìm kiếm, lọc và phân trang chưa được
            backend hỗ trợ.
          </p>
        )}
        {loading ? (
          <p className="admin-empty" role="status">
            Đang tải danh sách sản phẩm…
          </p>
        ) : error ? (
          <div className="admin-empty" role="alert">
            <h2>Chưa tải được danh sách</h2>
            <p>{error}</p>
            <Button
              variant="ghost"
              size="plain"
              className="admin-button"
              type="button"
              onClick={() => {
                setRevision((r) => r + 1);
              }}
            >
              Thử lại
            </Button>
          </div>
        ) : !data?.items.length ? (
          <div className="admin-empty">
            <h2>Chưa có sản phẩm phù hợp</h2>
            <p>Thử tải lại danh sách hoặc kiểm tra kết nối Catalog API.</p>
          </div>
        ) : (
          <>
            <div className="admin-table-scroll">
              <table className="admin-products-table">
                <caption className="admin-sr-only">Danh sách sản phẩm quản trị</caption>
                <thead>
                  <tr>
                    <th scope="col">Sản phẩm</th>
                    <th scope="col">Giá</th>
                    <th scope="col">Người bán</th>
                    <th scope="col">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="admin-product-cell">
                          <img
                            src={p.images[0] || '/images/nexus-product-placeholder.svg'}
                            alt=""
                            width={52}
                            height={52}
                            onError={(e) => {
                              if (
                                !e.currentTarget.src.endsWith(
                                  '/images/nexus-product-placeholder.svg',
                                )
                              )
                                e.currentTarget.src = '/images/nexus-product-placeholder.svg';
                            }}
                          />
                          <div>
                            <strong>{p.title}</strong>
                            <span className="admin-muted">
                              {p.categoryName || p.categoryId || 'Danh mục đang cập nhật'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>{formatPrice(p)}</td>
                      <td>{p.sellerName || p.sellerId || 'Đang cập nhật'}</td>
                      <td>
                        <span
                          className={
                            'admin-badge ' + (p.status === 'ACTIVE' ? 'admin-badge-active' : '')
                          }
                        >
                          {statusLabel[p.status] || p.status || 'Đang cập nhật'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="admin-pagination">
              <span className="admin-muted">
                {data.total !== null ? data.total + ' sản phẩm' : 'Danh sách hiện có'}
              </span>
            </div>
          </>
        )}
      </section>
    </>
  );
}
