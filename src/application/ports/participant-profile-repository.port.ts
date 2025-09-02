import { ParticipantProfile } from '../../domain/entities/participant-profile.entity';
import { Email } from '../../domain/value-objects/email.vo';

export interface ParticipantProfileRepositoryPort {
  save(profile: ParticipantProfile): Promise<void>;
  findByEmail(email: Email): Promise<ParticipantProfile | null>;
  findAll(): Promise<ParticipantProfile[]>;
  findBySkills(skills: string[]): Promise<ParticipantProfile[]>;
  findBySector(sector: string): Promise<ParticipantProfile[]>;
  findByExpertiseLevel(level: string): Promise<ParticipantProfile[]>;
  delete(email: Email): Promise<void>;
  exists(email: Email): Promise<boolean>;
  // ML-specific queries
  getAllForMLTraining(): Promise<any[]>;
  findSimilarProfiles(email: Email, limit?: number): Promise<ParticipantProfile[]>;
}