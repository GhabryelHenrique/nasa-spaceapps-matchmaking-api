import { Injectable, Inject } from '@nestjs/common';
import type { ParticipantProfileRepositoryPort } from '../application/ports/participant-profile-repository.port';
import type { LoggerPort } from '../application/ports/logger.port';
import { ParticipantProfile } from '../domain/entities/participant-profile.entity';
import { Email } from '../domain/value-objects/email.vo';
import {
  PARTICIPANT_PROFILE_REPOSITORY_TOKEN,
  LOGGER_TOKEN,
} from '../application/ports/tokens';

@Injectable()
export class ParticipantProfileService {
  constructor(
    @Inject(PARTICIPANT_PROFILE_REPOSITORY_TOKEN) 
    private readonly profileRepository: ParticipantProfileRepositoryPort,
    @Inject(LOGGER_TOKEN) private readonly logger: LoggerPort,
  ) {}

  async createProfile(profileData: any): Promise<ParticipantProfile> {
    this.logger.info('Creating participant profile', 'ParticipantProfileService', {
      email: profileData.email,
    });

    try {
      const email = new Email(profileData.email);
      
      // Check if profile already exists
      const existingProfile = await this.profileRepository.findByEmail(email);
      if (existingProfile) {
        throw new Error('Profile already exists for this email');
      }

      const profile = ParticipantProfile.create({
        email,
        fullName: profileData.fullName,
        skills: profileData.skills,
        expertiseLevel: profileData.expertiseLevel,
        workExperience: profileData.workExperience,
        education: profileData.education,
        projects: profileData.projects,
        availability: profileData.availability,
        preferences: profileData.preferences,
        languages: profileData.languages,
        githubProfile: profileData.githubProfile,
        linkedinProfile: profileData.linkedinProfile,
        portfolioUrl: profileData.portfolioUrl,
        bio: profileData.bio,
        participationGoals: profileData.participationGoals,
        challengesInterests: profileData.challengesInterests,
      });

      await this.profileRepository.save(profile);

      this.logger.info('Participant profile created successfully', 'ParticipantProfileService', {
        email: profileData.email,
        profileId: profile.id,
      });

      return profile;
    } catch (error) {
      this.logger.error('Error creating participant profile', error, 'ParticipantProfileService', {
        email: profileData.email,
      });
      throw error;
    }
  }

  async updateProfile(email: string, updateData: any): Promise<ParticipantProfile> {
    this.logger.info('Updating participant profile', 'ParticipantProfileService', { email });

    try {
      const emailVo = new Email(email);
      const existingProfile = await this.profileRepository.findByEmail(emailVo);

      if (!existingProfile) {
        throw new Error('Profile not found');
      }

      const updatedProfile = existingProfile.update(updateData);
      await this.profileRepository.save(updatedProfile);

      this.logger.info('Participant profile updated successfully', 'ParticipantProfileService', {
        email,
        profileId: updatedProfile.id,
      });

      return updatedProfile;
    } catch (error) {
      this.logger.error('Error updating participant profile', error, 'ParticipantProfileService', {
        email,
      });
      throw error;
    }
  }

  async getProfile(email: string): Promise<ParticipantProfile | null> {
    this.logger.info('Getting participant profile', 'ParticipantProfileService', { email });

    try {
      const emailVo = new Email(email);
      const profile = await this.profileRepository.findByEmail(emailVo);

      if (profile) {
        this.logger.info('Participant profile found', 'ParticipantProfileService', {
          email,
          profileId: profile.id,
        });
      } else {
        this.logger.warn('Participant profile not found', 'ParticipantProfileService', { email });
      }

      return profile;
    } catch (error) {
      this.logger.error('Error getting participant profile', error, 'ParticipantProfileService', {
        email,
      });
      throw error;
    }
  }

  async getAllProfiles(): Promise<ParticipantProfile[]> {
    this.logger.info('Getting all participant profiles', 'ParticipantProfileService');

    try {
      const profiles = await this.profileRepository.findAll();
      
      this.logger.info('Retrieved all participant profiles', 'ParticipantProfileService', {
        count: profiles.length,
      });

      return profiles;
    } catch (error) {
      this.logger.error('Error getting all participant profiles', error, 'ParticipantProfileService');
      throw error;
    }
  }

  async findProfilesBySkills(skills: string[]): Promise<ParticipantProfile[]> {
    this.logger.info('Finding profiles by skills', 'ParticipantProfileService', { skills });

    try {
      const profiles = await this.profileRepository.findBySkills(skills);
      
      this.logger.info('Found profiles by skills', 'ParticipantProfileService', {
        skills,
        count: profiles.length,
      });

      return profiles;
    } catch (error) {
      this.logger.error('Error finding profiles by skills', error, 'ParticipantProfileService', {
        skills,
      });
      throw error;
    }
  }

  async deleteProfile(email: string): Promise<void> {
    this.logger.info('Deleting participant profile', 'ParticipantProfileService', { email });

    try {
      const emailVo = new Email(email);
      await this.profileRepository.delete(emailVo);

      this.logger.info('Participant profile deleted successfully', 'ParticipantProfileService', {
        email,
      });
    } catch (error) {
      this.logger.error('Error deleting participant profile', error, 'ParticipantProfileService', {
        email,
      });
      throw error;
    }
  }

  async profileExists(email: string): Promise<boolean> {
    try {
      const emailVo = new Email(email);
      return await this.profileRepository.exists(emailVo);
    } catch (error) {
      this.logger.error('Error checking if profile exists', error, 'ParticipantProfileService', {
        email,
      });
      throw error;
    }
  }

  // ML-specific methods
  async getMLTrainingData(): Promise<any[]> {
    this.logger.info('Getting ML training data', 'ParticipantProfileService');

    try {
      const data = await this.profileRepository.getAllForMLTraining();
      
      this.logger.info('Retrieved ML training data', 'ParticipantProfileService', {
        recordCount: data.length,
      });

      return data;
    } catch (error) {
      this.logger.error('Error getting ML training data', error, 'ParticipantProfileService');
      throw error;
    }
  }

  async findSimilarProfiles(email: string, limit: number = 10): Promise<ParticipantProfile[]> {
    this.logger.info('Finding similar profiles', 'ParticipantProfileService', { email, limit });

    try {
      const emailVo = new Email(email);
      const profiles = await this.profileRepository.findSimilarProfiles(emailVo, limit);
      
      this.logger.info('Found similar profiles', 'ParticipantProfileService', {
        email,
        count: profiles.length,
      });

      return profiles;
    } catch (error) {
      this.logger.error('Error finding similar profiles', error, 'ParticipantProfileService', {
        email,
      });
      throw error;
    }
  }
}