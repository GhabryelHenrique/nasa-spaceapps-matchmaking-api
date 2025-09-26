import { Injectable, Inject } from '@nestjs/common';
import { NasaApiService } from './nasa-api.service';
import { ParticipantProfileService } from './participant-profile.service';
import type { LoggerPort } from '../application/ports/logger.port';
import { LOGGER_TOKEN } from '../application/ports/tokens';
import { CreateParticipantProfileDto } from '../dtos/matchmaking.dto';

@Injectable()
export class NasaSyncService {
  constructor(
    private readonly nasaApiService: NasaApiService,
    private readonly participantProfileService: ParticipantProfileService,
    @Inject(LOGGER_TOKEN) private readonly logger: LoggerPort,
  ) {}

  async syncParticipantsFromNasa(): Promise<{ synced: number; errors: number }> {
    this.logger.info('Starting NASA participants sync', 'NasaSyncService');
    
    let synced = 0;
    let errors = 0;

    try {
      const participants = await this.nasaApiService.fetchParticipants(500);
      
      for (const participant of participants) {
        try {
          if (!participant.email) {
            this.logger.warn('Skipping participant without email', 'NasaSyncService', {
              participantId: participant.id,
            });
            continue;
          }

          const profileData = this.transformNasaParticipantToProfile(participant);
          
          // Check if profile already exists
          const existingProfile = await this.participantProfileService.getProfile(participant.email);
          
          if (existingProfile) {
            // Update existing profile
            await this.participantProfileService.updateProfile(participant.email, profileData);
            this.logger.info('Updated existing profile', 'NasaSyncService', {
              email: participant.email,
            });
          } else {
            // Create new profile
            await this.participantProfileService.createProfile(profileData);
            this.logger.info('Created new profile', 'NasaSyncService', {
              email: participant.email,
            });
          }
          
          synced++;
        } catch (error) {
          this.logger.error('Failed to sync participant', error, 'NasaSyncService', {
            participantId: participant.id,
            email: participant.email,
          });
          errors++;
        }
      }
      
      this.logger.info('NASA participants sync completed', 'NasaSyncService', {
        synced,
        errors,
        total: participants.length,
      });
      
      return { synced, errors };
    } catch (error) {
      this.logger.error('NASA participants sync failed', error, 'NasaSyncService');
      throw error;
    }
  }

  private transformNasaParticipantToProfile(participant: any): CreateParticipantProfileDto {
    // Parse skills from string or array
    const skills = this.parseSkills(participant.skills);
    
    // Determine expertise level based on available data
    const expertiseLevel = this.determineExpertiseLevel(participant);
    
    // Parse interests and challenges
    const interests = this.parseInterests(participant.interests);
    
    // Extract team information
    const teams = participant.teams?.edges?.map((edge: any) => edge.node) || [];
    const challengesOfInterest = teams.map((team: any) => team.challenge?.title).filter(Boolean);

    return {
      email: participant.email,
      fullName: `${participant.firstName || ''} ${participant.lastName || ''}`.trim(),
      phoneNumber: participant.phone || '+5511999999999', // Default phone number for NASA participants
      skills,
      expertiseLevel,
      education: participant.bio ? this.extractEducationFromBio(participant.bio) : '',
      age: 25, // Default age, could be enhanced with actual data parsing
      bio: participant.bio || '',
      workExperience: this.extractWorkExperienceFromBio(participant.bio),
      preferences: {
        teamSize: 'medium',
        communicationStyle: 'collaborative',
        workStyle: 'contributor',
        projectType: challengesOfInterest,
        interests,
      },
      languages: ['English'], // Default to English, could be enhanced
      githubProfile: participant.githubUrl || '',
      linkedinProfile: participant.linkedinUrl || '',
      portfolioUrl: participant.portfolioUrl || '',
      participationGoals: this.extractGoalsFromBio(participant.bio),
      challengesInterests: challengesOfInterest,
      gender: undefined,
      preferFemaleTeam: false,
      interestAreas: interests,
      projects: [], // Default to empty projects array
    };
  }

