'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { requestApi } from '@/lib/axios/api-client';
import { unwrap } from '@/lib/axios/http';
import { currency, statusClass, PageHeading, DemoNote } from '../components/seller-shared';

type LiveAuction = {
  id: string;
  productId: string;
  title: string;
  startingPrice: number;
  currentHighestBid?: number;
  increment: number;
  startAt: number | string;
  endAt: number | string;
  status: string;
  bids?: any[];
};

export function SellerAuctionsPage() {
  const [items, setItems] = useState<LiveAuction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    requestApi<{ success: boolean; data: LiveAuction[] }>('/auctions', {
      signal: controller.signal,
    })
      .then((raw) => {
        const list = unwrap<LiveAuction[]>(raw);
        if (!controller.signal.aborted) {
          setItems(Array.isArray(list) ? list : []);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setItems([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  return (
    <>
      <PageHeading
        eyebrow="KHÔNG GIAN NGƯỜI BÁN / ĐẤU GIÁ"
        title="Phiên đấu giá"
        description="Theo dõi các phiên do cửa hàng tổ chức và lịch bắt đầu/kết thúc."
        action={
          <Link className="seller-button seller-button-primary" href="/seller/auctions/new">
            ＋ Tạo phiên
          </Link>
        }
      />
      <DemoNote message="Danh sách phiên được kết nối trực tiếp với Auction Service (/auctions). API lọc phiên riêng cho Seller (GET /auctions?scope=mine) đang chờ Backend hoàn thiện theo SRS 3.5.1." />

      <div className="seller-policy-strip">
        <span>◎</span>
        <div>
          <strong>Quy tắc đấu giá hệ thống</strong>
          <p>
            Thời lượng 60 phút–168 giờ · Tối đa 5 phiên đang hoạt động · Điểm uy tín tối thiểu 50 ·
            Bước giá mặc định 10 ₫ · Gia hạn chống đấu giá phút cuối: 5 phút.
          </p>
        </div>
      </div>

      <section className="seller-panel">
        <div className="seller-panel-heading">
          <div>
            <p className="seller-eyebrow">DANH SÁCH PHIÊN · HỆ THỐNG</p>
            <h2>Phiên đấu giá sàn</h2>
          </div>
          <span className="seller-muted">
            {loading ? 'Đang tải…' : `${items.length} phiên đang diễn ra`}
          </span>
        </div>

        {loading ? (
          <p className="seller-readonly-note" style={{ padding: '24px' }}>
            Đang tải dữ liệu phiên đấu giá từ Auction API…
          </p>
        ) : items.length === 0 ? (
          <div className="seller-empty">
            <strong>Chưa có phiên đấu giá nào đang hoạt động</strong>
            <p>Nhấn "＋ Tạo phiên" để tạo phiên đấu giá mới cho sản phẩm trong kho.</p>
          </div>
        ) : (
          <div className="seller-table-wrap">
            <table className="seller-table">
              <thead>
                <tr>
                  <th>Mã phiên</th>
                  <th>Sản phẩm</th>
                  <th>Bắt đầu</th>
                  <th>Kết thúc</th>
                  <th>Giá khởi điểm / Hiện tại</th>
                  <th>Lượt trả</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.id}</strong>
                    </td>
                    <td>{item.title || item.productId}</td>
                    <td>
                      {typeof item.startAt === 'number'
                        ? new Date(item.startAt).toLocaleString('vi-VN')
                        : item.startAt}
                    </td>
                    <td>
                      {typeof item.endAt === 'number'
                        ? new Date(item.endAt).toLocaleString('vi-VN')
                        : item.endAt}
                    </td>
                    <td>{currency(item.currentHighestBid || item.startingPrice)}</td>
                    <td>{item.bids ? item.bids.length : 0}</td>
                    <td>
                      <span className={`seller-status ${statusClass(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
