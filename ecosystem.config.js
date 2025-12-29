// PM2 Ecosystem Configuration
// Use: pm2 start ecosystem.config.js

module.exports = {
  apps: [{
    name: 'attendance-app',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/attendance-app',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
}

