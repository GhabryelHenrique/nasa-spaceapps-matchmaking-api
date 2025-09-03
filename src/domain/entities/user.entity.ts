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
    public readonly areasOfInterest?: string,
    public readonly howDidYouKnow?: string,
  ) {}

  static fromRegistrationData(data: Record<string, string>, actualEmail?: string): User {
    // Use the actual email found in the search, or fallback to the Email column
    const emailToUse = actualEmail || data['Email'] || '';
    
    if (!emailToUse) {
      throw new Error('Email is required to create a User');
    }

    console.log(data)
    
    // Helper function to safely convert participation mode
    const getParticipationMode = (): 'Presencial' | 'Remoto' | undefined => {
      const mode = data['Gostaria de fazer o hackathon Presencialmente ou Remotamente?'] || data['Modalidade de participação'];
      if (mode?.includes('Presencialmente') || mode?.includes('Presencial')) return 'Presencial';
      if (mode?.includes('Remotamente') || mode?.includes('Remoto')) return 'Remoto';
      return undefined;
    };

    // Helper function to safely parse dates
    const parseDate = (dateString?: string): Date | undefined => {
      if (!dateString || dateString.trim() === '') return undefined;
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? undefined : date;
    };
    
    return new User(
      emailToUse,
      new Email(emailToUse),
      data['Nome e Sobrenome:'] || data['Nome completo'] || '',
      data['Telefone de Contato:'] || data['Telefone'] || undefined,
      data['CPF:'] || data['CPF'] || undefined,
      data['Cidade onde reside:'] || data['Cidade de residência'] || undefined,
      data['Escolaridade:'] || data['Nível de escolaridade'] || undefined,
      parseDate(data['Data de Nascimento '] || data['Data de nascimento']),
      getParticipationMode(),
      parseDate(data['Carimbo de data/hora:'] || data['Carimbo de data/hora'] || data['Timestamp']),
      data['Áreas de interesse'] || undefined,
      data['Como você ficou sabendo do Hackathon?'] || undefined,
    );
  }

  toJSON() {
    // Helper function to safely convert dates to ISO string
    const toISOStringSafe = (date?: Date): string | undefined => {
      if (!date) return undefined;
      try {
        return date.toISOString();
      } catch {
        return undefined;
      }
    };

    // Helper function to safely convert dates to locale string
    const toLocaleDateStringSafe = (date?: Date): string | undefined => {
      if (!date) return undefined;
      try {
        return date.toLocaleDateString('pt-BR');
      } catch {
        return undefined;
      }
    };

    // Helper function to safely convert dates to locale string with time
    const toLocaleStringSafe = (date?: Date): string | undefined => {
      if (!date) return undefined;
      try {
        return date.toLocaleString('pt-BR');
      } catch {
        return undefined;
      }
    };

    return {
      id: this.id,
      email: this.email.value,
      fullName: this.fullName,
      phone: this.phone,
      cpf: this.cpf,
      city: this.city,
      educationLevel: this.educationLevel,
      birthDate: toISOStringSafe(this.birthDate),
      participationMode: this.participationMode,
      registeredAt: toISOStringSafe(this.registeredAt),
      areasOfInterest: this.areasOfInterest,
      howDidYouKnow: this.howDidYouKnow,
      // Include exact Google Sheets field names for compatibility
      'Nome e Sobrenome:': this.fullName,
      'Telefone de Contato:': this.phone,
      'CPF:': this.cpf,
      'Cidade onde reside:': this.city,
      'Escolaridade:': this.educationLevel,
      'Data de Nascimento ': toLocaleDateStringSafe(this.birthDate),
      'Gostaria de fazer o hackathon Presencialmente ou Remotamente?': this.participationMode,
      'Carimbo de data/hora:': toLocaleStringSafe(this.registeredAt),
      'Áreas de interesse': this.areasOfInterest,
      'Como você ficou sabendo do Hackathon?': this.howDidYouKnow,
    };
  }
}