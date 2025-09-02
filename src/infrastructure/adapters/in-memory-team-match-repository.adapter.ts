import { Injectable, Inject } from '@nestjs/common';
import type { TeamMatchRepositoryPort } from '../../application/ports/team-match-repository.port';
import type { LoggerPort } from '../../application/ports/logger.port';
import { TeamMatch } from '../../domain/entities/team-match.entity';
import { Email } from '../../domain/value-objects/email.vo';
import { LOGGER_TOKEN } from '../../application/ports/tokens';

@Injectable()
export class InMemoryTeamMatchRepositoryAdapter implements TeamMatchRepositoryPort {
  private matches: Map<string, TeamMatch> = new Map();

  constructor(@Inject(LOGGER_TOKEN) private readonly logger: LoggerPort) {
    this.logger.info('In-memory team match repository initialized', 'InMemoryTeamMatchRepositoryAdapter');
  }

  async save(teamMatch: TeamMatch): Promise<void> {
    this.logger.debug('Saving team match', 'InMemoryTeamMatchRepositoryAdapter', {
      matchId: teamMatch.id,
      participantCount: teamMatch.getTeamSize(),
    });

    this.matches.set(teamMatch.id, teamMatch);

    this.logger.debug('Team match saved', 'InMemoryTeamMatchRepositoryAdapter', {
      matchId: teamMatch.id,
      totalMatches: this.matches.size,
    });
  }

  async findById(id: string): Promise<TeamMatch | null> {
    this.logger.debug('Finding team match by ID', 'InMemoryTeamMatchRepositoryAdapter', {
      matchId: id,
    });

    const match = this.matches.get(id) || null;

    if (match) {
      this.logger.debug('Team match found', 'InMemoryTeamMatchRepositoryAdapter', {
        matchId: id,
      });
    } else {
      this.logger.debug('Team match not found', 'InMemoryTeamMatchRepositoryAdapter', {
        matchId: id,
      });
    }

    return match;
  }

  async findByParticipant(email: Email): Promise<TeamMatch[]> {
    this.logger.debug('Finding matches for participant', 'InMemoryTeamMatchRepositoryAdapter', {
      email: email.value,
    });

    const matches = Array.from(this.matches.values()).filter(match =>
      match.hasParticipant(email)
    );

    this.logger.debug('Found matches for participant', 'InMemoryTeamMatchRepositoryAdapter', {
      email: email.value,
      count: matches.length,
    });

    return matches;
  }

  async findAll(): Promise<TeamMatch[]> {
    this.logger.debug('Finding all team matches', 'InMemoryTeamMatchRepositoryAdapter');

    const matches = Array.from(this.matches.values());

    this.logger.debug('Found all team matches', 'InMemoryTeamMatchRepositoryAdapter', {
      count: matches.length,
    });

    return matches;
  }

  async findByStatus(status: string): Promise<TeamMatch[]> {
    this.logger.debug('Finding matches by status', 'InMemoryTeamMatchRepositoryAdapter', {
      status,
    });

    const matches = Array.from(this.matches.values()).filter(match =>
      match.status === status
    );

    this.logger.debug('Found matches by status', 'InMemoryTeamMatchRepositoryAdapter', {
      status,
      count: matches.length,
    });

    return matches;
  }

  async findHighQualityMatches(minScore: number = 0.75): Promise<TeamMatch[]> {
    this.logger.debug('Finding high quality matches', 'InMemoryTeamMatchRepositoryAdapter', {
      minScore,
    });

    const matches = Array.from(this.matches.values()).filter(match =>
      match.matchScore.overall >= minScore
    );

    this.logger.debug('Found high quality matches', 'InMemoryTeamMatchRepositoryAdapter', {
      minScore,
      count: matches.length,
    });

    return matches;
  }

  async delete(id: string): Promise<void> {
    this.logger.debug('Deleting team match', 'InMemoryTeamMatchRepositoryAdapter', {
      matchId: id,
    });

    const deleted = this.matches.delete(id);

    this.logger.debug('Team match deletion completed', 'InMemoryTeamMatchRepositoryAdapter', {
      matchId: id,
      deleted,
      remainingMatches: this.matches.size,
    });
  }

  async updateStatus(id: string, status: 'suggested' | 'accepted' | 'rejected' | 'expired'): Promise<void> {
    this.logger.debug('Updating match status', 'InMemoryTeamMatchRepositoryAdapter', {
      matchId: id,
      newStatus: status,
    });

    const match = this.matches.get(id);
    if (!match) {
      throw new Error('Match not found');
    }

    // Create updated match with new status
    const updatedMatch = new TeamMatch(
      match.id,
      match.participantEmails,
      match.matchScore,
      match.reasoning,
      match.challengeCategory,
      match.recommendedRoles,
      match.createdAt,
      status,
    );

    this.matches.set(id, updatedMatch);

    this.logger.debug('Match status updated', 'InMemoryTeamMatchRepositoryAdapter', {
      matchId: id,
      newStatus: status,
    });
  }
}