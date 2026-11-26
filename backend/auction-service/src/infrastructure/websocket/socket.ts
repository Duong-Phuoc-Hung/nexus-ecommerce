import type { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { verifyJwtToken, AuthenticatedUser } from '../security/auth';
import { auctionRuntimeStore } from '../state/AuctionRuntimeStore';
import { TransactionalAuctionRepository } from '../repositories/TransactionalAuctionRepository';

let io: SocketIOServer | null = null;
const aclRepository = new TransactionalAuctionRepository();

async function ensureRoomAclLoaded(auctionId: string): Promise<void> {
  if (auctionRuntimeStore.getMeta(auctionId)) return;
  if (process.env.USE_IN_MEMORY_DB === 'true') return;
  const loaded = await aclRepository.loadRoomAcl(auctionId);
  if (loaded) {
    auctionRuntimeStore.ensureMeta(auctionId, {
      endTime: loaded.endTime || new Date(Date.now() + 3600_000),
      visibility: loaded.visibility,
      invitedUserIds: loaded.invitedUserIds,
    });
  }
}

function canAccessRestrictedRoom(
  auctionId: string,
  user: AuthenticatedUser | null,
): { allowed: boolean; isRestricted: boolean } {
  const meta = auctionRuntimeStore.getMeta(auctionId);
  // Fail-Closed: nếu meta tồn tại nhưng visibility không phải 'PUBLIC', coi là RESTRICTED
  const isRestricted = meta ? meta.visibility !== 'PUBLIC' : false;
  if (!isRestricted) {
    return { allowed: true, isRestricted: false };
  }
  if (!user) {
    return { allowed: false, isRestricted: true };
  }
  const role = (user.role || '').toUpperCase();
  if (role === 'ADMIN' || role === 'SUPPORT_STAFF') {
    return { allowed: true, isRestricted: true };
  }
  if (Array.isArray(meta?.invitedUserIds) && meta.invitedUserIds.includes(user.id)) {
    return { allowed: true, isRestricted: true };
  }
  return { allowed: false, isRestricted: true };
}

export function initAuctionSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    },
  });

  // SEC-07: Xác thực JWT tùy chọn trên handshake.
  // - Guest (không gửi token) vẫn xem được phiên PUBLIC.
  // - Nếu gửi token không hợp lệ/hết hạn -> từ chối kết nối.
  io.use((socket, next) => {
    const authToken =
      typeof socket.handshake.auth?.token === 'string' ? socket.handshake.auth.token.trim() : '';
    const headerToken =
      typeof socket.handshake.headers?.authorization === 'string'
        ? socket.handshake.headers.authorization.replace(/^Bearer\s+/i, '').trim()
        : '';
    const rawToken = authToken || headerToken;

    if (!rawToken) {
      socket.data.user = null;
      return next();
    }

    const verified = verifyJwtToken(rawToken);
    if (!verified) {
      return next(new Error('Invalid or expired authentication token'));
    }
    socket.data.user = verified;
    return next();
  });

  io.on('connection', (socket) => {
    const user = (socket.data.user as AuthenticatedUser | null) || null;
    if (user?.id) {
      void socket.join(`user:${user.id}`);
    }

    socket.on('join_auction', (auctionId: string) => {
      if (typeof auctionId !== 'string' || !auctionId.trim()) return;
      const cleanId = auctionId.trim();
      void ensureRoomAclLoaded(cleanId).then(() => {
        const access = canAccessRestrictedRoom(cleanId, user);
        if (!access.allowed) {
          socket.emit('auction:join_denied', {
            auctionId: cleanId,
            reason: 'RESTRICTED_AUCTION_FORBIDDEN',
          });
          return;
        }
        void socket.join(`auction:${cleanId}`);
      });
    });

    socket.on('leave_auction', (auctionId: string) => {
      if (typeof auctionId === 'string' && auctionId.trim()) {
        void socket.leave(`auction:${auctionId.trim()}`);
      }
    });

    socket.on('join_auctions_feed', () => {
      void socket.join('auctions:feed');
    });

    socket.on('leave_auctions_feed', () => {
      void socket.leave('auctions:feed');
    });
  });

  return io;
}

export function getAuctionIO(): SocketIOServer | null {
  return io;
}

export function emitAuctionEvent(
  event:
    | 'auction:bid_placed'
    | 'auction:buy_now'
    | 'auction:created'
    | 'auction:updated'
    | 'auction:cancelled'
    | 'auction:started'
    | 'auction:ended'
    | 'auction:outbid',
  payload: Record<string, unknown>,
  auctionId?: string,
): void {
  if (!io) return;

  // SEC-07: auction:outbid là sự kiện riêng tư — CHỈ gửi tới phòng cá nhân user:{outbidUserId}
  if (event === 'auction:outbid') {
    const targetUserId =
      typeof payload.outbidUserId === 'string' ? payload.outbidUserId.trim() : '';
    if (targetUserId) {
      io.to(`user:${targetUserId}`).emit(event, payload);
    }
    return;
  }

  const isRestricted = auctionId
    ? auctionRuntimeStore.getMeta(auctionId)?.visibility === 'RESTRICTED'
    : false;

  if (auctionId) {
    io.to(`auction:${auctionId}`).emit(event, payload);
  }

  // Không phát tán thông tin phiên RESTRICTED ra kênh công khai auctions:feed
  if (!isRestricted) {
    io.to('auctions:feed').emit(event, payload);
    io.to('auctions:feed').emit('auctions:changed', { event, auctionId, ...payload });
  }
}
