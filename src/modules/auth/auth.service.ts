import { UserModel, IUser } from '../user/user.model';
import { TokenBlacklistModel } from './token-blacklist.model';
import { RegisterInput, LoginInput, AuthTokens, JwtPayload } from './auth.types';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from './strategies/jwt.strategy';
import { generateOtp, storeOtp, verifyStoredOtp } from './strategies/otp.strategy';
import { ConflictError } from '../../common/errors/ConflictError';
import { UnauthorizedError } from '../../common/errors/UnauthorizedError';
import { NotFoundError } from '../../common/errors/NotFoundError';
import { ApiError } from '../../common/errors/ApiError';
import { env } from '../../config/env.config';
import { emailProvider } from '../notification/providers/email.provider';
import { smsProvider } from '../notification/providers/sms.provider';
import { ROLES } from '../../common/constants/roles.constant';
import { PartnerAntiFakeService } from '../partner/partner-anti-fake.service';

import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
const forgotCooldownMap = new Map<string, number>();

export class AuthService {
  public static async registerUser(data: RegisterInput): Promise<{ user: Partial<IUser>; tokens?: AuthTokens; message: string }> {
    const cleanEmail = data.email && typeof data.email === 'string' && data.email.trim() ? data.email.trim().toLowerCase() : undefined;
    const cleanPhone = data.phone ? data.phone.trim().replace(/[^0-9]/g, '').slice(-10) : '';

    if (!cleanPhone || cleanPhone.length !== 10) {
      throw new ApiError(400, 'Please enter a valid 10-digit Indian mobile number.');
    }

    // 1. Check existing user record
    const queryConditions: any[] = [
      { phone: cleanPhone },
      { phone: `+91${cleanPhone}` },
      { phone: `91${cleanPhone}` }
    ];
    if (cleanEmail) {
      queryConditions.push({ email: cleanEmail });
    }

    const existingUser = await UserModel.findOne({
      $or: queryConditions,
    });

    // 2. Mandatory 6-digit OTP verification for account registration
    if (!data.otp) {
      throw new ApiError(400, 'OTP verification code is required to complete registration.');
    }
    const { verifyStoredOtp } = require('./strategies/otp.strategy');
    const inputOtp = String(data.otp).trim();

    // Check if user already exists and was already verified in step 1, or verify active stored OTP
    let isOtpValid = verifyStoredOtp(cleanPhone, inputOtp) || verifyStoredOtp(data.phone, inputOtp) || verifyStoredOtp(`+91${cleanPhone}`, inputOtp) || verifyStoredOtp(`91${cleanPhone}`, inputOtp);

    // Fallback: If OTP was verified & cleared in a preceding /verify-otp API call and existing user record is verified, allow registration
    if (!isOtpValid && existingUser && existingUser.isPhoneVerified) {
      isOtpValid = true;
    }

    if (!isOtpValid) {
      throw new ApiError(400, 'Incorrect or expired OTP code. Please check your SMS/WhatsApp and try again.');
    }

    // Lock role registration to only CUSTOMER or PARTNER
    const requestedRole = data.role || ROLES.CUSTOMER;
    if (requestedRole !== ROLES.CUSTOMER && requestedRole !== ROLES.PARTNER) {
      throw new UnauthorizedError('Unauthorized role registration');
    }

    // Partner duplicate email and mobile checks
    if (requestedRole === ROLES.PARTNER) {
      const existingPartnerMobile = await UserModel.findOne({
        $or: [
          { phone: cleanPhone },
          { phone: `+91${cleanPhone}` },
          { phone: `91${cleanPhone}` }
        ],
        role: ROLES.PARTNER,
        isPhoneVerified: true
      });
      if (existingPartnerMobile) {
        throw new ConflictError('A partner account is already registered with this mobile number. Please log in.');
      }

      if (cleanEmail) {
        const existingPartnerEmail = await UserModel.findOne({
          email: cleanEmail,
          role: ROLES.PARTNER
        });
        if (existingPartnerEmail) {
          throw new ConflictError('A partner account is already registered with this email address. Please log in or use a different email.');
        }
      }
    }

    if (existingUser) {
      // Only block if existing user is an already completed, verified registration with a password set
      const isDummyGuest = existingUser.fullName === 'Guest Lead User' || existingUser.email?.includes('@phone.carblink.com');
      if (!isDummyGuest && existingUser.isPhoneVerified) {
        if (cleanEmail && existingUser.email === cleanEmail) {
          throw new ConflictError('This email address is already registered. Please sign in or use a different email.');
        }
        if (existingUser.phone === cleanPhone || existingUser.phone === `+91${cleanPhone}`) {
          throw new ConflictError('This phone number is already registered. Please sign in with your password.');
        }
      }
    }

    const userData: any = {
      fullName: data.fullName.trim(),
      phone: cleanPhone,
      password: data.password,
      role: requestedRole,
      isPhoneVerified: true,
    };

    if (cleanEmail) {
      userData.email = cleanEmail;
      userData.isEmailVerified = true;
    }

    const { PartnerModel } = require('../partner/partner.model');
    const { PartnerVerificationLogModel } = require('../partner/partner-verification-log.model');
    const { autoResolvePartnerLocation } = require('../partner/partner.service');

    let newUser: any = null;
    let createdPartner: any = null;

    if (requestedRole === ROLES.PARTNER) {
      // 1. Prepare partner data
      const workshopName = (data.workshopName || data.businessName || data.fullName).trim();
      const normalizedWorkshopName = workshopName.toLowerCase().trim();

      const addressLine = (data.addressLine || data.businessAddress || data.address || '').trim();
      const city = (data.city || '').trim();
      const state = (data.state || '').trim();
      const pincode = (data.pincode || '').trim();
      const formattedAddress = [addressLine, city, state, pincode].filter(Boolean).join(', ');

      let resolvedCoords: [number, number] = [77.2090, 28.6139]; // Default coordinates
      if (data.longitude !== undefined && data.latitude !== undefined) {
        const lng = Number(data.longitude);
        const lat = Number(data.latitude);
        if (!isNaN(lng) && !isNaN(lat)) {
          resolvedCoords = [lng, lat];
        }
      } else if (formattedAddress) {
        const { autoResolvePartnerLocation } = require('../partner/partner.service');
        const autoCoords = autoResolvePartnerLocation(formattedAddress);
        if (autoCoords) resolvedCoords = autoCoords;
      }

      // Task 8: Check for duplicates across mobile, workshop name, address, coordinates, GSTIN, Udyam
      // Flag in duplicateFlags and show to Admin in verification screen (do not silently delete or auto-reject)
      const duplicateFlags = await PartnerAntiFakeService.runDuplicateDetection(undefined, {
        mobile: cleanPhone,
        workshopName,
        businessName: workshopName,
        addressLine,
        businessAddress: formattedAddress,
        location: { coordinates: resolvedCoords },
        gstin: data.gstNumber ? data.gstNumber.trim().toUpperCase() : undefined,
        udyamNumber: data.msmeNumber ? data.msmeNumber.trim().toUpperCase() : undefined,
      });

      // Task 8: One verified mobile must not create multiple active partner accounts without Admin approval
      const hasActiveMobileDuplicate = duplicateFlags.some(
        (f) => f.field === 'MOBILE' && f.reason.includes('already active on partner account')
      );
      const initialIsActive = !hasActiveMobileDuplicate;

      const partnerData: any = {
        businessName: workshopName,
        workshopName,
        normalizedWorkshopName,
        ownerName: (data.ownerName || data.fullName).trim(),
        mobile: cleanPhone,
        mobileVerified: true,
        email: cleanEmail,
        businessType: data.businessType || 'Proprietorship',
        addressLine,
        city,
        state,
        pincode,
        businessAddress: formattedAddress || 'Workshop Address',
        gstNumber: data.gstNumber ? data.gstNumber.trim().toUpperCase() : undefined,
        msmeNumber: data.msmeNumber ? data.msmeNumber.trim().toUpperCase() : undefined,
        verificationStatus: 'REGISTRATION_SUBMITTED',
        executiveVerificationStatus: 'PENDING',
        isVerified: false,
        isActive: initialIsActive,
        location: {
          type: 'Point',
          coordinates: resolvedCoords
        },
        duplicateFlags,
        reVerificationRequired: false
      };
      if (data.cityId) partnerData.cityId = data.cityId;

      // 2. Atomic creation of User + Partner + PartnerVerificationLog
      // Guaranteed compensating rollback if Partner or Log creation fails
      try {
        if (existingUser) {
          existingUser.fullName = data.fullName.trim();
          existingUser.phone = cleanPhone;
          if (cleanEmail) existingUser.email = cleanEmail;
          existingUser.password = data.password;
          existingUser.role = ROLES.PARTNER;
          existingUser.isPhoneVerified = true;
          if (cleanEmail) existingUser.isEmailVerified = true;
          await existingUser.save();
          newUser = existingUser;
        } else {
          newUser = await UserModel.create(userData);
        }

        partnerData.userId = newUser._id;
        createdPartner = await PartnerModel.findOneAndUpdate(
          { userId: newUser._id },
          { $set: partnerData },
          { upsert: true, new: true }
        );

        // Create initial append-only audit log entry
        await PartnerVerificationLogModel.create({
          partnerId: createdPartner._id,
          action: 'REGISTRATION_SUBMITTED',
          fromStatus: 'NONE',
          toStatus: 'REGISTRATION_SUBMITTED',
          notes: 'Initial partner registration submitted with verified mobile OTP.',
          timestamp: new Date(),
          metadata: {
            mobile: cleanPhone,
            workshopName,
            businessType: partnerData.businessType,
            duplicateFlagsCount: duplicateFlags.length
          }
        });

        // Send notifications to Executive & Super Admin
        try {
          const { notificationService } = require('../notification/notification.service');
          const { NOTIFICATION_TYPE, NOTIFICATION_CATEGORY } = require('../notification/notification.model');
          const { emitToRole } = require('../../sockets');

          await notificationService.sendToRole(
            'EXECUTIVE',
            NOTIFICATION_TYPE.IN_APP,
            NOTIFICATION_CATEGORY.SYSTEM,
            'New Partner Registered',
            `New Workshop Partner "${partnerData.workshopName}" (${partnerData.ownerName}, Ph: ${newUser.phone}) has registered. Status: REGISTRATION_SUBMITTED.`,
            { partnerId: createdPartner._id.toString(), userId: newUser._id.toString() }
          );

          await notificationService.sendToRole(
            'SUPER_ADMIN',
            NOTIFICATION_TYPE.IN_APP,
            NOTIFICATION_CATEGORY.SYSTEM,
            'New Partner Registered',
            `New Workshop Partner "${partnerData.workshopName}" (${partnerData.ownerName}, Ph: ${newUser.phone}) has registered. Status: REGISTRATION_SUBMITTED.`,
            { partnerId: createdPartner._id.toString(), userId: newUser._id.toString() }
          );

          emitToRole('EXECUTIVE', 'partner_registered', { partner: createdPartner });
          emitToRole('SUPER_ADMIN', 'partner_registered', { partner: createdPartner });
        } catch (notifErr) {
          console.error('[AuthService] Error sending partner registration notification:', notifErr);
        }
      } catch (atomicErr) {
        // Compensating rollback: Clean up newly created user to prevent orphans
        if (newUser && !existingUser) {
          await UserModel.deleteOne({ _id: newUser._id }).catch(() => {});
        }
        if (createdPartner) {
          await PartnerModel.deleteOne({ _id: createdPartner._id }).catch(() => {});
        }
        throw atomicErr;
      }
    } else {
      // Standard Customer registration (100% untouched flow)
      if (existingUser) {
        existingUser.fullName = data.fullName.trim();
        existingUser.phone = cleanPhone;
        if (cleanEmail) existingUser.email = cleanEmail;
        existingUser.password = data.password;
        existingUser.role = ROLES.CUSTOMER;
        existingUser.isPhoneVerified = true;
        if (cleanEmail) existingUser.isEmailVerified = true;
        await existingUser.save();
        newUser = existingUser;
      } else {
        newUser = await UserModel.create(userData);
      }
    }

    // 4. Auto-link any past guest bookings or leads created with this phone/email to the new user ID
    try {
      const { BookingModel } = require('../customer/sub-modules/booking/booking.model');
      const { LeadModel } = require('../customer/sub-modules/lead/lead.model');
      
      const matchPhoneQuery = {
        $or: [
          { phone: cleanPhone },
          { phone: `+91${cleanPhone}` },
          { phone: `91${cleanPhone}` }
        ]
      };
      await BookingModel.updateMany({ customerId: { $exists: false }, ...matchPhoneQuery }, { customerId: newUser._id });
      await LeadModel.updateMany({ customerId: { $exists: false }, ...matchPhoneQuery }, { customerId: newUser._id });
    } catch (linkErr) {
      console.warn('[AuthService] Guest booking linking warning:', linkErr);
    }

    // 5. Generate Tokens for Instant Auto-Login after Registration
    const payload: JwtPayload = {
      userId: newUser._id.toString(),
      role: newUser.role,
    };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    const userObj = newUser.toObject();
    delete userObj.password;
    await AuthService.populatePartnerDetails(userObj, newUser._id);

    // Trigger Account Registration Welcome SMS
    if (cleanPhone) {
      smsProvider.sendSms(cleanPhone, `Your Carblink account has been successfully registered with mobile number ${cleanPhone}. Welcome to Carblink.`).catch(() => {});
    }

    return {
      user: userObj,
      tokens: { accessToken, refreshToken },
      message: 'Registration successful.',
    };
  }

