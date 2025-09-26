import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { ParticipantProfileRepositoryPort } from '../../application/ports/participant-profile-repository.port';
import type { LoggerPort } from '../../application/ports/logger.port';
import { ParticipantProfile } from '../../domain/entities/participant-profile.entity';
import { Email } from '../../domain/value-objects/email.vo';
import { ParticipantProfileDocument } from '../schemas/participant-profile.schema';
import { LOGGER_TOKEN } from '../../application/ports/tokens';

@Injectable()
export class MongoDBParticipantProfileRepositoryAdapter implements ParticipantProfileRepositoryPort {
  constructor(
    @InjectModel(ParticipantProfileDocument.name)
    private readonly profileModel: Model<ParticipantProfileDocument>,
    @Inject(LOGGER_TOKEN) private readonly logger: LoggerPort,
  ) {
    this.logger.info('MongoDB participant profile repository initialized', 'MongoDBParticipantProfileRepositoryAdapter');
  }

  async save(profile: ParticipantProfile): Promise<void> {
    this.logger.debug('Saving participant profile to MongoDB', 'MongoDBParticipantProfileRepositoryAdapter', {
      email: profile.email.value,
      profileId: profile.id,
    });

    try {
      const profileData = this.toMongoDocument(profile);
      
      await this.profileModel.findOneAndUpdate(
        { email: profile.email.value },
        profileData,
        { upsert: true, new: true }
      );

      this.logger.debug('Participant profile saved to MongoDB', 'MongoDBParticipantProfileRepositoryAdapter', {
        email: profile.email.value,
        profileId: profile.id,
      });
    } catch (error) {
      this.logger.error('Error saving participant profile to MongoDB', error, 'MongoDBParticipantProfileRepositoryAdapter', {
        email: profile.email.value,
        profileId: profile.id,
      });
      throw error;
    }
  }

  async findByEmail(email: Email): Promise<ParticipantProfile | null> {
    this.logger.debug('Finding participant profile by email in MongoDB', 'MongoDBParticipantProfileRepositoryAdapter', {
      email: email.value,
    });

    try {
      const document = await this.profileModel.findOne({ email: email.value }).exec();
      
      if (!document) {
        this.logger.debug('Participant profile not found in MongoDB', 'MongoDBParticipantProfileRepositoryAdapter', {
          email: email.value,
        });
        return null;
      }

      const profile = this.toDomainEntity(document);
      
      this.logger.debug('Participant profile found in MongoDB', 'MongoDBParticipantProfileRepositoryAdapter', {
        email: email.value,
        profileId: profile.id,
      });

      return profile;
    } catch (error) {
      this.logger.error('Error finding participant profile by email in MongoDB', error, 'MongoDBParticipantProfileRepositoryAdapter', {
        email: email.value,
      });
      throw error;
    }
  }

  async findAll(): Promise<ParticipantProfile[]> {
    this.logger.debug('Finding all participant profiles in MongoDB', 'MongoDBParticipantProfileRepositoryAdapter');

    try {
      const documents = await this.profileModel.find().exec();
      const profiles = documents.map(doc => this.toDomainEntity(doc));

      this.logger.debug('Found all participant profiles in MongoDB', 'MongoDBParticipantProfileRepositoryAdapter', {
        count: profiles.length,
      });

      return profiles;
    } catch (error) {
      this.logger.error('Error finding all participant profiles in MongoDB', error, 'MongoDBParticipantProfileRepositoryAdapter');
      throw error;
    }
  }

  async findBySkills(skills: string[]): Promise<ParticipantProfile[]> {
    this.logger.debug('Finding profiles by skills in MongoDB', 'MongoDBParticipantProfileRepositoryAdapter', {
      skills,
    });

    try {
      const documents = await this.profileModel.find({
        skills: { $in: skills.map(skill => new RegExp(skill, 'i')) }
      }).exec();

      const profiles = documents.map(doc => this.toDomainEntity(doc));

      this.logger.debug('Found profiles by skills in MongoDB', 'MongoDBParticipantProfileRepositoryAdapter', {
        skills,
        count: profiles.length,
      });

      return profiles;
    } catch (error) {
      this.logger.error('Error finding profiles by skills in MongoDB', error, 'MongoDBParticipantProfileRepositoryAdapter', {
        skills,
      });
      throw error;
    }
  }

