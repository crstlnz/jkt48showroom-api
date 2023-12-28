export function getTheaterId(url: string) {
  const pattern = /\/(\d+)\?/
  const match = url.match(pattern)
  if (match) {
    return match[1]
  }
  else {
    return null // URL tidak sesuai pola yang diharapkan
  }
}

export function extractDateTime(input: string) {
  const dateRegex = /(\d{1,2}[.:]\d{1,2}[.:]\d{4})Show (\d{1,2}[.:]\d{2})/
  const match = input.match(dateRegex)

  if (match) {
    const [, dateStr, timeStr] = match
    const [day, month, year] = dateStr.split(/[.:]/).map(Number)
    const [hours, minutes] = timeStr.split(/[.:]/).map(Number)

    const date = new Date(year, month - 1, day, hours, minutes)
    return date
  }
  else {
    return null // Tidak ada tanggal dan waktu yang ditemukan dalam string.
  }
}

export function extractIdFromUrl(url: string): string {
  const regex = /\/member\/detail\/id\/(\d+)/
  const match = url.match(regex)

  if (match && match[1]) {
    return match[1]
  }
  else {
    return '0'
  }
}

export function extractTeamId(filename: string): string | null {
  const parts = filename.split('.')
  if (parts.length >= 2) {
    return parts[1]
  }
  else {
    return null
  }
}

export function extractDateCalendar(input: string): number | null {
  const match = input.match(/^\d+/) // Use a regex to find the leading number
  if (match !== null) {
    const number = Number.parseInt(match[0], 10) // Convert the matched string to a number
    return Number.isNaN(number) ? null : number // Check if it's a valid number
  }
  return null // No number found in the input string
}

// export function extractYearFromUrl(url: string): string | null {
//   const urlObj = new URL(url)
//   const yearParam = urlObj.searchParams.get('y')

//   if (yearParam) {
//     return yearParam
//   }
//   else {
//     return null
//   }
// }

// export function extractMonthFromUrl(url: string): string | null {
//   const urlObj = new URL(url)
//   const yearParam = urlObj.searchParams.get('m')

//   if (yearParam) {
//     return yearParam
//   }
//   else {
//     return null
//   }
// }

export function extractYearAndMonthFromUrl(url: string): { year: number | null, month: number | null } {
  const regex = /\/y\/(\d{4})\/m\/(\d{1,2})\//
  const match = url.match(regex)

  if (match && match.length === 3) {
    const year = Number.parseInt(match[1], 10)
    const month = Number.parseInt(match[2], 10)

    return { year, month }
  }

  return { year: null, month: null }
}

export function extractNewsId(url: string): string | null {
  // Define a regular expression pattern to match the number in the URL
  const regex = /\/id\/(\d+)/

  // Use the regex to match the URL
  const match = url.match(regex)

  // If a match is found, return the captured number; otherwise, return null
  if (match && match[1]) {
    return match[1]
  }
  else {
    return null
  }
}
