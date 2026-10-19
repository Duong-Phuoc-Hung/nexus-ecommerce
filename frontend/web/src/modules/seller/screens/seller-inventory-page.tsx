'use client';
import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { inventory, PageHeading, DemoNote } from '../components/seller-shared';
export function SellerInventoryPage() {
  return (
    <>
      <PageHeading
        eyebrow="SELLER CENTER / INVENTORY"
        title="Tồn kho"
        description="Tra cứu số lượng theo SKU và vị trí kho."
      />
      <DemoNote />
      <section className="seller-panel">
        <div className="seller-panel-heading">
          <div>
            <p className="seller-eyebrow">SKU INVENTORY</p>
            <h2>Số lượng khả dụng</h2>
          </div>
          <span className="seller-muted">Chế độ chỉ đọc</span>
        </div>
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
              {inventory.map((item) => (
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
      </section>
      <p className="seller-readonly-note">
        Dữ liệu tồn kho minh họa, chưa kết nối Fulfillment API.
      </p>
    </>
  );
}
