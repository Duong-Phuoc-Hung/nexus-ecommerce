import dotenv from 'dotenv';
import path from 'path';
import { createApplication } from './app';

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const PORT = process.env.PORT
  ? parseInt(process.env.PORT, 10)
  : process.env.USER_SERVICE_PORT
    ? parseInt(process.env.USER_SERVICE_PORT, 10)
    : 4001;
const app = createApplication();

app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(`[User Service] running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API Docs: http://localhost:${PORT}/api/v1/users/profile`);
  console.log('='.repeat(60));
});
