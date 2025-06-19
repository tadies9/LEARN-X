# Vector Search Optimization and Monitoring Guide

This guide covers the comprehensive vector search optimization and monitoring system implemented for LEARN-X. The system provides performance monitoring, caching, quantization, hybrid search, and benchmarking capabilities.

## Overview

The vector optimization system is designed to:
- Monitor and optimize pgVector performance
- Provide a swappable vector search abstraction
- Benchmark different vector search providers
- Implement optimization strategies including caching and quantization
- Enable hybrid search combining vector and keyword search

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                Vector Optimization System                   │
├─────────────────┬───────────────────┬───────────────────────┤
│   Monitoring    │   Optimization    │      Benchmarking     │
│                 │                   │                       │
│ • Performance   │ • Caching         │ • Provider comparison │
│ • Metrics       │ • Quantization    │ • Performance testing│
│ • Alerts        │ • Hybrid search   │ • Recommendations    │
│ • Dashboard     │ • Load balancing  │ • Scaling analysis   │
└─────────────────┴───────────────────┴───────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │  Vector Stores    │
                    │                   │
                    │ • pgVector        │
                    │ • Pinecone        │
                    │ • Weaviate        │
                    │ • Qdrant          │
                    └───────────────────┘
```

## Components

### 1. Vector Store Abstraction

**Files:**
- `src/services/vector/interfaces/IVectorStore.ts` - Main interface
- `src/services/vector/VectorStoreFactory.ts` - Factory pattern implementation
- `src/services/vector/stores/` - Provider implementations

**Features:**
- Unified interface for different vector databases
- Swappable backends (pgVector, Pinecone, Weaviate, Qdrant)
- Batch operations and metadata filtering
- Health checking and statistics

### 2. Performance Monitoring

**Files:**
- `src/services/vector/monitoring/VectorPerformanceMonitor.ts`
- `src/services/vector/monitoring/VectorSearchMetrics.ts`
- `src/services/vector/monitoring/VectorMonitoringDashboard.ts`

**Features:**
- Real-time performance metrics
- Latency percentiles (P50, P95, P99)
- Error rate tracking
- Memory usage monitoring
- Alert system with configurable thresholds

### 3. Optimization Strategies

#### Caching System
**File:** `src/services/vector/optimization/VectorSearchCache.ts`

**Features:**
- Redis-based caching with TTL
- Adaptive TTL based on query popularity
- Cache hit rate optimization
- Intelligent cache invalidation

#### Vector Quantization
**File:** `src/services/vector/optimization/VectorQuantization.ts`

**Methods:**
- **Scalar Quantization**: 4/8/16-bit precision reduction
- **Product Quantization**: Subvector-based compression
- **Binary Quantization**: Sign-based compression

#### Hybrid Search
**File:** `src/services/vector/optimization/HybridSearchOptimizer.ts`

**Features:**
- Combines vector and keyword search
- Multiple fusion methods (RRF, Linear, Harmonic, Convex)
- Query analysis and adaptive weighting
- Result reranking and diversity optimization

### 4. Benchmarking System

**File:** `src/services/vector/benchmarks/VectorBenchmark.ts`

**Capabilities:**
- Multi-provider performance comparison
- Scalability testing (1K to 1M+ vectors)
- Cost vs performance analysis
- Automated recommendations

### 5. Orchestration

**File:** `src/services/vector/optimization/VectorOptimizationOrchestrator.ts`

**Purpose:**
- Unified interface for all optimization features
- Configuration management
- Performance reporting
- Automated optimization application

## API Endpoints

The vector optimization system exposes REST APIs through `/api/vector-optimization/`:

### Monitoring Endpoints

```bash
# Get dashboard metrics
GET /api/vector-optimization/dashboard

# Get real-time metrics
GET /api/vector-optimization/real-time-metrics?interval=5

# Get performance alerts
GET /api/vector-optimization/alerts

# Resolve an alert
POST /api/vector-optimization/alerts/:alertId/resolve

# Get performance comparison
GET /api/vector-optimization/performance-comparison?current=60&previous=60
```

### Search Endpoints

```bash
# Perform optimized search
POST /api/vector-optimization/search
{
  "query": "machine learning algorithms",
  "topK": 10,
  "threshold": 0.7,
  "forceBypassCache": false
}
```

### Cache Management

```bash
# Get cache statistics
GET /api/vector-optimization/cache/stats

