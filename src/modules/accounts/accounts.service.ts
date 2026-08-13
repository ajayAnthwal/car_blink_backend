import { UserModel } from '../../user/user.model';
import { ApiError } from '../../../common/errors/ApiError';
import { ERROR_CODES } from '../../../common/constants/error-codes.constant';

export class AccountsService {
  /**
   * Verifies the security PIN of the accounts user.
   * If the user hasn't set a PIN yet, it falls back to '1234' for testing.
   */
  static async verifySecurityPin(userId: string, pin: string): Promise<void> {
    const user = await UserModel.findById(userId).select('+securityPin');
    if (!user) {
      throw new ApiError(401, 'User not found', ERROR_CODES.UNAUTHORIZED);
    }
    
    // Fallback logic for legacy accounts without a PIN set
    if (!user.securityPin) {
      if (pin !== '1234') {
        throw new ApiError(401, 'Invalid Security PIN. (Hint: Default is 1234)', ERROR_CODES.UNAUTHORIZED);
      }
      return;
    }

    const isValid = await user.compareSecurityPin(pin);
    if (!isValid) {
      throw new ApiError(401, 'Invalid Security PIN', ERROR_CODES.UNAUTHORIZED);
    }
  }
}
