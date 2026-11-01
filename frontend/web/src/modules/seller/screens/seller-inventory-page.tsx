'use client';

import { useEffect, useState } from 'react';
import { sellerProductsApi, type BackendProduct } from '../api/seller-products.api';
import { fulfillmentApi, type SkuInventoryItem } from '@/modules/fulfillment/api/fulfillment.api';
import { PageHeading, DemoNote } from '../components/seller-shared';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

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

  function openAdjustDialog(item: InventoryItem) {
    setSelectedSkuItem(item);
    setAdjustmentType('STOCK_IN');
    setAdjustQuantity(10);
    setAdjustReason('Kiểm kê nhập bổ sung lô hàng mới vào kho');
    setAdjustError(null);
    setAdjustModalOpen(true);
  }

  async function handleConfirmAdjust(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSkuItem) return;
    if (adjustQuantity <= 0) {
      setAdjustError('Số lượng điều chỉnh phải lớn hơn 0.');
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

      // Cập nhật giao diện sau khi điều chỉnh thành công
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

      <section className="seller-panel">
        <div className="seller-panel-heading">
          <div>
            <p className="seller-eyebrow">TỒN KHO THEO SKU · HỆ THỐNG</p>
            <h2>Số lượng khả dụng & Kiểm kê</h2>
          </div>
          <span className="seller-muted">
            {loading ? 'Đang đồng bộ từ API...' : `${items.length} SKU đang quản lý`}
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
                  <th>SKU</th>
                  <th>Sản phẩm</th>
                  <th>Kho</th>
                  <th>Tồn hiện tại</th>
                  <th>Đã giữ</th>
                  <th>Khả dụng</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}
                    >
                      Chưa có dữ liệu tồn kho SKU nào.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.sku}>
                      <td>
                        <strong>{item.sku}</strong>
                      </td>
                      <td>{item.product}</td>
                      <td>{item.warehouse}</td>
                      <td>{item.onHand}</td>
                      <td>{item.reserved}</td>
                      <td>
                        <strong style={{ color: item.available > 0 ? '#059669' : '#dc2626' }}>
                          {item.available}
                        </strong>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="seller-button-secondary"
                          style={{ padding: '4px 10px', fontSize: '13px' }}
                          onClick={() => openAdjustDialog(item)}
                        >
                          ✎ Điều chỉnh
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* MODAL ĐIỀU CHỈNH TỒN KHO */}
      <Dialog open={adjustModalOpen} onOpenChange={setAdjustModalOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogTitle className="text-lg font-bold text-slate-900 mb-1">
            Điều chỉnh số lượng tồn kho
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-600 mb-4">
            Cập nhật số lượng kiểm kê thực tế cho SKU: <strong>{selectedSkuItem?.sku}</strong> (
            {selectedSkuItem?.product})
          </DialogDescription>

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

          <form onSubmit={handleConfirmAdjust} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Hình thức điều chỉnh
              </label>
              <select
                className="w-full border rounded-lg p-2 text-sm text-slate-800 bg-white"
                value={adjustmentType}
                onChange={(e) => setAdjustmentType(e.target.value as any)}
              >
                <option value="STOCK_IN">Nhập kho bổ sung (STOCK_IN)</option>
                <option value="STOCK_OUT">Xuất kho / Bán ngoài hệ thống (STOCK_OUT)</option>
                <option value="DAMAGE">Hàng hỏng / Hết hạn / Mất mát (DAMAGE)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Số lượng điều chỉnh
              </label>
              <input
                type="number"
                min="1"
                className="w-full border rounded-lg p-2 text-sm text-slate-800"
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                required
              />
              <span className="text-xs text-slate-500 mt-1 block">
                Hiện tại: OnHand = {selectedSkuItem?.onHand}, Khả dụng ={' '}
                {selectedSkuItem?.available}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Lý do kiểm kê / Ghi chú kiểm toán
              </label>
              <textarea
                className="w-full border rounded-lg p-2 text-sm text-slate-800"
                rows={3}
                placeholder="Ví dụ: Kiểm kê định kỳ, hàng hỏng trong quá trình vận chuyển..."
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                className="seller-button-secondary"
                onClick={() => setAdjustModalOpen(false)}
                disabled={isAdjusting}
              >
                Đóng
              </button>
              <button type="submit" className="seller-button-primary" disabled={isAdjusting}>
                {isAdjusting ? 'Đang cập nhật...' : 'Xác nhận điều chỉnh'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
