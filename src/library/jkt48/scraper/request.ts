const scrapeUrls = String(process.env.JKT48_SCRAPE_URL ?? '').split(',').map(i => i.trim())
const sskScrapeUrls = String(process.env.SSK_SCRAPE_URL ?? '').split(',').map(i => i.trim())

let num = 0
export function getScrapeUrl(ssk: boolean): string {
  const scrapeUrlList = ssk ? sskScrapeUrls : scrapeUrls
  num += 1
  return scrapeUrlList[num % scrapeUrls.length]
}

function getUrl(url: string) {
  if (url.startsWith('https://ssk.jkt48.com/')) return url.replace('https://ssk.jkt48.com/', getScrapeUrl(true))
  return url.replace('https://jkt48.com/', getScrapeUrl(false))
}

export default async function scrapeRequest(url: string): Promise<string> {
  const maskedUrl = getUrl(url)
  const res = await fetch(maskedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 5.1; rv:5.0) Gecko/20100101 Firefox/5.0',
    },
  })
  if (!res.ok) { throw new Error('Failed!') }
  return await res.text()
}
