# Database Schema Documentation

Complete database schema for Able Math system with all entity relationships.

## Entity Overview

The database consists of 8 main entities:

1. **User** - System users (Admin, Teacher, Student)
2. **Test** - Test definitions
3. **TestQuestion** - Questions within tests
4. **StudentAssignment** - Test assignments to students
5. **StudentSubmission** - Student test submissions
6. **StudentAnswer** - Individual question answers
7. **AdtmSubmission** - A-DTM specific grading data
8. **ReportCard** - Generated report cards with analysis

## Entity Relationship Diagram

```
┌──────────────┐
│     User     │
│ (users)      │
├──────────────┤
│ id (UUID)    │──┐
│ username     │  │
│ email        │  │
│ password     │  │
│ fullName     │  │
│ role         │  │
│ school       │  │
│ grade        │  │
│ parentName   │  │
│ parentContact│  │
│ isActive     │  │
│ createdAt    │  │
│ updatedAt    │  │
└──────────────┘  │
                  │
       ┌──────────┴────────┬──────────────────┬────────────────┐
       │                   │                  │                │
       │ creator           │ assignedBy       │ student        │ gradedBy
       ↓                   ↓                  ↓                ↓
┌──────────────┐    ┌────────────────────┐  │          ┌──────────────┐
│     Test     │    │ StudentAssignment  │  │          │StudentSubmission│
│ (tests)      │    │ (student_assignments)│  │         │(student_submissions)│
├──────────────┤    ├────────────────────┤  │          ├──────────────┤
│ id (UUID)    │──┐ │ id (UUID)          │  │          │ id (UUID)    │
│ testCode     │  │ │ testId            ────┘          │ assignmentId │──┐
│ testType     │  │ │ studentId         │──────────────│ studentId    │  │
│ title        │  │ │ assignedById      │              │ testId       │  │
│ grade        │  │ │ deadline          │              │ submittedAt  │  │
│ curriculum   │  │ │ status            │──┐           │ totalScore   │  │
│ semester     │  │ │ createdAt         │  │           │ standardScore│  │
│ term         │  │ │ updatedAt         │  │           │ gradedAt     │  │
│ level        │  │ └────────────────────┘  │           │ gradedById   │  │
│ totalScore   │  │                         │           │ status       │  │
│ status       │  │        submissions      │           │ createdAt    │  │
│ creatorId    │  │      ┌─────────────────┘           │ updatedAt    │  │
│ createdAt    │  │      │                             └──────────────┘  │
│ updatedAt    │  │      │                                    │          │
└──────────────┘  │      │                                    │          │
       │          │      │              ┌─────────────────────┴──┬───────┴─────┐
       │ questions│      │ submissions  │                        │             │
       ↓          │      ↓              │ answers                │ adtmData    │ reportCard
┌──────────────┐  │   (connects to     │                        ↓             ↓
│TestQuestion  │  │    StudentSubmission)              ┌──────────────────┐ ┌──────────────┐
│(test_questions)│ │                                   │ AdtmSubmission   │ │ ReportCard   │
├──────────────┤  │                                   │(adtm_submissions)│ │(report_cards)│
│ id (UUID)    │  │                                   ├──────────────────┤ ├──────────────┤
│ testId       │──┘                                   │ id (UUID)        │ │ id (UUID)    │
│ questionNumber│                                     │ submissionId     │ │ submissionId │
│ sectionNumber│                                      │ testLevel        │ │ studentId    │
│ unitName     │                                      │ concentrationLvl │ │ testId       │
│ questionText │                                      │ currentMood      │ │ reportData   │
│ questionImage│                                      │ expectedScore    │ │ pdfUrl       │
│ correctAnswer│──┐                                   │ section1...      │ │ isPublished  │
│ score        │  │                                   │ section2...      │ │ createdAt    │
│ difficulty   │  │                                   │ section3...      │ │ updatedAt    │
│ createdAt    │  │                                   │ section4...      │ └──────────────┘
│ updatedAt    │  │                                   │ section5...      │
└──────────────┘  │                                   │ overallScore     │
                  │                                   │ createdAt        │
                  │ question                          │ updatedAt        │
                  ↓                                   └──────────────────┘
         ┌──────────────┐
         │StudentAnswer │
         │(student_answers)│
         ├──────────────┤
         │ id (UUID)    │
         │ submissionId │──(references StudentSubmission)
         │ questionId   │
         │ studentAnswer│
         │ scoreEarned  │
         │ isCorrect    │
         │ answerType   │ (for A-DTM Section 1)
         │ createdAt    │
         │ updatedAt    │
         └──────────────┘
```

