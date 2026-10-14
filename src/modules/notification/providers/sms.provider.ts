import { env } from '../../../config/env.config';
import { logger } from '../../../config/logger.config';
import crypto from 'crypto';
import axios from 'axios';

export interface ISmsProvider {
  sendSms(
    toPhone: string,
    message: string,
    templateKeyOrId?: string,
    variables?: Record<string, string | number>
  ): Promise<{ success: boolean; providerMessageId?: string }>;
}

export interface IDltTemplateDefinition {
  templateId: string;
  dltContentId: string;
  name: string;
  buildText: (vars: Record<string, any>) => string;
}

export const DLT_TEMPLATES: Record<string, IDltTemplateDefinition> = {
  // 1. Mobile Verification / Lead OTP (SmartPing 1560211 | DLT 1777178764465460706)
  MOBILE_VERIFY: {
    templateId: '1560211',
    dltContentId: process.env.VISPL_MOBILE_VERIFY_DLT_ID || '1777178764465460706',
    name: 'Mobile Verification OTP',
    buildText: (v) =>
      `Your OTP for mobile number verification on Carblink is ${v.otp || '123456'}. This OTP is valid for 5minutes. Please do not share this OTP with anyone.`,
  },
  // 2. Login OTP (SmartPing 1557713 | DLT 1777178764480007649)
  LOGIN_OTP: {
    templateId: '1557713',
    dltContentId: process.env.VISPL_LOGIN_DLT_ID || '1777178764480007649',
    name: 'Login OTP',
    buildText: (v) =>
      `Your OTP for login to your Carblink account is ${v.otp || '123456'}. This OTP is valid for 5 minutes. Please do not share this OTP with anyone.`,
  },
  // 3. Account Registration Welcome (SmartPing 1560212 | DLT 1777178798813648790)
  REGISTER_WELCOME: {
    templateId: '1560212',
    dltContentId: process.env.VISPL_REGISTER_DLT_ID || '1777178798813648790',
    name: 'Account Registration Welcome',
    buildText: (v) =>
      `Your Carblink account has been successfully registered with mobile number ${v.phone || ''}. Welcome to Carblink.`,
  },
  // 4. Password Reset OTP Request (SmartPing 1557291 | DLT 1777178764507236111)
  PASSWORD_RESET_OTP: {
    templateId: '1557291',
    dltContentId: process.env.VISPL_RESET_DLT_ID || '1777178764507236111',
    name: 'Password Reset OTP',
    buildText: (v) =>
      `Your OTP to reset your Carblink account password is ${v.otp || '123456'}. This OTP is valid for 5 minutes. Please do not share this OTP with anyone.`,
  },
  // 5. Password Reset Confirmation (SmartPing 1560213 | DLT 1777178859197386663)
  PASSWORD_RESET_CONFIRM: {
    templateId: '1560213',
    dltContentId: process.env.VISPL_RESET_CONFIRM_DLT_ID || '1777178859197386663',
    name: 'Password Reset Confirmation',
    buildText: () =>
      'Your Carblink account password has been successfully reset. If you did not initiate this request, please contact Carblink support.',
  },
  // 6. Booking Confirmation Flow (SmartPing 1561218 | DLT 1777178939663828651)
  BOOKING_CONFIRMATION: {
    templateId: '1561218',
    dltContentId: process.env.VISPL_BOOKING_CONFIRM_DLT_ID || '1777178939663828651',
    name: 'Booking Confirmation',
    buildText: (v) =>
      `Carblink Services Private Limited: Your booking for Service Request has been confirmed. Booking ID: ${v.bookingId || 'CB1042'} Date & Time: ${v.dateTime || 'Today'}. Thank you for choosing CarBlink.`,
  },
  // 7. Payment Received Flow (SmartPing 1561219 | DLT 177717893973612595)
  PAYMENT_RECEIVED: {
    templateId: '1561219',
    dltContentId: process.env.VISPL_PAYMENT_DLT_ID || '177717893973612595',
    name: 'Payment Received',
    buildText: (v) =>
      `Carblink Services Private Limited: We have received your payment of Rs.${v.amount || '0'} towards your advance service booking. Booking ID: ${v.bookingId || 'CB1042'}. For booking details, visit https://carblink.in/. Thank you for choosing CarBlink.`,
  },
  // 8. CarBlink Request Received Flow (SmartPing 1561220 | DLT 1777178939780575133)
  REQUEST_RECEIVED: {
    templateId: '1561220',
    dltContentId: process.env.VISPL_REQUEST_RECEIVED_DLT_ID || '1777178939780575133',
    name: 'Service Comparison Request Submitted',
    buildText: () =>
      'Carblink Services Private Limited: Your car service comparison request has been successfully submitted on CarBlink. Our team will contact you shortly regarding your request and help you with available service options. Visit https://carblink.in/ for details. Thank you.',
  },
  // 9. Booking Cancellation Flow (SmartPing 1561221 | DLT 177717893980841235)
  BOOKING_CANCELLED: {
    templateId: '1561221',
    dltContentId: process.env.VISPL_BOOKING_CANCEL_DLT_ID || '177717893980841235',
    name: 'Booking Cancelled',
    buildText: (v) =>
      `Carblink Services Private Limited: Your Car Periodic Inspection service booking with Booking ID ${v.bookingId || 'CB1042'} has been cancelled successfully. For booking details or assistance, visit https://carblink.in/. Thank you.`,
  },
};

