// backend/drizzle.config.js

/** @type {import('drizzle-kit').Config} */
module.exports = {
  schema: './schema/schema.js',
  out: './drizzle',

  // For drizzle-kit v0.20.x CLI
  driver: 'pg', // 👈 IMPORTANT

  dbCredentials: {
    connectionString: process.env.DATABASE_URL,
    // e.g. postgres://postgres:mumue20@localhost:5432/hcf_streaming
  },

  verbose: true,
  strict: true,
};
