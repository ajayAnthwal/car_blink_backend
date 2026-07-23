import { Router } from 'express';
import { AuditLogController } from './audit-log.controller';

const router = Router();

router.get('/', AuditLogController.getAuditLogs);

export default router;
