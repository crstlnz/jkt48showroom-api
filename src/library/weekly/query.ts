import dayjs from 'dayjs'
import type { LivePlatform } from '.'
import IdolMember from '@/database/schema/48group/IdolMember'
import LiveLog from '@/database/live/schema/LiveLog'

export async function getMember() {
  return await IdolMember.find({
    'info.is_graduate': false,
    'group': 'jkt48',
  })
}

export async function getOneWeekLives(members: IdolMember[], type: LivePlatform) {
  const liveType = (type !== 'idn' && type !== 'showroom') ? undefined : type
  const query: Record<string, any> = {
    'room_id': members.map(i => i.showroom_id),
    'live_info.date.end': {
      $gte: dayjs().subtract(7, 'day').startOf('day'),
    },
  }
  if (liveType) {
    query.type = liveType
  }
  return await LiveLog.find(query)
}
