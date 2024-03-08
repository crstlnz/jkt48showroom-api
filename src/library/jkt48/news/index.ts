import type { Context } from 'hono'
import News from '@/database/showroomDB/jkt48/News'

export async function getNews(c: Context): Promise<IApiNews> {
  const maxPerpage = 30
  let page = Number(c.req.query('page')) || 1
  let perpage = Number(c.req.query('perpage')) || 10
  if (perpage > maxPerpage) perpage = maxPerpage
  const total = await News.countDocuments({})
  const maxPage = Math.ceil(total / perpage)
  if (page < 1) page = 1
  if (page > maxPage) page = maxPage
  const news = await News.find({}).limit(perpage).skip((page - 1) * perpage).sort('-date').select('title date label id').lean()
  return {
    news,
    page,
    perpage,
    total_count: total,
  }
}
