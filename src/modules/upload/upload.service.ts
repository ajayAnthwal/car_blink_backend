import { v2 as cloudinary } from 'cloudinary';
import { env } from '../../config/env.config';
import { logger } from '../../config/logger.config';

// Configure Cloudinary
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export class UploadService {
  /**
   * Uploads a file buffer directly to Cloudinary using upload streams.
   * @param fileBuffer Buffer of the file
   * @param fileName Original or target file name
   * @param folder Target folder inside Cloudinary (e.g. 'profile-images', 'documents')
   * @returns The secure URL of the uploaded asset from Cloudinary
   */
  public static async uploadFileToCloud(
    fileBuffer: Buffer,
    fileName: string,
    folder: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `carblink/${folder}`,
          filename_override: fileName,
          use_filename: true,
          unique_filename: true,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) {
            logger.error(`Cloudinary upload failed: ${error.message}`);
            reject(error);
          } else if (result) {
            logger.info(`File uploaded successfully to Cloudinary: ${result.secure_url}`);
            resolve(result.secure_url);
          } else {
            reject(new Error('Unknown Cloudinary upload error'));
          }
        }
      );

      uploadStream.end(fileBuffer);
    });
  }

  /**
   * Deletes a file from Cloudinary using its public_id.
   * @param fileUrl The full Cloudinary secure URL of the asset
   */
  public static async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Extract public_id from Cloudinary URL
      // Match pattern after /image/upload/ (possibly with version prefix /v123456/)
      const regex = /\/image\/upload\/(?:v\d+\/)?(.+?)\.[a-z0-9]+$/i;
      const match = fileUrl.match(regex);
      if (!match) {
        logger.warn(`Could not extract public ID from Cloudinary URL: ${fileUrl}`);
        return;
      }

      const publicId = match[1];
      const result = await cloudinary.uploader.destroy(publicId);
      logger.info(`Cloudinary destroy result for ${publicId}: ${JSON.stringify(result)}`);
    } catch (error) {
      logger.error(`Failed to delete file from Cloudinary: ${error}`);
    }
  }
}
export default UploadService;
