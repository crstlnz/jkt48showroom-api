import { Hono } from 'hono'
import { updateBanner } from '@/library/admin/banner'
import { addOrEditEvent } from '@/library/admin/event/add'
import deleteEvent from '@/library/admin/event/delete'
import getAllEvent from '@/library/admin/event/event'
import getFansList from '@/library/admin/fansList'
import { getMemberDataForEdits } from '@/library/admin/getMemberData'
import { editJKT48Event } from '@/library/admin/input/editJKT48Event'
import { editMemberData } from '@/library/admin/input/editMemberData'
import { editShowroom } from '@/library/admin/input/editShowroom'
import { editTheater } from '@/library/admin/input/editTheater'
import { inputShowroomLog } from '@/library/admin/input/inputShowroomLog'
import { setBanner } from '@/library/admin/input/member/banner'
import { setImage } from '@/library/admin/input/member/image'
import { editJikosoukai } from '@/library/admin/input/member/jikosokai'
import { editJKT48ID } from '@/library/admin/input/member/jkt48id'
import { setGraduate } from '@/library/admin/input/setGraduate'
import { addOrEditSetlist } from '@/library/admin/input/setlist/add'
import deleteSetlist from '@/library/admin/input/setlist/delete'
import { setMemberData } from '@/library/admin/input/setMemberData'
import { getJKT48Members } from '@/library/admin/jkt48member'
import { getMembers } from '@/library/admin/member'
import getMissingJikosoukai from '@/library/admin/missingJikosoukai'
import getMissingJKT48ID from '@/library/admin/missingJKT48ID'
import getAllSetlist from '@/library/admin/setlist'
import { getStage48 } from '@/library/admin/stage48'
import { CombinedLivesListZod } from '@/library/combinedNowLive'
import { getJKT48EventById } from '@/library/jkt48/jkt48event'
import { getTheaterById } from '@/library/jkt48/theater'
import { sendLog } from '@/library/sendLog'
import { IdolGroupTypes } from '@/types/index.types'
import cache from '@/utils/cache'
import { useCORS } from '@/utils/cors'
import { ApiError, notFound } from '@/utils/errorResponse'
import { handler } from '@/utils/factory'
import { checkAdmin } from '@/utils/security'
import { createJWT } from '@/utils/security/jwt'
import { checkToken } from '@/utils/security/token'
import { cache as wCache } from '../library/watch/index'
import { webhookUpdateLive } from './websocket'

const app = new Hono()

app.post('/update_lives', async (c) => {
  const data = await c.req.json()
  if (!data?.api_key || data.api_key !== process.env.API_KEY) throw new ApiError({ status: 401, message: 'Unauthorized!' })
  const lives = data?.lives
  const group = IdolGroupTypes.includes(data?.group) ? data?.group : undefined
  if (!lives) throw new ApiError({ status: 400, message: 'Bad request!' })
  try {
    const parsed = CombinedLivesListZod.parse(lives)
    for (const l of parsed) {
      if (l.type === 'idn') {
        console.log(l.streaming_url_list)
        if (!l.streaming_url_list?.[0]) throw new Error('Tidak ada streaming url')
      }
      else if (l.type === 'showroom') {
        console.log(l.streaming_url_list)
        if (!l.streaming_url_list?.[0]) throw new Error('Tidak ada streaming url')
      }
    }
    webhookUpdateLive(parsed, group)
    return c.json({
      ok: true,
    })
  }
  catch (e) {
    console.error(e)
    // sendLog(`Error Update Lives \`\`\`${e}\`\`\``)
    throw new ApiError({
      status: 400,
      message: 'Error',
    })
  }
})

app.use('*', useCORS('self'))
app.use('*', checkToken(false))
app.use('*', checkAdmin())
// app.use('*', useShowroomSession())

app.get('/get_token', (c) => {
  return c.text(createJWT({
    admin: true,
  }, 60 * 1000 * 2))
})

app.get('/missing_jikosokai', ...handler(getMissingJikosoukai))
app.get('/missing_jkt48id', ...handler(getMissingJKT48ID))
app.get('/setlist', ...handler(getAllSetlist))
app.get('/event', ...handler(getAllEvent))
app.get('/stage48', ...handler(c => getStage48(c.req.query('group'))))
app.get('/jkt48member', ...handler(getJKT48Members))
app.get('/member', ...handler(getMembers))
app.get('/fans_list', ...handler(getFansList))
app.get('/member/data', ...handler(getMemberDataForEdits))
app.post('/update_banner', ...handler(updateBanner))
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

app.get('/event/:id', async (c) => {
  const theater = await getJKT48EventById(c.req.param('id'))
  if (!theater) throw notFound()
  return c.json(theater)
})

app.post('/set_memberdata', ...handler(setMemberData))
app.post('/set_graduate', ...handler(setGraduate))
app.post('/edit_showroom', ...handler(editShowroom))
app.post('/edit_theater', ...handler(editTheater))
app.post('/edit_jkt48event', ...handler(editJKT48Event))
app.post('/edit_memberdata', ...handler(editMemberData))
app.post('/edit/announcement', ...handler(editMemberData))
app.post('/setlist', ...handler(addOrEditSetlist))
app.post('/event', ...handler(addOrEditEvent))

app.delete('/setlist/:id', ...handler(deleteSetlist))
app.delete('/event/:id', ...handler(deleteEvent))

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