  async findBySector(sector: string): Promise<ParticipantProfile[]> {
    this.logger.debug('Finding profiles by sector in MongoDB', 'MongoDBParticipantProfileRepositoryAdapter', {
      sector,
    });

    try {
      const documents = await this.profileModel.find({
        'workExperience.sector': new RegExp(sector, 'i')
      }).exec();

      const profiles = documents.map(doc => this.toDomainEntity(doc));

      this.logger.debug('Found profiles by sector in MongoDB', 'MongoDBParticipantProfileRepositoryAdapter', {
        sector,
        count: profiles.length,
      });

      return profiles;
    } catch (error) {
      this.logger.error('Error finding profiles by sector in MongoDB', error, 'MongoDBParticipantProfileRepositoryAdapter', {
        sector,
      });
      throw error;
    }
  }

  async findByExpertiseLevel(level: string): Promise<ParticipantProfile[]> {
    this.logger.debug('Finding profiles by expertise level in MongoDB', 'MongoDBParticipantProfileRepositoryAdapter', {
      level,
    });

    try {
      const documents = await this.profileModel.find({ expertiseLevel: level }).exec();
      const profiles = documents.map(doc => this.toDomainEntity(doc));

      this.logger.debug('Found profiles by expertise level in MongoDB', 'MongoDBParticipantProfileRepositoryAdapter', {
        level,
        count: profiles.length,
      });

      return profiles;
    } catch (error) {
      this.logger.error('Error finding profiles by expertise level in MongoDB', error, 'MongoDBParticipantProfileRepositoryAdapter', {
        level,
      });
      throw error;
    }
  }

  async delete(email: Email): Promise<void> {
    this.logger.debug('Deleting participant profile from MongoDB', 'MongoDBParticipantProfileRepositoryAdapter', {
      email: email.value,
    });

    try {
      const result = await this.profileModel.deleteOne({ email: email.value }).exec();

      this.logger.debug('Participant profile deletion completed', 'MongoDBParticipantProfileRepositoryAdapter', {
        email: email.value,
        deleted: result.deletedCount > 0,
      });
    } catch (error) {
      this.logger.error('Error deleting participant profile from MongoDB', error, 'MongoDBParticipantProfileRepositoryAdapter', {
        email: email.value,
      });
      throw error;
    }
  }

  async exists(email: Email): Promise<boolean> {
    this.logger.debug('Checking if profile exists in MongoDB', 'MongoDBParticipantProfileRepositoryAdapter', {
      email: email.value,
    });

    try {
      const count = await this.profileModel.countDocuments({ email: email.value }).exec();
      const exists = count > 0;

      this.logger.debug('Profile existence check completed', 'MongoDBParticipantProfileRepositoryAdapter', {
        email: email.value,
        exists,
      });

      return exists;
    } catch (error) {
      this.logger.error('Error checking if profile exists in MongoDB', error, 'MongoDBParticipantProfileRepositoryAdapter', {
        email: email.value,
      });
      throw error;
    }
  }

