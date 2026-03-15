import IdolMember from '@/database/schema/48group/IdolMember'

export default async function getMemberProfileVideos() {
  const members = await IdolMember.find({ 'info.generation': 'gen14-jkt48', 'info.is_graduate': false })
  return members.map((i) => {
    return {
      name: i.name,
      nickname: i.info.nicknames?.[0] ?? null,
      birthdate: i.info.birthdate,
      img: i.info.img,
      video: i.info.profile_video,
      slug: i.slug,
    }
  })
}
