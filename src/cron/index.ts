import { CronJob } from 'cron'
import { scrapeAndStoreCompetitionRanking } from '@/library/showroomCompetition/ranking'
import { prebuildLastMonthStats } from '@/library/stats'

export async function startCron() {
  if (process.env.NODE_ENV === 'development') return
  CronJob.from({
    cronTime: '0 3 1 * *', // At 03:00 on day-of-month 1.
    async onTick() {
      await prebuildLastMonthStats().catch((e) => {
        console.error('Failed prebuild monthly stats', e)
      })
    },
    start: true,
    timeZone: 'Asia/Jakarta',
  })

  CronJob.from({
    cronTime: '*/5 * * * *',
    async onTick() {
      scrapeAndStoreCompetitionRanking().then((res) => {
        console.log(res)
      })
    },
    start: true,
    timeZone: 'Asia/Jakarta',
  })
}
