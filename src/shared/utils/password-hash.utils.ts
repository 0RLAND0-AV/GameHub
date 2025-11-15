import bcrypt from 'bcrypt';
import { ENV } from '../../config/environment.config';

export class PasswordHashUtility {
  
  // ============================================
  // HASHEAR PASSWORD
  // ============================================
  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(ENV.SALT_ROUNDS);
    return bcrypt.hash(password, salt);
  }

  // ============================================
  // COMPARAR PASSWORD
  // ============================================
  static async comparePassword(
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}