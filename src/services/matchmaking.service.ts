import { Injectable, Inject } from '@nestjs/common';
import type { ParticipantProfileRepositoryPort } from '../application/ports/participant-profile-repository.port';
import type { TeamMatchRepositoryPort } from '../application/ports/team-match-repository.port';
import type { MatchmakingAlgorithmPort, MatchmakingOptions } from '../application/ports/matchmaking-algorithm.port';
import type { LoggerPort } from '../application/ports/logger.port';
import { TeamMatch } from '../domain/entities/team-match.entity';
import { Email } from '../domain/value-objects/email.vo';
import {
  PARTICIPANT_PROFILE_REPOSITORY_TOKEN,
  TEAM_MATCH_REPOSITORY_TOKEN,
  MATCHMAKING_ALGORITHM_TOKEN,
  LOGGER_TOKEN,
} from '../application/ports/tokens';

@Injectable()
export class MatchmakingService {
  constructor(
    @Inject(PARTICIPANT_PROFILE_REPOSITORY_TOKEN)
    private readonly profileRepository: ParticipantProfileRepositoryPort,
    @Inject(TEAM_MATCH_REPOSITORY_TOKEN)
    private readonly teamMatchRepository: TeamMatchRepositoryPort,
    @Inject(MATCHMAKING_ALGORITHM_TOKEN)
    private readonly matchmakingAlgorithm: MatchmakingAlgorithmPort,
    @Inject(LOGGER_TOKEN) private readonly logger: LoggerPort,
  ) {}

  async findMatches(email: string, options?: MatchmakingOptions): Promise<TeamMatch[]> {
    this.logger.info('Finding matches for participant', 'MatchmakingService', {
      email,
      options,
    });

    try {
      const emailVo = new Email(email);
      
      // Get all profiles for matching
      const allProfiles = await this.profileRepository.findAll();
      
      // Find matches using the ML algorithm
      const matches = await this.matchmakingAlgorithm.findMatches(emailVo, allProfiles, options);

      // Save generated matches
      for (const match of matches) {
        await this.teamMatchRepository.save(match);
      }

      this.logger.info('Matches found and saved', 'MatchmakingService', {
        email,
        matchCount: matches.length,
      });

      return matches;
    } catch (error) {
      this.logger.error('Error finding matches', error, 'MatchmakingService', { email });
      throw error;
    }
  }

  async getMatchesForParticipant(email: string): Promise<TeamMatch[]> {
    this.logger.info('Getting matches for participant', 'MatchmakingService', { email });

    try {
      const emailVo = new Email(email);
      const matches = await this.teamMatchRepository.findByParticipant(emailVo);

      this.logger.info('Retrieved matches for participant', 'MatchmakingService', {
        email,
        matchCount: matches.length,
      });

      return matches;
    } catch (error) {
      this.logger.error('Error getting matches for participant', error, 'MatchmakingService', {
        email,
      });
      throw error;
    }
  }

  async acceptMatch(matchId: string, participantEmail: string): Promise<void> {
    this.logger.info('Accepting match', 'MatchmakingService', {
      matchId,
      participantEmail,
    });

    try {
      const match = await this.teamMatchRepository.findById(matchId);
      if (!match) {
        throw new Error('Match not found');
      }

      const emailVo = new Email(participantEmail);
      if (!match.hasParticipant(emailVo)) {
        throw new Error('Participant is not part of this match');
      }

      await this.teamMatchRepository.updateStatus(matchId, 'accepted');

      this.logger.info('Match accepted successfully', 'MatchmakingService', {
        matchId,
        participantEmail,
      });
    } catch (error) {
      this.logger.error('Error accepting match', error, 'MatchmakingService', {
        matchId,
        participantEmail,
      });
      throw error;
    }
  }

  async rejectMatch(matchId: string, participantEmail: string): Promise<void> {
    this.logger.info('Rejecting match', 'MatchmakingService', {
      matchId,
      participantEmail,
    });

    try {
      const match = await this.teamMatchRepository.findById(matchId);
      if (!match) {
        throw new Error('Match not found');
      }

      const emailVo = new Email(participantEmail);
      if (!match.hasParticipant(emailVo)) {
        throw new Error('Participant is not part of this match');
      }

      await this.teamMatchRepository.updateStatus(matchId, 'rejected');

      this.logger.info('Match rejected successfully', 'MatchmakingService', {
        matchId,
        participantEmail,
      });
    } catch (error) {
      this.logger.error('Error rejecting match', error, 'MatchmakingService', {
        matchId,
        participantEmail,
      });
      throw error;
    }
  }

  async generateTeamRecommendations(teamSize?: number): Promise<TeamMatch[]> {
    this.logger.info('Generating team recommendations', 'MatchmakingService', { teamSize });

    try {
      const allProfiles = await this.profileRepository.findAll();
      const recommendations = await this.matchmakingAlgorithm.generateTeamRecommendations(
        allProfiles,
        teamSize,
      );

      // Save recommendations
      for (const recommendation of recommendations) {
        await this.teamMatchRepository.save(recommendation);
      }

      this.logger.info('Team recommendations generated', 'MatchmakingService', {
        teamSize,
        recommendationCount: recommendations.length,
      });

      return recommendations;
    } catch (error) {
      this.logger.error('Error generating team recommendations', error, 'MatchmakingService');
      throw error;
    }
  }

  async getHighQualityMatches(minScore: number = 0.75): Promise<TeamMatch[]> {
    this.logger.info('Getting high quality matches', 'MatchmakingService', { minScore });

    try {
      const matches = await this.teamMatchRepository.findHighQualityMatches(minScore);

      this.logger.info('Retrieved high quality matches', 'MatchmakingService', {
        minScore,
        matchCount: matches.length,
      });

      return matches;
    } catch (error) {
      this.logger.error('Error getting high quality matches', error, 'MatchmakingService');
      throw error;
    }
  }

  async getMatchById(matchId: string): Promise<TeamMatch | null> {
    this.logger.info('Getting match by ID', 'MatchmakingService', { matchId });

    try {
      const match = await this.teamMatchRepository.findById(matchId);

      if (match) {
        this.logger.info('Match found', 'MatchmakingService', { matchId });
      } else {
        this.logger.warn('Match not found', 'MatchmakingService', { matchId });
      }

      return match;
    } catch (error) {
      this.logger.error('Error getting match by ID', error, 'MatchmakingService', { matchId });
      throw error;
    }
  }

  // ML and Analytics methods
  async exportMatchmakingData(): Promise<any> {
    this.logger.info('Exporting matchmaking data for ML', 'MatchmakingService');

    try {
      const profiles = await this.profileRepository.getAllForMLTraining();
      const matches = await this.teamMatchRepository.findAll();

      const exportData = {
        profiles: profiles,
        matches: matches.map(match => ({
          ...match.toJSON(),
          success: match.status === 'accepted',
        })),
        metadata: {
          totalProfiles: profiles.length,
          totalMatches: matches.length,
          exportedAt: new Date().toISOString(),
        },
      };

      this.logger.info('Matchmaking data exported', 'MatchmakingService', {
        profileCount: profiles.length,
        matchCount: matches.length,
      });

      return exportData;
    } catch (error) {
      this.logger.error('Error exporting matchmaking data', error, 'MatchmakingService');
      throw error;
    }
  }
}