import type { Context } from 'hono'
import { Hono } from 'hono'
import { checkToken } from '@/utils/security/token'
import { getUserHistory } from '@/library/user/history'
import { deleteLike, getLike, getLikes, setLike } from '@/library/user/likes'
import { sendComment } from '@/library/comment/send'
import { useShowroomSession } from '@/utils/showroomSession'
import { reorderFollow } from '@/library/follow/reorder'
import { follow, isFollow } from '@/library/follow'

const app = new Hono()
const secret = process.env.AUTH_SECRET
if (!secret) throw new Error('Auth secret not found!')

app.use('*', checkToken())

app.get('/', (c: Context) => c.json(c.get('user')))
app.get('/history', async (c: Context) => c.json(await getUserHistory(c.req.query(), c.get('user')?.id)))
app.get('/likes', async (c: Context) => c.json(await getLikes(c.get('user')?.id)))

app.get('/like', async (c: Context) => c.json(await getLike(c.req.query(), c.get('user')?.id)))
app.put('/like', async (c: Context) => c.json(await setLike(c.req.query(), c.get('user')?.id)))
app.delete('/like', async (c: Context) => c.json(await deleteLike(c.req.query(), c.get('user')?.id)))

// app.post('/comment', useShowroomSession())
app.use('*', useShowroomSession())
app.post('/comment', sendComment)
app.post('/follow/reorder', c => reorderFollow(c))
app.post('/follow', c => follow(c))

app.get('/follow', c => isFollow(c))

export default app
