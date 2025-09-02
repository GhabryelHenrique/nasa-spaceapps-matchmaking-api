import { Email } from '../value-objects/email.vo';

export class User {
  constructor(
    public readonly id: string,
    public readonly email: Email,
    public readonly fullName: string,
    public readonly phone?: string,
    public readonly cpf?: string,
    public readonly city?: string,
    public readonly educationLevel?: string,
    public readonly birthDate?: Date,
    public readonly participationMode?: 'Presencial' | 'Remoto',
    public readonly registeredAt?: Date,
  ) {}

  static fromRegistrationData(data: Record<string, string>, actualEmail?: string): User {
    // Use the actual email found in the search, or fallback to the Email column
    const emailToUse = actualEmail || data['Email'] || '';
    
    if (!emailToUse) {
      throw new Error('Email is required to create a User');
    }
    
    return new User(
      emailToUse,
      new Email(emailToUse),
      data['Nome completo'] || '',
      data['Telefone'] || undefined,
      data['CPF'] || undefined,
      data['Cidade de residência'] || undefined,
      data['Nível de escolaridade'] || undefined,
      data['Data de nascimento'] ? new Date(data['Data de nascimento']) : undefined,
      data['Modalidade de participação'] as 'Presencial' | 'Remoto' || undefined,
      data['Timestamp'] ? new Date(data['Timestamp']) : undefined,
    );
  }

  toJSON() {
    return {
      id: this.id,
      email: this.email.value,
      fullName: this.fullName,
      phone: this.phone,
      cpf: this.cpf,
      city: this.city,
      educationLevel: this.educationLevel,
      birthDate: this.birthDate?.toISOString(),
      participationMode: this.participationMode,
      registeredAt: this.registeredAt?.toISOString(),
    };
  }
}