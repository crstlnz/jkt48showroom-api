import { Hono } from 'hono'
import { login, logout } from '@/library/auth/login'
import { useCORS } from '@/utils/cors'
import { checkToken } from '@/utils/security/token'
import { useShowroomSession } from '@/utils/showroomSession'

const app = new Hono()
app.use('*', checkToken(false))
app.use('*', useShowroomSession())
app.use('*', useCORS('self'))

app.post('/login', ...login())
app.post('/logout', ...logout())

export default app