# Clear cache
POST /api/vector-optimization/cache/clear
{
  "pattern": "optional-pattern"
}

# Invalidate cache entries
POST /api/vector-optimization/cache/invalidate
{
  "fileId": "uuid",
  "olderThan": "2024-01-01T00:00:00Z"
}

# Warm up cache
POST /api/vector-optimization/warmup
{
  "queries": ["query1", "query2", "query3"]
}
```

### Reports and Benchmarks

```bash
# Get performance report
GET /api/vector-optimization/performance-report

# Run benchmarks (long-running)
POST /api/vector-optimization/benchmark

# Update configuration
PUT /api/vector-optimization/config
{
  "enableCaching": true,
  "enableHybridSearch": true,
  "hybridConfig": {
    "vectorWeight": 0.8,
    "keywordWeight": 0.2
  }
}
```

## Configuration

### Basic Configuration

```typescript
const optimizedService = createOptimizedVectorService(embeddingService, {
  enableCaching: true,
  enableHybridSearch: true,
  enableMonitoring: true,
  enableQuantization: false,
  cacheConfig: {
    ttlSeconds: 3600,
    maxResults: 1000,
  },
  hybridConfig: {
    vectorWeight: 0.7,
    keywordWeight: 0.3,
  },
});
```

### Production Configuration

```typescript
const productionConfig = {
  enableCaching: true,
  enableHybridSearch: true,
  enableMonitoring: true,
  enableQuantization: true,
  cacheConfig: {
    ttlSeconds: 7200,
    maxResults: 500,
    enableCompression: true,
    adaptiveTTL: true,
  },
  quantizationConfig: {
    compressionRatio: 4,
    minAccuracy: 0.95,
  },
  hybridConfig: {
    vectorWeight: 0.8,
    keywordWeight: 0.2,
    fusionMethod: 'rrf',
    rerankingEnabled: true,
  },
};
```

## Usage Examples

### 1. Basic Optimized Search

```typescript
const result = await optimizedService.optimizedSearch(
  "machine learning algorithms",
  { topK: 10, threshold: 0.7 }
);

console.log(`Found ${result.results.length} results`);
console.log(`Latency: ${result.performance.totalLatencyMs}ms`);
console.log(`Cache hit: ${result.performance.cacheHit}`);
console.log(`Optimizations: ${result.optimizations.applied.join(', ')}`);
```

### 2. Monitoring Dashboard

```typescript
// Get comprehensive metrics
const metrics = await vectorDashboard.getDashboardMetrics();

// Start continuous monitoring
const interval = vectorDashboard.startMonitoring(60000); // Every minute

// Check for alerts
const alerts = await vectorDashboard.getActiveAlerts();
for (const alert of alerts) {
  if (alert.severity === 'critical') {
    console.log(`CRITICAL: ${alert.message}`);
    // Handle critical alert
  }
}
```

### 3. Cache Management

```typescript
// Get cache statistics
const cacheStats = await vectorSearchCache.getDetailedStats();
console.log(`Hit rate: ${cacheStats.metrics.hitRate}%`);

// Clear old entries
await vectorSearchCache.invalidate({
  olderThan: new Date(Date.now() - 24 * 60 * 60 * 1000)
});

// Warm up with popular queries
await optimizedService.warmup([
  "machine learning basics",
  "deep learning tutorial",
  "python programming"
]);
```

### 4. Performance Benchmarking

```typescript
const benchmark = new VectorBenchmark({
  providers: ['pgvector', 'pinecone'],
  dimensions: 1536,
  vectorCounts: [1000, 10000, 100000],
  queryCount: 100,
  topK: 10,
  batchSize: 100,
  outputDir: './benchmark-results',
});

