import { calculateFansPoints } from './fansPoints'

export function calculateRanks(logs: Log.Showroom[], stageListData: Database.IStageListItem[]): Stats.CalculatedRanks {
  const memberRanks: Map<string | number, Stats.IStatMember> = new Map()

  for (const log of logs) {
    if (memberRanks.has(log.room_id)) {
      const member = memberRanks.get(log.room_id)
      if (member) {
        const viewer = log.live_info?.viewers?.peak ?? 0
        const duration = new Date(log?.live_info?.date?.end).getTime() - new Date(log?.live_info?.date?.start).getTime()
        member.live_count += 1
        member.total_viewer += log?.live_info?.viewers?.peak ?? 0
        member.point += log.total_gifts
        member.most_viewer = viewer > member.most_viewer ? viewer : member.most_viewer
        member.duration = duration > member.duration ? duration : member.duration
        member.most_point = log?.total_gifts > member.most_point ? log?.total_gifts : member.most_point
      }
    }
    else {
      memberRanks.set(log.room_id, {
        room_id: log.room_id,
        name: log.room_info?.name ?? 'Member not Found!',
        img:
            log.room_info?.member_data?.info?.img
            || log.room_info?.img
            || 'https://image.showroom-cdn.com/showroom-prod/assets/img/v3/img-err-404.jpg?t=1602821561',
        url: log.room_info?.url ?? '',
        live_count: 1,
        total_viewer: log?.live_info?.viewers?.peak ?? 0,
        duration: new Date(log?.live_info?.date?.end).getTime() - new Date(log?.live_info?.date?.start).getTime(),
        point: log.total_gifts,
        most_viewer: log.live_info?.viewers?.peak ?? 0,
        most_point: log.total_gifts,
      })
    }
  }

  const users = logs.reduce<Log.ShowroomMiniUser[]>((a, b) => {
    for (const user of b.users ?? []) {
      a.push({
        name: user.name,
        avatar_id: user.avatar_id,
        comments: user.comments,
        user_id: Number(user.user_id),
      })
    }
    return a
  }, [] as Log.ShowroomMiniUser[])

  const stageList = stageListData.reduce<Database.IStage[]>((a, b) => {
    a.push(...(b.stage_list ?? []))
    return a
  }, [] as RecentDetails.IStageList[])

  return {
    member: Array.from(memberRanks.values()).sort((a, b) => b.point - a.point),
    fans: calculateFansPoints(users, stageList),
  }
}
