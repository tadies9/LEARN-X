# Integration Test Suite

This directory contains comprehensive integration tests for the LEARN-X backend system. These tests verify the complete functionality of the file processing pipeline from upload to AI content generation.

## 🎯 Overview

The integration test suite covers the following key areas:

### 1. **Main Flow Integration** (`main-flow.test.ts`)
Tests the complete file processing workflow:
- **File Upload** → **Text Extraction** → **Chunking** → **Embeddings** → **AI Generation**
- Database operations and data consistency
- Queue processing and background jobs
- Error handling and recovery
- Performance under load

### 2. **API Endpoints** (`api-endpoints.test.ts`)
Tests all major API endpoints:
- Health check endpoints
- File management endpoints (upload, list, retrieve)
- AI content generation endpoints (summary, flashcards, quiz, search)
- Error handling and validation
- Concurrent request handling

### 3. **File Processing Flow** (`file-processing-flow.test.ts`)
Tests the file processing pipeline components:
- Text extraction from different file types
- Content sanitization and cleaning
- Metadata extraction
- Content chunking strategies
- Embedding generation and storage
- AI content creation services

### 4. **Service Integration** (`service-integration.test.ts`)
Tests cross-service communication and integration:
- File service integration with database
- AI services integration with Redis caching
- Queue services integration
- Configuration and environment setup
- Error propagation between services

## 🚀 Running Tests

### Prerequisites

1. **Environment Setup**:
   ```bash
   # Copy test environment file
   cp .env.example .env.test
   
   # Update .env.test with test-specific configurations
   ```

2. **Dependencies**:
   ```bash
   npm install
   ```

3. **Database Setup**:
   - Ensure test database is running
   - Run migrations if needed

### Running All Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run all tests (unit + integration)
npm run test:all
```

### Running Specific Test Suites

```bash
# Run main flow tests
npm run test:integration:main
npm run test:integration -- main

# Run API endpoint tests  
npm run test:integration:api
npm run test:integration -- api

# Run file processing tests
npm run test:integration:file
npm run test:integration -- file

# Run service integration tests
npm run test:integration:service
npm run test:integration -- service
```

### Test Runner Options

```bash
# Get help and see available options
npm run test:integration -- --help

# Run with verbose output
npm run test:integration:main -- --verbose

# Run specific test pattern
jest tests/integration/main-flow.test.ts --testNamePattern="should process file"
```

## 📋 Test Structure

### Test Organization

```
backend/tests/
├── setup.ts                           # Global test setup and utilities
├── run-integration-tests.ts           # Test runner orchestrator
├── INTEGRATION_TESTS.md              # This documentation
├── integration/
│   ├── main-flow.test.ts              # End-to-end flow tests
│   ├── api-endpoints.test.ts          # API endpoint tests
│   ├── file-processing-flow.test.ts   # File processing tests
│   └── service-integration.test.ts    # Service integration tests
└── .env.test                          # Test environment configuration
```

### Test Data Management

The test suite uses helper utilities for consistent test data:

```typescript
import { testHelpers } from '../setup';

// Generate test data
const testUser = testHelpers.generateTestUser();
const testCourse = testHelpers.generateTestCourse(userId);
const testModule = testHelpers.generateTestModule(courseId);
const testFile = testHelpers.generateTestFile(moduleId);

// Cleanup after tests
await testHelpers.cleanupTestData();
```

## 🔧 Configuration

### Environment Variables

Test-specific environment variables in `.env.test`:

```bash
# Test Environment
NODE_ENV=test
PORT=8081

# Database (use test database)
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=test_anon_key
SUPABASE_SERVICE_KEY=test_service_key

# Redis (use test database)
REDIS_URL=redis://localhost:6379/1

# Test-specific settings
TEST_TIMEOUT=60000
TEST_DB_CLEANUP=true
MOCK_EXTERNAL_SERVICES=true
```

### Jest Configuration

Key Jest settings for integration tests:

```javascript
// jest.config.js
module.exports = {
  testTimeout: 60000,           // 60 seconds for integration tests
  maxWorkers: 1,                // Sequential execution to avoid conflicts
  detectOpenHandles: true,      // Detect open handles
  forceExit: true,             // Force exit after tests complete
};
```

## 📊 Test Coverage

### What's Tested

✅ **Complete File Processing Flow**
- File upload and validation
- Text extraction (PDF, Word, plain text)
- Content sanitization and cleaning
- Metadata extraction
- Content chunking
- Embedding generation
- AI content creation (summaries, flashcards, quizzes)

✅ **API Endpoints**
- All major REST endpoints
- Request/response validation
- Error handling
- Authentication/authorization
- Rate limiting

✅ **Service Integration**
- Database operations
- Redis caching
- Queue processing (PGMQ)
- Cross-service communication
- Configuration management

✅ **Error Handling**
- Invalid file types
- Processing failures
- Network errors
- Database errors
- Graceful degradation

✅ **Performance**
- Concurrent operations
- Large file handling
- Memory usage
- Response times

### What's NOT Tested

❌ **External Service Integration**
- OpenAI API calls (mocked)
- File storage operations (simulated)
- Third-party services

❌ **UI/Frontend Integration**
- Frontend-backend communication
- User interface interactions

## 🚨 Troubleshooting

### Common Issues

1. **Test Timeout Errors**:
   ```bash
   # Increase timeout for specific tests
   jest tests/integration/main-flow.test.ts --testTimeout=120000
   ```

2. **Database Connection Issues**:
   ```bash
   # Check database connection
   npm run test:integration:service
   ```

3. **Redis Connection Issues**:
   ```bash
   # Verify Redis is running
   redis-cli ping
   ```

4. **File Permission Issues**:
   ```bash
   # Check file permissions
   ls -la backend/tests/
   ```

### Debug Mode

Enable debug output:

```bash
# Run with debug output
DEBUG=* npm run test:integration

