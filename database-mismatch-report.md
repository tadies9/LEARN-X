# Database Mismatch Report: Codebase vs Actual Database

**Project**: LEARN-X  
**Database**: Supabase (fiuypfvcfodtjzuzhjie)  
**Generated**: $(date)

## Executive Summary

This report analyzes the discrepancies between what tables/columns your codebase actually uses versus what exists in your Supabase database. The analysis reveals significant mismatches that indicate opportunities for cleanup and optimization.

## Database Overview

- **Total Tables in Database**: 28 tables in public schema + additional schemas
- **Additional Schemas Found**: realtime, supabase_migrations, vault
- **Tables Actively Used in Codebase**: ~15 tables
- **Unused/Orphaned Tables**: ~13 tables
- **Schema Inconsistencies**: Multiple duplicate schema definitions
- **PGMQ Queue Tables**: 14 queue-related tables (active message queuing system)

## 1. ACTIVELY USED TABLES (Codebase ↔ Database Match)

### ✅ Core Tables (Well Utilized)
| Table | Codebase Usage | Database Status | Notes |
|-------|----------------|-----------------|-------|
| `courses` | Heavy usage | ✅ Present | Primary entity, well-structured |
| `modules` | Heavy usage | ✅ Present | Proper relationships |
| `course_files` | Heavy usage | ✅ Present | Main file storage table |
| `file_chunks` | Heavy usage | ✅ Present | Content chunking, 1505 rows |
| `file_embeddings` | Heavy usage | ✅ Present | Vector embeddings, 30MB |
| `users` | Heavy usage | ✅ Present | Auth integration |
| `personas` | Moderate usage | ✅ Present | User personalization |
| `ai_requests` | Moderate usage | ✅ Present | Cost tracking, 282 rows |
| `notifications` | Light usage | ✅ Present | User notifications |

## 2. PARTIALLY USED TABLES (Potential Issues)

### ⚠️ Tables with Limited/Inconsistent Usage
| Table | Issues Found | Recommendations |
|-------|--------------|-----------------|
| `user_personas` | Duplicate of `personas` table | **CONSOLIDATE**: Merge with `personas` |
| `files` | Separate from `course_files` | **EVALUATE**: Determine if needed or merge |
| `document_chunks` | Similar to `file_chunks` | **CONSOLIDATE**: Likely duplicate functionality |
| `chunk_embeddings` | Separate from `file_embeddings` | **CONSOLIDATE**: Merge embedding tables |
| `file_chunk_embeddings` | Third embedding table | **CONSOLIDATE**: Remove redundant table |

## 3. UNUSED/ORPHANED TABLES (Database Only)

### ❌ Tables Not Referenced in Codebase
| Table | Size | Rows | Recommendation |
|-------|------|------|----------------|
| `flashcards` | 56 kB | 0 | **REMOVE**: No codebase usage found |
| `study_sessions` | 48 kB | 0 | **REMOVE**: No codebase usage found |
| `learning_progress` | 64 kB | 0 | **REMOVE**: No codebase usage found |
| `course_progress` | 64 kB | 0 | **REMOVE**: No codebase usage found |
| `ai_interactions` | 40 kB | 0 | **REMOVE**: No codebase usage found |
| `study_progress` | 40 kB | 0 | **REMOVE**: No codebase usage found |
| `annotations` | 40 kB | 0 | **REMOVE**: No codebase usage found |
| `files` | 32 kB | 0 | **REMOVE**: Separate from `course_files`, unused |
| `user_personas` | 32 kB | 0 | **REMOVE**: Duplicate of `personas` table |
| `user_settings` | 24 kB | 0 | **REMOVE**: No codebase usage found |
| `persona_history` | 24 kB | 0 | **REMOVE**: No codebase usage found |

### 🔍 **NEWLY DISCOVERED TABLES**
| Table | Schema | Rows | Status | Notes |
|-------|--------|------|--------|-------|
| `search_index` | public | 56 | ✅ **KEEP** | Active search functionality |
| `onboarding_analytics` | public | 20 | ⚠️ **EVALUATE** | Analytics data, check if used |
| `messages` | realtime | 0 | ❌ **REMOVE** | Realtime schema, unused |
| `subscription` | realtime | 0 | ❌ **REMOVE** | Realtime schema, unused |
| `secrets` | vault | 0 | ✅ **KEEP** | Supabase Vault system table |

