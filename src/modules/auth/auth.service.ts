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


import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
const forgotCooldownMap = new Map<string, number>();

export class AuthService {
  public static async registerUser(data: RegisterInput): Promise<{ user: Partial<IUser>; tokens?: AuthTokens; message: string }> {
    const cleanEmail = data.email && typeof data.email === 'string' && data.email.trim() ? data.email.trim().toLowerCase() : undefined;
    const cleanPhone = data.phone ? data.phone.trim() : '';

    // 1. Check uniqueness of email/phone
    const queryConditions: any[] = [{ phone: cleanPhone }];
    if (cleanEmail) {
      queryConditions.push({ email: cleanEmail });
    }

    const existingUser = await UserModel.findOne({
      $or: queryConditions,
    });

    if (existingUser) {
      if (existingUser.isPhoneVerified || existingUser.isEmailVerified) {
        if (cleanEmail && existingUser.email === cleanEmail) {
          throw new ConflictError('Email is already registered');
        }
        if (existingUser.phone === cleanPhone) {
          throw new ConflictError('Phone number is already registered');
        }
      }
    }

    // Mandatory 6-digit OTP verification for account registration
    if (!data.otp) {
      throw new ApiError(400, 'OTP verification code is required to complete registration.');
    }
    const { verifyStoredOtp } = require('./strategies/otp.strategy');
    const isOtpValid = verifyStoredOtp(cleanPhone, data.otp) || verifyStoredOtp(data.phone, data.otp);
    if (!isOtpValid) {
      throw new ApiError(400, 'Incorrect or expired OTP code. Please check your SMS and try again.');
    }

    // Lock role registration to only CUSTOMER or PARTNER
    if (data.role !== ROLES.CUSTOMER && data.role !== ROLES.PARTNER) {
      throw new UnauthorizedError('Unauthorized role registration');
    }

    const userData: any = {
      fullName: data.fullName,
      phone: cleanPhone,
      password: data.password,
      role: data.role,
      isPhoneVerified: !!data.otp,
    };

    if (cleanEmail) {
      userData.email = cleanEmail;
    }

    // 2. Create or Update the user
    let newUser;
    if (existingUser) {
      existingUser.fullName = data.fullName;
      if (cleanEmail) existingUser.email = cleanEmail;
      existingUser.password = data.password;
      existingUser.isPhoneVerified = !!data.otp;
      await existingUser.save();
      newUser = existingUser;
    } else {
      newUser = await UserModel.create(userData);
    }

    // 3. Auto-link any past guest bookings or leads created with this phone/email to the new user ID
    try {
      const { BookingModel } = require('../customer/sub-modules/booking/booking.model');
      const { LeadModel } = require('../customer/sub-modules/lead/lead.model');
      
      const matchPhoneQuery = { phone: cleanPhone };
      await BookingModel.updateMany({ customerId: { $exists: false }, ...matchPhoneQuery }, { customerId: newUser._id });
      await LeadModel.updateMany({ customerId: { $exists: false }, ...matchPhoneQuery }, { customerId: newUser._id });
    } catch (linkErr) {
      console.warn('[AuthService] Guest booking linking warning:', linkErr);
    }

    // 4. Generate Tokens for Instant Auto-Login after Registration
    const payload: JwtPayload = {
      userId: newUser._id.toString(),
      role: newUser.role,
    };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    const userObj = newUser.toObject();
    delete userObj.password;

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
    // 1. Verify OTP
    const isValid = verifyStoredOtp(identifier, otp);
    if (!isValid) {
      throw new UnauthorizedError('Incorrect or expired OTP code. Please enter the valid 6-digit OTP received on your mobile.');
    }

    // 2. Find user or auto-create customer account for guest OTP login
    let user = await UserModel.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });

    if (!user) {
      const isPhone = !identifier.includes('@');
      user = await UserModel.create({
        fullName: isPhone ? `Customer ${identifier.slice(-4)}` : identifier.split('@')[0],
        phone: identifier.trim(),
        email: isPhone ? undefined : identifier.trim().toLowerCase(),
        password: 'CarBlink@123',
        role: ROLES.CUSTOMER,
        isPhoneVerified: isPhone,
        isEmailVerified: !isPhone,
      });

      // Auto-bind any past guest leads to this newly created customer account
      try {
        const { LeadModel } = require('../customer/sub-modules/lead/lead.model');
        await LeadModel.updateMany(
          { phone: identifier.trim(), customerId: { $exists: false } },
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

    return {
      user: userObj,
      tokens: { accessToken, refreshToken },
    };
  }

  public static async loginUser(data: LoginInput): Promise<{ user: Partial<IUser>; tokens: AuthTokens }> {
    // 1. Find user (explicitly selecting password)
    const user = await UserModel.findOne({
      $or: [{ email: data.identifier }, { phone: data.identifier }],
    }).select('+password');

    if (!user) {
      throw new UnauthorizedError('Incorrect mobile number/email or password. Please check your login details and try again.');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is suspended');
    }

    // 2. Compare password
    const isMatch = await user.comparePassword(data.password || '');
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

    if (isEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(rawInput)) {
        throw new ApiError(400, 'Please enter a valid email address');
      }
    } else {
      if (/[^\d]/.test(rawInput)) {
        throw new ApiError(400, 'Mobile number must contain digits only (10 digits required)');
      }
      if (rawInput.length !== 10) {
        throw new ApiError(400, 'Mobile number must be exactly 10 digits');
      }
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(rawInput)) {
        throw new ApiError(400, 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9');
      }
    }

    const cleanIdentifier = isEmail ? rawInput.toLowerCase() : rawInput.replace(/[^0-9]/g, '');

    let user = await UserModel.findOne({
      $or: [
        { email: cleanIdentifier },
        { phone: cleanIdentifier },
        { phone: rawInput }
      ],
    });

    if (!user) {
      const dummyPhone = `9${Math.floor(100000000 + Math.random() * 900000000)}`;
      user = await UserModel.create({
        fullName: isEmail ? cleanIdentifier.split('@')[0] : `Customer ${cleanIdentifier.slice(-4)}`,
        phone: isEmail ? dummyPhone : cleanIdentifier,
        email: isEmail ? cleanIdentifier : `${cleanIdentifier}@phone.carblink.com`,
        password: 'CarBlink@123',
        role: ROLES.CUSTOMER,
        isPhoneVerified: false,
        isEmailVerified: false,
      });

      try {
        const { LeadModel } = require('../customer/sub-modules/lead/lead.model');
        await LeadModel.updateMany(
          { phone: cleanIdentifier, customerId: { $exists: false } },
          { customerId: user._id }
        );
      } catch (bindErr) {}
    }

    const { generateOtp, storeOtpOnly } = require('./strategies/otp.strategy');
    const otp = generateOtp();

    const phoneTarget = user.phone || (!isEmail ? cleanIdentifier : undefined);
    const emailTarget = user.email || (isEmail ? cleanIdentifier : undefined);

    storeOtpOnly(rawInput, otp);
    storeOtpOnly(cleanIdentifier, otp);
    if (phoneTarget) storeOtpOnly(phoneTarget, otp);
    if (emailTarget) storeOtpOnly(emailTarget, otp);

    const message = `Your password reset code for CarBlink is: ${otp}. Valid for 10 minutes.`;

    if (isEmail && emailTarget) {
      await emailProvider.sendEmail(emailTarget, "CarBlink Password Reset OTP", message);
    } else if (phoneTarget) {
      await smsProvider.sendSms(phoneTarget, message);
    }

    const formattedPhone = phoneTarget ? phoneTarget.slice(-10) : cleanIdentifier;

    return { 
      message: isEmail 
        ? `Reset OTP code sent successfully to ${emailTarget}` 
        : `Reset OTP code sent successfully to +91 ${formattedPhone}`
    };
  }

    public static async resetPassword(data: { identifier: string; token: string; newPassword?: string }): Promise<{ message: string }> {
    const rawInput = data.identifier.trim();
    const isEmail = rawInput.includes('@');
    const cleanIdentifier = isEmail ? rawInput.toLowerCase() : rawInput.replace(/[^0-9]/g, '');

    const user = await UserModel.findOne({
      $or: [
        { email: cleanIdentifier },
        { phone: cleanIdentifier },
        { phone: rawInput }
      ],
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const { verifyStoredOtp } = require('./strategies/otp.strategy');
    const isValid = verifyStoredOtp(rawInput, data.token) || 
                    verifyStoredOtp(cleanIdentifier, data.token) ||
                    (user.email ? verifyStoredOtp(user.email, data.token) : false) || 
                    (user.phone ? verifyStoredOtp(user.phone, data.token) : false);

    if (!isValid) {
      throw new ApiError(400, 'Invalid or expired reset OTP code');
    }

    if (!data.newPassword || data.newPassword.length < 6) {
      throw new ApiError(400, 'New password must be at least 6 characters');
    }

    user.password = data.newPassword;
    await user.save();

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
      user = await UserModel.create({
        fullName: name || 'Google User',
        email,
        googleId: googleId || `g_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        role: assignedRole,
        isEmailVerified: true,
        isPhoneVerified: false,
        profileImage: picture,
        isActive: true,
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

    return {
      user: userObj,
      tokens: { accessToken, refreshToken },
      message: 'Google authentication successful',
    };
  }
}
export default AuthService;
