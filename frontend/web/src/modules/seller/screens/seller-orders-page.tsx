'use client';
import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { PageHeading, DemoNote, OrdersTable } from '../components/seller-shared';
export function SellerOrdersPage() {
  return (
    <>
      <PageHeading
        eyebrow="SELLER CENTER / ORDERS"
        title="Đơn hàng"
        description="Bảng tra cứu chỉ đọc để theo dõi đơn và trạng thái hiện tại."
      />
      <DemoNote />
      <section className="seller-panel">
        <div className="seller-panel-heading">
          <div>
            <p className="seller-eyebrow">ĐƠN HÀNG GẦN ĐÂY</p>
            <h2>Đơn của cửa hàng</h2>
          </div>
          <span className="seller-muted">Chế độ chỉ đọc</span>
        </div>
        <OrdersTable />
      </section>
      <p className="seller-readonly-note">
        Các thao tác xác nhận, hủy, hoàn tiền và tạo vận đơn chưa được bật; cần thống nhất quyền và
        API trước khi nối.
      </p>
    </>
  );
}
