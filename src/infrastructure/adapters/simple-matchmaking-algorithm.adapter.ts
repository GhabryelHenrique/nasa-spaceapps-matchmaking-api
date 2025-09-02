import { Injectable, Inject } from '@nestjs/common';
import type { MatchmakingAlgorithmPort, MatchmakingOptions } from '../../application/ports/matchmaking-algorithm.port';
import type { LoggerPort } from '../../application/ports/logger.port';
import { ParticipantProfile } from '../../domain/entities/participant-profile.entity';
import { TeamMatch } from '../../domain/entities/team-match.entity';
import { Email } from '../../domain/value-objects/email.vo';
import { LOGGER_TOKEN } from '../../application/ports/tokens';

@Injectable()
export class SimpleMatchmakingAlgorithmAdapter implements MatchmakingAlgorithmPort {
  constructor(@Inject(LOGGER_TOKEN) private readonly logger: LoggerPort) {
    this.logger.info('Simple matchmaking algorithm initialized', 'SimpleMatchmakingAlgorithmAdapter');
  }

  async findMatches(
    participantEmail: Email,
    allProfiles: ParticipantProfile[],
    options?: MatchmakingOptions,
  ): Promise<TeamMatch[]> {
    this.logger.info('Finding matches for participant', 'SimpleMatchmakingAlgorithmAdapter', {
      email: participantEmail.value,
      totalProfiles: allProfiles.length,
      options,
    });

    const targetProfile = allProfiles.find(p => p.email.equals(participantEmail));
    if (!targetProfile) {
      this.logger.warn('Target profile not found', 'SimpleMatchmakingAlgorithmAdapter', {
        email: participantEmail.value,
      });
      return [];
    }

    const candidateProfiles = allProfiles.filter(p => !p.email.equals(participantEmail));
    const teamSize = options?.teamSize || 4;
    const minMatchScore = options?.minMatchScore || 0.6;

    // Find best matching candidates
    const scoredCandidates = candidateProfiles.map(candidate => ({
      profile: candidate,
      score: this.calculateIndividualCompatibility(targetProfile, candidate),
    }))
    .filter(item => item.score >= minMatchScore)
    .sort((a, b) => b.score - a.score);

    // Generate team combinations
    const teams = this.generateTeamCombinations(
      targetProfile,
      scoredCandidates.map(item => item.profile),
      teamSize - 1, // -1 because target profile is already included
    );

    const matches: TeamMatch[] = [];

    for (const team of teams.slice(0, options?.maxResults || 10)) {
      const teamProfiles = [targetProfile, ...team];
      const matchScore = await this.calculateTeamMatchScore(teamProfiles);
      
      if (matchScore.overall >= minMatchScore) {
        const reasoning = this.generateMatchReasoning(teamProfiles);
        const recommendedRoles = this.generateRoleRecommendations(teamProfiles);
        
        const match = TeamMatch.create({
          participantEmails: teamProfiles.map(p => p.email),
          matchScore,
          reasoning,
          challengeCategory: options?.challengeCategories?.[0],
          recommendedRoles,
        });

        matches.push(match);
      }
    }

    this.logger.info('Generated matches for participant', 'SimpleMatchmakingAlgorithmAdapter', {
      email: participantEmail.value,
      matchCount: matches.length,
    });

    return matches;
  }

  async calculateMatchScore(
    participant: ParticipantProfile,
    candidates: ParticipantProfile[],
  ): Promise<number> {
    const allProfiles = [participant, ...candidates];
    const matchScore = await this.calculateTeamMatchScore(allProfiles);
    return matchScore.overall;
  }

