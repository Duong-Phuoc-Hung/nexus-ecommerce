'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ordersApi, type OrderListItem } from '@/modules/commerce/api/orders.api';
import { sellerProductsApi } from '../api/seller-products.api';
import { userMessage } from '@/lib/axios/http';
import { useSession } from '@/modules/auth/hooks/use-session';
import {
  products as mockProducts,
  PageHeading,
  DemoNote,
  MetricCard,
  OrdersTable,
} from '../components/seller-shared';

export function SellerDashboard() {
  const { user } = useSession();
  const [ordersData, setOrdersData] = useState<OrderListItem[]>([]);
  const [ordersError, setOrdersError] = useState('');
  const [productsCount, setProductsCount] = useState<number>(mockProducts.length);

  useEffect(() => {
    const controller = new AbortController();

    // 1. Tải danh sách sản phẩm từ Catalog API
    sellerProductsApi
      .list(controller.signal)
      .then((items) => {
        if (!controller.signal.aborted && items.length > 0) {
          setProductsCount(items.length);
        }
      })
      .catch(() => {
        // Fallback giữ nguyên mockProducts.length
      });

    // 2. Tải đơn hàng từ Commerce API
    if (user?.id) {
      ordersApi
        .list({ sellerId: user.id, limit: 50 }, controller.signal)
        .then((page) => {
          if (!controller.signal.aborted) {
            setOrdersData(page.items);
          }
        })
        .catch((err) => !controller.signal.aborted && setOrdersError(userMessage(err)));
    }

    return () => controller.abort();
  }, [user?.id]);

  return (
    <>
      <PageHeading
        eyebrow="SELLER CENTER / OVERVIEW"
        title="Chào mừng trở lại"
        description="Theo dõi cửa hàng và các hoạt động bán hàng gần đây."
      />
      <DemoNote message="Số lượng sản phẩm và danh sách đơn hàng được đồng bộ trực tiếp từ Catalog & Commerce API." />
      <section className="seller-metrics-grid" aria-label="Chỉ số hoạt động">
        <MetricCard
          label="Sản phẩm đang bán"
          value={String(productsCount)}
          change="Dữ liệu từ Catalog API"
          icon="▦"
        />
        <MetricCard
          label="Đơn hàng gần đây"
          value={String(ordersData.length)}
          change="Dữ liệu từ Commerce API"
          icon="▤"
        />
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
        {ordersError ? (
          <p className="seller-readonly-note">{ordersError}</p>
        ) : (
          <OrdersTable compact items={ordersData} />
        )}
      </section>
    </>
  );
}
