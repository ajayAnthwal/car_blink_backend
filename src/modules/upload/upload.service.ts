import fs from 'fs';
import path from 'path';
import { logger } from '../../config/logger.config';
import { env } from '../../config/env.config';

export class UploadService {
  /**
   * Saves a file buffer directly to the local 'uploads' folder.
   * @param fileBuffer Buffer of the file
   * @param fileName Original or target file name
   * @param folder Target folder inside uploads (e.g. 'profile-images', 'documents')
   * @returns The local URL of the uploaded asset
   */
  public static async uploadFileToCloud(
    fileBuffer: Buffer,
    fileName: string,
    folder: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const uploadDir = path.join(process.cwd(), 'uploads', folder);
        
        // Ensure directory exists
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Generate a unique filename
        const uniqueFileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${fileName.replace(/\s+/g, '-')}`;
        const filePath = path.join(uploadDir, uniqueFileName);

        // Write the file
        fs.writeFileSync(filePath, fileBuffer);
        
        // Construct the URL
        const serverUrl = env.PORT ? `http://localhost:${env.PORT}` : 'http://localhost:8000';
        const fileUrl = `${serverUrl}/uploads/${folder}/${uniqueFileName}`;
        
        logger.info(`File uploaded successfully to local storage: ${fileUrl}`);
        resolve(fileUrl);
      } catch (error: any) {
        logger.error(`Local upload failed: ${error.message}`);
        reject(error);
      }
    });
  }

  /**
   * Deletes a file from local storage using its URL.
   * @param fileUrl The full local URL of the asset
   */
  public static async deleteFile(fileUrl: string): Promise<void> {
    try {
      const serverUrl = env.PORT ? `http://localhost:${env.PORT}` : 'http://localhost:8000';
      if (fileUrl.startsWith(serverUrl)) {
        const relativePath = fileUrl.replace(`${serverUrl}/`, '');
        const filePath = path.join(process.cwd(), relativePath);
        
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          logger.info(`Local file deleted: ${filePath}`);
        }
      }
    } catch (error) {
      logger.error(`Failed to delete file locally: ${error}`);
    }
  }
}
export default UploadService;