const hasVispl = Boolean(env.VISPL_API_KEY || (env.VISPL_USERNAME && env.VISPL_PASSWORD));

if (hasVispl) {
  logger.info('VISPL SmartPing SMS Provider initialized (pgapi.smartping.ai / pggui.vispl.in)');
} else {
  logger.warn('VISPL SMS credentials not configured — running in MOCK SMS mode');
}

export class SmsProvider implements ISmsProvider {
  /**
   * Internal dispatcher targeting SmartPing / VISPL gateway with strict DLT parameters
   */
  private async dispatchDltSms(
    tenDigitPhone: string,
    templateDef: IDltTemplateDefinition,
    textToSend: string
  ): Promise<{ success: boolean; providerMessageId?: string }> {
    if (!hasVispl) {
      logger.info(`[MOCK SMS] to: ${tenDigitPhone} | [${templateDef.name} - ${templateDef.templateId}] | Text: ${textToSend}`);
      return {
        success: true,
        providerMessageId: `mock_sms_${crypto.randomUUID().replace(/-/g, '')}`,
      };
    }

    try {
      const baseUrl = env.VISPL_API_URL || 'https://pgapi.smartping.ai/fe/api/v1/send';

      const visplParams: Record<string, string> = {
        username: env.VISPL_USERNAME || env.VISPL_API_KEY || '',
        password: env.VISPL_PASSWORD || env.VISPL_API_KEY || '',
        unicode: 'false',
        from: env.VISPL_SENDER_ID || 'CRBLNK',
        to: tenDigitPhone,
        text: textToSend,
        templateId: templateDef.templateId,
        dltContentId: templateDef.dltContentId,
      };

      if (env.VISPL_ENTITY_ID) {
        visplParams.dltPrincipalEntityId = env.VISPL_ENTITY_ID;
      }

      logger.info(
        `Sending DLT SMS via VISPL to ${tenDigitPhone} [Template: ${templateDef.name} (${templateDef.templateId}), DLT: ${templateDef.dltContentId}]`
      );

      const response = await axios.get(baseUrl, { params: visplParams, timeout: 8000 });
      logger.info('VISPL SmartPing SMS response:', JSON.stringify(response?.data));

      const isSuccess = response.data?.statusCode === 200 && response.data?.state === 'SUBMIT_ACCEPTED';

      if (isSuccess) {
        return {
          success: true,
          providerMessageId: String(response.data?.transactionId || 'vispl_sent'),
        };
      } else {
        logger.error(`VISPL SMS Delivery Failure: ${JSON.stringify(response.data)}`);
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

  /**
   * Generic / Backward-Compatible SMS Sender
   */
  async sendSms(
    toPhone: string,
    message: string,
    templateKeyOrId?: string,
    variables?: Record<string, string | number>
  ): Promise<{ success: boolean; providerMessageId?: string }> {
    const cleanPhone = toPhone.replace(/[^0-9]/g, '');
    const tenDigitPhone = cleanPhone.slice(-10);

    if (tenDigitPhone.length !== 10) {
      logger.warn(`Invalid phone number provided for SMS: ${toPhone}`);
      return { success: false, providerMessageId: 'invalid_phone' };
    }

    // 1. Direct Template Key or Template ID Match
    if (templateKeyOrId) {
      const matchByKey = DLT_TEMPLATES[templateKeyOrId.toUpperCase()];
      if (matchByKey) {
        const text = matchByKey.buildText({ phone: tenDigitPhone, ...(variables || {}) });
        return this.dispatchDltSms(tenDigitPhone, matchByKey, text);
      }

      const matchById = Object.values(DLT_TEMPLATES).find((t) => t.templateId === templateKeyOrId);
      if (matchById) {
        const text = matchById.buildText({ phone: tenDigitPhone, ...(variables || {}) });
        return this.dispatchDltSms(tenDigitPhone, matchById, text);
      }
    }

    // 2. Intelligent & Safe Pattern Matching
    const lowerMsg = message.toLowerCase();
    const otpMatch = message.match(/\b\d{4,6}\b/);
    const otpCode = otpMatch ? otpMatch[0] : '';

    // A. Password Reset Confirmation (Static)
    if (lowerMsg.includes('password') && (lowerMsg.includes('has been successfully reset') || lowerMsg.includes('reset successfully'))) {
      const t = DLT_TEMPLATES.PASSWORD_RESET_CONFIRM;
      return this.dispatchDltSms(tenDigitPhone, t, t.buildText({}));
    }

    // B. Password Reset OTP
    if ((lowerMsg.includes('password') || lowerMsg.includes('reset')) && lowerMsg.includes('otp') && otpCode) {
      const t = DLT_TEMPLATES.PASSWORD_RESET_OTP;
      return this.dispatchDltSms(tenDigitPhone, t, t.buildText({ otp: otpCode }));
    }

    // C. Registration Welcome
    if (lowerMsg.includes('successfully registered') || lowerMsg.includes('welcome to carblink')) {
      const t = DLT_TEMPLATES.REGISTER_WELCOME;
      return this.dispatchDltSms(tenDigitPhone, t, t.buildText({ phone: tenDigitPhone }));
    }

    // D. Login OTP
    if (lowerMsg.includes('login') && otpCode) {
      const t = DLT_TEMPLATES.LOGIN_OTP;
      return this.dispatchDltSms(tenDigitPhone, t, t.buildText({ otp: otpCode }));
    }

    // E. Booking Confirmed
    if (
      lowerMsg.includes('booking confirmed') ||
      lowerMsg.includes('booking has been confirmed') ||
      lowerMsg.includes('service confirmed')
    ) {
      const t = DLT_TEMPLATES.BOOKING_CONFIRMATION;
      const bkMatch = message.match(/#?([A-Za-z0-9_-]{6,24})/);
      const bookingId = bkMatch ? bkMatch[1].slice(-8).toUpperCase() : (variables?.bookingId ? String(variables.bookingId).slice(-8).toUpperCase() : 'CB1042');
      const text = t.buildText({ bookingId, dateTime: variables?.dateTime || 'Today' });
      return this.dispatchDltSms(tenDigitPhone, t, text);
    }

    // F. Payment Received
    if (
      lowerMsg.includes('payment received') ||
      lowerMsg.includes('received your payment') ||
      lowerMsg.includes('payment successful') ||
      (lowerMsg.includes('paid') && (lowerMsg.includes('rs.') || lowerMsg.includes('inr') || lowerMsg.includes('₹')))
    ) {
      const t = DLT_TEMPLATES.PAYMENT_RECEIVED;
      const payMatch = message.match(/(?:rs\.?|inr|₹)\s*(\d+(?:\.\d{1,2})?)/i) || message.match(/(\d+)\s*(?:paid)/i);
      const amount = payMatch ? Math.round(Number(payMatch[1])) : (variables?.amount ? Math.round(Number(variables.amount)) : 300);
      const bkMatch = message.match(/(?:booking|#)\s*([A-Za-z0-9_-]{6,24})/i);
      const bookingId = bkMatch ? bkMatch[1].slice(-8).toUpperCase() : (variables?.bookingId ? String(variables.bookingId).slice(-8).toUpperCase() : 'CB1042');
      const text = t.buildText({ amount, bookingId });
      return this.dispatchDltSms(tenDigitPhone, t, text);
    }

    // G. Service Comparison / Lead Request Received
    if (
      lowerMsg.includes('comparison request') ||
      lowerMsg.includes('comparison has been') ||
      lowerMsg.includes('quote request received') ||
      lowerMsg.includes('service comparison')
    ) {
      const t = DLT_TEMPLATES.REQUEST_RECEIVED;
      return this.dispatchDltSms(tenDigitPhone, t, t.buildText({}));
    }

    // H. Booking Cancelled
    if (lowerMsg.includes('cancelled') || lowerMsg.includes('cancellation')) {
      const t = DLT_TEMPLATES.BOOKING_CANCELLED;
      const bkMatch = message.match(/(?:booking|#)\s*([A-Za-z0-9_-]{6,24})/i);
      const bookingId = bkMatch ? bkMatch[1].slice(-8).toUpperCase() : (variables?.bookingId ? String(variables.bookingId).slice(-8).toUpperCase() : 'CB1042');
      const text = t.buildText({ bookingId });
      return this.dispatchDltSms(tenDigitPhone, t, text);
    }

    // I. Explicit Mobile Verification OTP
    if (otpCode && (lowerMsg.includes('verification') || lowerMsg.includes('otp') || lowerMsg.includes('verify'))) {
      const t = DLT_TEMPLATES.MOBILE_VERIFY;
      return this.dispatchDltSms(tenDigitPhone, t, t.buildText({ otp: otpCode }));
    }

    // J. PROTECTIVE GUARD: Do NOT dispatch fake OTPs for non-registered DLT messages
    // (e.g. Work Started, Payout Settlement, Partner Review, Wallet Withdrawal)
    logger.warn(
      `[SmsProvider] Skipped SMS dispatch to ${tenDigitPhone} — No matching approved DLT template for message: "${message.slice(0, 80)}...". Notification is handled via WhatsApp / In-App / Push / Email.`
    );
    return {
      success: true,
      providerMessageId: 'dlt_skipped_non_registered',
    };
  }

  // =========================================================================
  // Dedicated Helper Methods for 100% Type-Safe & Clean Invocation
  // =========================================================================

  public async sendMobileVerifyOtp(toPhone: string, otp: string) {
    const t = DLT_TEMPLATES.MOBILE_VERIFY;
    return this.dispatchDltSms(toPhone.replace(/[^0-9]/g, '').slice(-10), t, t.buildText({ otp }));
  }

  public async sendLoginOtp(toPhone: string, otp: string) {
    const t = DLT_TEMPLATES.LOGIN_OTP;
    return this.dispatchDltSms(toPhone.replace(/[^0-9]/g, '').slice(-10), t, t.buildText({ otp }));
  }

  public async sendRegisterWelcome(toPhone: string) {
    const clean = toPhone.replace(/[^0-9]/g, '').slice(-10);
    const t = DLT_TEMPLATES.REGISTER_WELCOME;
    return this.dispatchDltSms(clean, t, t.buildText({ phone: clean }));
  }

  public async sendPasswordResetOtp(toPhone: string, otp: string) {
    const t = DLT_TEMPLATES.PASSWORD_RESET_OTP;
    return this.dispatchDltSms(toPhone.replace(/[^0-9]/g, '').slice(-10), t, t.buildText({ otp }));
  }

  public async sendPasswordResetConfirm(toPhone: string) {
    const t = DLT_TEMPLATES.PASSWORD_RESET_CONFIRM;
    return this.dispatchDltSms(toPhone.replace(/[^0-9]/g, '').slice(-10), t, t.buildText({}));
  }

  public async sendBookingConfirmation(toPhone: string, bookingRef: string, dateTime = 'Today') {
    const t = DLT_TEMPLATES.BOOKING_CONFIRMATION;
    const cleanRef = bookingRef.replace(/^#?BK-?/i, '').slice(-8).toUpperCase();
    return this.dispatchDltSms(toPhone.replace(/[^0-9]/g, '').slice(-10), t, t.buildText({ bookingId: cleanRef, dateTime }));
  }

  public async sendPaymentReceived(toPhone: string, amount: number | string, bookingRef: string) {
    const t = DLT_TEMPLATES.PAYMENT_RECEIVED;
    const cleanRef = bookingRef.replace(/^#?BK-?/i, '').slice(-8).toUpperCase();
    return this.dispatchDltSms(
      toPhone.replace(/[^0-9]/g, '').slice(-10),
      t,
      t.buildText({ amount: Math.round(Number(amount)), bookingId: cleanRef })
    );
  }

  public async sendComparisonRequestReceived(toPhone: string) {
    const t = DLT_TEMPLATES.REQUEST_RECEIVED;
    return this.dispatchDltSms(toPhone.replace(/[^0-9]/g, '').slice(-10), t, t.buildText({}));
  }

  public async sendBookingCancelled(toPhone: string, bookingRef: string) {
    const t = DLT_TEMPLATES.BOOKING_CANCELLED;
    const cleanRef = bookingRef.replace(/^#?BK-?/i, '').slice(-8).toUpperCase();
    return this.dispatchDltSms(toPhone.replace(/[^0-9]/g, '').slice(-10), t, t.buildText({ bookingId: cleanRef }));
  }
}

export const smsProvider = new SmsProvider();
export default smsProvider;
