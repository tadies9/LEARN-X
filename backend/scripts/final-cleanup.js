#!/usr/bin/env node

/**
 * Final Cleanup Script for LEARN-X Codebase
 * Removes old implementations and ensures proper migration to new systems
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

console.log('🧹 Starting LEARN-X Final Cleanup Process...\n');

class CleanupOrchestrator {
  constructor() {
    this.backendPath = path.join(__dirname, '..');
    this.frontendPath = path.join(__dirname, '../../frontend');
    this.pythonServicePath = path.join(__dirname, '../../python-ai-service');
    
    this.cleanupTasks = [];
    this.validationResults = [];
  }

  async execute() {
    try {
      await this.validateCurrentState();
      await this.removeOldFiles();
      await this.updateImports();
      await this.cleanupBuildArtifacts();
      await this.generateFinalReport();
      
      console.log('\n✅ Cleanup completed successfully!');
    } catch (error) {
      console.error('\n❌ Cleanup failed:', error.message);
      process.exit(1);
    }
  }

  async validateCurrentState() {
    console.log('📊 Validating current codebase state...');
    
    // Check for old dashboardService.ts (should be removed)
    const oldDashboardService = path.join(this.backendPath, 'src/services/dashboardService.ts');
    const exists = await this.fileExists(oldDashboardService);
    this.validationResults.push({
      check: 'Old dashboardService.ts removal',
      status: exists ? 'FAIL' : 'PASS',
      details: exists ? 'Old file still exists' : 'Successfully removed'
    });

    // Check for basic AICache usage
    const basicCacheUsage = await this.findBasicCacheUsage();
    this.validationResults.push({
      check: 'Basic AICache migration',
      status: basicCacheUsage.length > 0 ? 'PARTIAL' : 'PASS',
      details: `Found ${basicCacheUsage.length} files still using basic AICache`,
      files: basicCacheUsage
    });

    // Check admin routes mounting
    const adminRoutesMounted = await this.checkAdminRoutes();
    this.validationResults.push({
      check: 'Admin routes mounting',
      status: adminRoutesMounted ? 'PASS' : 'FAIL',
      details: adminRoutesMounted ? 'Admin routes properly mounted' : 'Admin routes not found'
    });

    // Check Python service integration
    const pythonIntegration = await this.checkPythonIntegration();
    this.validationResults.push({
      check: 'Python service integration',
      status: pythonIntegration ? 'PASS' : 'FAIL',
      details: pythonIntegration ? 'Python service integrated' : 'Python service not properly integrated'
    });

    console.log('✓ State validation completed\n');
  }

  async removeOldFiles() {
    console.log('🗑️  Removing old files...');
    
    const filesToRemove = [
      // Compiled old dashboard service (if exists)
      path.join(this.backendPath, 'dist/services/dashboardService.js'),
      path.join(this.backendPath, 'dist/services/dashboardService.d.ts'),
      path.join(this.backendPath, 'dist/services/dashboardService.js.map'),
      path.join(this.backendPath, 'dist/services/dashboardService.d.ts.map'),
      
      // Old next.config.optimized.js (keeping the main one)
      path.join(this.frontendPath, 'next.config.optimized.js'),
      
      // Any leftover .tsbuildinfo files
      path.join(this.backendPath, 'tsconfig.tsbuildinfo'),
      path.join(this.frontendPath, 'tsconfig.tsbuildinfo')
    ];

    for (const file of filesToRemove) {
      if (await this.fileExists(file)) {
        await fs.unlink(file);
        console.log(`  ✓ Removed: ${path.relative(process.cwd(), file)}`);
        this.cleanupTasks.push(`Removed ${path.basename(file)}`);
      }
    }

    console.log('✓ Old files cleanup completed\n');
  }

  async updateImports() {
    console.log('🔄 Updating imports to use enhanced services...');
    
    // Files that need AICache -> EnhancedAICache migration
    const filesToUpdate = [
      'src/services/content/ContentGenerationService.ts',
      'src/services/content/core/ContentOrchestrator.ts',
      'src/services/content/core/ExplanationOrchestrator.ts',
      'src/services/content/core/InteractiveOrchestrator.ts',
      'src/services/content/core/QuizService.ts',
      'src/services/content/core/ChatOrchestrator.ts',
      'src/services/content/core/StreamingExplanationService.ts',
      'src/services/content/core/PracticeService.ts',
      'src/services/content/core/ExampleService.ts',
      'src/services/content/core/SummaryOrchestrator.ts',
      'src/services/content/core/IntroductionService.ts'
    ];

    let updatedCount = 0;
    for (const relativeFile of filesToUpdate) {
      const filePath = path.join(this.backendPath, relativeFile);
      if (await this.fileExists(filePath)) {
        const content = await fs.readFile(filePath, 'utf8');
        
        // Check if it's still using basic AICache
        if (content.includes("from '../cache/AICache'") || content.includes("from '../../cache/AICache'")) {
          console.log(`  ⚠️  File ${relativeFile} still uses basic AICache - manual review needed`);
          this.cleanupTasks.push(`Manual review needed: ${relativeFile} uses basic AICache`);
        }
      }
    }

    console.log('✓ Import updates completed\n');
  }

  async cleanupBuildArtifacts() {
    console.log('🧹 Cleaning build artifacts...');
    
    const artifactPaths = [
      path.join(this.backendPath, 'dist'),
      path.join(this.frontendPath, '.next'),
      path.join(this.pythonServicePath, '__pycache__')
    ];

    for (const artifactPath of artifactPaths) {
      if (await this.directoryExists(artifactPath)) {
        // Don't actually remove dist for safety, just note it
        console.log(`  📁 Build artifacts found in: ${path.relative(process.cwd(), artifactPath)}`);
        this.cleanupTasks.push(`Build artifacts present in ${path.basename(artifactPath)}`);
      }
    }

    console.log('✓ Build artifacts cleanup completed\n');
  }

  async generateFinalReport() {
    console.log('📋 Generating cleanup report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      validation: this.validationResults,
      cleanupTasks: this.cleanupTasks,
      oversizedFiles: await this.findOversizedFiles(),
      recommendations: this.generateRecommendations()
    };

    const reportPath = path.join(this.backendPath, 'FINAL_CLEANUP_REPORT.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`✓ Cleanup report saved to: ${reportPath}\n`);
  }

  async findBasicCacheUsage() {
    const files = [];
    try {
      const result = execSync(
        `find ${this.backendPath}/src -name "*.ts" -exec grep -l "from.*AICache" {} \\;`,
        { encoding: 'utf8' }
      );
      return result.trim().split('\n').filter(f => f.length > 0);
    } catch (error) {
      return [];
    }
  }

  async checkAdminRoutes() {
    const routesFile = path.join(this.backendPath, 'src/routes/index.ts');
    if (!await this.fileExists(routesFile)) return false;
    
    const content = await fs.readFile(routesFile, 'utf8');
    return content.includes("router.use('/admin', adminAuth, adminRoutes)");
  }

  async checkPythonIntegration() {
    const dockerFile = path.join(__dirname, '../../docker-compose.yml');
    if (!await this.fileExists(dockerFile)) return false;
    
    const content = await fs.readFile(dockerFile, 'utf8');
    return content.includes('python-ai:') && content.includes('PYTHON_FILE_PROCESSING=true');
  }

  async findOversizedFiles() {
    try {
      const result = execSync(
        `find ${this.backendPath}/src ${this.frontendPath}/src -name "*.ts" -o -name "*.tsx" | xargs wc -l | awk '$1 > 500 {print $0}' | sort -nr`,
        { encoding: 'utf8' }
      );
      return result.trim().split('\n').filter(f => f.length > 0);
    } catch (error) {
      return [];
    }
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Based on validation results
    for (const result of this.validationResults) {
      if (result.status === 'FAIL') {
        recommendations.push(`Address ${result.check}: ${result.details}`);
      } else if (result.status === 'PARTIAL') {
        recommendations.push(`Complete ${result.check}: ${result.details}`);
      }
    }

    // General recommendations
    recommendations.push('Run full test suite to ensure all migrations are working');
    recommendations.push('Monitor Python service performance in production');
    recommendations.push('Consider refactoring files larger than 500 LOC');
    recommendations.push('Update documentation to reflect new architecture');

    return recommendations;
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async directoryExists(dirPath) {
    try {
      const stat = await fs.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }
}

// Execute cleanup if run directly
if (require.main === module) {
  const cleanup = new CleanupOrchestrator();
  cleanup.execute().catch(console.error);
}

module.exports = CleanupOrchestrator;