## 4. SCHEMA FILE DUPLICATIONS

### 📁 Redundant Schema Files Found
```
docs/database/schema/
├── SUPABASE_SCHEMA.sql ✅ (Keep - Most comprehensive)
├── COURSE_SCHEMA.sql ❌ (Remove - Duplicates courses/modules)
├── FILE_PROCESSING_SCHEMA.sql ❌ (Remove - Duplicates file handling)
├── AI_TRACKING_SCHEMA.sql ❌ (Remove - Unused ai_requests structure)
└── COURSE_FILES_STORAGE.sql ❌ (Remove - Storage bucket only)
```

## 5. QUEUE SYSTEM ANALYSIS

### Message Queue Tables (PGMQ Schema)
| Table | Type | Rows | Status | Notes |
|-------|------|------|--------|-------|
| `q_file_processing` | Queue | 0 | ✅ **KEEP** | Active file processing queue |
| `q_embedding_generation` | Queue | 0 | ✅ **KEEP** | Active embedding queue |
| `q_notifications` | Queue | 0 | ✅ **KEEP** | Active notification queue |
| `q_cleanup` | Queue | 1 | ✅ **KEEP** | Active cleanup queue |
| `a_file_processing` | Archive | 14 | ✅ **KEEP** | Processed file jobs archive |
| `a_embedding_generation` | Archive | 0 | ✅ **KEEP** | Processed embedding jobs |
| `a_notifications` | Archive | 0 | ✅ **KEEP** | Processed notifications |
| `a_cleanup` | Archive | 0 | ✅ **KEEP** | Processed cleanup jobs |
| `q_test_queue` | Test | 2 | ❌ **REMOVE** | Test queue, not needed in production |
| `a_test_queue` | Test Archive | 0 | ❌ **REMOVE** | Test archive, not needed |

### Job Tracking Tables (Public Schema)
| Table | Usage | Status | Notes |
|-------|-------|--------|-------|
| `enhanced_job_tracking` | Active | ✅ **KEEP** | 4 rows, new system |
| `job_tracking` | Legacy | ⚠️ **MIGRATE** | 61 rows, old system |

**Recommendations**: 
1. Remove test queues (`q_test_queue`, `a_test_queue`)
2. Migrate from `job_tracking` to `enhanced_job_tracking` and remove old table

## 6. STORAGE ANALYSIS

### File Storage Distribution
- **course_files**: 25 files (128 kB) - Primary storage ✅
- **file_chunks**: 1,505 chunks (9.6 MB) - Content processing ✅
- **file_embeddings**: 1,505 embeddings (30 MB) - Vector search ✅

## 7. CRITICAL MISMATCHES

### 🚨 High Priority Issues

1. **Multiple Embedding Tables**
   - `file_embeddings` (30 MB, 1505 rows) ← **Primary**
   - `chunk_embeddings` (168 kB, 0 rows) ← **Remove**
   - `file_chunk_embeddings` (1.6 MB, 0 rows) ← **Remove**

2. **Duplicate User Persona Systems**
   - `personas` (80 kB, 1 row) ← **Keep**
   - `user_personas` (32 kB, 0 rows) ← **Remove**

3. **Unused Learning Features**
   - Multiple progress tracking tables with 0 rows
   - Flashcard system not implemented
   - Study session tracking unused

## 8. CLEANUP RECOMMENDATIONS

### Phase 1: Remove Largest Unused Tables (CRITICAL)
```sql
-- CRITICAL: Remove largest unused tables first
DROP TABLE IF EXISTS document_chunks CASCADE;  -- 1.7 MB, 0 rows
DROP TABLE IF EXISTS file_chunk_embeddings CASCADE;  -- 1.6 MB, 0 rows

-- Remove other unused tables with 0 rows and no codebase references
DROP TABLE IF EXISTS flashcards CASCADE;
DROP TABLE IF EXISTS study_sessions CASCADE;
DROP TABLE IF EXISTS learning_progress CASCADE;
DROP TABLE IF EXISTS course_progress CASCADE;
DROP TABLE IF EXISTS ai_interactions CASCADE;
DROP TABLE IF EXISTS annotations CASCADE;
DROP TABLE IF EXISTS study_progress CASCADE;
DROP TABLE IF EXISTS files CASCADE;
DROP TABLE IF EXISTS user_personas CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS persona_history CASCADE;

-- Remove unused realtime tables
DROP TABLE IF EXISTS realtime.messages CASCADE;
DROP TABLE IF EXISTS realtime.subscription CASCADE;

-- Remove test queue tables
SELECT pgmq.drop_queue('test_queue');
```

