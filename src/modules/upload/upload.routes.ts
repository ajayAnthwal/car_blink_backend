import { Router } from 'express';
import { UploadController } from './upload.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { uploadImage } from '../../config/multer.config';

const router = Router();

router.post(
  '/',
  authMiddleware as any,
  uploadImage.single('file'),
  UploadController.uploadSingleFile
);

export default router;
