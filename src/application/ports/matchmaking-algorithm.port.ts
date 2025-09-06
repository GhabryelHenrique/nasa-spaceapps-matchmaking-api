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
  
  calculateIndividualMatch(
    profile1: ParticipantProfile, 
    profile2: ParticipantProfile
  ): Promise<any>;
  
  generateTeamRecommendations(
    profiles: ParticipantProfile[], 
    teamSize?: number
  ): Promise<TeamMatch[]>;
  
  findDiverseTeams(
    allProfiles: ParticipantProfile[],
    options?: MatchmakingOptions
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