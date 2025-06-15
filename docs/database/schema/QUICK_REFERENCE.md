# Database Quick Reference

## 🚀 **Essential Tables**

### Core User Flow
```sql
users → courses → modules → course_files → file_chunks → file_embeddings
```

### Learning Flow
```sql
users → study_sessions → annotations → study_progress
```

## 📊 **Current Database State (19 Tables, 45 MB)**

| Table | Rows | Size | Purpose |
|-------|------|------|---------|
| `file_embeddings` | 1,505 | 30 MB | **Vector search (semantic similarity)** |
| `file_chunks` | 1,505 | 9.6 MB | **Text chunks from files** |
| `search_index` | 56 | 3 MB | **Search performance optimization** |
| `job_tracking` | 61 | 1 MB | Legacy queue system |
| `ai_requests` | 282 | 168 kB | AI cost tracking |
| `course_files` | 25 | 128 kB | **Primary file storage** |
| `enhanced_job_tracking` | 4 | 120 kB | New queue system |
| `courses` | 1 | 96 kB | Course management |
| `notifications` | 6 | 80 kB | User notifications |
| `onboarding_analytics` | 20 | 80 kB | Analytics tracking |
| `personas` | 1 | 80 kB | User personas |
| `persona_history` | 0 | 0 kB | **NEW: Persona evolution tracking** |
| `modules` | 2 | 80 kB | Course modules |
| `users` | 1 | 80 kB | User profiles |
| `files` | 0 | 56 kB | **Legacy (empty, kept for compatibility)** |
| `study_sessions` | 0 | 48 kB | **Active learning system** |
| `annotations` | 0 | 40 kB | **Active annotation system** |
| `study_progress` | 0 | 40 kB | **Active progress tracking** |
| `schema_migrations` | 4 | 32 kB | Migration tracking |
| `persona_history` | 0 | 24 kB | **Persona evolution tracking (ML/analytics)** |

## 📋 **Table Relationships**

### Primary File Storage
- `course_files` (25 rows) - **Primary file storage**
- `files` (0 rows) - Legacy, kept for compatibility

### Content Processing
- `file_chunks` (1,505 rows) - Text chunks from files
- `file_embeddings` (1,505 rows) - Vector embeddings for search

### Learning System (All Active)
- `study_sessions` - User study tracking
- `annotations` - PDF annotations & highlights  
- `study_progress` - Progress tracking per file

## 🔍 **Key Indexes**

### Critical for Performance
```sql
-- Vector search (16MB but essential)
file_embeddings_embedding_idx (ivfflat, vector_cosine_ops)

-- Text search
idx_file_chunks_search_vector (gin, tsvector)

-- Foreign key performance
idx_file_chunks_file_id
idx_file_embeddings_chunk_id
idx_course_files_course_id
```

## 🔐 **Security (RLS Enabled)**

All user tables have Row Level Security:
- Users can only access their own data
- Course files protected by course ownership
- Learning data isolated per user

## 📁 **Storage Buckets**

- `course-files` - File uploads with user-based folder structure

## ⚡ **Performance Notes**

1. **Vector Index**: 16MB but essential for semantic search
2. **Main Storage**: `file_embeddings` (30MB) + `file_chunks` (9.6MB) + `search_index` (3MB) = 42.6MB
3. **Active Systems**: All learning features are implemented and active
4. **Queue Systems**: Both legacy and enhanced job tracking exist

## 🧹 **Post-Cleanup Status**

- ✅ **Removed 9 unused tables** (saved 3.73 MB)
- ✅ **Preserved all active functionality**
- ✅ **19 tables remaining** (all necessary)
- ✅ **Database well-architected** (minimal waste)

## 🔧 **Development Tips**

1. **File References**: Use `course_files` for new features, `files` for legacy compatibility
2. **Vector Search**: `file_embeddings` table powers semantic search
3. **Learning Features**: All study/annotation tables are active and ready
4. **Queue Jobs**: Use `enhanced_job_tracking` for new jobs

## 🔄 **Queue Systems**

### Current State
- `job_tracking` (61 rows) - Legacy system, still active
- `enhanced_job_tracking` (4 rows) - New system, migration pending

### Job Types
- `embedding_generation` - Create vector embeddings
- `file_processing` - Extract text from PDFs
- `notification` - Send user notifications

## 🗂️ **JSONB Fields**

### Flexible Schema Extensions
- `courses.settings` - Course configuration
- `courses.metadata` - Additional course data
- `personas.*` - All persona fields are JSONB
- `file_chunks.metadata` - Chunk-specific data
- `annotations.position` - PDF position data

## 🚨 **Important Notes**

1. **Never delete** `file_embeddings_embedding_idx` - breaks search
2. **Learning system is active** - don't assume tables are unused
3. **Use `course_files`** as primary file reference, not `files`
4. **Vector search requires** pgvector extension
5. **All user data** protected by RLS policies

## 📝 **Common Queries**

### Get user's course files
```sql
SELECT cf.* FROM course_files cf
JOIN courses c ON c.id = cf.course_id
WHERE c.user_id = auth.uid();
```

### Search file content
```sql
SELECT fc.content FROM file_chunks fc
WHERE fc.search_vector @@ plainto_tsquery('search term');
```

### Vector similarity search
```sql
SELECT fc.content FROM file_chunks fc
JOIN file_embeddings fe ON fe.chunk_id = fc.id
ORDER BY fe.embedding <=> $1::vector
LIMIT 10;
``` 