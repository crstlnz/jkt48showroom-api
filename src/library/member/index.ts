import Showroom from '@schema/showroom/Showroom'
import type { Context } from 'hono'
import config from '@/config'
import cache from '@/utils/cache'

const jkt48officialId = 332503
export async function getMembers(group?: string | null): Promise<IMember[]>
export async function getMembers(c?: Context): Promise<IMember[]>
export async function getMembers(c?: Context | string | null): Promise<IMember[]> {
  const group = c == null ? '' : typeof c === 'string' ? c : c.req.query('group')
  return await cache.fetch(group ? `${group}-members` : 'members', () => fetch(group), 86400000)
}

async function fetch(group: string | null = null): Promise<IMember[]> {
  try {
    const options = {} as any
    if (group) options.group = group
    // if (roomId) options.room_id = roomId
    const members: Database.IShowroomMember[] = await Showroom.find(options)
      .select('name description img url room_id member_data room_exists generation')
      .populate({
        path: 'member_data',
        select: '-_id isGraduate img nicknames bloodType height idn_username',
      })
      .lean()
    return members
      .map((member): IMember => {
        return {
          name: member.name,
          nicknames: member?.member_data?.nicknames || [],
          img: member.img ?? member.member_data?.img ?? config.errorPicture,
          img_alt: member.member_data?.img ?? member.img ?? config.errorPicture,
          url: member.url,
          description: member.description?.replace(/(?:\r\n|\r)/g, '\n'),
          group: member.group,
          room_id: member.room_id,
          room_exists: member.room_exists ?? false,
          is_graduate: member.member_data?.isGraduate ?? jkt48officialId !== member.room_id,
          is_group: jkt48officialId === member.room_id,
          generation: member.generation,
          bloodType: member.member_data?.bloodType,
          height: member.member_data?.height,
          idn_username: member.member_data?.idn_username,
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }
  catch (e) {
    console.log(e)
    return []
  }
}
