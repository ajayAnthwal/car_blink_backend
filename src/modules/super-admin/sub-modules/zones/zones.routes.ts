import { Router } from 'express';
import SuperAdminZonesController from './zones.controller';

const router = Router();

router.get('/', SuperAdminZonesController.getAllZones as any);
router.post('/', SuperAdminZonesController.createZone as any);
router.patch('/:id', SuperAdminZonesController.updateZone as any);
router.delete('/:id', SuperAdminZonesController.deleteZone as any);

export default router;
