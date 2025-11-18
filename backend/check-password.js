const postgres = require('postgres');

(async () => {
  try {
    const sql = postgres('postgres://postgres:mumue20@localhost:5432/hcf_streaming');
    const result = await sql`SELECT password FROM users WHERE email = 'munashemuchinako741@gmail.com'`;
    console.log('Current password hash:', result[0].password);
    console.log('Length:', result[0].password.length);
    await sql.end();
  } catch (e) {
    console.log('Error:', e.message);
  }
})();
