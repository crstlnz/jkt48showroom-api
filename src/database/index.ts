/* eslint-disable no-restricted-globals */

/* eslint-disable vars-on-top */
import type { Connection, Mongoose } from 'mongoose'
import mongoose from 'mongoose'

declare global {
  var _clientDC: Connection
  var _clientJKT48: Connection
  var _clientLive: Connection
  var _clientUserDB: Connection
  var _promiseDC: Promise<Mongoose>
  var _promiseJKT48: Promise<Connection>
  var _promiseLive: Promise<Connection>
  var _promiseUserDB: Promise<Connection>
}

function handleConnectionPromise<T>(promise: Promise<T>) {
  // The connection promise is created during module initialization, before
  // dbConnect() has a chance to await it. Attach a rejection handler now so
  // a failed initial connection does not become an unhandled rejection.
  void promise.catch(() => undefined)
  return promise
}

function logConnectionError(name: string, connection: Connection, error: unknown) {
  if (!(error instanceof Error)) {
    console.error(`${name} connection error:`, error)
    return
  }

  const connectionError = error as Error & {
    code?: string
    syscall?: string
    hostname?: string
    reason?: {
      type?: string
      servers?: Map<string, unknown>
    }
  }
  const cause = error.cause as (Error & {
    code?: string
    syscall?: string
    hostname?: string
  }) | undefined

  console.error(`${name} connection error:`, {
    error: connectionError.name,
    message: connectionError.message,
    code: connectionError.code,
    syscall: connectionError.syscall,
    hostname: connectionError.hostname,
    cause: cause
      ? {
          error: cause.name,
          message: cause.message,
          code: cause.code,
          syscall: cause.syscall,
          hostname: cause.hostname,
        }
      : undefined,
    connection: {
      host: connection.host,
      port: connection.port,
      readyState: connection.readyState,
    },
    topology: connectionError.reason
      ? {
          type: connectionError.reason.type,
          servers: connectionError.reason.servers ? [...connectionError.reason.servers.keys()] : undefined,
        }
      : undefined,
  })
}

class DB {
  private static _instance: DB
  dc: Connection
  dcPromise: Promise<Mongoose>

  jkt48: Connection
  jkt48Promise: Promise<Connection>

  live: Connection
  livePromise: Promise<Connection>

  user: Connection
  userPromise: Promise<Connection>
  private constructor() {
    console.log('Construct DB')
    const isDev = process.env.NODE_ENV === 'development'
    this.dc = isDev && global._clientDC ? global._clientDC : mongoose.connection
    this.dcPromise = handleConnectionPromise((isDev && global._promiseDC) ? global._promiseDC : mongoose.connect(process.env.MONGODB_URI ?? ''))

    this.jkt48 = (isDev && global._clientJKT48) ? global._clientJKT48 : mongoose.createConnection(process.env.MONGODB_URI_JKT48_SHOWROOM || '')
    this.jkt48Promise = handleConnectionPromise((isDev && global._promiseJKT48) ? global._promiseJKT48 : this.jkt48.asPromise())

    this.live = (isDev && global._clientLive) ? global._clientLive : mongoose.createConnection(process.env.MONGODB_URI_LIVE_DB || '')
    this.livePromise = handleConnectionPromise((isDev && global._promiseLive) ? global._promiseLive : this.live.asPromise())

    this.user = (isDev && global._clientUserDB) ? global._clientUserDB : mongoose.createConnection(process.env.MONGODB_URI_USER_DB || '')
    this.userPromise = handleConnectionPromise((isDev && global._promiseUserDB) ? global._promiseUserDB : this.user.asPromise())

    this.dc.on('error', (error) => {
      logConnectionError('MongoDB', this.dc, error)
    })
    this.jkt48.on('error', (error) => {
      logConnectionError('JKT48 ShowroomDB', this.jkt48, error)
    })
    this.live.on('error', (error) => {
      logConnectionError('LiveDB', this.live, error)
    })
    this.user.on('error', (error) => {
      logConnectionError('UserDB', this.user, error)
    })

    this.dc.on('open', () => {
      console.log('MongoDB connected!')
    })
    this.jkt48.on('open', () => {
      console.log('JKT48 ShowroomDB connected!')
    })
    this.live.on('open', () => {
      console.log('LiveDB connected!')
    })
    this.user.on('open', () => {
      console.log('UserDB connected!')
    })
  }

  public static get instance() {
    if (!this._instance) {
      this._instance = new DB()
    }
    return this._instance
  }
}

export const db = DB.instance
export const dcDB = db.dc
export const jkt48DB = db.jkt48
export const liveDB = db.live
export const userDB = db.user

type DatabaseName = 'dcDB' | 'jkt48DB' | 'liveDB' | 'userDB'
export async function dbConnect(dbList: DatabaseName[] | DatabaseName | 'all') {
  const loadAll = dbList === 'all'
  try {
    if (loadAll || dbList === 'dcDB' || dbList.includes('dcDB')) {
      await db.dcPromise
    }
    if (loadAll || dbList === 'jkt48DB' || dbList.includes('jkt48DB')) {
      await db.jkt48Promise
    }
    if (loadAll || dbList === 'liveDB' || dbList.includes('liveDB')) {
      await db.livePromise
    }
    if (loadAll || dbList === 'userDB' || dbList.includes('userDB')) {
      await db.userPromise
    }
  }
  catch (e) {
    console.error(e)
  }
}
