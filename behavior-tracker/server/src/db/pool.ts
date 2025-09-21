import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function setRLSContext(client: any, orgId: string, userId: string, role: string) {
  await client.query(`SET LOCAL app.current_org_id = $1`, [orgId]);
  await client.query(`SET LOCAL app.current_user_id = $1`, [userId]);
  await client.query(`SET LOCAL app.current_role = $1`, [role]);
}

export async function withTransaction<T>(
  fn: (client: any) => Promise<T>,
  context?: { orgId: string; userId: string; role: string }
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (context) {
      await setRLSContext(client, context.orgId, context.userId, context.role);
    }

    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}