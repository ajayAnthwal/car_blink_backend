import { Router } from 'express';
import { SuperAdminTicketsController } from './tickets.controller';

const router = Router();

router.get('/', SuperAdminTicketsController.getAllTickets);
router.get('/:id', SuperAdminTicketsController.getTicketDetails);
router.patch('/:id/status', SuperAdminTicketsController.updateStatus);
router.post('/:id/reply', SuperAdminTicketsController.addReply);

export default router;
