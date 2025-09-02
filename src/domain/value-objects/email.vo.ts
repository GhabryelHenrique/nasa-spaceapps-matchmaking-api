export class Email {
  private readonly _value: string;

  constructor(value: string) {
    if (!this.isValid(value)) {
      throw new Error(`Invalid email format: ${value}`);
    }
    this._value = value.toLowerCase().trim();
  }

  get value(): string {
    return this._value;
  }

  private isValid(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  equals(other: Email | string): boolean {
    const otherValue = typeof other === 'string' ? other : other.value;
    return this._value === otherValue.toLowerCase().trim();
  }

  toString(): string {
    return this._value;
  }

  toJSON(): string {
    return this._value;
  }

  get domain(): string {
    return this._value.split('@')[1];
  }

  get username(): string {
    return this._value.split('@')[0];
  }
}