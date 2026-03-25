import JKT48NewNews from '@/database/showroomDB/jkt48/JKT48NewNews'
import News from '@/database/showroomDB/jkt48/News'
import { notFound } from '@/utils/errorResponse'

export async function getNewsDetail(id: string): Promise<JKT48.News> {
  const data = await JKT48NewNews.findOne({ $or: [{ link: id }, { news_id: Number.parseInt(id) || -1 }] }).lean()
  if (!data) {
    const news = await News.findOne({ id }).lean()
    if (!news) throw notFound()
    delete (news as any)._id
    delete (news as any).__v
    return news
  }

  return {
    date: new Date(data.valid_date_from ?? 0),
    id: String(data.news_id),
    title: data.title,
    category: data.category,
    url: `https://jkt48.com/news/${data.link}`,
    content: data.content_body ?? '',
    slug: data.link,
  }
}
