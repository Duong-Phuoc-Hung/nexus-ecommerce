'use client';
import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  products,
  auctions,
  orders,
  inventory,
  PageHeading,
  DemoNote,
  MetricCard,
  OrdersTable,
} from '../components/seller-shared';
export function SellerDashboard() {
  return (
    <>
      <PageHeading
        eyebrow="SELLER CENTER / OVERVIEW"
        title="Chào mừng trở lại"
        description="Theo dõi cửa hàng và các hoạt động bán hàng gần đây."
      />
      <DemoNote />
      <section className="seller-metrics-grid" aria-label="Chỉ số minh họa">
        <MetricCard
          label="Sản phẩm đang bán"
          value="12"
          change="2 bản nháp cần hoàn thiện"
          icon="▦"
        />
        <MetricCard label="Đơn hàng mới" value="08" change="3 đơn cần theo dõi" icon="▤" />
        <MetricCard label="Phiên đấu giá" value="02" change="1 phiên đang diễn ra" icon="◷" />
        <MetricCard label="Điểm uy tín" value="96 / 100" change="Mức uy tín tốt" icon="✦" />
      </section>
      <section className="seller-panel seller-shortcuts">
        <div className="seller-panel-heading">
          <div>
            <p className="seller-eyebrow">LỐI TẮT</p>
            <h2>Công việc của cửa hàng</h2>
          </div>
          <span className="seller-muted">Chọn khu vực để tiếp tục</span>
        </div>
        <div className="seller-shortcut-grid">
          <Link href="/seller/products">
            <span>▦</span>
            <strong>Quản lý sản phẩm</strong>
            <small>Danh sách, trạng thái và biểu mẫu</small>
            <b>→</b>
          </Link>
          <Link href="/seller/auctions">
            <span>◷</span>
            <strong>Quản lý đấu giá</strong>
            <small>Theo dõi phiên và lịch đấu</small>
            <b>→</b>
          </Link>
          <Link href="/seller/orders">
            <span>▤</span>
            <strong>Tra cứu đơn hàng</strong>
            <small>Xem trạng thái đơn gần đây</small>
            <b>→</b>
          </Link>
          <Link href="/seller/inventory">
            <span>▥</span>
            <strong>Tồn kho theo SKU</strong>
            <small>Tra cứu số lượng khả dụng</small>
            <b>→</b>
          </Link>
          <Link href="/seller/reputation">
            <span>✦</span>
            <strong>Điểm tín nhiệm</strong>
            <small>Chỉ số uy tín & bảo đảm</small>
            <b>→</b>
          </Link>
        </div>
      </section>
      <section className="seller-panel">
        <div className="seller-panel-heading">
          <div>
            <p className="seller-eyebrow">HOẠT ĐỘNG GẦN ĐÂY</p>
            <h2>Đơn hàng mới</h2>
          </div>
          <Link href="/seller/orders">Xem danh sách →</Link>
        </div>
        <OrdersTable compact />
      </section>
    </>
  );
}
