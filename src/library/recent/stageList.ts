import type { Context } from 'hono'
import ShowroomLog from '@/database/schema/showroom/ShowroomLog'
import { StageList } from '@/database/showroomDB'
import { createError } from '@/utils/errorResponse'

export async function getStageList(c: Context): Promise<IStageListApi> {
  const data_id = c.req.param('data_id')
  const data = await ShowroomLog.findOne({ data_id }).select({ users: 1 })
  const stageListData = await StageList.findOne({ data_id }).lean()
  if (!stageListData || !data) {
    throw createError({ statusCode: 404, message: 'Not found!' })
  }

  const filteredUser = new Map<number, Database.IFansCompact>()
  const users = new Map<number, Database.IFansCompact>()

  for (const user of data.users) {
    users.set(user.user_id, {
      id: user.user_id,
      name: user.name,
      avatar_id: user.avatar_id,
    })
  }

  for (const stage_list of stageListData.stage_list) {
    for (const user of stage_list.list) {
      const u = users.get(user)
      if (u) { filteredUser.set(u.id, u) }
    }
  }

  return {
    stage_list: stageListData?.stage_list || [],
    users: [...filteredUser.values()],
  }
}
