'use client';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { PageHeading, DemoNote } from '../components/seller-shared';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function SellerAuctionForm() {
  const [selectedProduct, setSelectedProduct] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const duration = Number(data.get('duration'));
    if (!selectedProduct.trim()) return setError('Vui lòng chọn sản phẩm đủ điều kiện để đấu giá.');
    if (Number(data.get('price')) <= 0) return setError('Giá khởi điểm phải lớn hơn 0.');
    if (duration < 1 || duration > 168)
      return setError('Thời lượng phiên phải từ 1 đến 168 giờ (tối thiểu 60 phút).');
    setError('');
    setMessage('Thông tin hợp lệ. Yêu cầu tạo phiên đấu giá đã được ghi nhận trên hệ thống.');
  }

  return (
    <>
      <PageHeading
        eyebrow="KHÔNG GIAN NGƯỜI BÁN / ĐẤU GIÁ"
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
          <strong>Quy chuẩn hệ thống đấu giá</strong>
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
          <span className="seller-muted">2 / 5 phiên đang hoạt động</span>
        </div>
        <div className="seller-form-grid">
          <label>
            Sản phẩm đấu giá *
            <div style={{ marginTop: '6px' }}>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger aria-label="Chọn sản phẩm đấu giá">
                  <SelectValue placeholder="Chọn sản phẩm trong kho" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Máy ảnh film Retro 35">Máy ảnh film Retro 35</SelectItem>
                  <SelectItem value="Đồng hồ thể thao S2">Đồng hồ thể thao S2</SelectItem>
                  <SelectItem value="Tai nghe không dây Pro">Tai nghe không dây Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
          <button className="seller-button seller-button-primary" type="submit">
            Tạo phiên đấu giá
          </button>
          <Link className="seller-button seller-button-quiet" href="/seller/auctions">
            Hủy bỏ
          </Link>
        </div>
      </form>
    </>
  );
}
