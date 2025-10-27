import type { Context } from 'hono'
import dayjs from 'dayjs'
import IdolMember from '@/database/schema/48group/IdolMember'
import Member from '@/database/schema/48group/Member'
import Showroom from '@/database/schema/showroom/Showroom'
import cache from '@/utils/cache'
import { createError } from '@/utils/errorResponse'

export async function getMemberBirthdays(c: Context) {
  const group = c.req.query('group')
  const cacheKey = group ? `${group}-birthday` : 'birthday'
  const data = await cache
    .fetch<BirthdayData>(cacheKey, () => birthDayThisMonth(group as string), 86400000)
  if (new Date(data.date).getMonth() === new Date().getMonth()) {
    return data.data
  }
  else {
    const newData = await birthDayThisMonth(group as string)
    cache.set(cacheKey, newData)
    return newData.data
  }
}

async function birthDayThisMonth(group: string | null = null): Promise<BirthdayData> {
  const currentMonth = new Date().getMonth() + 1
  const options: { group?: string, isGraduate?: boolean } = {
    isGraduate: false,
  }
  if (group) options.group = group
  const data = await Member.aggregate([
    {
      $match: {
        ...options,
        $expr: {
          $eq: [{ $month: '$birthdate' }, currentMonth],
        },
      },
    },
  ]).exec()

  if (!data) throw createError({ statusMessage: 'Data not found!', statusCode: 404 })
  const result = []
  for (const member of data) {
    const showroom = member.showroom_id ? await Showroom.findOne({ room_id: member.showroom_id }) : null
    result.push({
      name: member.nicknames?.length ? member.nicknames[0] : member.name,
      birthdate: member.birthdate,
      img: member.img,
      room_id: member.showroom_id,
      url_key: showroom?.url,
    })
  }

  return {
    data: result,
    date: new Date(),
  }
}

export async function nextBirthDay(c: Context) {
  const group = c.req.query('group')
  const today = dayjs()
  const month = today.month()
  const membersData = await IdolMember.find({ 'info.is_graduate': false, '$and': [{ group: { $ne: 'official' } }, { group }] }).lean()
  const members = membersData.map((i) => {
    return {
      ...i,
      birthdate: dayjs(i.info.birthdate),
    }
  }).sort((a, b) => {
    if (a.birthdate.month() === b.birthdate.month()) {
      return a.birthdate.date() - b.birthdate.date()
    }
    else {
      return Math.abs(a.birthdate.month() - month) - Math.abs(b.birthdate.month() - month)
    }
  })

  const lewat = members.filter((i) => {
    if (i.birthdate.month() === month) {
      return i.birthdate.date() < today.date()
    }
    else {
      return i.birthdate.month() < month
    }
  })
  const next = members.filter((i) => {
    if (i.birthdate.month() === month) {
      return i.birthdate.date() >= today.date()
    }
    else {
      return i.birthdate.month() > month
    }
  })

  const birthdays = [...next, ...lewat].slice(0, 6)

  const result = []
  for (const member of birthdays) {
    // const showroom = member.showroom_id ? await Showroom.findOne({ room_id: member.showroom_id }) : null
    result.push({
      name: member.info?.nicknames?.length ? member.info.nicknames[0] : member.name,
      birthdate: member.birthdate,
      img: member.info?.img,
      room_id: member.showroom_id,
      url_key: member?.slug,
    })
  }

  return result
}
