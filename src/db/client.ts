import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import { DB_NAME } from '@/config';

import * as schema from './schema';

// enableChangeListener lets Drizzle's useLiveQuery re-render screens when data changes.
// PRAGMAs (foreign keys, WAL) are set in init.ts, which must finish before any query.
export const sqlite = openDatabaseSync(DB_NAME, { enableChangeListener: true });

export const db = drizzle(sqlite, { schema });

export type Db = typeof db;
