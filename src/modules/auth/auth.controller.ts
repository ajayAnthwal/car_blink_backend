import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { successResponse } from '../../common/utils/apiResponse.util';
import { asyncHandler } from '../../common/utils/asyncHandler.util';
import { IRequest } from '../../common/interfaces/IRequest';

export class AuthController {
  public static register = asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.registerUser(req.body);
    return successResponse(res, result, 'User registered successfully', 201);
  });

  public static verifyOtp = asyncHandler(async (req: Request, res: Response) => {
    const { identifier, otp } = req.body;
    const result = await AuthService.verifyOtp(identifier, otp);
    
    if (result.tokens) {
      res.cookie('accessToken', result.tokens.accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 15 * 60 * 1000, path: '/' });
      res.cookie('refreshToken', result.tokens.refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/' });
    }
    
    return successResponse(res, result, 'OTP verified successfully');
  });

  public static login = asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.loginUser(req.body);
    
    if (result.tokens) {
      res.cookie('accessToken', result.tokens.accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 15 * 60 * 1000, path: '/' });
      res.cookie('refreshToken', result.tokens.refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/' });
    }
    
    return successResponse(res, result, 'Login successful');
  });

  public static refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
    const result = await AuthService.refreshAccessToken(refreshToken);
    
    if (result.accessToken) {
      res.cookie('accessToken', result.accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 15 * 60 * 1000, path: '/' });
    }
    
    return successResponse(res, result, 'Token refreshed successfully');
  });

  public static logout = asyncHandler(async (req: IRequest, res: Response) => {
    const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];
    const result = await AuthService.logoutUser(token || '');
    
    res.clearCookie('accessToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
    res.clearCookie('refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
    
    return successResponse(res, result, 'Logout successful');
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
}
export default AuthController;
