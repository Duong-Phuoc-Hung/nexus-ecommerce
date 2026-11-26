import type { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

import { verifyJwtToken } from '../security/auth';

let io: SocketIOServer | null = null;

export function initChatSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    },
  });

  io.use((socket, next) => {
    const user = verifyJwtToken(socket.handshake.auth.token ?? '');
    if (!user?.exp) return next(new Error('Authentication required'));
    socket.data.user = user;
    next();
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    void socket.join(`user:${user.sub}`);
    if (user.role === 'ADMIN' || user.role === 'SUPPORT_STAFF') {
      void socket.join('role:SUPPORT_STAFF');
    }
    const expiry = setTimeout(
      () => socket.disconnect(true),
      Math.min(2147483647, Math.max(0, user.exp * 1000 - Date.now())),
    );
    socket.on('disconnect', () => clearTimeout(expiry));
  });

  return io;
}

export function emitChatEvent(
  event: 'chat:message' | 'chat:read' | 'chat:conversation_updated',
  targets: {
    conversationId: string;
    userIds?: Array<string | undefined | null>;
    notifyStaff?: boolean;
    payload?: Record<string, unknown>;
  },
): void {
  if (!io) return;
  const rooms = new Set<string>();
  for (const uid of targets.userIds || []) {
    if (uid && uid.trim()) rooms.add(`user:${uid.trim()}`);
  }
  if (targets.notifyStaff) rooms.add('role:SUPPORT_STAFF');

  if (rooms.size) {
    io.to([...rooms]).emit(event, {
      conversationId: targets.conversationId,
      ...(targets.payload || {}),
    });
  }
}
