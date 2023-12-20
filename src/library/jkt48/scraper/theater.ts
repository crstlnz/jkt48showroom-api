import { parse } from 'node-html-parser'
import dayjs from 'dayjs'
import { extractIdFromUrl, extractTeamId, getTheaterId } from './utils'
import 'dayjs/locale/id'
import { sleep } from '@/utils'

export async function getTheaterDetail(id: string, retry = 1, headers: HeadersInit): Promise<{ show: JKT48.Theater[], members: JKT48.Member[] }> {
  try {
    const url = `https://jkt48.com/theater/schedule/id/${id}?lang=id`
    const res = await fetch(url, { headers })
    if (!res.ok) throw new Error('Fetch failed!')
    const document = parse(await res.text())
    const table = document.querySelector(
      'body > div.container > div.row > div > div > div:nth-child(5) > div.table-responsive.table-pink__scroll > table',
    )

    const shows = table?.querySelectorAll('tbody tr')
    if (!shows) throw new Error('Show not found!')
    const theaterData: JKT48.Theater[] = []
    const theaterId = getTheaterId(url) ?? url
    const memberMap = new Map<string, JKT48.Member>()
    for (const [num, show] of shows.entries()) {
      const title = show.querySelector('td:nth-child(2)')?.textContent ?? ''
      const team = show.querySelector('td:nth-child(2) img')?.getAttribute('src') ?? ''
      const dateString = (show.querySelector('td:nth-child(1)')?.textContent ?? '').toLowerCase().split('show')
      const clock = dateString[1]
      const date = !clock ? dayjs(dateString[0], 'dddd, D.M.YYYY') : dayjs(`${dateString[0]} ${clock}`, 'dddd, D.M.YYYY H:mm')
      // const date = extractDateTime(
      //   show.querySelector('td:nth-child(1)')?.textContent ?? ''
      // )
      const members = new Map<string, JKT48.Member>()
      const memberLinks = show.querySelectorAll('td:nth-child(3) a')
      const seitansai = []

      for (const member of memberLinks) {
        const id = extractIdFromUrl(member.getAttribute('href') ?? '0')
        if (members.has(id)) {
          seitansai.push({ ...members.get(id) })
        }
        else {
          members.set(id, {
            id,
            name: member.textContent,
            url: member.getAttribute('href') ?? '',
          })
        }
        memberMap.set(id, {
          id,
          name: member.textContent,
          url: member.getAttribute('href') ?? '',
        })
      }

      if (date == null) {
        throw new Error(`Date kosong , ${url}`)
      }

      theaterData.push({
        id: shows.length > 1 ? `${theaterId}-${num}` : theaterId,
        setlistId: title.replaceAll(' ', '').toLowerCase().trim(),
        title,
        team: {
          id: extractTeamId(team) ?? '',
          img: team,
        },
        date: date.toDate(),
        memberIds: Array.from(members.values()).map(i => i.id),
        seitansaiIds: seitansai.map(i => i.id ?? '0'),
        url,
      })
    }

    return {
      show: theaterData,
      members: Array.from(memberMap.values()),
    }
  }
  catch (e) {
    if (retry > 20) {
      throw e
    }
    console.log('Error fetching', id)
    console.log('Retry', id)
    await sleep(1000)
    return await getTheaterDetail(id, retry + 1, headers)
  }
}
