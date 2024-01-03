const fansMaxSize = 50

export function calculateFansPoints(usersData: Log.ShowroomMiniUser[], stageList: Database.IStage[]) {
  const fansRanks: Map<string | number, number> = new Map()
  const users: Map<string | number, Stats.IFans> = new Map()
  for (const user of usersData) {
    users.set(user.user_id, {
      name: user.name,
      avatar_id: user.avatar_id,
      id: user.user_id,
    })
  }

  for (const stage of stageList ?? []) {
    for (const [i, id] of stage.list.entries()) {
      const point = getRankPoints(i)
      if (fansRanks.has(id)) {
        fansRanks.set(id, (fansRanks.get(id) ?? 0) + point)
      }
      else {
        fansRanks.set(id, point)
      }
    }
  }

  return Array.from(fansRanks, ([user_id, fans_point]): Stats.IStatFans => {
    const user = users.get(user_id) ?? {
      name: 'User not found!',
      avatar_id: 1,
    }
    return {
      id: Number(user_id),
      name: user.name,
      avatar_id: user.avatar_id,
      fans_point,
    }
  })
    .sort((a, b) => b.fans_point - a.fans_point)
    .slice(0, fansMaxSize)
}

function getRankPoints(rank: number) {
  return 100 - rank + 1
}
