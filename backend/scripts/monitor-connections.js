const postgres = require('postgres');

// Connection pool monitoring script
(async () => {
  try {
    const sql = postgres('postgres://postgres:mumue20@localhost:5432/hcf_streaming');

    console.log('Monitoring database connections...\n');

    // Get active connections
    const activeConnections = await sql`
      SELECT
        count(*) as active_connections,
        state,
        datname as database_name
      FROM pg_stat_activity
      WHERE datname = 'hcf_streaming'
      GROUP BY state, datname
    `;

    console.log('Active Connections:');
    console.table(activeConnections);

    // Get connection pool stats
    const poolStats = await sql`
      SELECT
        setting as max_connections
      FROM pg_settings
      WHERE name = 'max_connections'
    `;

    console.log('Connection Pool Configuration:');
    console.table(poolStats);

    // Get current connection count
    const currentConnections = await sql`
      SELECT count(*) as current_connections
      FROM pg_stat_activity
      WHERE datname = 'hcf_streaming'
    `;

    console.log('Current Connection Count:');
    console.table(currentConnections);

    // Monitor query performance (if pg_stat_statements is available)
    try {
      const slowQueries = await sql`
        SELECT
          query,
          calls,
          total_time,
          mean_time,
          rows
        FROM pg_stat_statements
        WHERE mean_time > 1000  -- Queries taking more than 1 second on average
        ORDER BY mean_time DESC
        LIMIT 10
      `;

      if (slowQueries.length > 0) {
        console.log('\nSlow Queries (avg > 1s):');
        console.table(slowQueries);
      } else {
        console.log('\nNo slow queries detected.');
      }
    } catch (e) {
      console.log('\nQuery performance monitoring not available (pg_stat_statements extension not enabled).');
    }

    console.log('\nConnection monitoring completed.');
    await sql.end();
  } catch (e) {
    console.error('Monitoring error:', e.message);
    process.exit(1);
  }
})();
