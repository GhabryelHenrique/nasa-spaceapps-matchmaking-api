import { Injectable, Inject } from '@nestjs/common';
import type { MatchmakingAlgorithmPort, MatchmakingOptions } from '../../application/ports/matchmaking-algorithm.port';
import type { LoggerPort } from '../../application/ports/logger.port';
import { ParticipantProfile } from '../../domain/entities/participant-profile.entity';
import { TeamMatch } from '../../domain/entities/team-match.entity';
import { Email } from '../../domain/value-objects/email.vo';
import { LOGGER_TOKEN } from '../../application/ports/tokens';
import { logger } from '../config/logger.config';

@Injectable()
export class SimpleMatchmakingAlgorithmAdapter implements MatchmakingAlgorithmPort {
  constructor(@Inject(LOGGER_TOKEN) private readonly logger: LoggerPort) {
    this.logger.info('Simple matchmaking algorithm initialized', 'SimpleMatchmakingAlgorithmAdapter');
  }

  async findDiverseTeams(
    allProfiles: ParticipantProfile[],
    options?: MatchmakingOptions,
  ): Promise<TeamMatch[]> {
    this.logger.info('Finding diverse teams', 'SimpleMatchmakingAlgorithmAdapter', {
      totalProfiles: allProfiles.length,
      options,
    });

    const teamSize = options?.teamSize || 4;
    const teams: TeamMatch[] = [];

    // Separate profiles by age groups to avoid mixing minors with adults
    const minors = allProfiles.filter(p => p.age < 18);
    const adults = allProfiles.filter(p => p.age >= 18);

    // Process female-only teams first (priority)
    const femaleProfiles = allProfiles.filter(p => 
      p.gender === 'feminine' && (p.preferFemaleTeam === true || p.preferFemaleTeam === undefined)
    );
    
    if (femaleProfiles.length >= teamSize) {
      const femaleTeams = this.generateDiverseTeamCombinations(femaleProfiles, teamSize, 'female-only');
      teams.push(...femaleTeams);
    }

    // Process remaining profiles (excluding those already in female-only teams)
    const remainingProfiles = allProfiles.filter(p => 
      !teams.some(team => team.participantEmails.some(email => email.equals(p.email)))
    );

    // Generate mixed teams from adults
    const adultTeams = this.generateDiverseTeamCombinations(
      remainingProfiles.filter(p => p.age >= 18), 
      teamSize, 
      'mixed-adults'
    );
    teams.push(...adultTeams);

    // Generate teams from minors
    if (minors.length >= teamSize) {
      const minorTeams = this.generateDiverseTeamCombinations(
        remainingProfiles.filter(p => p.age < 18), 
        teamSize, 
        'minors-only'
      );
      teams.push(...minorTeams);
    }

    this.logger.info('Diverse teams generated', 'SimpleMatchmakingAlgorithmAdapter', {
      totalTeams: teams.length,
    });

    return teams;
  }

  private generateDiverseTeamCombinations(
    profiles: ParticipantProfile[],
    teamSize: number,
    teamType: string,
  ): TeamMatch[] {
    if (profiles.length < teamSize) return [];

    const teams: TeamMatch[] = [];
    const maxTeams = Math.floor(profiles.length / teamSize);

    // Sort profiles to maximize diversity
    const sortedProfiles = this.sortProfilesForDiversity(profiles);

    for (let teamIndex = 0; teamIndex < maxTeams; teamIndex++) {
      const teamMembers: ParticipantProfile[] = [];
      const startIndex = teamIndex * teamSize;

      // Select team members ensuring maximum diversity
      for (let memberIndex = 0; memberIndex < teamSize; memberIndex++) {
        const profileIndex = (startIndex + memberIndex) % sortedProfiles.length;
        if (sortedProfiles[profileIndex] && !teamMembers.includes(sortedProfiles[profileIndex])) {
          teamMembers.push(sortedProfiles[profileIndex]);
        }
      }

      if (teamMembers.length === teamSize) {
        const diversityScore = this.calculateTeamDiversityScore(teamMembers);
        
        // Only create team if diversity score is acceptable
        if (diversityScore >= 0.6) {
          const teamMatch = TeamMatch.create({
            participantEmails: teamMembers.map(p => p.email),
            matchScore: {
              overall: diversityScore,
              skillsCompatibility: this.calculateTeamSkillsCompatibility(teamMembers),
              experienceBalance: this.calculateExperienceBalance(teamMembers),
              availabilityMatch: 0.8, // Default since we don't have availability
              preferencesAlignment: this.calculateTeamPreferencesAlignment(teamMembers),
              communicationFit: this.calculateTeamCommunicationFit(teamMembers),
            },
            reasoning: {
              strengths: this.generateTeamStrengthsReasons(teamMembers, teamType),
              concerns: this.generateTeamConcernsReasons(teamMembers),
              suggestions: this.generateTeamSuggestionsReasons(teamMembers, teamType),
            },
          });
          teams.push(teamMatch);
        }
      }
    }

    return teams;
  }

