import type { Context } from 'hono'
import { decode, sign, verify } from 'hono/jwt'
import { ofetch } from 'ofetch'
import { createMiddleware } from 'hono/factory'
import { parseCookieString } from '..'
import { createError } from '../errorResponse'
import { accessTokenTime, deleteAccessToken, getAccessToken, setAccessToken } from './cookies/accessToken'
import { deleteRefreshToken, getRefreshToken, refreshTokenTime, setRefreshToken } from './cookies/refreshToken'
import { deleteShowroomSess } from './cookies/showroomSess'
import { getSessId } from './cookies/sessId'
import { isAdmin } from '.'
import RefreshToken from '@/database/schema/auth/RefreshToken'
import { logoutHandler as logout } from '@/library/auth/login'

export function getDecodedToken(c: Context): ShowroomLogin.User | null {
  const token = getAccessToken(c)
  if (token) {
    return decode(token).payload
  }

  return null
}

export const tokenCaches = new Map<string, { accessToken: string, refreshToken: string, to: NodeJS.Timeout }>()

export function checkToken(mustAuth: boolean = true) {
  return createMiddleware(async (c, next) => {
    const sessId = getSessId(c)
    const cachedToken = sessId ? tokenCaches.get(sessId) : null
    const token = cachedToken?.accessToken || getAccessToken(c)
    const refreshToken = cachedToken?.refreshToken || getRefreshToken(c)
    if (token) {
      let decoded = await verify(token, process.env.AUTH_SECRET!).catch(() => null)
      if (!decoded && refreshToken) {
        decoded = await getRefreshedToken(c, token, refreshToken).catch(() => null)
      }
      if (decoded) {
        c.set('user', decoded)
        return await next()
      }
    }

    if (token) logout(c).catch(() => null)
    clearToken(c)
    if (mustAuth) {
      throw createError({ status: 401, message: 'Unauthorized!' })
    }
    return await next()
  })
}

export async function getRefreshedToken(c: Context, accessToken: string, refreshToken: string) {
  const decodedRefreshToken = await verify(refreshToken, process.env.AUTH_SECRET!).catch(() => null)
  const decodedToken = decode(accessToken)
  if (decodedRefreshToken.id === decodedToken.payload.id) {
    const tokenDoc = await RefreshToken.findOne({
      userId: decodedRefreshToken.id,
      token: refreshToken,
    })

    if (tokenDoc && !tokenDoc.isUsed) {
      tokenDoc.isUsed = true
      await tokenDoc.save()
      const { sessionData } = await createToken(c, decodedToken.payload.id, decodedToken.payload.sr_id)
      return sessionData
    }
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
    exp: currentTime + refreshTokenTime, // 1 month
  }, process.env.AUTH_SECRET!)

  await new RefreshToken({
    userId: user_id,
    token: refreshToken,
  }).save()

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
  deleteShowroomSess(c)
}
