import type { Context } from 'hono'
import { Hono } from 'hono'
import { sendComment } from '@/library/comment/send'
import { follow } from '@/library/follow'
import { reorderFollow } from '@/library/follow/reorder'
import { getUserHistory } from '@/library/user/history'
import { deleteLike, getLike, getLikes, setLike } from '@/library/user/likes'
import { useCORS } from '@/utils/cors'
import { handler } from '@/utils/factory'
import { checkToken } from '@/utils/security/token'
import { useShowroomSession } from '@/utils/showroomSession'

const app = new Hono()
const secret = process.env.AUTH_SECRET
if (!secret) throw new Error('Auth secret not found!')
app.use('*', useCORS('self'))
app.use('*', checkToken())
app.get('/', (c: Context) => c.json(c.get('user')))
app.get('/history', ...handler(c => getUserHistory(c.req.query(), c.get('user')?.id)))
app.get('/likes', ...handler(getLikes))

app.put('/like', ...handler(c => setLike(c.req.query(), c.get('user')?.id)))
app.get('/like', ...handler(c => getLike(c.req.query(), c.get('user')?.id)))
app.delete('/like', ...handler(c => deleteLike(c.req.query(), c.get('user')?.id)))

// app.post('/comment', useShowroomSession())
app.use('*', useShowroomSession())
app.post('/comment', sendComment)
app.post('/follow/reorder', c => reorderFollow(c))
app.post('/follow', c => follow(c))

export default app