  async generateTeamRecommendations(
    profiles: ParticipantProfile[],
    teamSize: number = 4,
  ): Promise<TeamMatch[]> {
    this.logger.info('Generating team recommendations', 'SimpleMatchmakingAlgorithmAdapter', {
      profileCount: profiles.length,
      teamSize,
    });

    const recommendations: TeamMatch[] = [];
    const combinations = this.generateTeamCombinations(null, profiles, teamSize);

    for (const team of combinations.slice(0, 20)) { // Limit to 20 recommendations
      const matchScore = await this.calculateTeamMatchScore(team);
      
      if (matchScore.overall >= 0.6) {
        const reasoning = this.generateMatchReasoning(team);
        const recommendedRoles = this.generateRoleRecommendations(team);
        
        const recommendation = TeamMatch.create({
          participantEmails: team.map(p => p.email),
          matchScore,
          reasoning,
          recommendedRoles,
        });

        recommendations.push(recommendation);
      }
    }

    this.logger.info('Generated team recommendations', 'SimpleMatchmakingAlgorithmAdapter', {
      recommendationCount: recommendations.length,
    });

    return recommendations.sort((a, b) => b.matchScore.overall - a.matchScore.overall);
  }

  private calculateIndividualCompatibility(profile1: ParticipantProfile, profile2: ParticipantProfile): number {
    let score = 0;

    // Skills compatibility (30%)
    const skillsScore = this.calculateSkillsCompatibility(profile1, profile2);
    score += skillsScore * 0.3;

    // Experience balance (25%)
    const experienceScore = this.calculateExperienceBalance([profile1, profile2]);
    score += experienceScore * 0.25;

    // Availability match (20%)
    const availabilityScore = this.calculateAvailabilityMatch(profile1, profile2);
    score += availabilityScore * 0.2;

    // Preferences alignment (15%)
    const preferencesScore = this.calculatePreferencesAlignment(profile1, profile2);
    score += preferencesScore * 0.15;

    // Communication fit (10%)
    const communicationScore = this.calculateCommunicationFit(profile1, profile2);
    score += communicationScore * 0.1;

    return Math.min(score, 1.0);
  }

  private async calculateTeamMatchScore(teamProfiles: ParticipantProfile[]): Promise<any> {
    const skillsCompatibility = this.calculateTeamSkillsCompatibility(teamProfiles);
    const experienceBalance = this.calculateExperienceBalance(teamProfiles);
    const availabilityMatch = this.calculateTeamAvailabilityMatch(teamProfiles);
    const preferencesAlignment = this.calculateTeamPreferencesAlignment(teamProfiles);
    const communicationFit = this.calculateTeamCommunicationFit(teamProfiles);

    const overall = (
      skillsCompatibility * 0.3 +
      experienceBalance * 0.25 +
      availabilityMatch * 0.2 +
      preferencesAlignment * 0.15 +
      communicationFit * 0.1
    );

    return {
      overall: Math.min(overall, 1.0),
      skillsCompatibility,
      experienceBalance,
      availabilityMatch,
      preferencesAlignment,
      communicationFit,
    };
  }

