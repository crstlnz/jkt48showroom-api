import type { Context } from 'hono'
import JKT48NewNews from '@/database/showroomDB/jkt48/JKT48NewNews'

export async function getNews(c: Context): Promise<IApiNews> {
  const maxPerpage = 30
  let page = Number(c.req.query('page')) || 1
  let perpage = Number(c.req.query('perpage')) || 10
  if (perpage > maxPerpage) perpage = maxPerpage
  const total = await JKT48NewNews.countDocuments({})
  const maxPage = Math.ceil(total / perpage)
  if (page < 1) page = 1
  if (page > maxPage) page = maxPage
  const news = await JKT48NewNews.find({}).limit(perpage).skip((page - 1) * perpage).sort('-valid_date_from').select('title label news_id category link valid_date_from valid_date_to').lean()
  return {
    news: news.map((i) => {
      return {
        date: new Date(i.valid_date_from ?? i.valid_date_to ?? 0),
        title: i.title,
        category: i.category,
        id: String(i.news_id),
        link: i.link,
        url: `https://jkt48.com/news/${i.link}`,
      }
    }),
    page,
    perpage,
    total_count: total,
  }
}
