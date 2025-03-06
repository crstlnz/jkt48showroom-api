import IdolMember from '@/database/schema/48group/IdolMember'
import JKT48Member from '@/database/showroomDB/jkt48/Member'

export async function getJKT48Members(): Promise<JKT48.Member[]> {
  try {
    const members = await JKT48Member.find({})
      .lean()

    const memberData = await IdolMember.find({jkt48id : {$in : members.map(i=> i.id)}})
    return (members as unknown as JKT48.Member[])
      .map((i) => {
        const data = memberData.find(x=> x.jkt48id?.includes(i.id))
        return {
          id: i.id,
          name: i.name,
          nicknames : data?.info.nicknames,
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
