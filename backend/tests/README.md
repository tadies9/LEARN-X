# LEARN-X Backend Tests

This directory contains the test suite for the LEARN-X backend system.

## 🧪 Test Types

### Unit Tests

- Located in individual files alongside source code
- Run with: `npm test`

### Integration Tests

- Located in `tests/integration/`
- Comprehensive end-to-end testing
- Run with: `npm run test:integration`

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run all tests
npm run test:all

# Run just integration tests
npm run test:integration

# Run specific integration test suite
npm run test:integration:main
npm run test:integration:api
npm run test:integration:file
npm run test:integration:service
```

## 📋 Integration Test Coverage

✅ **Complete File Processing Flow**

- File upload → Text extraction → Chunking → Embeddings → AI generation

✅ **API Endpoints**

- Health checks, file management, AI content generation

✅ **Service Integration**

- Cross-service communication, database operations, caching

✅ **Error Handling & Performance**

- Edge cases, concurrent operations, large files

## 📚 Documentation

For detailed information about the integration tests:

- See [INTEGRATION_TESTS.md](./INTEGRATION_TESTS.md)

## 🔧 Configuration

Test configuration files:

- `jest.config.js` - Jest configuration
- `.env.test` - Test environment variables
- `setup.ts` - Global test setup and utilities

## 📊 Test Results

Integration tests verify:

- ✅ File upload and processing pipeline
- ✅ Text extraction from PDFs, Word docs, plain text
- ✅ Content chunking and metadata extraction
- ✅ Vector embedding generation
- ✅ AI content creation (summaries, flashcards, quizzes)
- ✅ Database operations and data consistency
- ✅ Queue processing (PGMQ)
- ✅ Redis caching
- ✅ Error handling and recovery
- ✅ Performance under load

Happy testing! 🎯