  async getAllForMLTraining(): Promise<any[]> {
    this.logger.debug('Getting all profiles for ML training from MongoDB', 'MongoDBParticipantProfileRepositoryAdapter');

    try {
      const documents = await this.profileModel.find({ isComplete: true }).exec();
      const profiles = documents.map(doc => this.toDomainEntity(doc));
      
      const mlData = profiles.map(profile => ({
        ...profile.toJSON(),
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

      this.logger.debug('ML training data prepared from MongoDB', 'MongoDBParticipantProfileRepositoryAdapter', {
        profilesCount: profiles.length,
      });

      return mlData;
    } catch (error) {
      this.logger.error('Error getting ML training data from MongoDB', error, 'MongoDBParticipantProfileRepositoryAdapter');
      throw error;
    }
  }

  async findSimilarProfiles(email: Email, limit: number = 10): Promise<ParticipantProfile[]> {
    this.logger.debug('Finding similar profiles in MongoDB', 'MongoDBParticipantProfileRepositoryAdapter', {
      email: email.value,
      limit,
    });

    try {
      const targetProfile = await this.findByEmail(email);
      if (!targetProfile) {
        return [];
      }

      const documents = await this.profileModel.find({
        email: { $ne: email.value },
        $or: [
          { skills: { $in: targetProfile.skills } },
          { expertiseLevel: targetProfile.expertiseLevel },
          { 'workExperience.sector': { $in: targetProfile.workExperience.map(exp => exp.sector) } },
        ]
      }).limit(limit * 2).exec(); // Get more than needed for scoring

      const profiles = documents.map(doc => this.toDomainEntity(doc));
      
      const scoredProfiles = profiles.map(profile => ({
        profile,
        score: this.calculateSimilarityScore(targetProfile, profile),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.profile);

      this.logger.debug('Found similar profiles in MongoDB', 'MongoDBParticipantProfileRepositoryAdapter', {
        email: email.value,
        count: scoredProfiles.length,
      });

      return scoredProfiles;
    } catch (error) {
      this.logger.error('Error finding similar profiles in MongoDB', error, 'MongoDBParticipantProfileRepositoryAdapter', {
        email: email.value,
      });
      throw error;
    }
  }

  private toMongoDocument(profile: ParticipantProfile): Partial<ParticipantProfileDocument> {
    const profileJson = profile.toJSON();
    return {
      email: profile.email.value,
      fullName: profileJson.fullName,
      skills: profileJson.skills,
      expertiseLevel: profileJson.expertiseLevel,
      workExperience: profileJson.workExperience,
      education: profileJson.education,
      projects: profileJson.projects,
      preferences: profileJson.preferences,
      languages: profileJson.languages,
      githubProfile: profileJson.githubProfile,
      linkedinProfile: profileJson.linkedinProfile,
      portfolioUrl: profileJson.portfolioUrl,
      bio: profileJson.bio,
      participationGoals: profileJson.participationGoals,
      challengesInterests: profileJson.challengesInterests,
      googleSheetsData: profileJson.googleSheetsData,
      isComplete: false,
      updatedAt: new Date(),
    };
  }

  private toDomainEntity(document: ParticipantProfileDocument): ParticipantProfile {
    return ParticipantProfile.create({
      email: new Email(document.email),
      fullName: document.fullName,
      phoneNumber: document.phoneNumber,
      skills: document.skills,
      expertiseLevel: document.expertiseLevel as 'beginner' | 'intermediate' | 'advanced' | 'expert',
      workExperience: document.workExperience.map(exp => ({
        company: exp.company,
        position: exp.position,
        sector: exp.sector,
        yearsOfExperience: exp.yearsOfExperience,
        technologies: exp.technologies,
        description: exp.description,
      })),
      education: document.education || 'Not specified',
      age: document.age || 25,
      projects: document.projects.map(proj => ({
        name: proj.name,
        description: proj.description,
        technologies: proj.technologies,
        role: proj.role,
        duration: proj.duration,
        url: proj.url,
      })),
      preferences: {
        teamSize: document.preferences.teamSize as 'small' | 'medium' | 'large' | 'any',
        projectType: document.preferences.projectType,
        communicationStyle: document.preferences.communicationStyle as 'direct' | 'collaborative' | 'supportive' | 'analytical',
        workStyle: document.preferences.workStyle as 'leader' | 'contributor' | 'specialist' | 'facilitator',
        interests: document.preferences.interests,
      },
      languages: document.languages,
      githubProfile: document.githubProfile,
      linkedinProfile: document.linkedinProfile,
      portfolioUrl: document.portfolioUrl,
      bio: document.bio,
      participationGoals: document.participationGoals,
      challengesInterests: document.challengesInterests,
      googleSheetsData: document.googleSheetsData,
    });
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