import dotenv from 'dotenv';
import { createApplication } from './app';

dotenv.config();

const PORT = process.env.PORT
  ? parseInt(process.env.PORT, 10)
  : process.env.FULFILLMENT_SERVICE_PORT
    ? parseInt(process.env.FULFILLMENT_SERVICE_PORT, 10)
    : 4005;
const app = createApplication();

app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(`[Fulfillment Service] running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API Docs: http://localhost:${PORT}/api/v1/fulfillments/shipments/shp_01hqz222trk`);
  console.log('='.repeat(60));
});