  private calculateSkillsCompatibility(profile1: ParticipantProfile, profile2: ParticipantProfile): number {
    const skills1 = new Set(profile1.skills.map(s => s.toLowerCase()));
    const skills2 = new Set(profile2.skills.map(s => s.toLowerCase()));
    
    const intersection = new Set([...skills1].filter(x => skills2.has(x)));
    const union = new Set([...skills1, ...skills2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private calculateTeamSkillsCompatibility(profiles: ParticipantProfile[]): number {
    const allSkills = new Set<string>();
    const skillCoverage = new Map<string, number>();

    profiles.forEach(profile => {
      profile.skills.forEach(skill => {
        const normalizedSkill = skill.toLowerCase();
        allSkills.add(normalizedSkill);
        skillCoverage.set(normalizedSkill, (skillCoverage.get(normalizedSkill) || 0) + 1);
      });
    });

    // Calculate diversity (different skills) and coverage (skill overlap)
    const diversity = allSkills.size / (profiles.length * 5); // Assuming avg 5 skills per person
    const coverage = Array.from(skillCoverage.values()).reduce((sum, count) => sum + (count > 1 ? 0.1 : 0), 0);
    
    return Math.min(diversity + coverage, 1.0);
  }

  private calculateExperienceBalance(profiles: ParticipantProfile[]): number {
    const experienceScores = profiles.map(p => p.getExperienceScore());
    const avgExperience = experienceScores.reduce((sum, score) => sum + score, 0) / profiles.length;
    const variance = experienceScores.reduce((sum, score) => sum + Math.pow(score - avgExperience, 2), 0) / profiles.length;
    
    // Lower variance is better for balance, but some diversity is good
    const balanceScore = Math.max(0, 1 - (variance / 2));
    return Math.min(balanceScore, 1.0);
  }

  private calculateAvailabilityMatch(profile1: ParticipantProfile, profile2: ParticipantProfile): number {
    const hours1 = profile1.availability.hoursPerWeek;
    const hours2 = profile2.availability.hoursPerWeek;
    
    const hoursDiff = Math.abs(hours1 - hours2);
    const hoursScore = Math.max(0, 1 - (hoursDiff / 20)); // 20 hours max difference
    
    const timezone1 = profile1.availability.timezone;
    const timezone2 = profile2.availability.timezone;
    const timezoneScore = timezone1 === timezone2 ? 1.0 : 0.7;
    
    return (hoursScore + timezoneScore) / 2;
  }

  private calculateTeamAvailabilityMatch(profiles: ParticipantProfile[]): number {
    const avgHours = profiles.reduce((sum, p) => sum + p.availability.hoursPerWeek, 0) / profiles.length;
    const hoursVariance = profiles.reduce((sum, p) => sum + Math.pow(p.availability.hoursPerWeek - avgHours, 2), 0) / profiles.length;
    
    const timezones = new Set(profiles.map(p => p.availability.timezone));
    const timezoneScore = timezones.size === 1 ? 1.0 : Math.max(0.5, 1 - (timezones.size - 1) * 0.2);
    
    const hoursScore = Math.max(0, 1 - (Math.sqrt(hoursVariance) / 10));
    
    return (hoursScore + timezoneScore) / 2;
  }

  private calculatePreferencesAlignment(profile1: ParticipantProfile, profile2: ParticipantProfile): number {
    let score = 0;
    let factors = 0;

    // Team size preference compatibility
    const teamSizes = [profile1.preferences.teamSize, profile2.preferences.teamSize];
    if (teamSizes.includes('any') || teamSizes[0] === teamSizes[1]) {
      score += 1;
    } else {
      score += 0.5;
    }
    factors += 1;

    // Communication style compatibility
    const commStyles = [profile1.preferences.communicationStyle, profile2.preferences.communicationStyle];
    const compatibleStyles = {
      'direct': ['direct', 'analytical'],
      'collaborative': ['collaborative', 'supportive'],
      'supportive': ['supportive', 'collaborative'],
      'analytical': ['analytical', 'direct']
    };
    
    if (compatibleStyles[commStyles[0]]?.includes(commStyles[1])) {
      score += 1;
    } else {
      score += 0.3;
    }
    factors += 1;

    return factors > 0 ? score / factors : 0;
  }

  private calculateTeamPreferencesAlignment(profiles: ParticipantProfile[]): number {
    // Check if team size preferences are compatible
    const teamSizePrefs = profiles.map(p => p.preferences.teamSize);
    const actualSize = profiles.length;
    
    const sizeCompatibility = teamSizePrefs.filter(pref => {
      if (pref === 'any') return true;
      if (pref === 'small' && actualSize <= 3) return true;
      if (pref === 'medium' && actualSize >= 3 && actualSize <= 5) return true;
      if (pref === 'large' && actualSize >= 5) return true;
      return false;
    }).length / profiles.length;

    // Check communication style diversity
    const commStyles = profiles.map(p => p.preferences.communicationStyle);
    const uniqueStyles = new Set(commStyles).size;
    const styleBalance = Math.min(uniqueStyles / 3, 1.0); // Optimal is 3 different styles

    return (sizeCompatibility + styleBalance) / 2;
  }

  private calculateCommunicationFit(profile1: ParticipantProfile, profile2: ParticipantProfile): number {
    const languages1 = new Set(profile1.languages.map(l => l.toLowerCase()));
    const languages2 = new Set(profile2.languages.map(l => l.toLowerCase()));
    
    const commonLanguages = new Set([...languages1].filter(x => languages2.has(x)));
    return commonLanguages.size > 0 ? 1.0 : 0.3; // Assume some basic communication is possible
  }

  private calculateTeamCommunicationFit(profiles: ParticipantProfile[]): number {
    const allLanguages = profiles.flatMap(p => p.languages.map(l => l.toLowerCase()));
    const languageCounts = new Map<string, number>();
    
    allLanguages.forEach(lang => {
      languageCounts.set(lang, (languageCounts.get(lang) || 0) + 1);
    });

    const commonLanguages = Array.from(languageCounts.entries()).filter(([, count]) => count === profiles.length);
    return commonLanguages.length > 0 ? 1.0 : 0.7; // Partial communication possible
  }

  private generateTeamCombinations(
    fixedProfile: ParticipantProfile | null,
    availableProfiles: ParticipantProfile[],
    teamSize: number,
  ): ParticipantProfile[][] {
    if (teamSize === 0) return [[]];
    if (availableProfiles.length < teamSize) return [];

    const combinations: ParticipantProfile[][] = [];
    
    for (let i = 0; i <= availableProfiles.length - teamSize; i++) {
      const current = availableProfiles[i];
      const remaining = availableProfiles.slice(i + 1);
      const subCombinations = this.generateTeamCombinations(null, remaining, teamSize - 1);
      
      subCombinations.forEach(subCombo => {
        combinations.push([current, ...subCombo]);
      });
    }

    return combinations.slice(0, 100); // Limit combinations to prevent performance issues
  }

  private generateMatchReasoning(profiles: ParticipantProfile[]): any {
    const strengths: string[] = [];
    const concerns: string[] = [];
    const suggestions: string[] = [];

    // Analyze skills
    const allSkills = new Set(profiles.flatMap(p => p.skills.map(s => s.toLowerCase())));
    if (allSkills.size >= profiles.length * 2) {
      strengths.push('Diverse skill set covering multiple areas');
    }

    // Analyze experience levels
    const experienceLevels = profiles.map(p => p.expertiseLevel);
    const uniqueLevels = new Set(experienceLevels);
    if (uniqueLevels.size > 1) {
      strengths.push('Good balance of experience levels for knowledge sharing');
    }

    // Analyze availability
    const avgHours = profiles.reduce((sum, p) => sum + p.availability.hoursPerWeek, 0) / profiles.length;
    if (avgHours >= 10) {
      strengths.push('Team members have sufficient time commitment');
    } else {
      concerns.push('Limited availability may affect project progress');
    }

    // Analyze communication
    const commonLangs = this.findCommonElements(profiles.map(p => p.languages));
    if (commonLangs.length > 0) {
      strengths.push(`Common language(s): ${commonLangs.join(', ')}`);
    }

    // Generate suggestions
    if (concerns.length > 0) {
      suggestions.push('Consider establishing clear communication channels');
      suggestions.push('Plan for regular check-ins to ensure alignment');
    }

    return { strengths, concerns, suggestions };
  }

  private generateRoleRecommendations(profiles: ParticipantProfile[]): Record<string, string> {
    const roles: Record<string, string> = {};

    profiles.forEach(profile => {
      const workStyle = profile.preferences.workStyle;
      const experienceLevel = profile.expertiseLevel;
      
      if (workStyle === 'leader' || (workStyle === 'facilitator' && experienceLevel === 'expert')) {
        roles[profile.email.value] = 'Team Lead';
      } else if (workStyle === 'specialist' && (experienceLevel === 'advanced' || experienceLevel === 'expert')) {
        roles[profile.email.value] = 'Technical Lead';
      } else if (workStyle === 'facilitator') {
        roles[profile.email.value] = 'Project Coordinator';
      } else {
        roles[profile.email.value] = 'Team Member';
      }
    });

    return roles;
  }

  private findCommonElements<T>(arrays: T[][]): T[] {
    if (arrays.length === 0) return [];
    
    return arrays[0].filter(element =>
      arrays.every(array => array.includes(element))
    );
  }
}