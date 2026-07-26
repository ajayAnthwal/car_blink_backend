import { Router } from 'express';
import { SuperAdminStaffController } from './staff.controller';

const router = Router();

router.get('/', SuperAdminStaffController.getAllStaff);
router.post('/', SuperAdminStaffController.createStaff);
router.get('/roles', SuperAdminStaffController.getRoles);

export default router;
