import { Injectable, Inject } from '@nestjs/common';
import type { ParticipantProfileRepositoryPort } from '../../application/ports/participant-profile-repository.port';
import type { LoggerPort } from '../../application/ports/logger.port';
import { ParticipantProfile } from '../../domain/entities/participant-profile.entity';
import { Email } from '../../domain/value-objects/email.vo';
import { LOGGER_TOKEN } from '../../application/ports/tokens';

@Injectable()
export class InMemoryParticipantProfileRepositoryAdapter implements ParticipantProfileRepositoryPort {
  private profiles: Map<string, ParticipantProfile> = new Map();

  constructor(@Inject(LOGGER_TOKEN) private readonly logger: LoggerPort) {
    this.logger.info('In-memory participant profile repository initialized', 'InMemoryParticipantProfileRepositoryAdapter');
  }

  async save(profile: ParticipantProfile): Promise<void> {
    this.logger.debug('Saving participant profile', 'InMemoryParticipantProfileRepositoryAdapter', {
      email: profile.email.value,
      profileId: profile.id,
    });

    this.profiles.set(profile.email.value, profile);

    this.logger.debug('Participant profile saved', 'InMemoryParticipantProfileRepositoryAdapter', {
      email: profile.email.value,
      totalProfiles: this.profiles.size,
    });
  }

  async findByEmail(email: Email): Promise<ParticipantProfile | null> {
    this.logger.debug('Finding participant profile by email', 'InMemoryParticipantProfileRepositoryAdapter', {
      email: email.value,
    });

    const profile = this.profiles.get(email.value) || null;

    if (profile) {
      this.logger.debug('Participant profile found', 'InMemoryParticipantProfileRepositoryAdapter', {
        email: email.value,
      });
    } else {
      this.logger.debug('Participant profile not found', 'InMemoryParticipantProfileRepositoryAdapter', {
        email: email.value,
      });
    }

    return profile;
  }

  async findAll(): Promise<ParticipantProfile[]> {
    this.logger.debug('Finding all participant profiles', 'InMemoryParticipantProfileRepositoryAdapter');

    const profiles = Array.from(this.profiles.values());

    this.logger.debug('Found all participant profiles', 'InMemoryParticipantProfileRepositoryAdapter', {
      count: profiles.length,
    });

    return profiles;
  }

  async findBySkills(skills: string[]): Promise<ParticipantProfile[]> {
    this.logger.debug('Finding profiles by skills', 'InMemoryParticipantProfileRepositoryAdapter', {
      skills,
    });

    const normalizedSkills = skills.map(skill => skill.toLowerCase());
    const matchingProfiles = Array.from(this.profiles.values()).filter(profile =>
      profile.skills.some(skill => 
        normalizedSkills.includes(skill.toLowerCase())
      )
    );

    this.logger.debug('Found profiles by skills', 'InMemoryParticipantProfileRepositoryAdapter', {
      skills,
      count: matchingProfiles.length,
    });

    return matchingProfiles;
  }

  async findBySector(sector: string): Promise<ParticipantProfile[]> {
    this.logger.debug('Finding profiles by sector', 'InMemoryParticipantProfileRepositoryAdapter', {
      sector,
    });

    const normalizedSector = sector.toLowerCase();
    const matchingProfiles = Array.from(this.profiles.values()).filter(profile =>
      profile.workExperience.some(exp => 
        exp.sector.toLowerCase().includes(normalizedSector)
      )
    );

    this.logger.debug('Found profiles by sector', 'InMemoryParticipantProfileRepositoryAdapter', {
      sector,
      count: matchingProfiles.length,
    });

    return matchingProfiles;
  }

  async findByExpertiseLevel(level: string): Promise<ParticipantProfile[]> {
    this.logger.debug('Finding profiles by expertise level', 'InMemoryParticipantProfileRepositoryAdapter', {
      level,
    });

    const matchingProfiles = Array.from(this.profiles.values()).filter(profile =>
      profile.expertiseLevel === level
    );

    this.logger.debug('Found profiles by expertise level', 'InMemoryParticipantProfileRepositoryAdapter', {
      level,
      count: matchingProfiles.length,
    });

    return matchingProfiles;
  }

