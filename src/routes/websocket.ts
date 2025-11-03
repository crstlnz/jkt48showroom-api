import type { CombinedLive, JKT48VLiveResults } from '@/library/combinedNowLive'
import type { IdolGroup } from '@/types/index.types'
import { createId } from '@paralleldrive/cuid2'
import { fetchCombined } from '@/library/combinedNowLive'
import { cachedJKT48VLive, jkt48v_cache_time } from '@/library/jkt48v'
import { IdolGroupTypes } from '@/types/index.types'
import { AutoTrigger } from '@/utils/autoTrigger'
import { debounce } from '@/utils/debounce'
import { verifyJWT } from '@/utils/security/jwt'

let server: Bun.Server<WebSocketData> | null = null
let currentLives: CombinedLive[] = []
let jkt48vLives: JKT48VLiveResults[] = []

const updateLivesTrigger = new AutoTrigger(async () => {
  initLiveData()
}, 1000 * 60 * 5).start()

export async function initLiveData() {
  currentLives = await fetchCombined('all', process.env.NODE_ENV === 'development')
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
  currentLives = data
  sendLiveUpdates(group ?? 'all')
}

export function setServer(_server: Bun.Server<WebSocketData>) {
  server = _server
}

const users = new Set()
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
  return {
    type: AdminEvent.UserCount,
    data: {
      user_count: users.size,
      admin_count: admins.size,
    },
  }
}

function publish(topic: string, data: any) {
  server?.publish(topic, typedBroadcast(topic, data))
}

setInterval(async () => {
  const data = await cachedJKT48VLive().catch(() => null)
  if (data) {
    jkt48vLives = await cachedJKT48VLive()
    sendLiveUpdates('jkt48')
  }
}, jkt48v_cache_time + 1)

export function combinedLives() {
  return [...currentLives, ...jkt48vLives]
}

function sendLiveUpdates(group: IdolGroup | 'all') {
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
    users.add(ws.data.sessionId)
    debounce(() => {
      publish(EventChannel.Admin, userCount())
    }, 500)
  },
  message(ws, message) {
    const msg = String(message)
    if (msg.startsWith('PING')) {
      ws.send('PONG')
    }
    else if (msg.startsWith('listen')) {
      msg.split(' ').slice(1).forEach((id) => {
        if (Object.values(IdolGroupTypes).includes(id as IdolGroup)) {
          ws.subscribe(id)
          ws.send('ok')
          ws.send(typedBroadcast(id, combinedLives().filter(i => i.group === id)))
        }
      })
    }
    else if (msg.startsWith(EventChannel.Admin)) {
      const auth = msg.split(' ').slice(1).join(' ')
      try {
        const payload = verifyJWT(auth)
        if (payload.admin) {
          admins.add(ws.data.sessionId)
          ws.send('Registered as admin')
          ws.subscribe(EventChannel.Admin)
          ws.send(typedBroadcast(EventChannel.Admin, {
            type: AdminEvent.UserCount,
            data: {
              user_count: users.size,
              admin_count: admins.size,
            },
          }))
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

    debounce(() => {
      publish(EventChannel.Admin, userCount())
    }, 500)
  },
}
