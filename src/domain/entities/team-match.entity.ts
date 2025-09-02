import { Email } from '../value-objects/email.vo';

export interface MatchScore {
  overall: number;
  skillsCompatibility: number;
  experienceBalance: number;
  availabilityMatch: number;
  preferencesAlignment: number;
  communicationFit: number;
}

export interface MatchReasoning {
  strengths: string[];
  concerns: string[];
  suggestions: string[];
}

export class TeamMatch {
  constructor(
    public readonly id: string,
    public readonly participantEmails: Email[],
    public readonly matchScore: MatchScore,
    public readonly reasoning: MatchReasoning,
    public readonly challengeCategory?: string,
    public readonly recommendedRoles?: Record<string, string>, // email -> suggested role
    public readonly createdAt: Date = new Date(),
    public readonly status: 'suggested' | 'accepted' | 'rejected' | 'expired' = 'suggested',
  ) {}

  static create(data: {
    participantEmails: Email[];
    matchScore: MatchScore;
    reasoning: MatchReasoning;
    challengeCategory?: string;
    recommendedRoles?: Record<string, string>;
  }): TeamMatch {
    const id = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return new TeamMatch(
      id,
      data.participantEmails,
      data.matchScore,
      data.reasoning,
      data.challengeCategory,
      data.recommendedRoles,
    );
  }

  isHighQualityMatch(): boolean {
    return this.matchScore.overall >= 0.75;
  }

  isViableMatch(): boolean {
    return this.matchScore.overall >= 0.6 && 
           this.matchScore.availabilityMatch >= 0.5;
  }

  getTeamSize(): number {
    return this.participantEmails.length;
  }

  hasParticipant(email: Email): boolean {
    return this.participantEmails.some(participantEmail => 
      participantEmail.equals(email)
    );
  }

  toJSON() {
    return {
      id: this.id,
      participantEmails: this.participantEmails.map(email => email.value),
      matchScore: this.matchScore,
      reasoning: this.reasoning,
      challengeCategory: this.challengeCategory,
      recommendedRoles: this.recommendedRoles,
      createdAt: this.createdAt.toISOString(),
      status: this.status,
      metadata: {
        teamSize: this.getTeamSize(),
        isHighQuality: this.isHighQualityMatch(),
        isViable: this.isViableMatch(),
      },
    };
  }
}