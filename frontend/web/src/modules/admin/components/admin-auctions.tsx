'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Gavel, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AdminSelect } from './admin-select';
import { userMessage } from '../../../lib/axios/http';
import {
  adminAuctionsApi,
  type AdminAuction,
  type AdminAuctionStatus,
} from '../api/admin-auctions.api';

const labels: Record<AdminAuctionStatus, string> = {
  UPCOMING: 'Sắp diễn ra',
  ACTIVE: 'Đang diễn ra',
  EXTENDED: 'Đang diễn ra',
  ENDED: 'Đã kết thúc',
  CANCELLED: 'Đã hủy',
};
const money = (value: number | null) =>
  value === null ? 'Chưa có giá' : `${value.toLocaleString('vi-VN')} ₫`;

export function AdminAuctions() {
  const [rows, setRows] = useState<AdminAuction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const result = await adminAuctionsApi.list(signal);
      if (!signal?.aborted) {
        setRows(result);
        setError('');
      }
    } catch (err) {
      if (!signal?.aborted) setError(userMessage(err));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void load(controller.signal);
    return () => controller.abort();
  }, [load, revision]);

  const visible = useMemo(
    () =>
      rows.filter(
        (row) =>
          (status === 'all' ||
            row.status === status ||
            (status === 'ACTIVE' && row.status === 'EXTENDED')) &&
          `${row.id} ${row.productId}`
            .toLocaleLowerCase('vi')
            .includes(q.trim().toLocaleLowerCase('vi')),
      ),
    [q, rows, status],
  );
  const pageSize = 8;
  const pages = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, pages);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-3 text-xs font-bold tracking-[.2em] text-brand-dark">
            AUCTION MANAGEMENT
          </p>
          <h1 className="text-3xl font-bold">Quản lý phiên đấu</h1>
        </div>
      </div>

      <div className="my-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(['UPCOMING', 'ACTIVE', 'ENDED', 'CANCELLED'] as const).map((key) => (
          <div key={key} className="rounded-2xl border border-line bg-white p-5">
            <p className="text-sm text-muted">{labels[key]}</p>
            <p className="mt-2 text-3xl font-bold">
              {
                rows.filter(
                  (row) => row.status === key || (key === 'ACTIVE' && row.status === 'EXTENDED'),
                ).length
              }
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-line bg-white p-5 sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row">
          <label className="flex flex-1 items-center gap-2">
            <Search size={18} />
            <span className="sr-only">Tìm phiên đấu</span>
            <Input
              placeholder="Tìm mã phiên hoặc mã sản phẩm…"
              value={q}
              onChange={(event) => {
                setQ(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <div className="sm:w-56">
            <AdminSelect
              id="auction-status"
              value={status}
              onValueChange={(value) => {
                setStatus(value || 'all');
                setPage(1);
              }}
              options={[
                { value: 'all', label: 'Tất cả trạng thái' },
                { value: 'UPCOMING', label: labels.UPCOMING },
                { value: 'ACTIVE', label: labels.ACTIVE },
                { value: 'ENDED', label: labels.ENDED },
                { value: 'CANCELLED', label: labels.CANCELLED },
              ]}
              placeholder="Trạng thái"
            />
          </div>
        </div>

        {error ? (
          <div className="py-10 text-center" role="alert">
            <p>{error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setRevision((value) => value + 1)}
            >
              Thử lại
            </Button>
          </div>
        ) : loading ? (
          <p role="status" className="p-8">
            Đang tải phiên đấu…
          </p>
        ) : visible.length === 0 ? (
          <div className="py-12 text-center">
            <Gavel className="mx-auto mb-4 text-muted" />
            <p>Không có phiên phù hợp trong dữ liệu máy chủ.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-line text-muted">
                <tr>
                  {['Phiên đấu', 'Trạng thái', 'Giá hiện tại', 'Kết thúc'].map((title) => (
                    <th key={title} className="px-3 py-4 font-medium">
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((row) => (
                  <tr key={row.id}>
                    <td className="max-w-64 px-3 py-4">
                      <p className="font-semibold">Phiên đấu {row.id}</p>
                      <p className="mt-1 text-xs text-muted">Sản phẩm: {row.productId}</p>
                    </td>
                    <td className="px-3 py-4">
                      <span className="rounded-full bg-brand-soft px-3 py-2 text-xs font-semibold text-brand-dark">
                        {labels[row.status]}
                      </span>
                    </td>
                    <td className="px-3 py-4 font-semibold">{money(row.currentHighestBid)}</td>
                    <td className="px-3 py-4">
                      {row.endTime && Number.isFinite(Date.parse(row.endTime))
                        ? new Date(row.endTime).toLocaleString('vi-VN')
                        : 'Chưa có thông tin'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !error && visible.length > 0 && (
          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="text-sm text-muted">
              {visible.length} phiên · Trang {currentPage}/{pages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
              >
                Trước
              </Button>
              <Button
                variant="outline"
                disabled={currentPage === pages}
                onClick={() => setPage(currentPage + 1)}
              >
                Sau
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
