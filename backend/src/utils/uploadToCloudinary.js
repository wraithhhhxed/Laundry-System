import { v2 as cloudinary } from 'cloudinary'
import { Readable } from 'stream'
import { ApiError } from './ApiError.js'

const ALLOWED_SIGNATURES = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff],        offset: 0 },
  { mime: 'image/png',  bytes: [0x89, 0x50, 0x4e, 0x47], offset: 0 },
  { mime: 'image/gif',  bytes: [0x47, 0x49, 0x46, 0x38], offset: 0 },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, 
]

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

const detectMime = (buffer) => {
  for (const sig of ALLOWED_SIGNATURES) {
    const slice = buffer.slice(sig.offset, sig.offset + sig.bytes.length)
    if (sig.bytes.every((byte, i) => slice[i] === byte)) {
      
      if (sig.mime === 'image/webp') {
        const webpMarker = buffer.slice(8, 12)
        const expected   = [0x57, 0x45, 0x42, 0x50]
        if (!expected.every((byte, i) => webpMarker[i] === byte)) continue
      }
      return sig.mime
    }
  }
  return null
}

const uploadToCloudinary = async (fileBuffer, folder) => {
  // 1 Buffer guard
  if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
    throw new ApiError(400, 'File buffer is empty or invalid.')
  }

  //  2 Size guard 
  if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
    throw new ApiError(
      400,
      `File exceeds the 5 MB size limit (received ${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB).`
    )
  }

  // 3 Magic-byte MIME detection
  const detectedMime = detectMime(fileBuffer)

  if (!detectedMime) {
    
    const hex = [...fileBuffer.slice(0, 12)]
      .map(b => '0x' + b.toString(16).padStart(2, '0'))
      .join(' ')
    console.error(`[uploadToCloudinary] Unrecognised file signature: ${hex}`)
    throw new ApiError(400, 'Invalid file type. Allowed types: JPEG, PNG, GIF, WebP.')
  }

  // 4 Upload to Cloudinary
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        allowed_formats: ['jpg', 'png', 'webp', 'gif'],
      },
      (error, result) => {
        if (error) {
          return reject(new ApiError(500, `Cloudinary upload failed: ${error.message}`))
        }
        resolve(result.secure_url)
      }
    )

    Readable.from(fileBuffer).pipe(uploadStream)
  })
}

export { uploadToCloudinary }