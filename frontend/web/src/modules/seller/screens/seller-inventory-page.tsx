'use client';

import { useEffect, useState } from 'react';
import { sellerProductsApi, type BackendProduct } from '../api/seller-products.api';
import { inventory as mockInventory, PageHeading, DemoNote } from '../components/seller-shared';

type InventoryItem = {
  sku: string;
  product: string;
  warehouse: string;
  onHand: number;
  reserved: number;
  available: number;
};

export function SellerInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // API 2: GET /api/v1/products
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    sellerProductsApi
      .list(controller.signal)
      .then((products: BackendProduct[]) => {
        if (!controller.signal.aborted) {
          const mapped: InventoryItem[] = (products || []).map((p) => {
            const stock = p.stockQuantity ?? 0;
            return {
              sku: p.slug ? p.slug.slice(0, 16).toUpperCase() : `SKU-${p.id}`,
              product: p.title,
              warehouse: 'Kho mặc định (WH_001)',
              onHand: stock,
              reserved: 0,
              available: stock,
            };
          });
          setItems(mapped);
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
        eyebrow="KHÔNG GIAN NGƯỜI BÁN / TỒN KHO"
        title="Tồn kho"
        description="Tra cứu số lượng theo SKU và vị trí kho."
      />
      <DemoNote message="Số lượng tồn kho được trích xuất trực tiếp từ Catalog API (stockQuantity). Phân hệ Quản lý đa kho độc lập của Fulfillment Service đang chờ Backend hoàn thiện theo SRS 3.6.1." />

      <section className="seller-panel">
        <div className="seller-panel-heading">
          <div>
            <p className="seller-eyebrow">TỒN KHO THEO SKU · HỆ THỐNG</p>
            <h2>Số lượng khả dụng</h2>
          </div>
          <span className="seller-muted">
            {loading ? 'Đang đồng bộ từ API...' : `${items.length} SKU đang quản lý`}
          </span>
        </div>

        {loading && <p className="seller-loading">Đang tải dữ liệu tồn kho từ Product API...</p>}

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
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.sku}>
                    <td>
                      <strong>{item.sku}</strong>
                    </td>
                    <td>{item.product}</td>
                    <td>{item.warehouse}</td>
                    <td>{item.onHand}</td>
                    <td>{item.reserved}</td>
                    <td>
                      <strong>{item.available}</strong>
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
