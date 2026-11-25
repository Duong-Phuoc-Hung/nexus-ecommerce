import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { createApplication } from './app';
import { initAuctionSocket } from './infrastructure/websocket/socket';

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
const httpServer = http.createServer(app);
initAuctionSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(`[Auction Service] running on http://localhost:${PORT} (Socket.IO enabled)`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API Docs: http://localhost:${PORT}/api/v1/auctions`);
  console.log('='.repeat(60));
});
