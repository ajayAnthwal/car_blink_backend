import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { successResponse } from '../../common/utils/apiResponse.util';
import { asyncHandler } from '../../common/utils/asyncHandler.util';
import { IRequest } from '../../common/interfaces/IRequest';

export class AuthController {
  public static register = asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.registerUser(req.body);
    if (result.tokens) {
      const cookieOpts = { secure: process.env.NODE_ENV === 'production', sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as any, maxAge: 7 * 24 * 60 * 60 * 1000, path: '/' };
      res.cookie('accessToken', result.tokens.accessToken, { ...cookieOpts, httpOnly: true });
      res.cookie('car_blink_access_token', result.tokens.accessToken, { ...cookieOpts, httpOnly: false });
      res.cookie('refreshToken', result.tokens.refreshToken, { ...cookieOpts, httpOnly: true });
      res.cookie('role', result.user?.role || 'CUSTOMER', { ...cookieOpts, httpOnly: false });
      res.cookie('user_role', result.user?.role || 'CUSTOMER', { ...cookieOpts, httpOnly: false });
    }
    return successResponse(res, result, 'User registered successfully', 201);
  });

  public static verifyOtp = asyncHandler(async (req: Request, res: Response) => {
    const { identifier, otp } = req.body;
    const result = await AuthService.verifyOtp(identifier, otp);
    
    if (result.tokens) {
      const cookieOpts = { secure: process.env.NODE_ENV === 'production', sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as any, maxAge: 7 * 24 * 60 * 60 * 1000, path: '/' };
      res.cookie('accessToken', result.tokens.accessToken, { ...cookieOpts, httpOnly: true });
      res.cookie('car_blink_access_token', result.tokens.accessToken, { ...cookieOpts, httpOnly: false });
      res.cookie('refreshToken', result.tokens.refreshToken, { ...cookieOpts, httpOnly: true });
      res.cookie('role', result.user?.role || 'CUSTOMER', { ...cookieOpts, httpOnly: false });
      res.cookie('user_role', result.user?.role || 'CUSTOMER', { ...cookieOpts, httpOnly: false });
    }
    
    return successResponse(res, result, 'OTP verified successfully');
  });

  public static login = asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.loginUser(req.body);
    
    if (result.tokens) {
      const cookieOpts = { secure: process.env.NODE_ENV === 'production', sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as any, maxAge: 7 * 24 * 60 * 60 * 1000, path: '/' };
      res.cookie('accessToken', result.tokens.accessToken, { ...cookieOpts, httpOnly: true });
      res.cookie('car_blink_access_token', result.tokens.accessToken, { ...cookieOpts, httpOnly: false });
      res.cookie('refreshToken', result.tokens.refreshToken, { ...cookieOpts, httpOnly: true });
      res.cookie('role', result.user?.role || 'CUSTOMER', { ...cookieOpts, httpOnly: false });
      res.cookie('user_role', result.user?.role || 'CUSTOMER', { ...cookieOpts, httpOnly: false });
    }
    
    return successResponse(res, result, 'Login successful');
  });

  public static refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
    const result = await AuthService.refreshAccessToken(refreshToken);
    
    if (result.accessToken) {
      res.cookie('accessToken', result.accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', maxAge: 15 * 60 * 1000, path: '/' });
    }
    
    return successResponse(res, result, 'Token refreshed successfully');
  });

  public static logout = asyncHandler(async (req: IRequest, res: Response) => {
    const token = req.cookies?.accessToken || req.cookies?.car_blink_access_token || req.headers.authorization?.split(' ')[1];
    const headerToken = req.headers.authorization?.split(' ')[1];

    if (token) await AuthService.logoutUser(token);
    if (headerToken && headerToken !== token) await AuthService.logoutUser(headerToken);

    const cookieOpts = { secure: process.env.NODE_ENV === 'production', sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as any, path: '/' };
    res.clearCookie('accessToken', { ...cookieOpts, httpOnly: true });
    res.clearCookie('car_blink_access_token', { ...cookieOpts, httpOnly: false });
    res.clearCookie('refreshToken', { ...cookieOpts, httpOnly: true });
    res.clearCookie('role', { ...cookieOpts, httpOnly: false });
    res.clearCookie('user_role', { ...cookieOpts, httpOnly: false });

    return successResponse(res, null, 'Logout successful');
  });

  public static sendSignupOtp = asyncHandler(async (req: Request, res: Response) => {
    const { phone, identifier } = req.body;
    const target = phone || identifier;
    const result = await AuthService.sendSignupOtp(target);
    return successResponse(res, result, result.message);
  });

  public static forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const { identifier } = req.body;
    const result = await AuthService.forgotPassword(identifier);
    return successResponse(res, result, 'Reset OTP sent successfully');
  });

  public static resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { identifier, token, newPassword } = req.body;
    const result = await AuthService.resetPassword({ identifier, token, newPassword });
    return successResponse(res, result, 'Password reset successful');
  });

  public static getMe = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const result = await AuthService.getCurrentUser(String(userId));
    return successResponse(res, result, 'User profile retrieved successfully');
  });

  public static googleLogin = asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.googleAuth(req.body);
    if (result.tokens) {
      const cookieOpts = { secure: process.env.NODE_ENV === 'production', sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as any, maxAge: 7 * 24 * 60 * 60 * 1000, path: '/' };
      res.cookie('accessToken', result.tokens.accessToken, { ...cookieOpts, httpOnly: true });
      res.cookie('car_blink_access_token', result.tokens.accessToken, { ...cookieOpts, httpOnly: false });
      res.cookie('refreshToken', result.tokens.refreshToken, { ...cookieOpts, httpOnly: true });
      res.cookie('role', result.user?.role || 'CUSTOMER', { ...cookieOpts, httpOnly: false });
      res.cookie('user_role', result.user?.role || 'CUSTOMER', { ...cookieOpts, httpOnly: false });
      res.cookie('user_role', result.user?.role || 'CUSTOMER', { ...cookieOpts, httpOnly: false });
    }
    return successResponse(res, result, 'Google login successful');
  });

  public static deleteUser = asyncHandler(async (req: IRequest, res: Response) => {
    const { id } = req.params;
    const result = await AuthService.deleteUserById(id);
    return successResponse(res, result, result.message);
  });
}
export default AuthController;
