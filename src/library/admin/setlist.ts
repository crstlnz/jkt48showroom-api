import Setlist from '@/database/showroomDB/jkt48/Setlist'

export default async function getAllSetlist(): Promise<JKT48.Setlist[]> {
  try {
    const setlists = await Setlist.find({}).populate('songs').lean().lean()
    return setlists
  }
  catch (e) {
    console.error(e)
    return []
  }
}
