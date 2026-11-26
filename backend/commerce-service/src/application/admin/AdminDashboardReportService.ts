import { PostgresAdminOrderReader } from '../../infrastructure/repositories/PostgresAdminOrderReader';

export class AdminDashboardReportService {
  constructor(private readonly adminOrderReader: PostgresAdminOrderReader) {}

  public async getDashboardSummary(): Promise<any> {
    const ordersMetrics = await this.adminOrderReader.getDashboardOrderMetrics();

    // Gọi các service ngoài an toàn với timeout 2s và fallback null
    const [sellerApps, auctions, disputes] = await Promise.all([
      this.fetchSafe(
        'http://localhost:4001/api/v1/admin/seller-applications?status=PENDING&limit=1',
        (data) => (typeof data?.pagination?.total === 'number' ? data.pagination.total : null),
      ),
      this.fetchSafe('http://localhost:4002/api/v1/auctions/summary', (data) =>
        data?.data
          ? {
              scheduled: Number(data.data.scheduled || 0),
              active: Number(data.data.active || 0),
              extended: Number(data.data.extended || 0),
            }
          : null,
      ),
      this.fetchSafe('http://localhost:4005/api/v1/admin/disputes/count', (data) =>
        typeof data?.data?.openDisputes === 'number' ? data.data.openDisputes : null,
      ),
    ]);

    return {
      orders: ordersMetrics,
      sellerApplicationsPending: sellerApps,
      auctions: auctions || { scheduled: 0, active: 0, extended: 0 },
      openDisputes: disputes,
      generatedAt: new Date().toISOString(),
    };
  }

  public async getReports(params: {
    from?: string;
    to?: string;
    granularity?: string;
  }): Promise<any> {
    const { fromStr, toStr, granularity, fromDate, toDate } =
      this.validateAndNormalizeDates(params);

    const reportData = await this.adminOrderReader.getReports({
      from: fromDate,
      to: toDate,
      granularity,
    });

    return {
      from: fromStr,
      to: toStr,
      granularity,
      summary: reportData.summary,
      rows: reportData.rows,
    };
  }

  public async exportReportsCsv(params: {
    from?: string;
    to?: string;
    granularity?: string;
  }): Promise<{ filename: string; csv: string }> {
    const report = await this.getReports(params);
    const filename = `nexus-report-${report.from}_${report.to}.csv`;

    // UTF-8 BOM (\uFEFF) giúp Excel trên Windows mở trực tiếp không bị lỗi font tiếng Việt
    let csv = '\uFEFF';
    csv +=
      'Kỳ báo cáo,Số đơn hàng,Đơn hoàn tất,Đơn hủy hoặc hoàn,Doanh thu (VND),Tiền hoàn trả (VND),Đấu giá hoàn tất\r\n';

    for (const row of report.rows) {
      csv += `"${row.period}",${row.orders},${row.completedOrders},${row.cancelledOrRefunded},${row.revenue},${row.refundedAmount},${row.completedAuctions}\r\n`;
    }

    const s = report.summary;
    csv += `"TỔNG CỘNG",${s.totalOrders},${s.completedOrders},${s.cancelledOrders + s.refundedOrders},${s.grossRevenue},${s.refundedAmount},${s.completedAuctions}\r\n`;

    return { filename, csv };
  }

  private validateAndNormalizeDates(params: { from?: string; to?: string; granularity?: string }): {
    fromStr: string;
    toStr: string;
    granularity: 'day' | 'week' | 'month';
    fromDate: Date;
    toDate: Date;
  } {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const now = new Date();

    let toStr = params.to || now.toISOString().slice(0, 10);
    if (!dateRegex.test(toStr)) {
      toStr = now.toISOString().slice(0, 10);
    }

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    let fromStr = params.from || thirtyDaysAgo.toISOString().slice(0, 10);
    if (!dateRegex.test(fromStr)) {
      fromStr = thirtyDaysAgo.toISOString().slice(0, 10);
    }

    const fromDate = new Date(`${fromStr}T00:00:00.000Z`);
    const toDate = new Date(`${toStr}T23:59:59.999Z`);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime()) || fromDate > toDate) {
      const err: any = new Error('Khoảng thời gian không hợp lệ (from phải nhỏ hơn hoặc bằng to).');
      err.code = 'INVALID_DATE_RANGE';
      err.status = 400;
      throw err;
    }

    const diffDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 365) {
      const err: any = new Error('Khoảng thời gian thống kê tối đa là 365 ngày.');
      err.code = 'INVALID_DATE_RANGE';
      err.status = 400;
      throw err;
    }

    let granularity: 'day' | 'week' | 'month' = 'day';
    if (params.granularity === 'week' || params.granularity === 'month') {
      granularity = params.granularity;
    }

    return { fromStr, toStr, granularity, fromDate, toDate };
  }

  private async fetchSafe<T>(url: string, transform: (data: any) => T | null): Promise<T | null> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) return null;
      const json = await res.json();
      return transform(json);
    } catch {
      return null;
    }
  }
}
