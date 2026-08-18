import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';
import type { CloudinaryUploadResult } from '@/types/types';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

// Maximum file size in bytes (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Compress an image using sharp
 * @param buffer - Buffer of the image
 * @param maxSizeBytes - Maximum size in bytes
 */
async function compressImageBuffer(buffer: Buffer, maxSizeBytes: number = MAX_FILE_SIZE): Promise<Buffer> {
  let quality = 90;
  let compressed = buffer;
  
  // Get image metadata
  const metadata = await sharp(buffer).metadata();
  
  // Start with resizing if image is very large
  const originalWidth = metadata.width || 2000;
  const originalHeight = metadata.height || 2000;
  const maxDimension = 2000;
  
  let resizeOptions: { width?: number; height?: number } = {};
  
  if (originalWidth > maxDimension || originalHeight > maxDimension) {
    if (originalWidth > originalHeight) {
      resizeOptions.width = maxDimension;
    } else {
      resizeOptions.height = maxDimension;
    }
  }
  
  // Try compressing with decreasing quality
  while (quality >= 20) {
    let sharpInstance = sharp(buffer);
    
    if (resizeOptions.width || resizeOptions.height) {
      sharpInstance = sharpInstance.resize(resizeOptions.width, resizeOptions.height, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }
    
    compressed = await sharpInstance
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
    
    if (compressed.length <= maxSizeBytes) {
      console.log(`Compressed to ${(compressed.length / 1024 / 1024).toFixed(2)}MB at quality ${quality}`);
      break;
    }
    
    quality -= 10;
  }
  
  // If still too large, reduce dimensions more aggressively
  if (compressed.length > maxSizeBytes) {
    const scaleFactor = Math.sqrt(maxSizeBytes / compressed.length) * 0.95; // 0.9 for safety margin
    const newWidth = Math.floor(originalWidth * scaleFactor);
    const newHeight = Math.floor(originalHeight * scaleFactor);
    
    compressed = await sharp(buffer)
      .resize(newWidth, newHeight, { fit: 'inside' })
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();
    
    console.log(`Further compressed with dimension reduction to ${(compressed.length / 1024 / 1024).toFixed(2)}MB`);
  }
  
  return compressed;
}

/**
 * Upload an image to Cloudinary
 * @param file - File object to upload
 * @param folder - Cloudinary folder path (e.g., 'ramazah/products')
 * @param options - Additional upload options
 */
export async function uploadImage(
  file: File,
  folder: string = 'ramazah',
  options: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string;
  } = {}
): Promise<CloudinaryUploadResult> {
  try {
    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    let buffer: Buffer = Buffer.from(arrayBuffer);

    // Check file size and compress if necessary
    if (buffer.length > MAX_FILE_SIZE) {
      console.log(`File size (${(buffer.length / 1024 / 1024).toFixed(2)}MB) exceeds 10MB limit. Compressing...`);
      buffer = await compressImageBuffer(buffer, MAX_FILE_SIZE);
    }

    // Upload to Cloudinary
    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder,
            transformation: [
              {
                width: options.width || 2000,
                height: options.height || 2000,
                crop: options.crop || 'limit',
              },
              {
                quality: options.quality || 'auto:good',
              },
              {
                fetch_format: 'auto',
              },
            ],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        )
        .end(buffer);
    });

    return {
      publicId: result.public_id,
      url: result.url,
      secureUrl: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
}

/**
 * Delete an image from Cloudinary
 * @param publicId - The public ID of the image to delete
 */
export async function deleteImage(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error('Failed to delete image from Cloudinary');
  }
}

/**
 * Get an optimized image URL
 * @param publicId - The public ID of the image
 * @param options - Transformation options
 */
export function getImageUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string;
    format?: string;
  } = {}
): string {
  return cloudinary.url(publicId, {
    width: options.width,
    height: options.height,
    crop: options.crop || 'scale',
    quality: options.quality || 'auto',
    fetch_format: options.format || 'auto',
    secure: true,
  });
}

/**
 * Upload multiple images
 * @param files - Array of File objects
 * @param folder - Cloudinary folder path
 */
export async function uploadMultipleImages(
  files: File[],
  folder: string = 'ramazah'
): Promise<CloudinaryUploadResult[]> {
  const uploadPromises = files.map((file) => uploadImage(file, folder));
  return await Promise.all(uploadPromises);
}

/**
 * Generate a thumbnail URL
 * @param publicId - The public ID of the image
 * @param size - Thumbnail size (default: 200x200)
 */
export function getThumbnailUrl(publicId: string, size: number = 200): string {
  return cloudinary.url(publicId, {
    width: size,
    height: size,
    crop: 'fill',
    gravity: 'auto',
    quality: 'auto',
    fetch_format: 'auto',
    secure: true,
  });
}

/**
 * Generate responsive image URLs
 * @param publicId - The public ID of the image
 */
export function getResponsiveUrls(publicId: string) {
  return {
    small: getImageUrl(publicId, { width: 400 }),
    medium: getImageUrl(publicId, { width: 800 }),
    large: getImageUrl(publicId, { width: 1200 }),
    xlarge: getImageUrl(publicId, { width: 1600 }),
  };
}