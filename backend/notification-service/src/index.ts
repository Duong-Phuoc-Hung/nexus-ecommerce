import path from 'path';
import dotenv from 'dotenv';
import { createApplication } from './app';
import { RabbitMqEventPublisher } from './infrastructure/messaging/RabbitMqEventPublisher';

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const PORT = process.env.PORT
  ? parseInt(process.env.PORT, 10)
  : process.env.NOTIFICATION_SERVICE_PORT
    ? parseInt(process.env.NOTIFICATION_SERVICE_PORT, 10)
    : 4006;

const eventPublisher = new RabbitMqEventPublisher();
const app = createApplication({ eventPublisher });

app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(`[Notification Service] running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(
    `Storage mode: ${process.env.USE_IN_MEMORY_DB === 'true' ? 'in-memory' : 'postgresql'}`,
  );
  console.log('='.repeat(60));

  // Ghi nhận sự kiện khởi động vào notification_event_log qua GlobalEventAuditSubscriber
  void eventPublisher.publish(
    'NotificationServiceBooted',
    { port: PORT, startedAt: new Date().toISOString() },
    'notification-service',
  );
});