  private sortProfilesForDiversity(profiles: ParticipantProfile[]): ParticipantProfile[] {
    // Group profiles by expertise level and skills to ensure diversity
    const grouped = new Map<string, ParticipantProfile[]>();
    
    profiles.forEach(profile => {
      const key = `${profile.expertiseLevel}-${profile.skills.slice(0, 3).join(',')}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(profile);
    });

    // Interleave profiles from different groups to maximize diversity
    const result: ParticipantProfile[] = [];
    const groupArrays = Array.from(grouped.values());
    
    let maxLength = Math.max(...groupArrays.map(arr => arr.length));
    
    for (let i = 0; i < maxLength; i++) {
      groupArrays.forEach(group => {
        if (group[i]) {
          result.push(group[i]);
        }
      });
    }

    return result;
  }

  private calculateTeamDiversityScore(teamMembers: ParticipantProfile[]): number {
    let diversityScore = 0;
    
    // Skills diversity (40% of score)
    const allSkills = new Set<string>();
    teamMembers.forEach(member => {
      member.skills.forEach(skill => allSkills.add(skill.toLowerCase()));
    });
    const skillsDiversity = Math.min(allSkills.size / (teamMembers.length * 3), 1);
    diversityScore += skillsDiversity * 0.4;

    // Experience level diversity (25% of score)
    const experienceLevels = new Set(teamMembers.map(m => m.expertiseLevel));
    const experienceDiversity = experienceLevels.size / 4; // 4 possible levels
    diversityScore += experienceDiversity * 0.25;

    // Education diversity (15% of score)
    const educationAreas = new Set(teamMembers.map(m => m.education.toLowerCase()));
    const educationDiversity = Math.min(educationAreas.size / teamMembers.length, 1);
    diversityScore += educationDiversity * 0.15;

    // Language diversity (10% of score)
    const allLanguages = new Set<string>();
    teamMembers.forEach(member => {
      member.languages.forEach(lang => allLanguages.add(lang.toLowerCase()));
    });
    const languageDiversity = Math.min(allLanguages.size / teamMembers.length, 1);
    diversityScore += languageDiversity * 0.1;

    // Age compatibility (10% of score)
    const ages = teamMembers.map(m => m.age);
    const ageRange = Math.max(...ages) - Math.min(...ages);
    const ageCompatibility = ageRange <= 10 ? 1 : Math.max(0, 1 - (ageRange - 10) / 20);
    diversityScore += ageCompatibility * 0.1;

    return Math.min(diversityScore, 1);
  }

  private getUniqueSkillsCount(teamMembers: ParticipantProfile[]): number {
    const allSkills = new Set<string>();
    teamMembers.forEach(member => {
      member.skills.forEach(skill => allSkills.add(skill.toLowerCase()));
    });
    return allSkills.size;
  }

  private getUniqueExperienceLevels(teamMembers: ParticipantProfile[]): string[] {
    return [...new Set(teamMembers.map(m => m.expertiseLevel))];
  }

  private calculateTeamPreferencesAlignment(teamMembers: ParticipantProfile[]): number {
    // Calculate how well team member preferences align
    const teamSizePrefs = teamMembers.map(m => m.preferences.teamSize);
    const commonTeamSize = teamSizePrefs.filter(size => size === teamSizePrefs[0]).length;
    return commonTeamSize / teamMembers.length;
  }

  private calculateTeamCommunicationFit(teamMembers: ParticipantProfile[]): number {
    // Calculate communication compatibility
    const styles = teamMembers.map(m => m.preferences.communicationStyle);
    const collaborativeCount = styles.filter(s => s === 'collaborative').length;
    return Math.min(collaborativeCount / teamMembers.length * 1.5, 1);
  }

  private generateTeamStrengthsReasons(teamMembers: ParticipantProfile[], teamType: string): string[] {
    const reasons: string[] = [];
    
    const uniqueSkills = this.getUniqueSkillsCount(teamMembers);
    if (uniqueSkills >= teamMembers.length * 2) {
      reasons.push('Diverse technical skillset covering multiple domains');
    }

    const experienceLevels = this.getUniqueExperienceLevels(teamMembers);
    if (experienceLevels.length > 1) {
      reasons.push('Good mix of experience levels for knowledge sharing');
    }

    if (teamType === 'female-only') {
      reasons.push('All-female team promoting gender diversity and inclusion');
    }

    if (teamType === 'minors-only') {
      reasons.push('Age-appropriate team for collaborative learning environment');
    }

    return reasons;
  }

  private generateTeamConcernsReasons(teamMembers: ParticipantProfile[]): string[] {
    const concerns: string[] = [];
    
    const ages = teamMembers.map(m => m.age);
    const ageRange = Math.max(...ages) - Math.min(...ages);
    
    if (ageRange > 15) {
      concerns.push('Large age gap may require additional coordination');
    }

    const commonSkills = new Set<string>();
    teamMembers.forEach(member => {
      member.skills.forEach(skill => {
        if (teamMembers.filter(m => m.skills.includes(skill)).length > 1) {
          commonSkills.add(skill);
        }
      });
    });

    if (commonSkills.size === 0) {
      concerns.push('No overlapping skills may require clear role definition');
    }

    return concerns;
  }

  private generateTeamSuggestionsReasons(teamMembers: ParticipantProfile[], teamType: string): string[] {
    const suggestions: string[] = [];
    
    suggestions.push('Schedule an initial team meeting to align on project goals');
    suggestions.push('Create a skills matrix to identify complementary expertise');

    if (teamType === 'female-only') {
      suggestions.push('Consider mentorship opportunities within the team');
    }

    if (teamType === 'mixed-adults') {
      suggestions.push('Balance workload based on experience levels');
    }

    if (teamType === 'minors-only') {
      suggestions.push('Establish clear communication channels with mentors');
    }

    return suggestions;
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

    logger.debug('ALGORITHM DEBUG: Starting findMatches in SimpleMatchmakingAlgorithmAdapter', {
      participantEmail: participantEmail.value,
      totalProfiles: allProfiles.length,
      options,
      timestamp: new Date().toISOString(),
      method: 'findMatches'
    });

    const targetProfile = allProfiles.find(p => p.email.equals(participantEmail));
    if (!targetProfile) {
      logger.warn('ALGORITHM DEBUG: Target profile not found', {
        email: participantEmail.value,
        availableEmails: allProfiles.map(p => p.email?.value || p.email),
        timestamp: new Date().toISOString()
      });
      
      this.logger.warn('Target profile not found', 'SimpleMatchmakingAlgorithmAdapter', {
        email: participantEmail.value,
      });
      return [];
    }

    logger.debug('ALGORITHM DEBUG: Target profile found', {
      targetEmail: participantEmail.value,
      targetProfile: {
        fullName: targetProfile.fullName,
        skills: targetProfile.skills,
        expertiseLevel: targetProfile.expertiseLevel,
        age: targetProfile.age,
        preferences: targetProfile.preferences
      },
      timestamp: new Date().toISOString()
    });

    const candidateProfiles = allProfiles.filter(p => !p.email.equals(participantEmail));
    const teamSize = options?.teamSize || 4;
    const minMatchScore = options?.minMatchScore || 0.6;

    logger.debug('ALGORITHM DEBUG: Filtering candidate profiles', {
      candidateCount: candidateProfiles.length,
      teamSize,
      minMatchScore,
      candidateEmails: candidateProfiles.map(p => p.email?.value || p.email),
      timestamp: new Date().toISOString()
    });

    // Find best matching candidates
    const scoredCandidates = candidateProfiles.map(candidate => {
      const score = this.calculateIndividualCompatibility(targetProfile, candidate);
      logger.debug('ALGORITHM DEBUG: Individual compatibility calculated', {
        targetEmail: targetProfile.email.value,
        candidateEmail: candidate.email?.value || candidate.email,
        score,
        candidateSkills: candidate.skills,
        candidateExpertise: candidate.expertiseLevel,
        timestamp: new Date().toISOString()
      });
      
      return {
        profile: candidate,
        score,
      };
    })
    .filter(item => {
      const passed = item.score >= minMatchScore;
      logger.debug('ALGORITHM DEBUG: Score filter result', {
        candidateEmail: item.profile.email?.value || item.profile.email,
        score: item.score,
        minRequired: minMatchScore,
        passed,
        timestamp: new Date().toISOString()
      });
      return passed;
    })
    .sort((a, b) => b.score - a.score);

    logger.debug('ALGORITHM DEBUG: Scored candidates after filtering and sorting', {
      qualifyingCandidates: scoredCandidates.length,
      topScores: scoredCandidates.slice(0, 5).map(c => ({
        email: c.profile.email?.value || c.profile.email,
        score: c.score
      })),
      timestamp: new Date().toISOString()
    });

    // Generate team combinations
    const teams = this.generateTeamCombinations(
      targetProfile,
      scoredCandidates.map(item => item.profile),
      teamSize - 1, // -1 because target profile is already included
    );

    logger.debug('ALGORITHM DEBUG: Team combinations generated', {
      teamCombinations: teams.length,
      maxResults: options?.maxResults || 10,
      teamsToProcess: Math.min(teams.length, options?.maxResults || 10),
      timestamp: new Date().toISOString()
    });

    const matches: TeamMatch[] = [];

    for (const team of teams.slice(0, options?.maxResults || 10)) {
      const teamProfiles = [targetProfile, ...team];
      
      logger.debug('ALGORITHM DEBUG: Processing team combination', {
        teamMembers: teamProfiles.map(p => ({
          email: p.email?.value || p.email,
          skills: p.skills,
          expertiseLevel: p.expertiseLevel
        })),
        timestamp: new Date().toISOString()
      });
      
      const matchScore = await this.calculateTeamMatchScore(teamProfiles);
      
      logger.debug('ALGORITHM DEBUG: Team match score calculated', {
        teamEmails: teamProfiles.map(p => p.email?.value || p.email),
        matchScore,
        meetsMinimum: matchScore.overall >= minMatchScore,
        timestamp: new Date().toISOString()
      });
      
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

        logger.debug('ALGORITHM DEBUG: Team match created successfully', {
          matchId: match.id,
          participants: teamProfiles.map(p => p.email?.value || p.email),
          finalScore: matchScore.overall,
          reasoning: reasoning,
          recommendedRoles,
          timestamp: new Date().toISOString()
        });

        matches.push(match);
      }
    }

    this.logger.info('Generated matches for participant', 'SimpleMatchmakingAlgorithmAdapter', {
      email: participantEmail.value,
      matchCount: matches.length,
    });

    logger.debug('ALGORITHM DEBUG: findMatches completed', {
      participantEmail: participantEmail.value,
      totalMatches: matches.length,
      matches: matches.map(m => ({
        id: m.id,
        participants: m.participantEmails?.map(e => e.value) || [],
        score: m.matchScore.overall,
        status: m.status
      })),
      timestamp: new Date().toISOString()
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

    // Preferences alignment (15%)
    const preferencesScore = this.calculatePreferencesAlignment(profile1, profile2);
    score += preferencesScore * 0.15;

    // Communication fit (10%)
    const communicationScore = this.calculateCommunicationFit(profile1, profile2);
    score += communicationScore * 0.1;

    return Math.min(score, 1.0);
  }

  async calculateIndividualMatch(profile1: ParticipantProfile, profile2: ParticipantProfile): Promise<any> {
    const skillsCompatibility = this.calculateSkillsCompatibility(profile1, profile2);
    const experienceBalance = this.calculateExperienceBalance([profile1, profile2]);
    const preferencesAlignment = this.calculatePreferencesAlignment(profile1, profile2);
    const communicationFit = this.calculateCommunicationFit(profile1, profile2);

    const overall = (
      skillsCompatibility * 0.4 +      // Higher weight for skills in 1-on-1 matches
      experienceBalance * 0.25 +
      preferencesAlignment * 0.20 +
      communicationFit * 0.15
    );

    return {
      overall: Math.min(overall, 1.0),
      skillsCompatibility,
      experienceBalance,
      preferencesAlignment,
      communicationFit,
      availabilityMatch: 0.8 // Default since availability was removed
    };
  }

  private async calculateTeamMatchScore(teamProfiles: ParticipantProfile[]): Promise<any> {
    const skillsCompatibility = this.calculateTeamSkillsCompatibility(teamProfiles);
    const experienceBalance = this.calculateExperienceBalance(teamProfiles);
    const preferencesAlignment = this.calculateTeamPreferencesAlignment(teamProfiles);
    const communicationFit = this.calculateTeamCommunicationFit(teamProfiles);

    const overall = (
      skillsCompatibility * 0.3 +
      experienceBalance * 0.25 +
      preferencesAlignment * 0.15 +
      communicationFit * 0.1
    );

    return {
      overall: Math.min(overall, 1.0),
      skillsCompatibility,
      experienceBalance,
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


  private calculateCommunicationFit(profile1: ParticipantProfile, profile2: ParticipantProfile): number {
    const languages1 = new Set(profile1.languages.map(l => l.toLowerCase()));
    const languages2 = new Set(profile2.languages.map(l => l.toLowerCase()));
    
    const commonLanguages = new Set([...languages1].filter(x => languages2.has(x)));
    return commonLanguages.size > 0 ? 1.0 : 0.3; // Assume some basic communication is possible
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

    // Availability analysis removed
    suggestions.push('Consider discussing availability and time commitment expectations during team formation');

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