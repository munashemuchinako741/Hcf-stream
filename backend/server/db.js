// server/db.js
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const schema = require('../schema/schema'); // 👈 go up one, into schema

const client = postgres(process.env.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

const db = drizzle(client, { schema });

module.exports = { db, client };
