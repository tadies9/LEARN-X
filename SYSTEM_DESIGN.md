# LEARN-X System Design

## High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                   Users                                   │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
                    ┌─────────────────┴──────────────────┐
                    │                                    │
              ┌─────▼─────┐                      ┌──────▼──────┐
              │  Web App  │                      │ Mobile Web  │
              │ (Next.js) │                      │  (Next.js)  │
              └─────┬─────┘                      └──────┬──────┘
                    │                                    │
                    └─────────────────┬──────────────────┘
                                      │
                              ┌───────▼────────┐
                              │  CloudFlare    │
                              │  CDN + WAF     │
                              └───────┬────────┘
                                      │
                              ┌───────▼────────┐
                              │ Load Balancer  │
                              │    (Nginx)     │
                              └───────┬────────┘
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         │                            │                            │
    ┌────▼─────┐               ┌─────▼──────┐             ┌───────▼───────┐
    │  API     │               │   API      │             │     API       │
    │ Server 1 │               │  Server 2  │             │   Server N    │
    │(Node.js) │               │ (Node.js)  │             │  (Node.js)    │
    └────┬─────┘               └─────┬──────┘             └───────┬───────┘
         │                            │                            │
         └────────────────────────────┼────────────────────────────┘
                                      │
    ┌─────────────────────────────────┴────────────────────────────────┐
    │                         Service Layer                             │
    ├───────────────┬───────────────┬────────────────┬─────────────────┤
    │   Auth        │  Persona      │   Content      │   AI Service    │
    │  Service      │  Service      │   Service      │                 │
    └───────┬───────┴───────┬───────┴────────┬───────┴─────────┬───────┘
            │               │                 │                 │
    ┌───────▼───────────────▼─────────────────▼─────────────────▼───────┐
    │                         Data Access Layer                          │
    │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
    │  │Repository│  │Repository│  │Repository│  │Repository│         │
    │  │   Users  │  │ Personas │  │  Files   │  │Analytics │         │
    │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘         │
    └───────┼──────────────┼──────────────┼──────────────┼──────────────┘
            │              │              │              │
    ┌───────▼──────────────▼──────────────▼──────────────▼───────┐
    │                                                             │
    │                    PostgreSQL + pgvector                    │
    │                     (Primary Database)                      │
    │                                                             │
    └───────┬──────────────────────────────────────────┬──────────┘
            │                                          │
    ┌───────▼───────┐                         ┌───────▼───────┐
    │  Read Replica │                         │   Redis Cache  │
    │  (PostgreSQL) │                         │                │
    └───────────────┘                         └────────────────┘
    
    External Services:
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │   OpenAI     │  │   Supabase   │  │    Stripe    │
    │   GPT-4      │  │Auth & Storage│  │   Payments   │
    └──────────────┘  └──────────────┘  └──────────────┘
```

## Component Details

### 1. Frontend Layer

#### Next.js Application Architecture
```
frontend/
├── app/                    # App Router
│   ├── (auth)/            # Auth group
│   │   ├── login/
│   │   ├── register/
│   │   └── onboarding/
│   ├── (dashboard)/       # Protected routes
│   │   ├── courses/
│   │   ├── study/
│   │   └── analytics/
│   └── api/               # API routes
├── components/
│   ├── ui/                # Radix UI components
│   ├── features/          # Feature components
│   └── layouts/           # Layout components
├── lib/
│   ├── api/              # API client
│   ├── hooks/            # Custom hooks
│   └── utils/            # Utilities
└── store/                # Zustand stores
```

#### Key Frontend Patterns

1. **Route Groups** for layout organization
2. **Server Components** for initial data fetching
3. **Client Components** for interactivity
4. **Streaming SSR** for progressive rendering
5. **Optimistic Updates** for better UX

### 2. API Layer

#### Node.js/Express Architecture
```
backend/
├── src/
│   ├── routes/           # API routes
│   │   ├── auth.routes.ts
│   │   ├── courses.routes.ts
│   │   ├── ai.routes.ts
│   │   └── index.ts
│   ├── controllers/      # Request handlers
│   ├── services/         # Business logic
│   ├── repositories/     # Data access
│   ├── middleware/       # Express middleware
│   ├── utils/           # Utilities
│   └── types/           # TypeScript types
├── migrations/          # Database migrations
└── tests/              # Test files
```

#### Service Layer Design
```typescript
// Example: PersonalizationService
class PersonalizationService {
  constructor(
    private aiService: AIService,
    private personaRepo: PersonaRepository,
    private contentRepo: ContentRepository,
    private cacheService: CacheService
  ) {}

