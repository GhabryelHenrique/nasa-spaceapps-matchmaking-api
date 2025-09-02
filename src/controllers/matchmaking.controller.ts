import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  Param,
  HttpException,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import { ParticipantProfileService } from '../services/participant-profile.service';
import { MatchmakingService } from '../services/matchmaking.service';
import {
  CreateParticipantProfileDto,
  UpdateParticipantProfileDto,
  FindMatchesDto,
} from '../dtos/matchmaking.dto';
import { CompleteProfileDto } from '../dtos/profile-completion.dto';

@Controller('matchmaking')
export class MatchmakingController {
  constructor(
    private readonly participantProfileService: ParticipantProfileService,
    private readonly matchmakingService: MatchmakingService,
  ) {}

  // Profile Management Endpoints
  @Post('profile')
  async createProfile(@Body(ValidationPipe) createProfileDto: CreateParticipantProfileDto) {
    try {
      const profile = await this.participantProfileService.createProfile(createProfileDto);
      return {
        success: true,
        message: 'Profile created successfully',
        profile: profile.toJSON(),
      };
    } catch (error) {
      if (error.message.includes('Profile already exists')) {
        throw new HttpException('Profile already exists for this email', HttpStatus.CONFLICT);
      }
      if (error.message.includes('Invalid email format')) {
        throw new HttpException('Invalid email format', HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('profile/:email')
  async getProfile(@Param('email') email: string) {
    try {
      const profile = await this.participantProfileService.getProfile(email);
      
      if (!profile) {
        throw new HttpException('Profile not found', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        profile: profile.toJSON(),
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      if (error.message.includes('Invalid email format')) {
        throw new HttpException('Invalid email format', HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put('profile/:email')
  async updateProfile(
    @Param('email') email: string,
    @Body(ValidationPipe) updateProfileDto: UpdateParticipantProfileDto,
  ) {
    try {
      const profile = await this.participantProfileService.updateProfile(email, updateProfileDto);
      return {
        success: true,
        message: 'Profile updated successfully',
        profile: profile.toJSON(),
      };
    } catch (error) {
      if (error.message.includes('Profile not found')) {
        throw new HttpException('Profile not found', HttpStatus.NOT_FOUND);
      }
      if (error.message.includes('Invalid email format')) {
        throw new HttpException('Invalid email format', HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put('profile/:email/complete')
  async completeProfile(
    @Param('email') email: string,
    @Body(ValidationPipe) completeProfileDto: CompleteProfileDto,
  ) {
    try {
      // Convert DTO to format expected by updateProfile method
      const updateData = {
        expertiseLevel: completeProfileDto.expertiseLevel,
        skills: completeProfileDto.skills,
        education: completeProfileDto.education,
        bio: completeProfileDto.bio,
        workExperience: completeProfileDto.workExperience || [],
        availability: {
          hoursPerWeek: completeProfileDto.hoursPerWeek,
          timezone: completeProfileDto.timezone,
          preferredWorkingHours: completeProfileDto.preferredWorkingHours,
        },
        preferences: {
          teamSize: completeProfileDto.teamSize,
          communicationStyle: completeProfileDto.communicationStyle,
          workStyle: completeProfileDto.preferredRole,
          projectType: [], // Can be extended later
          interests: completeProfileDto.challengesInterests || [],
        },
        languages: completeProfileDto.languages,
        githubProfile: completeProfileDto.githubProfile,
        linkedinProfile: completeProfileDto.linkedinProfile,
        portfolioUrl: completeProfileDto.portfolioUrl,
        participationGoals: completeProfileDto.participationGoals || [],
        challengesInterests: completeProfileDto.challengesInterests || [],
      };

      const profile = await this.participantProfileService.updateProfile(email, updateData);
      return {
        success: true,
        message: 'Profile completed successfully',
        profile: profile.toJSON(),
      };
    } catch (error) {
      if (error.message.includes('Profile not found')) {
        throw new HttpException('Profile not found', HttpStatus.NOT_FOUND);
      }
      if (error.message.includes('Invalid email format')) {
        throw new HttpException('Invalid email format', HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete('profile/:email')
  async deleteProfile(@Param('email') email: string) {
    try {
      await this.participantProfileService.deleteProfile(email);
      return {
        success: true,
        message: 'Profile deleted successfully',
      };
    } catch (error) {
      if (error.message.includes('Invalid email format')) {
        throw new HttpException('Invalid email format', HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('profiles')
  async getAllProfiles(@Query('skills') skills?: string) {
    try {
      let profiles;
      
      if (skills) {
        const skillsArray = skills.split(',').map(skill => skill.trim());
        profiles = await this.participantProfileService.findProfilesBySkills(skillsArray);
      } else {
        profiles = await this.participantProfileService.getAllProfiles();
      }

      return {
        success: true,
        count: profiles.length,
        profiles: profiles.map(profile => profile.toJSON()),
      };
    } catch {
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Matchmaking Endpoints
  @Post('find-matches')
  async findMatches(@Body(ValidationPipe) findMatchesDto: FindMatchesDto) {
    try {
      const options = {
        teamSize: findMatchesDto.teamSize,
        challengeCategories: findMatchesDto.challengeCategories,
        minMatchScore: findMatchesDto.minMatchScore,
      };

      const matches = await this.matchmakingService.findMatches(findMatchesDto.email, options);
      
      return {
        success: true,
        count: matches.length,
        matches: matches.map(match => match.toJSON()),
      };
    } catch (error) {
      if (error.message.includes('Invalid email format')) {
        throw new HttpException('Invalid email format', HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('matches/:email')
  async getMatchesForParticipant(@Param('email') email: string) {
    try {
      const matches = await this.matchmakingService.getMatchesForParticipant(email);
      
      return {
        success: true,
        count: matches.length,
        matches: matches.map(match => match.toJSON()),
      };
    } catch (error) {
      if (error.message.includes('Invalid email format')) {
        throw new HttpException('Invalid email format', HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('matches/:matchId/accept')
  async acceptMatch(
    @Param('matchId') matchId: string,
    @Body('participantEmail') participantEmail: string,
  ) {
    try {
      await this.matchmakingService.acceptMatch(matchId, participantEmail);
      return {
        success: true,
        message: 'Match accepted successfully',
      };
    } catch (error) {
      if (error.message.includes('Match not found')) {
        throw new HttpException('Match not found', HttpStatus.NOT_FOUND);
      }
      if (error.message.includes('not part of this match')) {
        throw new HttpException('Participant is not part of this match', HttpStatus.FORBIDDEN);
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('matches/:matchId/reject')
  async rejectMatch(
    @Param('matchId') matchId: string,
    @Body('participantEmail') participantEmail: string,
  ) {
    try {
      await this.matchmakingService.rejectMatch(matchId, participantEmail);
      return {
        success: true,
        message: 'Match rejected successfully',
      };
    } catch (error) {
      if (error.message.includes('Match not found')) {
        throw new HttpException('Match not found', HttpStatus.NOT_FOUND);
      }
      if (error.message.includes('not part of this match')) {
        throw new HttpException('Participant is not part of this match', HttpStatus.FORBIDDEN);
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('match/:matchId')
  async getMatchById(@Param('matchId') matchId: string) {
    try {
      const match = await this.matchmakingService.getMatchById(matchId);
      
      if (!match) {
        throw new HttpException('Match not found', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        match: match.toJSON(),
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('generate-teams')
  async generateTeamRecommendations(@Query('teamSize') teamSize?: number) {
    try {
      const size = teamSize ? parseInt(teamSize.toString()) : undefined;
      const recommendations = await this.matchmakingService.generateTeamRecommendations(size);
      
      return {
        success: true,
        count: recommendations.length,
        recommendations: recommendations.map(rec => rec.toJSON()),
      };
    } catch {
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('high-quality-matches')
  async getHighQualityMatches(@Query('minScore') minScore?: number) {
    try {
      const score = minScore ? parseFloat(minScore.toString()) : 0.75;
      const matches = await this.matchmakingService.getHighQualityMatches(score);
      
      return {
        success: true,
        count: matches.length,
        matches: matches.map(match => match.toJSON()),
      };
    } catch {
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Analytics and ML Endpoints
  @Get('analytics/export')
  async exportMatchmakingData() {
    try {
      const data = await this.matchmakingService.exportMatchmakingData();
      
      return {
        success: true,
        message: 'Matchmaking data exported successfully',
        data,
      };
    } catch {
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('analytics/ml-training-data')
  async getMLTrainingData() {
    try {
      const data = await this.participantProfileService.getMLTrainingData();
      
      return {
        success: true,
        count: data.length,
        data,
      };
    } catch {
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('similar-profiles/:email')
  async findSimilarProfiles(@Param('email') email: string, @Query('limit') limit?: number) {
    try {
      const limitNum = limit ? parseInt(limit.toString()) : 10;
      const profiles = await this.participantProfileService.findSimilarProfiles(email, limitNum);
      
      return {
        success: true,
        count: profiles.length,
        profiles: profiles.map(profile => profile.toJSON()),
      };
    } catch (error) {
      if (error.message.includes('Invalid email format')) {
        throw new HttpException('Invalid email format', HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}