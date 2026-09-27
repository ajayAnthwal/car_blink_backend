import { env } from '../../../config/env.config';
import { logger } from '../../../config/logger.config';
import crypto from 'crypto';
import axios from 'axios';

export interface ISmsProvider {
  sendSms(toPhone: string, message: string, templateIdOverride?: string): Promise<{ success: boolean; providerMessageId?: string }>;
}

const hasVispl = Boolean(env.VISPL_API_KEY || (env.VISPL_USERNAME && env.VISPL_PASSWORD));

if (hasVispl) {
  logger.info('VISPL SmartPing SMS Provider initialized (pgapi.smartping.ai / pggui.vispl.in)');
} else {
  logger.warn('VISPL SMS credentials not configured — running in MOCK SMS mode');
}

export class SmsProvider implements ISmsProvider {
  async sendSms(toPhone: string, message: string, templateIdOverride?: string): Promise<{ success: boolean; providerMessageId?: string }> {
    // Standardize Indian phone number format (10 digits)
    const cleanPhone = toPhone.replace(/[^0-9]/g, '');
    const tenDigitPhone = cleanPhone.slice(-10);

    // Sole Provider: VISPL / Smartping (pgapi.smartping.ai / pggui.vispl.in)
    if (hasVispl) {
      try {
        const baseUrl = env.VISPL_API_URL || 'https://pgapi.smartping.ai/fe/api/v1/send';

        // Extract OTP code from message if present
        const otpMatch = message.match(/\b\d{4,6}\b/);
        const otpCode = otpMatch ? otpMatch[0] : '123456';

        // Default: Mobile Verification (Quote / Lead Form)
        let targetTemplateId = '1560211';
        let targetDltContentId = process.env.VISPL_MOBILE_VERIFY_DLT_ID || '1777178764465460706';
        let textToSend = `Your OTP for mobile number verification on Carblink is ${otpCode}. This OTP is valid for 5minutes. Please do not share this OTP with anyone.`;

        const lowerMsg = message.toLowerCase();

        if (lowerMsg.includes('has been reset') || lowerMsg.includes('reset successfully') || lowerMsg.includes('confirmation')) {
          // 1. Password Reset Confirmation (SmartPing 1560213 | DLT 1777178859197386663)
          targetTemplateId = '1560213';
          targetDltContentId = process.env.VISPL_RESET_CONFIRM_DLT_ID || '1777178859197386663';
          textToSend = 'Your Carblink account password has been successfully reset. If you did not initiate this request, please contact Carblink support.';
        } else if (lowerMsg.includes('reset') || lowerMsg.includes('forgot') || lowerMsg.includes('password')) {
          // 2. Password Reset OTP Request (SmartPing 1557291 | DLT 1777178764507236111)
          targetTemplateId = '1557291';
          targetDltContentId = process.env.VISPL_RESET_DLT_ID || '1777178764507236111';
          textToSend = `Your OTP to reset your Carblink account password is ${otpCode}. This OTP is valid for 5 minutes. Please do not share this OTP with anyone.`;
        } else if (lowerMsg.includes('register') || lowerMsg.includes('signup')) {
          // 3. Account Registration Flow (SmartPing 1560212 | DLT 1777178798813648790)
          targetTemplateId = '1560212';
          targetDltContentId = process.env.VISPL_REGISTER_DLT_ID || '177717898813648790';
          textToSend = `Your Carblink account has been successfully registered with mobile number ${tenDigitPhone}. Welcome to Carblink.`;
        } else if (lowerMsg.includes('login')) {
          // 4. Login OTP Flow (SmartPing 1557713 | DLT 1777178764480007649)
          targetTemplateId = '1557713';
          targetDltContentId = process.env.VISPL_LOGIN_DLT_ID || '1777178764480007649';
          textToSend = `Your OTP for login to your Carblink account is ${otpCode}. This OTP is valid for 5 minutes. Please do not share this OTP with anyone.`;
        } else if (lowerMsg.includes('start') || lowerMsg.includes('started') || lowerMsg.includes('service') || lowerMsg.includes('booking confirmed') || lowerMsg.includes('booking for')) {
          // 5. Booking Confirmation Flow (SmartPing 1561218 | DLT 1777178939663828651)
          targetTemplateId = '1561218';
          targetDltContentId = process.env.VISPL_BOOKING_CONFIRM_DLT_ID || '1777178939663828651';
          textToSend = `Carblink Services Private Limited: Your booking for Service Request has been confirmed. Booking ID: CB1042 Date & Time: Today. Thank you for choosing CarBlink.`;
        } else if (lowerMsg.includes('payment') || lowerMsg.includes('paid') || lowerMsg.includes('received')) {
          // 6. Payment Received Flow (SmartPing 1561219 | DLT 177717893973612595)
          targetTemplateId = '1561219';
          targetDltContentId = process.env.VISPL_PAYMENT_DLT_ID || '177717893973612595';
          const payMatch = message.match(/₹?\s*(\d+)/);
          const payAmount = payMatch ? payMatch[1] : '300';
          textToSend = `Carblink Services Private Limited: We have received your payment of Rs.${payAmount} towards your advance service booking. Booking ID: CB1042. For booking details, visit https://carblink.in/. Thank you for choosing CarBlink.`;
        } else if (lowerMsg.includes('comparison') || lowerMsg.includes('request received') || lowerMsg.includes('request submitted')) {
          // 7. CarBlink Request Received Flow (SmartPing 1561220 | DLT 1777178939780575133)
          targetTemplateId = '1561220';
          targetDltContentId = process.env.VISPL_REQUEST_RECEIVED_DLT_ID || '1777178939780575133';
          textToSend = 'Carblink Services Private Limited: Your car service comparison request has been successfully submitted on CarBlink. Our team will contact you shortly regarding your request and help you with available service options. Visit https://carblink.in/ for details. Thank you.';
        } else if (lowerMsg.includes('cancel') || lowerMsg.includes('cancelled')) {
          // 8. Booking Cancellation Flow (SmartPing 1561221 | DLT 177717893980841235)
          targetTemplateId = '1561221';
          targetDltContentId = process.env.VISPL_BOOKING_CANCEL_DLT_ID || '177717893980841235';
          textToSend = 'Carblink Services Private Limited: Your Car Periodic Inspection service booking with Booking ID CB1042 has been cancelled successfully. For booking details or assistance, visit https://carblink.in/. Thank you.';
        } else {
          // 5. Mobile Verification / Quick Callback / Quote Flow (SmartPing 1560211 | DLT 1777178764465460706)
          targetTemplateId = '1560211';
          targetDltContentId = process.env.VISPL_MOBILE_VERIFY_DLT_ID || '1777178764465460706';
          textToSend = `Your OTP for mobile number verification on Carblink is ${otpCode}. This OTP is valid for 5minutes. Please do not share this OTP with anyone.`;
        }

        if (templateIdOverride) {
          targetTemplateId = templateIdOverride;
        }

        // Exact VISPL / Smartping HTTP API Parameters
        const visplParams: Record<string, string> = {
          username: env.VISPL_USERNAME || env.VISPL_API_KEY || '',
          password: env.VISPL_PASSWORD || env.VISPL_API_KEY || '',
          unicode: 'false',
          from: env.VISPL_SENDER_ID || 'CRBLNK',
          to: tenDigitPhone,
          text: textToSend,
          templateId: targetTemplateId,
          dltContentId: targetDltContentId,
        };

        if (env.VISPL_ENTITY_ID) {
          visplParams.dltPrincipalEntityId = env.VISPL_ENTITY_ID;
        }

        logger.info(`Sending SMS via VISPL SmartPing API to ${tenDigitPhone} [templateId: ${targetTemplateId}, dltContentId: ${targetDltContentId}]`);

        // HTTP GET Request as per VISPL / Smartping API Spec
        const response = await axios.get(baseUrl, { params: visplParams, timeout: 8000 });

        logger.info('VISPL SmartPing SMS response:', JSON.stringify(response?.data));

        // STRICT SUCCESS CHECK: Only return success: true if statusCode is 200 AND state is SUBMIT_ACCEPTED
        const isSuccess = response.data?.statusCode === 200 && response.data?.state === 'SUBMIT_ACCEPTED';

        if (isSuccess) {
          return {
            success: true,
            providerMessageId: String(response.data?.transactionId || 'vispl_sent'),
          };
        } else {
          logger.error(`VISPL SMS Provider Delivery Failure: ${JSON.stringify(response.data)}`);
          return {
            success: false,
            providerMessageId: String(response.data?.transactionId || 'vispl_rejected'),
          };
        }
      } catch (err: any) {
        logger.error('VISPL SMS send error:', err?.response?.data || err.message);
        return {
          success: false,
          providerMessageId: 'vispl_error',
        };
      }
    }

    // Fallback Mock Mode (Only if VISPL credentials missing)
    logger.info(`[MOCK SMS] to: ${toPhone} | Message: ${message}`);
    return {
      success: true,
      providerMessageId: `mock_sms_${crypto.randomUUID().replace(/-/g, '')}`,
    };
  }
}

export const smsProvider = new SmsProvider();
export default smsProvider;