  async personalizeContent(userId: string, fileId: string) {
    // 1. Get user persona
    const persona = await this.personaRepo.findByUserId(userId);
    
    // 2. Get relevant chunks
    const chunks = await this.contentRepo.getRelevantChunks(fileId);
    
    // 3. Check cache
    const cacheKey = `personalized:${userId}:${fileId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;
    
    // 4. Generate personalized content
    const personalized = await this.aiService.transform(
      chunks,
      persona
    );
    
    // 5. Cache result
    await this.cacheService.set(cacheKey, personalized, 3600);
    
    return personalized;
  }
}
```

### 3. Data Layer

#### Database Design Principles

1. **Normalized Schema** for consistency
2. **JSONB columns** for flexible data
3. **Vector columns** for embeddings
4. **Indexes** on frequently queried fields
5. **Partitioning** for large tables (future)

#### Repository Pattern
```typescript
// Example: UserRepository
class UserRepository {
  constructor(private db: DatabaseConnection) {}

  async findById(id: string): Promise<User | null> {
    const result = await this.db.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async create(data: CreateUserDTO): Promise<User> {
    const result = await this.db.query(
      `INSERT INTO users (email, full_name, avatar_url) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [data.email, data.fullName, data.avatarUrl]
    );
    return result.rows[0];
  }

  async updatePersona(userId: string, persona: Persona): Promise<void> {
    await this.db.query(
      `INSERT INTO user_personas (user_id, ...) 
       VALUES ($1, ...) 
       ON CONFLICT (user_id) 
       DO UPDATE SET ...`,
      [userId, ...]
    );
  }
}
```

### 4. AI/ML Pipeline

#### Document Processing Pipeline
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   PDF/Doc    │────▶│   Extract    │────▶│    Clean     │
│   Upload     │     │    Text      │     │    Text      │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
┌──────────────┐     ┌──────────────┐     ┌──────▼───────┐
│   Store in   │◀────│   Generate   │◀────│   Semantic   │
│   pgvector   │     │  Embeddings  │     │   Chunking   │
└──────────────┘     └──────────────┘     └──────────────┘
```

#### Personalization Engine
```
┌────────────────┐
│  User Request  │
└───────┬────────┘
        │
┌───────▼────────┐     ┌──────────────┐
│  Load Persona  │────▶│   Retrieve   │
│    Profile     │     │   Relevant   │
└────────────────┘     │   Chunks     │
                       └───────┬──────┘
                               │
┌────────────────┐     ┌───────▼──────┐
│  Personalized  │◀────│   Apply AI   │
│    Content     │     │Transformation│
└────────────────┘     └──────────────┘
```

### 5. Caching Strategy

#### Multi-Level Cache Architecture
```
Request ──▶ CDN Cache ──▶ Redis Cache ──▶ PostgreSQL
   ▲            │              │              │
   └────────────┴──────────────┴──────────────┘
                     (Cache Miss)
```

#### Cache Invalidation Strategy
```typescript
class CacheService {
  private redis: RedisClient;
  
  // Tagging strategy for group invalidation
  async setWithTags(
    key: string, 
    value: any, 
    ttl: number, 
    tags: string[]
  ): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), 'EX', ttl);
    
    // Store tags for invalidation
    for (const tag of tags) {
      await this.redis.sadd(`tag:${tag}`, key);
      await this.redis.expire(`tag:${tag}`, ttl);
    }
  }
  
  // Invalidate all keys with tag
  async invalidateTag(tag: string): Promise<void> {
    const keys = await this.redis.smembers(`tag:${tag}`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
    await this.redis.del(`tag:${tag}`);
  }
}
```

### 6. Background Job Processing

#### Job Queue Architecture
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   API       │────▶│   Bull      │────▶│   Worker    │
│  Enqueues   │     │   Queue     │     │  Processes  │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                    ┌──────▼──────┐
                    │   Redis      │
                    │  (Storage)   │
                    └─────────────┘
