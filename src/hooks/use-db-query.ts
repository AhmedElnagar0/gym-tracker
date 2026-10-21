import { getTableConfig, type SQLiteTable } from 'drizzle-orm/sqlite-core';
import { addDatabaseChangeListener } from 'expo-sqlite';
import { useEffect, useState } from 'react';

/**
 * Reads data synchronously and re-reads it whenever any of `tables` changes.
 *
 * Use this instead of Drizzle's useLiveQuery when a screen's data comes from more than
 * one table: useLiveQuery only watches the query's main table, so e.g. a list of
 * exercises-with-sets wouldn't refresh after logging a set.
 *
 * `read` runs on every render. Our queries are synchronous and small, so that's cheap,
 * and it can never show stale data.
 */
export function useDbQuery<T>(read: () => T, tables: readonly SQLiteTable[]): T {
  // Opt out of the React Compiler's automatic memoisation: it could otherwise keep
  // returning an earlier read() result, because read() doesn't depend on `version`.
  'use no memo';
  const [, setVersion] = useState(0);
  const names = tables.map((t) => getTableConfig(t).name).join('|');

  useEffect(() => {
    const watched = new Set(names.split('|'));
    const subscription = addDatabaseChangeListener(({ tableName }) => {
      if (watched.has(tableName)) setVersion((v) => v + 1);
    });
    return () => subscription.remove();
  }, [names]);

  return read();
}
