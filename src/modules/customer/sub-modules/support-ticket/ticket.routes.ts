import { Router } from 'express';
import { TicketController } from './ticket.controller';
import { validate } from '../../../../middlewares/validate.middleware';
import { createTicketSchema, replyTicketSchema } from './ticket.validation';

const router = Router();

router.post('/', validate({ body: createTicketSchema }), TicketController.createTicket);
router.get('/', TicketController.getMyTickets);
router.get('/:id', TicketController.getTicketById);
router.post('/:id/reply', validate({ body: replyTicketSchema }), TicketController.replyToTicket);

export default router;
