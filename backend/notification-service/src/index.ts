import dotenv from 'dotenv';
import { createApplication } from './app';

dotenv.config();

const PORT = process.env.NOTIFICATION_SERVICE_PORT
  ? parseInt(process.env.NOTIFICATION_SERVICE_PORT, 10)
  : 3006;
const app = createApplication();

app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(`[Notification Service] running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API Docs: http://localhost:${PORT}/api/v1/notifications/ntf_01hqz111welcome`);
  console.log('='.repeat(60));
});
