import type { Buffer } from 'buffer'
import type { CombinedLive, YoutubeLive } from '@/library/combinedNowLive'
import type { IdolGroup } from '@/types/index.types'
import { createId } from '@paralleldrive/cuid2'
import { decode, encode } from 'cbor-x'
import { fetchCombined } from '@/library/combinedNowLive'
import { cachedJKT48VLive, jkt48v_cache_time } from '@/library/jkt48v'
import { IdolGroupTypes } from '@/types/index.types'
import { AutoTrigger } from '@/utils/autoTrigger'
import { debounce } from '@/utils/debounce'
import { verifyJWT } from '@/utils/security/jwt'

let server: Bun.Server<WebSocketData> | null = null
const currentLives = new Map<IdolGroup, CombinedLive[]>(IdolGroupTypes.map(group => [group, []]))
let jkt48vLives: YoutubeLive[] = []

const updateLivesTrigger = new AutoTrigger(async () => {
  initLiveData()
}, 1000 * 60 * 5).start()

const isDev = false
export async function initLiveData() {
  await Promise.all(IdolGroupTypes.map(async (group) => {
    currentLives.set(group, (await fetchCombined(group, isDev)).filter(i => i.type !== 'youtube'))
  }))
  sendLiveUpdates('all')
}

export enum EventChannel {
  // eslint-disable-next-line no-unused-vars
  Lives = 'lives',
  // eslint-disable-next-line no-unused-vars
  Admin = 'admin',
}

export enum AdminEvent {
  // eslint-disable-next-line no-unused-vars
  UserCount = 'user-count',
}

function typedBroadcast(type: string, data: any) {
  return JSON.stringify({
    type,
    data,
  })
}

export function webhookUpdateLive(data: CombinedLive[], group?: IdolGroup) {
  updateLivesTrigger.touch()
  if (group) {
    currentLives.set(group, data.filter(i => i.group === group))
    sendLiveUpdates(group)
    return
  }

  for (const g of IdolGroupTypes) {
    currentLives.set(g, data.filter(i => i.group === g))
  }
  sendLiveUpdates('all')
}

export function setServer(_server: Bun.Server<WebSocketData>) {
  server = _server
}

const users = new Map<string, string>()
const admins = new Set()

interface WebSocketData {
  sessionId: string
}
export function websocketUpgrade(req: Request, server: Bun.Server<WebSocketData>) {
  setServer(server)
  if (server.upgrade(req, {
    data: {
      sessionId: createId(),
    },
  })) {
    return
  }
  return new Response('Upgrade failed', { status: 500 })
}

function userCount() {
  const paths = new Map<string, number>()
  for (const path of users.values()) {
    paths.set(path, (paths.get(path) ?? 0) + 1)
  }

  return {
    type: AdminEvent.UserCount,
    data: {
      paths: Object.fromEntries(paths),
      user_count: users.size,
      admin_count: admins.size,
    },
  }
}

function publish(topic: string, data: any) {
  if (server && topic) {
    server.publish(topic, encode(typedBroadcast(topic, data)))
  }
}

function sendWs(ws: Bun.ServerWebSocket<WebSocketData>, message: string) {
  ws.send(encode(message))
}

const publishAdminUserCount = debounce(() => {
  publish(EventChannel.Admin, userCount())
}, 1000)

setInterval(async () => {
  const data = await cachedJKT48VLive().catch(() => null)
  if (data) {
    jkt48vLives = (await cachedJKT48VLive()).map(i => ({ ...i, type: 'youtube' }))
    sendLiveUpdates('jkt48')
  }
}, jkt48v_cache_time + 1)

export function combinedLives() {
  return [...Array.from(currentLives.values()).flat(), ...jkt48vLives]
}

function sendLiveUpdates(group: IdolGroup | 'all' = 'jkt48') {
  if (group === 'all') {
    for (const g of IdolGroupTypes) {
      publish(g, combinedLives().filter(i => i.group === g))
    }
  }
  else {
    publish(group, combinedLives().filter(i => i.group === group))
  }
}

export const wsHandler: Bun.WebSocketHandler<WebSocketData> = {
  // TypeScript: specify the type of ws.data like this
  data: {} as WebSocketData,
  // handler called when a message is received
  open(ws) {
    users.set(ws.data.sessionId, '/')
    publishAdminUserCount()
  },
  message(ws, message) {
    const msg = decode(message as Buffer) as string
    if (msg.startsWith('PING')) {
      sendWs(ws, 'PONG')
    }
    else if (msg.startsWith('listen')) {
      msg.split(' ').slice(1).forEach((id) => {
        if (Object.values(IdolGroupTypes).includes(id as IdolGroup)) {
          ws.subscribe(id)
          sendWs(ws, typedBroadcast(id, combinedLives().filter(i => i.group === id)))
          sendWs(ws, 'ok-listen')
        }
      })
    }
    else if (msg.startsWith('view')) {
      users.set(ws.data.sessionId, msg.split(' ').slice(1).join(' '))
      publishAdminUserCount()
    }
    else if (msg.startsWith(EventChannel.Admin)) {
      const auth = msg.split(' ').slice(1).join(' ')
      try {
        const payload = verifyJWT(auth)
        if (payload.admin) {
          admins.add(ws.data.sessionId)
          ws.subscribe(EventChannel.Admin)
          sendWs(ws, typedBroadcast(EventChannel.Admin, userCount()))
        }
      }
      catch {

      }
    }
  },
  close(ws) {
    users.delete(ws.data.sessionId)
    admins.delete(ws.data.sessionId)
    for (const l of Object.values(EventChannel)) {
      ws.unsubscribe(l)
    }
    publishAdminUserCount()
  },
}
