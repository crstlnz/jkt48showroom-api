/* eslint-disable no-restricted-globals */
/* eslint-disable no-var */
/* eslint-disable vars-on-top */
import type { Connection, Mongoose } from 'mongoose'
import mongoose from 'mongoose'

declare global {
  var _clientDC: Connection
  var _clientJKT48: Connection
  var _clientLive: Connection
  var _promiseDC: Promise<Mongoose>
  var _promiseJKT48: Promise<Connection>
  var _promiseLive: Promise<Connection>
}

class DB {
  private static _instance: DB
  dc: Connection
  dcPromise: Promise<Mongoose>

  jkt48: Connection
  jkt48Promise: Promise<Connection>

  live: Connection
  livePromise: Promise<Connection>
  private constructor() {
    const isDev = process.env.NODE_ENV === 'development'
    this.dc = isDev && global._clientDC ? global._clientDC : mongoose.connection
    this.dcPromise = (isDev && global._promiseDC) ? global._promiseDC : mongoose.connect(process.env.MONGODB_URI ?? '')

    this.jkt48 = (isDev && global._clientJKT48) ? global._clientJKT48 : mongoose.createConnection(process.env.MONGODB_URI_JKT48_SHOWROOM || '')
    this.jkt48Promise = (isDev && global._promiseJKT48) ? global._promiseJKT48 : this.jkt48.asPromise()

    this.live = (isDev && global._clientLive) ? global._clientLive : mongoose.createConnection(process.env.MONGODB_URI_LIVE_DB || '')
    this.livePromise = (isDev && global._promiseLive) ? global._promiseLive : this.live.asPromise()

    this.dc.on('open', () => {
      console.log('MongoDB connected!')
    })
    this.jkt48.on('open', () => {
      console.log('JKT48 ShowroomDB connected!')
    })
    this.live.on('open', () => {
      console.log('LiveDB connected!')
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

type DatabaseName = 'dcDB' | 'jkt48DB' | 'liveDB'
export async function dbConnect(dbList: DatabaseName[] | DatabaseName | 'all') {
  const loadAll = dbList === 'all'

  if (loadAll || dbList === 'dcDB' || dbList.includes('dcDB')) {
    await db.dcPromise
  }
  if (loadAll || dbList === 'jkt48DB' || dbList.includes('jkt48DB')) {
    await db.jkt48Promise
  }
  if (loadAll || dbList === 'liveDB' || dbList.includes('liveDB')) {
    await db.livePromise
  }
}