## Entities Detail

### 1. User Entity
**Table:** `users`

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | UUID | Primary key | PK, Auto-generated |
| username | VARCHAR(30) | Unique username | Unique, Indexed |
| email | VARCHAR | Email address | Unique, Indexed |
| password | VARCHAR | Hashed password | Required |
| fullName | VARCHAR | Full name | Required |
| role | ENUM | User role | Indexed, Default: STUDENT |
| school | VARCHAR | School name | Nullable |
| grade | VARCHAR | Grade level | Nullable |
| parentName | VARCHAR | Parent/Guardian name | Nullable |
| parentContact | VARCHAR | Parent contact info | Nullable |
| isActive | BOOLEAN | Account status | Default: true |
| createdAt | TIMESTAMP | Creation timestamp | Auto |
| updatedAt | TIMESTAMP | Update timestamp | Auto |

**Enums:**
- Role: `ADMIN`, `TEACHER`, `STUDENT`

**Relations:**
- `createdTests` → Test[] (one-to-many)
- `assignedTests` → StudentAssignment[] (one-to-many as student)
- `assignmentsCreated` → StudentAssignment[] (one-to-many as creator)
- `submissions` → StudentSubmission[] (one-to-many as student)
- `gradedSubmissions` → StudentSubmission[] (one-to-many as grader)

---

### 2. Test Entity
**Table:** `tests`

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | UUID | Primary key | PK, Auto-generated |
| testCode | VARCHAR | Unique test code | Unique, Indexed |
| testType | ENUM | Type of test | Indexed |
| title | VARCHAR | Test title | Required |
| grade | VARCHAR | Grade level | Required |
| curriculum | VARCHAR | Curriculum name | Required |
| semester | VARCHAR | Semester | Required |
| term | VARCHAR | Term | Required |
| level | INTEGER | Test level | Required |
| totalScore | INTEGER | Total points | Default: 0 |
| status | ENUM | Test status | Indexed, Default: DRAFT |
| creatorId | UUID | Creator user ID | FK to User |
| createdAt | TIMESTAMP | Creation timestamp | Auto |
| updatedAt | TIMESTAMP | Update timestamp | Auto |

**Enums:**
- TestType: `ACHIEVEMENT`, `ADTM`
- TestStatus: `DRAFT`, `PUBLISHED`, `ARCHIVED`

**Relations:**
- `creator` → User (many-to-one)
- `questions` → TestQuestion[] (one-to-many, cascade)
- `assignments` → StudentAssignment[] (one-to-many)
- `submissions` → StudentSubmission[] (one-to-many)

---

### 3. TestQuestion Entity
**Table:** `test_questions`

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | UUID | Primary key | PK, Auto-generated |
| testId | UUID | Test reference | FK to Test, Indexed |
| questionNumber | INTEGER | Question number | Required |
| sectionNumber | INTEGER | Section number | Required |
| unitName | VARCHAR | Unit name | Nullable |
| questionText | TEXT | Question content | Required |
| questionImage | VARCHAR | Image URL | Nullable |
| correctAnswer | VARCHAR | Correct answer | Required |
| score | INTEGER | Points for question | Required |
| difficulty | ENUM | Difficulty level | Nullable |
| createdAt | TIMESTAMP | Creation timestamp | Auto |
| updatedAt | TIMESTAMP | Update timestamp | Auto |

**Enums:**
- Difficulty: `HIGH`, `MEDIUM`, `LOW`

**Relations:**
- `test` → Test (many-to-one, cascade delete)
- `studentAnswers` → StudentAnswer[] (one-to-many)

---

### 4. StudentAssignment Entity
**Table:** `student_assignments`

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | UUID | Primary key | PK, Auto-generated |
| testId | UUID | Test reference | FK to Test, Indexed |
| studentId | UUID | Student reference | FK to User, Indexed |
| assignedById | UUID | Assigner reference | FK to User |
| deadline | TIMESTAMP | Due date/time | Nullable |
| status | ENUM | Assignment status | Indexed, Default: PENDING |
| createdAt | TIMESTAMP | Creation timestamp | Auto |
| updatedAt | TIMESTAMP | Update timestamp | Auto |

