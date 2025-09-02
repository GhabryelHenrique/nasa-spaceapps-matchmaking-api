import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class WorkExperienceCompletionDto {
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

  @IsArray()
  @IsString({ each: true })
  technologies: string[];

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}

export class CompleteProfileDto {
  // Nível de Expertise
  @IsEnum(['beginner', 'intermediate', 'advanced', 'expert'])
  @IsNotEmpty()
  expertiseLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';

  // Skills
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  skills: string[];

  // Educação
  @IsString()
  @IsNotEmpty()
  education: string;

  // Bio (opcional)
  @IsOptional()
  @IsString()
  bio?: string;

  // Experiência Profissional (opcional)
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkExperienceCompletionDto)
  workExperience?: WorkExperienceCompletionDto[];

  // Disponibilidade
  @IsNumber()
  @Min(1)
  @Max(168) // Máximo horas por semana
  hoursPerWeek: number;

  @IsString()
  @IsNotEmpty()
  timezone: string;

  @IsString()
  @IsNotEmpty()
  preferredWorkingHours: string; // Ex: "18:00-22:00"

  // Preferências
  @IsEnum([2, 3, 4, 5, 6])
  teamSize: number;

  @IsEnum(['direct', 'collaborative', 'supportive', 'analytical'])
  communicationStyle: 'direct' | 'collaborative' | 'supportive' | 'analytical';

  @IsEnum(['leader', 'contributor', 'specialist', 'facilitator', 'mentor'])
  preferredRole: 'leader' | 'contributor' | 'specialist' | 'facilitator' | 'mentor';

  // Idiomas
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  languages: string[];

  // Campos opcionais adicionais
  @IsOptional()
  @IsString()
  githubProfile?: string;

  @IsOptional()
  @IsString()
  linkedinProfile?: string;

  @IsOptional()
  @IsString()
  portfolioUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  participationGoals?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  challengesInterests?: string[];
}