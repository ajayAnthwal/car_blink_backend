import { Router, Request, Response } from 'express';
import { logger } from '../../config/logger.config';

const router = Router();

/**
 * 1. GET /api/webhook/whatsapp
 * Meta Webhook Verification Challenge
 */
router.get('/', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || 'carblink_whatsapp_secret_token';

  logger.info(`[WHATSAPP WEBHOOK VERIFY] Received request: mode=${mode}, token=${token}`);

  if (mode === 'subscribe' && token === expectedToken) {
    logger.info('🟢 [WHATSAPP WEBHOOK VERIFY SUCCESS] Meta challenge verified!');
    return res.status(200).send(challenge);
  }

  logger.warn('🔴 [WHATSAPP WEBHOOK VERIFY FAILED] Invalid verify token or mode');
  return res.status(403).json({ error: 'Verification failed' });
});

/**
 * 2. POST /api/webhook/whatsapp
 * Meta Delivery Status & Message Event Receiver
 */
router.post('/', (req: Request, res: Response) => {
  // Always return 200 OK to Meta immediately so Meta does not retry
  res.status(200).send('EVENT_RECEIVED');

  try {
    const body = req.body;

    if (!body || body.object !== 'whatsapp_business_account') {
      return;
    }

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value) return;

    // Handle Delivery Status Updates (sent, delivered, read, failed)
    if (value.statuses && Array.isArray(value.statuses)) {
      for (const statusObj of value.statuses) {
        const { id, status, recipient_id, timestamp, errors } = statusObj;
        const dateStr = new Date(Number(timestamp) * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

        logger.info('--------------------------------------------------');
        logger.info(`📲 [WHATSAPP STATUS EVENT] ${dateStr}`);
        logger.info(`   Message ID     : ${id}`);
        logger.info(`   Recipient Phone: ${recipient_id}`);
        logger.info(`   Current Status : ${status.toUpperCase()}`);

        if (status === 'failed' || errors) {
          logger.error('🔴 [WHATSAPP DELIVERY FAILURE DETECTED]');
          logger.error(`   Message ID    : ${id}`);
          logger.error(`   Recipient     : ${recipient_id}`);
          if (errors && errors.length > 0) {
            errors.forEach((err: any, idx: number) => {
              logger.error(`   Error #${idx + 1} Code : ${err.code}`);
              logger.error(`   Error Title   : ${err.title}`);
              logger.error(`   Error Details : ${err.message || err.error_data?.details || 'N/A'}`);
              logger.error(`   User Details  : ${err.error_data?.details || 'N/A'}`);
            });
          }
          console.log('--- RAW META STATUS FAILURE OBJECT ---');
          console.dir(statusObj, { depth: null, colors: true });
        } else {
          logger.info(`🟢 STATUS ${status.toUpperCase()} FOR ${recipient_id}`);
          console.dir(statusObj, { depth: null, colors: true });
        }
        logger.info('--------------------------------------------------');
      }
    }

    // Handle Incoming User Messages
    if (value.messages && Array.isArray(value.messages)) {
      for (const msg of value.messages) {
        logger.info(`💬 [INCOMING WHATSAPP MESSAGE] From: ${msg.from} | Type: ${msg.type} | Text: ${msg.text?.body || 'N/A'}`);
      }
    }
  } catch (err: any) {
    logger.error('[WHATSAPP WEBHOOK EVENT ERROR]', err?.message || err);
  }
});

export default router;
