import { Injectable, Inject } from '@nestjs/common';
import type { ParticipantProfileRepositoryPort } from '../application/ports/participant-profile-repository.port';
import type { UserRepositoryPort } from '../application/ports/user-repository.port';
import type { LoggerPort } from '../application/ports/logger.port';
import { ParticipantProfile } from '../domain/entities/participant-profile.entity';
import { Email } from '../domain/value-objects/email.vo';
import {
  PARTICIPANT_PROFILE_REPOSITORY_TOKEN,
  USER_REPOSITORY_TOKEN,
  LOGGER_TOKEN,
} from '../application/ports/tokens';

@Injectable()
export class ParticipantProfileService {
  constructor(
    @Inject(PARTICIPANT_PROFILE_REPOSITORY_TOKEN) 
    private readonly profileRepository: ParticipantProfileRepositoryPort,
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: UserRepositoryPort,
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

      // Auto-import user data from Google Sheets
      let enrichedProfileData = { ...profileData };
      try {
        const userData = await this.userRepository.findByEmail(email);
        console.log(userData)
        if (userData) {
          this.logger.info('Auto-importing user data from Google Sheets', 'ParticipantProfileService', {
            email: profileData.email,
            userId: userData.id,
          });

          // Merge Google Sheets data with provided profile data
          enrichedProfileData = this.mergeUserDataWithProfile(userData.toJSON(), profileData);
        } else {
          this.logger.warn('User not found in Google Sheets, proceeding without auto-import', 'ParticipantProfileService', {
            email: profileData.email,
          });
        }
      } catch (error) {
        this.logger.warn('Failed to auto-import user data from Google Sheets', 'ParticipantProfileService', {
          email: profileData.email,
          error: error.message,
        });
      }

      const profile = ParticipantProfile.create({
        email,
        fullName: enrichedProfileData.fullName,
        skills: enrichedProfileData.skills || [],
        expertiseLevel: enrichedProfileData.expertiseLevel || 'beginner',
        workExperience: enrichedProfileData.workExperience || [],
        education: enrichedProfileData.education || 'Not specified',
        projects: enrichedProfileData.projects || [],
        availability: enrichedProfileData.availability || {
          hoursPerWeek: 10,
          timezone: 'UTC',
          preferredWorkingHours: '',
          availableDates: []
        },
        preferences: enrichedProfileData.preferences || {
          teamSize: 'medium',
          projectType: [],
          communicationStyle: 'collaborative',
          workStyle: 'contributor',
          interests: []
        },
        languages: enrichedProfileData.languages || [],
        githubProfile: enrichedProfileData.githubProfile,
        linkedinProfile: enrichedProfileData.linkedinProfile,
        portfolioUrl: enrichedProfileData.portfolioUrl,
        bio: enrichedProfileData.bio,
        participationGoals: enrichedProfileData.participationGoals || [],
        challengesInterests: enrichedProfileData.challengesInterests || [],
      });

      await this.profileRepository.save(profile);

      this.logger.info('Participant profile created successfully', 'ParticipantProfileService', {
        email: profileData.email,
        profileId: profile.id,
        autoImported: true,
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

  private mergeUserDataWithProfile(userData: any, profileData: any): any {
    this.logger.debug('Merging Google Sheets user data with profile data', 'ParticipantProfileService', {
      email: profileData.email,
      userData: userData,
    });

    // Map Google Sheets column names to our profile structure
    // Priority: profileData > userData (user input takes precedence over Google Sheets data)
    const merged = {
      ...profileData,
      // Map full name from Google Sheets
      fullName: profileData.fullName || userData['Nome e Sobrenome:'] || userData.fullName || 'Unknown',
      
      // Map education from Google Sheets
      education: profileData.education || userData['Escolaridade:'] || userData.education || 'Não especificado',
      
      // Extract skills and interests from Google Sheets areas de interesse
      skills: profileData.skills || this.extractSkillsFromGoogleSheetsData(userData),
      
      // Map expertise level based on education level
      expertiseLevel: profileData.expertiseLevel || this.mapExpertiseLevelFromEducation(userData['Escolaridade:'] || ''),
      
      // Extract work experience (will be empty for now, but can be filled later)
      workExperience: profileData.workExperience || [],
      
      // Map languages (default to Portuguese for Brazilian users)
      languages: profileData.languages || ['Português'],
      
      // Extract interests from areas de interesse
      challengesInterests: profileData.challengesInterests || this.extractInterestsFromGoogleSheets(userData),
      
      // Extract participation goals from hackathon info
      participationGoals: profileData.participationGoals || this.extractParticipationMode(userData),
      
      // Add Google Sheets specific data
      googleSheetsData: {
        timestamp: userData['Carimbo de data/hora:'] || userData['Carimbo de data/hora'],
        phone: userData['Telefone de Contato:'] || userData.phone,
        cpf: userData['CPF:'] || userData.cpf,
        city: userData['Cidade onde reside:'] || userData.city,
        birthDate: userData['Data de Nascimento '] || userData['Data de Nascimento:'] || userData.birthDate,
        participationMode: userData['Gostaria de fazer o hackathon Presencialmente ou Remotamente?'] || userData.participationMode,
        howDidYouKnow: userData['Como você ficou sabendo do Hackathon?'] || userData.howDidYouKnow,
        areasOfInterest: userData['Áreas de interesse'] || userData.areasOfInterest,
      },
    };

    this.logger.debug('Successfully merged user data', 'ParticipantProfileService', {
      email: profileData.email,
      extractedFullName: merged.fullName,
      extractedEducation: merged.education,
      extractedSkills: merged.skills,
      extractedInterests: merged.challengesInterests,
      fieldsFromGoogleSheets: Object.keys(merged.googleSheetsData).filter(key => merged.googleSheetsData[key]),
    });

    return merged;
  }

  private extractSkillsFromUserData(userData: any): string[] {
    const skills: string[] = [];
    
    // Check various fields that might contain skills
    const skillFields = [
      'skills', 'technicalSkills', 'technologies', 'expertise', 
      'programming', 'languages', 'frameworks', 'tools'
    ];

    for (const field of skillFields) {
      if (userData[field]) {
        if (Array.isArray(userData[field])) {
          skills.push(...userData[field]);
        } else if (typeof userData[field] === 'string') {
          // Split by common delimiters
          skills.push(...userData[field].split(/[,;|]/g).map(s => s.trim()).filter(s => s.length > 0));
        }
      }
    }

    return [...new Set(skills)]; // Remove duplicates
  }

  private mapExpertiseLevel(userData: any): string {
    const level = (userData.experience || userData.level || userData.expertiseLevel || '').toLowerCase();
    
    if (level.includes('expert') || level.includes('senior') || level.includes('lead')) return 'expert';
    if (level.includes('advanced') || level.includes('professional')) return 'advanced';
    if (level.includes('intermediate') || level.includes('mid')) return 'intermediate';
    
    return 'beginner';
  }

  private extractWorkExperience(userData: any): any[] {
    const experience: any[] = [];
    
    // Check if there's structured work experience data
    if (userData.workExperience && Array.isArray(userData.workExperience)) {
      return userData.workExperience.map(exp => ({
        company: exp.company || 'Unknown',
        position: exp.position || exp.title || exp.role || 'Unknown',
        sector: exp.sector || exp.industry || 'Technology',
        yearsOfExperience: exp.years || exp.yearsOfExperience || 1,
        technologies: exp.technologies || exp.skills || [],
        description: exp.description || '',
      }));
    }

    // Try to extract from individual fields
    if (userData.company || userData.currentJob || userData.employer) {
      experience.push({
        company: userData.company || userData.currentJob || userData.employer,
        position: userData.position || userData.jobTitle || userData.role || 'Unknown',
        sector: userData.industry || userData.sector || 'Technology',
        yearsOfExperience: parseInt(userData.experience) || 1,
        technologies: this.extractSkillsFromUserData(userData),
        description: userData.jobDescription || '',
      });
    }

    return experience;
  }

  private extractLanguages(userData: any): string[] {
    const languages: string[] = [];
    
    if (userData.languages) {
      if (Array.isArray(userData.languages)) {
        languages.push(...userData.languages);
      } else if (typeof userData.languages === 'string') {
        languages.push(...userData.languages.split(/[,;|]/g).map(l => l.trim()).filter(l => l.length > 0));
      }
    }

    if (userData.spokenLanguages) {
      if (Array.isArray(userData.spokenLanguages)) {
        languages.push(...userData.spokenLanguages);
      } else if (typeof userData.spokenLanguages === 'string') {
        languages.push(...userData.spokenLanguages.split(/[,;|]/g).map(l => l.trim()).filter(l => l.length > 0));
      }
    }

    return [...new Set(languages)];
  }

  private extractChallengesInterests(userData: any): string[] {
    const interests: string[] = [];
    
    const interestFields = [
      'interests', 'challengeInterests', 'challenges', 'categories', 
      'preferredChallenges', 'domains', 'areas'
    ];

    for (const field of interestFields) {
      if (userData[field]) {
        if (Array.isArray(userData[field])) {
          interests.push(...userData[field]);
        } else if (typeof userData[field] === 'string') {
          interests.push(...userData[field].split(/[,;|]/g).map(i => i.trim()).filter(i => i.length > 0));
        }
      }
    }

    return [...new Set(interests)];
  }

  private extractParticipationGoals(userData: any): string[] {
    const goals: string[] = [];
    
    const goalFields = [
      'goals', 'participationGoals', 'objectives', 'motivation', 
      'expectations', 'whatDoYouHope', 'whyParticipate'
    ];

    for (const field of goalFields) {
      if (userData[field]) {
        if (Array.isArray(userData[field])) {
          goals.push(...userData[field]);
        } else if (typeof userData[field] === 'string') {
          goals.push(...userData[field].split(/[,;|]/g).map(g => g.trim()).filter(g => g.length > 0));
        }
      }
    }

    return [...new Set(goals)];
  }

  // New methods for Google Sheets specific data extraction
  private extractSkillsFromGoogleSheetsData(userData: any): string[] {
    const skills: string[] = [];
    
    // Extract skills from "Áreas de interesse" field
    const areasDeInteresse = userData['Áreas de interesse'] || userData.areasOfInterest || '';
    
    if (areasDeInteresse) {
      // Split by commas and extract technical skills
      const interests = areasDeInteresse.split(',').map(s => s.trim());
      
      // Map interests to technical skills
      for (const interest of interests) {
        const lowerInterest = interest.toLowerCase();
        
        if (lowerInterest.includes('programação') || lowerInterest.includes('tecnologia')) {
          skills.push('JavaScript', 'Python', 'Programação');
        }
        if (lowerInterest.includes('engenharia')) {
          skills.push('Engenharia', 'Análise Técnica');
        }
        if (lowerInterest.includes('educação')) {
          skills.push('Educação', 'Treinamento');
        }
        if (lowerInterest.includes('pesquisa')) {
          skills.push('Pesquisa', 'Análise de Dados');
        }
        if (lowerInterest.includes('social') || lowerInterest.includes('impacto')) {
          skills.push('Impacto Social', 'Gestão de Projetos');
        }
        // Add the original interest as a skill too
        skills.push(interest);
      }
    }
    
    return skills.length > 0 ? [...new Set(skills)] : ['Habilidades Gerais'];
  }

  private mapExpertiseLevelFromEducation(education: string): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
    if (!education) return 'beginner';
    
    const edu = education.toLowerCase();
    
    if (edu.includes('doutorado') || edu.includes('phd')) return 'expert';
    if (edu.includes('mestrado') || edu.includes('master')) return 'advanced';
    if (edu.includes('graduado') || edu.includes('superior completo')) return 'advanced';
    if (edu.includes('graduando') || edu.includes('superior')) return 'intermediate';
    if (edu.includes('técnico') || edu.includes('tecnólogo')) return 'intermediate';
    
    return 'beginner';
  }

  private extractInterestsFromGoogleSheets(userData: any): string[] {
    const interests: string[] = [];
    
    const areasDeInteresse = userData['Áreas de interesse'] || userData.areasOfInterest || '';
    
    if (areasDeInteresse) {
      interests.push(...areasDeInteresse.split(',').map(s => s.trim()));
    }
    
    return interests.length > 0 ? interests : ['Interesse Geral'];
  }

  private extractParticipationMode(userData: any): string[] {
    const goals: string[] = [];
    
    const participationMode = userData['Gostaria de fazer o hackathon Presencialmente ou Remotamente?'] || userData.participationMode || '';
    const howDidYouKnow = userData['Como você ficou sabendo do Hackathon?'] || userData.howDidYouKnow || '';
    
    if (participationMode.includes('Presencialmente')) {
      goals.push('Networking Presencial', 'Colaboração em Equipe');
    } else if (participationMode.includes('Remotamente')) {
      goals.push('Trabalho Remoto', 'Flexibilidade');
    }
    
    if (howDidYouKnow) {
      goals.push('Aprendizado', 'Inovação');
    }
    
    return goals.length > 0 ? goals : ['Participação Ativa'];
  }
}