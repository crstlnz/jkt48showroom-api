import type { SousenkyoMember } from '@/library/jkt48/scraper/sousenkyo'
import { Schema } from 'mongoose'
import { jkt48DB } from '@/database'

interface Sousenkyo2024 { id: string, data: SousenkyoMember[], last_fetch: Date }

const sousenkyo = new Schema<Sousenkyo2024>({
  id: String,
  data: {
    name: String,
    id: String,
    url: String,
    data: {
      id: Number,
      name: String,
      img: String,
      dob: String,
      nickname: String,
      url_video: String,
      tagline: String,
      bg: String,
      mobileBg: String,
      tag: String,
      mTag: String,
      nameImg: String,
      count: {
        type: Number,
        default: 0,
      },
      darkTheme: Boolean,
      ja: {
        name: String,
        dob: String,
        nickname: String,
        tagline: String,
      },
    },
  },
  last_fetch: {
    type: Date,
  },
})

export default jkt48DB.model<Sousenkyo2024>(
  'Sousenkyo2024',
  sousenkyo,
)
