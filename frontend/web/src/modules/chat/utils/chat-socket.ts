'use client';

import { getToken, SESSION_EVENT } from '@/modules/auth/utils/session';
import { io, type Socket } from 'socket.io-client';

const CHAT_SOCKET_URL = process.env.NEXT_PUBLIC_CHAT_WS_URL || 'http://localhost:4008';

let chatSocket: Socket | null = null;

/**
 * Pure WebSocket Socket.IO singleton cho Chat (không fallback HTTP long-polling).
 * Tự kết nối khi có token, dừng reconnect vô hạn khi mất server và nối lại khi online/mở tab.
 */
export function getChatSocket(): Socket {
  if (!chatSocket) {
    chatSocket = io(CHAT_SOCKET_URL, {
      transports: ['websocket'],
      upgrade: false,
      autoConnect: false,
      auth: (callback) => callback({ token: getToken() }),
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 30000,
    });

    const syncConnection = () => {
      if (!chatSocket) return;
      const token = getToken();
      if (!token) {
        if (chatSocket.connected || chatSocket.active) chatSocket.disconnect();
        return;
      }
      if (!chatSocket.connected) {
        chatSocket.connect();
      }
    };

    const reconnectOnAuthChange = () => {
      if (!chatSocket) return;
      chatSocket.disconnect();
      if (getToken()) chatSocket.connect();
    };

    window.addEventListener(SESSION_EVENT, reconnectOnAuthChange);
    window.addEventListener('storage', (event) => {
      if (!event.key || event.key === 'nexus.accessToken') reconnectOnAuthChange();
    });
    window.addEventListener('online', syncConnection);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) syncConnection();
    });

    syncConnection();
  }
  return chatSocket;
}
