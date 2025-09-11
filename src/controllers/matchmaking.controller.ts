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
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { ParticipantProfileService } from '../services/participant-profile.service';
import { MatchmakingService } from '../services/matchmaking.service';
import { NasaApiService } from '../services/nasa-api.service';
import { NasaSyncService } from '../services/nasa-sync.service';
import {
  CreateParticipantProfileDto,
  UpdateParticipantProfileDto,
  FindMatchesDto,
} from '../dtos/matchmaking.dto';
import { CompleteProfileDto } from '../dtos/profile-completion.dto';
import { logger } from '../infrastructure/config/logger.config';

@ApiTags('matchmaking')
@Controller('matchmaking')
export class MatchmakingController {
  constructor(
    private readonly participantProfileService: ParticipantProfileService,
    private readonly matchmakingService: MatchmakingService,
    private readonly nasaApiService: NasaApiService,
    private readonly nasaSyncService: NasaSyncService,
  ) {}

  // Profile Management Endpoints
  @Post('profile')
  @ApiOperation({ summary: 'Create participant profile' })
  @ApiBody({ type: CreateParticipantProfileDto })
  @ApiResponse({ status: 201, description: 'Profile created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid email format' })
  @ApiResponse({ status: 409, description: 'Profile already exists' })
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
  @ApiOperation({ summary: 'Get participant profile by email' })
  @ApiParam({ name: 'email', description: 'Participant email address' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid email format' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
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
  @ApiOperation({ summary: 'Find team matches for a participant' })
  @ApiBody({ type: FindMatchesDto })
  @ApiResponse({ status: 200, description: 'Matches found successfully' })
  @ApiResponse({ status: 400, description: 'Invalid email format' })
  async findMatches(@Body(ValidationPipe) findMatchesDto: FindMatchesDto) {
    logger.debug('CONTROLLER DEBUG: findMatches endpoint called', {
      email: findMatchesDto.email,
      teamSize: findMatchesDto.teamSize,
      challengeCategories: findMatchesDto.challengeCategories,
      minMatchScore: findMatchesDto.minMatchScore,
      timestamp: new Date().toISOString(),
      endpoint: '/matchmaking/find-matches'
    });

    try {
      const options = {
        teamSize: findMatchesDto.teamSize,
        challengeCategories: findMatchesDto.challengeCategories,
        minMatchScore: findMatchesDto.minMatchScore,
      };

      logger.debug('CONTROLLER DEBUG: Calling matchmaking service with options', {
        email: findMatchesDto.email,
        options,
        timestamp: new Date().toISOString()
      });

      const matches = await this.matchmakingService.findMatches(findMatchesDto.email, options);
      
      logger.debug('CONTROLLER DEBUG: Matchmaking service returned matches', {
        email: findMatchesDto.email,
        matchCount: matches.length,
        matchIds: matches.map(m => m.id),
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        count: matches.length,
        matches: matches.map(match => match.toJSON()),
      };
    } catch (error) {
      logger.error('CONTROLLER DEBUG: Error in findMatches endpoint', {
        email: findMatchesDto.email,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

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
      // Get all profiles for team generation
      const allProfiles = await this.participantProfileService.getAllProfiles();
      if (allProfiles.length === 0) {
        return {
          success: false,
          message: 'No profiles available for team generation',
          recommendations: []
        };
      }
      
      // Use first profile as example target for team generation
      const targetProfile = allProfiles[0];
      const maxTeams = teamSize ? parseInt(teamSize.toString()) : 5;
      const recommendations = await this.matchmakingService.generateTeamRecommendations(
        targetProfile, 
        allProfiles, 
        maxTeams
      );
      
      return {
        success: true,
        count: recommendations.length,
        recommendations: recommendations,
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

  @Get('best-matches/:email')
  async getBestMatches(
    @Param('email') email: string, 
    @Query('limit') limit?: number,
    @Query('includeTeams') includeTeams?: string
  ) {
    try {
      const limitNum = limit ? parseInt(limit.toString()) : 20;
      const shouldIncludeTeams = includeTeams === 'true';
      
      // Get all profiles first
      const allProfiles = await this.participantProfileService.getAllProfiles();
      const targetProfile = allProfiles.find(p => p.email.value === email);
      
      if (!targetProfile) {
        throw new HttpException('Profile not found', HttpStatus.NOT_FOUND);
      }

      // Calculate individual matches with other participants
      const individualMatches: any[] = [];
      for (const profile of allProfiles) {
        if (profile.email.value !== email) {
          const match = await this.matchmakingService.findIndividualMatch(targetProfile, profile);
          individualMatches.push({
            participant: profile.toJSON(),
            matchScore: match.matchScore,
            reasoning: match.reasoning
          });
        }
      }

      // Sort by match score
      individualMatches.sort((a, b) => b.matchScore.overall - a.matchScore.overall);
      const topIndividualMatches = individualMatches.slice(0, limitNum);

      let teamMatches: any[] = [];
      if (shouldIncludeTeams) {
        // Generate team recommendations directly
        teamMatches = await this.matchmakingService.generateTeamRecommendations(
          targetProfile, 
          allProfiles, 
          Math.min(5, Math.ceil(limitNum / 4))
        );
      }

      return {
        success: true,
        targetParticipant: {
          email: targetProfile.email.value,
          fullName: targetProfile.fullName,
          skills: targetProfile.skills,
          expertiseLevel: targetProfile.expertiseLevel
        },
        individualMatches: {
          count: topIndividualMatches.length,
          matches: topIndividualMatches
        },
        teamMatches: {
          count: teamMatches.length,
          matches: teamMatches
        },
        summary: {
          totalIndividualMatches: individualMatches.length,
          averageMatchScore: individualMatches.length > 0 
            ? individualMatches.reduce((sum, m) => sum + m.matchScore.overall, 0) / individualMatches.length 
            : 0,
          topMatchScore: individualMatches.length > 0 ? individualMatches[0].matchScore.overall : 0
        }
      };
    } catch (error) {
      if (error.message.includes('Invalid email format')) {
        throw new HttpException('Invalid email format', HttpStatus.BAD_REQUEST);
      }
      if (error.message.includes('Profile not found')) {
        throw new HttpException('Profile not found', HttpStatus.NOT_FOUND);
      }
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

  // NASA API Integration Endpoints
  @Post('nasa/sync-participants')
  async syncParticipantsFromNasa() {
    try {
      const result = await this.nasaSyncService.syncParticipantsFromNasa();
      return {
        success: true,
        message: 'NASA participants sync completed',
        result,
      };
    } catch (error) {
      throw new HttpException('Failed to sync NASA participants' + error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('nasa/teams')
  async getNasaTeams(@Query('limit') limit?: number) {
    try {
      const limitNum = limit ? parseInt(limit.toString()) : 50;
      const teams = await this.nasaApiService.fetchTeams(limitNum);
      
      return {
        success: true,
        count: teams.length,
        teams,
      };
    } catch (error: any) {
      throw new HttpException('Failed to fetch NASA teams ' + error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('nasa/participants')
  async getNasaParticipants(@Query('limit') limit?: number) {
    try {
      const limitNum = limit ? parseInt(limit.toString()) : 50;
      const participants = await this.nasaApiService.fetchParticipants(limitNum);
      
      return {
        success: true,
        count: participants.length,
        participants,
      };
    } catch (error) {
      throw new HttpException('Failed to fetch NASA participants' + error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('nasa/challenges')
  async getNasaChallenges(@Query('limit') limit?: number) {
    try {
      const limitNum = limit ? parseInt(limit.toString()) : 50;
      const challenges = await this.nasaApiService.fetchChallenges(limitNum);
      
      return {
        success: true,
        count: challenges.length,
        challenges,
      };
    } catch (error) {
      throw new HttpException('Failed to fetch NASA challenges' + error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('nasa/sync-status')
  async getNasaSyncStatus() {
    try {
      const stats = await this.nasaSyncService.getParticipantStats();
      
      return {
        success: true,
        stats,
      };
    } catch (error) {
      throw new HttpException('Failed to get NASA sync status' + error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('nasa/full-sync')
  async performFullNasaSync() {
    try {
      const data = await this.nasaApiService.syncData();
      const syncResult = await this.nasaSyncService.syncParticipantsFromNasa();
      
      return {
        success: true,
        message: 'Full NASA data sync completed',
        data: {
          nasaData: {
            teamsCount: data.teams.length,
            participantsCount: data.participants.length,
            challengesCount: data.challenges.length,
          },
          syncResult,
        },
      };
    } catch (error) {
      throw new HttpException('Failed to perform full NASA sync ' + error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Advanced Team Formation Endpoints
  @Post('generate-diverse-teams')
  async generateDiverseTeams(@Body() body: { teamSize?: number }) {
    try {
      const teamSize = body.teamSize || 4;
      const allProfiles = await this.participantProfileService.getAllProfiles();
      
      if (allProfiles.length < teamSize) {
        return {
          success: false,
          message: 'Not enough participants to form teams',
          required: teamSize,
          available: allProfiles.length,
        };
      }

      const teams = await this.matchmakingService.generateDiverseTeams(allProfiles, { teamSize });
      
      return {
        success: true,
        message: 'Diverse teams generated successfully',
        teamSize,
        teamsGenerated: teams.length,
        totalParticipants: allProfiles.length,
        teams: teams.map(team => ({
          teamId: team.id,
          participants: team.participantEmails.map(email => email.value),
          matchScore: team.matchScore,
          algorithm: team.algorithm,
          metadata: team.metadata,
          createdAt: team.createdAt,
        })),
        summary: this.generateTeamsSummary(teams),
      };
    } catch (error) {
      throw new HttpException('Failed to generate diverse ' + error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private generateTeamsSummary(teams: any[]): any {
    if (teams.length === 0) return null;

    const teamTypes = new Map<string, number>();
    let totalFemaleOnlyTeams = 0;
    let totalMixedTeams = 0;
    let totalMinorsTeams = 0;

    teams.forEach(team => {
      const teamType = team.metadata?.teamType || 'unknown';
      teamTypes.set(teamType, (teamTypes.get(teamType) || 0) + 1);
      
      if (teamType === 'female-only') totalFemaleOnlyTeams++;
      else if (teamType === 'mixed-adults') totalMixedTeams++;
      else if (teamType === 'minors-only') totalMinorsTeams++;
    });

    const avgMatchScore = teams.reduce((sum, team) => sum + team.matchScore, 0) / teams.length;
    const avgSkillsCount = teams.reduce((sum, team) => sum + (team.metadata?.skillsCount || 0), 0) / teams.length;

    return {
      totalTeams: teams.length,
      averageMatchScore: Math.round(avgMatchScore * 100) / 100,
      averageSkillsPerTeam: Math.round(avgSkillsCount),
      teamTypes: Object.fromEntries(teamTypes),
      breakdown: {
        femaleOnlyTeams: totalFemaleOnlyTeams,
        mixedAdultTeams: totalMixedTeams,
        minorsOnlyTeams: totalMinorsTeams,
      },
    };
  }
}