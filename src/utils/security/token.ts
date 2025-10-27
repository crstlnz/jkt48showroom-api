import type { Context } from 'hono'
import type { ShowroomLogin } from '@/types/auth'
import { createMiddleware } from 'hono/factory'
import { decode, sign, verify } from 'hono/jwt'
import { ofetch } from 'ofetch'
import { logoutHandler as logout } from '@/library/auth/login'
import { isAdmin } from '.'
import { parseCookieString } from '..'
import { createError } from '../errorResponse'
import { accessTokenTime, deleteAccessToken, getAccessToken, setAccessToken } from './cookies/accessToken'
import { deleteRefreshToken, getRefreshToken, refreshTokenTime, setRefreshToken } from './cookies/refreshToken'
import { getSessId } from './cookies/sessId'

export function getDecodedToken(c: Context): ShowroomLogin.User | null {
  const token = getAccessToken(c)
  if (token) {
    return decode(token).payload as ShowroomLogin.User
  }

  return null
}

export const tokenCaches = new Map<string, { accessToken: string, refreshToken: string, to: Timer }>()

export function checkToken(mustAuth: boolean = true) {
  return createMiddleware(async (c, next) => {
    const sessId = getSessId(c)
    const cachedToken = sessId ? tokenCaches.get(sessId) : null
    const token = cachedToken?.accessToken || getAccessToken(c)
    const refreshToken = cachedToken?.refreshToken || getRefreshToken(c)
    if (token || refreshToken) {
      let decodedToken = token ? await verify(token, process.env.AUTH_SECRET!).catch(() => null) : null
      if (!decodedToken && refreshToken) {
        decodedToken = await getRefreshedToken(c, refreshToken).catch(() => null)
      }

      if (decodedToken) {
        c.set('user', decodedToken)
        return await next()
      }

      if (!token && refreshToken) {
        const token = decode(refreshToken)
        const payload = token.payload as ShowroomLogin.User
        if (payload.sr_id) {
          logout(c, payload.sr_id)
        }
      }
      else if (token) {
        logout(c).catch(() => null)
      }

      clearToken(c)
    }

    if (mustAuth) {
      throw createError({ status: 401, message: 'Unauthorized!' })
    }
    return await next()
  })
}

export async function getRefreshedToken(c: Context, refreshToken: string) {
  const decodedRefreshToken = await verify(refreshToken, process.env.AUTH_SECRET!).catch(() => null) as ShowroomLogin.User
  if (decodedRefreshToken && decodedRefreshToken?.id && decodedRefreshToken.sr_id) {
    const { sessionData } = await createToken(c, decodedRefreshToken.id, decodedRefreshToken.sr_id)
    return sessionData
  }
  throw new Error('Failed to refresh token!')
}

export async function createToken(c: Context, user_id: string, sr_id: string) {
  const sessId = getSessId(c)
  const userProfile = await ofetch<ShowroomAPI.UserProfile>('https://www.showroom-live.com/api/user/profile', {
    params: { user_id },
    headers: {
      Cookie: sr_id ? `sr_id=${sr_id}` : '',
    },
    async onResponse({ response }) {
      const cookies = parseCookieString(response.headers.get('Set-Cookie') || '')
      if (cookies.sr_id?.value) {
        sr_id = cookies.sr_id.value
      }
    },
  })
  const currentTime = Math.floor(Date.now() / 1000)
  const sessionData: ShowroomLogin.User = {
    id: user_id,
    name: userProfile.name,
    account_id: userProfile.account_id,
    image: userProfile.image,
    avatar_id: String(userProfile.avatar_id),
    is_admin: isAdmin(user_id),
    sr_id,
    exp: currentTime + accessTokenTime, // 1 hour
  }

  if (!sessionData.account_id) throw createError({ status: 401, message: 'Unauthorized!' })
  const accessToken = await sign(sessionData, process.env.AUTH_SECRET!)

  const refreshToken = await sign({
    id: user_id,
    sr_id,
    exp: currentTime + refreshTokenTime,
  }, process.env.AUTH_SECRET!)

  // await new RefreshToken({
  //   userId: user_id,
  //   token: refreshToken,
  // }).save()

  setAccessToken(c, accessToken)
  setRefreshToken(c, refreshToken)

  if (sessId) {
    const token = tokenCaches.get(sessId)
    if (token?.to) {
      clearTimeout(token.to)
    }
    tokenCaches.set(sessId, {
      accessToken,
      refreshToken,
      to: setTimeout(() => {
        tokenCaches.delete(sessId)
      }, 10000),
    })
  }

  return {
    accessToken,
    refreshToken,
    sessionData,
  }
}

export function clearToken(c: Context) {
  deleteAccessToken(c)
  deleteRefreshToken(c)
}
