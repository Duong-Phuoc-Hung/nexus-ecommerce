'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { supportApi } from '@/modules/support/api/support.api';
import { chatApi } from '@/modules/chat/api/chat.api';

interface ChatFloatingBubbleProps {
  role: 'SELLER' | 'SUPPORT';
  targetUrl: string;
  badgeCount?: number;
}

interface SupportBreakdown {
  disputesTotal: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  waitingChats: number;
}

export function ChatFloatingBubble({ role, targetUrl, badgeCount }: ChatFloatingBubbleProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [liveCount, setLiveCount] = useState<number>(0);
  const [breakdown, setBreakdown] = useState<SupportBreakdown>({
    disputesTotal: 0,
    highPriority: 0,
    mediumPriority: 0,
    lowPriority: 0,
    waitingChats: 0,
  });

  const refreshCount = useCallback(async () => {
    if (typeof badgeCount === 'number') {
      setLiveCount(badgeCount);
      return;
    }
    try {
      if (role === 'SUPPORT') {
        const [disputesRes, threadsRes] = await Promise.all([
          supportApi.listDisputes({ status: 'ALL', limit: 100 }).catch(() => []),
          chatApi.getSupportThreads().catch(() => []),
        ]);

        const disputes = Array.isArray(disputesRes) ? disputesRes : [];
        const byOrder = new Map<string, any>();
        for (const d of disputes) {
          const key = String(d.orderCode || d.order || d.orderId || d.caseId || d.id || '')
            .replace(/^#/, '')
            .trim()
            .toUpperCase();
          if (key && !byOrder.has(key)) {
            byOrder.set(key, d);
          }
        }

        const activeDisputes = Array.from(byOrder.values()).filter((d: any) => {
          const st = String(d?.status || '').toUpperCase();
          if (st === 'RESOLVED' || st === 'REJECTED' || d?.verdict) return false;
          if (typeof window !== 'undefined') {
            const orderKey = d.orderId || d.orderCode || d.order;
            const hasLocalVerdict =
              (orderKey && localStorage.getItem(`nexus_dispute_verdict_${orderKey}`)) ||
              (d.caseId && localStorage.getItem(`nexus_dispute_verdict_${d.caseId}`)) ||
              (d.id && localStorage.getItem(`nexus_dispute_verdict_${d.id}`));
            if (hasLocalVerdict) return false;
          }
          return true;
        });

        let highPriority = 0;
        let mediumPriority = 0;
        let lowPriority = 0;

        for (const d of activeDisputes as any[]) {
          const p = String(d.priority || '').toUpperCase();
          if (p === 'CAO' || p === 'HIGH' || p === 'KHẨN CẤP' || p === 'URGENT') {
            highPriority += 1;
          } else if (p === 'TRUNG BÌNH' || p === 'MEDIUM') {
            mediumPriority += 1;
          } else {
            lowPriority += 1;
          }
        }

        const disputesTotal = highPriority + mediumPriority + lowPriority;
        const waitingChats = (Array.isArray(threadsRes) ? threadsRes : []).filter(
          (t) =>
            t.conversationStatus !== 'CLOSED' &&
            (Number(t.unreadCount || 0) > 0 || t.conversationStatus === 'WAITING_STAFF'),
        ).length;

        setBreakdown({
          disputesTotal,
          highPriority,
          mediumPriority,
          lowPriority,
          waitingChats,
        });
        // Bong bóng trỏ tới /support/chat nên số hiển thị trên chấm tròn khớp đúng với số ca bên /support/chat
        setLiveCount(waitingChats);
      } else {
        const threads = await chatApi.getSellerThreads();
        const unread = threads.reduce((sum, t) => sum + Math.max(0, Number(t.unreadCount || 0)), 0);
        setLiveCount(unread);
      }
    } catch {
      // Giữ nguyên số đếm hiện tại nếu API tạm thời lỗi
    }
  }, [badgeCount, role]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    void refreshCount();
    const timer = setInterval(() => void refreshCount(), 15000);
    const onUpdated = () => void refreshCount();
    window.addEventListener('nexus:disputes-updated', onUpdated);
    return () => {
      clearInterval(timer);
      window.removeEventListener('nexus:disputes-updated', onUpdated);
    };
  }, [mounted, pathname, refreshCount]);

  if (!mounted) return null;

  // Nếu đang ở chính trang chat thì ẩn bong bóng để không che giao diện
  if (pathname?.startsWith(targetUrl)) {
    return null;
  }

  const displayCount = typeof badgeCount === 'number' ? badgeCount : liveCount;
  const isSeller = role === 'SELLER';
  const label = isSeller ? 'Tin nhắn khách hàng' : 'Hỗ trợ & Tranh chấp';
  const sublabel = isSeller
    ? displayCount > 0
      ? `${displayCount} tin nhắn chưa đọc`
      : 'Trao đổi đơn hàng'
    : displayCount > 0
      ? `${breakdown.disputesTotal} đơn khiếu nại · ${breakdown.waitingChats} chat chờ`
      : 'Không có khiếu nại tồn đọng';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}
    >
      {/* Tooltip / Bảng phân tách rõ khiếu nại & tin nhắn khi rê chuột */}
      {isHovered && (
        <div
          style={{
            background: isSeller ? '#1e293b' : '#0f172a',
            color: '#ffffff',
            padding: '10px 14px',
            borderRadius: '10px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
            fontSize: '12px',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            border: isSeller
              ? '1px solid rgba(225, 29, 72, 0.4)'
              : '1px solid rgba(37, 99, 235, 0.4)',
            animation: 'fadeIn 0.2s ease-in-out',
          }}
        >
          <div style={{ fontWeight: 700, color: isSeller ? '#fda4af' : '#93c5fd' }}>{label}</div>
          {isSeller ? (
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{sublabel}</div>
          ) : (
            <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '4px', lineHeight: 1.5 }}>
              <div>
                ⚖️ Khiếu nại đơn:{' '}
                <strong style={{ color: '#fbbf24' }}>{breakdown.disputesTotal}</strong>
                {breakdown.disputesTotal > 0 && (
                  <span style={{ color: '#94a3b8' }}>
                    {' '}
                    (Cao: {breakdown.highPriority} · TB: {breakdown.mediumPriority} · Thấp:{' '}
                    {breakdown.lowPriority})
                  </span>
                )}
              </div>
              <div>
                💬 Hội thoại chờ:{' '}
                <strong style={{ color: '#60a5fa' }}>{breakdown.waitingChats}</strong>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Nút bấm hình bong bóng tròn */}
      <Link
        href={targetUrl}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label={label}
        style={{
          width: '58px',
          height: '58px',
          borderRadius: '50%',
          background: isSeller
            ? 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)'
            : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isSeller
            ? '0 10px 25px -3px rgba(225, 29, 72, 0.5), 0 4px 6px -2px rgba(225, 29, 72, 0.3)'
            : '0 10px 25px -3px rgba(37, 99, 235, 0.5), 0 4px 6px -2px rgba(37, 99, 235, 0.3)',
          transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: isHovered ? 'scale(1.1) translateY(-2px)' : 'scale(1)',
          cursor: 'pointer',
          textDecoration: 'none',
          position: 'relative',
        }}
      >
        {/* Biểu tượng bong bóng chat */}
        <span
          style={{
            fontSize: '26px',
            lineHeight: 1,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
          }}
        >
          {isSeller ? '💬' : '🎧'}
        </span>

        {/* Chấm tròn báo số khiếu nại đang xử lý / tin nhắn chưa đọc */}
        {displayCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              minWidth: '20px',
              height: '20px',
              padding: '0 5px',
              borderRadius: '10px',
              background: '#ffffff',
              color: isSeller ? '#e11d48' : '#2563eb',
              fontSize: '11px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
              border: `2px solid ${isSeller ? '#e11d48' : '#2563eb'}`,
            }}
          >
            {displayCount}
          </span>
        )}

        {/* Hiệu ứng xung nhịp Pulse ngầm khi có khiếu nại/tin nhắn đang chờ */}
        {displayCount > 0 && (
          <span
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: isSeller ? 'rgba(225, 29, 72, 0.4)' : 'rgba(37, 99, 235, 0.4)',
              zIndex: -1,
              animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
            }}
          />
        )}
      </Link>
    </div>
  );
}
