'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Plus, Search, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AdminSelect } from './admin-select';
import { requestApi } from '@/lib/axios/api-client';
import { unwrap, userMessage } from '@/lib/axios/http';
import {
  normalizeProduct,
  formatPrice,
  type CatalogProduct,
} from '@/modules/catalog/api/catalog.factory';
export function AdminProducts() {
  const [items, setItems] = useState<CatalogProduct[]>([]),
    [q, setQ] = useState(''),
    [search, setSearch] = useState(''),
    [status, setStatus] = useState(''),
    [page, setPage] = useState(1),
    [total, setTotal] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [revision, setRevision] = useState(0),
    [selected, setSelected] = useState<CatalogProduct | null>(null),
    [busy, setBusy] = useState(false),
    [deleteError, setDeleteError] = useState('');
  useEffect(() => {
    const c = new AbortController();
    setLoading(true);
    setError('');
    requestApi('/products', { signal: c.signal })
      .then((raw) => {
        if (c.signal.aborted) return;
        const data = unwrap<unknown>(raw);
        if (!Array.isArray(data)) throw new Error('Danh sách sản phẩm chưa đúng định dạng.');
        const filtered = data
          .map(normalizeProduct)
          .filter(
            (p) =>
              (!status || p.status === status) &&
              (!search ||
                [p.id, p.title, p.sellerName]
                  .join(' ')
                  .toLocaleLowerCase('vi')
                  .includes(search.toLocaleLowerCase('vi'))),
          );
        setTotal(filtered.length);
        setItems(filtered.slice((page - 1) * 12, page * 12));
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(userMessage(e));
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [page, search, status, revision]);
  async function remove() {
    if (!selected || busy) return;
    setBusy(true);
    setDeleteError('');
    try {
      await requestApi('/products/' + encodeURIComponent(selected.id), { method: 'DELETE' });
      setSelected(null);
      setPage(1);
      setRevision((v) => v + 1);
    } catch (e) {
      setDeleteError(userMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="admin-kicker">VẬN HÀNH DANH MỤC</p>
          <h1 className="mt-2">Sản phẩm trên sàn</h1>
          <p className="mt-2 text-sm text-slate-600">
            Tra cứu, cập nhật nội dung và quản lý sản phẩm của Seller.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/products/new">
            <Plus size={16} />
            Tạo sản phẩm
          </Link>
        </Button>
      </header>
      <p className="rounded-xl bg-slate-100 p-4 text-sm text-slate-600">
        Tìm kiếm và phân trang trong danh sách đã tải, tối đa 50 sản phẩm. Phạm vi toàn sàn đang
        được hoàn thiện.
      </p>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(q.trim());
            setPage(1);
          }}
          className="flex flex-wrap items-end gap-3 border-b border-slate-200 p-5"
        >
          <label className="min-w-48 flex-1 space-y-2 text-sm">
            Tìm sản phẩm
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tên sản phẩm…" />
          </label>
          <label className="min-w-44 space-y-2 text-sm">
            Trạng thái
            <AdminSelect
              id="admin-product-status"
              value={status}
              placeholder="Tất cả"
              options={['ACTIVE', 'DRAFT', 'INACTIVE'].map((value) => ({ value, label: value }))}
              onValueChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
            />
          </label>
          <Button variant="outline">
            <Search size={16} />
            Tìm kiếm
          </Button>
        </form>
        {error ? (
          <div role="alert" className="p-8">
            <p>{error}</p>
            <Button className="mt-4" variant="outline" onClick={() => setRevision((v) => v + 1)}>
              Thử lại
            </Button>
          </div>
        ) : loading ? (
          <p role="status" className="p-8">
            Đang tải sản phẩm…
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {['Sản phẩm', 'Giá', 'Seller', 'Trạng thái', 'Thao tác'].map((x) => (
                    <th key={x} className="px-5 py-4 font-medium text-slate-600">
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="max-w-xs px-5 py-4">
                      <strong>{p.title}</strong>
                      <p className="mt-1 text-xs text-slate-500">#{p.id}</p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">{formatPrice(p)}</td>
                    <td className="px-5 py-4">{p.sellerName || p.sellerId}</td>
                    <td className="px-5 py-4">
                      <span className="admin-neutral-badge">{p.status}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={'/admin/products/' + encodeURIComponent(p.id) + '/edit'}>
                            Chỉnh sửa
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={'Xóa ' + p.title}
                          onClick={() => {
                            setSelected(p);
                            setDeleteError('');
                          }}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!items.length && (
              <p className="p-12 text-center text-slate-500">Không tìm thấy sản phẩm phù hợp.</p>
            )}
          </div>
        )}
        <footer className="flex items-center justify-between border-t border-slate-200 p-4 text-sm">
          <span>
            {total} sản phẩm · Trang {page}
          </span>
          <div className="flex gap-2">
            <Button
              size="icon"
              aria-label="Trang trước"
              variant="outline"
              disabled={page === 1 || loading}
              onClick={() => setPage((v) => v - 1)}
            >
              <ChevronLeft size={16} />
            </Button>
            <Button
              size="icon"
              aria-label="Trang sau"
              variant="outline"
              disabled={page * 12 >= total || loading}
              onClick={() => setPage((v) => v + 1)}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </footer>
      </section>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open && !busy) setSelected(null);
        }}
      >
        <DialogContent className="admin-dialog">
          <DialogTitle>Xác nhận xóa sản phẩm</DialogTitle>
          <DialogDescription>
            Sản phẩm “{selected?.title}” sẽ được gửi yêu cầu xóa. Hãy kiểm tra đúng sản phẩm trước
            khi tiếp tục.
          </DialogDescription>
          {deleteError && (
            <p role="alert" className="text-sm text-red-700">
              {deleteError}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={busy} onClick={() => setSelected(null)}>
              Giữ lại
            </Button>
            <Button className="admin-danger" disabled={busy} onClick={() => void remove()}>
              {busy ? 'Đang xử lý…' : 'Xóa sản phẩm'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
