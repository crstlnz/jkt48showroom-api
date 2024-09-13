import type { Context } from 'hono'
import Setlist from '@/database/showroomDB/jkt48/Setlist'

export default async function getSetlist(c: Context): Promise<JKT48.Setlist[]> {
  return (await Setlist.find().lean()).map<JKT48.Setlist>((i) => {
    return {
      id: i.id,
      title: i.title,
      banner: i.banner,
      description: i.description,
      poster: i.poster,
      title_alt: i.title_alt,
    }
  })
}
