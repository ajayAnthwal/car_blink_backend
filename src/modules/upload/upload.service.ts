import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { logger } from '../../config/logger.config';
import { env } from '../../config/env.config';

// Configure Cloudinary
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export class UploadService {
  /**
   * Uploads a file buffer directly to Cloudinary.
   * @param fileBuffer Buffer of the file
   * @param fileName Original or target file name
   * @param folder Target folder inside cloudinary (e.g. 'profile-images', 'documents')
   * @returns The secure URL of the uploaded asset
   */
  public static async uploadFileToCloud(
    fileBuffer: Buffer,
    fileName: string,
    folder: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Generate a unique filename without extension (Cloudinary handles extension based on format)
        const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
        const uniqueFileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${nameWithoutExt.replace(/\s+/g, '-')}`;

        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: `carblink/${folder}`,
            public_id: uniqueFileName,
            resource_type: 'auto',
          },
          (error, result) => {
            if (error) {
              logger.error(`Cloudinary upload failed: ${error.message}`);
              return reject(error);
            }
            if (!result) {
              return reject(new Error('Cloudinary upload returned no result'));
            }
            logger.info(`File uploaded successfully to Cloudinary: ${result.secure_url}`);
            resolve(result.secure_url);
          }
        );

        Readable.from(fileBuffer).pipe(uploadStream);
      } catch (error: any) {
        logger.error(`Cloudinary upload wrapper failed: ${error.message}`);
        reject(error);
      }
    });
  }

  /**
   * Deletes a file from Cloudinary using its URL.
   * @param fileUrl The full Cloudinary URL of the asset
   */
  public static async deleteFile(fileUrl: string): Promise<void> {
    try {
      if (fileUrl.includes('cloudinary.com')) {
        // Extract public_id from Cloudinary URL
        // URL format is typically: https://res.cloudinary.com/<cloud_name>/image/upload/v<version>/<public_id>.<ext>
        const urlParts = fileUrl.split('/');
        const uploadIndex = urlParts.findIndex((part) => part === 'upload');
        
        if (uploadIndex !== -1) {
          // The parts after 'upload' and version 'v123...' form the public_id
          const publicIdWithExt = urlParts.slice(uploadIndex + 2).join('/');
          const publicId = publicIdWithExt.substring(0, publicIdWithExt.lastIndexOf('.'));
          
          if (publicId) {
            await cloudinary.uploader.destroy(publicId);
            logger.info(`Cloudinary file deleted: ${publicId}`);
          }
        }
      }
    } catch (error) {
      logger.error(`Failed to delete file from Cloudinary: ${error}`);
    }
  }
}
export default UploadService;
