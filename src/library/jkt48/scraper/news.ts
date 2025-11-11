import dayjs from 'dayjs'
import { parse } from 'node-html-parser'
import { sleep } from '@/utils'
import { extractNewsId } from './utils'

const url = 'https://jkt48.com/news/list'
// dayjs.extend(LocaleData)
export async function getNewsPage(page = 1, news: JKT48.News[] = [], headers: HeadersInit): Promise<JKT48.News[]> {
  await sleep(350)
  const res = await fetch(`${url}?page=${page}&lang=id`, {
    headers,
  })
  if (!res.ok) throw new Error('Fetch Fail!')
  const document = await parse(await res.text())
  const newsElement = document.querySelectorAll('.entry-news .entry-news__list')
  for (const n of newsElement) {
    const dateString = n.querySelector('time')?.textContent?.trim() ?? ''
    news.push({
      id: extractNewsId(n.querySelector('div h3 a')?.getAttribute('href') ?? '') ?? '0',
      label: n.querySelector('img')?.getAttribute('src') ?? '',
      title: n.querySelector('div h3 a')?.textContent ?? '',
      url: n.querySelector('div h3 a')?.getAttribute('href') ?? '',
      date: dayjs(dateString, 'D MMMM YYYY').toDate(),
    })
  }

  return news.sort((a, b) => Number(a.id) - Number(b.id))
}

export async function getAllNews(page = 1, news: JKT48.News[] = [], headers: HeadersInit): Promise<JKT48.News[]> {
  await sleep(350)
  const res = await fetch(`${url}?page=${page}&lang=id`, {
    headers,
  })
  if (!res.ok) throw new Error('Fetch Fail!')
  const document = await parse(await res.text())
  const newsElement = document.querySelectorAll('.entry-news .entry-news__list')
  const pagination = document.querySelector('.entry-news .entry-news__list--pagination')

  for (const n of newsElement) {
    const dateString = n.querySelector('time')?.textContent?.trim() ?? ''
    news.push({
      id: extractNewsId(n.querySelector('div h3 a')?.getAttribute('href') ?? '') ?? '0',
      label: n.querySelector('img')?.getAttribute('src') ?? '',
      title: n.querySelector('div h3 a')?.textContent ?? '',
      url: n.querySelector('div h3 a')?.getAttribute('href') ?? '',
      date: dayjs(dateString, 'D MMMM YYYY').toDate(),
    })
  }

  if (pagination?.querySelector('.next a')) {
    return await getAllNews(page + 1, news, headers)
  }
  else {
    return news.sort((a, b) => Number(a.id) - Number(b.id))
  }
}

export async function getNews(id: string, headers: HeadersInit): Promise<JKT48.News> {
  const url = `https://jkt48.com/news/detail/id/${id}?lang=id`
  const res = await fetch(url, {
    headers,
  })
  if (!res.ok) throw new Error('Fetch Fail!')
  const document = await parse(await res.text())
  const content = document.querySelector('.entry-news .entry-news__detail div:last-child')?.innerHTML ?? ''
  const date = document.querySelector('.entry-news .entry-news__detail div')?.textContent?.trim() ?? ''
  const title = document.querySelector('.entry-news .entry-news__detail h3')?.textContent?.trim() ?? ''
  return {
    id,
    title,
    url,
    date: dayjs(date, 'D MMMM YYYY').toDate(),
    content,
  }
}
