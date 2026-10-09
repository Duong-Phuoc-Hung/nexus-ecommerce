import dotenv from 'dotenv';
import { createApplication } from './app';

dotenv.config();

const PORT = process.env.CATALOG_SERVICE_PORT
  ? parseInt(process.env.CATALOG_SERVICE_PORT, 10)
  : 3002;
const app = createApplication();

app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(`[Catalog Service] running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API Docs: http://localhost:${PORT}/api/v1/products`);
  console.log('='.repeat(60));
});
