const c = '_sess_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU0MjAzMDMiLCJuYW1lIjoiS2VsdmluIiwiYWNjb3VudF9pZCI6Im1hdGlqaXMxMDAxIiwiaW1hZ2UiOiJodHRwczovL3N0YXRpYy5zaG93cm9vbS1saXZlLmNvbS9pbWFnZS9wcm9mL2Y2ZTU4YzM3YTI3Mzc0YmVmNDFhNWYzMGM1MDFhZGIyMTIyYmUyYmM4MjBiODFhNzgxNWZmOGMzYTZkMjUzNWJfcy5qcGVnP3Y9MTYyMjIxMTg0NyIsImF2YXRhcl9pZCI6IjEwMzg2NjkiLCJzcl9pZCI6InhPMVlkc1V5bWRQUE01UzhlZE1OVGlMNWJlSjYwcl9PbFRxOWFiNVVnc1pQamZvZGFFOHptb3VmeVZ5OXA5a2QiLCJpYXQiOjE3MDE4NzYxMzksIm5iZiI6MTcwMTg3NjEzOSwiZXhwIjoxNzAxODc2MTQ0fQ.aB3JvKbVjdmHMPqs6CNdPzcADS7qXOUs6DzJ7qbps2E; Max-Age=2630000; Path=/, _refresh_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU0MjAzMDMiLCJpYXQiOjE3MDE4NzYxMzksIm5iZiI6MTcwMTg3NjEzOSwiZXhwIjoxNzA0NTA2MTM5fQ.cB-4y6v6wNkr3lmuZ-iZy1tNXJdrHFMEAiEjjyHg9mE; Max-Age=2630000; Path=/; Secure; HttpOnly;'
const w = '18n_redirected=id; filterOption=%7B%22generation%22%3A%5B%5D%2C%22graduate%22%3Afalse%2C%22active%22%3Atrue%7D; _sr_sess=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzcl9pZCI6IkVlTFdHMWpZZ3hDM1RJcU02YS1jbnRJSE93QTFxWWFsR0xpUERPT1pnWGJ3YTlaUUFnNlJoRkVZNU80c2o2MmMiLCJjc3JmX3Rva2VuIjoiMnJDb3hHM0F1bnhIMzlTR3lzdmQwem54VjFuQ0dOWDhPZTBtalpBciJ9.JNcWLyTl5pNCALX-SYJCEGCz6X9bJL4o2seetMj38qo; _sess_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU0MjAzMDMiLCJuYW1lIjoiS2VsdmluIiwiYWNjb3VudF9pZCI6Im1hdGlqaXMxMDAxIiwiaW1hZ2UiOiJodHRwczovL3N0YXRpYy5zaG93cm9vbS1saXZlLmNvbS9pbWFnZS9wcm9mL2Y2ZTU4YzM3YTI3Mzc0YmVmNDFhNWYzMGM1MDFhZGIyMTIyYmUyYmM4MjBiODFhNzgxNWZmOGMzYTZkMjUzNWJfcy5qcGVnP3Y9MTYyMjIxMTg0NyIsImF2YXRhcl9pZCI6IjEwMzg2NjkiLCJzcl9pZCI6InhPMVlkc1V5bWRQUE01UzhlZE1OVGlMNWJlSjYwcl9PbFRxOWFiNVVnc1pQamZvZGFFOHptb3VmeVZ5OXA5a2QiLCJpYXQiOjE3MDE4ODgyMzYsIm5iZiI6MTcwMTg4ODIzNiwiZXhwIjoxNzAxODg4MjQxfQ.1M_Dd2G6Ykd0ag4Npbbtd4x4Df7NAFm-FOPXi7MR448; _refresh_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU0MjAzMDMiLCJpYXQiOjE3MDE4ODgyMzYsIm5iZiI6MTcwMTg4ODIzNiwiZXhwIjoxNzA0NTE4MjM2fQ.HEsJ0jn39czBhyw67mI6BtFOodOX-Zt01te-sMeQjoQ; _sess_id=17e93ae4-29f6-4829-8c92-8035dbe75116'

interface CookieOptions {
  name: string
  value?: string
}

interface CookieObject {
  name: string
  value: string
  options: CookieOptions[]
}

const cookieOpts = ['Path', 'Expires', 'Max-Age', 'Secure', 'HttpOnly', 'SameSite', 'Domain']
class CookieParser extends Map<string, CookieObject> {
  constructor(cookieString?: string) {
    super()
    if (cookieString) {
      this.addCookies(cookieString)
    }
  }

  addCookies(cookieString: string): CookieParser {
    const cookies = this.parseCookie(cookieString)
    for (const [key, value] of cookies.entries()) {
      this.set(key, value)
    }

    return this
  }

  toArray() {
    return [...this.values()]
  }

  toString() {
    return this.serializeCookie(this.toArray())
  }

  parseCookie(cookieString: string): Map<string, CookieObject> {
    const splitted = cookieString.split(';')
    const cookieMap = new Map<string, CookieObject>()
    const cookieArray: CookieObject[] = []
    let num = -1
    for (const s of splitted) {
      if (s) {
        const c = s?.trim().split('=')
        if (!cookieOpts.some(i => i.toLowerCase() === c[0]?.trim()?.toLowerCase())) {
          num++
          cookieArray.push({
            name: c[0],
            value: c[1],
            options: [],
          })
        }
        else {
          cookieArray[num].options.push({ name: c[0], value: c.slice(1, c.length)?.join('=') || undefined })
        }
      }
    }

    for (const a of cookieArray) {
      cookieMap.set(a.name, a)
    }
    return cookieMap
  }

  serializeCookie(cookies: CookieObject[]): string {
    const c = []
    for (const cookie of cookies) {
      c.push(`${cookie.name}=${cookie.value}`)

      for (const opt of cookie.options) {
        if (opt.value) {
          c.push(`${opt.name}=${opt.value}`)
        }
        else {
          c.push(opt.name)
        }
      }
    }

    return c.join('; ')
  }
}

export default CookieParser
