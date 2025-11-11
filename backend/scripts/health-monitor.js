const cron = require('node-cron');
const postgres = require('postgres');
const { createClient } = require('redis');
// ❌ REMOVE node-fetch, Node 20 already has global fetch
// const fetch = require('node-fetch');
const logger = require('../config/logger');

// Health monitoring configuration
const MONITOR_INTERVAL = process.env.MONITOR_INTERVAL || '*/5 * * * *'; // Every 5 minutes
const ALERT_THRESHOLD = {
  dbConnections: 80, // Alert if > 80% of max connections used
  redisMemory: 80, // Alert if > 80% memory used
  responseTime: 2000, // Alert if avg response time > 2s
};

// Database health check
async function checkDatabaseHealth() {
  let client;
  try {
    client = postgres(process.env.DATABASE_URL);
    const startTime = Date.now();

    // Check connection
    await client`SELECT 1`;

    // Check active connections
    const connections =
      await client`SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active'`;

    const responseTime = Date.now() - startTime;

    const health = {
      status: 'healthy',
      responseTime,
      activeConnections: parseInt(connections[0].active_connections, 10),
      timestamp: new Date().toISOString(),
    };

    // Check thresholds
    if (health.activeConnections > ALERT_THRESHOLD.dbConnections) {
      health.status = 'warning';
      health.message = `High database connections: ${health.activeConnections}`;
    }

    if (responseTime > ALERT_THRESHOLD.responseTime) {
      health.status = 'warning';
      health.message = `Slow database response: ${responseTime}ms`;
    }

    return health;
  } catch (error) {
    logger.error('Database health check failed:', error);
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  } finally {
    if (client) await client.end();
  }
}

// Redis health check
async function checkRedisHealth() {
  let client;
  try {
    const redisHost = process.env.REDIS_HOST || 'redis'; // <- adjust to your service name if needed
    const redisPort = process.env.REDIS_PORT || 6379;

    client = createClient({
      url: `redis://${redisHost}:${redisPort}`,
    });

    client.on('error', (err) => {
      logger.error('Redis client error in health check:', err);
    });

    await client.connect();
    const startTime = Date.now();

    // Basic ping check
    const pong = await client.ping();
    if (pong !== 'PONG') {
      throw new Error(`Unexpected PING response from Redis: ${pong}`);
    }

    // Get memory info (defensive parsing)
    const info = await client.info('memory');

    let usedMemory = 0;
    let maxMemory = 0;

    const usedMatch = info.match(/used_memory:(\d+)/);
    if (usedMatch) {
      usedMemory = parseInt(usedMatch[1], 10);
    }

    const maxMatch = info.match(/maxmemory:(\d+)/);
    if (maxMatch) {
      maxMemory = parseInt(maxMatch[1], 10);
    }

    const responseTime = Date.now() - startTime;

    const memoryUsagePercent =
      maxMemory > 0 ? (usedMemory / maxMemory) * 100 : 0;

    const health = {
      status: 'healthy',
      responseTime,
      usedMemory,
      maxMemory,
      memoryUsagePercent,
      timestamp: new Date().toISOString(),
    };

    // Check thresholds
    if (memoryUsagePercent > ALERT_THRESHOLD.redisMemory) {
      health.status = 'warning';
      health.message = `High Redis memory usage: ${memoryUsagePercent.toFixed(
        1,
      )}%`;
    }

    return health;
  } catch (error) {
    logger.error('Redis health check failed:', error);
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  } finally {
    if (client) {
      try {
        await client.quit();
      } catch (e) {
        // ignore
      }
    }
  }
}

// Application health check
async function checkApplicationHealth() {
  try {
    // Uses Node 20 global fetch
    const response = await fetch('http://localhost:5000/health');
    let data = {};
    try {
      data = await response.json();
    } catch (e) {
      // if health endpoint doesn’t return JSON, ignore
    }

    const health = {
      status: response.ok ? 'healthy' : 'unhealthy',
      uptime: data.uptime,
      pid: data.pid,
      timestamp: data.timestamp || new Date().toISOString(),
    };

    return health;
  } catch (error) {
    logger.error('Application health check failed:', error);
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

// Comprehensive health check
async function performHealthCheck() {
  logger.info('Performing comprehensive health check...');

  const [dbHealth, redisHealth, appHealth] = await Promise.all([
    checkDatabaseHealth(),
    checkRedisHealth(),
    checkApplicationHealth(),
  ]);

  const overallHealth = {
    timestamp: new Date().toISOString(),
    services: {
      database: dbHealth,
      redis: redisHealth,
      application: appHealth,
    },
  };

  // Determine overall status
  const services = [dbHealth, redisHealth, appHealth];
  const unhealthyServices = services.filter((s) => s.status === 'unhealthy');
  const warningServices = services.filter((s) => s.status === 'warning');

  if (unhealthyServices.length > 0) {
    overallHealth.status = 'unhealthy';
    overallHealth.message = `Unhealthy services: ${unhealthyServices
      .map((s) =>
        Object.keys(overallHealth.services).find(
          (key) => overallHealth.services[key] === s,
        ),
      )
      .join(', ')}`;
  } else if (warningServices.length > 0) {
    overallHealth.status = 'warning';
    overallHealth.message = `Warning services: ${warningServices
      .map((s) =>
        Object.keys(overallHealth.services).find(
          (key) => overallHealth.services[key] === s,
        ),
      )
      .join(', ')}`;
  } else {
    overallHealth.status = 'healthy';
  }

  // Log health status
  logger.info(`Health check completed: ${overallHealth.status}`, {
    database: dbHealth.status,
    redis: redisHealth.status,
    application: appHealth.status,
  });

  // Alert on critical issues
  if (overallHealth.status === 'unhealthy') {
    logger.error('CRITICAL: System health check failed', overallHealth);
  } else if (overallHealth.status === 'warning') {
    logger.warn('WARNING: System health check issues detected', overallHealth);
  }

  return overallHealth;
}

// Start monitoring
function startHealthMonitoring() {
  logger.info(`Starting health monitoring with interval: ${MONITOR_INTERVAL}`);

  // Run initial health check
  performHealthCheck();

  // Schedule recurring health checks
  cron.schedule(MONITOR_INTERVAL, async () => {
    try {
      await performHealthCheck();
    } catch (error) {
      logger.error('Health monitoring error:', error);
    }
  });
}

// Manual health check function
async function manualHealthCheck() {
  return await performHealthCheck();
}

module.exports = {
  startHealthMonitoring,
  manualHealthCheck,
  checkDatabaseHealth,
  checkRedisHealth,
  checkApplicationHealth,
};
