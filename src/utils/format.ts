import dayjs from 'dayjs'
import defu from 'defu'

export const Rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
})

interface DurationFormatOpts {
  year?: boolean
  month?: boolean
  day?: boolean
  hour?: boolean
  minute?: boolean
  second?: boolean
}

const defaultDurationFormat: DurationFormatOpts = {
  year: false,
  month: false,
  day: true,
  hour: true,
  minute: true,
  second: true,
}

export function durationFormat(value: number | string, opts?: DurationFormatOpts) {
  opts = defu(opts, defaultDurationFormat)
  const ms = typeof value == 'string' ? Number.parseInt(value) : value
  if (Number.isNaN(ms)) throw new Error('Not a number!')
  const duration = dayjs.duration(ms)
  const str = []
  const year = duration.years()
  const month = duration.months()
  const day = duration.days()
  const hour = duration.hours()
  const minute = duration.minutes()
  const second = duration.seconds()
  if (year && opts.year) str.push(`${year || ''} Tahun`)
  if (month && opts.month) str.push(`${month || ''} Bulan`)
  if (day && opts.day) str.push(`${day || ''} Hari`)
  if (hour && opts.hour) str.push(`${hour || ''} Jam`)
  if (minute && opts.minute) str.push(`${minute || ''} Menit`)
  if (second && opts.second) str.push(`${second || ''} Detik`)
  if (!str.length && !opts.second) {
    str.push(`${second || '0'} Detik`)
  }
  return str.join(' ')
}

export function youtubeViewsFormat(
  views: string | number | null | undefined,
  locale: string,
  suffix: boolean = true,
) {
  views = Number.isNaN(views) ? 0 : Number(views)
  let formattedViews: string

  // Pilih format sesuai dengan lokal yang diberikan
  if (locale === 'id') {
    if (views >= 1_000_000_000) {
      formattedViews = `${(views / 1_000_000).toFixed(1)} M`
    }
    else if (views >= 1_000_000) {
      formattedViews = `${(views / 1_000_000).toFixed(1)} jt`
    }
    else if (views >= 1_000) {
      formattedViews = `${(views / 1_000).toFixed(1)} rb`
    }
    else {
      formattedViews = views.toString()
    }
  }
  else {
    if (views >= 1_000_000_000) {
      formattedViews = `${(views / 1_000_000).toFixed(1)}B`
    }
    else if (views >= 1_000_000) {
      formattedViews = `${(views / 1_000_000).toFixed(1)}M`
    }
    else if (views >= 1_000) {
      formattedViews = `${(views / 1_000).toFixed(1)}K`
    }
    else {
      formattedViews = views.toString()
    }
  }

  formattedViews = formattedViews.replace(/\.0$/, '') // Menghapus .0 jika ada
  if (suffix) {
    if (locale === 'id') {
      formattedViews += ''
    }
    else {
      formattedViews += ' views'
    }
  }
  return formattedViews
}