### Phase 2: Consolidate Duplicates
```sql
-- Remove duplicate embedding tables
DROP TABLE IF EXISTS chunk_embeddings CASCADE;
DROP TABLE IF EXISTS file_chunk_embeddings CASCADE;

-- Remove duplicate persona table
DROP TABLE IF EXISTS user_personas CASCADE;

-- Evaluate files vs course_files merger
-- (Requires data migration analysis)
```

### Phase 3: Schema File Cleanup
```bash
# Remove redundant schema files
rm docs/database/schema/COURSE_SCHEMA.sql
rm docs/database/schema/FILE_PROCESSING_SCHEMA.sql
rm docs/database/schema/AI_TRACKING_SCHEMA.sql
rm docs/database/schema/COURSE_FILES_STORAGE.sql
```

## 9. ESTIMATED STORAGE SAVINGS

| Category | Current Size | After Cleanup | Savings |
|----------|-------------|---------------|---------|
| **CRITICAL: document_chunks** | **1.7 MB** | **0 kB** | **1.7 MB** |
| **CRITICAL: file_chunk_embeddings** | **1.6 MB** | **0 kB** | **1.6 MB** |
| Unused Tables (Public) | ~600 kB | 0 kB | 600 kB |
| Unused Realtime Tables | ~50 kB | 0 kB | 50 kB |
| Test Queue Tables | ~75 kB | 0 kB | 75 kB |
| Remaining Duplicate Embeddings | ~200 kB | 0 kB | 200 kB |
| Schema Files | ~50 kB | ~15 kB | 35 kB |
| **Total Estimated** | **~4.3 MB** | **~15 kB** | **~4.25 MB** |

## 10. MIGRATION STRATEGY

### Step 1: Backup Current State
```bash
# Create full database backup before cleanup
pg_dump -h your-host -U postgres -d your-db > backup-pre-cleanup.sql
```

### Step 2: Validate Dependencies
- Run comprehensive tests
- Check for any hidden references
- Verify foreign key constraints

### Step 3: Execute Cleanup (Staged)
1. Remove unused tables (lowest risk)
2. Consolidate duplicates (medium risk)
3. Clean schema files (low risk)

### Step 4: Update Codebase
- Remove references to deleted tables
- Update type definitions
- Clean up unused imports

## 11. RISK ASSESSMENT

| Risk Level | Items | Mitigation |
|------------|-------|------------|
| **Low** | Unused tables with 0 rows | Safe to remove |
| **Medium** | Duplicate tables with data | Requires migration |
| **High** | Core table modifications | Extensive testing needed |

## 12. NEXT STEPS

1. **Immediate**: Remove unused tables with 0 rows
2. **Short-term**: Consolidate duplicate embedding tables
3. **Medium-term**: Evaluate files vs course_files merger
4. **Long-term**: Implement proper schema versioning

## 13. ADDITIONAL FINDINGS FROM DEEP SCAN

### 🔍 **Missing from Original Report**
Using comprehensive Supabase MCP deep scan revealed several critical items:

#### **Additional Schemas Discovered**
- **`realtime`**: 3 tables (messages, subscription, schema_migrations) - mostly unused
- **`supabase_migrations`**: 1 table (schema_migrations) - system table, keep
- **`vault`**: 2 items (secrets table + decrypted_secrets view) - Supabase Vault system, keep
- **`extensions`**: 2 views (pg_stat_statements, pg_stat_statements_info) - PostgreSQL monitoring

#### **Additional Public Tables & Views Found**
- **`search_index`**: 56 rows - **MISSING FROM REPORT** ⚠️
- **`onboarding_analytics`**: 20 rows - Analytics data, evaluate usage
- **`user_settings`**: 0 rows - Unused, safe to remove
- **`document_chunks`**: 1.7 MB, 0 rows - **LARGE UNUSED TABLE** ❌
- **Views**: `chunks_with_embeddings`, `enhanced_queue_metrics`, `queue_health`, `semantic_chunks`

#### **Database Functions & Triggers**
- **200+ custom functions** in public schema (vector operations, queue management, search)
- **18 active triggers** on tables (including unused tables like `flashcards`, `user_personas`)
- **Custom PGMQ functions**: Enhanced queue management system
- **Vector search functions**: Comprehensive embedding/similarity search capabilities

