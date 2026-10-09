import dotenv from 'dotenv';
import { createApplication } from './app';

dotenv.config();

const PORT = process.env.USER_SERVICE_PORT ? parseInt(process.env.USER_SERVICE_PORT, 10) : 3001;
const app = createApplication();

app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(`[User Service] running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API Docs: http://localhost:${PORT}/api/v1/users/profile`);
  console.log('='.repeat(60));
});