  async delete(email: Email): Promise<void> {
    this.logger.debug('Deleting participant profile', 'InMemoryParticipantProfileRepositoryAdapter', {
      email: email.value,
    });

    const deleted = this.profiles.delete(email.value);

    this.logger.debug('Participant profile deletion completed', 'InMemoryParticipantProfileRepositoryAdapter', {
      email: email.value,
      deleted,
      remainingProfiles: this.profiles.size,
    });
  }

  async exists(email: Email): Promise<boolean> {
    const exists = this.profiles.has(email.value);

    this.logger.debug('Checking if profile exists', 'InMemoryParticipantProfileRepositoryAdapter', {
      email: email.value,
      exists,
    });

    return exists;
  }

  // ML-specific methods
  async getAllForMLTraining(): Promise<any[]> {
    this.logger.debug('Getting all profiles for ML training', 'InMemoryParticipantProfileRepositoryAdapter');

    const profiles = Array.from(this.profiles.values());
    const mlData = profiles.map(profile => ({
      ...profile.toJSON(),
      // Additional ML features
      skillsCount: profile.skills.length,
      totalExperienceYears: profile.workExperience.reduce((sum, exp) => sum + exp.yearsOfExperience, 0),
      projectsCount: profile.projects.length,
      languagesCount: profile.languages.length,
      sectorsWorked: [...new Set(profile.workExperience.map(exp => exp.sector))],
      technologiesUsed: [
        ...new Set([
          ...profile.workExperience.flatMap(exp => exp.technologies),
          ...profile.projects.flatMap(proj => proj.technologies),
        ])
      ],
    }));

    this.logger.debug('ML training data prepared', 'InMemoryParticipantProfileRepositoryAdapter', {
      profilesCount: profiles.length,
    });

    return mlData;
  }

  async findSimilarProfiles(email: Email, limit: number = 10): Promise<ParticipantProfile[]> {
    this.logger.debug('Finding similar profiles', 'InMemoryParticipantProfileRepositoryAdapter', {
      email: email.value,
      limit,
    });

    const targetProfile = this.profiles.get(email.value);
    if (!targetProfile) {
      return [];
    }

    const allProfiles = Array.from(this.profiles.values()).filter(p => !p.email.equals(email));
    
    // Simple similarity scoring based on skills and expertise
    const scoredProfiles = allProfiles.map(profile => ({
      profile,
      score: this.calculateSimilarityScore(targetProfile, profile),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.profile);

    this.logger.debug('Found similar profiles', 'InMemoryParticipantProfileRepositoryAdapter', {
      email: email.value,
      count: scoredProfiles.length,
    });

    return scoredProfiles;
  }

  private calculateSimilarityScore(profile1: ParticipantProfile, profile2: ParticipantProfile): number {
    let score = 0;

    // Skills similarity
    const commonSkills = profile1.skills.filter(skill => 
      profile2.skills.some(s => s.toLowerCase() === skill.toLowerCase())
    );
    score += commonSkills.length / Math.max(profile1.skills.length, profile2.skills.length);

    // Expertise level similarity
    const levelScores = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
    const levelDiff = Math.abs(levelScores[profile1.expertiseLevel] - levelScores[profile2.expertiseLevel]);
    score += (4 - levelDiff) / 4;

    // Sector similarity
    const profile1Sectors = new Set(profile1.workExperience.map(exp => exp.sector.toLowerCase()));
    const profile2Sectors = new Set(profile2.workExperience.map(exp => exp.sector.toLowerCase()));
    const commonSectors = [...profile1Sectors].filter(sector => profile2Sectors.has(sector));
    const totalSectors = new Set([...profile1Sectors, ...profile2Sectors]).size;
    if (totalSectors > 0) {
      score += commonSectors.length / totalSectors;
    }

    return score / 3; // Average of all similarity metrics
  }
}