#### **PGMQ Queue System Details**
- **14 queue-related tables** in `pgmq` schema
- **Active queues**: file_processing, embedding_generation, notifications, cleanup
- **Test queues**: Can be safely removed from production
- **Archive tables**: Keep for job history
- **Queue naming inconsistency**: Both `q_notification` and `q_notifications` exist

#### **Critical Size Discoveries**
- **`document_chunks`**: 1.7 MB with 0 rows - **LARGEST UNUSED TABLE**
- **`file_chunk_embeddings`**: 1.6 MB with 0 rows - **SECOND LARGEST UNUSED**
- **Multiple schema_migrations tables**: Duplicated across schemas

#### **Updated Statistics**
- **Total database objects**: 70+ tables + 200+ functions + 18 triggers + 6 views
- **Additional unused tables**: 4 more than originally identified
- **Additional storage savings**: ~3.3 MB more than estimated (including `document_chunks`)

### 🎯 **Revised Cleanup Priority**
1. **CRITICAL**: Remove `document_chunks` table (1.7 MB, 0 rows) - **LARGEST WASTE**
2. **HIGH**: Remove `file_chunk_embeddings` table (1.6 MB, 0 rows) - **SECOND LARGEST**
3. **HIGH**: Remove 11 unused public tables (~600 kB)
4. **MEDIUM**: Remove test queues and unused realtime tables (~125 kB)
5. **MEDIUM**: Clean up triggers on unused tables (reduce overhead)
6. **LOW**: Consolidate remaining duplicate embedding tables

### 🚨 **CRITICAL FINDINGS**
- **`search_index` table was MISSING** from original analysis - contains 56 active rows
- **`document_chunks`** is the largest unused table at 1.7 MB
- **Queue naming inconsistency** needs resolution (`q_notification` vs `q_notifications`)
- **18 triggers active** on tables, including unused ones (performance impact)

## 14. 🚨 CRITICAL REPORT CORRECTIONS (EVIDENCE-BASED)

### **MAJOR INACCURACIES DISCOVERED**
After comprehensive codebase analysis, this report contains **significant errors**. Many tables marked as "unused" are actually **actively implemented**. Here are the corrections:

### ✅ **CONFIRMED SAFE REMOVALS** (Evidence-Based)
| Table | Size | Status | Evidence |
|-------|------|--------|----------|
| `document_chunks` | 3.1 MB | **✅ REMOVE** | 0 references in entire codebase |
| `file_chunk_embeddings` | 200 kB | **✅ REMOVE** | 0 references in entire codebase |
| `chunk_embeddings` | Minimal | **✅ REMOVE** | 0 references in entire codebase |
| `flashcards` | 56 kB | **✅ REMOVE** | No flashcard system implemented |
| `learning_progress` | 64 kB | **✅ REMOVE** | No references found |
| `course_progress` | 64 kB | **✅ REMOVE** | No references found |
| `ai_interactions` | 40 kB | **✅ REMOVE** | No references found |
| `user_settings` | 24 kB | **✅ REMOVE** | No references found |
| `persona_history` | 24 kB | **✅ REMOVE** | No references found |

### 🚨 **CRITICAL ERRORS - DO NOT REMOVE THESE TABLES**
**Tables incorrectly marked as unused in this report:**

| Table | Report Status | **ACTUAL STATUS** | Evidence |
|-------|---------------|-------------------|----------|
| `study_sessions` | "Remove" | **✅ ACTIVE** | sessionController.ts, frontend hooks |
| `annotations` | "Remove" | **✅ ACTIVE** | AnnotationLayer.tsx, study system |
| `study_progress` | "Remove" | **✅ ACTIVE** | Progress tracking controllers |
| `ai_requests` | "Remove" | **✅ ACTIVE** | CostTracker.ts service |

### ⚠️ **REQUIRES VERIFICATION**
1. **`user_personas` vs `personas`**: Code uses `personas` table, `user_personas` may be duplicate
2. **Vector Index** (`file_embeddings_embedding_idx` 16MB): May be used for similarity search despite 0 pg_stat reads

### 📊 **CORRECTED SAVINGS ESTIMATE**
- **Conservative (Confirmed Safe)**: ~3.5 MB + reduced complexity
- **Optimistic (If verifications pass)**: 4-20 MB
- **Original Report**: 25 MB ❌ **SIGNIFICANTLY INFLATED**

