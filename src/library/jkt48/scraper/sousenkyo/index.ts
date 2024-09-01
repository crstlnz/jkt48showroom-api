import parse from 'node-html-parser'
import scrapeRequest from '../request'
import type { SousenkyoMemberDetail } from './member_detail'
import { getSousenkyoMemberDetail } from './member_detail'
import { sleep } from '@/utils'
import Sousenkyou2024 from '@/database/showroomDB/jkt48/Sousenkyou2024'
import IdolMember from '@/database/schema/48group/IdolMember'
import { notFound } from '@/utils/errorResponse'

export interface SousenkyoMember {
  name: string
  id: string
  url: string
  data?: SousenkyoMemberDetail | null
}

const cacheTime = 1000 * 60 * 60 * 24
let cacheData: SousenkyoMember[] = []
let promise: Promise<SousenkyoMember[]> | null = null
export async function getSousenkyoMembers(): Promise<SousenkyoMember[]> {
  if (cacheData.length) {
    return cacheData
  }
  else {
    if (promise) {
      return await promise
    }
    else {
      promise = new Promise((resolve) => {
        getSousenkyoMembersFetch().then((d) => {
          cacheData = d
          resolve(d)
        }).catch(e => resolve([]))
      })
      return await promise
    }
  }
}

export async function getSousenkyoMembersFetch(retry: number = 0): Promise<SousenkyoMember[]> {
  try {
    const data_id = 'sousenkyo2024'
    const data = await Sousenkyou2024.findOne({ id: data_id }).lean()
    if (data) {
      const last_fetch = new Date(data.last_fetch)
      if (new Date().getTime() - last_fetch.getTime() < cacheTime) {
        return data.data
      }
    }

    const url = `https://ssk.jkt48.com/2024/id/kandidat`
    const body = await scrapeRequest(url)
    const document = parse(body)
    const memberElements = document.querySelectorAll('section > div > div')
    const res: SousenkyoMember[] = []
    for (const memberElement of memberElements) {
      const url = memberElement.querySelector('a')?.getAttribute('href')
      const id = url?.split('/')?.pop()
      res.push({
        name: memberElement.querySelector('div a')?.textContent?.trim() ?? '',
        id: id ?? '',
        url: url ?? '',
        data: id ? await getSousenkyoMemberDetail(id) : null,
      })
    }

    await Sousenkyou2024.updateOne({
      id: data_id,
    }, {
      $set: {
        id: data_id,
        data: res,
        last_fetch: new Date(),
      },
    }, {
      upsert: true,
    })
    return res
  }
  catch (e) {
    console.error(e)
    if (retry > 20) {
      throw e
    }
    console.log('Error fetching sousenkyou member')
    await sleep(1000)
    return await getSousenkyoMembersFetch(retry + 1)
  }
}

export async function getSousenkyoMemberByRoomId(room_id: string) {
  const memberData = await IdolMember.findOne({ showroom_id: room_id }).select({ jkt48id: true }).lean()
  const sousenkyoData = await getSousenkyoMembers()
  console.log(memberData?.jkt48id)
  const data = sousenkyoData.find(i => memberData?.jkt48id?.includes(i.id))
  if (data) return data
  throw notFound()
}
