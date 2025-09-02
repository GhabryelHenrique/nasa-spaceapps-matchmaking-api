import { Email } from '../value-objects/email.vo';
import { AuthCode as AuthCodeVO } from '../value-objects/auth-code.vo';

export class AuthCode {
  constructor(
    public readonly email: Email,
    public readonly code: AuthCodeVO,
    public readonly expiresAt: Date,
    private _used: boolean = false,
  ) {}

  static generate(email: Email): AuthCode {
    const code = AuthCodeVO.generate();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    return new AuthCode(email, code, expiresAt);
  }

  get used(): boolean {
    return this._used;
  }

  get isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  get isValid(): boolean {
    return !this._used && !this.isExpired;
  }

  verify(inputCode: string): boolean {
    if (!this.isValid) {
      return false;
    }

    if (!this.code.equals(inputCode)) {
      return false;
    }

    this._used = true;
    return true;
  }

  toJSON() {
    return {
      email: this.email.value,
      code: this.code.value,
      expiresAt: this.expiresAt.toISOString(),
      used: this._used,
      isExpired: this.isExpired,
      isValid: this.isValid,
    };
  }
}