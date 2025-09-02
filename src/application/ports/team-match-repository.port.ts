import { TeamMatch } from '../../domain/entities/team-match.entity';
import { Email } from '../../domain/value-objects/email.vo';

export interface TeamMatchRepositoryPort {
  save(teamMatch: TeamMatch): Promise<void>;
  findById(id: string): Promise<TeamMatch | null>;
  findByParticipant(email: Email): Promise<TeamMatch[]>;
  findAll(): Promise<TeamMatch[]>;
  findByStatus(status: string): Promise<TeamMatch[]>;
  findHighQualityMatches(minScore?: number): Promise<TeamMatch[]>;
  delete(id: string): Promise<void>;
  updateStatus(id: string, status: 'suggested' | 'accepted' | 'rejected' | 'expired'): Promise<void>;
}