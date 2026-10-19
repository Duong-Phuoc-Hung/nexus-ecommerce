'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  orders,
  users,
  shipments,
  Heading,
  DemoBanner,
  CaseTable,
} from '../components/support-shared';
export function SupportDashboard() {
  return (
    <>
      <Heading
        label="SUPPORT STAFF / OVERVIEW"
        title="Chào ca trực"
        description="Tổng quan yêu cầu hỗ trợ và các hồ sơ cần tra cứu."
      />
      <DemoBanner />
      <section className="support-stats">
        <article>
          <span>Đang chờ xử lý</span>
          <strong>08</strong>
          <small>3 ưu tiên cao</small>
        </article>
        <article>
          <span>Đang xử lý</span>
          <strong>05</strong>
          <small>2 hồ sơ gần quá hạn</small>
        </article>
        <article>
          <span>Đã giải quyết hôm nay</span>
          <strong>17</strong>
          <small>Thời gian xử lý TB 24 phút</small>
        </article>
        <article>
          <span>Vận đơn cần theo dõi</span>
          <strong>04</strong>
          <small>2 đơn cập nhật hôm nay</small>
        </article>
      </section>
      <section className="support-panel">
        <div className="support-panel-heading">
          <div>
            <p className="support-eyebrow">WORK QUEUE · DEMO</p>
            <h2>Yêu cầu đang chờ</h2>
          </div>
          <Link href="/support/orders">Tra cứu đơn hàng →</Link>
        </div>
        <CaseTable compact />
      </section>
      <section className="support-quick-links">
        <Link href="/support/orders">
          <span>▤</span>
          <strong>Tra cứu đơn</strong>
          <small>Tìm thông tin, xem chi tiết và lịch sử trạng thái</small>
          <b>→</b>
        </Link>
        <Link href="/support/users">
          <span>◎</span>
          <strong>Tra cứu người dùng</strong>
          <small>Xem hồ sơ Buyer/Seller và thông tin uy tín</small>
          <b>→</b>
        </Link>
        <Link href="/support/shipments">
          <span>⇢</span>
          <strong>Tra cứu vận đơn</strong>
          <small>Theo dõi hãng vận chuyển và cập nhật gần nhất</small>
          <b>→</b>
        </Link>
      </section>
    </>
  );
}
