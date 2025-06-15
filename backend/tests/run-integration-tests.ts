#!/usr/bin/env ts-node

import { spawn } from 'child_process';

interface TestSuite {
  name: string;
  path: string;
  description: string;
  timeout?: number;
}

const testSuites: TestSuite[] = [
  {
    name: 'Main Flow',
    path: 'tests/integration/main-flow.test.ts',
    description: 'Complete file processing flow from upload to AI generation',
    timeout: 120000 // 2 minutes
  },
  {
    name: 'API Endpoints',
    path: 'tests/integration/api-endpoints.test.ts',
    description: 'API endpoint integration tests',
    timeout: 60000 // 1 minute
  },
  {
    name: 'File Processing',
    path: 'tests/integration/file-processing-flow.test.ts',
    description: 'File processing workflow integration tests',
    timeout: 90000 // 1.5 minutes
  },
  {
    name: 'Service Integration',
    path: 'tests/integration/service-integration.test.ts',
    description: 'Cross-service integration tests',
    timeout: 60000 // 1 minute
  }
];

class TestRunner {
  private results: { [key: string]: { passed: boolean; duration: number; error?: string } } = {};

  async runSuite(suite: TestSuite): Promise<boolean> {
    console.log(`\n🚀 Running ${suite.name} Integration Tests`);
    console.log(`📝 ${suite.description}`);
    console.log('─'.repeat(60));

    const startTime = Date.now();

    return new Promise((resolve) => {
      const jestProcess = spawn('npx', ['jest', suite.path, '--verbose', '--detectOpenHandles'], {
        stdio: 'inherit',
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: 'test',
          TEST_TIMEOUT: suite.timeout?.toString() || '60000'
        }
      });

      const timer = setTimeout(() => {
        jestProcess.kill('SIGTERM');
        const duration = Date.now() - startTime;
        this.results[suite.name] = {
          passed: false,
          duration,
          error: `Test suite timed out after ${suite.timeout}ms`
        };
        resolve(false);
      }, suite.timeout || 60000);

      jestProcess.on('close', (code) => {
        clearTimeout(timer);
        const duration = Date.now() - startTime;
        const passed = code === 0;

        this.results[suite.name] = {
          passed,
          duration,
          error: passed ? undefined : `Test suite failed with exit code ${code}`
        };

        console.log(`\n${passed ? '✅' : '❌'} ${suite.name} Tests ${passed ? 'PASSED' : 'FAILED'} (${duration}ms)`);
        resolve(passed);
      });

      jestProcess.on('error', (error) => {
        clearTimeout(timer);
        const duration = Date.now() - startTime;
        this.results[suite.name] = {
          passed: false,
          duration,
          error: error.message
        };
        console.log(`\n❌ ${suite.name} Tests FAILED - ${error.message}`);
        resolve(false);
      });
    });
  }

  async runAll(): Promise<void> {
    console.log('🎯 Starting Integration Test Suite');
    console.log('═'.repeat(60));
    console.log(`📋 Running ${testSuites.length} test suites...`);

    const startTime = Date.now();
    let passedCount = 0;

    for (const suite of testSuites) {
      const passed = await this.runSuite(suite);
      if (passed) {
        passedCount++;
      }
    }

    const totalDuration = Date.now() - startTime;
    
    console.log('\n═'.repeat(60));
    console.log('📊 INTEGRATION TEST RESULTS');
    console.log('═'.repeat(60));

    Object.entries(this.results).forEach(([name, result]) => {
      const status = result.passed ? '✅ PASSED' : '❌ FAILED';
      const duration = `${result.duration}ms`;
      console.log(`${status.padEnd(10)} ${name.padEnd(20)} ${duration.padStart(10)}`);
      if (result.error) {
        console.log(`           Error: ${result.error}`);
      }
    });

    console.log('─'.repeat(60));
    console.log(`📈 Summary: ${passedCount}/${testSuites.length} test suites passed`);
    console.log(`⏱️  Total Duration: ${totalDuration}ms`);
    
    if (passedCount === testSuites.length) {
      console.log('🎉 All integration tests passed!');
      process.exit(0);
    } else {
      console.log(`💥 ${testSuites.length - passedCount} test suite(s) failed`);
      process.exit(1);
    }
  }

  async runSpecific(suiteName: string): Promise<void> {
    const suite = testSuites.find(s => s.name.toLowerCase().includes(suiteName.toLowerCase()));
    
    if (!suite) {
      console.log(`❌ Test suite '${suiteName}' not found`);
      console.log('Available test suites:');
      testSuites.forEach(s => console.log(`  - ${s.name}: ${s.description}`));
      process.exit(1);
    }

    console.log(`🎯 Running specific test suite: ${suite.name}`);
    const passed = await this.runSuite(suite);
    
    if (passed) {
      console.log(`\n🎉 ${suite.name} tests completed successfully!`);
      process.exit(0);
    } else {
      console.log(`\n💥 ${suite.name} tests failed!`);
      process.exit(1);
    }
  }

  printHelp(): void {
    console.log('🧪 Integration Test Runner');
    console.log('═'.repeat(50));
    console.log('');
    console.log('Usage:');
    console.log('  npm run test:integration              # Run all integration tests');
    console.log('  npm run test:integration -- <suite>  # Run specific test suite');
    console.log('');
    console.log('Available Test Suites:');
    testSuites.forEach(suite => {
      console.log(`  📋 ${suite.name.padEnd(20)} - ${suite.description}`);
    });
    console.log('');
    console.log('Examples:');
    console.log('  npm run test:integration -- main     # Run main flow tests');
    console.log('  npm run test:integration -- api      # Run API endpoint tests');
    console.log('  npm run test:integration -- file     # Run file processing tests');
    console.log('  npm run test:integration -- service  # Run service integration tests');
  }
}

async function main() {
  const runner = new TestRunner();
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    runner.printHelp();
    return;
  }

  if (args.length === 0) {
    await runner.runAll();
  } else {
    await runner.runSpecific(args[0]);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⚠️  Test runner interrupted by user');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Test runner terminated');
  process.exit(143);
});

// Run the test runner
main().catch((error) => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
}); 