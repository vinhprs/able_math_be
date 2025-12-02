# Able Math Backend

Backend API for Able Math - Math Education Management System

## Tech Stack

- **Framework:** NestJS v10
- **ORM:** TypeORM
- **Database:** PostgreSQL 15
- **Authentication:** JWT (passport-jwt)
- **Validation:** class-validator, class-transformer
- **Language:** TypeScript

## Features

- ✅ User Management (ADMIN, TEACHER, STUDENT roles)
- ✅ JWT Authentication
- ✅ Test Management (Achievement & A-DTM tests)
- ✅ Test Submissions
- ✅ Role-based Access Control
- ✅ Global Error Handling
- ✅ Request Validation
- ✅ Response Transformation

## Getting Started

### Prerequisites

- Node.js >= 18
- PostgreSQL >= 15
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration:
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=able_math

# JWT
JWT_SECRET=your-secret-key

# CORS
CORS_ORIGIN=http://localhost:5173
```

4. Create PostgreSQL database:
```bash
createdb able_math
```

### Running the Application

```bash
# Development
npm run start:dev

# Production build
npm run build
npm run start:prod
```

The API will be available at: `http://localhost:3000/api`

## Project Structure

```
src/
├── config/               # Configuration files
│   ├── app.config.ts
│   ├── database.config.ts
│   ├── jwt.config.ts
│   └── data-source.ts
├── common/               # Shared resources
│   ├── decorators/       # Custom decorators
│   ├── filters/          # Exception filters
│   └── interceptors/     # Response interceptors
├── modules/              # Feature modules
│   ├── auth/            # Authentication module
│   ├── users/           # Users module
│   └── tests/           # Tests module
├── app.module.ts        # Root module
└── main.ts              # Application entry point
```

## API Endpoints

### Authentication

- `POST /api/auth/login` - User login

### Users

- `GET /api/users` - Get all users (ADMIN, TEACHER)
- `GET /api/users/me` - Get current user profile
- `GET /api/users/:id` - Get user by ID (ADMIN, TEACHER)
- `POST /api/users` - Create user (ADMIN)
- `PATCH /api/users/:id` - Update user (ADMIN)
- `DELETE /api/users/:id` - Delete user (ADMIN)

### Tests

- `GET /api/tests` - Get all tests
- `GET /api/tests/:id` - Get test by ID
- `POST /api/tests` - Create test (ADMIN, TEACHER)
- `POST /api/tests/:id/questions` - Add questions to test (ADMIN, TEACHER)
- `DELETE /api/tests/:id` - Delete test (ADMIN)

## Database Schema

### Users Table
- id (UUID)
- username (unique)
- email (unique)
- password (hashed)
- fullName
- role (ADMIN | TEACHER | STUDENT)
- isActive
- timestamps

### Tests Table
- id (UUID)
- testCode (unique)
- title
- description
- testType (ACHIEVEMENT | ADTM)
- gradeLevel
- term
- level
- version
- status (DRAFT | PUBLISHED | ARCHIVED)
- totalScore
- duration
- creatorId
- timestamps

### Test Questions Table
- id (UUID)
- testId
- questionNumber
- section
- unitName
- content
- correctAnswer
- score
- difficulty
- timestamps

### Test Submissions Table
- id (UUID)
- testId
- studentId
- status (NOT_STARTED | IN_PROGRESS | SUBMITTED | GRADED)
- startedAt
- submittedAt
- totalScore
- gradingData (JSONB for A-DTM)
- timestamps

### Submission Answers Table
- id (UUID)
- submissionId
- questionId
- studentAnswer
- isCorrect
- scoreEarned
- timestamps

### Test Assignments Table
- id (UUID)
- testId
- studentId
- assignedBy
- dueDate
- timestamps

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment | development |
| PORT | Server port | 3000 |
| API_PREFIX | API prefix | api |
| DB_HOST | Database host | localhost |
| DB_PORT | Database port | 5432 |
| DB_USERNAME | Database user | postgres |
| DB_PASSWORD | Database password | postgres |
| DB_DATABASE | Database name | able_math |
| JWT_SECRET | JWT secret key | (required) |
| JWT_EXPIRES_IN | JWT expiration | 7d |
| CORS_ORIGIN | CORS origin | http://localhost:5173 |
| BCRYPT_SALT_ROUNDS | Bcrypt salt rounds | 10 |

## Development

### Running Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Linting

```bash
npm run lint
```

### Formatting

```bash
npm run format
```

### Database Migrations

```bash
# Generate migration
npm run migration:generate -- src/migrations/MigrationName

# Run migrations
npm run migration:run

# Revert migration
npm run migration:revert
```

## Authentication

The API uses JWT Bearer token authentication. Include the token in the Authorization header:

```
Authorization: Bearer <token>
```

### Login Flow

1. POST `/api/auth/login` with username and password
2. Receive JWT token and user data
3. Include token in subsequent requests

### Role-based Access

Routes are protected by role:
- `@Roles(UserRole.ADMIN)` - Admin only
- `@Roles(UserRole.ADMIN, UserRole.TEACHER)` - Admin or Teacher
- No decorator - All authenticated users

### Public Routes

Mark routes as public (skip authentication):
```typescript
@Public()
@Get('public-endpoint')
```

## Error Handling

All errors are formatted consistently:

```json
{
  "statusCode": 400,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/endpoint",
  "method": "POST",
  "message": "Error message",
  "error": "Bad Request"
}
```

## Response Format

All successful responses are wrapped:

```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Security

- Passwords hashed with bcrypt (10 salt rounds)
- JWT tokens for authentication
- Input validation with class-validator
- SQL injection protection (TypeORM)
- CORS enabled
- Rate limiting (TODO)

## License

Proprietary - Able Math Team

