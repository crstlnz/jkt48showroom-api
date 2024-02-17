import Showroom from '@/database/schema/showroom/Showroom'

export default async function getMissingJikosoukai(): Promise<Admin.MissingJiko[]> {
  const member = (await Showroom.find({}).populate({
    path: 'member_data',
  }).lean()).filter(i => i.member_data != null && (i.member_data?.info?.jikosokai == null || i.member_data?.info?.jikosokai?.toLowerCase() === 'trivia')).sort((a, b) => {
    if (a.group === b.group) {
      if (a.member_data?.info?.is_graduate === b.member_data?.info?.is_graduate) {
        return (a.name > b.name) ? 1 : -1
      }
      else {
        return a.member_data?.info?.is_graduate === false ? -1 : 1
      }
    }
    else {
      return a.group === 'jkt48' ? -1 : 1
    }
  })

  return member.map((i) => {
    return {
      name: i.name,
      img: i.img,
      img_alt: i.member_data?.info?.img,
      member_id: (i.member_data as any)?._id as string,
      room_id: i.room_id,
      url: i.url,
    }
  })
}