# Run specific test with verbose logging
npm run test:integration:main -- --verbose --detectOpenHandles
```

### Test Data Cleanup

If tests leave behind test data:

```bash
# Manual cleanup (run in test environment)
node -e "
const { testHelpers } = require('./tests/setup');
testHelpers.cleanupTestData().then(() => console.log('Cleanup complete'));
"
```

## 📈 Performance Benchmarks

### Expected Performance

| Test Suite | Duration | Memory Usage |
|------------|----------|--------------|
| Main Flow | < 2 min | < 512MB |
| API Endpoints | < 1 min | < 256MB |
| File Processing | < 1.5 min | < 384MB |
| Service Integration | < 1 min | < 256MB |

### Monitoring

Monitor test performance:

```bash
# Run with memory monitoring
npm run test:integration -- --logHeapUsage

# Profile specific test
npm run test:integration:main -- --detectLeaks
```

## 🔄 Continuous Integration

### CI/CD Integration

Add to your CI pipeline:

```yaml
# GitHub Actions example
- name: Run Integration Tests
  run: |
    npm run test:integration
  env:
    NODE_ENV: test
    SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
    REDIS_URL: ${{ secrets.TEST_REDIS_URL }}
```

### Pre-commit Hooks

Add integration tests to pre-commit:

```json
// package.json
{
  "lint-staged": {
    "*.ts": [
      "npm run test:integration:service",
      "git add"
    ]
  }
}
```

## 📚 Best Practices

### Writing Integration Tests

1. **Use Descriptive Test Names**:
   ```typescript
   it('should process file from upload to AI content generation', async () => {
   ```

2. **Test Real Workflows**:
   ```typescript
   // Test complete flow, not isolated units
   const uploadResponse = await uploadFile();
   const processingResult = await waitForProcessing();
   const aiContent = await generateSummary();
   ```

3. **Clean Up Test Data**:
   ```typescript
   afterAll(async () => {
     await testHelpers.cleanupTestData();
   });
   ```

4. **Use Realistic Test Data**:
   ```typescript
   const testPdf = testHelpers.createTestPdfBuffer();
   const largeContent = 'content '.repeat(1000);
   ```

### Debugging Tests

1. **Add Console Logs**:
   ```typescript
   console.log('🚀 Starting file upload test...');
   console.log('✅ File uploaded successfully:', fileId);
   ```

2. **Use Incremental Testing**:
   ```typescript
   // Test each step individually
   expect(uploadResponse.status).toBe(201);
   expect(fileData.processing_status).toBe('completed');
   ```

3. **Verify Intermediate States**:
   ```typescript
   // Check database state between operations
   const { data: fileData } = await supabase
     .from('course_files')
     .select('*')
     .eq('id', fileId)
     .single();
   ```

## 🤝 Contributing

### Adding New Tests

1. **Create Test File**:
   ```bash
   touch backend/tests/integration/new-feature.test.ts
   ```

2. **Update Test Runner**:
   ```typescript
   // Add to tests/run-integration-tests.ts
   const testSuites: TestSuite[] = [
     // ... existing suites
     {
       name: 'New Feature',
       path: 'tests/integration/new-feature.test.ts',
       description: 'Description of new feature tests'
     }
   ];
   ```

3. **Add NPM Script**:
   ```json
   // package.json
   {
     "scripts": {
       "test:integration:newfeature": "jest tests/integration/new-feature.test.ts --verbose"
     }
   }
   ```

### Test Review Checklist

- [ ] Tests cover happy path and error cases
- [ ] Test data is properly cleaned up
- [ ] Tests are deterministic and repeatable
- [ ] Performance is within acceptable limits
- [ ] Documentation is updated

---

## 📞 Support

For questions about the integration tests:

1. Check this documentation
2. Review existing test files for examples
3. Run tests with `--verbose` flag for detailed output
4. Check the troubleshooting section above

Happy testing! 🧪✨ 