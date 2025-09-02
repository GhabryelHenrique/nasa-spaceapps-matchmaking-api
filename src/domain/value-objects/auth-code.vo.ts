import * as crypto from 'crypto';

export class AuthCode {
  private readonly _value: string;

  constructor(value: string) {
    if (!this.isValid(value)) {
      throw new Error(`Invalid auth code format: ${value}`);
    }
    this._value = value;
  }

  static generate(): AuthCode {
    const code = crypto.randomInt(100000, 999999).toString();
    return new AuthCode(code);
  }

  get value(): string {
    return this._value;
  }

  private isValid(code: string): boolean {
    return /^\d{6}$/.test(code);
  }

  equals(other: AuthCode | string): boolean {
    const otherValue = typeof other === 'string' ? other : other.value;
    return this._value === otherValue;
  }

  toString(): string {
    return this._value;
  }

  toJSON(): string {
    return this._value;
  }
}