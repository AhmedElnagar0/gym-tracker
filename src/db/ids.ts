import * as Crypto from 'expo-crypto';

// Text UUIDs (v4) for every primary key. Never autoincrement.
export function newId(): string {
  return Crypto.randomUUID();
}
