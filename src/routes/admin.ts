import { Hono } from 'hono'
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

const app = new Hono()

app.use('*', checkToken(false))
app.use('*', checkAdmin())
// app.use('*', useShowroomSession())

app.get('/missing_jikosokai', ...handler(getMissingJikosoukai))
app.get('/setlist', ...handler(getAllSetlist))
app.get('/stage48', ...handler(c => getStage48(c.req.query('group'))))
app.get('/jkt48member', ...handler(getJKT48Members))
app.get('/member', ...handler(getMembers))
app.get('/fans_list', ...handler(getFansList))

app.post('/set_graduate', ...handler(setGraduate))
app.post('/edit_showroom', ...handler(editShowroom))
app.post('/edit_memberdata', ...handler(editMemberData))
app.post('/setlist', ...handler(addOrEditSetlist))

app.post('/member/jikosokai', ...handler(editJikosoukai))
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
