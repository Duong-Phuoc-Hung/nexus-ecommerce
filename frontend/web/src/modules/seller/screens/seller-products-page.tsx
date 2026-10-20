'use client';
import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  products,
  currency,
  statusClass,
  PageHeading,
  DemoNote,
} from '../components/seller-shared';
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
