module.exports = {
  apps: [{
    name: 'motia-todo-app',
    script: 'npx',
    args: 'motia start --port 3000 --host 0.0.0.0',

    // Use fork mode for npx commands
    exec_mode: 'fork',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',

    // Graceful shutdown
    kill_timeout: 5000,

    // Environment variables
    env: {
      NODE_ENV: 'development',
      USE_REDIS: 'false',
    },
    env_production: {
      NODE_ENV: 'production',
      USE_REDIS: 'true',
      REDIS_URL: 'redis://localhost:6379',
    },

    // Logging
    error_file: './logs/motia-error.log',
    out_file: './logs/motia-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
  }]
}
