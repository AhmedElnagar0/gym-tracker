import { createContext, useContext } from 'react';

// After a restore, every row in the database has changed underneath the screens, and
// Drizzle's live queries aren't notified (SQLite's backup copy fires no change events).
// The root layout provides this function: it remounts all screens so they re-read data.

export const ReloadDataContext = createContext<() => void>(() => {});

export function useReloadData(): () => void {
  return useContext(ReloadDataContext);
}
