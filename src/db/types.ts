import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import type * as schema from './schema';

/**
 * Any synchronous Drizzle SQLite database with our schema: expo-sqlite on the phone,
 * sql.js in tests. Repo functions take this instead of importing the phone's database,
 * so the same code can be tested against real SQLite on the laptop.
 */
// `any`: the run-result type differs per driver and no repo code uses it.
export type AppDb = BaseSQLiteDatabase<'sync', any, typeof schema>;
