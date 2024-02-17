import { CronJob } from 'cron'

export function startCron() {
  CronJob.from({
    cronTime: '0 3 1 * *', // At 03:00 on day-of-month 1.
    onTick() {
      console.log('WEW')
    },
    start: true,
    timeZone: 'Asia/Jakarta',
  }).start()
}
