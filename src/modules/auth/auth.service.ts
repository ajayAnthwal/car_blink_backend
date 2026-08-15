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

export class AuthService {
  public static async registerUser(data: RegisterInput): Promise<{ user: Partial<IUser>; message: string }> {
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
      if (cleanEmail && existingUser.email === cleanEmail) {
        throw new ConflictError('Email is already registered');
      }
      if (existingUser.phone === cleanPhone) {
        throw new ConflictError('Phone number is already registered');
      }
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
    };

    if (cleanEmail) {
      userData.email = cleanEmail;
    }

    // 2. Create the user
    const newUser = await UserModel.create(userData);

    // 3. Generate & "send" (log) OTP for phone verification
    const otp = generateOtp();
    storeOtp(data.phone, otp);

    const userObj = newUser.toObject();
    delete userObj.password;

    return {
      user: userObj,
      message: 'Registration successful. OTP sent for verification.',
    };
  }

  public static async verifyOtp(
    identifier: string,
    otp: string
  ): Promise<{ user: Partial<IUser>; tokens: AuthTokens }> {
    // 1. Verify OTP
    const isValid = verifyStoredOtp(identifier, otp);
    if (!isValid) {
      throw new UnauthorizedError('Invalid or expired OTP');
    }

    // 2. Find user
    const user = await UserModel.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });

    if (!user) {
      throw new NotFoundError('User not found');
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
      throw new UnauthorizedError('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is suspended');
    }

    // 2. Compare password
    const isMatch = await user.comparePassword(data.password || '');
    if (!isMatch) {
      throw new UnauthorizedError('Invalid credentials');
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

  public static async forgotPassword(identifier: string): Promise<{ message: string; otp?: string }> {
    const cleanIdentifier = identifier.trim().toLowerCase();
    const user = await UserModel.findOne({
      $or: [{ email: cleanIdentifier }, { phone: identifier.trim() }],
    });

    if (!user) {
      throw new NotFoundError('No account found with this email/phone');
    }

    // Generate and store OTP reset token
    const otp = generateOtp();
    await storeOtp(user.email || user.phone, otp);
    await storeOtp(identifier.trim(), otp);

    const message = `Your password reset code for CarBlink is: ${otp}. Valid for 10 minutes.`;
    
    if (identifier.includes('@')) {
      await emailProvider.sendEmail(user.email || identifier, "CarBlink Password Reset OTP", message);
    } else {
      await smsProvider.sendSms(user.phone || identifier, message);
    }

    const showOtp = !env.SMTP_HOST || env.NODE_ENV !== 'production';

    return { 
      message: showOtp ? `Reset OTP sent successfully. (Testing OTP: ${otp})` : 'Reset OTP sent to your email/phone',
      otp: showOtp ? otp : undefined
    };
  }

  public static async resetPassword(data: { identifier: string; token: string; newPassword?: string }): Promise<{ message: string }> {
    const cleanIdentifier = data.identifier.trim().toLowerCase();
    
    // 1. Find user first
    const user = await UserModel.findOne({
      $or: [{ email: cleanIdentifier }, { phone: data.identifier.trim() }],
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // 2. Verify OTP/token against identifier, email, or phone
    const isValid = verifyStoredOtp(data.identifier.trim(), data.token) || 
                    (user.email ? verifyStoredOtp(user.email, data.token) : false) || 
                    (user.phone ? verifyStoredOtp(user.phone, data.token) : false);

    if (!isValid) {
      throw new UnauthorizedError('Invalid or expired reset OTP code');
    }

    if (!data.newPassword || data.newPassword.length < 6) {
      throw new ApiError(400, 'New password must be at least 6 characters');
    }

    // 3. Update password
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
}
export default AuthService;
