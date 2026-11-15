'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface ChatFloatingBubbleProps {
  role: 'SELLER' | 'SUPPORT';
  targetUrl: string;
  badgeCount?: number;
}

export function ChatFloatingBubble({ role, targetUrl, badgeCount = 1 }: ChatFloatingBubbleProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Nếu đang ở chính trang chat thì ẩn bong bóng để không che giao diện
  if (pathname?.startsWith(targetUrl)) {
    return null;
  }

  const isSeller = role === 'SELLER';
  const label = isSeller ? 'Tin nhắn khách hàng' : 'Hỗ trợ & Tranh chấp';
  const sublabel = isSeller ? 'Trao đổi đơn hàng' : 'Xử lý khiếu nại SLA';

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
      {/* Tooltip / Label xuất hiện khi rê chuột */}
      {isHovered && (
        <div
          style={{
            background: isSeller ? '#1e293b' : '#0f172a',
            color: '#ffffff',
            padding: '8px 14px',
            borderRadius: '10px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
            fontSize: '13px',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            border: isSeller
              ? '1px solid rgba(225, 29, 72, 0.4)'
              : '1px solid rgba(37, 99, 235, 0.4)',
            animation: 'fadeIn 0.2s ease-in-out',
          }}
        >
          <div style={{ fontWeight: 600, color: isSeller ? '#fda4af' : '#93c5fd' }}>{label}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>{sublabel}</div>
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

        {/* Chấm tròn báo tin nhắn mới */}
        {badgeCount > 0 && (
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
            {badgeCount}
          </span>
        )}

        {/* Hiệu ứng xung nhịp Pulse ngầm */}
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
      </Link>
    </div>
  );
}
