import { Router } from 'express';
import { RoleController } from './role.controller';

const router = Router();

router.post('/', RoleController.createRole);
router.get('/', RoleController.getRoles);
router.patch('/:id', RoleController.updateRole);

export default router;
