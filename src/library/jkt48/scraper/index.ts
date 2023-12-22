import dayjs from 'dayjs'
import { getNews, getNewsPage } from './news'
import { getCalendarEventsByUrl } from './schedule'
import { getTheaterDetail } from './theater'
import { getTheaterId } from './utils'
import Config from '@/database/schema/config/Config'
import News from '@/database/showroomDB/jkt48/News'
import MemberJKT48 from '@/database/showroomDB/jkt48/Member'
import Schedule from '@/database/showroomDB/jkt48/Schedule'
import Theater from '@/database/showroomDB/jkt48/Theater'

export async function getJKT48Headers() {
  const cookies = await Config.findOne({ configname: 'cookies_jkt48' })
  const userAgent = await Config.findOne({ configname: 'useragent_jkt48' })
  return {
    'Cookie': cookies?.value || '',
    'User-Agent': userAgent?.value || '',
  }
}

export async function fetchNewsJKT48() {
  const headers = await getJKT48Headers()
  const newsList = await getNewsPage(1, undefined, headers)
  for (const news of newsList) {
    const isExists = await News.exists({ id: news.id })
    if (!isExists) {
      const newsDetail = await getNews(news.id, headers)
      await News.updateOne(
        { id: newsDetail.id },
        {
          $set: {
            ...newsDetail,
            label: news.label,
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
          runValidators: true,
        },
      )
    }
  }
}

export async function fetchScheduleJKT48() {
  const now = dayjs()
  const nextMonth = dayjs().add(1, 'month')
  const headers = await getJKT48Headers()
  const schedules = [
    ...await getCalendarEventsByUrl(`/calendar/list/y/${now.year()}/m/${now.month() + 1}/d/1`, 0, headers),
    ...await getCalendarEventsByUrl(`/calendar/list/y/${nextMonth.year()}/m/${nextMonth.month() + 1}/d/1`, 0, headers),
  ]

  for (const schedule of schedules) {
    await Schedule.updateOne(
      { id: schedule.id },
      {
        id: schedule.id,
        label: schedule.label,
        title: schedule.title,
        url: schedule.url,
        date: schedule.date,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      },
    )

    if (schedule.url.startsWith('/theater/schedule/id')) {
      const theaterData = await getTheaterDetail(getTheaterId(schedule.url) ?? '0', 0, headers)
      for (const member of theaterData.members) {
        await MemberJKT48.updateOne(
          { id: member.id },
          {
            id: member.id,
            name: member.name,
            url: member.url,
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
            runValidators: true,
          },
        )
      }
      for (const theaterDetail of theaterData.show) {
        console.log(theaterDetail.setlistId)
        await Theater.updateOne(
          { id: theaterDetail.id },
          {
            id: theaterDetail.id,
            title: theaterDetail.title,
            url: theaterDetail.url,
            setlistId: theaterDetail.setlistId,
            memberIds: theaterDetail.memberIds,
            seitansaiIds: theaterDetail.seitansaiIds,
            date: theaterDetail.date,
            team: theaterDetail.team,
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
            runValidators: true,
          },
        )
      }
    }
  }
}
