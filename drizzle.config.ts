import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  // 'expo' makes drizzle-kit also emit drizzle/migrations.js, which the app imports.
  driver: 'expo',
});
