import { ParticipantProfile } from '../../domain/entities/participant-profile.entity';
import { TeamMatch } from '../../domain/entities/team-match.entity';
import { Email } from '../../domain/value-objects/email.vo';

export interface MatchmakingAlgorithmPort {
  findMatches(
    participantEmail: Email, 
    allProfiles: ParticipantProfile[], 
    options?: MatchmakingOptions
  ): Promise<TeamMatch[]>;
  
  calculateMatchScore(
    participant: ParticipantProfile, 
    candidates: ParticipantProfile[]
  ): Promise<number>;
  
  generateTeamRecommendations(
    profiles: ParticipantProfile[], 
    teamSize?: number
  ): Promise<TeamMatch[]>;
}

export interface MatchmakingOptions {
  teamSize?: number;
  challengeCategories?: string[];
  minMatchScore?: number;
  maxResults?: number;
  prioritizeExperienceBalance?: boolean;
  prioritizeSkillDiversity?: boolean;
}