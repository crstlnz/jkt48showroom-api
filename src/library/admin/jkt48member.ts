import JKT48Member from '@/database/showroomDB/jkt48/Member'

export async function getJKT48Members(): Promise<JKT48.Member[]> {
  try {
    const members = await JKT48Member.find({})
      .lean()

    return (members as unknown as JKT48.Member[])
      .map((i) => {
        return {
          id: i.id,
          name: i.name,
          url: i.url,
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }
  catch (e) {
    console.log(e)
    return []
  }
}
