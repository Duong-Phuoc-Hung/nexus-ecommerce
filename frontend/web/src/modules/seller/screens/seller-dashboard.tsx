'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ordersApi, type OrderListItem } from '@/modules/commerce/api/orders.api';
import { sellerProductsApi } from '../api/seller-products.api';
import { sellerAuctionsApi } from '../api/seller-auctions.api';
import { userMessage } from '@/lib/axios/http';
import { useSession } from '@/modules/auth/hooks/use-session';
import { PageHeading, DemoNote, MetricCard, OrdersTable } from '../components/seller-shared';

export function SellerDashboard() {
  const { user } = useSession();
  const [ordersData, setOrdersData] = useState<OrderListItem[]>([]);
  const [ordersError, setOrdersError] = useState('');
  const [productsCount, setProductsCount] = useState<number>(0);
  const [auctionsTotal, setAuctionsTotal] = useState<number>(0);
  const [auctionsActive, setAuctionsActive] = useState<number>(0);

  const reputationScore = (user as any)?.reputationScore ?? 100;

  useEffect(() => {
    const controller = new AbortController();

    // 1. Tải danh sách sản phẩm từ Catalog API
    sellerProductsApi
      .list(controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) {
          setProductsCount(items.length);
        }
      })
      .catch(() => {
        // Giữ 0 nếu chưa có sản phẩm hoặc lỗi mạng
      });

    // 2. Tải danh sách phiên đấu giá từ Auction API
    sellerAuctionsApi
      .list(user?.id ? { sellerId: user.id } : undefined, controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) {
          setAuctionsTotal(items.length);
          setAuctionsActive(items.filter((a) => a.status === 'ACTIVE').length);
        }
      })
      .catch(() => {
        // Giữ 0 nếu lỗi mạng
      });

    // 3. Tải đơn hàng từ Commerce API
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
        eyebrow="KHÔNG GIAN NGƯỜI BÁN / TỔNG QUAN"
        title="Chào mừng trở lại"
        description="Theo dõi cửa hàng và các hoạt động bán hàng gần đây."
      />
      <DemoNote message="Số lượng sản phẩm, phiên đấu giá và đơn hàng được đồng bộ thời gian thực từ Backend Services." />
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
        <MetricCard
          label="Phiên đấu giá"
          value={String(auctionsTotal).padStart(2, '0')}
          change={`${auctionsActive} phiên đang diễn ra`}
          icon="◷"
        />
        <MetricCard
          label="Điểm uy tín"
          value={`${reputationScore} / 100`}
          change={reputationScore >= 80 ? 'Mức uy tín tốt' : 'Cần cải thiện'}
          icon="✦"
        />
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
        {ordersError ? (
          <p className="seller-readonly-note">{ordersError}</p>
        ) : (
          <OrdersTable compact items={ordersData} />
        )}
      </section>
    </>
  );
}
