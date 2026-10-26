'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { sellerProductsApi, type BackendProduct } from '../api/seller-products.api';
import { userMessage } from '@/lib/axios/http';
import {
  products as mockProducts,
  currency,
  statusClass,
  PageHeading,
  DemoNote,
} from '../components/seller-shared';

type DisplayProduct = {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  status: string;
  updated: string;
};

export function SellerProductsPage() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const debouncedQuery = useDebouncedValue(query, 400);

  const [productsList, setProductsList] = useState<DisplayProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    const searchKeyword = debouncedQuery.trim();
    // Khi tìm kiếm: dùng Search API; Khi duyệt kho: dùng API GET /products/mine của Seller (fallback list nếu chưa auth)
    const fetcher = searchKeyword
      ? sellerProductsApi.search(searchKeyword, controller.signal) // API 4: /api/v1/products/search?q=...
      : sellerProductsApi
          .getMine(status === 'ALL' ? undefined : status, controller.signal) // API 2: /api/v1/products/mine
          .catch(() => sellerProductsApi.list(controller.signal)); // Fallback /api/v1/products

    fetcher
      .then((data: BackendProduct[]) => {
        if (!controller.signal.aborted) {
          const mapped: DisplayProduct[] = data.map((item) => ({
            id: String(item.id),
            name: item.title,
            sku: item.slug ? item.slug.slice(0, 16).toUpperCase() : `SKU-${item.id}`,
            category: item.categoryId || 'Chung',
            price: Number(item.price) || 0,
            stock: item.stockQuantity ?? 10,
            status: item.status || 'ACTIVE',
            updated: item.createdAt
              ? new Date(item.createdAt).toLocaleDateString('vi-VN')
              : '26/10/2026',
          }));
          setProductsList(mapped);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          // Fallback sang mock nếu API gặp sự cố
          setProductsList(mockProducts);
          setError(userMessage(err));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [debouncedQuery, status]);

  async function handleDelete(id: string, name: string) {
    if (
      !window.confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${name}" (ID: ${id}) khỏi kho hàng?`)
    ) {
      return;
    }
    setDeletingId(id);
    setActionSuccess('');
    setError('');
    try {
      // API 8: DELETE /api/v1/products/:id
      await sellerProductsApi.delete(id);
      setProductsList((prev) => prev.filter((p) => p.id !== id));
      setActionSuccess(`Đã xóa thành công sản phẩm "${name}" (ID: ${id}).`);
    } catch (err) {
      setError(userMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = useMemo(
    () =>
      productsList.filter(
        (item) =>
          `${item.name} ${item.sku}`.toLowerCase().includes(query.toLowerCase()) &&
          (status === 'ALL' || item.status === status),
      ),
    [productsList, query, status],
  );

  return (
    <>
      <PageHeading
        eyebrow="SELLER CENTER / CATALOG"
        title="Sản phẩm"
        description="Quản lý kho hàng, tạo mới và cập nhật trạng thái các sản phẩm của cửa hàng."
        action={
          <Link className="seller-button seller-button-primary" href="/seller/products/new">
            ＋ Thêm sản phẩm
          </Link>
        }
      />
      <DemoNote message="Danh sách sản phẩm lấy từ kho riêng Seller (GET /products/mine), hỗ trợ tìm kiếm (GET /search) và xóa trực tiếp (DELETE /products/:id)." />

      <section className="seller-panel">
        <div className="seller-toolbar">
          <label className="seller-search">
            <span>⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm tên sản phẩm hoặc SKU (hỗ trợ API Search)"
              aria-label="Tìm sản phẩm"
            />
          </label>
          <label className="seller-filter">
            Trạng thái
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="ALL">Tất cả</option>
              <option value="ACTIVE">Đang bán</option>
              <option value="DRAFT">Bản nháp</option>
              <option value="ARCHIVED">Lưu trữ</option>
              <option value="OUT_OF_STOCK">Hết hàng</option>
            </select>
          </label>
          <span className="seller-result-count">
            {loading ? 'Đang tải...' : `${filtered.length} sản phẩm`}
          </span>
        </div>

        {actionSuccess && (
          <div className="seller-form-alert success" style={{ margin: '16px 0' }} role="status">
            {actionSuccess}
          </div>
        )}

        {loading && <p className="seller-loading">Đang tải danh sách sản phẩm từ API...</p>}

        {error && !loading && (
          <p className="seller-readonly-note" style={{ color: '#d9383a' }}>
            {error} (hiển thị danh sách dự phòng)
          </p>
        )}

        {!loading && filtered.length > 0 && (
          <div className="seller-table-wrap">
            <table className="seller-table">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>SKU</th>
                  <th>Danh mục ID</th>
                  <th>Giá bán</th>
                  <th>Tồn</th>
                  <th>Trạng thái</th>
                  <th>Cập nhật</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                      <small>ID: {item.id}</small>
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
                            : item.status === 'ARCHIVED'
                              ? 'Lưu trữ'
                              : 'Hết hàng'}
                      </span>
                    </td>
                    <td>{item.updated}</td>
                    <td>
                      <div style={{ display: 'inline-flex', gap: 12, alignItems: 'center' }}>
                        <Link className="seller-row-link" href={`/seller/products/${item.id}/edit`}>
                          Sửa
                        </Link>
                        <button
                          type="button"
                          className="seller-row-link"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#d9383a',
                            cursor: 'pointer',
                            padding: 0,
                            font: 'inherit',
                          }}
                          onClick={() => handleDelete(item.id, item.name)}
                          disabled={deletingId === item.id}
                        >
                          {deletingId === item.id ? 'Đang xóa...' : 'Xóa'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="seller-empty">
            <strong>Không tìm thấy sản phẩm</strong>
            <p>Thử từ khóa khác hoặc đổi bộ lọc trạng thái.</p>
          </div>
        )}
      </section>
    </>
  );
}
