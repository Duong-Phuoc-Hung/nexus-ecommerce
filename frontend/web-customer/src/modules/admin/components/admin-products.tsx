'use client';
import { AdminSelect } from './admin-select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { useAdminCatalog } from './admin-catalog-context';
import { defaultQuery, formatPrice, type CatalogPage } from '../../../../../shared/catalog';
import { userMessage } from '../../../../../shared/http';
const statusLabel: Record<string, string> = {
  ACTIVE: 'Đang hiển thị',
  DRAFT: 'Bản nháp',
  INACTIVE: 'Tạm ngừng',
};
export function AdminProducts() {
  const { api: catalogApi, productsPath } = useAdminCatalog();
  const [q, setQ] = useState(''),
    [draft, setDraft] = useState(''),
    [status, setStatus] = useState(''),
    [page, setPage] = useState(1),
    [data, setData] = useState<CatalogPage | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setData(null);
    catalogApi
      .list({ ...defaultQuery, q, status, page, pageSize: 10, scope: 'admin' }, controller.signal)
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
  }, [q, status, page, revision, catalogApi]);
  function search(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setQ(draft.trim());
    setPage(1);
  }
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">CATALOG</p>
          <h1>Quản lý sản phẩm</h1>
          <p className="admin-muted">Đối chiếu nội dung, giá và trạng thái hiển thị tại một nơi.</p>
        </div>
        <Link href={productsPath + '/new'} className="admin-button">
          + Thêm sản phẩm
        </Link>
      </div>

      <section className="admin-card">
        <form className="admin-toolbar" onSubmit={search}>
          <div className="admin-field">
            <label htmlFor="admin-search">Tìm sản phẩm</label>
            <Input
              id="admin-search"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Tên sản phẩm hoặc người bán"
              disabled={data?.querySupported === false}
            />
          </div>
          <div className="admin-field">
            <label htmlFor="admin-status">Trạng thái</label>
            <AdminSelect
              id="admin-status"
              value={status}
              disabled={data?.querySupported === false}
              onValueChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
              options={Object.entries(statusLabel).map(([value, label]) => ({ value, label }))}
              placeholder="Tất cả trạng thái"
            />
          </div>
          <Button
            variant="ghost"
            size="plain"
            type="submit"
            className="admin-button admin-button-outline"
            disabled={data?.querySupported === false}
          >
            Tìm kiếm
          </Button>
        </form>
        {data?.querySupported === false && (
          <p className="admin-notice">Bộ lọc và phân trang đang được cập nhật trên hệ thống.</p>
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
                if (q || status) {
                  setQ('');
                  setDraft('');
                  setStatus('');
                  setPage(1);
                } else setRevision((r) => r + 1);
              }}
            >
              Thử lại
            </Button>
          </div>
        ) : !data?.items.length ? (
          <div className="admin-empty">
            <h2>Chưa có sản phẩm phù hợp</h2>
            <p>Thay đổi bộ lọc hoặc tạo một sản phẩm mới.</p>
            <Link className="admin-button" href={productsPath + '/new'}>
              Thêm sản phẩm
            </Link>
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
                    <th scope="col">Thao tác</th>
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
                      <td>
                        <Link
                          href={productsPath + '/' + encodeURIComponent(p.id) + '/edit'}
                          className="admin-edit-link"
                          aria-label={'Sửa ' + p.title}
                        >
                          Chỉnh sửa
                        </Link>
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
              {data.totalPages !== null && data.totalPages > 1 && (
                <div>
                  <Button
                    variant="ghost"
                    size="plain"
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Trước
                  </Button>
                  <span>
                    Trang {data.page} / {data.totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="plain"
                    type="button"
                    disabled={page >= data.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Sau
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </>
  );
}
