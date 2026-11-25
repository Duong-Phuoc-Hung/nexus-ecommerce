import { Pool } from 'pg';

let sharedPool: Pool | null = null;

export function getNotificationPool(): Pool {
  if (sharedPool) return sharedPool;

  const connectionString = process.env.NOTIFICATION_DATABASE_URL || process.env.DATABASE_URL;

  if (connectionString && connectionString.includes('5437')) {
    sharedPool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  } else {
    const rawHost = process.env.NOTIFICATION_DB_HOST || process.env.DB_HOST || '127.0.0.1';
    const host = rawHost === 'localhost' ? '127.0.0.1' : rawHost;
    const port = Number(process.env.NOTIFICATION_DB_PORT || 5437);
    const user = process.env.NOTIFICATION_DB_USER || process.env.DB_USER || 'nexus_user';
    const password =
      process.env.NOTIFICATION_DB_PASSWORD || process.env.DB_PASSWORD || 'nexus_password';
    const database = process.env.NOTIFICATION_DB_NAME || 'nexus_notification_db';

    sharedPool = new Pool({
      host,
      port,
      user,
      password,
      database,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }

  sharedPool.on('error', (err: Error) => {
    console.error('[NotificationService Pool Error]:', err.message);
  });

  return sharedPool;
}
