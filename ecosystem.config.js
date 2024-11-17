require('dotenv').config()

module.exports = {
  apps: [
    {
      name: 'api',
      script: 'pnpm',
      args: 'start',
      cron_restart: '0 * * * *',
      exec_mode: 'fork',
      instance: 1,
      max_memory_restart: '400M',
    },
  ],
}