**Enums:**
- AssignmentStatus: `PENDING`, `IN_PROGRESS`, `SUBMITTED`, `GRADED`

**Relations:**
- `test` → Test (many-to-one)
- `student` → User (many-to-one)
- `assignedBy` → User (many-to-one)
- `submissions` → StudentSubmission[] (one-to-many)

---

### 5. StudentSubmission Entity
**Table:** `student_submissions`

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | UUID | Primary key | PK, Auto-generated |
| assignmentId | UUID | Assignment reference | FK to StudentAssignment, Indexed |
| studentId | UUID | Student reference | FK to User, Indexed |
| testId | UUID | Test reference | FK to Test, Indexed |
| submittedAt | TIMESTAMP | Submission time | Nullable |
| totalScore | FLOAT | Total score earned | Nullable |
| standardScore | FLOAT | Normalized score | Nullable |
| gradedAt | TIMESTAMP | Grading time | Nullable |
| gradedById | UUID | Grader reference | FK to User, Nullable |
| status | ENUM | Submission status | Indexed, Default: DRAFT |
| createdAt | TIMESTAMP | Creation timestamp | Auto |
| updatedAt | TIMESTAMP | Update timestamp | Auto |

**Enums:**
- SubmissionStatus: `DRAFT`, `SUBMITTED`, `GRADED`, `PUBLISHED`

**Relations:**
- `assignment` → StudentAssignment (many-to-one)
- `student` → User (many-to-one)
- `test` → Test (many-to-one)
- `gradedBy` → User (many-to-one)
- `answers` → StudentAnswer[] (one-to-many, cascade)
- `adtmData` → AdtmSubmission (one-to-one, cascade)
- `reportCard` → ReportCard (one-to-one, cascade)

---

### 6. StudentAnswer Entity
**Table:** `student_answers`

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | UUID | Primary key | PK, Auto-generated |
| submissionId | UUID | Submission reference | FK to StudentSubmission, Indexed |
| questionId | UUID | Question reference | FK to TestQuestion, Indexed |
| studentAnswer | TEXT | Student's answer | Nullable |
| scoreEarned | FLOAT | Points earned | Nullable |
| isCorrect | BOOLEAN | Correctness flag | Nullable |
| answerType | ENUM | Answer classification | Nullable (A-DTM Section 1) |
| createdAt | TIMESTAMP | Creation timestamp | Auto |
| updatedAt | TIMESTAMP | Update timestamp | Auto |

**Enums:**
- AnswerType: `CORRECT`, `MISTAKE`, `UNSOLVED` (for A-DTM Section 1)

**Relations:**
- `submission` → StudentSubmission (many-to-one, cascade delete)
- `question` → TestQuestion (many-to-one)

---

### 7. AdtmSubmission Entity
**Table:** `adtm_submissions`

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | UUID | Primary key | PK, Auto-generated |
| submissionId | UUID | Submission reference | FK to StudentSubmission, Unique, Indexed |
| testLevel | INTEGER | Test level | Required |
| concentrationLevel | INTEGER | Student concentration | Nullable |
| currentMood | VARCHAR | Student mood | Nullable |
| expectedScore | FLOAT | Expected score | Nullable |
| section1CorrectCount | INTEGER | Section 1 correct | Default: 0 |
| section1MistakeCount | INTEGER | Section 1 mistakes | Default: 0 |
| section1UnsolvedCount | INTEGER | Section 1 unsolved | Default: 0 |
| section1RawScore | FLOAT | Section 1 raw score | Default: 0 |
| section1StandardScore | FLOAT | Section 1 standard score | Default: 0 |
| section2UnitScores | JSONB | Section 2 unit breakdown | Nullable |
| section2RawScore | FLOAT | Section 2 raw score | Default: 0 |
| section2StandardScore | FLOAT | Section 2 standard score | Default: 0 |
| section3UnitScores | JSONB | Section 3 unit breakdown | Nullable |
| section3RawScore | FLOAT | Section 3 raw score | Default: 0 |
| section3StandardScore | FLOAT | Section 3 standard score | Default: 0 |
| section4UnitScores | JSONB | Section 4 unit breakdown | Nullable |
| section4RawScore | FLOAT | Section 4 raw score | Default: 0 |
| section4StandardScore | FLOAT | Section 4 standard score | Default: 0 |
| section5UnitScores | JSONB | Section 5 unit breakdown | Nullable |
| section5RawScore | FLOAT | Section 5 raw score | Default: 0 |
| section5StandardScore | FLOAT | Section 5 standard score | Default: 0 |
| overallStandardScore | FLOAT | Overall score (0-100) | Nullable |
| createdAt | TIMESTAMP | Creation timestamp | Auto |
| updatedAt | TIMESTAMP | Update timestamp | Auto |

