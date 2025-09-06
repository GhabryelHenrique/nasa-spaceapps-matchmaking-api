import { Injectable, Inject } from '@nestjs/common';
import type { ParticipantProfileRepositoryPort } from '../application/ports/participant-profile-repository.port';
import type { TeamMatchRepositoryPort } from '../application/ports/team-match-repository.port';
import type { MatchmakingAlgorithmPort, MatchmakingOptions } from '../application/ports/matchmaking-algorithm.port';
import type { LoggerPort } from '../application/ports/logger.port';
import { TeamMatch } from '../domain/entities/team-match.entity';
import { Email } from '../domain/value-objects/email.vo';
import {
  PARTICIPANT_PROFILE_REPOSITORY_TOKEN,
  TEAM_MATCH_REPOSITORY_TOKEN,
  MATCHMAKING_ALGORITHM_TOKEN,
  LOGGER_TOKEN,
} from '../application/ports/tokens';
import { logger } from '../infrastructure/config/logger.config';

@Injectable()
export class MatchmakingService {
  constructor(
    @Inject(PARTICIPANT_PROFILE_REPOSITORY_TOKEN)
    private readonly profileRepository: ParticipantProfileRepositoryPort,
    @Inject(TEAM_MATCH_REPOSITORY_TOKEN)
    private readonly teamMatchRepository: TeamMatchRepositoryPort,
    @Inject(MATCHMAKING_ALGORITHM_TOKEN)
    private readonly matchmakingAlgorithm: MatchmakingAlgorithmPort,
    @Inject(LOGGER_TOKEN) private readonly logger: LoggerPort,
  ) {}

