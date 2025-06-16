# Plan to Remove Old AI Endpoints

## Current State
- Old endpoints at `/api/v1/ai/*` still exist alongside new `/api/v1/learn/*` endpoints
- Some frontend code already uses new endpoints, some doesn't

## Migration Steps

### 1. Update Remaining Frontend References
- [x] `useContentStream` - Already updated to use `/api/v1/learn/explain/stream`
- [ ] `useChat` - Still uses `/api/ai/chat`, needs new chat endpoint in learn routes
- [ ] `AIApiService.generateSummary` - Uses `/api/ai/summarize`, should use `/api/v1/learn/explain/stream` with mode='summary'

### 2. Create Missing Endpoints
- [ ] Add chat endpoint to `aiLearnRoutes.ts` using ContentOrchestrator

### 3. Remove Old Backend Code
- [ ] Remove `/api/ai/*` routes from `ai.routes.ts`
- [ ] Remove old controller methods from `aiController.ts`
- [ ] Remove route mounting from `index.ts`

### 4. Test Everything
- [ ] Test explain functionality
- [ ] Test summary functionality  
- [ ] Test chat functionality
- [ ] Test flashcards/quiz functionality