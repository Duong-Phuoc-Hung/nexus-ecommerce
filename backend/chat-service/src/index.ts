import dotenv from 'dotenv';
import path from 'path';
import { createApplication } from './app';

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const PORT = process.env.PORT
  ? parseInt(process.env.PORT, 10)
  : process.env.CHAT_SERVICE_PORT
    ? parseInt(process.env.CHAT_SERVICE_PORT, 10)
    : 4008;

const app = createApplication();

app.listen(PORT, () => {
  console.log(`[ChatService] Multi-party Chat & AI Support running on http://localhost:${PORT}`);
  console.log(`[ChatService] Health check: http://localhost:${PORT}/health`);
  console.log(`[ChatService] Endpoints prefix: http://localhost:${PORT}/api/v1/chat`);
});
