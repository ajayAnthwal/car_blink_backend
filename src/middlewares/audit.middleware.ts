import { Response, NextFunction } from 'express';
import { IRequest } from '../common/interfaces/IRequest';
import AuditLog from '../modules/super-admin/sub-modules/audit-logs/audit-log.model';

export const auditMiddleware = (actionName?: string) => {
  return async (req: IRequest, res: Response, next: NextFunction) => {
    // We only want to log modifying requests unless explicitly told otherwise
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) || actionName) {
      
      // We capture the original send/json to log the status
      const originalSend = res.send;
      let responseStatus: 'SUCCESS' | 'FAILED' = 'SUCCESS';
      let errorMessage = '';

      res.send = function (body) {
        if (res.statusCode >= 400) {
          responseStatus = 'FAILED';
          try {
            const parsed = JSON.parse(body);
            errorMessage = parsed.message || 'Error occurred';
          } catch (e) {
            errorMessage = body;
          }
        }
        return originalSend.call(this, body);
      };

      res.on('finish', async () => {
        try {
          // Do not wait for this to save so we don't block the response loop
          const payloadToLog = { ...req.body };
          // Remove sensitive data
          if (payloadToLog.password) delete payloadToLog.password;
          
          const action = actionName || `${req.method} ${req.baseUrl}${req.path}`;

          await AuditLog.create({
            userId: req.user?.userId,
            userRole: req.user?.role,
            action,
            endpoint: req.originalUrl,
            method: req.method,
            payload: payloadToLog,
            ipAddress: req.ip,
            status: responseStatus,
            errorMessage
          });
        } catch (error) {
          console.error('Audit Log Error:', error);
        }
      });
    }
    
    next();
  };
};
