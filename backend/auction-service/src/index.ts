import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApplication } from './app';
import { setSocketServer } from './infrastructure/websocket/socket';

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const PORT = process.env.PORT
  ? parseInt(process.env.PORT, 10)
  : process.env.AUCTION_SERVICE_PORT
    ? parseInt(process.env.AUCTION_SERVICE_PORT, 10)
    : 4004;
const app = createApplication();

// 1. Tạo HTTP Server bọc Express app
const server = http.createServer(app);

// 2. Khởi tạo Socket.IO Server hỗ trợ CORS
export const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});
setSocketServer(io);

// 3. Quản lý Rooms theo phiên đấu giá
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // Khi người dùng mở xem phòng đấu giá
  socket.on('join_auction', (auctionId: string) => {
    socket.join(`auction:${auctionId}`);
    console.log(`[Socket.IO] Client ${socket.id} joined room auction:${auctionId}`);
  });

  // Khi người dùng rời khỏi phòng
  socket.on('leave_auction', (auctionId: string) => {
    socket.leave(`auction:${auctionId}`);
    console.log(`[Socket.IO] Client ${socket.id} left room auction:${auctionId}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// 4. Lắng nghe trên server thay vì app
server.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(`[Auction Service] running on http://localhost:${PORT}`);
  console.log(`[Auction Service Socket.IO] WebSocket ready on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API Docs: http://localhost:${PORT}/api/v1/auctions`);
  console.log('='.repeat(60));
});
