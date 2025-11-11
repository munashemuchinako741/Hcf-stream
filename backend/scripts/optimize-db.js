const postgres = require('postgres');

// Database optimization script
(async () => {
  try {
    const sql = postgres('postgres://postgres:mumue20@localhost:5432/hcf_streaming');

    console.log('Starting database optimizations...');

    // Create indexes for frequently queried fields
    console.log('Creating indexes...');

    // Index on users.email for fast lookups during authentication
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;

    // Index on users.created_at for sorting and filtering
    await sql`CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)`;

    // Analyze tables for query optimization
    console.log('Analyzing tables...');
    await sql`ANALYZE users`;

    // Show current indexes
    const indexes = await sql`
      SELECT
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `;

    console.log('Current indexes:');
    console.table(indexes);

    // Show table statistics
    const stats = await sql`
      SELECT
        schemaname,
        relname as tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_rows,
        n_dead_tup as dead_rows
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
    `;

    console.log('Table statistics:');
    console.table(stats);

    console.log('Database optimization completed successfully!');
    await sql.end();
  } catch (e) {
    console.error('Database optimization error:', e.message);
    process.exit(1);
  }
})();