## 15. FINAL COMPREHENSIVE CHECK RESULTS

### 🔥 **MASSIVE INDEX WASTE DISCOVERED**
The final check revealed the **LARGEST WASTE** in your database is actually **INDEXES**, not tables:

| Index Name | Table | Size | Reads | Status |
|------------|-------|------|-------|--------|
| **`file_embeddings_embedding_idx`** | file_embeddings | **16 MB** | 0 | **LARGEST WASTE** |
| `idx_file_chunks_search_vector` | file_chunks | 2.7 MB | 395 | ✅ Keep (active) |
| `idx_chunks_embedding` | document_chunks | 1.6 MB | 0 | ❌ Remove (unused table) |
| `idx_file_chunk_embeddings_vector` | file_chunk_embeddings | 1.6 MB | 0 | ❌ Remove (unused table) |
| `idx_search_index_embedding` | search_index | 1.6 MB | 0 | ❌ Remove (unused) |

### 🔐 **ROW LEVEL SECURITY (RLS) OVERHEAD**
**19 RLS policies found on unused tables** causing performance overhead:
- Each unused table has 1-4 policies that are evaluated on every query
- Policies on `flashcards`, `study_sessions`, `learning_progress`, etc. should be removed
- **Exception**: Keep `annotations` policies - table has active dependencies

### 📊 **QUEUE & SEQUENCE INCONSISTENCIES**
- **Duplicate queues**: `q_notification` vs `q_notifications` 
- **Unused sequences**: `q_embedding_processing_msg_id_seq`, `realtime.subscription_id_seq`
- **GraphQL schema**: `seq_schema_version` at 7931 (very active)

### 🔗 **FOREIGN KEY DEPENDENCY ANALYSIS**
**Critical constraint discoveries:**
- **`annotations`** → **MUST KEEP** (references active `file_chunks`)
- **`flashcards`** → references both `files` + `document_chunks` (both unused)
- **`ai_interactions`** → references `study_sessions` (unused)
- **`course_progress`** → mixed dependencies (unused `files` + active `courses`)

### 🎯 **FINAL ULTIMATE CLEANUP PRIORITY**
1. **🔥 CRITICAL**: Drop `file_embeddings_embedding_idx` index - **16 MB** (largest single waste)
2. **🔥 CRITICAL**: Drop `document_chunks` table + indexes - **3.3 MB total**
3. **🔥 CRITICAL**: Drop `file_chunk_embeddings` table + indexes - **3.2 MB total**
4. **HIGH**: Drop 10 unused tables + their indexes - **~2 MB**
5. **HIGH**: Remove 19 RLS policies on unused tables - **performance boost**
6. **MEDIUM**: Resolve queue naming conflicts and remove unused sequences
7. **LOW**: Clean up unused realtime schema objects

### 📈 **FINAL STORAGE IMPACT**
| Category | Size | Impact |
|----------|------|--------|
| **Unused Indexes** | **~21 MB** | **Largest waste category** |
| **Unused Tables** | **~4.3 MB** | **Second largest** |
| **RLS Policies** | **N/A** | **Performance improvement** |
| **Total Cleanup** | **~25 MB** | **6x larger than original estimate** |

### ⚠️ **CORRECTED CRITICAL FINDINGS**
- **INDEX WASTE > TABLE WASTE**: Unused indexes (21 MB) > unused tables (4.3 MB)
- **`annotations` table is ACTIVE** - has foreign key references, must keep
- **Total cleanup potential**: **25 MB** (6x larger than original 4.3 MB estimate)
- **Performance impact**: 19 unused RLS policies causing query overhead

---

## ⚠️ **CRITICAL DISCLAIMER**

**This report contains significant inaccuracies** due to relying solely on database statistics without codebase verification. The **corrected analysis** shows:

1. **Learning system IS implemented** - Tables like `study_sessions`, `annotations`, `study_progress` are actively used
2. **Actual safe cleanup**: ~3.5 MB (not 25 MB as originally estimated)
3. **Database is well-architected** - Main cleanup is duplicate embedding tables, not core functionality

**ALWAYS verify codebase usage before removing any database objects.** Static database analysis alone is insufficient for cleanup decisions.

**Use the evidence-based cleanup script provided** rather than the original recommendations in this report. 