  private parseSkills(skillsData: any): string[] {
    if (!skillsData) return [];
    
    if (Array.isArray(skillsData)) {
      return skillsData;
    }
    
    if (typeof skillsData === 'string') {
      return skillsData.split(/[,;]/).map(s => s.trim()).filter(s => s.length > 0);
    }
    
    return [];
  }

  private determineExpertiseLevel(participant: any): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
    const skills = this.parseSkills(participant.skills);
    const bio = participant.bio || '';
    const hasGithub = !!participant.githubUrl;
    const hasLinkedIn = !!participant.linkedinUrl;
    const hasPortfolio = !!participant.portfolioUrl;
    
    // Simple heuristic based on available data
    if (skills.length >= 8 && (hasGithub || hasPortfolio) && bio.length > 200) {
      return 'expert';
    } else if (skills.length >= 5 && (hasGithub || hasLinkedIn) && bio.length > 100) {
      return 'advanced';
    } else if (skills.length >= 3 && bio.length > 50) {
      return 'intermediate';
    }
    
    return 'beginner';
  }

  private parseInterests(interestsData: any): string[] {
    if (!interestsData) return [];
    
    if (Array.isArray(interestsData)) {
      return interestsData;
    }
    
    if (typeof interestsData === 'string') {
      return interestsData.split(/[,;]/).map(s => s.trim()).filter(s => s.length > 0);
    }
    
    return [];
  }

  private extractEducationFromBio(bio: string = ''): string {
    // Look for education keywords in bio
    const educationKeywords = ['university', 'college', 'degree', 'phd', 'masters', 'bachelor', 'graduate'];
    const lines = bio.split('\n');
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (educationKeywords.some(keyword => lowerLine.includes(keyword))) {
        return line.trim();
      }
    }
    
    return '';
  }

  private extractWorkExperienceFromBio(bio: string = ''): any[] {
    if (!bio) return [];
    
    // Simple extraction - look for job titles or company names
    const workKeywords = ['engineer', 'developer', 'manager', 'scientist', 'researcher', 'analyst', 'consultant'];
    const lines = bio.split('\n');
    const experience: any[] = [];
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (workKeywords.some(keyword => lowerLine.includes(keyword))) {
        experience.push({
          jobTitle: line.trim(),
          company: '',
          duration: '',
          description: line.trim(),
        });
      }
    }
    
    return experience.slice(0, 3); // Limit to 3 entries
  }

  private extractGoalsFromBio(bio: string = ''): string[] {
    if (!bio) return ['Learn new skills', 'Network with professionals'];
    
    const goalKeywords = ['goal', 'aim', 'objective', 'want to', 'hope to', 'looking to'];
    const lines = bio.split('\n');
    const goals: string[] = [];
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (goalKeywords.some(keyword => lowerLine.includes(keyword))) {
        goals.push(line.trim());
      }
    }
    
    return goals.length > 0 ? goals : ['Participate in NASA Space Apps Challenge', 'Collaborate on space-related projects'];
  }

  private formatLocation(city?: string, region?: string, country?: string): string {
    const parts = [city, region, country].filter(Boolean);
    return parts.join(', ');
  }

  async getParticipantStats(): Promise<{
    totalNasaParticipants: number;
    totalLocalProfiles: number;
    lastSyncDate?: Date;
  }> {
    try {
      const [nasaParticipants, localProfiles] = await Promise.all([
        this.nasaApiService.fetchParticipants(1), // Just get count
        this.participantProfileService.getAllProfiles(),
      ]);

      return {
        totalNasaParticipants: nasaParticipants.length,
        totalLocalProfiles: localProfiles.length,
      };
    } catch (error) {
      this.logger.error('Failed to get participant stats', error, 'NasaSyncService');
      throw error;
    }
  }
}