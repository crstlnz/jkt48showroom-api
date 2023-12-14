import Member from '@/database/schema/48group/Member'
import JKT48Member from '@/database/showroomDB/jkt48/Member'

export default async function getMissingJKT48ID(): Promise<Admin.ApiMissingJKT48ID> {
  const member = await Member.find({ jkt48id: { $in: [null, []] }, group: 'jkt48' })
  return {
    members: member.map<Admin.MissingJKT48ID>((i) => {
      return {
        _id: i._id.toString(),
        name: i.name,
        img: i.img,
        generation: i.generation,
        isGraduate: i.isGraduate,
      }
    }).sort((a, b) => a.name > b.name ? 1 : -1),
    jkt48members: (await JKT48Member.find({})).map((i) => {
      return {
        id: i.id,
        name: i.name,
      }
    }).sort((a, b) => a.name > b.name ? 1 : -1),
  }
}
