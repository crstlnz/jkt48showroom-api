import type { FormatType, LivePlatform, WeeklyData } from '..'
import dayjs from 'dayjs'
import FollowerData from '@/database/userDB/FollowerData'
import scrapeFollower from '../follower'
import { getMember } from '../query'

export default async function weeklyFollower(type: LivePlatform, format: FormatType): Promise<WeeklyData> {
  const liveType = (type !== 'idn' && type !== 'showroom') ? undefined : type
  const members = await getMember()
  const sample = await FollowerData.findOne({
    date: {
      $lte: dayjs().startOf('week').toDate(),
    },
  }).lean()
  const weeklyFollower = await FollowerData.find({ date: sample?.date }).lean()

  const followerMap = new Map<number, { idn: number, showroom: number }>()
  const followers = await scrapeFollower()

  for (const data of weeklyFollower) {
    const g = followerMap.get(data.showroom.id)
    followerMap.set(data.showroom.id, { idn: data?.idn?.follower ?? g?.idn ?? 0, showroom: data?.showroom?.follower ?? g?.showroom ?? 0 })
  }

  const sorted = members.map((m) => {
    const followerData = followerMap.get(m.showroom_id ?? 0)
    const currFollowers = followers.find(i => i.showroom.id === m.showroom_id)
    const follower = liveType === 'idn' ? followerData?.idn ?? 0 : (liveType === 'showroom' ? followerData?.showroom ?? 0 : (followerData?.idn ?? 0) + (followerData?.showroom ?? 0))
    const currFoll = currFollowers ? liveType === 'idn' ? currFollowers?.idn?.follower ?? 0 : (liveType === 'showroom' ? currFollowers?.showroom?.follower ?? 0 : (currFollowers?.idn?.follower ?? 0) + (currFollowers?.showroom?.follower ?? 0)) : 0

    let val: string | number = ''
    switch (format) {
      case 'normal':
        val = `+${currFoll - follower}`
        break
      case 'extended':
        val = `+${currFoll - follower}`
        break
      default:
        val = currFoll - follower
        break
    }
    return {
      member: m.info.nicknames?.[0] || m.name,
      pic: m.info.img,
      value: val,
      num_value: currFoll - follower,
    }
  }).sort((a, b) => {
    return b.num_value - a.num_value
  })

  return {
    title: 'WEEKLY TOP 5',
    subtitle: 'PENAMBAHAN FOLLOWER TERBANYAK',
    type: 'follower',
    platform: type,
    date: dayjs().toISOString(),
    data: sorted.map((d) => {
      return {
        ...d,
        num_value: undefined,
      }
    }),
  }
}
