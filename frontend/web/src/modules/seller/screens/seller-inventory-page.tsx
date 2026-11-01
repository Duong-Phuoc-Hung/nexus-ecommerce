'use client';

import { useEffect, useMemo, useState } from 'react';
import { sellerProductsApi, type BackendProduct } from '../api/seller-products.api';
import { fulfillmentApi, type SkuInventoryItem } from '@/modules/fulfillment/api/fulfillment.api';
import { PageHeading, DemoNote } from '../components/seller-shared';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type InventoryItem = {
  sku: string;
  product: string;
  warehouse: string;
  warehouseId?: string;
  onHand: number;
  reserved: number;
  available: number;
};

export function SellerInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // Bộ lọc tìm kiếm và Kho hàng
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('ALL');

  // Modal điều chỉnh tồn kho (SRS 3.6.1)
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedSkuItem, setSelectedSkuItem] = useState<InventoryItem | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'STOCK_IN' | 'STOCK_OUT' | 'DAMAGE'>(
    'STOCK_IN',
  );
  const [adjustQuantity, setAdjustQuantity] = useState<number>(10);
  const [adjustReason, setAdjustReason] = useState<string>(
    'Kiểm kê nhập bổ sung lô hàng mới vào kho',
  );
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  function handleCopySku(sku: string) {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(sku);
      showToast(`Đã sao chép mã SKU "${sku}"`);
    }
  }

  // Nạp dữ liệu tồn kho: Ưu tiên Fulfillment Inventory API (SRS 2.6, 3.6.1), fallback sang Catalog
  async function loadInventory(signal?: AbortSignal) {
    setLoading(true);
    try {
      // 1. Thử gọi Fulfillment Service Inventory API
      const invData = await fulfillmentApi.listInventory({}, signal);
      if (invData && invData.length > 0) {
        const mapped: InventoryItem[] = invData.map((inv) => ({
          sku: inv.sku,
          product: inv.productName,
          warehouse: inv.warehouseName || 'Kho Tổng (WH_001)',
          warehouseId: inv.warehouseId || 'WH_001',
          onHand: inv.onHand,
          reserved: inv.reserved,
          available: inv.available,
        }));
        setItems(mapped);
        return;
      }
    } catch {
      // Tiếp tục fallback bên dưới nếu fulfillment chưa có dữ liệu
    }

    // 2. Fallback sang Catalog Products API
    try {
      const products = await sellerProductsApi.list(signal);
      const mapped: InventoryItem[] = (products || []).map((p) => {
        const stock = p.stockQuantity ?? 0;
        return {
          sku: p.slug ? p.slug.slice(0, 16).toUpperCase() : `SKU-${p.id}`,
          product: p.title,
          warehouse: 'Kho mặc định (WH_001)',
          warehouseId: 'WH_001',
          onHand: stock,
          reserved: 0,
          available: stock,
        };
      });
      setItems(mapped);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    loadInventory(controller.signal);
    return () => controller.abort();
  }, []);

  // Danh sách kho duy nhất để tạo filter dropdown
  const warehouses = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((it) => {
      const id = it.warehouseId || 'WH_001';
      const name = it.warehouse || 'Kho mặc định';
      if (!map.has(id)) map.set(id, name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [items]);

  // Lọc dữ liệu theo Search Query và Warehouse
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        !searchQuery.trim() ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.product.toLowerCase().includes(searchQuery.toLowerCase());
      const matchWarehouse = selectedWarehouse === 'ALL' || item.warehouseId === selectedWarehouse;
      return matchSearch && matchWarehouse;
    });
  }, [items, searchQuery, selectedWarehouse]);

  function openAdjustDialog(item: InventoryItem) {
    setSelectedSkuItem(item);
    setAdjustmentType('STOCK_IN');
    setAdjustQuantity(10);
    setAdjustReason('Kiểm kê nhập bổ sung lô hàng mới vào kho');
    setAdjustError(null);
    setAdjustModalOpen(true);
  }

  // Quy tắc chống bán âm (ALLOW_OVERSELL: false - SRS 3.6.1)
  const isOverselling = useMemo(() => {
    if (!selectedSkuItem) return false;
    if (adjustmentType === 'STOCK_OUT' || adjustmentType === 'DAMAGE') {
      return adjustQuantity > selectedSkuItem.available;
    }
    return false;
  }, [selectedSkuItem, adjustmentType, adjustQuantity]);

  async function handleConfirmAdjust(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSkuItem || isAdjusting) return;
    if (adjustQuantity <= 0) {
      setAdjustError('Số lượng điều chỉnh phải lớn hơn 0.');
      return;
    }
    if (isOverselling) {
      setAdjustError(
        `Không thể xuất vượt quá số lượng khả dụng (${selectedSkuItem.available}) - Chính sách chống bán âm (ALLOW_OVERSELL: false).`,
      );
      return;
    }
    if (!adjustReason.trim()) {
      setAdjustError('Vui lòng nhập lý do điều chỉnh.');
      return;
    }

    setIsAdjusting(true);
    setAdjustError(null);

    try {
      const result = await fulfillmentApi.adjustInventory({
        sku: selectedSkuItem.sku,
        warehouseId: selectedSkuItem.warehouseId || 'WH_001',
        adjustmentType,
        quantity: adjustQuantity,
        reason: adjustReason.trim(),
      });

      // CHỈ CẬP NHẬT GIAO DIỆN KHI API THÀNH CÔNG:
      setItems((prev) =>
        prev.map((item) =>
          item.sku === selectedSkuItem.sku
            ? {
                ...item,
                onHand: result.onHand,
                reserved: result.reserved,
                available: result.available,
              }
            : item,
        ),
      );

      setAdjustModalOpen(false);
      const typeLabel =
        adjustmentType === 'STOCK_IN'
          ? 'Nhập kho'
          : adjustmentType === 'STOCK_OUT'
            ? 'Xuất kho'
            : 'Ghi nhận hư hỏng';
      showToast(`Đã ${typeLabel.toLowerCase()} thành công cho SKU "${selectedSkuItem.sku}".`);
    } catch (err: any) {
      // Bắt lỗi không nuốt lỗi:
      setAdjustError(err.message || 'Không thể điều chỉnh tồn kho. Vui lòng kiểm tra lại.');
    } finally {
      setIsAdjusting(false);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="KHÔNG GIAN NGƯỜI BÁN / TỒN KHO"
        title="Quản lý tồn kho"
        description="Tra cứu số lượng theo SKU, vị trí kho và điều chỉnh kiểm kê theo thời gian thực."
      />
      <DemoNote message="Dữ liệu tồn kho được kết nối trực tiếp với Fulfillment Inventory API & Sổ cái kiểm toán (SRS 3.6.1). Hệ thống tự động tính toán Khả dụng = Tồn hiện tại - Đã giữ và áp dụng chính sách chống bán âm (ALLOW_OVERSELL: false)." />

      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: '#10b981',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '8px',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 9999,
          }}
        >
          ✓ {toast}
        </div>
      )}

      {/* THANH TÌM KIẾM & BỘ LỌC */}
      <section className="seller-panel" style={{ marginBottom: '16px', padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1', minWidth: '240px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#64748b',
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
            >
              Tìm kiếm SKU hoặc Sản phẩm
            </label>
            <input
              type="text"
              placeholder="Nhập mã SKU hoặc tên sản phẩm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 text-sm text-slate-800 outline-none focus:outline-none focus:border-sky-400 focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:border-sky-400 transition-colors"
            />
          </div>

          <div style={{ minWidth: '220px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#64748b',
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
            >
              Lọc theo Kho hàng
            </label>
            <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
              <SelectTrigger
                aria-label="Lọc theo kho hàng"
                className="w-full min-h-[38px] border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white outline-none focus:border-sky-400 focus:ring-0 focus-visible:ring-0 focus-visible:border-sky-400 transition-colors"
              >
                <SelectValue placeholder="Tất cả các kho" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả các kho</SelectItem>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name} ({w.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* BẢNG TỒN KHO */}
      <section className="seller-panel">
        <div className="seller-panel-heading">
          <div>
            <p className="seller-eyebrow">TỒN KHO THEO SKU · HỆ THỐNG</p>
            <h2>Số lượng khả dụng & Kiểm kê</h2>
          </div>
          <span className="seller-muted">
            {loading ? 'Đang đồng bộ từ API...' : `${filteredItems.length} / ${items.length} SKU`}
          </span>
        </div>

        {loading && (
          <p className="seller-loading">Đang tải dữ liệu tồn kho từ Fulfillment API...</p>
        )}

        {!loading && (
          <div className="seller-table-wrap">
            <table className="seller-table">
              <thead>
                <tr>
                  <th>Mã SKU</th>
                  <th>Sản phẩm</th>
                  <th>Kho hàng</th>
                  <th style={{ textAlign: 'right' }}>Tồn thực tế</th>
                  <th style={{ textAlign: 'right' }}>Đang giữ</th>
                  <th style={{ textAlign: 'right' }}>Khả dụng bán</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      style={{ textAlign: 'center', padding: '36px', color: '#6b7280' }}
                    >
                      Không tìm thấy SKU tồn kho nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isOutOfStock = item.available <= 0;
                    const isLowStock = item.available > 0 && item.available <= 10;
                    return (
                      <tr key={item.sku}>
                        <td>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <strong style={{ fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                              {item.sku}
                            </strong>
                            <button
                              type="button"
                              onClick={() => handleCopySku(item.sku)}
                              title="Sao chép SKU"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '12px',
                                opacity: 0.6,
                                padding: '2px',
                              }}
                            >
                              📋
                            </button>
                          </div>
                        </td>
                        <td>{item.product}</td>
                        <td>
                          <div>
                            <span>{item.warehouse}</span>
                            {item.warehouseId && (
                              <span
                                style={{
                                  display: 'inline-block',
                                  marginLeft: '6px',
                                  fontSize: '0.7rem',
                                  background: '#f1f5f9',
                                  color: '#475569',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                }}
                              >
                                {item.warehouseId}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{item.onHand}</td>
                        <td style={{ textAlign: 'right', color: '#64748b' }}>{item.reserved}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              justifyContent: 'flex-end',
                            }}
                          >
                            <strong
                              style={{
                                color: isOutOfStock
                                  ? '#dc2626'
                                  : isLowStock
                                    ? '#d97706'
                                    : '#059669',
                                fontSize: '0.95rem',
                              }}
                            >
                              {item.available}
                            </strong>
                            {isOutOfStock ? (
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  background: '#fef2f2',
                                  color: '#b91c1c',
                                  border: '1px solid #fecaca',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 600,
                                }}
                              >
                                Hết hàng
                              </span>
                            ) : isLowStock ? (
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  background: '#fffbeb',
                                  color: '#b45309',
                                  border: '1px solid #fde68a',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 600,
                                }}
                              >
                                Sắp hết
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="seller-button-secondary"
                            style={{ padding: '5px 12px', fontSize: '13px' }}
                            onClick={() => openAdjustDialog(item)}
                          >
                            ✎ Điều chỉnh
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* MODAL ĐIỀU CHỈNH TỒN KHO (SRS 3.6.1) */}
      <Dialog
        open={adjustModalOpen}
        onOpenChange={(open) => !isAdjusting && setAdjustModalOpen(open)}
      >
        <DialogContent className="max-w-md p-6">
          <DialogTitle className="text-lg font-bold text-slate-900 mb-1">
            Điều chỉnh số lượng tồn kho
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-600 mb-3">
            Cập nhật kiểm kê thực tế cho SKU: <strong>{selectedSkuItem?.sku}</strong> (
            {selectedSkuItem?.product})
          </DialogDescription>

          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '10px 14px',
              borderRadius: '8px',
              marginBottom: '14px',
              fontSize: '0.8rem',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span className="text-slate-500 block">Tồn hiện tại (OnHand):</span>
              <strong className="text-slate-800 text-sm">{selectedSkuItem?.onHand}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Đang giữ (Reserved):</span>
              <strong className="text-slate-800 text-sm">{selectedSkuItem?.reserved}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Khả dụng (Available):</span>
              <strong className="text-emerald-700 text-sm">{selectedSkuItem?.available}</strong>
            </div>
          </div>

          {adjustError && (
            <div
              style={{
                background: '#fef2f2',
                color: '#b91c1c',
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                marginBottom: '14px',
                border: '1px solid #fecaca',
              }}
            >
              ⚠ {adjustError}
            </div>
          )}

          {isOverselling && (
            <div
              style={{
                background: '#fffbeb',
                color: '#b45309',
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                marginBottom: '14px',
                border: '1px solid #fde68a',
              }}
            >
              ⚠ Số lượng xuất kho ({adjustQuantity}) vượt quá khả dụng hiện tại (
              {selectedSkuItem?.available}). Hệ thống chặn xuất âm theo chính sách chống bán âm
              (ALLOW_OVERSELL: false).
            </div>
          )}

          <form onSubmit={handleConfirmAdjust} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Hình thức điều chỉnh
              </label>
              <Select
                value={adjustmentType}
                onValueChange={(val) => setAdjustmentType(val as any)}
                disabled={isAdjusting}
              >
                <SelectTrigger
                  aria-label="Hình thức điều chỉnh"
                  className="w-full min-h-[38px] border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white outline-none focus:border-sky-400 focus:ring-0 focus-visible:ring-0 focus-visible:border-sky-400 transition-colors"
                >
                  <SelectValue placeholder="Chọn hình thức điều chỉnh" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STOCK_IN">Nhập kho bổ sung (STOCK_IN)</SelectItem>
                  <SelectItem value="STOCK_OUT">Xuất kho / Bán ngoài sàn (STOCK_OUT)</SelectItem>
                  <SelectItem value="DAMAGE">Hàng hỏng / Hết hạn / Mất mát (DAMAGE)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Số lượng điều chỉnh
              </label>
              <input
                type="number"
                min="1"
                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm text-slate-800 bg-white outline-none focus:outline-none focus:border-sky-400 focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:border-sky-400 transition-colors"
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                disabled={isAdjusting}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Lý do kiểm kê / Ghi chú kiểm toán
              </label>
              <textarea
                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm text-slate-800 bg-white outline-none focus:outline-none focus:border-sky-400 focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:border-sky-400 transition-colors resize-none"
                rows={3}
                placeholder="Ví dụ: Kiểm kê định kỳ, hàng hỏng trong quá trình vận chuyển..."
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                disabled={isAdjusting}
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAdjustModalOpen(false)}
                disabled={isAdjusting}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={isAdjusting || isOverselling}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isAdjusting ? (
                  <>
                    <span className="inline-block animate-spin">⟳</span>
                    <span>Đang cập nhật...</span>
                  </>
                ) : (
                  'Xác nhận điều chỉnh'
                )}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
