import News from '@/database/showroomDB/jkt48/News'

export async function getNewsDetail(id: string): Promise<JKT48.News> {
  return await News.findOne({ id }).orFail().select('title date label id content').lean()
}
