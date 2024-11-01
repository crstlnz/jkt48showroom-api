import { Buffer } from 'buffer'
import cloudinary from 'cloudinary'
import defu from 'defu'
import config from '@/config'

export function uploadImage(image: string, configs?: cloudinary.UploadApiOptions): Promise<cloudinary.UploadApiResponse> {
  return new Promise<cloudinary.UploadApiResponse>((resolve, reject) => {
    const defaultCofnig: cloudinary.UploadApiOptions = { folder: config.uploadFolder }
    const combinedConfigs = defu(configs, defaultCofnig)
    cloudinary.v2.uploader.upload(
      image,
      {
        ...combinedConfigs,
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
