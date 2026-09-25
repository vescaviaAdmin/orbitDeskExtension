import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const dbUrl = process.env.NEON_CONNECTION_STRING;

if (!dbUrl) {
  throw new Error('NEON_CONNECTION_STRING is missing');
}

const sql = neon(dbUrl);

async function verifyNeonDb() {
  await sql`SELECT 1 AS connected`;
  console.log('[Neon] Database connection verified.');
}


export { sql, verifyNeonDb };
