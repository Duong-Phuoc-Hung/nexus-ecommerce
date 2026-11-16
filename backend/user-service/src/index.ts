import './loadEnv';
import { createApplication } from './app';
import { defaultOtpStore } from './infrastructure/cache/RedisOtpStore';

const PORT = process.env.PORT
  ? parseInt(process.env.PORT, 10)
  : process.env.USER_SERVICE_PORT
    ? parseInt(process.env.USER_SERVICE_PORT, 10)
    : 4001;
const app = createApplication();
void defaultOtpStore.warmUp();

app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(`[User Service] running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API Docs: http://localhost:${PORT}/api/v1/users/profile`);
  console.log('='.repeat(60));
});
