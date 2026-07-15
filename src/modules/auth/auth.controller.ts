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
    return successResponse(res, result, 'OTP verified successfully');
  });

  public static login = asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.loginUser(req.body);
    return successResponse(res, result, 'Login successful');
  });

  public static refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    const result = await AuthService.refreshAccessToken(refreshToken);
    return successResponse(res, result, 'Token refreshed successfully');
  });

  public static logout = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const result = await AuthService.logoutUser(String(userId));
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
