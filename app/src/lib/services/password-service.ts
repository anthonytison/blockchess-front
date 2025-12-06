import bcrypt from 'bcryptjs';

export class PasswordService {
  private static readonly SALT_ROUNDS = 12;

  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Verify a password against a hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Check if a string is already hashed (starts with bcrypt prefix)
   */
  static isHashed(password: string): boolean {
    return password.startsWith('$2a$') || password.startsWith('$2b$') || password.startsWith('$2y$');
  }
}