# LEARN-X API Design Specification

## API Overview

RESTful API following OpenAPI 3.0 specification with JSON responses.

### Base URLs
- Development: `http://localhost:3001/api/v1`
- Staging: `https://api-staging.learn-x.com/v1`
- Production: `https://api.learn-x.com/v1`

### Authentication
All endpoints except `/auth/*` require JWT Bearer token:
```
Authorization: Bearer <jwt_token>
```

## Core API Endpoints

### Authentication

#### POST /auth/register
Create new user account
```json
// Request
{
  "email": "student@example.com",
  "password": "SecurePass123!",
  "fullName": "Sarah Johnson"
}

// Response 201
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "student@example.com",
    "fullName": "Sarah Johnson",
    "subscriptionTier": "free"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 3600
  }
}
```

#### POST /auth/login
Authenticate user
```json
// Request
{
  "email": "student@example.com",
  "password": "SecurePass123!"
}

// Response 200
{
  "user": { ... },
  "tokens": { ... }
}
```

#### POST /auth/refresh
Refresh access token
```json
// Request
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}

// Response 200
{
  "tokens": { ... }
}
```

#### POST /auth/logout
Invalidate refresh token
```json
// Response 204 No Content
```

### User Persona

#### GET /persona
Get current user's persona
```json
// Response 200
{
  "persona": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "professional": {
      "currentRole": "Medical Student",
      "industry": "Healthcare",
      "experienceYears": 2,
      "careerGoals": ["Become a Surgeon", "Research"],
      "technicalLevel": "intermediate"
    },
    "interests": {
      "primary": ["Basketball", "Cooking"],
      "secondary": ["Travel", "Photography"],
      "hobbies": ["Gaming", "Reading"]
    },
    "learningStyle": {
      "primary": "visual",
      "strength": 0.8,
      "secondary": "kinesthetic"
    },
    "contentPreferences": {
      "density": "concise",
      "examplesPerConcept": 2,
      "summaryStyle": "bullet_points"
    },
    "communication": {
      "tone": "friendly",
      "encouragementLevel": "moderate",
      "technicalComfort": 0.7,
      "humorTolerance": "high"
    },
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  }
}
```

#### POST /persona
Create or update user persona
```json
// Request
{
  "professional": {
    "currentRole": "Medical Student",
    "industry": "Healthcare",
    "experienceYears": 2,
    "careerGoals": ["Become a Surgeon"],
    "technicalLevel": "intermediate"
  },
  "interests": {
    "primary": ["Basketball", "Cooking"],
    "secondary": ["Travel", "Photography"]
  },
  "learningStyle": {
    "primary": "visual",
    "secondary": "kinesthetic"
  },
  "contentPreferences": {
    "density": "concise",
    "examplesPerConcept": 2
  },
  "communication": {
    "tone": "friendly",
    "encouragementLevel": "moderate"
  }
}

// Response 200
{
  "persona": { ... }
}
```

### Courses

#### GET /courses
List user's courses
```json
// Query params: ?archived=false&sort=updated_at&order=desc

// Response 200
{
  "courses": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "title": "Biology 101",
      "description": "Introduction to Cell Biology",
      "color": "#4CAF50",
      "icon": "dna",
      "moduleCount": 5,
      "masteryLevel": 0.68,
      "lastAccessedAt": "2024-01-15T14:30:00Z",
      "createdAt": "2024-01-10T10:00:00Z",
      "updatedAt": "2024-01-15T14:30:00Z"
    }
  ],
  "pagination": {
    "total": 12,
    "page": 1,
    "perPage": 20
  }
}
```

#### POST /courses
Create new course
```json
// Request
{
  "title": "Organic Chemistry",
  "description": "Advanced organic chemistry concepts",
  "color": "#FF9800",
  "icon": "flask"
}

// Response 201
{
  "course": { ... }
}
```

#### GET /courses/:courseId
Get course details with modules
```json
// Response 200
{
  "course": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "title": "Biology 101",
    "description": "Introduction to Cell Biology",
    "modules": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440003",
        "title": "Cell Structure",
        "description": "Understanding cell components",
        "orderIndex": 1,
        "fileCount": 3,
        "masteryLevel": 0.85
      }
    ]
  }
}
```

#### PUT /courses/:courseId
Update course
```json
// Request
{
  "title": "Biology 101 - Updated",
  "description": "New description"
}

// Response 200
{
  "course": { ... }
}
```

#### DELETE /courses/:courseId
Archive course (soft delete)
```json
// Response 204 No Content
```

### Modules

#### POST /courses/:courseId/modules
Create module in course
```json
// Request
{
  "title": "Photosynthesis",
  "description": "How plants convert light to energy",
  "orderIndex": 3
}

// Response 201
{
  "module": { ... }
}
```

