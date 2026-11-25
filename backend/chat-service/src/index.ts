import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { createApplication } from './app';
import { initChatSocket } from './infrastructure/websocket/socket';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const PORT = process.env.PORT
  ? parseInt(process.env.PORT, 10)
  : process.env.CHAT_SERVICE_PORT
    ? parseInt(process.env.CHAT_SERVICE_PORT, 10)
    : 4008;

const app = createApplication();
const httpServer = http.createServer(app);
initChatSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(
    `[ChatService] Multi-party Chat & AI Support running on http://localhost:${PORT} (Socket.IO enabled)`,
  );
  console.log(`[ChatService] Health check: http://localhost:${PORT}/health`);
  console.log(`[ChatService] Endpoints prefix: http://localhost:${PORT}/api/v1/chat`);
});
