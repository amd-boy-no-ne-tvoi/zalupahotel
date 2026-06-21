module.exports = {
  apps: [
    {
      name: 'pet-hotel-api',
      script: './apps/backend/dist/index.js',
      cwd: '/var/www/pet-hotel',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_file: './apps/backend/.env',
      error_file: '/var/log/pet-hotel/error.log',
      out_file: '/var/log/pet-hotel/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
}
