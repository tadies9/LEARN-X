/**
 * Vector Search Optimization Example
 * 
 * This example demonstrates how to use the vector search optimization features
 * including monitoring, caching, quantization, and hybrid search.
 */

import { createOptimizedVectorService } from '../services/vector/optimization/VectorOptimizationOrchestrator';
import { VectorEmbeddingService } from '../services/embeddings/VectorEmbeddingService';
import { vectorDashboard } from '../services/vector/monitoring/VectorMonitoringDashboard';
import { vectorSearchCache } from '../services/vector/optimization/VectorSearchCache';
// Removed unused import '../services/vector/benchmarks/VectorBenchmark';
import { logger } from '../utils/logger';

async function vectorOptimizationExample() {
  logger.info('Starting Vector Optimization Example');

  try {
    // 1. Initialize the optimized vector service
    const embeddingService = new VectorEmbeddingService();
    const optimizedService = createOptimizedVectorService(embeddingService, {
      enableCaching: true,
      enableHybridSearch: true,
      enableMonitoring: true,
      enableQuantization: false, // Start with false, enable after testing
      cacheConfig: {
        ttlSeconds: 3600,
        maxResults: 1000,
      },
      hybridConfig: {
        vectorWeight: 0.7,
        keywordWeight: 0.3,
      },
    });

    // 2. Example: Perform optimized searches
    console.log('\n=== Performing Optimized Searches ===');
    
    const testQueries = [
      'machine learning algorithms for recommendation systems',
      'neural networks deep learning',
      'database optimization techniques',
      'Python programming best practices',
      'vector embeddings similarity search',
    ];

    for (const query of testQueries) {
      console.log(`\nSearching for: "${query}"`);
      
      const result = await optimizedService.optimizedSearch(query, {
        topK: 10,
        threshold: 0.7,
      });

      console.log(`- Results: ${result.results.length}`);
      console.log(`- Latency: ${result.performance.totalLatencyMs}ms`);
      console.log(`- Cache hit: ${result.performance.cacheHit}`);
      console.log(`- Hybrid search: ${result.performance.hybridSearchUsed}`);
      console.log(`- Optimizations applied: ${result.optimizations.applied.join(', ')}`);
      
      if (result.optimizations.suggestions.length > 0) {
        console.log(`- Suggestions: ${result.optimizations.suggestions.slice(0, 2).join('; ')}`);
      }
    }

    // 3. Example: Get dashboard metrics
    console.log('\n=== Dashboard Metrics ===');
    
    const dashboardMetrics = await vectorDashboard.getDashboardMetrics();
    console.log(`Total vectors: ${dashboardMetrics.totalVectors.toLocaleString()}`);
    console.log(`Average query latency: ${dashboardMetrics.queryLatency.avg.toFixed(2)}ms`);
    console.log(`Search QPS: ${dashboardMetrics.throughput.searchQps.toFixed(2)}`);
    console.log(`Search error rate: ${dashboardMetrics.errorRates.search.toFixed(2)}%`);
    console.log(`Index fragmentation: ${(dashboardMetrics.indexHealth.fragmentation * 100).toFixed(2)}%`);

    // 4. Example: Get real-time metrics
    console.log('\n=== Real-time Metrics (5-minute intervals) ===');
    
    const realTimeMetrics = await vectorDashboard.getRealTimeMetrics(5);
    console.log(`Number of data points: ${realTimeMetrics.length}`);
    
    if (realTimeMetrics.length > 0) {
      const latest = realTimeMetrics[realTimeMetrics.length - 1];
      console.log(`Latest metrics:`);
      console.log(`- Search latency: ${latest.searchLatency.toFixed(2)}ms`);
      console.log(`- Search throughput: ${latest.searchThroughput.toFixed(2)} ops/sec`);
      console.log(`- Error rate: ${latest.errorRate.toFixed(2)}%`);
    }

    // 5. Example: Check for alerts
    console.log('\n=== Performance Alerts ===');
    
    const alerts = await vectorDashboard.getActiveAlerts();
    console.log(`Active alerts: ${alerts.length}`);
    
    for (const alert of alerts.slice(0, 3)) {
      console.log(`- ${alert.severity.toUpperCase()}: ${alert.message}`);
      console.log(`  Current: ${alert.currentValue}, Threshold: ${alert.threshold}`);
    }

    // 6. Example: Cache statistics
    console.log('\n=== Cache Statistics ===');
    
    const cacheStats = await vectorSearchCache.getDetailedStats();
    console.log(`Cache hit rate: ${cacheStats.metrics.hitRate.toFixed(2)}%`);
    console.log(`Total cache hits: ${cacheStats.metrics.hits}`);
    console.log(`Total cache misses: ${cacheStats.metrics.misses}`);
    console.log(`Top queries cached: ${cacheStats.topQueries.length}`);

    if (cacheStats.topQueries.length > 0) {
      console.log('Most popular cached queries:');
      cacheStats.topQueries.slice(0, 3).forEach((query, idx) => {
        console.log(`  ${idx + 1}. Popularity: ${query.popularity}, Hash: ${query.queryHash.substring(0, 8)}...`);
      });
    }

    // 7. Example: Performance comparison
    console.log('\n=== Performance Comparison (Current vs Previous Hour) ===');
    
    const comparison = await vectorDashboard.getPerformanceComparison(60, 60);
    console.log(`Latency change: ${comparison.changes.latencyChange.toFixed(2)}%`);
    console.log(`Throughput change: ${comparison.changes.throughputChange.toFixed(2)}%`);
    console.log(`Error rate change: ${comparison.changes.errorRateChange.toFixed(2)}%`);

    // 8. Example: Comprehensive performance report
    console.log('\n=== Comprehensive Performance Report ===');
    
    const performanceReport = await optimizedService.getPerformanceReport();
    console.log('Optimization status:');
    console.log(`- Caching: ${performanceReport.optimizations.cachingEnabled ? 'ON' : 'OFF'}`);
    console.log(`- Hybrid search: ${performanceReport.optimizations.hybridSearchEnabled ? 'ON' : 'OFF'}`);
    console.log(`- Quantization: ${performanceReport.optimizations.quantizationEnabled ? 'ON' : 'OFF'}`);

    if (performanceReport.recommendations.length > 0) {
      console.log('\nRecommendations:');
      performanceReport.recommendations.slice(0, 3).forEach((rec, idx) => {
        console.log(`  ${idx + 1}. ${rec}`);
      });
    }

    // 9. Example: Cache warmup
    console.log('\n=== Cache Warmup ===');
    
    const popularQueries = [
      'machine learning basics',
      'deep learning tutorial',
      'python programming',
      'data science methods',
    ];
    
    await optimizedService.warmup(popularQueries);
    console.log(`Cache warmed up with ${popularQueries.length} popular queries`);

    // 10. Example: Configuration update
    console.log('\n=== Configuration Update ===');
    
    optimizedService.updateConfig({
      hybridConfig: {
        vectorWeight: 0.8,
        keywordWeight: 0.2,
      },
      cacheConfig: {
        ttlSeconds: 7200, // 2 hours
        maxResults: 500,
      },
    });
    console.log('Configuration updated: Increased vector weight and cache TTL');

    // 11. Example: Benchmark execution (commented out as it's time-consuming)
    /*
    console.log('\n=== Running Benchmarks ===');
    
    const benchmark = new VectorBenchmark({
      providers: ['pgvector'],
      dimensions: 1536,
      vectorCounts: [1000, 10000],
      queryCount: 50,
      topK: 10,
      batchSize: 100,
      outputDir: '/tmp/vector-benchmarks',
    });
    
    await benchmark.runBenchmarks();
    console.log('Benchmark completed - check output directory for results');
    */

    // 12. Example: Cache invalidation
    console.log('\n=== Cache Management ===');
    
    // Invalidate old cache entries
    const invalidated = await vectorSearchCache.invalidate({
      olderThan: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
    });
    console.log(`Invalidated ${invalidated} old cache entries`);

    // Get cache metrics after invalidation
    const updatedCacheMetrics = vectorSearchCache.getMetrics();
    console.log(`Updated cache hit rate: ${updatedCacheMetrics.hitRate.toFixed(2)}%`);

    console.log('\n=== Vector Optimization Example Completed Successfully ===');

  } catch (error) {
    logger.error('Vector optimization example failed:', error);
    throw error;
  }
}

