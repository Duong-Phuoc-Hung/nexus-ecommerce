import dotenv from 'dotenv';
import path from 'path';
import { createApplication } from './app';
import { ExpiredOrderCleanupWorker } from './infrastructure/workers/ExpiredOrderCleanupWorker';

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const PORT = process.env.PORT
  ? parseInt(process.env.PORT, 10)
  : process.env.COMMERCE_SERVICE_PORT
    ? parseInt(process.env.COMMERCE_SERVICE_PORT, 10)
    : 4003;
const app = createApplication();

app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(`[Commerce Service] running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API Docs: http://localhost:${PORT}/api/v1/orders/ord_01hqz555abc`);
  console.log('='.repeat(60));

  // SCRUM-173: Khởi động Background Cron Worker tự động hủy đơn quá hạn 15 phút
  if (process.env.NODE_ENV !== 'test') {
    const cleanupWorker = new ExpiredOrderCleanupWorker();
    cleanupWorker.start(60000); // Quét mỗi 1 phút
    console.log(
      '[ExpiredOrderCleanupWorker] Started periodic expired order cleanup (1m interval).',
    );
  }
});
