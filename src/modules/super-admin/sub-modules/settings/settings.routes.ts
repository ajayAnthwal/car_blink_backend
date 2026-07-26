import { Router } from 'express';
import { SuperAdminSettingsController } from './settings.controller';

const router = Router();

router.get('/', SuperAdminSettingsController.getSettings);
router.put('/', SuperAdminSettingsController.updateSettings);

export default router;
