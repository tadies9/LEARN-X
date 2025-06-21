# Broken Dependencies and Unused Code Analysis Report

## Summary
This report identifies broken imports, missing dependencies, unused code, and incomplete integrations in the Learn-X codebase.

## 1. TypeScript Compilation Errors

### Backend TypeScript Errors

#### APM Module Export Issues
**Location**: `/backend/src/config/apm/index.ts`

The following types are referenced but not properly exported:
- `AlertRule`, `AlertChannel`, `AlertEvent`, `AlertingConfig` - Referenced from `APMAlertingService` but actually defined in `alerting/types/alerting.types.ts`
- `UserSession`, `PageView`, `WebVitals`, `APICall`, `UserError`, `SessionPerformance`, `RUMConfiguration` - Referenced but not exported from `UnifiedObservabilityService`
- `Dashboard`, `DashboardWidget`, `WidgetConfig`, `DashboardData`, `WidgetData`, `MetricSeries`, `MetricDataPoint` - Referenced but not exported from `APMDashboardService`

**Fix Required**: Update exports in the respective service files or remove these type exports from index.ts

#### Vector Store Type Error
**Location**: `/backend/src/services/vector/optimization/HybridSearchOptimizer.ts:488`
- Invalid Date constructor call with empty object `{}`

### Frontend TypeScript Errors

#### Missing File
**Location**: `/frontend/src/components/sections/pricing-section.tsx`
- File is referenced in tsconfig but doesn't exist
- Either the file was deleted or renamed

## 2. Database Schema Mismatches

### Tables Referenced But Not in Schema
The following tables are referenced in code but don't exist in the current database schema:

1. **generation_jobs** - Referenced in multiple services for AI content generation
2. **generation_results** - Referenced for storing generated content
3. **cache_performance_metrics** - Referenced in cache monitoring services
4. **chunk_embeddings** - Referenced separately from `file_embeddings`
5. **content_feedback** - Referenced for user feedback on generated content
6. **learning_feedback** - Referenced for learning analytics
7. **saved_content** - Referenced for saved user content

### Deprecated Table Reference
- **course-files** (with hyphen) is referenced in some places instead of `course_files`

## 3. Unimplemented External Service Integrations

### Vector Store Implementations (Stub Only)
All of these have stub implementations with TODO comments:

1. **PineconeStore** (`/backend/src/services/vector/stores/PineconeStore.ts`)
   - Missing npm package: `@pinecone-database/pinecone`
   - Environment variables needed: `PINECONE_API_KEY`, `PINECONE_ENVIRONMENT`

2. **QdrantStore** (`/backend/src/services/vector/stores/QdrantStore.ts`)
   - Missing npm package: `@qdrant/js-client`
   - Environment variables needed: `QDRANT_URL`, `QDRANT_API_KEY`

3. **WeaviateStore** (`/backend/src/services/vector/stores/WeaviateStore.ts`)
   - Missing npm package: `weaviate-ts-client`
   - Environment variables needed: `WEAVIATE_URL`, `WEAVIATE_API_KEY`

### APM Provider Implementations (Partial)
1. **DatadogProvider** (`/backend/src/config/apm/providers/DatadogProvider.ts`)
   - Missing npm packages: `dd-trace`, `hot-shots`
   - Environment variables needed: `DD_API_KEY`, `DD_APP_KEY`, `DD_SITE`

2. **NewRelicProvider** (`/backend/src/config/apm/providers/NewRelicProvider.ts`)
   - Has npm package `newrelic` but implementation is partial
   - Environment variables needed: `NEW_RELIC_LICENSE_KEY`, `NEW_RELIC_APP_NAME`

## 4. Unused Dependencies in package.json

### Backend Potentially Unused
- `@types/bull` - Bull is used but might be migrating to pgmq
- `ipaddr.js` - No direct imports found
- `jsonwebtoken` - May be replaced by Supabase auth

### Frontend Potentially Unused
- `@react-pdf/renderer` - PDF viewing uses different library
- Multiple Radix UI components that might not be used

## 5. Test Files and Debug Code in Production

### Test/Debug Files That Should Be Removed
- `/backend/src/routes/test-python-connection.ts`
- `/backend/src/routes/test-sse-debug.ts`
- `/backend/src/routes/test-sse.ts`
- `/test-backend-streaming.js`
- `/test-explain-stream.js`
- `/test-frontend-explain.html`
- `/test-sse-frontend.html`
- `/test-streaming.js`

## 6. Configuration Issues

### Missing Environment Variables
Based on code references, these environment variables are expected but may not be configured:

#### Vector Stores
- `VECTOR_STORE_PROVIDER` - Defaults to 'pgvector' if not set
- Pinecone: `PINECONE_API_KEY`, `PINECONE_ENVIRONMENT`
- Qdrant: `QDRANT_URL`, `QDRANT_API_KEY`
- Weaviate: `WEAVIATE_URL`, `WEAVIATE_API_KEY`

#### APM/Monitoring
- `APM_PROVIDER` - For selecting monitoring provider
- `APM_ENABLED` - To enable/disable APM
- DataDog: `DD_API_KEY`, `DD_APP_KEY`, `DD_SITE`
- New Relic: `NEW_RELIC_LICENSE_KEY`, `NEW_RELIC_APP_NAME`

## 7. Import Path Issues

### Deprecated Import Warning
- `/backend/src/routes/ai-learn/explain.routes.ts:176` - Using deprecated Supabase method

### Unused Variable
- `/frontend/src/app/(dashboard)/courses/[id]/explain/[fileId]/page.tsx:37` - `fileContent` declared but never used

## Recommendations

1. **Immediate Actions**:
   - Fix TypeScript compilation errors in APM module exports
   - Remove or properly implement stub vector store implementations
   - Clean up test files from the repository
   - Fix the missing pricing-section.tsx file reference

2. **Database Schema Updates**:
   - Either implement the missing tables or remove references to them
   - Consider if `generation_jobs` and related tables are needed for the AI features

3. **Dependency Cleanup**:
   - Remove unused npm packages to reduce bundle size
   - Document which external services are actually being used

4. **Code Organization**:
   - Complete the APM provider implementations or remove them
   - Consolidate vector store usage to pgvector if others aren't needed

5. **Environment Configuration**:
   - Document all required environment variables
   - Provide defaults or clear error messages for missing configs