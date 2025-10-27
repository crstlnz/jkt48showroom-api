import type { Context } from 'hono'
import IdolMember from '@/database/schema/48group/IdolMember'
import Showroom from '@/database/schema/showroom/Showroom'
import { createError } from '@/utils/errorResponse'

export async function setMemberData(c: Context) {
  const query = c.req.query()
  const roomId = query.room_id
  const memberDataId = query.memberDataId
  if (!memberDataId || !roomId) throw createError({ status: 400, message: 'Bad response!' })

  await Showroom.updateOne({
    room_id: roomId,
  }, {
    $set: {
      member_data: memberDataId,
    },
  })

  await IdolMember.updateOne({
    _id: memberDataId,
  }, {
    $set: {
      showroom_id: roomId,
    },
  })

  return {
    code: 200,
    message: 'Request success!',
  }
}
