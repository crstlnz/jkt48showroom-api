module.exports = {
  apps: [
    {
      name: 'module-api',
      script: 'bun',
      args: 'dev',
      cron_restart: '0 * * * *',
      exec_mode: 'fork',
      instance: 1,
      max_memory_restart: '400M',
    },
  ],
}
