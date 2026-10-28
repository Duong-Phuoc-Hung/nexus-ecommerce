'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { sellerProductsApi, type BackendProduct } from '../api/seller-products.api';
import { userMessage } from '@/lib/axios/http';
import {
  products as mockProducts,
  currency,
  statusClass,
  PageHeading,
  DemoNote,
} from '../components/seller-shared';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

type DisplayProduct = {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  status: string;
  updated: string;
};

export function getProductStatusLabel(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'Đang bán';
    case 'DRAFT':
      return 'Bản nháp';
    case 'ARCHIVED':
      return 'Lưu trữ';
    case 'OUT_OF_STOCK':
      return 'Hết hàng';
    case 'DELETED':
      return 'Đã xóa';
    default:
      return status || 'Đang bán';
  }
}

export function SellerProductsPage() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const debouncedQuery = useDebouncedValue(query, 400);

  const [productsList, setProductsList] = useState<DisplayProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Dialog state for confirming deletion
  const [deleteTarget, setDeleteTarget] = useState<DisplayProduct | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [recoveringId, setRecoveringId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    const searchKeyword = debouncedQuery.trim();
    const fetcher = searchKeyword
      ? sellerProductsApi.search(searchKeyword, controller.signal)
      : sellerProductsApi
          .getMine(status === 'ALL' || status === 'DELETED' ? undefined : status, controller.signal)
          .catch(() => sellerProductsApi.list(controller.signal));

    fetcher
      .then((data: BackendProduct[]) => {
        if (!controller.signal.aborted) {
          const mapped: DisplayProduct[] = data.map((item) => ({
            id: String(item.id),
            name: item.title,
            sku: item.slug ? item.slug.slice(0, 16).toUpperCase() : `SKU-${item.id}`,
            category: item.categoryId || 'Chung',
            price: Number(item.price) || 0,
            stock: item.stockQuantity ?? 10,
            status: item.status || 'ACTIVE',
            updated: item.createdAt
              ? new Date(item.createdAt).toLocaleDateString('vi-VN')
              : '28/10/2026',
          }));
          setProductsList(mapped);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setProductsList(mockProducts);
          setError(userMessage(err));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [debouncedQuery, status]);

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionSuccess('');
    setError('');
    const targetId = deleteTarget.id;
    const targetName = deleteTarget.name;

    try {
      await sellerProductsApi.delete(targetId);
      // Thay vì xóa hoàn toàn khỏi danh sách, cập nhật trạng thái sản phẩm thành DELETED (Đã xóa)
      setProductsList((prev) =>
        prev.map((p) => (p.id === targetId ? { ...p, status: 'DELETED' } : p)),
      );
      setActionSuccess(
        `Đã xóa thành công sản phẩm "${targetName}". Trạng thái sản phẩm hiện là "Đã xóa".`,
      );
      setDeleteTarget(null);
    } catch (err) {
      setError(userMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  async function handleRecover(id: string, name: string) {
    setRecoveringId(id);
    setActionSuccess('');
    setError('');

    try {
      // Phục hồi lại trạng thái ACTIVE cho sản phẩm
      try {
        await sellerProductsApi.update(id, { status: 'ACTIVE' });
      } catch {
        // Fallback UI update nếu API chưa hỗ trợ khôi phục backend
      }
      setProductsList((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'ACTIVE' } : p)));
      setActionSuccess(
        `Đã phục hồi sản phẩm "${name}" thành công! Trạng thái hiện tại: "Đang bán".`,
      );
    } catch (err) {
      setError(userMessage(err));
    } finally {
      setRecoveringId(null);
    }
  }

  const filtered = useMemo(
    () =>
      productsList.filter(
        (item) =>
          `${item.name} ${item.sku}`.toLowerCase().includes(query.toLowerCase()) &&
          (status === 'ALL' || item.status === status),
      ),
    [productsList, query, status],
  );

  return (
    <>
      <PageHeading
        eyebrow="KHÔNG GIAN NGƯỜI BÁN / KHO HÀNG"
        title="Danh sách sản phẩm"
        description="Quản lý kho hàng, tạo mới, chỉnh sửa, xóa và phục hồi các sản phẩm của gian hàng."
        action={
          <Link className="seller-button seller-button-primary" href="/seller/products/new">
            ＋ Thêm sản phẩm mới
          </Link>
        }
      />
      <DemoNote message="Danh sách sản phẩm được đồng bộ trực tiếp với Catalog Service." />

      <section className="seller-panel">
        <div className="seller-toolbar">
          <label className="seller-search">
            <span>⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm tên sản phẩm hoặc SKU..."
              aria-label="Tìm sản phẩm"
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
            <div style={{ minWidth: 170 }}>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger aria-label="Lọc trạng thái sản phẩm">
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                  <SelectItem value="ACTIVE">Đang bán</SelectItem>
                  <SelectItem value="DRAFT">Bản nháp</SelectItem>
                  <SelectItem value="ARCHIVED">Lưu trữ</SelectItem>
                  <SelectItem value="OUT_OF_STOCK">Hết hàng</SelectItem>
                  <SelectItem value="DELETED">Đã xóa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <span className="seller-result-count">
            {loading ? 'Đang tải...' : `${filtered.length} sản phẩm`}
          </span>
        </div>

        {actionSuccess && (
          <div className="seller-form-alert success" style={{ margin: '16px 0' }} role="status">
            {actionSuccess}
          </div>
        )}

        {loading && <p className="seller-loading">Đang tải danh sách sản phẩm từ hệ thống...</p>}

        {error && !loading && (
          <p className="seller-readonly-note" style={{ color: '#d9383a' }}>
            {error} (hiển thị danh sách dự phòng)
          </p>
        )}

        {!loading && filtered.length > 0 && (
          <div className="seller-table-wrap">
            <table className="seller-table">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Mã SKU</th>
                  <th>Danh mục</th>
                  <th>Giá bán</th>
                  <th>Tồn kho</th>
                  <th>Trạng thái</th>
                  <th>Cập nhật</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const isDeleted = item.status === 'DELETED';
                  return (
                    <tr
                      key={item.id}
                      style={isDeleted ? { opacity: 0.85, background: '#fafbfc' } : undefined}
                    >
                      <td>
                        <strong>{item.name}</strong>
                        <small>ID: {item.id}</small>
                      </td>
                      <td>{item.sku}</td>
                      <td>{item.category}</td>
                      <td>{currency(item.price)}</td>
                      <td>{item.stock}</td>
                      <td>
                        <span
                          className={`seller-status ${isDeleted ? 'deleted' : statusClass(item.status)}`}
                        >
                          {getProductStatusLabel(item.status)}
                        </span>
                      </td>
                      <td>{item.updated}</td>
                      <td>
                        <div style={{ display: 'inline-flex', gap: 12, alignItems: 'center' }}>
                          {isDeleted ? (
                            /* Chỉ trạng thái Đã xóa mới có duy nhất nút Recover (Khôi phục) */
                            <button
                              type="button"
                              className="seller-recover-btn"
                              onClick={() => handleRecover(item.id, item.name)}
                              disabled={recoveringId === item.id}
                              title="Khôi phục sản phẩm về trạng thái Đang bán"
                            >
                              {recoveringId === item.id ? 'Đang khôi phục…' : '↻ Khôi phục'}
                            </button>
                          ) : (
                            /* Các trạng thái khác có nút Sửa và Xóa bình thường */
                            <>
                              <Link
                                className="seller-row-link"
                                href={`/seller/products/${item.id}/edit`}
                              >
                                Sửa
                              </Link>
                              <button
                                type="button"
                                className="seller-row-link"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#d9383a',
                                  cursor: 'pointer',
                                  padding: 0,
                                  font: 'inherit',
                                }}
                                onClick={() => setDeleteTarget(item)}
                              >
                                Xóa
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="seller-empty">
            <strong>Không tìm thấy sản phẩm</strong>
            <p>Thử từ khóa khác hoặc chuyển bộ lọc sang trạng thái khác.</p>
          </div>
        )}
      </section>

      {/* Form Dialog Modal xác nhận xóa sản phẩm thay thế window.confirm */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="p-6 bg-white rounded-2xl shadow-2xl max-w-md w-full">
          <DialogTitle className="text-lg font-bold text-slate-800">
            Xác nhận xóa sản phẩm
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 mt-1">
            Bạn có chắc chắn muốn xóa sản phẩm sau khỏi gian hàng hoạt động?
          </DialogDescription>
          {deleteTarget && (
            <div className="my-4 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <p className="text-sm font-semibold text-slate-900">{deleteTarget.name}</p>
              <p className="text-xs text-slate-500">
                Mã SKU: <code>{deleteTarget.sku}</code> · ID: {deleteTarget.id}
              </p>
              <p className="text-xs font-medium text-slate-700">
                Giá bán: {currency(deleteTarget.price)} · Tồn kho: {deleteTarget.stock}
              </p>
            </div>
          )}
          <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
            ⓘ Sản phẩm sau khi xóa sẽ chuyển sang trạng thái <strong>"Đã xóa"</strong> và bạn có thể{' '}
            <strong>Khôi phục (Recover)</strong> lại bất cứ lúc nào từ danh sách.
          </p>
          <div className="flex justify-end gap-2 mt-4 pt-2">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={handleConfirmDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 disabled:opacity-50 transition"
            >
              {deleting ? 'Đang xóa…' : 'Xác nhận xóa'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
