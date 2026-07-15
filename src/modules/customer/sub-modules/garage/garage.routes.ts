import { Router } from 'express';
import { GarageController } from './garage.controller';

const router = Router();

router.post('/', GarageController.addVehicle);
router.get('/', GarageController.getMyVehicles);
router.patch('/:id', GarageController.updateVehicle);
router.delete('/:id', GarageController.deleteVehicle);

export default router;
