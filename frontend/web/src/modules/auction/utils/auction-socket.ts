import { io, Socket } from 'socket.io-client';

const AUCTION_SOCKET_URL = process.env.NEXT_PUBLIC_AUCTION_WS_URL || 'http://localhost:4004';

let socket: Socket | null = null;

export function getAuctionSocket(): Socket {
  if (!socket) {
    socket = io(AUCTION_SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return socket;
}
