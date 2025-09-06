import { 
  IsEmail, 
  IsNotEmpty, 
  IsString, 
  IsArray, 
  IsEnum, 
  IsOptional, 
  IsNumber, 
  IsUrl, 
  ValidateNested, 
  ArrayMinSize,
  Min,
  Max,
  IsBoolean
} from 'class-validator';
import { Type } from 'class-transformer';

export class WorkExperienceDto {
  @IsNotEmpty()
  @IsString()
  company: string;

  @IsNotEmpty()
  @IsString()
  position: string;

  @IsNotEmpty()
  @IsString()
  sector: string;

  @IsNumber()
  @Min(0)
  @Max(50)
  yearsOfExperience: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  technologies?: string[];

  @IsOptional()
  @IsString()
  description?: string;
}

export class ProjectDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  technologies: string[];

  @IsNotEmpty()
  @IsString()
  role: string;

  @IsOptional()
  @IsString()
  duration?: string;

  @IsOptional()
  @IsUrl()
  url?: string;
}


export class PreferencesDto {
  @IsEnum(['small', 'medium', 'large', 'any'])
  teamSize: 'small' | 'medium' | 'large' | 'any';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  projectType?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  projectAreasOfInterest?: string[];

  @IsOptional()
  @IsBoolean()
  prefersFemaleOnlyTeam?: boolean;

  @IsEnum(['direct', 'collaborative', 'supportive', 'analytical'])
  communicationStyle: 'direct' | 'collaborative' | 'supportive' | 'analytical';

  @IsEnum(['leader', 'contributor', 'specialist', 'facilitator'])
  workStyle: 'leader' | 'contributor' | 'specialist' | 'facilitator';

  @IsArray()
  @IsString({ each: true })
  interests: string[];
}

export class CreateParticipantProfileDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  skills: string[];

  @IsEnum(['beginner', 'intermediate', 'advanced', 'expert'])
  expertiseLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkExperienceDto)
  workExperience: WorkExperienceDto[];

  @IsString()
  @IsNotEmpty()
  education: string;

  @IsNumber()
  @Min(16)
  @Max(100)
  age: number;

  @IsOptional()
  @IsEnum(['masculine', 'feminine', 'non-binary', 'prefer-not-to-say'])
  gender?: 'masculine' | 'feminine' | 'non-binary' | 'prefer-not-to-say';

  @IsOptional()
  @IsBoolean()
  preferFemaleTeam?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  challengesOfInterest?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interestAreas?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectDto)
  projects: ProjectDto[];

  @ValidateNested()
  @Type(() => PreferencesDto)
  preferences: PreferencesDto;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  languages: string[];

  @IsOptional()
  @IsUrl()
  githubProfile?: string;

  @IsOptional()
  @IsUrl()
  linkedinProfile?: string;

  @IsOptional()
  @IsUrl()
  portfolioUrl?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  participationGoals?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  challengesInterests?: string[];
}

export class UpdateParticipantProfileDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsEnum(['beginner', 'intermediate', 'advanced', 'expert'])
  expertiseLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkExperienceDto)
  workExperience?: WorkExperienceDto[];

  @IsOptional()
  @IsString()
  education?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectDto)
  projects?: ProjectDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => PreferencesDto)
  preferences?: PreferencesDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @IsOptional()
  @IsUrl()
  githubProfile?: string;

  @IsOptional()
  @IsUrl()
  linkedinProfile?: string;

  @IsOptional()
  @IsUrl()
  portfolioUrl?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  participationGoals?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  challengesInterests?: string[];
}

export class FindMatchesDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(6)
  teamSize?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  challengeCategories?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(1.0)
  minMatchScore?: number;
}

export class TeamMatchResponseDto {
  id: string;
  participantEmails: string[];
  matchScore: {
    overall: number;
    skillsCompatibility: number;
    experienceBalance: number;
    availabilityMatch: number;
    preferencesAlignment: number;
    communicationFit: number;
  };
  reasoning: {
    strengths: string[];
    concerns: string[];
    suggestions: string[];
  };
  challengeCategory?: string;
  recommendedRoles?: Record<string, string>;
  createdAt: string;
  status: string;
  metadata: {
    teamSize: number;
    isHighQuality: boolean;
    isViable: boolean;
  };
}