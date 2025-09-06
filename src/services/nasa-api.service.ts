import { Injectable, Inject } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import type { LoggerPort } from '../application/ports/logger.port';
import { LOGGER_TOKEN } from '../application/ports/tokens';

@Injectable()
export class NasaApiService {
  private readonly httpClient: AxiosInstance;

  constructor(@Inject(LOGGER_TOKEN) private readonly logger: LoggerPort) {
    this.httpClient = axios.create({
      baseURL: 'https://api.spaceappschallenge.org/graphql',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    this.logger.info('NASA API service initialized', 'NasaApiService');
  }

  async fetchTeams(limit: number = 100): Promise<any[]> {
    const query = `
      query GetTeams($limit: Int) {
        teams(first: $limit) {
          edges {
            node {
              id
              name
              description
              city
              country
              region
              status
              challengeId
              challenge {
                id
                title
                description
                directorate
              }
              members {
                edges {
                  node {
                    id
                    firstName
                    lastName
                    email
                    country
                    city
                    region
                    bio
                    skills
                    interests
                    linkedinUrl
                    githubUrl
                    portfolioUrl
                    profilePictureUrl
                  }
                }
              }
              createdAt
              updatedAt
            }
          }
        }
      }
    `;

    try {
      this.logger.info('Fetching teams from NASA API', 'NasaApiService', { limit });
      const response = await this.httpClient.post('', {
        query,
        variables: { limit }
      });
      const teams = response.data?.data?.teams?.edges?.map((edge: any) => edge.node) || [];
      this.logger.info('Successfully fetched teams', 'NasaApiService', { count: teams.length });
      return teams;
    } catch (error) {
      this.logger.error('Failed to fetch teams from NASA API', error, 'NasaApiService');
      throw new Error(`Failed to fetch teams: ${error.message}`);
    }
  }

  async fetchParticipants(limit: number = 100): Promise<any[]> {
    const query = `
      query GetParticipants($limit: Int) {
        users(first: $limit) {
          edges {
            node {
              id
              firstName
              lastName
              email
              country
              city
              region
              bio
              skills
              interests
              linkedinUrl
              githubUrl
              portfolioUrl
              profilePictureUrl
              teams {
                edges {
                  node {
                    id
                    name
                    challengeId
                    challenge {
                      id
                      title
                    }
                  }
                }
              }
              createdAt
              updatedAt
            }
          }
        }
      }
    `;

    try {
      this.logger.info('Fetching participants from NASA API', 'NasaApiService', { limit });
      const response = await this.httpClient.post('', {
        query,
        variables: { limit }
      });
      const participants = response.data?.data?.users?.edges?.map((edge: any) => edge.node) || [];
      this.logger.info('Successfully fetched participants', 'NasaApiService', { count: participants.length });
      return participants;
    } catch (error) {
      this.logger.error('Failed to fetch participants from NASA API', error, 'NasaApiService');
      throw new Error(`Failed to fetch participants: ${error.message}`);
    }
  }

  async fetchChallenges(limit: number = 100): Promise<any[]> {
    const query = `
      query GetChallenges($limit: Int) {
        challenges(first: $limit) {
          edges {
            node {
              id
              title
              description
              directorate
              category
              themes
              difficulty
              estimatedTimeHours
              skills
              resources
              prizes
              status
              startDate
              endDate
              createdAt
              updatedAt
            }
          }
        }
      }
    `;

    try {
      this.logger.info('Fetching challenges from NASA API', 'NasaApiService', { limit });
      const response = await this.httpClient.post('', {
        query,
        variables: { limit }
      });
      const challenges = response.data?.data?.challenges?.edges?.map((edge: any) => edge.node) || [];
      this.logger.info('Successfully fetched challenges', 'NasaApiService', { count: challenges.length });
      return challenges;
    } catch (error) {
      this.logger.error('Failed to fetch challenges from NASA API', error, 'NasaApiService');
      throw new Error(`Failed to fetch challenges: ${error.message}`);
    }
  }

  async syncData(): Promise<{
    teams: any[];
    participants: any[];
    challenges: any[];
  }> {
    this.logger.info('Starting NASA API data sync', 'NasaApiService');

    try {
      const [teams, participants, challenges] = await Promise.all([
        this.fetchTeams(),
        this.fetchParticipants(),
        this.fetchChallenges(),
      ]);

      this.logger.info('NASA API data sync completed', 'NasaApiService', {
        teamsCount: teams.length,
        participantsCount: participants.length,
        challengesCount: challenges.length,
      });

      return {
        teams,
        participants,
        challenges,
      };
    } catch (error) {
      this.logger.error('NASA API data sync failed', error, 'NasaApiService');
      throw error;
    }
  }
}