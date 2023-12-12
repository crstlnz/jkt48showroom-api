import Member from '@/database/schema/48group/Member'

export async function getStage48(group: string | null = null): Promise<Admin.I48Member[]> {
  try {
    const members: Admin.I48Member[] = await Member.find(group ? { group } : {})
      .lean()
    return members
      .sort((a, b) => a.name.localeCompare(b.name))
  }
  catch (e) {
    console.log(e)
    return []
  }
}
