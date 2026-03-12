export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  cooldownMs: number,
) {
  let lastCall = 0
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    const now = Date.now()
    const remaining = cooldownMs - (now - lastCall)

    if (remaining <= 0) {
      lastCall = now
      fn(...args)
    }
    else {
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(() => {
        lastCall = Date.now()
        fn(...args)
      }, remaining)
    }
  }
}
