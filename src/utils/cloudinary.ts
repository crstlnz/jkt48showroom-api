import { Buffer } from 'buffer'
import cloudinary from 'cloudinary'
import config from '@/config'

export function uploadImage(image: any): Promise<any> {
  return new Promise<any>((resolve, reject) => {
    cloudinary.v2.uploader.upload(
      image,
      {
        folder: config.uploadFolder,
      },
      (error: any, result: any) => {
        if (error) {
          return reject(error)
        }
        else {
          return resolve(result)
        }
      },
    )
  })
}

export function uploadImageBuffer(image: Buffer | ArrayBuffer): Promise<any> {
  const imageBuffer = image instanceof Buffer ? image : Buffer.from(image)
  return new Promise((resolve, reject) => {
    cloudinary.v2.uploader.upload_stream((error, uploadResult) => {
      if (error) return reject(error)
      return resolve(uploadResult)
    }).end(imageBuffer)
  })
}
