import type { Context } from 'hono'
import { Hono } from 'hono'
import { checkToken } from '@/utils/security/token'
import { getUserHistory } from '@/library/user/history'
import { deleteLike, getLike, getLikes, setLike } from '@/library/user/likes'

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

export default app
