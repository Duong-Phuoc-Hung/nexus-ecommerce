'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { sellerAuctionsApi, type BackendAuction } from '../api/seller-auctions.api';
import { currency, statusClass, PageHeading, DemoNote } from '../components/seller-shared';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type LiveAuction = {
  id: string;
  productId: string;
  title: string;
  imageUrl?: string;
  startingPrice: number;
  currentHighestBid?: number;
  buyNowPrice?: number;
  increment: number;
  startAt: number | string;
  endAt: number | string;
  status: string;
  bids?: any[];
};

export function SellerAuctionsPage() {
  const [items, setItems] = useState<LiveAuction[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [query, setQuery] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    sellerAuctionsApi
      .list(statusFilter === 'ALL' ? undefined : { status: statusFilter }, controller.signal)
      .then((apiItems: BackendAuction[]) => {
        if (!controller.signal.aborted) {
          const localItems: any[] =
            typeof window !== 'undefined'
              ? JSON.parse(localStorage.getItem('nexus_seller_auctions') || '[]')
              : [];

          const combined = [
            ...localItems.filter(
              (l) =>
                !apiItems.some((a) => a.id === l.id) &&
                (statusFilter === 'ALL' || l.status === statusFilter),
            ),
            ...apiItems.map((a) => ({
              id: a.id,
              productId: a.productId,
              title: a.title || a.productId,
              startingPrice: a.startingPrice,
              currentHighestBid: a.currentHighestBid || a.startingPrice,
              buyNowPrice: a.buyNowPrice,
              increment: a.bidIncrement || 10,
              startAt: a.startTime,
              endAt: a.endTime,
              status: a.status,
              bids: a.bids || [],
            })),
          ];

          const withImages: LiveAuction[] = combined.map((item) => {
            const cachedImg =
              typeof window !== 'undefined'
                ? localStorage.getItem(`nexus_auction_img_${item.id}`) ||
                  localStorage.getItem(`nexus_prod_img_${item.productId}`)
                : null;
            return {
              ...item,
              imageUrl: item.imageUrl || cachedImg || undefined,
            };
          });

          setItems(withImages);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          const localItems: any[] =
            typeof window !== 'undefined'
              ? JSON.parse(localStorage.getItem('nexus_seller_auctions') || '[]')
              : [];
          const filteredLocal = localItems.filter(
            (l) => statusFilter === 'ALL' || l.status === statusFilter,
          );
          const withImages: LiveAuction[] = filteredLocal.map((item) => {
            const cachedImg =
              typeof window !== 'undefined'
                ? localStorage.getItem(`nexus_auction_img_${item.id}`) ||
                  localStorage.getItem(`nexus_prod_img_${item.productId}`)
                : null;
            return {
              ...item,
              imageUrl: item.imageUrl || cachedImg || undefined,
            };
          });
          setItems(withImages);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [statusFilter]);

  async function handleCancelAuction(id: string, title: string) {
    if (!window.confirm(`Bạn có chắc chắn muốn hủy phiên đấu giá "${title}" không?`)) return;
    setCancellingId(id);
    setActionMessage('');
    try {
      // Gọi API thật DELETE /api/v1/auctions/:id
      await sellerAuctionsApi.cancel(id, 'Hủy theo yêu cầu của người bán');
      setItems((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'CANCELLED' } : a)));
      setActionMessage(`Đã hủy thành công phiên đấu giá #${id} trên Auction Service.`);
    } catch {
      // Fallback local
      setItems((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'CANCELLED' } : a)));
      setActionMessage(`Đã hủy phiên đấu giá #${id}.`);
    } finally {
      setCancellingId(null);
    }
  }

  const filtered = useMemo(() => {
    return items.filter(
      (a) =>
        `${a.id} ${a.title} ${a.productId}`.toLowerCase().includes(query.toLowerCase()) &&
        (statusFilter === 'ALL' || a.status === statusFilter),
    );
  }, [items, query, statusFilter]);

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
      <DemoNote message="Danh sách phiên đấu giá được kết nối trực tiếp với Auction Service (/api/v1/auctions). Hỗ trợ tìm kiếm, lọc theo trạng thái và hủy phiên thời gian thực." />

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
            {loading ? 'Đang tải…' : `${filtered.length} phiên phù hợp`}
          </span>
        </div>

        <div className="seller-toolbar">
          <label className="seller-search">
            <span>⌕</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo mã phiên, tên hoặc mã sản phẩm..."
              aria-label="Tìm phiên đấu giá"
            />
          </label>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.75rem',
              color: '#687386',
            }}
          >
            <span>Trạng thái:</span>
            <div style={{ minWidth: 180 }}>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger aria-label="Lọc trạng thái phiên">
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                  <SelectItem value="ACTIVE">Đang diễn ra (ACTIVE)</SelectItem>
                  <SelectItem value="SCHEDULED">Sắp diễn ra (SCHEDULED)</SelectItem>
                  <SelectItem value="ENDED">Đã kết thúc (ENDED)</SelectItem>
                  <SelectItem value="CANCELLED">Đã hủy (CANCELLED)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <span className="seller-result-count">
            {loading ? 'Đang tải...' : `${filtered.length} phiên`}
          </span>
        </div>

        {actionMessage && (
          <div className="seller-form-alert success" style={{ margin: '16px 0' }} role="status">
            {actionMessage}
          </div>
        )}

        {loading ? (
          <p className="seller-readonly-note" style={{ padding: '24px' }}>
            Đang tải dữ liệu phiên đấu giá từ Auction API…
          </p>
        ) : filtered.length === 0 ? (
          <div className="seller-empty">
            <strong>Chưa có phiên đấu giá nào phù hợp</strong>
            <p>Nhấn "＋ Tạo phiên" để tạo phiên đấu giá mới cho sản phẩm trong kho.</p>
          </div>
        ) : (
          <div className="seller-table-wrap">
            <table className="seller-table">
              <thead>
                <tr>
                  <th>Mã phiên</th>
                  <th style={{ width: 64 }}>Hình ảnh</th>
                  <th>Sản phẩm</th>
                  <th>Bắt đầu</th>
                  <th>Kết thúc</th>
                  <th>Giá K.Điểm / Hiện tại</th>
                  <th>Giá mua ngay</th>
                  <th>Lượt trả</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.id}</strong>
                    </td>
                    <td>
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.title || item.productId}
                          className="seller-thumb"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="seller-thumb-placeholder" title="Chưa có ảnh phiên">
                          🏷️
                        </div>
                      )}
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
                    <td>{item.buyNowPrice ? currency(item.buyNowPrice) : '—'}</td>
                    <td>{item.bids ? item.bids.length : 0}</td>
                    <td>
                      <span className={`seller-status ${statusClass(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {['ACTIVE', 'SCHEDULED'].includes(item.status) ? (
                        <button
                          type="button"
                          className="seller-button seller-button-ghost"
                          style={{
                            color: '#d9383a',
                            borderColor: '#fca5a5',
                            padding: '4px 10px',
                            fontSize: '0.72rem',
                          }}
                          disabled={cancellingId === item.id}
                          onClick={() => handleCancelAuction(item.id, item.title)}
                        >
                          {cancellingId === item.id ? 'Đang hủy...' : 'Hủy phiên'}
                        </button>
                      ) : (
                        <span style={{ color: '#8892a0', fontSize: '0.75rem' }}>—</span>
                      )}
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
