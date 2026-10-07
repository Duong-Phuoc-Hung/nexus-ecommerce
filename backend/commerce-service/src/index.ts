import dotenv from 'dotenv';
import { createApplication } from './app';

dotenv.config();

const PORT = process.env.COMMERCE_SERVICE_PORT
  ? parseInt(process.env.COMMERCE_SERVICE_PORT, 10)
  : 3003;
const app = createApplication();

app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(`🚀 [Commerce Service] running on http://localhost:${PORT}`);
  console.log(`🩺 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 API Docs: http://localhost:${PORT}/api/v1/orders/ord_01hqz555abc`);
  console.log('='.repeat(60));
});
