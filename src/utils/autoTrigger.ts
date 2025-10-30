// utils/autoTrigger.ts
export class AutoTrigger {
  private lastCall = 0
  private timer?: NodeJS.Timeout

  constructor(
    private readonly fn: (...args: any[]) => Promise<void>,
    private readonly intervalMs: number,
  ) {
  }

  /**
   * Tandai fungsi ini baru saja dipanggil.
   */
  touch() {
    this.lastCall = Date.now()
  }

  /**
   * Mulai auto-trigger loop.
   * Jika fungsi tidak dipanggil selama interval, maka otomatis dijalankan.
   */
  start(...args: any[]) {
    this.lastCall = Date.now()
    this.timer = setInterval(async () => {
      const now = Date.now()
      if (now - this.lastCall > this.intervalMs) {
        console.log(`[AutoTrigger] Inactive for ${this.intervalMs / 1000}s, calling function...`)
        await this.fn(...args)
        this.lastCall = now
      }
    }, this.intervalMs) // cek tiap menit
    return this
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
  }
}
