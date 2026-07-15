import { Router } from 'express';
import { MarketingController } from './marketing.controller';

const router = Router();

router.get('/top-cities', MarketingController.getTopCities);
router.get('/top-services', MarketingController.getTopServices);
router.get('/retention', MarketingController.getCustomerRetention);

export default router;