  async findMatches(email: string, options?: MatchmakingOptions): Promise<TeamMatch[]> {
    this.logger.info('Finding matches for participant', 'MatchmakingService', {
      email,
      options,
    });
    
    logger.debug('MATCHMAKING DEBUG: Starting findMatches process', {
      email,
      options,
      timestamp: new Date().toISOString(),
      service: 'MatchmakingService',
      method: 'findMatches'
    });

    try {
      const emailVo = new Email(email);
      logger.debug('MATCHMAKING DEBUG: Email validation successful', {
        email: emailVo.value,
        timestamp: new Date().toISOString()
      });
      
      // Get all profiles for matching
      const allProfiles = await this.profileRepository.findAll();
      logger.debug('MATCHMAKING DEBUG: Retrieved all profiles from repository', {
        totalProfiles: allProfiles.length,
        profileEmails: allProfiles.map(p => p.email?.value || p.email),
        timestamp: new Date().toISOString()
      });
      
      // Find matches using the ML algorithm
      logger.debug('MATCHMAKING DEBUG: Calling matchmaking algorithm', {
        targetEmail: emailVo.value,
        availableProfiles: allProfiles.length,
        algorithmOptions: options,
        timestamp: new Date().toISOString()
      });
      
      const matches = await this.matchmakingAlgorithm.findMatches(emailVo, allProfiles, options);
      
      logger.debug('MATCHMAKING DEBUG: Algorithm returned matches', {
        matchCount: matches.length,
        matches: matches.map(match => ({
          id: match.id,
          participants: match.participantEmails?.map(e => e.value) || [],
          score: match.matchScore.overall,
          status: match.status
        })),
        timestamp: new Date().toISOString()
      });

      // Save generated matches
      for (const match of matches) {
        logger.debug('MATCHMAKING DEBUG: Saving match to repository', {
          matchId: match.id,
          participants: match.participantEmails?.map(e => e.value) || [],
          timestamp: new Date().toISOString()
        });
        await this.teamMatchRepository.save(match);
      }

      this.logger.info('Matches found and saved', 'MatchmakingService', {
        email,
        matchCount: matches.length,
      });
      
      logger.debug('MATCHMAKING DEBUG: findMatches process completed successfully', {
        email,
        finalMatchCount: matches.length,
        timestamp: new Date().toISOString()
      });

      return matches;
    } catch (error) {
      logger.error('MATCHMAKING DEBUG: Error in findMatches process', {
        email,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      this.logger.error('Error finding matches', error, 'MatchmakingService', { email });
      throw error;
    }
  }

  async getMatchesForParticipant(email: string): Promise<TeamMatch[]> {
    this.logger.info('Getting matches for participant', 'MatchmakingService', { email });

    try {
      const emailVo = new Email(email);
      const matches = await this.teamMatchRepository.findByParticipant(emailVo);

      this.logger.info('Retrieved matches for participant', 'MatchmakingService', {
        email,
        matchCount: matches.length,
      });

      return matches;
    } catch (error) {
      this.logger.error('Error getting matches for participant', error, 'MatchmakingService', {
        email,
      });
      throw error;
    }
  }

  async acceptMatch(matchId: string, participantEmail: string): Promise<void> {
    this.logger.info('Accepting match', 'MatchmakingService', {
      matchId,
      participantEmail,
    });

    try {
      const match = await this.teamMatchRepository.findById(matchId);
      if (!match) {
        throw new Error('Match not found');
      }

      const emailVo = new Email(participantEmail);
      if (!match.hasParticipant(emailVo)) {
        throw new Error('Participant is not part of this match');
      }

      await this.teamMatchRepository.updateStatus(matchId, 'accepted');

      this.logger.info('Match accepted successfully', 'MatchmakingService', {
        matchId,
        participantEmail,
      });
    } catch (error) {
      this.logger.error('Error accepting match', error, 'MatchmakingService', {
        matchId,
        participantEmail,
      });
      throw error;
    }
  }

  async rejectMatch(matchId: string, participantEmail: string): Promise<void> {
    this.logger.info('Rejecting match', 'MatchmakingService', {
      matchId,
      participantEmail,
    });

    try {
      const match = await this.teamMatchRepository.findById(matchId);
      if (!match) {
        throw new Error('Match not found');
      }

      const emailVo = new Email(participantEmail);
      if (!match.hasParticipant(emailVo)) {
        throw new Error('Participant is not part of this match');
      }

      await this.teamMatchRepository.updateStatus(matchId, 'rejected');

      this.logger.info('Match rejected successfully', 'MatchmakingService', {
        matchId,
        participantEmail,
      });
    } catch (error) {
      this.logger.error('Error rejecting match', error, 'MatchmakingService', {
        matchId,
        participantEmail,
      });
      throw error;
    }
  }


  async getHighQualityMatches(minScore: number = 0.75): Promise<TeamMatch[]> {
    this.logger.info('Getting high quality matches', 'MatchmakingService', { minScore });

    try {
      const matches = await this.teamMatchRepository.findHighQualityMatches(minScore);

      this.logger.info('Retrieved high quality matches', 'MatchmakingService', {
        minScore,
        matchCount: matches.length,
      });

      return matches;
    } catch (error) {
      this.logger.error('Error getting high quality matches', error, 'MatchmakingService');
      throw error;
    }
  }

  async getMatchById(matchId: string): Promise<TeamMatch | null> {
    this.logger.info('Getting match by ID', 'MatchmakingService', { matchId });

    try {
      const match = await this.teamMatchRepository.findById(matchId);

      if (match) {
        this.logger.info('Match found', 'MatchmakingService', { matchId });
      } else {
        this.logger.warn('Match not found', 'MatchmakingService', { matchId });
      }

      return match;
    } catch (error) {
      this.logger.error('Error getting match by ID', error, 'MatchmakingService', { matchId });
      throw error;
    }
  }

  async findIndividualMatch(profile1: any, profile2: any): Promise<any> {
    this.logger.info('Finding individual match between two profiles', 'MatchmakingService', {
      profile1Email: profile1.email.value,
      profile2Email: profile2.email.value,
    });

    try {
      // Use the matchmaking algorithm to calculate compatibility between two individuals
      const matchScore = await this.matchmakingAlgorithm.calculateIndividualMatch(profile1, profile2);
      
      return {
        matchScore,
        reasoning: {
          strengths: this.generateMatchStrengths(profile1, profile2),
          concerns: this.generateMatchConcerns(profile1, profile2),
          suggestions: this.generateMatchSuggestions(profile1, profile2)
        }
      };
    } catch (error) {
      this.logger.error('Error finding individual match', error, 'MatchmakingService', {
        profile1Email: profile1.email.value,
        profile2Email: profile2.email.value,
      });
      throw error;
    }
  }

  private generateMatchStrengths(profile1: any, profile2: any): string[] {
    const strengths: string[] = [];
    
    // Check skill overlap
    const skills1 = new Set(profile1.skills.map((s: string) => s.toLowerCase()));
    const skills2 = new Set(profile2.skills.map((s: string) => s.toLowerCase()));
    const sharedSkills = [...skills1].filter(skill => skills2.has(skill));
    
    if (sharedSkills.length > 0) {
      strengths.push(`Shared skills: ${sharedSkills.join(', ')}`);
    }
    
    // Check complementary experience levels
    if (profile1.expertiseLevel !== profile2.expertiseLevel) {
      strengths.push('Complementary experience levels for knowledge sharing');
    }
    
    // Check common languages
    const commonLangs = profile1.languages.filter((lang: string) => 
      profile2.languages.includes(lang)
    );
    if (commonLangs.length > 0) {
      strengths.push(`Common languages: ${commonLangs.join(', ')}`);
    }
    
    return strengths;
  }

  private generateMatchConcerns(profile1: any, profile2: any): string[] {
    const concerns: string[] = [];
    
    // Check for significant experience gap
    const levels = ['beginner', 'intermediate', 'advanced', 'expert'];
    const level1Index = levels.indexOf(profile1.expertiseLevel);
    const level2Index = levels.indexOf(profile2.expertiseLevel);
    
    if (Math.abs(level1Index - level2Index) >= 3) {
      concerns.push('Significant experience gap may require additional coordination');
    }
    
    // Check for no overlapping skills
    const skills1 = new Set(profile1.skills.map((s: string) => s.toLowerCase()));
    const skills2 = new Set(profile2.skills.map((s: string) => s.toLowerCase()));
    const sharedSkills = [...skills1].filter(skill => skills2.has(skill));
    
    if (sharedSkills.length === 0) {
      concerns.push('No overlapping skills - may need clear role definition');
    }
    
    return concerns;
  }

  private generateMatchSuggestions(profile1: any, profile2: any): string[] {
    const suggestions: string[] = [];
    
    suggestions.push('Schedule an initial meeting to discuss project approach and responsibilities');
    suggestions.push('Define clear roles based on each member\'s strengths and expertise');
    
    // Check for potential mentorship opportunity
    const levels = ['beginner', 'intermediate', 'advanced', 'expert'];
    const level1Index = levels.indexOf(profile1.expertiseLevel);
    const level2Index = levels.indexOf(profile2.expertiseLevel);
    
    if (level1Index > level2Index + 1) {
      suggestions.push(`${profile1.fullName} could mentor ${profile2.fullName} in advanced techniques`);
    } else if (level2Index > level1Index + 1) {
      suggestions.push(`${profile2.fullName} could mentor ${profile1.fullName} in advanced techniques`);
    }
    
    return suggestions;
  }

  async generateTeamRecommendations(targetProfile: any, allProfiles: any[], maxTeams: number = 5): Promise<any[]> {
    this.logger.info('Generating team recommendations', 'MatchmakingService', {
      targetEmail: targetProfile.email.value,
      totalProfiles: allProfiles.length,
      maxTeams
    });

    try {
      const teamRecommendations: any[] = [];
      const otherProfiles = allProfiles.filter(p => p.email.value !== targetProfile.email.value);
      
      // Generate different team combinations
      for (let teamSize = 3; teamSize <= 4 && teamRecommendations.length < maxTeams; teamSize++) {
        const combinations = this.generateTeamCombinations(targetProfile, otherProfiles, teamSize - 1);
        
        for (const combination of combinations.slice(0, maxTeams - teamRecommendations.length)) {
          const teamProfiles = [targetProfile, ...combination];
          const teamScore = await this.matchmakingAlgorithm.calculateIndividualMatch(teamProfiles[0], teamProfiles[1]);
          
          // Calculate average team compatibility
          let totalCompatibility = 0;
          let comparisons = 0;
          
          for (let i = 0; i < teamProfiles.length; i++) {
            for (let j = i + 1; j < teamProfiles.length; j++) {
              const pairScore = await this.matchmakingAlgorithm.calculateIndividualMatch(teamProfiles[i], teamProfiles[j]);
              totalCompatibility += pairScore.overall;
              comparisons++;
            }
          }
          
          const averageCompatibility = totalCompatibility / comparisons;
          
          teamRecommendations.push({
            teamId: `team-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            participants: teamProfiles.map(p => p.email.value),
            participantDetails: teamProfiles.map(p => ({
              email: p.email.value,
              fullName: p.fullName,
              skills: p.skills,
              expertiseLevel: p.expertiseLevel
            })),
            teamSize: teamProfiles.length,
            matchScore: {
              overall: averageCompatibility,
              skillsCompatibility: this.calculateTeamSkillsCompatibility(teamProfiles),
              experienceBalance: this.calculateTeamExperienceBalance(teamProfiles),
              diversityScore: this.calculateTeamDiversityScore(teamProfiles)
            },
            reasoning: {
              strengths: this.generateTeamStrengths(teamProfiles),
              concerns: this.generateTeamConcerns(teamProfiles),
              suggestions: this.generateTeamSuggestions(teamProfiles)
            },
            recommendedRoles: this.generateRecommendedRoles(teamProfiles)
          });
        }
      }

      // Sort by overall match score
      teamRecommendations.sort((a, b) => b.matchScore.overall - a.matchScore.overall);

      this.logger.info('Team recommendations generated', 'MatchmakingService', {
        targetEmail: targetProfile.email.value,
        teamsGenerated: teamRecommendations.length
      });

      return teamRecommendations;
    } catch (error) {
      this.logger.error('Error generating team recommendations', error, 'MatchmakingService', {
        targetEmail: targetProfile.email.value
      });
      throw error;
    }
  }

  private generateTeamCombinations(targetProfile: any, otherProfiles: any[], teamSize: number): any[][] {
    if (teamSize <= 0) return [[]];
    if (teamSize > otherProfiles.length) return [];
    
    const combinations: any[][] = [];
    for (let i = 0; i <= otherProfiles.length - teamSize; i++) {
      const head = otherProfiles[i];
      const tailCombinations = this.generateTeamCombinations(targetProfile, otherProfiles.slice(i + 1), teamSize - 1);
      for (const tailCombination of tailCombinations) {
        combinations.push([head, ...tailCombination]);
      }
    }
    
    return combinations.slice(0, 20); // Limit combinations to prevent performance issues
  }

  private calculateTeamSkillsCompatibility(profiles: any[]): number {
    const allSkills = new Set();
    profiles.forEach(p => p.skills.forEach((s: string) => allSkills.add(s.toLowerCase())));
    
    // More skills diversity = higher score
    return Math.min(allSkills.size / (profiles.length * 3), 1.0);
  }

  private calculateTeamExperienceBalance(profiles: any[]): number {
    const levels = ['beginner', 'intermediate', 'advanced', 'expert'];
    const levelCounts = new Map();
    
    profiles.forEach(p => {
      const level = p.expertiseLevel;
      levelCounts.set(level, (levelCounts.get(level) || 0) + 1);
    });
    
    // Balanced distribution = higher score
    const uniqueLevels = levelCounts.size;
    return Math.min(uniqueLevels / 3, 1.0);
  }

  private calculateTeamDiversityScore(profiles: any[]): number {
    // Calculate diversity based on different factors
    const languages = new Set();
    const sectors = new Set();
    
    profiles.forEach(p => {
      p.languages?.forEach((lang: string) => languages.add(lang));
      p.workExperience?.forEach((exp: any) => sectors.add(exp.sector));
    });
    
    return Math.min((languages.size + sectors.size) / (profiles.length * 2), 1.0);
  }

  private generateTeamStrengths(profiles: any[]): string[] {
    const strengths: string[] = [];
    
    // Skill diversity
    const allSkills = new Set();
    profiles.forEach(p => p.skills.forEach((s: string) => allSkills.add(s.toLowerCase())));
    if (allSkills.size >= profiles.length * 2) {
      strengths.push('Diverse skill set covering multiple technical areas');
    }
    
    // Experience levels
    const levels = new Set(profiles.map(p => p.expertiseLevel));
    if (levels.size > 1) {
      strengths.push('Good balance of experience levels for mentoring and learning');
    }
    
    // Common languages
    const commonLanguages = profiles[0].languages?.filter((lang: string) =>
      profiles.every(p => p.languages?.includes(lang))
    ) || [];
    if (commonLanguages.length > 0) {
      strengths.push(`Team shares common languages: ${commonLanguages.join(', ')}`);
    }
    
    return strengths;
  }

  private generateTeamConcerns(profiles: any[]): string[] {
    const concerns: string[] = [];
    
    // Check for experience gaps
    const levels = ['beginner', 'intermediate', 'advanced', 'expert'];
    const profileLevels = profiles.map(p => levels.indexOf(p.expertiseLevel));
    const maxGap = Math.max(...profileLevels) - Math.min(...profileLevels);
    
    if (maxGap >= 3) {
      concerns.push('Significant experience gap may require structured mentoring approach');
    }
    
    // Check for skill overlap issues
    const skillOverlap = profiles.every(p => 
      profiles.some(other => other !== p && 
        other.skills.some((s: string) => p.skills.map((ps: string) => ps.toLowerCase()).includes(s.toLowerCase()))
      )
    );
    
    if (!skillOverlap) {
      concerns.push('Limited skill overlap may require clear role boundaries');
    }
    
    return concerns;
  }

  private generateTeamSuggestions(profiles: any[]): string[] {
    const suggestions: string[] = [];
    
    suggestions.push('Schedule an initial team meeting to align on project goals and individual strengths');
    suggestions.push('Create a skills matrix to identify each member\'s primary and secondary expertise areas');
    suggestions.push('Establish clear communication channels and regular check-in schedules');
    
    // Experience-based suggestions
    const levels = ['beginner', 'intermediate', 'advanced', 'expert'];
    const profileLevels = profiles.map((p, index) => ({ profile: p, level: levels.indexOf(p.expertiseLevel), index }));
    const sortedByExperience = profileLevels.sort((a, b) => b.level - a.level);
    
    if (sortedByExperience[0].level > sortedByExperience[sortedByExperience.length - 1].level + 1) {
      suggestions.push(`Consider pairing ${sortedByExperience[0].profile.fullName} with less experienced members for knowledge transfer`);
    }
    
    return suggestions;
  }

  private generateRecommendedRoles(profiles: any[]): Record<string, string> {
    const roles: Record<string, string> = {};
    const levels = ['beginner', 'intermediate', 'advanced', 'expert'];
    
    // Sort by experience level
    const sortedProfiles = profiles.sort((a, b) => 
      levels.indexOf(b.expertiseLevel) - levels.indexOf(a.expertiseLevel)
    );
    
    // Assign roles based on experience and skills
    sortedProfiles.forEach((profile, index) => {
      const email = profile.email.value;
      const skills = profile.skills.map((s: string) => s.toLowerCase());
      
      if (index === 0) {
        // Most experienced becomes team lead
        roles[email] = 'Team Lead & Technical Architect';
      } else if (skills.some(s => s.includes('frontend') || s.includes('react') || s.includes('angular') || s.includes('vue'))) {
        roles[email] = 'Frontend Developer';
      } else if (skills.some(s => s.includes('backend') || s.includes('server') || s.includes('api') || s.includes('database'))) {
        roles[email] = 'Backend Developer';
      } else if (skills.some(s => s.includes('data') || s.includes('ml') || s.includes('ai') || s.includes('analytics'))) {
        roles[email] = 'Data Scientist/Analyst';
      } else if (skills.some(s => s.includes('ui') || s.includes('ux') || s.includes('design'))) {
        roles[email] = 'UI/UX Designer';
      } else {
        roles[email] = `Developer (${profile.expertiseLevel})`;
      }
    });
    
    return roles;
  }

  // ML and Analytics methods
  async exportMatchmakingData(): Promise<any> {
    this.logger.info('Exporting matchmaking data for ML', 'MatchmakingService');

    try {
      const profiles = await this.profileRepository.getAllForMLTraining();
      const matches = await this.teamMatchRepository.findAll();

      const exportData = {
        profiles: profiles,
        matches: matches.map(match => ({
          ...match.toJSON(),
          success: match.status === 'accepted',
        })),
        metadata: {
          totalProfiles: profiles.length,
          totalMatches: matches.length,
          exportedAt: new Date().toISOString(),
        },
      };

      this.logger.info('Matchmaking data exported', 'MatchmakingService', {
        profileCount: profiles.length,
        matchCount: matches.length,
      });

      return exportData;
    } catch (error) {
      this.logger.error('Error exporting matchmaking data', error, 'MatchmakingService');
      throw error;
    }
  }

  // NASA Integration Methods
  async findMatchesByChallenge(challengeId: string, options?: MatchmakingOptions): Promise<TeamMatch[]> {
    this.logger.info('Finding matches by NASA challenge', 'MatchmakingService', {
      challengeId,
      options,
    });

    try {
      // Get all profiles
      const allProfiles = await this.profileRepository.findAll();
      
      // Filter profiles by those interested in the specific challenge
      const interestedProfiles = allProfiles.filter(profile =>
        profile.challengesInterests?.includes(challengeId) ||
        profile.preferences.interests?.some(interest => 
          interest.toLowerCase().includes(challengeId.toLowerCase())
        )
      );

      if (interestedProfiles.length === 0) {
        this.logger.info('No profiles found interested in challenge', 'MatchmakingService', {
          challengeId,
        });
        return [];
      }

      const matches: TeamMatch[] = [];

      // Generate matches for each interested profile
      for (const profile of interestedProfiles) {
        const profileMatches = await this.matchmakingAlgorithm.findMatches(
          profile.email,
          interestedProfiles,
          {
            ...options,
            challengeCategories: [challengeId],
          }
        );
        matches.push(...profileMatches);
      }

      // Remove duplicates and save matches
      const uniqueMatches = this.removeDuplicateMatches(matches);
      for (const match of uniqueMatches) {
        await this.teamMatchRepository.save(match);
      }

      this.logger.info('Challenge-specific matches found', 'MatchmakingService', {
        challengeId,
        matchCount: uniqueMatches.length,
      });

      return uniqueMatches;
    } catch (error) {
      this.logger.error('Error finding matches by challenge', error, 'MatchmakingService', {
        challengeId,
      });
      throw error;
    }
  }

  async getTeamRecommendationsForChallenge(
    challengeId: string,
    teamSize: number = 4,
    maxTeams: number = 10
  ): Promise<any[]> {
    this.logger.info('Getting team recommendations for NASA challenge', 'MatchmakingService', {
      challengeId,
      teamSize,
      maxTeams,
    });

    try {
      // Get all profiles
      const allProfiles = await this.profileRepository.findAll();
      
      // Filter profiles interested in this challenge
      const interestedProfiles = allProfiles.filter(profile =>
        profile.challengesInterests?.includes(challengeId) ||
        profile.preferences.interests?.some(interest => 
          interest.toLowerCase().includes(challengeId.toLowerCase())
        )
      );

      if (interestedProfiles.length < teamSize) {
        this.logger.warn('Not enough profiles for team formation', 'MatchmakingService', {
          challengeId,
          available: interestedProfiles.length,
          required: teamSize,
        });
        return [];
      }

      const teamRecommendations: any[] = [];
      const combinations = this.generateTeamCombinations(null, interestedProfiles, teamSize);

      for (const combination of combinations.slice(0, maxTeams)) {
        // Calculate team compatibility
        let totalCompatibility = 0;
        let comparisons = 0;

        for (let i = 0; i < combination.length; i++) {
          for (let j = i + 1; j < combination.length; j++) {
            const pairScore = await this.matchmakingAlgorithm.calculateIndividualMatch(
              combination[i], 
              combination[j]
            );
            totalCompatibility += pairScore.overall;
            comparisons++;
          }
        }

        const averageCompatibility = totalCompatibility / comparisons;

        if (averageCompatibility >= 0.6) { // Only include high-quality teams
          teamRecommendations.push({
            teamId: `challenge-${challengeId}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            challengeId,
            participants: combination.map(p => p.email.value),
            participantDetails: combination.map(p => ({
              email: p.email.value,
              fullName: p.fullName,
              skills: p.skills,
              expertiseLevel: p.expertiseLevel,
            })),
            teamSize: combination.length,
            matchScore: {
              overall: averageCompatibility,
              skillsCompatibility: this.calculateTeamSkillsCompatibility(combination),
              experienceBalance: this.calculateTeamExperienceBalance(combination),
              challengeRelevance: this.calculateChallengeRelevance(combination, challengeId),
            },
            reasoning: {
              strengths: this.generateChallengeTeamStrengths(combination, challengeId),
              concerns: this.generateTeamConcerns(combination),
              suggestions: this.generateChallengeTeamSuggestions(combination, challengeId),
            },
            recommendedRoles: this.generateRecommendedRoles(combination),
          });
        }
      }

      // Sort by overall match score
      teamRecommendations.sort((a, b) => b.matchScore.overall - a.matchScore.overall);

      this.logger.info('Challenge team recommendations generated', 'MatchmakingService', {
        challengeId,
        teamsGenerated: teamRecommendations.length,
      });

      return teamRecommendations;
    } catch (error) {
      this.logger.error('Error generating challenge team recommendations', error, 'MatchmakingService', {
        challengeId,
      });
      throw error;
    }
  }

  private removeDuplicateMatches(matches: TeamMatch[]): TeamMatch[] {
    const seen = new Set<string>();
    return matches.filter(match => {
      const key = match.participantEmails
        .map(email => email.value)
        .sort()
        .join(',');
      
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private calculateChallengeRelevance(profiles: any[], challengeId: string): number {
    const relevantProfiles = profiles.filter(profile =>
      profile.challengesInterests?.includes(challengeId) ||
      profile.preferences.interests?.some((interest: string) => 
        interest.toLowerCase().includes(challengeId.toLowerCase())
      )
    );

    return relevantProfiles.length / profiles.length;
  }

  private generateChallengeTeamStrengths(profiles: any[], challengeId: string): string[] {
    const strengths = this.generateTeamStrengths(profiles);
    
    // Add challenge-specific strengths
    const interestedCount = profiles.filter(profile =>
      profile.challengesInterests?.includes(challengeId)
    ).length;

    if (interestedCount === profiles.length) {
      strengths.push(`All team members are specifically interested in challenge: ${challengeId}`);
    } else if (interestedCount > profiles.length / 2) {
      strengths.push(`Majority of team members are interested in challenge: ${challengeId}`);
    }

    return strengths;
  }

  private generateChallengeTeamSuggestions(profiles: any[], challengeId: string): string[] {
    const suggestions = this.generateTeamSuggestions(profiles);
    
    // Add challenge-specific suggestions
    suggestions.push(`Research the specific requirements and constraints for challenge: ${challengeId}`);
    suggestions.push('Identify team members with domain expertise relevant to the challenge theme');
    suggestions.push('Plan early prototype development to validate technical approach');

    return suggestions;
  }

  async generateDiverseTeams(allProfiles: any[], options?: MatchmakingOptions): Promise<any[]> {
    this.logger.info('Generating diverse teams', 'MatchmakingService', {
      totalProfiles: allProfiles.length,
      options,
    });

    try {
      const teams = await this.matchmakingAlgorithm.findDiverseTeams(allProfiles, options);

      this.logger.info('Diverse teams generation completed', 'MatchmakingService', {
        teamsGenerated: teams.length,
      });

      return teams;
    } catch (error) {
      this.logger.error('Error generating diverse teams', error, 'MatchmakingService');
      throw error;
    }
  }
}