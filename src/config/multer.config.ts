import multer from 'multer';
import { Request } from 'express';
import { ApiError } from '../common/errors/ApiError';
import { ERROR_CODES } from '../common/constants/error-codes.constant';

// All standard image MIME types and extensions
const COMMON_IMAGE_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'avif', 'bmp', 'gif', 'svg', 'jfif', 'pjpeg'
];

export const createUploader = (allowedMimeTypes: string[], maxSizeMB: number) => {
  const storage = multer.memoryStorage();

  const fileFilter = (req: Request, file: Express.Multer.File, callback: multer.FileFilterCallback) => {
    const rawMime = (file.mimetype || '').toLowerCase().trim();
    const ext = (file.originalname || '').split('.').pop()?.toLowerCase().trim() || '';

    // 1. Exact or normalized MIME match
    const isMimeAllowed = allowedMimeTypes.some(allowed => {
      const norm = allowed.toLowerCase().trim();
      return rawMime === norm || rawMime.startsWith(norm);
    });

    // 2. Any image type allowed if allowedMimeTypes includes 'image/*' or any image format
    const acceptsImages = allowedMimeTypes.some(m => m.startsWith('image/'));
    const isImageByMimeOrExt = rawMime.startsWith('image/') || COMMON_IMAGE_EXTENSIONS.includes(ext);

    // 3. Document / PDF match
    const acceptsPdf = allowedMimeTypes.includes('application/pdf');
    const isPdf = rawMime === 'application/pdf' || ext === 'pdf';

    if (isMimeAllowed || (acceptsImages && isImageByMimeOrExt) || (acceptsPdf && isPdf)) {
      callback(null, true);
    } else {
      callback(
        new ApiError(
          400,
          `Invalid file format (.${ext || 'unknown'}). Please upload an image (JPG, PNG, WebP, HEIC, AVIF) or PDF document up to ${maxSizeMB}MB.`,
          ERROR_CODES.VALIDATION_ERROR
        ) as any
      );
    }
  };

  return multer({
    storage,
    limits: {
      fileSize: maxSizeMB * 1024 * 1024,
    },
    fileFilter,
  });
};

// Image uploader supporting all image formats (JPG, PNG, WebP, HEIC, AVIF, etc.) up to 25MB
export const uploadImage = createUploader([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/avif',
  'image/gif',
  'image/bmp',
  'image/svg+xml'
], 25);

// Document & Image uploader (PDF + all image formats) up to 50MB
export const uploadDocument = createUploader([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/avif',
  'image/gif',
  'image/bmp',
  'image/svg+xml',
  'application/pdf'
], 50);
