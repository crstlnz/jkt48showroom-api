interface Value {
  value: any
  expireIn: number
  date: number
}
function setValue(value: string | object | number, ms: number): Value {
  return {
    value,
    expireIn: ms,
    date: new Date().getTime(),
  }
}

class LocalCacheManager {
  map: Map<string | number, Value>
  constructor() {
    this.map = new Map()
  }

  set(key: string | number, value: any, ms = 3600000) {
    if (!key) throw new Error('No Key')
    this.map.set(key, setValue(value, ms))
  }

  get<T>(key: string | number): T | null {
    return this.map.get(key)?.value as T
  }

  delete(key: string | number) {
    return this.map.delete(key)
  }

  clear() {
    this.map.clear()
  }

  has(key: string | number) {
    return this.map.has(key)
  }

  valid(key: string | number) {
    if (!this.map.has(key)) return false
    const d = this.map.get(key)
    if (
      new Date().getTime() - new Date(d?.date ?? 0).getTime()
        < (d?.expireIn ?? 0)
    ) { return true }
    return false
  }
}

export default LocalCacheManager
export type { Value }
