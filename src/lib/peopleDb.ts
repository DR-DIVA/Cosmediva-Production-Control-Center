import pg from 'pg';

const Pool = (pg as any).Pool || (pg as any).default?.Pool;

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const dbUser = 'postgres.yzwldawflteyywuetzcw';
const dbHost = 'aws-0-ap-southeast-1.pooler.supabase.com';
const dbPort = '6543';
const dbName = 'postgres';

const connectionString = `postgres://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;

// Global pool to prevent connection exhaustion in Next.js dev hot-reload
declare global {
  // eslint-disable-next-line no-var
  var __peoplePgPool: any | undefined;
}

export const peoplePool = global.__peoplePgPool || new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

if (process.env.NODE_ENV !== 'production') {
  global.__peoplePgPool = peoplePool;
}

export async function queryPeople<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }> {
  const start = Date.now();
  const res = await peoplePool.query(text, params);
  const duration = Date.now() - start;
  if (duration > 1000) {
    console.warn(`[peopleDb] Slow query (${duration}ms):`, text.slice(0, 100));
  }
  return { rows: res.rows as T[], rowCount: res.rowCount ?? 0 };
}

export async function withTransaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
  const client = await peoplePool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
