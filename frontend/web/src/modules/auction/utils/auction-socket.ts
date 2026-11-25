'use client';

import { io, type Socket } from 'socket.io-client';
import { getToken, SESSION_EVENT } from '@/modules/auth/utils/session';

const AUCTION_SOCKET_URL = process.env.NEXT_PUBLIC_AUCTION_WS_URL || 'http://localhost:4004';

let auctionSocket: Socket | null = null;
let lastBoundToken: string | null = null;

/**
 * Pure WebSocket Socket.IO singleton cho Đấu giá (không fallback HTTP long-polling).
 * Đính kèm JWT (nếu đã đăng nhập) để nhận sự kiện riêng tư (auction:outbid) và phòng RESTRICTED;
 * Guest vẫn kết nối không cần token để xem phiên PUBLIC.
 */
export function getAuctionSocket(): Socket {
  if (!auctionSocket) {
    lastBoundToken = getToken();
    auctionSocket = io(AUCTION_SOCKET_URL, {
      transports: ['websocket'],
      upgrade: false,
      autoConnect: true,
      auth: (cb) => cb({ token: getToken() || undefined }),
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 30000,
    });

    const syncAuthAndReconnect = () => {
      if (!auctionSocket) return;
      const nextToken = getToken();
      if (nextToken === lastBoundToken) return;
      lastBoundToken = nextToken;
      auctionSocket.disconnect();
      auctionSocket.connect();
    };

    const resumeIfNeeded = () => {
      if (auctionSocket && !auctionSocket.connected) {
        auctionSocket.connect();
      }
    };

    window.addEventListener(SESSION_EVENT, syncAuthAndReconnect);
    window.addEventListener('storage', (event) => {
      if (!event.key || event.key === 'nexus.accessToken') {
        syncAuthAndReconnect();
      }
    });
    window.addEventListener('online', resumeIfNeeded);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) resumeIfNeeded();
    });
  }
  return auctionSocket;
}
