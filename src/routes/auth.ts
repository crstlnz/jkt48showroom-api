import { Hono } from 'hono'
import { login, logout } from '@/library/auth/login'
import { useShowroomSession } from '@/utils/showroomSession'
import { checkToken } from '@/utils/security/token'
import { useCORS } from '@/utils/cors'

const app = new Hono()
app.use('*', useCORS('self'))
app.use('*', checkToken(false))
app.use('*', useShowroomSession())

// app.post('/login', ...login())
// app.post('/logout', ...logout())

export default app
