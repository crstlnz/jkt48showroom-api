import parse from 'node-html-parser'
import scrapeRequest from '../request'

export interface SousenkyoMemberDetail {
  id: number
  name: string
  img: string
  dob: string
  nickname: string
  url_video: string
  tagline: string
  bg: string
  mobileBg: string
  tag: string
  mTag: string
  nameImg: string
  count: number
  darkTheme: boolean
  ja: SousenkyoMemberDetailJa
}

export interface SousenkyoMemberDetailJa {
  name: string
  dob: string
  nickname: string
  tagline: string
}

export async function getSousenkyoMemberDetail(id: string): Promise<SousenkyoMemberDetail | null> {
  try {
    const url = `https://ssk.jkt48.com/2024/id/kandidat/${id}`
    const body = await scrapeRequest(url)
    const document = parse(body)
    const scriptTags = document.querySelectorAll('script')
    const data = extractCandidateData(scriptTags.map(i => i.textContent))
    if (data) {
      return { ...data.candidate }
    }
    return null
  }
  catch (e) {
    console.error(e)
    throw e
  }
}

function extractCandidateData(scripts: string[]) {
  for (const script of scripts) {
    const data = parseCandidateData(script)
    console.log(data)
    if (data?.candidate) {
      return data
    }
  }
  return null
}

function parseCandidateData(data: string): any | null {
  const regex = /"9:\[\\?"\$\\?",\\?"\$L13\\?",null,(.*?)\]\\?n"/
  const match = data.match(regex)
  if (match && match[1]) {
    const jsonString = match[1].replace(/\\"/g, '"').replace(/\\"/g, '"')
    try {
      const parsedData = JSON.parse(jsonString)
      return parsedData
    }
    catch {
      return null
    }
  }
  return null
}
