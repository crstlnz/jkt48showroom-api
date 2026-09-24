import type { Types } from 'mongoose'
import { liveDB } from '@/database'
import { BetaDeviceModel } from '@/database/schema/config/BetaDevice'
import { BetaKeyModel } from '@/database/schema/config/BetaKey'

interface CachedAccess {
  enabled: boolean
  expiresAt: number
}

interface UpsertBetaDeviceOptions {
  fingerprint: string
  bypassKey?: Types.ObjectId
  note?: string
}

interface EnrollBetaDeviceOptions {
  fingerprint: string
  keyHash: string
}

const cacheTtl = 5 * 60 * 1000
const accessCache = new Map<string, CachedAccess>()
const pendingAccess = new Map<string, Promise<boolean>>()
const revisions = new Map<string, number>()

function cacheKey(fingerprint: string) {
  return `beta-device:${fingerprint}`
}

function getRevision(key: string) {
  return revisions.get(key) ?? 0
}

export function invalidateBetaDeviceAccess(fingerprint: string) {
  const key = cacheKey(fingerprint)
  revisions.set(key, getRevision(key) + 1)
  accessCache.delete(key)
  pendingAccess.delete(key)
}

export async function getBetaDeviceAccess(fingerprint: string) {
  const key = cacheKey(fingerprint)
  const cached = accessCache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.enabled

  const pending = pendingAccess.get(key)
  if (pending) return await pending

  const revision = getRevision(key)
  const request = (async () => {
    const device = await BetaDeviceModel.findOneAndUpdate(
      { fingerprint, enabled: true },
      { $set: { lastSeenAt: new Date() } },
      { new: true },
    )
    const enabled = Boolean(device)
    if (revision === getRevision(key)) {
      accessCache.set(key, { enabled, expiresAt: Date.now() + cacheTtl })
    }
    return enabled
  })()

  pendingAccess.set(key, request)
  try {
    return await request
  }
  finally {
    if (pendingAccess.get(key) === request) pendingAccess.delete(key)
  }
}

export async function upsertBetaDevice({ fingerprint, bypassKey, note }: UpsertBetaDeviceOptions) {
  await BetaDeviceModel.updateOne(
    { fingerprint },
    {
      $set: {
        enabled: true,
        lastSeenAt: new Date(),
        ...(bypassKey ? { bypassKey } : {}),
        ...(note !== undefined ? { note } : {}),
      },
      $setOnInsert: { fingerprint },
    },
    { upsert: true },
  )
  invalidateBetaDeviceAccess(fingerprint)
}

export async function enrollBetaDevice({ fingerprint, keyHash }: EnrollBetaDeviceOptions) {
  const session = await liveDB.startSession()
  let enabled = false
  try {
    await session.withTransaction(async () => {
      enabled = false
      const now = new Date()
      const bypassKey = await BetaKeyModel.findOneAndUpdate(
        { keyHash, expiresAt: { $gt: now } },
        { $set: { lastUsedAt: now }, $inc: { enrollmentVersion: 1 } },
        { new: true, session },
      )
      if (!bypassKey) return

      const existingDevice = await BetaDeviceModel.findOne({ fingerprint }).session(session)
      if (existingDevice?.enabled) {
        await BetaDeviceModel.updateOne({ _id: existingDevice._id }, { $set: { lastSeenAt: now } }, { session })
        enabled = true
        return
      }

      if (bypassKey.maxDevices != null) {
        const deviceCount = await BetaDeviceModel.countDocuments({ bypassKey: bypassKey._id, enabled: true }).session(session)
        if (deviceCount >= bypassKey.maxDevices) return
      }

      await BetaDeviceModel.updateOne(
        { fingerprint },
        {
          $set: {
            enabled: true,
            bypassKey: bypassKey._id,
            lastSeenAt: now,
          },
          $setOnInsert: { fingerprint },
        },
        { upsert: true, session },
      )
      enabled = true
    })
  }
  finally {
    await session.endSession()
  }

  if (enabled) invalidateBetaDeviceAccess(fingerprint)
  return enabled
}

export async function removeBetaDevice(fingerprint: string) {
  const session = await liveDB.startSession()
  try {
    await session.withTransaction(async () => {
      const device = await BetaDeviceModel.findOne({ fingerprint }).session(session)
      if (!device) return
      await BetaDeviceModel.deleteOne({ _id: device._id }, { session })
      if (device.bypassKey) {
        await BetaKeyModel.updateOne({ _id: device.bypassKey }, { $inc: { enrollmentVersion: 1 } }, { session })
      }
    })
  }
  finally {
    await session.endSession()
  }
  invalidateBetaDeviceAccess(fingerprint)
}

export async function listBetaDevices() {
  return await BetaDeviceModel.find()
    .select('fingerprint note lastSeenAt bypassKey createdAt')
    .populate({ path: 'bypassKey', select: 'note expiresAt' })
    .sort({ lastSeenAt: -1 })
    .lean()
}
