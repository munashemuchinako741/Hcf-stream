const postgres = require('postgres');

(async () => {
  try {
    const sql = postgres('postgres://postgres:mumue20@localhost:5432/hcf_streaming');
    const result = await sql`SELECT * FROM users`;
    console.log('Users:', result);
    await sql.end();
  } catch (e) {
    console.log('Error:', e.message);
  }
})();
