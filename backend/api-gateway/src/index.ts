import path from 'path';
import dotenv from 'dotenv';
import { createApplication } from './app';

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const PORT = process.env.PORT
  ? parseInt(process.env.PORT, 10)
  : process.env.GATEWAY_PORT
    ? parseInt(process.env.GATEWAY_PORT, 10)
    : 4000;
const app = createApplication();

app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(`[API Gateway] running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Swagger UI: http://localhost:${PORT}/api-docs`);
  console.log(`Service Directory: http://localhost:${PORT}/api/v1`);
  console.log('='.repeat(60));
});