// Example usage patterns for different scenarios
async function usagePatterns() {
  console.log('\n=== Usage Patterns for Different Scenarios ===');

  // const embeddingService = new VectorEmbeddingService();

  // Pattern 1: High-performance production setup
  console.log('\n1. High-Performance Production Setup:');
  // const _productionService = createOptimizedVectorService(embeddingService, {
  //   enableCaching: true,
  //   enableHybridSearch: true,
  //   enableMonitoring: true,
  //   enableQuantization: true, // Enable for production scale
  //   cacheConfig: {
  //     ttlSeconds: 7200, // 2 hours
  //     maxResults: 500,
  //   },
  //   hybridConfig: {
  //     vectorWeight: 0.8,
  //     keywordWeight: 0.2,
  //   },
  // });

  // Pattern 2: Development/testing setup
  console.log('\n2. Development/Testing Setup:');
  // const _devService = createOptimizedVectorService(embeddingService, {
  //   enableCaching: false, // Disable for testing
  //   enableHybridSearch: true,
  //   enableMonitoring: true,
  //   enableQuantization: false,
  // });

  // Pattern 3: Memory-constrained environment
  console.log('\n3. Memory-Constrained Environment:');
  // const _constrainedService = createOptimizedVectorService(embeddingService, {
  //   enableCaching: true,
  //   enableHybridSearch: false, // Disable to save memory
  //   enableMonitoring: false, // Disable to save memory
  //   enableQuantization: true, // Enable for compression
  //   cacheConfig: {
  //     ttlSeconds: 1800, // 30 minutes
  //     maxResults: 100, // Smaller cache
  //   },
  //   quantizationConfig: {
  //     compressionRatio: 8, // Higher compression
  //     minAccuracy: 0.90,
  //   },
  // });

  // Pattern 4: Keyword-heavy search scenario
  console.log('\n4. Keyword-Heavy Search Scenario:');
  // const _keywordService = createOptimizedVectorService(embeddingService, {
  //   enableCaching: true,
  //   enableHybridSearch: true,
  //   enableMonitoring: true,
  //   hybridConfig: {
  //     vectorWeight: 0.4, // Lower vector weight
  //     keywordWeight: 0.6, // Higher keyword weight
  //   },
  // });

  console.log('Usage patterns demonstrated');
}

