/**
 * Quick AI Migration Status Check
 * Simple script to verify Python AI service integration
 */

const fs = require('fs').promises;
const path = require('path');

async function checkMigrationStatus() {
  console.log('🔍 Checking AI Migration Status...\n');

  const report = {
    timestamp: new Date().toISOString(),
    checks: [],
    summary: {
      pythonServiceIntegrated: false,
      legacyCodeRemaining: 0,
      migrationComplete: false
    }
  };

  // Check 1: Python AI Client exists and is properly configured
  try {
    const pythonClientPath = path.join(__dirname, '../src/services/ai/PythonAIClient.ts');
    const pythonClientExists = await fs.access(pythonClientPath).then(() => true).catch(() => false);
    
    report.checks.push({
      name: 'Python AI Client Integration',
      status: pythonClientExists ? 'PASS' : 'FAIL',
      details: pythonClientExists ? 'PythonAIClient.ts found' : 'PythonAIClient.ts missing'
    });

    if (pythonClientExists) {
      const content = await fs.readFile(pythonClientPath, 'utf8');
      const hasEssentialMethods = [
        'generateContent',
        'createEmbeddings',
        'complete',
        'healthCheck'
      ].every(method => content.includes(method));

      report.checks.push({
        name: 'Python Client API Completeness',
        status: hasEssentialMethods ? 'PASS' : 'FAIL',
        details: hasEssentialMethods ? 'All essential methods present' : 'Missing essential methods'
      });
    }
  } catch (error) {
    report.checks.push({
      name: 'Python AI Client Integration',
      status: 'ERROR',
      details: error.message
    });
  }

  // Check 2: Python Content Generation Service exists
  try {
    const pythonContentPath = path.join(__dirname, '../src/services/content/PythonContentGenerationService.ts');
    const pythonContentExists = await fs.access(pythonContentPath).then(() => true).catch(() => false);
    
    report.checks.push({
      name: 'Python Content Generation Service',
      status: pythonContentExists ? 'PASS' : 'FAIL',
      details: pythonContentExists ? 'PythonContentGenerationService.ts found' : 'Service missing'
    });

    if (pythonContentExists) {
      const content = await fs.readFile(pythonContentPath, 'utf8');
      const contentTypes = [
        'generateExplanation',
        'generateSummary',
        'generateQuiz',
        'generateFlashcards',
        'generateOutline'
      ];
      
      const implementedTypes = contentTypes.filter(type => content.includes(type));
      
      report.checks.push({
        name: 'Content Generation Feature Parity',
        status: implementedTypes.length >= 4 ? 'PASS' : 'PARTIAL',
        details: `${implementedTypes.length}/${contentTypes.length} content types implemented`
      });
    }
  } catch (error) {
    report.checks.push({
      name: 'Python Content Generation Service',
      status: 'ERROR',
      details: error.message
    });
  }

  // Check 3: Search for remaining OpenAI direct usage
  try {
    const searchDirectories = [
      path.join(__dirname, '../src/routes'),
      path.join(__dirname, '../src/services'),
      path.join(__dirname, '../src/controllers')
    ];

    let legacyCount = 0;
    const legacyFiles = [];

    for (const dir of searchDirectories) {
      try {
        const files = await fs.readdir(dir, { recursive: true });
        
        for (const file of files) {
          if (file.endsWith('.ts') || file.endsWith('.js')) {
            const filePath = path.join(dir, file);
            const content = await fs.readFile(filePath, 'utf8');
            
            // Look for direct OpenAI usage
            const directOpenAIPatterns = [
              /openai\.chat\.completions\.create/g,
              /openai\.embeddings\.create/g,
              /new OpenAI\(/g
            ];

            const matches = directOpenAIPatterns.reduce((acc, pattern) => {
              const found = content.match(pattern);
              return acc + (found ? found.length : 0);
            }, 0);

            if (matches > 0) {
              legacyCount += matches;
              legacyFiles.push({
                file: path.relative(path.join(__dirname, '../src'), filePath),
                matches
              });
            }
          }
        }
      } catch (error) {
        // Directory might not exist, skip
      }
    }

    report.checks.push({
      name: 'Legacy OpenAI Usage Scan',
      status: legacyCount === 0 ? 'PASS' : legacyCount < 5 ? 'PARTIAL' : 'FAIL',
      details: `${legacyCount} direct OpenAI calls found in ${legacyFiles.length} files`,
      legacyFiles: legacyFiles.slice(0, 5) // Show first 5 files
    });

    report.summary.legacyCodeRemaining = legacyCount;
  } catch (error) {
    report.checks.push({
      name: 'Legacy OpenAI Usage Scan',
      status: 'ERROR',
      details: error.message
    });
  }

  // Check 4: Python AI Service Configuration
  try {
    const configFiles = [
      path.join(__dirname, '../src/config'),
      path.join(__dirname, '../.env'),
      path.join(__dirname, '../.env.example')
    ];

    let pythonServiceConfigured = false;
    const configDetails = [];

    // Check for environment variables
    const envVars = process.env;
    if (envVars.PYTHON_AI_SERVICE_URL) {
      pythonServiceConfigured = true;
      configDetails.push(`PYTHON_AI_SERVICE_URL: ${envVars.PYTHON_AI_SERVICE_URL}`);
    }

    // Check for config files
    for (const configPath of configFiles) {
      try {
        if (configPath.endsWith('.env') || configPath.endsWith('.env.example')) {
          const content = await fs.readFile(configPath, 'utf8');
          if (content.includes('PYTHON_AI_SERVICE_URL')) {
            configDetails.push(`Found in ${path.basename(configPath)}`);
          }
        }
      } catch (error) {
        // File might not exist
      }
    }

    report.checks.push({
      name: 'Python Service Configuration',
      status: pythonServiceConfigured ? 'PASS' : 'PARTIAL',
      details: configDetails.length > 0 ? configDetails.join(', ') : 'No configuration found'
    });

    report.summary.pythonServiceIntegrated = pythonServiceConfigured;
  } catch (error) {
    report.checks.push({
      name: 'Python Service Configuration',
      status: 'ERROR',
      details: error.message
    });
  }

  // Check 5: Migration Services Completeness
  try {
    const migrationServices = [
      '../src/services/ai/PythonBatchService.ts',
      '../src/services/ai/PythonOutlineService.ts'
    ];

    let migrationServicesCount = 0;
    const serviceDetails = [];

    for (const servicePath of migrationServices) {
      const fullPath = path.join(__dirname, servicePath);
      const exists = await fs.access(fullPath).then(() => true).catch(() => false);
      
      if (exists) {
        migrationServicesCount++;
        serviceDetails.push(path.basename(servicePath));
      }
    }

    report.checks.push({
      name: 'Migration Services Implementation',
      status: migrationServicesCount >= 2 ? 'PASS' : 'PARTIAL',
      details: `${migrationServicesCount}/${migrationServices.length} migration services found: ${serviceDetails.join(', ')}`
    });
  } catch (error) {
    report.checks.push({
      name: 'Migration Services Implementation',
      status: 'ERROR',
      details: error.message
    });
  }

  // Calculate overall migration status
  const passCount = report.checks.filter(c => c.status === 'PASS').length;
  const totalChecks = report.checks.length;
  const migrationPercentage = (passCount / totalChecks) * 100;

  report.summary.migrationComplete = migrationPercentage >= 80; // 80% threshold
  report.summary.migrationPercentage = migrationPercentage;

  // Print results
  console.log('📊 Migration Status Report\n');
  console.log('='.repeat(50));

  report.checks.forEach((check, index) => {
    const statusIcon = {
      'PASS': '✅',
      'PARTIAL': '⚠️',
      'FAIL': '❌',
      'ERROR': '🚨'
    }[check.status] || '❓';

    console.log(`${index + 1}. ${statusIcon} ${check.name}`);
    console.log(`   ${check.details}`);
    
    if (check.legacyFiles && check.legacyFiles.length > 0) {
      console.log('   Legacy files:');
      check.legacyFiles.forEach(file => {
        console.log(`   - ${file.file} (${file.matches} matches)`);
      });
    }
    console.log('');
  });

  console.log('='.repeat(50));
  console.log(`🎯 Overall Migration Progress: ${migrationPercentage.toFixed(1)}%`);
  console.log(`📈 Status: ${report.summary.migrationComplete ? 'COMPLETE' : 'IN PROGRESS'}`);
  console.log(`🔧 Python Service: ${report.summary.pythonServiceIntegrated ? 'Configured' : 'Not Configured'}`);
  console.log(`⚠️  Legacy Code: ${report.summary.legacyCodeRemaining} instances remaining`);

  // Recommendations
  console.log('\n📋 Recommendations:');
  
  if (!report.summary.pythonServiceIntegrated) {
    console.log('• Configure PYTHON_AI_SERVICE_URL environment variable');
    console.log('• Ensure Python AI service is running and accessible');
  }
  
  if (report.summary.legacyCodeRemaining > 0) {
    console.log('• Replace remaining direct OpenAI calls with Python service calls');
    console.log('• Update route handlers to use PythonAIClient');
  }
  
  if (migrationPercentage < 100) {
    console.log('• Complete implementation of all migration services');
    console.log('• Add comprehensive error handling and fallbacks');
    console.log('• Implement performance monitoring and alerting');
  }

  console.log('\n💾 Saving detailed report...');
  
  // Save detailed report
  try {
    await fs.mkdir(path.join(__dirname, 'results'), { recursive: true });
    await fs.writeFile(
      path.join(__dirname, 'results/migration-status-report.json'),
      JSON.stringify(report, null, 2)
    );
    console.log('✅ Report saved to tests/results/migration-status-report.json');
  } catch (error) {
    console.log('❌ Failed to save report:', error.message);
  }

  return report;
}

// Run the check
if (require.main === module) {
  checkMigrationStatus()
    .then(report => {
      process.exit(report.summary.migrationComplete ? 0 : 1);
    })
    .catch(error => {
      console.error('🚨 Migration check failed:', error);
      process.exit(1);
    });
}

module.exports = { checkMigrationStatus };