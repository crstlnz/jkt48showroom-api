declare namespace Utils {
  interface ErrorData {
    error?: Error
    status?: number
    statusCode?: number
    statusMessage?: string
    message?: string
  }

  type DurationUnits = Partial<{
    milliseconds: number
    seconds: number
    minutes: number
    hours: number
    days: number
    months: number
    years: number
    weeks: number
  }>
}