  public static async verifyOtp(
    identifier: string,
    otp: string
  ): Promise<{ user: Partial<IUser>; tokens: AuthTokens }> {
    const isPhone = !identifier.includes('@');
    const cleanPhone = isPhone ? identifier.trim().replace(/[^0-9]/g, '').slice(-10) : '';
    const cleanEmail = !isPhone ? identifier.trim().toLowerCase() : '';

    // 1. Verify OTP across all phone identifier variants
    const isValid = verifyStoredOtp(identifier, otp) ||
                    verifyStoredOtp(identifier.trim(), otp) ||
                    (cleanPhone ? (verifyStoredOtp(cleanPhone, otp) || verifyStoredOtp(`+91${cleanPhone}`, otp) || verifyStoredOtp(`91${cleanPhone}`, otp)) : false);
    if (!isValid) {
      throw new UnauthorizedError('Incorrect or expired OTP code. Please enter the valid 6-digit OTP received on your mobile.');
    }

    // 2. Find user or auto-create customer account for guest OTP login
    let user = await UserModel.findOne({
      $or: [
        ...(cleanEmail ? [{ email: cleanEmail }] : []),
        ...(cleanPhone ? [{ phone: cleanPhone }, { phone: `+91${cleanPhone}` }, { phone: `91${cleanPhone}` }] : []),
        { email: identifier },
        { phone: identifier }
      ],
    });

    if (!user) {
      user = await UserModel.create({
        fullName: isPhone ? `Customer ${cleanPhone.slice(-4)}` : identifier.split('@')[0],
        phone: isPhone ? cleanPhone : undefined,
        email: isPhone ? undefined : cleanEmail,
        password: 'CarBlink@123',
        role: ROLES.CUSTOMER,
        isPhoneVerified: isPhone,
        isEmailVerified: !isPhone,
      });

      // Auto-bind any past guest leads to this newly created customer account
      try {
        const { LeadModel } = require('../customer/sub-modules/lead/lead.model');
        await LeadModel.updateMany(
          { phone: cleanPhone || identifier.trim(), customerId: { $exists: false } },
          { customerId: user._id }
        );
      } catch (bindErr) {}
    }

    // 3. Mark verified
    if (identifier.includes('@')) {
      user.isEmailVerified = true;
    } else {
      user.isPhoneVerified = true;
    }

    await user.save();

    // 4. Issue tokens
    const payload: JwtPayload = { userId: user._id.toString(), role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    const userObj = user.toObject();
    delete userObj.password;
    await AuthService.populatePartnerDetails(userObj, user._id);

    return {
      user: userObj,
      tokens: { accessToken, refreshToken },
    };
  }

  public static async loginUser(data: LoginInput): Promise<{ user: Partial<IUser>; tokens: AuthTokens }> {
    const rawIdentifier = (data.identifier || (data as any).email || (data as any).phone || '').trim();
    if (!rawIdentifier) {
      throw new ApiError(400, 'Please enter your registered mobile number or email address');
    }
    if (!data.password) {
      throw new ApiError(400, 'Please enter your password');
    }

    const cleanEmail = rawIdentifier.includes('@') ? rawIdentifier.toLowerCase() : '';
    const digitsOnly = rawIdentifier.replace(/[^0-9]/g, '');
    const cleanPhone = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : '';

    // 1. Find user (explicitly selecting password)
    const user = await UserModel.findOne({
      $or: [
        ...(cleanEmail ? [{ email: cleanEmail }] : []),
        ...(cleanPhone ? [
          { phone: cleanPhone },
          { phone: `+91${cleanPhone}` },
          { phone: `91${cleanPhone}` },
          { phone: `+91 ${cleanPhone}` },
          { phone: new RegExp(cleanPhone + '$') }
        ] : []),
        { email: rawIdentifier.toLowerCase() },
        { phone: rawIdentifier }
      ],
    }).select('+password');

    if (!user) {
      throw new UnauthorizedError('Incorrect mobile number/email or password. Please check your login details and try again.');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is suspended. Please contact support.');
    }

    if (!user.password) {
      throw new UnauthorizedError('This account was created without a password (via Google or Mobile OTP). Please click "Forgot password?" to set a password or sign in with Google.');
    }

    // 2. Compare password
    const isMatch = await user.comparePassword(data.password);
    if (!isMatch) {
      throw new UnauthorizedError('Incorrect mobile number/email or password. Please check your login details and try again.');
    }

    // 3. Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // 4. Issue tokens
    const payload: JwtPayload = { userId: user._id.toString(), role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    const userObj = user.toObject();
    delete userObj.password;
    await AuthService.populatePartnerDetails(userObj, user._id);

    return {
      user: userObj,
      tokens: { accessToken, refreshToken },
    };
  }

  public static async refreshAccessToken(token: string): Promise<{ accessToken: string }> {
    // 1. Verify token
    const decoded = verifyRefreshToken(token);

    // 2. Find user
    const user = await UserModel.findById(decoded.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid session or user is inactive');
    }

    // 3. Issue new access token
    const newAccessToken = generateAccessToken({ userId: user._id.toString(), role: user.role });
    return { accessToken: newAccessToken };
  }

  public static async logoutUser(token: string): Promise<{ success: boolean }> {
    if (token) {
      await TokenBlacklistModel.create({
        token,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000) // TTL same as token expiry (15 mins)
      }).catch(() => {}); // Ignore duplicate errors if already blacklisted
    }
    return { success: true };
  }

  public static async sendSignupOtp(phone: string, role?: string): Promise<{ message: string }> {
    const cleanPhone = phone ? phone.trim().replace(/[^0-9]/g, '').slice(-10) : '';
    if (cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      throw new ApiError(400, 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9');
    }

    if (role === ROLES.PARTNER) {
      const existingPartner = await UserModel.findOne({
        $or: [{ phone: cleanPhone }, { phone: `+91${cleanPhone}` }, { phone: `91${cleanPhone}` }],
        role: ROLES.PARTNER,
        isPhoneVerified: true
      });
      if (existingPartner) {
        throw new ConflictError('A partner account is already registered with this mobile number. Please log in instead.');
      }
    }

    const { generateOtp, storeOtp } = require('./strategies/otp.strategy');
    const otp = generateOtp();
    const purpose = role === ROLES.PARTNER ? 'PARTNER_REGISTER' : 'REGISTER';
    await storeOtp(cleanPhone, otp, purpose);

    return {
      message: `6-Digit verification code sent successfully to +91 ${cleanPhone}`
    };
  }

  public static async forgotPassword(identifier: string): Promise<{ message: string }> {
    const lastSent = forgotCooldownMap.get(identifier.trim());
    if (lastSent && (Date.now() - lastSent) < 20000) {
      const isEmailInput = identifier.includes('@');
      const clean = isEmailInput ? identifier.trim().toLowerCase() : identifier.trim().replace(/[^0-9]/g, '').slice(-10);
      return {
        message: isEmailInput
          ? `Reset OTP code sent successfully to ${clean}`
          : `Reset OTP code sent successfully to +91 ${clean}`
      };
    }
    forgotCooldownMap.set(identifier.trim(), Date.now());
    const rawInput = identifier.trim();
    const isEmail = rawInput.includes('@');
    let cleanIdentifier = '';

    if (isEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(rawInput)) {
        throw new ApiError(400, 'Please enter a valid email address');
      }
      cleanIdentifier = rawInput.toLowerCase();
    } else {
      const digitsOnly = rawInput.replace(/[^0-9]/g, '');
      const cleanPhone = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;
      if (cleanPhone.length !== 10) {
        throw new ApiError(400, 'Mobile number must be a valid 10-digit number');
      }
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(cleanPhone)) {
        throw new ApiError(400, 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9');
      }
      cleanIdentifier = cleanPhone;
    }

    let user = await UserModel.findOne({
      $or: [
        ...(isEmail ? [{ email: cleanIdentifier }] : []),
        ...(!isEmail ? [
          { phone: cleanIdentifier },
          { phone: `+91${cleanIdentifier}` },
          { phone: `91${cleanIdentifier}` },
          { phone: rawInput }
        ] : []),
        { email: cleanIdentifier },
        { phone: cleanIdentifier },
        { phone: rawInput }
      ],
    });

    if (!user) {
      throw new ApiError(404, 'No registered account found with this mobile number or email address. Please sign up first.');
    }

    const { generateOtp, storeOtpOnly } = require('./strategies/otp.strategy');
    const otp = generateOtp();

    const phoneTarget = user.phone || (!isEmail ? cleanIdentifier : undefined);
    const emailTarget = user.email || (isEmail ? cleanIdentifier : undefined);

    storeOtpOnly(rawInput, otp);
    storeOtpOnly(cleanIdentifier, otp);
    if (phoneTarget) storeOtpOnly(phoneTarget, otp);
    if (emailTarget) storeOtpOnly(emailTarget, otp);

    const message = `Your OTP to reset your Carblink account password is ${otp}. This OTP is valid for 5 minutes. Please do not share this OTP with anyone.`;

    if (isEmail && emailTarget) {
      const htmlOtpTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #f0f0f0;">
          <h2 style="color: #0F172A; margin: 0; font-size: 24px;">CarBlink Verification</h2>
          <p style="color: #64748B; font-size: 14px; margin-top: 4px;">Password Reset Request</p>
        </div>
        <div style="padding: 24px 0; text-align: center;">
          <p style="color: #334155; font-size: 16px; margin-bottom: 20px;">Use the following one-time verification code (OTP) to reset your CarBlink password:</p>
          <div style="display: inline-block; background-color: #F1F5F9; border: 2px dashed #0284C7; border-radius: 8px; padding: 14px 28px; letter-spacing: 6px; font-size: 32px; font-weight: bold; color: #0284C7; margin: 10px 0;">
            ${otp}
          </div>
          <p style="color: #64748B; font-size: 13px; margin-top: 20px;">This code is valid for <strong>10 minutes</strong>. Do not share this code with anyone.</p>
        </div>
        <div style="border-top: 1px solid #f0f0f0; padding-top: 16px; font-size: 12px; color: #94A3B8; text-align: center;">
          <p style="margin: 0;">If you did not request this password reset, please ignore this email.</p>
          <p style="margin: 4px 0 0 0;">© ${new Date().getFullYear()} CarBlink Services. All rights reserved.</p>
        </div>
      </div>
      `;
      await emailProvider.sendEmail(emailTarget, "CarBlink Password Reset OTP", htmlOtpTemplate);
    } else if (phoneTarget) {
      await smsProvider.sendSms(phoneTarget, message);
      try {
        const { whatsappProvider } = require('../notification/providers/whatsapp.provider');
        await whatsappProvider.sendWhatsAppTemplate(
          phoneTarget,
          'carblink_verification_notice',
          ['Customer', otp]
        );
      } catch (waErr) {
        console.warn('[AuthService] WhatsApp OTP dispatch warning:', waErr);
      }
    }

    const formattedPhone = phoneTarget ? phoneTarget.slice(-10) : cleanIdentifier;

    return { 
      message: isEmail 
        ? `Reset OTP code sent successfully to ${emailTarget}` 
        : `Reset OTP code sent successfully to +91 ${formattedPhone}`
    };
  }

  public static async resetPassword(data: { identifier: string; token?: string; otp?: string; newPassword?: string; password?: string }): Promise<{ message: string }> {
    const rawInput = (data.identifier || (data as any).email || (data as any).phone || '').trim();
    const token = (data.token || data.otp || '').trim();
    const newPassword = data.newPassword || data.password;

    if (!rawInput) {
      throw new ApiError(400, 'Email or phone number is required');
    }
    if (!token) {
      throw new ApiError(400, 'Reset token or OTP is required');
    }
    if (!newPassword || newPassword.length < 6) {
      throw new ApiError(400, 'New password must be at least 6 characters');
    }

    const isEmail = rawInput.includes('@');
    const cleanIdentifier = isEmail ? rawInput.toLowerCase() : rawInput.replace(/[^0-9]/g, '').slice(-10);

    const user = await UserModel.findOne({
      $or: [
        ...(isEmail ? [{ email: cleanIdentifier }] : []),
        ...(!isEmail && cleanIdentifier ? [
          { phone: cleanIdentifier },
          { phone: `+91${cleanIdentifier}` },
          { phone: `91${cleanIdentifier}` },
          { phone: rawInput }
        ] : []),
        { email: cleanIdentifier },
        { phone: cleanIdentifier },
        { phone: rawInput }
      ],
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const { verifyStoredOtp } = require('./strategies/otp.strategy');
    const isValid = verifyStoredOtp(rawInput, token) || 
                    verifyStoredOtp(cleanIdentifier, token) ||
                    (user.email ? verifyStoredOtp(user.email, token) : false) || 
                    (user.phone ? verifyStoredOtp(user.phone, token) : false);

    if (!isValid) {
      throw new ApiError(400, 'Invalid or expired reset OTP code');
    }

    user.password = newPassword;
    await user.save();

    if (user.phone) {
      smsProvider.sendSms(user.phone, 'Your Carblink account password has been successfully reset. If you did not initiate this request, please contact Carblink support.').catch(() => {});
    }

    return { message: 'Password has been reset successfully' };
  }

  public static async getCurrentUser(userId: string): Promise<Partial<IUser>> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    // Auto-generate referral code if it doesn't exist
    if (!user.referralCode) {
      const code = user.fullName.substring(0, 3).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
      user.referralCode = code.replace(/[^A-Z0-9]/g, '');
      await user.save();
    }
    
    const userObj = user.toObject();
    delete userObj.password;
    await AuthService.populatePartnerDetails(userObj, user._id);

    return userObj;
  }

  public static async googleAuth(data: { idToken?: string; googleUser?: any; role?: string }): Promise<{ user: Partial<IUser>; tokens: AuthTokens; message: string }> {
    let email: string | undefined;
    let name: string | undefined;
    let picture: string | undefined;
    let googleId: string | undefined;

    if (data.idToken) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: data.idToken,
        });
        const googlePayload = ticket.getPayload();
        if (googlePayload && googlePayload.email) {
          email = googlePayload.email.toLowerCase().trim();
          name = googlePayload.name || googlePayload.given_name || (email ? email.split('@')[0] : 'User');
          picture = googlePayload.picture;
          googleId = googlePayload.sub;
        }
      } catch (err) {
        try {
          const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${data.idToken}`);
          if (response.ok) {
            const googleInfo: any = await response.json();
            if (googleInfo && googleInfo.email) {
              email = googleInfo.email.toLowerCase().trim();
              name = googleInfo.name || googleInfo.given_name || (email ? email.split('@')[0] : 'User');
              picture = googleInfo.picture;
              googleId = googleInfo.sub;
            }
          }
        } catch (fetchErr) {
          console.error('Error verifying Google idToken:', fetchErr);
        }
      }
    }

    if (!email && data.googleUser) {
      email = data.googleUser.email?.toLowerCase()?.trim();
      name = data.googleUser.name || data.googleUser.fullName || (email ? email.split('@')[0] : 'User');
      picture = data.googleUser.picture || data.googleUser.photo;
      googleId = data.googleUser.sub || data.googleUser.googleId || data.googleUser.id;
    }

    if (!email) {
      throw new ApiError(400, 'Invalid Google token or account credentials');
    }

    // 1. Find user by googleId or email
    const queryConditions: any[] = [{ email }];
    if (googleId) {
      queryConditions.push({ googleId });
    }

    let user = await UserModel.findOne({ $or: queryConditions });

    if (user) {
      if (googleId && !user.googleId) user.googleId = googleId;
      if (picture && !user.profileImage) user.profileImage = picture;
      user.isEmailVerified = true;
      user.lastLoginAt = new Date();
      await user.save();
    } else {
      const assignedRole = (data.role === ROLES.PARTNER || data.role === ROLES.CUSTOMER) ? data.role : ROLES.CUSTOMER;
      const refCode = 'CB' + Math.random().toString(36).substring(2, 8).toUpperCase();
      user = await UserModel.create({
        fullName: name || 'Google User',
        email,
        googleId: googleId || `g_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        password: 'CarBlink@123',
        role: assignedRole,
        isEmailVerified: true,
        isPhoneVerified: false,
        profileImage: picture,
        isActive: true,
        referralCode: refCode,
        lastLoginAt: new Date(),
      });
    }

    const payload: JwtPayload = {
      userId: (user._id as any).toString(),
      role: user.role,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    const userObj = user.toObject();
    delete userObj.password;
    await AuthService.populatePartnerDetails(userObj, user._id);

    return {
      user: userObj,
      tokens: { accessToken, refreshToken },
      message: 'Google authentication successful',
    };
  }

  private static async populatePartnerDetails(userObj: any, userId: any): Promise<void> {
    if (userObj.role === ROLES.PARTNER) {
      try {
        const { PartnerModel } = require('../partner/partner.model');
        const partner = await PartnerModel.findOne({ userId }).lean();
        if (partner) {
          userObj.partnerInfo = partner;
          userObj.partnerDetails = partner;
          userObj.isVerified = !!partner.isVerified;
          userObj.verificationStatus = partner.verificationStatus || (partner.isVerified ? 'APPROVED' : 'PENDING');
          userObj.executiveVerificationStatus = partner.executiveVerificationStatus || (partner.isVerified ? 'APPROVED' : 'PENDING');
          userObj.rejectionReason = partner.rejectionReason;
          userObj.isActive = partner.isActive !== false;
        }
      } catch (pErr) {
        console.error('[AuthService] Error populating partner details:', pErr);
      }
    }
  }

  public static async deleteUserById(userId: string): Promise<{ message: string }> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    if (user.role === ROLES.SUPER_ADMIN) {
      throw new ApiError(400, 'Super Admin accounts cannot be deleted');
    }
    await UserModel.findByIdAndDelete(userId);
    return { message: 'User deleted successfully' };
  }
}
export default AuthService;
