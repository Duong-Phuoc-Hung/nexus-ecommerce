import dotenv from 'dotenv';
import path from 'path';
import { createApplication } from './app';

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const PORT = process.env.PORT
  ? parseInt(process.env.PORT, 10)
  : process.env.CATALOG_SERVICE_PORT
    ? parseInt(process.env.CATALOG_SERVICE_PORT, 10)
    : 4002;
const app = createApplication();

app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(`[Catalog Service] running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API Docs: http://localhost:${PORT}/api/v1/products`);
  console.log('='.repeat(60));
});
