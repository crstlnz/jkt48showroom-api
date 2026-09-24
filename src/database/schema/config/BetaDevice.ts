import type { Document, Types } from 'mongoose'
import { Schema } from 'mongoose'
import { liveDB } from '@/database'

export interface BetaDevice extends Document {
  fingerprint: string
  enabled: boolean
  bypassKey?: Types.ObjectId
  note?: string
  lastSeenAt?: Date
}

const BetaDeviceSchema = new Schema<BetaDevice>(
  {
    fingerprint: { type: String, required: true, unique: true, index: true },
    enabled: { type: Boolean, required: true, default: true },
    bypassKey: { type: Schema.Types.ObjectId, ref: 'BetaKey', index: true },
    note: { type: String, trim: true, maxlength: 200 },
    lastSeenAt: { type: Date },
  },
  { timestamps: true },
)

export const BetaDeviceModel = liveDB.model<BetaDevice>('BetaDevice', BetaDeviceSchema, 'allowedbetadevices')
