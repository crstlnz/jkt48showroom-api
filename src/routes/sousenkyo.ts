import { Hono } from 'hono'
import { useCORS } from '@/utils/cors'

const app = new Hono()
app.use('*', useCORS('self'))

// app.get('/members', ...handler(() => getSousenkyoMembers()))
// app.get('/member/:id', ...handler(c => getSousenkyoMemberDetail(c.req.param('id'))))
// app.get('/member/:id/room_id', ...handler(c => getSousenkyoMemberByRoomId(c.req.param('id'))))

export default app
