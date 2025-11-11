require('dotenv').config();
const postgres = require('postgres');

(async () => {
  try {
    const sql = postgres(process.env.DATABASE_URL);
    const result = await sql`SELECT 1`;
    console.log('Connection successful:', result);
    await sql.end();
  } catch (e) {
    console.log('Connection error:', e.message);
  }
})();
