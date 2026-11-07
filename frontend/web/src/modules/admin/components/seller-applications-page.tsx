'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  FileSearch,
  FilterX,
  RefreshCw,
  Search,
  Store,
} from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { normalizeApiError } from '../../../lib/axios/http';
import { sellerApplicationsApi } from '../../user/api/seller-applications.api';
import {
  SELLER_APPLICATION_STATUS_META,
  type SellerApplicationAdminDto,
  type SellerApplicationStatusSummary,
} from '../../user/types/seller-application.types';

interface AdminSellerApplicationsPageProps {
  embedded?: boolean;
}

export function AdminSellerApplicationsPage({
  embedded = false,
}: AdminSellerApplicationsPageProps) {
  const [items, setItems] = useState<SellerApplicationAdminDto[]>([]);
  const [summary, setSummary] = useState<SellerApplicationStatusSummary>({
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    activatedCount: 0,
    withdrawnCount: 0,
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const [qInput, setQInput] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const loadList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await sellerApplicationsApi.listAdminApplications({
        q: appliedQ,
        status: statusFilter,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        page,
        limit: 10,
        sortBy: 'priorityQueue',
        sortOrder: 'asc',
      });
      setItems(response.items);
      setSummary(response.summary);
      setPagination(response.pagination);
    } catch (err) {
      const apiErr = normalizeApiError(err);
      setError(apiErr.message);
    } finally {
      setLoading(false);
    }
  }, [appliedQ, statusFilter, fromDate, toDate, page]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPage(1);
    setAppliedQ(qInput.trim());
  };

  const handleResetFilters = () => {
    setQInput('');
    setAppliedQ('');
    setStatusFilter('ALL');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const hasActiveFilters =
    Boolean(appliedQ) || statusFilter !== 'ALL' || Boolean(fromDate) || Boolean(toDate);

  const totalAllStatuses =
    summary.pendingCount +
    summary.approvedCount +
    summary.rejectedCount +
    summary.activatedCount +
    summary.withdrawnCount;

  return (
    <div className="space-y-6">
      {!embedded ? (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Quản trị Seller Onboarding</Badge>
              <span className="text-xs text-muted">
                Ưu tiên hồ sơ Chờ xét duyệt (PENDING) gửi sớm nhất
              </span>
            </div>
            <h1 className="text-2xl font-bold text-ink">Xét duyệt hồ sơ đăng ký bán hàng</h1>
            <p className="text-sm text-muted">
              Kiểm tra thông tin gian hàng, phê duyệt hoặc từ chối có lý do rõ ràng. Phê duyệt hồ sơ
              chưa đổi role ngay — Buyer sẽ tự xác nhận kích hoạt Seller sau khi đủ điều kiện.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/users">Quản lý tài khoản</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void loadList()}
              disabled={loading}
            >
              <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>Làm mới</span>
            </Button>
          </div>
        </div>
      ) : null}

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <button
          type="button"
          onClick={() => {
            setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING');
            setPage(1);
          }}
          className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition-colors ${
            statusFilter === 'PENDING'
              ? 'border-amber-400 bg-amber-50/90'
              : 'border-line bg-white hover:border-amber-300'
          }`}
        >
          <span className="flex items-center justify-between text-xs font-semibold text-amber-800">
            <span>Chờ xét duyệt</span>
            <Clock className="size-4" aria-hidden="true" />
          </span>
          <span className="mt-2 text-2xl font-bold text-ink">{summary.pendingCount}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter(statusFilter === 'APPROVED' ? 'ALL' : 'APPROVED');
            setPage(1);
          }}
          className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition-colors ${
            statusFilter === 'APPROVED'
              ? 'border-blue-400 bg-blue-50/90'
              : 'border-line bg-white hover:border-blue-300'
          }`}
        >
          <span className="text-xs font-semibold text-blue-800">Đã duyệt · Chờ kích hoạt</span>
          <span className="mt-2 text-2xl font-bold text-ink">{summary.approvedCount}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter(statusFilter === 'REJECTED' ? 'ALL' : 'REJECTED');
            setPage(1);
          }}
          className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition-colors ${
            statusFilter === 'REJECTED'
              ? 'border-red-400 bg-red-50/90'
              : 'border-line bg-white hover:border-red-300'
          }`}
        >
          <span className="text-xs font-semibold text-red-800">Cần điều chỉnh</span>
          <span className="mt-2 text-2xl font-bold text-ink">{summary.rejectedCount}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter(statusFilter === 'ACTIVATED' ? 'ALL' : 'ACTIVATED');
            setPage(1);
          }}
          className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition-colors ${
            statusFilter === 'ACTIVATED'
              ? 'border-emerald-400 bg-emerald-50/90'
              : 'border-line bg-white hover:border-emerald-300'
          }`}
        >
          <span className="flex items-center justify-between text-xs font-semibold text-emerald-800">
            <span>Đã kích hoạt Seller</span>
            <CheckCircle2 className="size-4" aria-hidden="true" />
          </span>
          <span className="mt-2 text-2xl font-bold text-ink">{summary.activatedCount}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter(statusFilter === 'WITHDRAWN' ? 'ALL' : 'WITHDRAWN');
            setPage(1);
          }}
          className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition-colors ${
            statusFilter === 'WITHDRAWN'
              ? 'border-stone-400 bg-stone-100'
              : 'border-line bg-white hover:border-stone-300'
          }`}
        >
          <span className="text-xs font-semibold text-muted">Đã rút hồ sơ</span>
          <span className="mt-2 text-2xl font-bold text-ink">{summary.withdrawnCount}</span>
        </button>
      </div>

      {/* Filter Bar */}
      <form
        onSubmit={handleSearchSubmit}
        className="grid gap-3 rounded-2xl border border-line bg-white p-4 shadow-2xs md:grid-cols-12"
      >
        <div className="relative md:col-span-4">
          <Input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Tìm theo mã hồ sơ, tên, email, tên cửa hàng..."
            aria-label="Tìm kiếm hồ sơ đăng ký bán hàng"
          />
          <Search
            className="pointer-events-none absolute right-3.5 top-3.5 size-4 text-muted"
            aria-hidden="true"
          />
        </div>

        <div className="md:col-span-3">
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger aria-label="Lọc theo trạng thái hồ sơ">
              <SelectValue placeholder="Tất cả trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
              <SelectItem value="PENDING">Chờ xét duyệt (PENDING)</SelectItem>
              <SelectItem value="APPROVED">Đã duyệt · Chờ kích hoạt (APPROVED)</SelectItem>
              <SelectItem value="REJECTED">Cần điều chỉnh (REJECTED)</SelectItem>
              <SelectItem value="ACTIVATED">Đã kích hoạt Seller (ACTIVATED)</SelectItem>
              <SelectItem value="WITHDRAWN">Đã rút hồ sơ (WITHDRAWN)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="relative md:col-span-2">
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            aria-label="Từ ngày gửi"
            title="Từ ngày gửi"
          />
        </div>

        <div className="relative md:col-span-2">
          <Input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            aria-label="Đến ngày gửi"
            title="Đến ngày gửi"
          />
        </div>

        <div className="flex items-center gap-2 md:col-span-1">
          <Button type="submit" size="sm" className="w-full">
            Lọc
          </Button>
        </div>

        {hasActiveFilters ? (
          <div className="flex items-center justify-between border-t border-line pt-2 text-xs text-muted md:col-span-12">
            <span>Đang lọc kết quả ({pagination.total} hồ sơ phù hợp)</span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 font-semibold text-brand-dark hover:underline"
            >
              <FilterX className="size-3.5" aria-hidden="true" />
              <span>Xóa bộ lọc</span>
            </button>
          </div>
        ) : null}
      </form>

      {/* Main Content States: Loading / Error / Empty / Filter-Empty / Table */}
      {loading ? (
        <div className="space-y-3 rounded-2xl border border-line bg-white p-6">
          {[1, 2, 3, 4].map((row) => (
            <div key={row} className="h-14 animate-pulse rounded-xl bg-canvas" />
          ))}
        </div>
      ) : error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-900"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="size-5 shrink-0 text-red-600" />
            <div>
              <p className="font-bold">Không thể tải danh sách hồ sơ đăng ký bán hàng</p>
              <p className="mt-0.5 text-xs">{error}</p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void loadList()}>
            Thử lại
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white p-10 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-canvas text-muted">
            {hasActiveFilters || totalAllStatuses > 0 ? (
              <FileSearch className="size-6" aria-hidden="true" />
            ) : (
              <Store className="size-6" aria-hidden="true" />
            )}
          </div>
          <h3 className="mt-3 text-base font-bold text-ink">
            {hasActiveFilters
              ? 'Không tìm thấy hồ sơ khớp bộ lọc'
              : 'Chưa có hồ sơ đăng ký bán hàng nào'}
          </h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted">
            {hasActiveFilters
              ? 'Thử thay đổi từ khóa tìm kiếm, trạng thái hoặc khoảng thời gian gửi hồ sơ.'
              : 'Khi người mua (Buyer) gửi hồ sơ đăng ký bán hàng, danh sách hồ sơ sẽ xuất hiện tại đây theo thứ tự ưu tiên chờ duyệt.'}
          </p>
          {hasActiveFilters ? (
            <div className="mt-4">
              <Button type="button" variant="outline" size="sm" onClick={handleResetFilters}>
                Xóa bộ lọc tìm kiếm
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-canvas/70 text-xs font-bold uppercase tracking-wider text-muted">
                  <th className="px-4 py-3.5">Mã hồ sơ</th>
                  <th className="px-4 py-3.5">Người đăng ký</th>
                  <th className="px-4 py-3.5">Tên cửa hàng</th>
                  <th className="px-4 py-3.5">Số điện thoại</th>
                  <th className="px-4 py-3.5">Ngày gửi</th>
                  <th className="px-4 py-3.5">Trạng thái</th>
                  <th className="px-4 py-3.5">Người xử lý gần nhất</th>
                  <th className="px-4 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((app) => {
                  const meta = SELLER_APPLICATION_STATUS_META[app.status];
                  const lastAdminDecision = [...app.decisionHistory]
                    .reverse()
                    .find((d) => d.actorRole === 'ADMIN');

                  return (
                    <tr key={app.id} className="transition-colors hover:bg-canvas/40">
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <div className="font-mono text-xs font-bold text-ink">{app.id}</div>
                        <div className="text-[11px] text-muted">Phiên bản v{app.version}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-ink">{app.applicantName}</div>
                        <div className="text-xs text-muted">{app.applicantEmail}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-ink">{app.snapshot.shopName}</div>
                        <div className="text-xs text-muted">
                          {app.snapshot.pickupAddress.provinceName} ·{' '}
                          {app.snapshot.categoryIds.length} danh mục
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs text-ink">
                        {app.snapshot.contactPhone}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-xs text-muted">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="size-3.5" aria-hidden="true" />
                          {new Date(app.submittedAt).toLocaleString('vi-VN')}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5">
                        <Badge variant={meta?.badgeVariant ?? 'outline'}>
                          {meta?.label ?? app.status}
                        </Badge>
                      </td>

                      <td className="px-4 py-3.5 text-xs text-muted">
                        {lastAdminDecision ? (
                          <div>
                            <div className="font-medium text-ink">
                              {lastAdminDecision.actorName || lastAdminDecision.actorId}
                            </div>
                            <div className="text-[11px]">
                              {new Date(lastAdminDecision.occurredAt).toLocaleDateString('vi-VN')}
                            </div>
                          </div>
                        ) : (
                          <span>Chưa xử lý</span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3.5 text-right">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/admin/seller-applications/${encodeURIComponent(app.id)}`}>
                            <Eye className="size-3.5" aria-hidden="true" />
                            <span>{app.status === 'PENDING' ? 'Xét duyệt' : 'Chi tiết'}</span>
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Server Pagination Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-canvas/30 px-4 py-3 text-xs text-muted">
            <span>
              Hiển thị {items.length} / tổng số {pagination.total} hồ sơ (Trang {pagination.page}/
              {pagination.totalPages})
            </span>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Trang trước
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              >
                Trang tiếp
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
