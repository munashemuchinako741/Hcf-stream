import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './schema/schema.js',   // this file must exist
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
