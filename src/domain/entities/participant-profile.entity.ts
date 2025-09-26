import { Email } from '../value-objects/email.vo';

export interface WorkExperience {
  company: string;
  position: string;
  sector: string;
  yearsOfExperience: number;
  technologies?: string[];
  description?: string;
}

export interface Project {
  name: string;
  description: string;
  technologies: string[];
  role: string;
  duration?: string;
  url?: string;
}


export interface Preferences {
  teamSize: 'small' | 'medium' | 'large' | 'any';
  projectType?: string[];
  projectAreasOfInterest?: string[];
  prefersFemaleOnlyTeam?: boolean;
  communicationStyle: 'direct' | 'collaborative' | 'supportive' | 'analytical';
  workStyle: 'leader' | 'contributor' | 'specialist' | 'facilitator';
  interests: string[];
}

export interface GoogleSheetsData {
  timestamp?: string;
  phone?: string;
  cpf?: string;
  city?: string;
  birthDate?: string;
  participationMode?: string;
  howDidYouKnow?: string;
  areasOfInterest?: string;
}

export class ParticipantProfile {
  constructor(
    public readonly id: string,
    public readonly email: Email,
    public readonly fullName: string,
    public readonly phoneNumber: string,
    public readonly skills: string[],
    public readonly expertiseLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert',
    public readonly workExperience: WorkExperience[],
    public readonly education: string,
    public readonly age: number,
    public readonly projects: Project[],
    public readonly preferences: Preferences,
    public readonly languages: string[],
    public readonly githubProfile?: string,
    public readonly linkedinProfile?: string,
    public readonly portfolioUrl?: string,
    public readonly bio?: string,
    public readonly participationGoals?: string[],
    public readonly challengesInterests?: string[],
    public readonly gender?: 'masculine' | 'feminine' | 'non-binary' | 'prefer-not-to-say',
    public readonly preferFemaleTeam?: boolean,
    public readonly challengesOfInterest?: string[],
    public readonly interestAreas?: string[],
    public readonly googleSheetsData?: GoogleSheetsData,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date(),
  ) {}

  static create(data: {
    email: Email;
    fullName: string;
    phoneNumber: string;
    skills: string[];
    expertiseLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    workExperience: WorkExperience[];
    education: string;
    age: number;
    projects: Project[];
    preferences: Preferences;
    languages: string[];
    githubProfile?: string;
    linkedinProfile?: string;
    portfolioUrl?: string;
    bio?: string;
    participationGoals?: string[];
    challengesInterests?: string[];
    gender?: 'masculine' | 'feminine' | 'non-binary' | 'prefer-not-to-say';
    preferFemaleTeam?: boolean;
    challengesOfInterest?: string[];
    interestAreas?: string[];
    googleSheetsData?: GoogleSheetsData;
  }): ParticipantProfile {
    return new ParticipantProfile(
      data.email.value, // Using email as ID for simplicity
      data.email,
      data.fullName,
      data.phoneNumber,
      data.skills,
      data.expertiseLevel,
      data.workExperience,
      data.education,
      data.age,
      data.projects,
      data.preferences,
      data.languages,
      data.githubProfile,
      data.linkedinProfile,
      data.portfolioUrl,
      data.bio,
      data.participationGoals,
      data.challengesInterests,
      data.gender,
      data.preferFemaleTeam,
      data.challengesOfInterest,
      data.interestAreas,
      data.googleSheetsData,
    );
  }

  update(data: Partial<ParticipantProfile>): ParticipantProfile {
    return new ParticipantProfile(
      this.id,
      this.email,
      data.fullName ?? this.fullName,
      data.phoneNumber ?? this.phoneNumber,
      data.skills ?? this.skills,
      data.expertiseLevel ?? this.expertiseLevel,
      data.workExperience ?? this.workExperience,
      data.education ?? this.education,
      data.age ?? this.age,
      data.projects ?? this.projects,
      data.preferences ?? this.preferences,
      data.languages ?? this.languages,
      data.githubProfile ?? this.githubProfile,
      data.linkedinProfile ?? this.linkedinProfile,
      data.portfolioUrl ?? this.portfolioUrl,
      data.bio ?? this.bio,
      data.participationGoals ?? this.participationGoals,
      data.challengesInterests ?? this.challengesInterests,
      data.gender ?? this.gender,
      data.preferFemaleTeam ?? this.preferFemaleTeam,
      data.challengesOfInterest ?? this.challengesOfInterest,
      data.interestAreas ?? this.interestAreas,
      data.googleSheetsData ?? this.googleSheetsData,
      this.createdAt,
      new Date(),
    );
  }

  // Methods for ML feature extraction
  getSkillsVector(): Record<string, number> {
    const skillsMap: Record<string, number> = {};
    this.skills.forEach(skill => {
      skillsMap[skill.toLowerCase()] = 1;
    });
    return skillsMap;
  }

  getTechnologiesVector(): Record<string, number> {
    const techMap: Record<string, number> = {};
    
    // From work experience
    this.workExperience.forEach(exp => {
      if (exp.technologies) {
        exp.technologies.forEach(tech => {
          techMap[tech.toLowerCase()] = (techMap[tech.toLowerCase()] || 0) + exp.yearsOfExperience;
        });
      }
    });
    
    // From projects
    this.projects.forEach(project => {
      project.technologies.forEach(tech => {
        techMap[tech.toLowerCase()] = (techMap[tech.toLowerCase()] || 0) + 1;
      });
    });
    
    return techMap;
  }

  getExperienceScore(): number {
    const levelScores = {
      beginner: 1,
      intermediate: 2,
      advanced: 3,
      expert: 4,
    };
    
    const baseScore = levelScores[this.expertiseLevel];
    const workScore = this.workExperience.reduce((sum, exp) => sum + exp.yearsOfExperience, 0) / 10;
    const projectScore = this.projects.length / 5;
    
    return Math.min(baseScore + workScore + projectScore, 5);
  }

  getSectorExperience(): Record<string, number> {
    const sectorMap: Record<string, number> = {};
    
    this.workExperience.forEach(exp => {
      sectorMap[exp.sector.toLowerCase()] = 
        (sectorMap[exp.sector.toLowerCase()] || 0) + exp.yearsOfExperience;
    });
    
    return sectorMap;
  }

  toJSON() {
    return {
      id: this.id,
      email: this.email.value,
      fullName: this.fullName,
      phoneNumber: this.phoneNumber,
      skills: this.skills,
      expertiseLevel: this.expertiseLevel,
      workExperience: this.workExperience,
      education: this.education,
      projects: this.projects,
      preferences: this.preferences,
      languages: this.languages,
      githubProfile: this.githubProfile,
      linkedinProfile: this.linkedinProfile,
      portfolioUrl: this.portfolioUrl,
      bio: this.bio,
      participationGoals: this.participationGoals,
      challengesInterests: this.challengesInterests,
      gender: this.gender,
      preferFemaleTeam: this.preferFemaleTeam,
      challengesOfInterest: this.challengesOfInterest,
      interestAreas: this.interestAreas,
      googleSheetsData: this.googleSheetsData,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      // ML features
      mlFeatures: {
        skillsVector: this.getSkillsVector(),
        technologiesVector: this.getTechnologiesVector(),
        experienceScore: this.getExperienceScore(),
        sectorExperience: this.getSectorExperience(),
      },
    };
  }
}