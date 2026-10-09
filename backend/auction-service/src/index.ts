import dotenv from 'dotenv';
import { createApplication } from './app';

dotenv.config();

const PORT = process.env.AUCTION_SERVICE_PORT
  ? parseInt(process.env.AUCTION_SERVICE_PORT, 10)
  : 3004;
const app = createApplication();

app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(`[Auction Service] running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API Docs: http://localhost:${PORT}/api/v1/auctions`);
  console.log('='.repeat(60));
});
