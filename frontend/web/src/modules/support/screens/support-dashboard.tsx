'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supportApi, type SupportSummary } from '../api/support.api';
import { userMessage } from '@/lib/axios/http';
import { Heading, DemoBanner, CaseTable } from '../components/support-shared';
export function SupportDashboard() {
  const [summary, setSummary] = useState<SupportSummary | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    supportApi
      .dashboard(controller.signal)
      .then(setSummary)
      .catch((err) => !controller.signal.aborted && setError(userMessage(err)));
    return () => controller.abort();
  }, []);
  return (
    <>
      <Heading
        label="SUPPORT STAFF / OVERVIEW"
        title="Chào ca trực"
        description="Tổng quan yêu cầu hỗ trợ và các hồ sơ cần tra cứu."
      />
      <DemoBanner message="Số liệu ca trực được tải từ Support API." />
      <section className="support-stats">
        <article>
          <span>Đang chờ xử lý</span>
          <strong>{summary?.pendingCases ?? '—'}</strong>
          <small>{summary ? `${summary.metrics.highPriorityCount} ưu tiên cao` : 'Đang tải'}</small>
        </article>
        <article>
          <span>Đang xử lý</span>
          <strong>{summary?.processingCases ?? '—'}</strong>
          <small>
            {summary ? `${summary.metrics.nearOverdueCount} hồ sơ gần quá hạn` : 'Đang tải'}
          </small>
        </article>
        <article>
          <span>Đã giải quyết hôm nay</span>
          <strong>{summary?.resolvedToday ?? '—'}</strong>
          <small>
            {summary
              ? `Thời gian xử lý TB ${summary.metrics.averageHandlingTimeMinutes} phút`
              : 'Đang tải'}
          </small>
        </article>
        <article>
          <span>Vận đơn cần theo dõi</span>
          <strong>{summary?.flaggedShipments ?? '—'}</strong>
          <small>
            {summary ? `${summary.metrics.updatedTodayCount} đơn cập nhật hôm nay` : 'Đang tải'}
          </small>
        </article>
      </section>
      <section className="support-panel">
        <div className="support-panel-heading">
          <div>
            <p className="support-eyebrow">HÀNG ĐỢI XỬ LÝ · HỆ THỐNG</p>
            <h2>Yêu cầu đang chờ</h2>
          </div>
          <Link href="/support/orders">Tra cứu đơn hàng →</Link>
        </div>
        {error ? (
          <p className="support-empty">{error}</p>
        ) : (
          <CaseTable compact items={summary?.recentCases ?? []} />
        )}
      </section>
      <section className="support-quick-links">
        <Link href="/support/orders">
          <span>▤</span>
          <strong>Tra cứu đơn</strong>
          <small>Tìm thông tin, xem chi tiết và lịch sử trạng thái</small>
          <b>→</b>
        </Link>
        <Link href="/support/users">
          <span>◎</span>
          <strong>Tra cứu người dùng</strong>
          <small>Xem hồ sơ Khách hàng / Đối tác và thông tin uy tín</small>
          <b>→</b>
        </Link>
        <Link href="/support/shipments">
          <span>⇢</span>
          <strong>Tra cứu vận đơn</strong>
          <small>Theo dõi hãng vận chuyển và cập nhật gần nhất</small>
          <b>→</b>
        </Link>
      </section>
    </>
  );
}
