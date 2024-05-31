import { Hono } from 'hono'
import { cache as wCache } from '../library/watch/index'
import { checkToken } from '@/utils/security/token'
import getMissingJikosoukai from '@/library/admin/missingJikosoukai'
import { checkAdmin } from '@/utils/security'
import getAllSetlist from '@/library/admin/setlist'
import cache from '@/utils/cache'
import { getStage48 } from '@/library/admin/stage48'
import { getJKT48Members } from '@/library/admin/jkt48member'
import { handler } from '@/utils/factory'
import { getMembers } from '@/library/admin/member'
import getFansList from '@/library/admin/fansList'
import { setGraduate } from '@/library/admin/input/setGraduate'
import { editShowroom } from '@/library/admin/input/editShowroom'
import { editMemberData } from '@/library/admin/input/editMemberData'
import { addOrEditSetlist } from '@/library/admin/input/setlist/add'
import { setBanner } from '@/library/admin/input/member/banner'
import { setImage } from '@/library/admin/input/member/image'
import { inputShowroomLog } from '@/library/admin/input/inputShowroomLog'
import { editJikosoukai } from '@/library/admin/input/member/jikosokai'
import { useCORS } from '@/utils/cors'
import getMissingJKT48ID from '@/library/admin/missingJKT48ID'
import { editJKT48ID } from '@/library/admin/input/member/jkt48id'
import { getMemberDataForEdits } from '@/library/admin/getMemberData'
import { setMemberData } from '@/library/admin/input/setMemberData'
import { getTheater, getTheaterById } from '@/library/jkt48/theater'
import Theater from '@/database/showroomDB/jkt48/Theater'
import { notFound } from '@/utils/errorResponse'
import Member from '@/database/showroomDB/jkt48/Member'
import { editTheater } from '@/library/admin/input/editTheater'

const app = new Hono()
app.use('*', useCORS('self'))
app.use('*', checkToken(false))
app.use('*', checkAdmin())
// app.use('*', useShowroomSession())

app.get('/missing_jikosokai', ...handler(getMissingJikosoukai))
app.get('/missing_jkt48id', ...handler(getMissingJKT48ID))
app.get('/setlist', ...handler(getAllSetlist))
app.get('/stage48', ...handler(c => getStage48(c.req.query('group'))))
app.get('/jkt48member', ...handler(getJKT48Members))
app.get('/member', ...handler(getMembers))
app.get('/fans_list', ...handler(getFansList))
app.get('/member/data', ...handler(getMemberDataForEdits))
app.get('/watch/sr_cache', (c) => {
  return c.json({
    w: [...wCache.entries()],
  })
})

app.get('/theater/:id', async (c) => {
  const theater = await getTheaterById(c.req.param('id'))
  if (!theater) throw notFound()
  return c.json(theater)
})

app.post('/set_memberdata', ...handler(setMemberData))
app.post('/set_graduate', ...handler(setGraduate))
app.post('/edit_showroom', ...handler(editShowroom))
app.post('/edit_theater', ...handler(editTheater))
app.post('/edit_memberdata', ...handler(editMemberData))
app.post('/edit/announcement', ...handler(editMemberData))
app.post('/setlist', ...handler(addOrEditSetlist))

app.post('/member/jikosokai', ...handler(editJikosoukai))
app.post('/member/jkt48id', ...handler(editJKT48ID))
app.post('/member/banner', ...handler(setBanner))
app.post('/member/image', ...handler(setImage))
app.post('/input/showroom_log', ...handler(inputShowroomLog))

app.post('/clear_cache', async (c) => {
  await cache.clear()
  return c.json({
    code: 200,
    message: 'Success!',
  })
})

export default app
