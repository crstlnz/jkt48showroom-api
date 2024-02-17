import IdolMember from '@/database/schema/48group/IdolMember'
import JKT48Member from '@/database/showroomDB/jkt48/Member'

export default async function getMissingJKT48ID(): Promise<Admin.ApiMissingJKT48ID> {
  const member = await IdolMember.find({ jkt48id: { $in: [null, []] }, group: 'jkt48' })
  return {
    members: member.map<Admin.MissingJKT48ID>((i) => {
      return {
        _id: i._id.toString(),
        name: i.name,
        img: i.info.img,
        generation: i.info.generation,
        isGraduate: i.info.is_graduate ?? true,
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
