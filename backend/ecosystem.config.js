module.exports = {
  apps: [{
    name: 'hcf-stream-backend',
    script: 'server.js',
    instances: 'max', // Use all available CPU cores
    exec_mode: 'cluster', // Enable cluster mode
    env: {
      NODE_ENV: 'development',
      PORT: 5000,
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000,
    },
    // Logging
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    // Restart policy
    max_restarts: 10,
    min_uptime: '10s',
    // Memory management
    max_memory_restart: '1G',
    // Health checks
    health_check: {
      enabled: true,
      max_restarts: 5,
      min_uptime: '5s',
    },
  }],
};
