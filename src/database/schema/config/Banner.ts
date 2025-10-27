import type { Document } from 'mongoose'
import { model, Schema } from 'mongoose'
import { z } from 'zod'

export interface Banner {
  title: string
  img: string
  url: string
}

export interface GroupBanner extends Document {
  group: string
  banners: Banner[]
}

const BannerSchema = new Schema<Banner>(
  {
    title: { type: String, required: true },
    img: { type: String, required: true },
    url: { type: String, required: true },
  },
  { _id: false }, // tidak perlu id per banner
)

const GroupBannerSchema = new Schema<GroupBanner>(
  {
    group: { type: String, required: true, unique: true },
    banners: { type: [BannerSchema], required: true },
  },
  { timestamps: true },
)

// --- Banner Schema ---
export const BannerZod = z.object({
  title: z.string().min(1, 'Title is required'),
  img: z.string().url('Invalid image URL'),
  url: z.string().url('Invalid URL'),
})

// --- GroupBanner Schema ---
export const GroupBannerZod = z.object({
  group: z.string().min(1, 'Group name is required'),
  banners: z.array(BannerZod).min(1, 'At least one banner is required'),
})

export const GroupBannersZod = z.array(GroupBannerZod).min(1, 'At least one group is required')

// --- Types ---
export type BannerInput = z.infer<typeof BannerZod>
export type GroupBannerInput = z.infer<typeof GroupBannerZod>

export const GroupBannerModel = model<GroupBanner>('GroupBanner', GroupBannerSchema)
