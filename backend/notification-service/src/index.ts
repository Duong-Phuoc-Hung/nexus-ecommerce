import dotenv from 'dotenv';
import path from 'path';
import { createApplication } from './app';

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const PORT = process.env.PORT
  ? parseInt(process.env.PORT, 10)
  : process.env.NOTIFICATION_SERVICE_PORT
    ? parseInt(process.env.NOTIFICATION_SERVICE_PORT, 10)
    : 4006;
const app = createApplication();

app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(`[Notification Service] running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API Docs: http://localhost:${PORT}/api/v1/notifications/ntf_01hqz111welcome`);
  console.log('='.repeat(60));
});