```

#### Worker Implementation
```typescript
// File processing worker
class FileProcessingWorker {
  async process(job: Job<FileProcessingJob>) {
    const { fileId } = job.data;
    
    try {
      // 1. Download file
      await job.updateProgress(10);
      const file = await this.downloadFile(fileId);
      
      // 2. Extract text
      await job.updateProgress(30);
      const text = await this.extractText(file);
      
      // 3. Chunk text
      await job.updateProgress(50);
      const chunks = await this.chunkText(text);
      
      // 4. Generate embeddings
      await job.updateProgress(70);
      const embeddings = await this.generateEmbeddings(chunks);
      
      // 5. Store in database
      await job.updateProgress(90);
      await this.storeChunks(fileId, chunks, embeddings);
      
      // 6. Update status
      await job.updateProgress(100);
      await this.updateFileStatus(fileId, 'completed');
      
    } catch (error) {
      await this.updateFileStatus(fileId, 'failed', error.message);
      throw error;
    }
  }
}
```

### 7. Real-time Features

#### Server-Sent Events for Streaming
```typescript
// AI content streaming
app.get('/api/v1/ai/personalize/stream', async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  const stream = personalizationService.streamContent(
    req.user.id,
    req.query.fileId
  );

  for await (const chunk of stream) {
    res.write(`data: ${JSON.stringify(chunk)}\n\n`);
  }

  res.write('data: {"type": "complete"}\n\n');
  res.end();
});
```

### 8. Security Architecture

#### Defense in Depth
```
┌─────────────────────────────────────────────┐
│             CloudFlare WAF                   │
├─────────────────────────────────────────────┤
│          Rate Limiting (Nginx)               │
├─────────────────────────────────────────────┤
│       JWT Authentication (API)               │
├─────────────────────────────────────────────┤
│    Input Validation (Middleware)             │
├─────────────────────────────────────────────┤
│     Row Level Security (PostgreSQL)          │
├─────────────────────────────────────────────┤
│    Encryption at Rest (Database)             │
└─────────────────────────────────────────────┘
```

#### Authentication Flow
```
┌──────┐     ┌──────────┐     ┌────────┐     ┌──────┐
│Client│────▶│ Supabase │────▶│  API   │────▶│  DB  │
│      │◀────│   Auth   │◀────│ Server │◀────│      │
└──────┘     └──────────┘     └────────┘     └──────┘
   │              │                │              │
   │   Login      │   Validate     │   Create     │
   │   Request    │   Credentials  │   Session    │
   │              │                │              │
   │◀─────────────┴────────────────┴──────────────┘
   │           JWT Token + Refresh Token
```

### 9. Scalability Patterns

#### Horizontal Scaling Strategy
```
                    ┌─────────────┐
                    │Auto Scaling │
                    │   Group     │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐      ┌─────▼─────┐     ┌─────▼─────┐
   │ Server  │      │  Server   │     │  Server   │
   │   #1    │      │    #2     │     │    #N     │
   └─────────┘      └───────────┘     └───────────┘
```

#### Database Scaling
```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Primary   │────▶│ Read Replica │────▶│Read Replica  │
│  (Writes)   │     │     #1       │     │     #2       │
└─────────────┘     └──────────────┘     └──────────────┘
```

### 10. Monitoring & Observability

#### Metrics Collection Architecture
```
┌──────────┐     ┌──────────┐     ┌──────────┐
│   App    │────▶│Prometheus│────▶│ Grafana  │
│ Metrics  │     │ Scraper  │     │Dashboard │
└──────────┘     └──────────┘     └──────────┘
     │
     ├── Response Time
     ├── Error Rate
     ├── Active Users
     ├── AI Token Usage
     └── Business Metrics
```

#### Distributed Tracing
```
Request ID: abc-123
│
├─▶ Frontend (2ms)
│   └─▶ API Gateway (1ms)
│       └─▶ Auth Service (5ms)
│           └─▶ Database (3ms)
│       └─▶ AI Service (450ms)
│           └─▶ OpenAI API (400ms)
│       └─▶ Response (2ms)
│
Total: 463ms
```

### 11. Deployment Pipeline

#### Blue-Green Deployment
```
┌─────────────┐     ┌─────────────┐
│   Blue      │     │   Green     │
│ (Current)   │     │   (New)     │
└──────┬──────┘     └──────┬──────┘
       │                    │
   ┌───▼────────────────────▼───┐
   │      Load Balancer         │
   │   (100% Blue → 100% Green) │
   └────────────────────────────┘
```

#### Rollback Strategy
1. Keep previous version containers running
2. Database migrations must be backward compatible
3. Feature flags for gradual rollout
4. Automated rollback on error threshold

### 12. Disaster Recovery

#### Backup Architecture
```
┌──────────┐     ┌──────────┐     ┌──────────┐
│Production│────▶│ Snapshot │────▶│ Cross-   │
│    DB    │     │  Daily   │     │ Region   │
└──────────┘     └──────────┘     │ Backup   │
                                  └──────────┘
```

#### Recovery Time Objectives
- **RTO**: 1 hour (time to restore service)
- **RPO**: 15 minutes (maximum data loss)
- **Backup Retention**: 30 days
- **Point-in-time Recovery**: 7 days

---

This system design prioritizes:
1. **User Experience**: Fast response times, real-time features
2. **Scalability**: Horizontal scaling at every layer
3. **Reliability**: Multiple redundancy mechanisms
4. **Security**: Defense in depth approach
5. **Maintainability**: Clean architecture, monitoring
6. **Cost Efficiency**: Caching, resource optimization