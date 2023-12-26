import { ofetch } from 'ofetch'
import Member from '@/database/schema/48group/Member'

const idnUsernames = new Set<string>()
const additionalUsernames = ['jkt48-official']
export async function getAllIDNUsername(): Promise<Set<string>> {
  if (idnUsernames.size) return idnUsernames
  const data = (await Member.find({ idn_username: { $exists: true } }).lean()).map(i => i.idn_username) || []
  if (data.length) {
    const usernames = [...data.filter(i => i != null) as string[], ...additionalUsernames]
    for (const username of usernames) {
      idnUsernames.add(username)
    }

    setTimeout(() => {
      idnUsernames.clear()
    }, 3600_000)
  }
  else {
    console.log('IDN Usernames is empty!')
  }

  return idnUsernames
}

let idnLivesCache: IDNLives[] = []
export async function getIDNLives(): Promise<IDNLives[]> {
  try {
    const data = await fetch()
    idnLivesCache = data
    return data
  }
  catch (e) {
    if (idnLivesCache.length) {
      return idnLivesCache
    }
    throw e
  }
}

export async function fetch(): Promise<IDNLives[]> {
  const res = await ofetch(`https://api.idn.app/graphql`, {
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: JSON.stringify({
      query:
            'query SearchLivestream { searchLivestream(query: "", limit: 1000) { next_cursor result { slug title image_url view_count playback_url room_identifier status live_at end_at scheduled_at gift_icon_url category { name slug } creator { uuid username name avatar bio_description following_count follower_count is_follow } } }}',
    }),
  })

  const data = res?.data?.searchLivestream?.result

  if (data?.length) {
    const usernames = await getAllIDNUsername()
    const result = []
    const filtered = data.filter((i: any) => {
      return usernames.has(i.creator?.username || '0')
    })

    if (process.env.NODE_ENV === 'development') {
      if (filtered.length) {
        result.push(...filtered)
      }
      else {
        result.push(...data.slice(0, 5))
      }
    }
    else {
      result.push(...filtered)
    }

    return result.map((i: any) => {
      return {
        user: {
          id: i.creator?.uuid,
          name: i.creator?.name,
          username: i.creator?.username,
          avatar: i.creator?.avatar,
        },
        image: i.image_url,
        stream_url: i.playback_url,
        title: i.title,
        slug: i.slug,
        view_count: i.view_count,
        live_at: new Date(i.live_at).toISOString(),
      }
    })
  }
  return []
}