// Monitoring and alerting example
async function monitoringExample() {
  console.log('\n=== Monitoring and Alerting Example ===');

  // Start continuous monitoring
  const monitoringInterval = vectorDashboard.startMonitoring(60000); // Every minute

  // Simulate monitoring for a short period
  setTimeout(() => {
    clearInterval(monitoringInterval);
    console.log('Monitoring stopped');
  }, 5000);

  // Example of handling alerts programmatically
  const alerts = await vectorDashboard.getActiveAlerts();
  for (const alert of alerts) {
    if (alert.severity === 'critical') {
      console.log(`CRITICAL ALERT: ${alert.message}`);
      // In production, you'd send notifications, scale resources, etc.
      
      // Auto-resolve if it's a transient issue
      if (alert.type === 'latency' && alert.currentValue < alert.threshold * 1.5) {
        vectorDashboard.resolveAlert(alert.id);
        console.log(`Auto-resolved alert: ${alert.id}`);
      }
    }
  }
}

// Export for use in other modules
export {
  vectorOptimizationExample,
  usagePatterns,
  monitoringExample,
};

// Run the example if this file is executed directly
if (require.main === module) {
  vectorOptimizationExample()
    .then(() => usagePatterns())
    .then(() => monitoringExample())
    .then(() => {
      console.log('\nAll examples completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Example failed:', error);
      process.exit(1);
    });
}