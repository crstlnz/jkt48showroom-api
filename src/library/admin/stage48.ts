import IdolMember from '@/database/schema/48group/IdolMember'

export async function getStage48(group: string | null = null): Promise<IdolMember[]> {
  try {
    if (group === 'all') group = null
    const members: IdolMember[] = await IdolMember.find(group ? { group } : {})
      .lean()
    return members
      .sort((a, b) => a.name.localeCompare(b.name))
  }
  catch (e) {
    console.log(e)
    return []
  }
}
