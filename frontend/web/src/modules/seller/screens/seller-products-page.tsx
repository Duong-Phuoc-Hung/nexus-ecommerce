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

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    const searchKeyword = debouncedQuery.trim();
    const fetcher = searchKeyword
      ? sellerProductsApi.search(searchKeyword, controller.signal) // API 3: /api/v1/products/search?q=...
      : sellerProductsApi.list(controller.signal); // API 2: /api/v1/products

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
              : '25/10/2026',
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
  }, [debouncedQuery]);

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
        description="Quản lý nội dung và trạng thái các sản phẩm của cửa hàng."
        action={
          <Link className="seller-button seller-button-primary" href="/seller/products/new">
            ＋ Thêm sản phẩm
          </Link>
        }
      />
      <DemoNote message="Danh sách sản phẩm được tải và tìm kiếm trực tiếp từ Catalog API." />

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
              <option value="INACTIVE">Đã ẩn</option>
            </select>
          </label>
          <span className="seller-result-count">
            {loading ? 'Đang tải...' : `${filtered.length} sản phẩm`}
          </span>
        </div>

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
                  <th />
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
