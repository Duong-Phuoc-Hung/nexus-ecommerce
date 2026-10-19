'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAdminCatalog } from './admin-catalog-context';
import { formatPrice, type CatalogProduct } from '../../catalog/api/catalog.factory';
import { userMessage } from '../../../lib/axios/http';

export function ProductForm({ productId }: { productId?: string }) {
  const { api, productsPath } = useAdminCatalog();
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [loading, setLoading] = useState(!!productId);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!productId) return;
    const controller = new AbortController();
    api
      .detail(productId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setProduct(result);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(userMessage(reason));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [api, productId]);

  return (
    <section className="admin-card admin-empty">
      <p className="admin-eyebrow">CATALOG API</p>
      <h1>{productId ? 'Chi tiết sản phẩm' : 'Tạo sản phẩm'}</h1>
      {loading ? (
        <p role="status">Đang tải sản phẩm…</p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : product ? (
        <div className="mt-5 space-y-2 text-left">
          <p>
            <strong>Tên:</strong> {product.title}
          </p>
          <p>
            <strong>Mã sản phẩm:</strong> {product.id}
          </p>
          <p>
            <strong>Giá:</strong> {formatPrice(product)}
          </p>
          <p>
            <strong>Trạng thái:</strong> {product.status}
          </p>
          <p>
            <strong>Tình trạng:</strong> {product.condition || 'Chưa có thông tin'}
          </p>
        </div>
      ) : null}
      <p className="admin-muted mt-5">
        {productId
          ? 'Catalog API hiện hỗ trợ xem chi tiết. Endpoint cập nhật sản phẩm chưa được backend cung cấp.'
          : 'Backend hiện chưa cung cấp API tạo sản phẩm, nên biểu mẫu chưa thể lưu dữ liệu.'}
      </p>
      <Button asChild variant="outline" className="mt-5">
        <Link href={productsPath}>Về danh sách sản phẩm</Link>
      </Button>
    </section>
  );
}
