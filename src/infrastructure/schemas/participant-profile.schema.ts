import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
export class WorkExperienceSchema {
  @Prop({ required: true })
  company: string;

  @Prop({ required: true })
  position: string;

  @Prop({ required: true })
  sector: string;

  @Prop({ required: true })
  yearsOfExperience: number;

  @Prop({ type: [String], default: [] })
  technologies?: string[];

  @Prop()
  description?: string;
}

@Schema({ _id: false })
export class ProjectSchema {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: [String], default: [] })
  technologies: string[];

  @Prop({ required: true })
  role: string;

  @Prop()
  duration?: string;

  @Prop()
  url?: string;
}


@Schema({ _id: false })
export class PreferencesSchema {
  @Prop({ required: true, enum: ['small', 'medium', 'large', 'any'] })
  teamSize: string;

  @Prop({ type: [String], default: [] })
  projectType?: string[];

  @Prop({ type: [String], default: [] })
  projectAreasOfInterest?: string[];

  @Prop({ default: false })
  prefersFemaleOnlyTeam?: boolean;

  @Prop({ required: true, enum: ['direct', 'collaborative', 'supportive', 'analytical'] })
  communicationStyle: string;

  @Prop({ required: true, enum: ['leader', 'contributor', 'specialist', 'facilitator'] })
  workStyle: string;

  @Prop({ type: [String], default: [] })
  interests: string[];
}

@Schema({ _id: false })
export class GoogleSheetsDataSchema {
  @Prop()
  timestamp?: string;

  @Prop()
  phone?: string;

  @Prop()
  cpf?: string;

  @Prop()
  city?: string;

  @Prop()
  birthDate?: string;

  @Prop()
  participationMode?: string;

  @Prop()
  howDidYouKnow?: string;

  @Prop()
  areasOfInterest?: string;
}

@Schema({ timestamps: true })
export class ParticipantProfileDocument extends Document {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true })
  phoneNumber: string;

  @Prop({ type: [String], required: true })
  skills: string[];

  @Prop({ required: true, enum: ['beginner', 'intermediate', 'advanced', 'expert'] })
  expertiseLevel: string;

  @Prop({ type: [WorkExperienceSchema], default: [] })
  workExperience: WorkExperienceSchema[];

  @Prop({ required: true })
  education: string;

  @Prop({ required: true, min: 16, max: 100 })
  age: number;

  @Prop({ enum: ['masculine', 'feminine', 'non-binary', 'prefer-not-to-say'] })
  gender?: string;

  @Prop({ default: false })
  preferFemaleTeam?: boolean;

  @Prop({ type: [String], default: [] })
  challengesOfInterest?: string[];

  @Prop({ type: [String], default: [] })
  interestAreas?: string[];

  @Prop({ type: [ProjectSchema], default: [] })
  projects: ProjectSchema[];


  @Prop({ type: PreferencesSchema, required: true })
  preferences: PreferencesSchema;

  @Prop({ type: [String], default: [] })
  languages: string[];

  @Prop()
  githubProfile?: string;

  @Prop()
  linkedinProfile?: string;

  @Prop()
  portfolioUrl?: string;

  @Prop()
  bio?: string;

  @Prop({ type: [String], default: [] })
  participationGoals: string[];

  @Prop({ type: [String], default: [] })
  challengesInterests: string[];

  @Prop({ type: GoogleSheetsDataSchema })
  googleSheetsData?: GoogleSheetsDataSchema;

  @Prop({ default: false })
  isComplete: boolean;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const ParticipantProfileSchema = SchemaFactory.createForClass(ParticipantProfileDocument);

// Indexes for better query performance
// Note: email index is already created by unique: true property
ParticipantProfileSchema.index({ skills: 1 });
ParticipantProfileSchema.index({ expertiseLevel: 1 });
ParticipantProfileSchema.index({ 'workExperience.sector': 1 });
ParticipantProfileSchema.index({ isComplete: 1 });
ParticipantProfileSchema.index({ createdAt: -1 });
ParticipantProfileSchema.index({ updatedAt: -1 });