#### PUT /modules/:moduleId
Update module
```json
// Request
{
  "title": "Updated Module Title",
  "orderIndex": 2
}

// Response 200
{
  "module": { ... }
}
```

#### DELETE /modules/:moduleId
Delete module
```json
// Response 204 No Content
```

### Files

#### POST /modules/:moduleId/files/upload
Upload file to module
```multipart/form-data
file: <binary>
```

```json
// Response 201
{
  "file": {
    "id": "550e8400-e29b-41d4-a716-446655440004",
    "moduleId": "550e8400-e29b-41d4-a716-446655440003",
    "filename": "cell-biology-chapter-1.pdf",
    "fileType": "pdf",
    "fileSizeBytes": 2457600,
    "status": "pending",
    "uploadUrl": "https://storage.learn-x.com/files/...",
    "createdAt": "2024-01-15T15:00:00Z"
  }
}
```

#### GET /files/:fileId
Get file details and processing status
```json
// Response 200
{
  "file": {
    "id": "550e8400-e29b-41d4-a716-446655440004",
    "filename": "cell-biology-chapter-1.pdf",
    "status": "completed",
    "pageCount": 45,
    "wordCount": 12500,
    "extractedTopics": ["Mitochondria", "Cell Membrane", "Nucleus"],
    "difficultyLevel": "intermediate",
    "processingCompletedAt": "2024-01-15T15:05:00Z"
  }
}
```

#### GET /files/:fileId/download
Get signed URL for file download
```json
// Response 200
{
  "downloadUrl": "https://storage.learn-x.com/signed/...",
  "expiresAt": "2024-01-15T15:35:00Z"
}
```

### AI Personalization

#### POST /ai/personalize
Generate personalized content (streaming response)
```json
// Request
{
  "fileId": "550e8400-e29b-41d4-a716-446655440004",
  "options": {
    "sectionTypes": ["introduction", "examples", "practice", "summary"],
    "focusTopics": ["Mitochondria"],
    "targetTime": 30 // minutes
  }
}

// Response 200 (Server-Sent Events)
data: {"type": "status", "message": "Analyzing document..."}

data: {"type": "topics", "topics": ["Mitochondria", "ATP Production", "Cellular Respiration"]}

data: {"type": "section", "sectionType": "introduction", "content": "Let's explore mitochondria..."}

data: {"type": "section", "sectionType": "examples", "content": "Think of mitochondria like..."}

data: {"type": "complete", "message": "Personalization complete"}
```

#### POST /ai/ask
Ask question about content
```json
// Request
{
  "fileId": "550e8400-e29b-41d4-a716-446655440004",
  "question": "How do mitochondria produce ATP?",
  "contextWindow": 5 // number of relevant chunks
}

// Response 200
{
  "answer": "Based on your interest in basketball, think of ATP production like a fast break...",
  "sources": [
    {
      "chunkId": "550e8400-e29b-41d4-a716-446655440005",
      "pageNumber": 12,
      "relevanceScore": 0.92
    }
  ],
  "relatedConcepts": ["Krebs Cycle", "Electron Transport Chain"]
}
```

#### POST /ai/summarize
Generate personalized summary
```json
// Request
{
  "fileId": "550e8400-e29b-41d4-a716-446655440004",
  "summaryType": "key_points", // key_points, comprehensive, exam_prep
  "maxLength": 500 // words
}

// Response 200
{
  "summary": "Here are the key points about cell biology, explained through cooking analogies...",
  "keyTopics": ["Cell Structure", "Organelles", "Cell Division"],
  "estimatedReadTime": 3 // minutes
}
```

### Study Tools

#### POST /study/flashcards/generate
Generate flashcards from content
```json
// Request
{
  "fileId": "550e8400-e29b-41d4-a716-446655440004",
  "count": 20,
  "difficulty": "mixed" // easy, medium, hard, mixed
}

// Response 201
{
  "flashcards": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440006",
      "front": "What is the powerhouse of the cell?",
      "back": "Mitochondria - Like a power plant for your gaming PC, it converts fuel (glucose) into usable energy (ATP)",
      "difficulty": "easy",
      "tags": ["organelles", "energy"]
    }
  ]
}
```

#### POST /study/quiz/generate
Generate quiz questions
```json
// Request
{
  "fileId": "550e8400-e29b-41d4-a716-446655440004",
  "questionCount": 10,
  "questionTypes": ["multiple_choice", "true_false", "short_answer"]
}

// Response 201
{
  "quiz": {
    "id": "550e8400-e29b-41d4-a716-446655440007",
    "questions": [
      {
        "id": "q1",
        "type": "multiple_choice",
        "question": "Which organelle is responsible for protein synthesis?",
        "options": ["Mitochondria", "Ribosomes", "Nucleus", "Lysosomes"],
        "correctAnswer": 1,
        "explanation": "Ribosomes are like the kitchen staff in a restaurant..."
      }
    ]
  }
}
```

### Analytics

