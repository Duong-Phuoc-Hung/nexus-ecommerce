'use client';
import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  auctions,
  currency,
  statusClass,
  PageHeading,
  DemoNote,
} from '../components/seller-shared';
export function SellerAuctionsPage() {
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
      <DemoNote />
      <div className="seller-policy-strip">
        <span>◎</span>
        <div>
          <strong>Quy tắc đấu giá</strong>
          <p>
            Thời lượng 60 phút–168 giờ · Tối đa 5 phiên đang hoạt động · Điểm uy tín tối thiểu 50 ·
            Bước giá mặc định 10 ₫ · Gia hạn chống đấu giá phút cuối: 5 phút.
          </p>
        </div>
      </div>
      <section className="seller-panel">
        <div className="seller-panel-heading">
          <div>
            <p className="seller-eyebrow">DANH SÁCH PHIÊN</p>
            <h2>Phiên của cửa hàng</h2>
          </div>
          <span className="seller-muted">2 / 5 phiên đang hoạt động</span>
        </div>
        <div className="seller-table-wrap">
          <table className="seller-table">
            <thead>
              <tr>
                <th>Mã phiên</th>
                <th>Sản phẩm</th>
                <th>Bắt đầu</th>
                <th>Kết thúc</th>
                <th>Giá hiện tại</th>
                <th>Lượt trả</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {auctions.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.id}</strong>
                  </td>
                  <td>{item.product}</td>
                  <td>{item.start}</td>
                  <td>{item.end}</td>
                  <td>{currency(item.bid)}</td>
                  <td>{item.bids}</td>
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
      </section>
    </>
  );
}
