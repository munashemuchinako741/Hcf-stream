const postgres = require('postgres');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    const sql = postgres('postgres://postgres:mumue20@localhost:5432/hcf_streaming');
    const hash = await bcrypt.hash('mumue20', 10);
    console.log('New hash:', hash);
    await sql`UPDATE users SET password = ${hash} WHERE email = 'munashemuchinako741@gmail.com'`;
    console.log('Password updated');
    await sql.end();
  } catch (e) {
    console.log('Error:', e.message);
  }
})();
