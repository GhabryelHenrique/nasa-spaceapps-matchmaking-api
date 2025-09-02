# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Build and Development
- `npm run build` - Build the project using Nest CLI
- `npm run start:dev` - Start development server with watch mode
- `npm run start:debug` - Start with debugging and watch mode
- `npm run start:prod` - Start production build from dist/

### Code Quality
- `npm run lint` - Run ESLint with auto-fix on TypeScript files
- `npm run format` - Format code using Prettier
- `npm test` - Run Jest unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:cov` - Run tests with coverage report
- `npm run test:e2e` - Run end-to-end tests

## Architecture Overview

This is a **NASA Space Apps Challenge matchmaking API** built with **NestJS** and **TypeScript**, following **Hexagonal Architecture (Clean Architecture)** principles.

### Core Architecture Layers
1. **Domain Layer** (`src/domain/`) - Pure business logic
   - `entities/` - Business entities (User, AuthCode, ParticipantProfile, TeamMatch)
   - `value-objects/` - Immutable value objects (Email, AuthCode)

2. **Application Layer** (`src/application/`) - Use cases and contracts
   - `ports/` - Interface definitions (repositories, services)

3. **Infrastructure Layer** (`src/infrastructure/`) - Technical implementations
   - `adapters/` - External service implementations

4. **Controllers Layer** (`src/controllers/`) - HTTP endpoints
   - `registration.controller.ts` - Authentication and user registration
   - `matchmaking.controller.ts` - Team matchmaking and profile management

### Key Services Structure
- **RegistrationService** - Handles email verification and authentication codes
- **AuthService** - Manages authentication code generation and verification
- **EmailService** - Sends authentication codes via SMTP
- **UserService** - User management and Google Sheets integration
- **MatchmakingService** - Team matching algorithms
- **ParticipantProfileService** - User profile management for matchmaking

### External Dependencies
- **Google Sheets API** - Validates registered participant emails
- **Nodemailer** - SMTP email sending for authentication codes
- **class-validator** - DTO validation with decorators
- **class-transformer** - Object transformation

## Environment Configuration

Required environment variables (see `.env.example`):
- `GOOGLE_SERVICE_ACCOUNT_KEY_FILE` - Path to Google Service Account JSON
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` - Email configuration
- `MONGODB_URI` - MongoDB connection string (supports both local and Atlas)

## Key API Endpoints

### Registration System
- `GET /registration/check-email` - Verify email registration and send auth code
- `POST /registration/verify-code` - Verify authentication code
- `GET /registration/info` - Get user registration information

### Matchmaking System
- `POST /matchmaking/profile` - Create participant profile
- `GET /matchmaking/profile/:email` - Get participant profile
- `POST /matchmaking/find-matches` - Find team matches
- `GET /matchmaking/matches/:email` - Get matches for participant
- `POST /matchmaking/generate-teams` - Generate team recommendations

## Code Patterns

### Validation
- Use class-validator decorators on DTOs
- Controllers use ValidationPipe for automatic validation
- Email validation through Email value object

### Error Handling
- Controllers catch and transform errors to HTTP exceptions
- Domain layer throws descriptive business errors
- Service layer handles integration failures

### Domain-Driven Design
- Value objects for email and auth codes ensure validity
- Entities contain business logic and toJSON() serialization
- Ports define clean interfaces between layers

### Testing
- Jest configuration in package.json with TypeScript support
- Test files use `.spec.ts` extension
- Coverage reports generated in `coverage/` directory