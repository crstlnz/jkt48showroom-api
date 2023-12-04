import News from '@/database/showroomDB/jkt48/News'

async function getNews(query?: any): Promise<IApiNews> {
  let page = Number(query?.page) || 1
  const perpage = Number(query?.perpage) || 10
  const total = await News.countDocuments({})
  const maxPage = Math.ceil(total / perpage)
  if (page < 1) page = 1
  if (page > maxPage) page = maxPage
  const news = await News.find({}).limit(10).skip((page - 1) * perpage).sort('-date').select('title date label id').lean()
  return {
    news,
    page,
    perpage,
    total_count: total,
  }
}

export { getNews }
