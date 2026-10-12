import dotenv from 'dotenv';
import { createApplication } from './app';

dotenv.config();

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
  console.log(`Service Directory: http://localhost:${PORT}/api/v1`);
  console.log('='.repeat(60));
});
