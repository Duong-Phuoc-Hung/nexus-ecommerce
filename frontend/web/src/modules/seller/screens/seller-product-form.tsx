'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import {
  sellerProductsApi,
  type FlatCategory,
  type BackendProduct,
} from '../api/seller-products.api';
import { userMessage } from '@/lib/axios/http';
import { products as mockProducts, PageHeading, DemoNote } from '../components/seller-shared';

export function SellerProductForm({ productId }: { productId?: string }) {
  const [categories, setCategories] = useState<FlatCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [productData, setProductData] = useState<Partial<BackendProduct> | null>(null);
  const [productLoading, setProductLoading] = useState(Boolean(productId));
  const [productError, setProductError] = useState('');

  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // 1. API 1: GET /api/v1/categories?tree=true
  useEffect(() => {
    const controller = new AbortController();
    setCategoriesLoading(true);

    sellerProductsApi
      .getCategories(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setCategories(data);
        }
      })
      .catch(() => {
        // Fallback default danh mục
        if (!controller.signal.aborted) {
          setCategories([
            { id: '1', name: 'Thiết bị điện tử', rawName: 'Điện tử', level: 0 },
            { id: '100', name: '— iPhone', rawName: 'iPhone', level: 1 },
            { id: '102', name: '— MacBook', rawName: 'MacBook', level: 1 },
            { id: '16', name: 'Đồng hồ cao cấp', rawName: 'Đồng hồ', level: 0 },
            { id: '2', name: 'Thời trang & Phụ kiện', rawName: 'Thời trang', level: 0 },
          ]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setCategoriesLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  // 2. API 4: GET /api/v1/products/:id
  useEffect(() => {
    if (!productId) return;

    const controller = new AbortController();
    setProductLoading(true);
    setProductError('');

    sellerProductsApi
      .getById(productId, controller.signal)
      .then((detail) => {
        if (!controller.signal.aborted) {
          setProductData(detail);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          // Fallback sang mock nếu ID là mẫu mock
          const fallback = mockProducts.find((p) => p.id === productId);
          if (fallback) {
            setProductData({
              id: fallback.id,
              title: fallback.name,
              slug: fallback.sku,
              categoryId: fallback.category,
              price: fallback.price,
              stockQuantity: fallback.stock,
              status: fallback.status,
            });
          } else {
            setProductError(userMessage(err));
          }
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setProductLoading(false);
        }
      });

    return () => controller.abort();
  }, [productId]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextErrors: string[] = [];
    if (!String(data.get('name') ?? '').trim()) nextErrors.push('Nhập tên sản phẩm.');
    if (!String(data.get('sku') ?? '').trim()) nextErrors.push('Nhập mã SKU/Slug.');
    if (Number(data.get('price')) <= 0) nextErrors.push('Giá bán phải lớn hơn 0.');
    if (Number(data.get('stock')) < 0) nextErrors.push('Tồn kho không được âm.');
    setErrors(nextErrors);
    setSubmitted(nextErrors.length === 0);
  }

  const isEditMode = Boolean(productId);
  const title = isEditMode ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm';

  return (
    <>
      <PageHeading
        eyebrow="SELLER CENTER / CATALOG"
        title={title}
        description="Tạo hoặc cập nhật nội dung sản phẩm. Danh mục và thông tin chi tiết được tải trực tiếp từ Catalog API."
        action={
          <Link className="seller-button seller-button-quiet" href="/seller/products">
            ← Danh sách
          </Link>
        }
      />
      <DemoNote message="Danh mục sản phẩm được đồng bộ từ Category API (tree=true); chi tiết sản phẩm được tải từ Product Detail API." />

      {productLoading && (
        <p className="seller-loading" style={{ margin: '16px 0' }}>
          Đang tải thông tin sản phẩm từ Product API...
        </p>
      )}

      {productError && (
        <div className="seller-form-alert error" role="alert">
          {productError}
        </div>
      )}

      {!productLoading && (
        <form className="seller-panel seller-form" onSubmit={submit} noValidate>
          <div className="seller-panel-heading">
            <div>
              <p className="seller-eyebrow">
                {isEditMode ? `ID SẢN PHẨM: ${productData?.id ?? productId}` : 'THÔNG TIN CƠ BẢN'}
              </p>
              <h2>{productData?.title ?? 'Thông tin sản phẩm'}</h2>
            </div>
            <span className="seller-muted">
              {isEditMode
                ? `Trạng thái: ${productData?.status ?? 'ACTIVE'}`
                : 'Trạng thái khởi tạo: Bản nháp'}
            </span>
          </div>

          <div className="seller-form-grid">
            <label>
              Tên sản phẩm *
              <input
                key={`name-${productData?.title ?? ''}`}
                name="name"
                defaultValue={productData?.title}
                placeholder="Ví dụ: iPhone 15 Pro Max 256GB"
              />
            </label>

            <label>
              Mã SKU / Slug *
              <input
                key={`sku-${productData?.slug ?? ''}`}
                name="sku"
                defaultValue={productData?.slug ?? (productData?.id ? `SKU-${productData.id}` : '')}
                placeholder="Ví dụ: IPHONE-15-PRO-MAX"
              />
            </label>

            <label>
              Danh mục {categoriesLoading ? '(Đang tải danh mục...)' : ''}
              <select
                key={`category-${productData?.categoryId ?? ''}`}
                name="category"
                defaultValue={productData?.categoryId ?? categories[0]?.id ?? ''}
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Giá bán (₫) *
              <input
                key={`price-${productData?.price ?? ''}`}
                name="price"
                type="number"
                min="1"
                defaultValue={productData?.price ?? ''}
                placeholder="0"
              />
            </label>

            <label>
              Số lượng tồn *
              <input
                key={`stock-${productData?.stockQuantity ?? ''}`}
                name="stock"
                type="number"
                min="0"
                defaultValue={productData?.stockQuantity ?? 10}
                placeholder="0"
              />
            </label>

            <label className="seller-form-full">
              Mô tả
              <textarea
                key={`desc-${productData?.description ?? ''}`}
                name="description"
                rows={4}
                defaultValue={productData?.description ?? ''}
                placeholder="Mô tả đặc điểm và thông tin sản phẩm"
              />
            </label>

            <label>
              Trạng thái
              <select
                key={`status-${productData?.status ?? ''}`}
                name="status"
                defaultValue={productData?.status ?? 'ACTIVE'}
              >
                <option value="ACTIVE">Đang bán (ACTIVE)</option>
                <option value="DRAFT">Bản nháp (DRAFT)</option>
                <option value="INACTIVE">Ẩn sản phẩm (INACTIVE)</option>
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
              Biểu mẫu hợp lệ. (Lưu ý: API POST / PUT sản phẩm của Seller hiện chưa có trên backend
              để ghi dữ liệu).
            </div>
          )}

          <div className="seller-form-actions">
            <Link className="seller-button seller-button-quiet" href="/seller/products">
              Hủy
            </Link>
            <button className="seller-button seller-button-primary" type="submit">
              {isEditMode ? 'Cập nhật thông tin' : 'Kiểm tra biểu mẫu'}
            </button>
          </div>
        </form>
      )}
    </>
  );
}
