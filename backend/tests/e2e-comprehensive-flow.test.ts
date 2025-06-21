import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import {
  TestDatabase,
  TestRedis,
  TestAPI,
  PerformanceTracker,
  waitForCondition,
  retry,
} from './utils/test-helpers';
import { testConfig } from './config/test.config';
import { E2ETestOrchestrator } from './utils/e2e-test-orchestrator';
import { SystemHealthChecker } from './utils/system-health-checker';
import { DataFlowValidator } from './utils/data-flow-validator';
import { TestReportGenerator } from './utils/test-report-generator';

/**
 * Comprehensive End-to-End Flow Tests for LEARN-X
 *
 * This test suite validates complete user journeys and cross-service integrations:
 * 1. User registration/login flow
 * 2. File upload and processing (Node → PGMQ → Python)
 * 3. AI content generation with personalization
 * 4. Cache utilization and performance
 * 5. Admin dashboard functionality
 * 6. Database operations with optimizations
 * 7. Vector search performance
 * 8. Error handling and monitoring
 */
describe('Comprehensive End-to-End Flow Tests', () => {
  let orchestrator: E2ETestOrchestrator;
  let healthChecker: SystemHealthChecker;
  let dataValidator: DataFlowValidator;
  let reportGenerator: TestReportGenerator;
  let performanceTracker: PerformanceTracker;

  // Test infrastructure
  let db: TestDatabase;
  let redis: TestRedis;
  let api: TestAPI;

  // Test data
  let testUsers: Array<{
    id: string;
    email: string;
    token: string;
    persona: any;
  }>;

  let testCourses: Array<{
    id: string;
    moduleId: string;
    userId: string;
  }>;

  beforeAll(async () => {
    console.log('🚀 Starting Comprehensive E2E Tests...');

    // Initialize test infrastructure
    db = new TestDatabase();
    redis = new TestRedis();
    api = new TestAPI();

    orchestrator = new E2ETestOrchestrator(db, redis, api);
    healthChecker = new SystemHealthChecker();
    dataValidator = new DataFlowValidator(db);
    reportGenerator = new TestReportGenerator();
    performanceTracker = new PerformanceTracker();

    // Pre-flight system health check
    console.log('🔍 Performing pre-flight system health check...');
    const healthStatus = await healthChecker.checkSystemHealth();

    if (!healthStatus.isHealthy) {
      throw new Error(`System not ready for E2E tests: ${healthStatus.issues.join(', ')}`);
    }

    // Initialize test data
    console.log('📋 Setting up test data...');
    testUsers = await orchestrator.createTestUsers(5); // Different personas
    testCourses = await orchestrator.createTestCourses(testUsers);

    // Warm up services
    console.log('🔥 Warming up services...');
    await orchestrator.warmUpServices();

    console.log('✅ E2E Test setup complete');
  }, 60000);

  afterAll(async () => {
    console.log('🧹 Cleaning up E2E tests...');

    // Generate final test report
    const report = reportGenerator.generateFinalReport();
    console.log('📊 Final Test Report:', JSON.stringify(report, null, 2));

    // Cleanup
    await orchestrator.cleanup();
    await db.cleanup();
    await redis.cleanup();
    await redis.disconnect();

    console.log('✅ E2E Test cleanup complete');
  }, 30000);

  beforeEach(async () => {
    // Reset performance tracking for each test
    performanceTracker = new PerformanceTracker();
    reportGenerator.startTestCase();
  });

  describe('Complete User Journey Tests', () => {
    test('Full User Journey: Registration → Upload → AI Generation → Personalization', async () => {
      performanceTracker.start('full-user-journey');
      const testCase = 'full-user-journey';

      try {
        // 1. User Registration/Login Flow
        console.log('👤 Testing user registration/login flow...');
        performanceTracker.start('user-auth');

        const userJourney = await orchestrator.simulateNewUserJourney({
          email: `journey-test-${Date.now()}@example.com`,
          persona: {
            learning_style: 'visual',
            expertise_level: 'intermediate',
            interests: ['machine learning', 'data science'],
            communication_preference: 'detailed',
            goals: ['certification', 'career_advancement'],
          },
        });

        performanceTracker.end('user-auth');
        expect(userJourney.authToken).toBeDefined();
        expect(userJourney.userId).toBeDefined();

        reportGenerator.recordSuccess(testCase, 'user-registration');

        // 2. File Upload and Processing Flow
        console.log('📁 Testing file upload and processing...');
        performanceTracker.start('file-processing');

        const fileProcessingResults = await orchestrator.processMultipleFiles(
          userJourney.userId,
          userJourney.courseId,
          [
            { content: 'Machine learning fundamentals...', filename: 'ml-basics.txt' },
            { content: 'Neural networks and deep learning...', filename: 'neural-networks.txt' },
            { content: 'Data preprocessing techniques...', filename: 'data-prep.txt' },
          ],
          userJourney.authToken
        );

        performanceTracker.end('file-processing');

        // Validate file processing pipeline
        for (const result of fileProcessingResults) {
          expect(result.processingStatus).toBe('completed');
          expect(result.chunks).toHaveLength.toBeGreaterThan(0);
          expect(result.embeddings).toBeDefined();
          expect(result.aiContent).toBeDefined();
        }

        reportGenerator.recordSuccess(testCase, 'file-processing');

        // 3. AI Content Generation with Personalization
        console.log('🤖 Testing AI content generation with personalization...');
        performanceTracker.start('ai-generation');

        const aiResults = await orchestrator.generatePersonalizedContent(
          fileProcessingResults[0].fileId,
          userJourney.persona,
          userJourney.authToken
        );

        performanceTracker.end('ai-generation');

        // Validate personalization
        expect(aiResults.summary).toContain('visual');
        expect(aiResults.flashcards).toHaveLength.toBeGreaterThan(0);
        expect(aiResults.quiz.questions).toHaveLength.toBeGreaterThan(0);
        expect(aiResults.studyGuide).toBeDefined();
        expect(aiResults.metadata.personalization_applied).toBe(true);

        reportGenerator.recordSuccess(testCase, 'ai-generation');

        // 4. Cache Utilization Testing
        console.log('💾 Testing cache utilization...');
        performanceTracker.start('cache-testing');

        const cacheResults = await orchestrator.testCacheEffectiveness(
          fileProcessingResults[0].fileId,
          userJourney.authToken
        );

        performanceTracker.end('cache-testing');

        expect(cacheResults.cacheHitRate).toBeGreaterThan(0.5);
        expect(cacheResults.avgResponseTime).toBeLessThan(
          testConfig.performance.apiResponseThreshold
        );

        reportGenerator.recordSuccess(testCase, 'cache-utilization');

        // 5. Vector Search Performance
        console.log('🔍 Testing vector search performance...');
        performanceTracker.start('vector-search');

        const searchResults = await orchestrator.testVectorSearchPerformance(
          userJourney.userId,
          'machine learning algorithms',
          userJourney.authToken
        );

        performanceTracker.end('vector-search');

        expect(searchResults.results).toHaveLength.toBeGreaterThan(0);
        expect(searchResults.responseTime).toBeLessThan(testConfig.performance.searchThreshold);
        expect(searchResults.relevanceScore).toBeGreaterThan(0.7);

        reportGenerator.recordSuccess(testCase, 'vector-search');

        // 6. Data Flow Validation
        console.log('📊 Validating data flow integrity...');
        const dataFlowResults = await dataValidator.validateCompleteDataFlow(
          userJourney.userId,
          fileProcessingResults[0].fileId
        );

        expect(dataFlowResults.personaDataFlow).toBe(true);
        expect(dataFlowResults.fileMetadataFlow).toBe(true);
        expect(dataFlowResults.costTrackingFlow).toBe(true);
        expect(dataFlowResults.performanceMetricsFlow).toBe(true);

        reportGenerator.recordSuccess(testCase, 'data-flow-validation');

        performanceTracker.end('full-user-journey');

        // Performance assertions
        const report = performanceTracker.getReport();
        expect(report['full-user-journey'].duration).toBeLessThan(120000); // 2 minutes max
        expect(report['user-auth'].duration).toBeLessThan(5000);
        expect(report['file-processing'].duration).toBeLessThan(30000);
        expect(report['ai-generation'].duration).toBeLessThan(15000);

        reportGenerator.recordPerformanceMetrics(testCase, report);

        console.log('✅ Full user journey test completed successfully');
      } catch (error) {
        reportGenerator.recordFailure(testCase, error as Error);
        throw error;
      }
    }, 180000); // 3 minute timeout

    test('Concurrent User Journeys with Load Testing', async () => {
      performanceTracker.start('concurrent-journeys');
      const testCase = 'concurrent-journeys';

      try {
        console.log('👥 Testing concurrent user journeys...');

        // Simulate 10 concurrent users
        const concurrentUsers = Array.from({ length: 10 }, (_, i) => ({
          email: `concurrent-user-${i}-${Date.now()}@example.com`,
          persona: {
            learning_style: ['visual', 'auditory', 'kinesthetic'][i % 3],
            expertise_level: ['beginner', 'intermediate', 'expert'][i % 3],
            interests: [
              ['programming', 'web development'],
              ['data science', 'machine learning'],
              ['cybersecurity', 'networking'],
            ][i % 3],
          },
        }));

        const journeyPromises = concurrentUsers.map((user) =>
          orchestrator.simulateCompleteUserJourney(user)
        );

        const results = await Promise.all(journeyPromises);
        performanceTracker.end('concurrent-journeys');

        // Validate all journeys completed successfully
        results.forEach((result, index) => {
          expect(result.success).toBe(true);
          expect(result.fileProcessed).toBe(true);
          expect(result.aiContentGenerated).toBe(true);
          expect(result.cacheUtilized).toBe(true);
        });

        // Performance validation
        const report = performanceTracker.getReport();
        expect(report['concurrent-journeys'].duration).toBeLessThan(300000); // 5 minutes max

        reportGenerator.recordSuccess(testCase, 'concurrent-execution');
        reportGenerator.recordPerformanceMetrics(testCase, report);

        console.log('✅ Concurrent user journeys test completed successfully');
      } catch (error) {
        reportGenerator.recordFailure(testCase, error as Error);
        throw error;
      }
    }, 360000); // 6 minute timeout
  });

  describe('Cross-Service Integration Tests', () => {
    test('Frontend → Node.js → Python AI Service Integration', async () => {
      performanceTracker.start('cross-service-integration');
      const testCase = 'cross-service-integration';

      try {
        console.log('🔄 Testing cross-service integration...');

        const integrationResults = await orchestrator.testCrossServiceIntegration(
          testUsers[0].id,
          testUsers[0].token
        );

        performanceTracker.end('cross-service-integration');

        // Validate each service layer
        expect(integrationResults.frontendToBackend.success).toBe(true);
        expect(integrationResults.backendToPython.success).toBe(true);
        expect(integrationResults.queueProcessing.success).toBe(true);
        expect(integrationResults.databaseOperations.success).toBe(true);
        expect(integrationResults.cacheOperations.success).toBe(true);

        reportGenerator.recordSuccess(testCase, 'service-integration');

        console.log('✅ Cross-service integration test completed successfully');
      } catch (error) {
        reportGenerator.recordFailure(testCase, error as Error);
        throw error;
      }
    }, 60000);

    test('Error Handling and Recovery Across Services', async () => {
      performanceTracker.start('error-handling');
      const testCase = 'error-handling';

      try {
        console.log('⚠️ Testing error handling and recovery...');

        const errorTestResults = await orchestrator.testErrorHandlingScenarios(
          testUsers[1].id,
          testUsers[1].token
        );

        performanceTracker.end('error-handling');

        // Validate error handling
        expect(errorTestResults.networkFailure.recovered).toBe(true);
        expect(errorTestResults.serviceUnavailable.gracefulDegradation).toBe(true);
        expect(errorTestResults.malformedData.errorPropagation).toBe(true);
        expect(errorTestResults.authFailure.securityMaintained).toBe(true);

        reportGenerator.recordSuccess(testCase, 'error-recovery');

        console.log('✅ Error handling test completed successfully');
      } catch (error) {
        reportGenerator.recordFailure(testCase, error as Error);
        throw error;
      }
    }, 90000);
  });

  describe('Performance Integration Tests', () => {
    test('Load Testing with New Optimizations', async () => {
      performanceTracker.start('load-testing');
      const testCase = 'load-testing';

      try {
        console.log('🏋️ Running load testing with optimizations...');

        const loadTestResults = await orchestrator.runLoadTests({
          virtualUsers: 50,
          duration: 60000, // 1 minute
          rampUpTime: 10000, // 10 seconds
          scenarios: ['file-upload', 'ai-generation', 'vector-search', 'dashboard-queries'],
        });

        performanceTracker.end('load-testing');

        // Validate performance under load
        expect(loadTestResults.averageResponseTime).toBeLessThan(2000);
        expect(loadTestResults.errorRate).toBeLessThan(0.05); // Less than 5% error rate
        expect(loadTestResults.throughput).toBeGreaterThan(100); // RPS
        expect(loadTestResults.p95ResponseTime).toBeLessThan(5000);

        reportGenerator.recordSuccess(testCase, 'load-performance');
        reportGenerator.recordPerformanceMetrics(testCase, loadTestResults);

        console.log('✅ Load testing completed successfully');
      } catch (error) {
        reportGenerator.recordFailure(testCase, error as Error);
        throw error;
      }
    }, 120000);

    test('Cache Effectiveness Under Load', async () => {
      performanceTracker.start('cache-load-testing');
      const testCase = 'cache-load-testing';

      try {
        console.log('💾 Testing cache effectiveness under load...');

        const cacheLoadResults = await orchestrator.testCacheUnderLoad({
          concurrentRequests: 100,
          cacheMissRatio: 0.3,
          testDuration: 30000, // 30 seconds
        });

        performanceTracker.end('cache-load-testing');

        expect(cacheLoadResults.hitRate).toBeGreaterThan(0.7);
        expect(cacheLoadResults.avgCacheResponseTime).toBeLessThan(50);
        expect(cacheLoadResults.cacheMemoryUsage).toBeLessThan(500 * 1024 * 1024); // 500MB

        reportGenerator.recordSuccess(testCase, 'cache-performance');

        console.log('✅ Cache load testing completed successfully');
      } catch (error) {
        reportGenerator.recordFailure(testCase, error as Error);
        throw error;
      }
    }, 60000);
  });

  describe('Admin Dashboard Integration Tests', () => {
    test('Complete Admin Dashboard Functionality', async () => {
      performanceTracker.start('admin-dashboard');
      const testCase = 'admin-dashboard';

      try {
        console.log('👑 Testing admin dashboard functionality...');

        const adminResults = await orchestrator.testAdminDashboardFlow();

        performanceTracker.end('admin-dashboard');

        // Validate admin features
        expect(adminResults.userManagement.success).toBe(true);
        expect(adminResults.systemMetrics.success).toBe(true);
        expect(adminResults.contentModeration.success).toBe(true);
        expect(adminResults.performanceMonitoring.success).toBe(true);
        expect(adminResults.costTracking.success).toBe(true);

        reportGenerator.recordSuccess(testCase, 'admin-functionality');

        console.log('✅ Admin dashboard test completed successfully');
      } catch (error) {
        reportGenerator.recordFailure(testCase, error as Error);
        throw error;
      }
    }, 90000);
  });

  describe('Data Flow Validation Tests', () => {
    test('Complete Data Flow Through All Systems', async () => {
      performanceTracker.start('data-flow-validation');
      const testCase = 'data-flow-validation';

      try {
        console.log('📊 Validating complete data flow...');

        const dataFlowResults = await orchestrator.validateCompleteDataFlow(
          testUsers[2].id,
          testUsers[2].token
        );

        performanceTracker.end('data-flow-validation');

        // Validate all data flows
        expect(dataFlowResults.userPersonaFlow.integrity).toBe(true);
        expect(dataFlowResults.fileProcessingFlow.integrity).toBe(true);
        expect(dataFlowResults.aiContentFlow.integrity).toBe(true);
        expect(dataFlowResults.costTrackingFlow.accuracy).toBeGreaterThan(0.95);
        expect(dataFlowResults.performanceMetricsFlow.completeness).toBe(true);

        reportGenerator.recordSuccess(testCase, 'data-integrity');

        console.log('✅ Data flow validation completed successfully');
      } catch (error) {
        reportGenerator.recordFailure(testCase, error as Error);
        throw error;
      }
    }, 60000);
  });

  describe('System Health and Monitoring Tests', () => {
    test('End-to-End Monitoring and Alerting', async () => {
      performanceTracker.start('monitoring-testing');
      const testCase = 'monitoring-testing';

      try {
        console.log('📈 Testing monitoring and alerting systems...');

        const monitoringResults = await orchestrator.testMonitoringAndAlerting();

        performanceTracker.end('monitoring-testing');

        // Validate monitoring systems
        expect(monitoringResults.metricsCollection.success).toBe(true);
        expect(monitoringResults.alerting.responsiveness).toBeLessThan(5000);
        expect(monitoringResults.dashboards.dataAccuracy).toBeGreaterThan(0.95);
        expect(monitoringResults.logging.completeness).toBe(true);

        reportGenerator.recordSuccess(testCase, 'monitoring-systems');

        console.log('✅ Monitoring test completed successfully');
      } catch (error) {
        reportGenerator.recordFailure(testCase, error as Error);
        throw error;
      }
    }, 45000);
  });
});
