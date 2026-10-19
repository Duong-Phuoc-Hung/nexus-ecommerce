'use client';
import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { auctions, PageHeading, DemoNote } from '../components/seller-shared';
export function SellerAuctionForm() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const duration = Number(data.get('duration'));
    if (!String(data.get('product') ?? '').trim())
      return setError('Chọn sản phẩm đủ điều kiện để đấu giá.');
    if (Number(data.get('price')) <= 0) return setError('Giá khởi điểm phải lớn hơn 0.');
    if (duration < 1 || duration > 168)
      return setError('Thời lượng phiên phải từ 1 đến 168 giờ (tối thiểu 60 phút).');
    setError('');
    setMessage(
      'Thông tin hợp lệ. API tạo phiên đấu giá chưa được tích hợp nên dữ liệu chưa được lưu.',
    );
  }
  return (
    <>
      <PageHeading
        eyebrow="SELLER CENTER / AUCTIONS"
        title="Tạo phiên đấu giá"
        description="Thiết lập sản phẩm, giá khởi điểm và thời lượng phiên."
        action={
          <Link className="seller-button seller-button-quiet" href="/seller/auctions">
            ← Danh sách phiên
          </Link>
        }
      />
      <DemoNote />
      <div className="seller-policy-strip">
        <span>◎</span>
        <div>
          <strong>Giới hạn SRS</strong>
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
          <span className="seller-muted">2 / 5 phiên đang hoạt động (demo)</span>
        </div>
        <div className="seller-form-grid">
          <label>
            Sản phẩm *
            <select name="product" defaultValue="">
              <option value="" disabled>
                Chọn sản phẩm
              </option>
              <option>Máy ảnh film Retro 35</option>
              <option>Đồng hồ thể thao S2</option>
            </select>
          </label>
          <label>
            Giá khởi điểm (₫) *
            <input name="price" type="number" min="1" placeholder="Ví dụ: 500000" />
          </label>
          <label>
            Bước giá (₫)
            <input name="increment" type="number" min="10" defaultValue="10" />
          </label>
          <label>
            Thời lượng (giờ) *
            <input name="duration" type="number" min="1" max="168" defaultValue="24" />
            <small>Từ 1 đến 168 giờ</small>
          </label>
          <label className="seller-form-full">
            Thời gian bắt đầu *<input name="start" type="datetime-local" />
          </label>
        </div>
        <div className="seller-check-row">
          <span>✓</span>
          <p>Phiên đấu giá bật gia hạn chống trả giá phút cuối thêm 5 phút.</p>
        </div>
        {error && (
          <div className="seller-form-alert error" role="alert">
            {error}
          </div>
        )}
        {message && (
          <div className="seller-form-alert success" role="status">
            {message}
          </div>
        )}
        <div className="seller-form-actions">
          <Link className="seller-button seller-button-quiet" href="/seller/auctions">
            Hủy
          </Link>
          <button className="seller-button seller-button-primary" type="submit">
            Kiểm tra thông tin
          </button>
        </div>
      </form>
    </>
  );
}
