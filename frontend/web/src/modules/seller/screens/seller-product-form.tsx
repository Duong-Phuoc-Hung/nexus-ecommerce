'use client';
import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { products, PageHeading, DemoNote } from '../components/seller-shared';
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