#### GET /analytics/dashboard
Get user's learning analytics
```json
// Response 200
{
  "analytics": {
    "learningVelocity": {
      "current": 2.5, // concepts per hour
      "trend": "increasing",
      "percentile": 85 // compared to other users
    },
    "studyTime": {
      "today": 120, // minutes
      "thisWeek": 540,
      "thisMonth": 2400,
      "mostProductiveHour": 14 // 2 PM
    },
    "mastery": {
      "overallProgress": 0.72,
      "strongestSubjects": ["Cell Biology", "Genetics"],
      "weakAreas": ["Organic Chemistry", "Biochemistry"]
    },
    "engagement": {
      "currentStreak": 7, // days
      "longestStreak": 15,
      "questionsAsked": 234,
      "flashcardsReviewed": 567
    }
  }
}
```

#### GET /analytics/progress/:courseId
Get detailed course progress
```json
// Response 200
{
  "progress": {
    "courseId": "550e8400-e29b-41d4-a716-446655440002",
    "overallMastery": 0.68,
    "modules": [
      {
        "moduleId": "550e8400-e29b-41d4-a716-446655440003",
        "title": "Cell Structure",
        "mastery": 0.85,
        "timeSpent": 180, // minutes
        "conceptsMastered": ["Cell Membrane", "Nucleus", "Cytoplasm"],
        "conceptsInProgress": ["Endoplasmic Reticulum"],
        "lastAccessed": "2024-01-15T14:30:00Z"
      }
    ]
  }
}
```

### Search

#### GET /search
Global search across all content
```json
// Query params: ?q=mitochondria&type=all&limit=20

// Response 200
{
  "results": [
    {
      "type": "chunk",
      "id": "550e8400-e29b-41d4-a716-446655440008",
      "fileId": "550e8400-e29b-41d4-a716-446655440004",
      "fileName": "cell-biology-chapter-1.pdf",
      "snippet": "...mitochondria are often called the powerhouse of the cell...",
      "pageNumber": 15,
      "relevanceScore": 0.95
    },
    {
      "type": "flashcard",
      "id": "550e8400-e29b-41d4-a716-446655440006",
      "front": "What is the powerhouse of the cell?",
      "relevanceScore": 0.92
    }
  ],
  "totalResults": 47,
  "nextPage": "/search?q=mitochondria&page=2"
}
```

## Error Responses

All errors follow consistent format:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is already registered",
    "field": "email",
    "timestamp": "2024-01-15T15:00:00Z",
    "requestId": "req_123456"
  }
}
```

### Error Codes
- `VALIDATION_ERROR` - Invalid input data
- `AUTHENTICATION_ERROR` - Invalid credentials
- `AUTHORIZATION_ERROR` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `RATE_LIMIT_ERROR` - Too many requests
- `PROCESSING_ERROR` - File processing failed
- `PAYMENT_REQUIRED` - Subscription limit reached
- `SERVER_ERROR` - Internal server error

## Rate Limiting

| Endpoint | Free Tier | Premium Tier |
|----------|-----------|--------------|
| /ai/personalize | 5/hour | 50/hour |
| /ai/ask | 20/hour | 200/hour |
| /files/upload | 5/day | Unlimited |
| Other endpoints | 100/hour | 1000/hour |

Headers returned:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642255200
```

## Webhooks (Future)

### File Processing Complete
```json
POST https://user-webhook-url.com
{
  "event": "file.processed",
  "data": {
    "fileId": "550e8400-e29b-41d4-a716-446655440004",
    "status": "completed",
    "processedAt": "2024-01-15T15:05:00Z"
  },
  "timestamp": "2024-01-15T15:05:01Z"
}
```

## SDK Examples

### JavaScript/TypeScript
```typescript
import { LearnXClient } from '@learn-x/sdk';

const client = new LearnXClient({
  apiKey: process.env.LEARN_X_API_KEY
});

// Create personalized content
const stream = await client.ai.personalize({
  fileId: 'file_123',
  options: {
    sectionTypes: ['introduction', 'examples']
  }
});

for await (const chunk of stream) {
  console.log(chunk);
}
```

### Python
```python
from learn_x import LearnXClient

client = LearnXClient(api_key=os.environ['LEARN_X_API_KEY'])

# Ask a question
response = client.ai.ask(
    file_id='file_123',
    question='How do mitochondria produce ATP?'
)

print(response.answer)
```

## API Versioning

- Version in URL path: `/v1/`, `/v2/`
- Deprecation notice: 6 months
- Sunset period: 12 months
- Version header: `X-API-Version: 1`

## Best Practices

1. **Pagination**: Use cursor-based pagination for large datasets
2. **Caching**: Respect `Cache-Control` headers
3. **Retries**: Implement exponential backoff
4. **Compression**: Accept gzip encoding
5. **Batch Operations**: Use bulk endpoints when available