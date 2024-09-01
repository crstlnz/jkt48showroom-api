import { Hono } from 'hono'
import { useCORS } from '@/utils/cors'
import { handler } from '@/utils/factory'
import { getSousenkyoMemberByRoomId, getSousenkyoMembers } from '@/library/jkt48/scraper/sousenkyo'
import { getSousenkyoMemberDetail } from '@/library/jkt48/scraper/sousenkyo/member_detail'

const app = new Hono()
app.use('*', useCORS('self'))

app.get('/members', ...handler(() => getSousenkyoMembers()))
app.get('/members', ...handler(() => getSousenkyoMembers()))
app.get('/member/:id', ...handler(c => getSousenkyoMemberDetail(c.req.param('id'))))
app.get('/member/:id/room_id', ...handler(c => getSousenkyoMemberByRoomId(c.req.param('id'))))

export default app
