import { parse } from 'node-html-parser'
import dayjs from 'dayjs'
import { Presets, SingleBar } from 'cli-progress'
import { extractYearAndMonthFromUrl } from './utils'
import { sleep } from '@/utils'

export async function getAllCalendar(headers: HeadersInit): Promise<string[]> {
  const res = await fetch('https://jkt48.com/calendar/list/', { headers })
  if (!res.ok) throw new Error('Fetch failed!')
  const body = await res.text()
  const doc = parse(body)
  const monthsData = doc.querySelectorAll(
    '.entry-schedule__footer .entry-schedule__footer--month a',
  )
  return monthsData.map(i => i.getAttribute('href')).filter(i => i !== undefined).sort(() => -1) as string[]
}

export async function getAllCalendarEvents(headers: HeadersInit): Promise<JKT48.Schedule[]> {
  const months = await getAllCalendar(headers)
  const events = []
  const bar = new SingleBar({}, Presets.shades_classic)
  bar.start(months.length, 0)

  for (const [index, url] of months.entries()) {
    await sleep(100)
    const data = await getCalendarEventsByUrl(url, 0, headers)
    events.push(...data)
    bar.update(index + 1)
  }
  bar.stop()

  return events
}

function getEvents(body: string, url: string): JKT48.Schedule[] {
  const document = parse(body)
  const items = document.querySelectorAll('table tbody tr')

  const events = []
  for (const event of items) {
    const dateString = Number.parseInt(event.querySelector('td:nth-child(1)')?.textContent?.trim() ?? '') ?? 1
    const yearMonth = extractYearAndMonthFromUrl(`https://jkt48.com${url}`)
    const date = dayjs(`${dateString}-${yearMonth.month}-${yearMonth.year}`, 'D-M-YYYY')
    for (const [, content] of event.querySelectorAll('td .contents').entries()) {
      const id = `${date.format('YYYYMMDD')}-${content.textContent.trim().toLowerCase().replaceAll(' ', '-')}`
      events.push({
        id,
        label: content.querySelector('img')?.getAttribute('src') ?? '',
        title: content.textContent.trim(),
        url: content.querySelector('a')?.getAttribute('href') ?? '',
        date: date.toDate(),
      })
    }
  }
  return events
}

export async function getCalendarEventsByUrl(url: string, retry = 0, headers: HeadersInit): Promise<JKT48.Schedule[]> {
  try {
    const res = await fetch(`https://jkt48.com${url}`, { headers })
    if (!res.ok) throw new Error('Fetch failed!')
    const body = await res.text()
    return getEvents(body, url)
  }
  catch (e) {
    if (retry > 10) {
      throw e
    }
    await sleep(300)
    return await getCalendarEventsByUrl(url, retry + 1, headers)
  }
}

export async function getCalendarEvents(date: Date, headers: HeadersInit): Promise<JKT48.Schedule[]> {
  const url = `https://jkt48.com/calendar/list/y/${date.getFullYear()}/m/${(date.getMonth() + 1)}/d/1`
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error('Fetch failed!')
  const body = await res.text()
  return getEvents(body, url)
}
