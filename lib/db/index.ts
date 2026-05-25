import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Lazy initialization - validated at runtime, not build time
function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url || url.includes('REPLACE_WITH')) {
    throw new Error('DATABASE_URL not configured. Create a Neon project at console.neon.tech and set DATABASE_URL in .env.local');
  }
  const sql = neon(url);
  return drizzle(sql, { schema });
}

let _db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!_db) _db = createDb();
  return _db;
}

// Convenience proxy - same API as before
export const db = new Proxy({} as ReturnType<typeof createDb>, {
  get(_, prop) {
    return getDb()[prop as keyof ReturnType<typeof createDb>];
  },
});

export * from './schema';
