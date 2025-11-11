import type { Context } from 'hono'
import config from '@/config'
import IdolMember from '@/database/schema/48group/IdolMember'
import cache from '@/utils/cache'

export async function getMembers(group?: string | null): Promise<IMember[]>
export async function getMembers(c?: Context): Promise<IMember[]>
export async function getMembers(c?: Context | string | null): Promise<IMember[]> {
  const group = c == null ? '' : typeof c === 'string' ? c : c.req.query('group')
  if (process.env.NODE_ENV === 'development') return await fetch(group)
  return await cache.fetch(group ? `${group}-memberv4` : 'memberv4', () => fetch(group), 86400000)
}

async function fetch(group: string | null = null): Promise<IMember[]> {
  try {
    const options = {} as any
    options.group = []
    if (group === 'jkt48') options.group.push('official')
    if (group) options.group.push(group)
    // if (roomId) options.room_id = roomId
    const members = await IdolMember.find(options)
      // .select('name description img url room_id member_data room_exists generation')
      .populate<{ showroom: Database.IShowroomMember }>('showroom')
      .lean()

    return members
      .map((member) => {
        return {
          _id: member._id,
          name: member.name,
          nicknames: member?.info?.nicknames || [],
          img: member?.showroom?.img ?? member.info?.img ?? config.errorPicture,
          img_alt: member.info?.img ?? config.errorPicture,
          url: member.slug,
          // description: member.info?.description?.replace(/(?:\r\n|\r)/g, '\n'),
          group: member.group,
          socials: member?.info?.socials,
          room_id: member.showroom_id,
          sr_exists: member?.showroom?.room_exists ?? false,
          is_graduate: member.info?.is_graduate ?? member.group !== 'official',
          // is_group: jkt48officialId === member.showroom_id,
          generation: member.info?.generation,
          // bloodType: member.info?.blood_type,
          // height: member.info?.height,
          idn_username: member.idn?.username,
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }
  catch (e) {
    console.error(e)
    return []
  }
}
