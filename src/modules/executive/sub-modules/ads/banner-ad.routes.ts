import { Router } from 'express';
import { BannerAdController } from './banner-ad.controller';

const router = Router();

router.post('/', BannerAdController.createAd);
router.get('/', BannerAdController.getAllAds);
router.patch('/:id', BannerAdController.updateAd);
router.delete('/:id', BannerAdController.deleteAd);

export default router;
