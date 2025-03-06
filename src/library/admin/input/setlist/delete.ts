import Setlist from '@/database/showroomDB/jkt48/Setlist'
import { Context } from 'hono'

export default async function deleteSetlist(c : Context): Promise<{success : true}> {
    const id = c.req.param('id')
    await Setlist.deleteOne({_id : id})
    return {
    success : true
    }
}
