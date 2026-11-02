'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { sellerProductsApi, type BackendProduct } from '../api/seller-products.api';
import { PageHeading, DemoNote } from '../components/seller-shared';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function SellerAuctionForm() {
  const [products, setProducts] = useState<BackendProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoadingProducts(true);

    sellerProductsApi
      .getMine('ACTIVE', controller.signal)
      .catch(() => sellerProductsApi.list(controller.signal))
      .then((items) => {
        if (!controller.signal.aborted) {
          setProducts(Array.isArray(items) ? items : []);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingProducts(false);
        }
      });

    return () => controller.abort();
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const duration = Number(data.get('duration'));
    const price = Number(data.get('price'));

    if (!selectedProduct.trim()) {
      return setError('Vui lòng chọn sản phẩm trong kho của bạn để đưa vào phiên đấu giá.');
    }
    if (price <= 0) {
      return setError('Giá khởi điểm phải lớn hơn 0.');
    }
    if (duration < 1 || duration > 168) {
      return setError(
        'Thời lượng phiên phải từ 1 đến 168 giờ (tối thiểu 60 phút) theo đúng SRS 2.6.',
      );
    }

    setError('');
    setMessage(
      'Thông số phiên đấu giá hợp lệ (thời lượng, bước giá 10 ₫, anti-sniping 5 phút). Lưu ý: Backend Auction Service hiện chưa mở endpoint POST /api/v1/auctions cho Seller; cấu hình phiên đã được chuẩn hóa theo SRS 3.5.1.',
    );
  }

  return (
    <>
      <PageHeading
        eyebrow="KHÔNG GIAN NGƯỜI BÁN / ĐẤU GIÁ"
        title="Tạo phiên đấu giá"
        description="Thiết lập sản phẩm, giá khởi điểm và thời lượng phiên theo tiêu chuẩn hệ thống."
        action={
          <Link className="seller-button seller-button-quiet" href="/seller/auctions">
            ← Danh sách phiên
          </Link>
        }
      />
      <DemoNote message="Danh sách sản phẩm được tải trực tiếp từ Catalog API của Seller. Backend Auction Service đang chờ bổ sung endpoint tạo phiên (POST /auctions) theo SRS 3.5.1." />

      <div className="seller-policy-strip">
        <span>◎</span>
        <div>
          <strong>Quy chuẩn hệ thống đấu giá (SRS 2.6 & 3.5.1)</strong>
          <p>
            Thời lượng 1–168 giờ; tối đa 5 phiên hoạt động; bước giá mặc định 10 ₫; anti-sniping gia
            hạn 5 phút. Điểm uy tín tối thiểu 50 để tạo phiên.
          </p>
        </div>
      </div>

      <form className="seller-panel seller-form" onSubmit={submit} noValidate>
        <div className="seller-panel-heading">
          <div>
            <p className="seller-eyebrow">THIẾT LẬP PHIÊN</p>
            <h2>Thông tin đấu giá</h2>
          </div>
          <span className="seller-muted">Tối đa 5 phiên hoạt động</span>
        </div>

        <div className="seller-form-grid">
          <label>
            Sản phẩm đấu giá *
            <div style={{ marginTop: '6px' }}>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger aria-label="Chọn sản phẩm đấu giá">
                  <SelectValue
                    placeholder={
                      loadingProducts
                        ? 'Đang tải sản phẩm từ Catalog...'
                        : products.length === 0
                          ? 'Chưa có sản phẩm khả dụng trong kho'
                          : 'Chọn sản phẩm trong kho của bạn'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title} (SKU: {p.slug ? p.slug.slice(0, 12).toUpperCase() : p.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </label>

          <label>
            Giá khởi điểm (₫) *
            <input name="price" type="number" min="1" placeholder="Ví dụ: 500000" required />
          </label>

          <label>
            Bước giá (₫)
            <input name="increment" type="number" min="10" defaultValue="10" />
            <small>Bước giá mặc định tối thiểu 10 ₫ (SRS 2.6)</small>
          </label>

          <label>
            Thời lượng (giờ) *
            <input name="duration" type="number" min="1" max="168" defaultValue="24" required />
            <small>Từ 1 đến 168 giờ (tối thiểu 60 phút)</small>
          </label>

          <label className="seller-form-full">
            Thời gian bắt đầu *
            <input name="start" type="datetime-local" required />
          </label>
        </div>

        <div className="seller-check-row">
          <span>✓</span>
          <p>
            Phiên đấu giá tự động bật tính năng chống đấu giá phút cuối (Anti-sniping 5 phút theo
            SRS 2.6).
          </p>
        </div>

        {error && (
          <div className="seller-form-alert error" role="alert">
            {error}
          </div>
        )}
        {message && (
          <div
            className="seller-form-alert success"
            role="status"
            style={{
              background: '#f0fdf4',
              color: '#166534',
              borderColor: '#bbf7d0',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              lineHeight: 1.5,
            }}
          >
            {message}
          </div>
        )}

        <div className="seller-form-actions">
          <button type="submit" className="seller-button seller-button-primary">
            Xác nhận tạo phiên đấu giá
          </button>
        </div>
      </form>
    </>
  );
}
