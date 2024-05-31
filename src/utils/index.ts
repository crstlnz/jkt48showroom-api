export function getDateRange(_type: Stats.IDateRangeType): Stats.IDateRange {
  const date = new Date()
  date.setHours(0, 0, 0, -1)

  const from = new Date(new Date(date).setDate(date.getDate() - 7))
  const to = new Date(date)
  // TODO update this
  // let to: Date, from: Date
  // if (type === 'weekly') {
  //   from = new Date(new Date(date).setDate(date.getDate() - 7))
  //   to = new Date(date)
  // }
  // else if (type === 'monthly') {
  //   to = new Date(date)
  //   from = new Date(date.setMonth(to.getMonth() - 1))
  // }
  // else if (type === 'quarterly') {
  //   to = new Date(date)
  //   from = new Date(date.setMonth(to.getMonth() - 3))
  // }
  // else {
  //   to = date
  //   from = date
  // }

  from.setHours(0, 0, 0, 0)
  return {
    from: from.toISOString(),
    to: to.toISOString(),
  }
}

export function parseCookieString(cookieString: string): { [key: string]: ParsedCookie } {
  const cookieObj: { [key: string]: ParsedCookie } = {}

  if (cookieString) {
    const cookies = cookieString.split(',')

    cookies.forEach((cookie) => {
      const parts = cookie.trim().split(';')
      const [name, value] = parts[0].trim().split('=')
      const attributes: { [key: string]: string } = {}

      parts.slice(1).forEach((attr) => {
        const [attrName, attrValue] = attr.trim().split('=')
        attributes[attrName.toLowerCase()] = attrValue
      })

      cookieObj[name] = {
        value: decodeURIComponent(value),
        attributes,
      }
    })
  }

  return cookieObj
}

export function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export async function streamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let result = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    result += decoder.decode(value, { stream: true })
  }
  result += decoder.decode()
  return result
}
