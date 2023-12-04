import { Hono } from 'hono'
import { login, logout } from '@/library/auth/login'
import { useShowroomSession } from '@/utils/showroomSession'

const app = new Hono()

app.use('*', useShowroomSession())

app.post('/login', c => login(c))
app.post('/logout', c => logout(c))

export default app
