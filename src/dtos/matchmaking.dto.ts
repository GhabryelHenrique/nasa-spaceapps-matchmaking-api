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
  IsBoolean,
  Matches
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
  @ApiProperty({
    example: 'user@example.com',
    description: 'Participant email address'
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: '+5511999999999',
    description: 'Phone number with country code'
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/, { message: 'Phone number must be in international format (e.g., +5511999999999)' })
  phoneNumber: string;

  @ApiProperty({ 
    example: 'John Doe', 
    description: 'Full name of the participant' 
  })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ 
    example: ['JavaScript', 'Python', 'Data Analysis'], 
    description: 'Technical skills and competencies' 
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  skills: string[];

  @ApiProperty({ 
    example: 'intermediate', 
    enum: ['beginner', 'intermediate', 'advanced', 'expert'], 
    description: 'Overall expertise level' 
  })
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
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, { message: 'Phone number must be in international format (e.g., +5511999999999)' })
  phoneNumber?: string;

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
  @IsNumber()
  @Min(16)
  @Max(100)
  age?: number;

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
  @ApiProperty({ 
    example: 'user@example.com', 
    description: 'Email of participant looking for matches' 
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ 
    example: 4, 
    minimum: 2, 
    maximum: 6, 
    description: 'Preferred team size' 
  })
  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(6)
  teamSize?: number;

  @ApiPropertyOptional({ 
    example: ['Data Science', 'Web Development'], 
    description: 'Challenge categories of interest' 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  challengeCategories?: string[];

  @ApiPropertyOptional({ 
    example: 0.75, 
    minimum: 0.5, 
    maximum: 1.0, 
    description: 'Minimum match score threshold' 
  })
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

export class SendMatchNotificationDto {
  @ApiProperty({
    example: 'sender@example.com',
    description: 'Email of the person sending the match notification'
  })
  @IsEmail()
  @IsNotEmpty()
  senderEmail: string;

  @ApiProperty({
    example: 'recipient@example.com',
    description: 'Email of the person receiving the match notification'
  })
  @IsEmail()
  @IsNotEmpty()
  recipientEmail: string;
}