await benchmark.runBenchmarks();
```

## Performance Optimization Guidelines

### 1. Query Optimization

- **Use appropriate similarity thresholds**: Higher thresholds (0.8+) for precise matches, lower (0.6+) for broader results
- **Optimize topK values**: Start with 10-20, increase only if needed
- **Enable caching**: For repeated or similar queries
- **Use hybrid search**: For queries with both semantic and keyword components

### 2. Index Optimization

- **Monitor fragmentation**: Reindex when fragmentation > 30%
- **Tune IVFFlat parameters**: Use `lists = sqrt(total_vectors)` as starting point
- **Consider HNSW**: For datasets < 500K vectors and high query load
- **Regular ANALYZE**: Keep statistics updated

### 3. Memory Management

- **Enable quantization**: For large datasets (>1M vectors)
- **Cache tuning**: Balance hit rate vs memory usage
- **Monitor memory pressure**: Scale resources when usage > 80%

### 4. Scaling Recommendations

| Vector Count | Recommendation |
|--------------|----------------|
| < 100K | pgVector with optimized indexes |
| 100K - 1M | pgVector with quantization + caching |
| 1M - 10M | Consider dedicated vector DB (Pinecone, Qdrant) |
| > 10M | Distributed vector search solution |

## Monitoring and Alerts

### Key Metrics

1. **Latency Metrics**
   - Average search latency
   - P95/P99 latency percentiles
   - Index operation latency

2. **Throughput Metrics**
   - Queries per second (QPS)
   - Index operations per second
   - Cache hit rate

3. **Quality Metrics**
   - Error rates
   - Search accuracy
   - Result relevance

4. **Resource Metrics**
   - Memory usage
   - Index size
   - Fragmentation ratio

### Alert Thresholds

```typescript
const alertThresholds = {
  latency: {
    warning: 500,   // ms
    critical: 2000, // ms
  },
  errorRate: {
    warning: 1,     // %
    critical: 5,    // %
  },
  memoryUsage: {
    warning: 70,    // %
    critical: 90,   // %
  },
  fragmentation: {
    warning: 0.3,   // 30%
    critical: 0.5,  // 50%
  },
};
```

## Migration Guide

### From Basic Vector Search

1. **Enable monitoring** to establish baseline metrics
2. **Add caching** for frequently searched queries
3. **Implement hybrid search** for keyword-heavy queries
4. **Consider quantization** for large datasets
5. **Set up benchmarking** to validate improvements

### Provider Migration

The system supports seamless migration between vector providers:

```typescript
// Current: pgVector
const currentAdapter = new VectorSearchAdapter(embeddingService, {
  provider: 'pgvector'
});

// Migrate to: Pinecone
await currentAdapter.switchProvider({
  provider: 'pinecone',
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT,
  }
});
```

## Troubleshooting

### Common Issues

1. **High Latency**
   - Check index fragmentation
   - Verify appropriate topK values
   - Consider query optimization
   - Enable caching

2. **Low Cache Hit Rate**
   - Analyze query patterns
   - Adjust cache TTL
   - Implement query normalization
   - Use cache warming

3. **High Memory Usage**
   - Enable quantization
   - Reduce cache size
   - Optimize index parameters
   - Consider provider migration

4. **Poor Search Quality**
   - Adjust similarity thresholds
   - Enable hybrid search
   - Tune fusion weights
   - Review embedding quality

### Debug Tools

```typescript
// Enable detailed logging
const monitor = new VectorPerformanceMonitor({
  provider: 'pgvector',
  enableDetailedLogging: true,
  sampleRate: 1.0,
});

// Generate performance report
const report = await optimizedService.getPerformanceReport();
console.log('Recommendations:', report.recommendations);

// Check specific query performance
const result = await optimizedService.optimizedSearch(query, options);
console.log('Applied optimizations:', result.optimizations.applied);
console.log('Suggestions:', result.optimizations.suggestions);
```

## Best Practices

1. **Start Simple**: Begin with basic monitoring and caching
2. **Measure First**: Establish baseline metrics before optimization
3. **Gradual Rollout**: Enable optimizations incrementally
4. **Monitor Continuously**: Set up alerts and regular review
5. **Test Thoroughly**: Validate optimizations with benchmarks
6. **Document Changes**: Track configuration and performance impacts

## Example Integration

See `src/examples/vectorOptimizationExample.ts` for comprehensive usage examples including:
- Basic optimization setup
- Monitoring configuration
- Cache management
- Performance analysis
- Alert handling

This system provides a robust foundation for scalable vector search with comprehensive monitoring and optimization capabilities.