// type Resolver<T> = (value: T | PromiseLike<T>) => void
// type Rejecter = (reason?: unknown) => void

export class SingleFlight {
  private inflight = new Map<string, Promise<unknown>>()

  async do<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // Jika sudah ada promise aktif dengan key sama, return promise yang sama
    if (this.inflight.has(key)) {
      return this.inflight.get(key) as Promise<T>
    }

    // Jalankan fungsi dan simpan promise-nya
    const p = (async () => {
      try {
        const result = await fn()
        return result
      }
      finally {
        // Hapus dari inflight setelah selesai, agar request berikutnya bisa jalan
        this.inflight.delete(key)
      }
    })()

    this.inflight.set(key, p)
    return p
  }

  has(key: string): boolean {
    return this.inflight.has(key)
  }

  clear(key?: string) {
    if (key) this.inflight.delete(key)
    else this.inflight.clear()
  }
}

export default new SingleFlight()