**JSON Structure for unitScores:**
```typescript
{
  "unitName": {
    "rawScore": number,
    "maxScore": number
  },
  ...
}
```

**Relations:**
- `submission` → StudentSubmission (one-to-one, cascade delete)

---

### 8. ReportCard Entity
**Table:** `report_cards`

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | UUID | Primary key | PK, Auto-generated |
| submissionId | UUID | Submission reference | FK to StudentSubmission, Unique, Indexed |
| studentId | UUID | Student reference | FK to User, Indexed |
| testId | UUID | Test reference | FK to Test, Indexed |
| reportData | JSONB | Complete report data | Required |
| pdfUrl | VARCHAR | Generated PDF URL | Nullable |
| isPublished | BOOLEAN | Publication status | Default: false |
| createdAt | TIMESTAMP | Creation timestamp | Auto |
| updatedAt | TIMESTAMP | Update timestamp | Auto |

**JSON Structure for reportData:**
```typescript
{
  studentInfo: {
    name: string;
    grade: string;
    school: string;
  };
  testInfo: {
    testCode: string;
    testType: string;
    title: string;
    date: string;
  };
  scores: {
    totalScore: number;
    standardScore: number;
    percentile?: number;
  };
  sectionPerformance?: Array<{
    sectionNumber: number;
    sectionName: string;
    score: number;
    maxScore: number;
    standardScore: number;
    units?: Array<{
      unitName: string;
      score: number;
      maxScore: number;
    }>;
  }>;
  analysis?: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
  adtmData?: {
    recommendedLevel: number;
    concentrationLevel: number;
    section1Analysis: {
      correct: number;
      mistake: number;
      unsolved: number;
    };
  };
}
```

**Relations:**
- `submission` → StudentSubmission (one-to-one, cascade delete)
- `student` → User (many-to-one)
- `test` → Test (many-to-one)

---

## Indexes

**Performance-critical indexes:**

1. `users.username` - For login
2. `users.email` - For email lookup
3. `users.role` - For role-based queries
4. `tests.testCode` - For test lookup
5. `tests.testType` - For filtering by type
6. `tests.status` - For filtering by status
7. `student_assignments.studentId` - For student's assignments
8. `student_assignments.status` - For filtering assignments
9. `student_submissions.studentId` - For student's submissions
10. `student_submissions.status` - For filtering submissions
11. `adtm_submissions.submissionId` - For A-DTM data lookup
12. `report_cards.submissionId` - For report lookup

---

## Cascade Operations

**Delete Cascades:**
- When **Test** is deleted → **TestQuestion** deleted
- When **StudentSubmission** is deleted → **StudentAnswer**, **AdtmSubmission**, **ReportCard** deleted

**Update Cascades:**
- Automatic timestamp updates on all entities

---

## Database Size Estimates

For 1000 students over 1 year:
- **Users:** ~1,000 records (~200 KB)
- **Tests:** ~50-100 records (~50 KB)
- **TestQuestions:** ~4,000-8,000 records (~5 MB)
- **StudentAssignments:** ~10,000 records (~1 MB)
- **StudentSubmissions:** ~10,000 records (~2 MB)
- **StudentAnswers:** ~500,000 records (~100 MB)
- **AdtmSubmissions:** ~2,000 records (~5 MB)
- **ReportCards:** ~10,000 records (~200 MB with JSON)

**Total estimated:** ~500 MB per year

---

## Notes

1. All entities use **UUID** for primary keys for better distribution and security
2. **JSONB** columns in PostgreSQL allow efficient querying of nested data
3. Timestamps are automatically managed by TypeORM
4. Cascade operations ensure data integrity
5. Indexes are placed on frequently queried columns
6. Soft deletes are implemented through `isActive` flag on Users
7. Hard deletes with cascade for test data cleanup

---

*Last Updated: December 2025*

