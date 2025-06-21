import { BenchmarkResult, ProviderComparison, BenchmarkConfig } from '../types/benchmark.types';
import { BenchmarkMetrics } from '../utils/BenchmarkMetrics';

export class ProviderAnalyzer {
  /**
   * Compare providers
   */
  static compareProviders(
    providers: string[],
    results: BenchmarkResult[]
  ): ProviderComparison[] {
    return providers.map((provider) => {
      const providerResults = results.filter((r) => r.provider === provider);

      // Calculate scores (lower is better for latency, higher for throughput)
      const searchResults = providerResults.filter((r) => r.operation === 'search');
      const indexResults = providerResults.filter((r) => r.operation === 'index');

      const avgSearchLatency =
        searchResults.reduce((sum, r) => sum + r.avgLatencyMs, 0) / searchResults.length || 0;
      const avgIndexLatency =
        indexResults.reduce((sum, r) => sum + r.avgLatencyMs, 0) / indexResults.length || 0;

      const searchScore = avgSearchLatency > 0 ? 1000 / avgSearchLatency : 0;
      const indexScore = avgIndexLatency > 0 ? 1000 / avgIndexLatency : 0;

      return {
        provider,
        totalScore: searchScore + indexScore,
        searchScore,
        indexScore,
        costEstimate: this.estimateCost(provider),
        recommendation: this.getProviderRecommendation(provider, providerResults),
      };
    });
  }

  /**
   * Estimate cost for provider
   */
  private static estimateCost(provider: string): number {
    // Rough monthly cost estimates for 1M vectors
    const costMap: Record<string, number> = {
      pgvector: 50, // Self-hosted database costs
      pinecone: 70, // Based on their pricing tiers
      weaviate: 100, // Cloud hosted pricing
      qdrant: 75, // Cloud hosted pricing
    };

    return costMap[provider] || 0;
  }

  /**
   * Get provider recommendation
   */
  private static getProviderRecommendation(
    provider: string,
    results: BenchmarkResult[]
  ): string {
    const avgLatency = results.reduce((sum, r) => sum + r.avgLatencyMs, 0) / results.length;
    const maxVectorCount = Math.max(...results.map((r) => r.vectorCount));

    if (provider === 'pgvector') {
      if (maxVectorCount > 1000000) {
        return 'Consider dedicated vector DB for scale > 1M vectors';
      }
      if (avgLatency > 500) {
        return 'Optimize indexes and consider hardware upgrades';
      }
      return 'Good for small to medium datasets with existing PostgreSQL';
    }

    if (provider === 'pinecone') {
      return 'Excellent for production workloads with managed infrastructure';
    }

    if (provider === 'weaviate') {
      return 'Great for hybrid search and complex filtering requirements';
    }

    if (provider === 'qdrant') {
      return 'Good balance of performance and features for medium scale';
    }

    return 'No specific recommendation';
  }

  /**
   * Generate provider recommendations markdown
   */
  static generateProviderRecommendations(
    config: BenchmarkConfig,
    results: BenchmarkResult[]
  ): string {
    const comparisons = this.compareProviders(config.providers, results);
    const sorted = [...comparisons].sort((a, b) => b.totalScore - a.totalScore);
    const summary = BenchmarkMetrics.generateSummary(results, config.providers);

    let markdown = '# Vector Store Provider Recommendations\n\n';
    markdown += `Generated: ${new Date().toISOString()}\n\n`;

    markdown += '## Executive Summary\n\n';
    markdown += `Based on benchmarks with vectors ranging from ${Math.min(...config.vectorCounts)} to ${Math.max(...config.vectorCounts)}:\n\n`;

    markdown += '### Performance Rankings\n\n';
    sorted.forEach((comp, index) => {
      markdown += `${index + 1}. **${comp.provider}** - Total Score: ${comp.totalScore.toFixed(2)}\n`;
      markdown += `   - Search Performance Score: ${comp.searchScore.toFixed(2)}\n`;
      markdown += `   - Index Performance Score: ${comp.indexScore.toFixed(2)}\n`;
      markdown += `   - Estimated Monthly Cost (1M vectors): $${comp.costEstimate}\n`;
      markdown += `   - Recommendation: ${comp.recommendation}\n\n`;
    });

    markdown += '## Detailed Analysis\n\n';

    for (const provider of config.providers) {
      markdown += `### ${provider}\n\n`;

      const providerSummary = summary[provider];

      markdown += '#### Performance Metrics\n\n';
      markdown += '| Operation | Avg Latency (ms) | Throughput (ops/s) | Error Rate (%) |\n';
      markdown += '|-----------|------------------|-------------------|----------------|\n';

      for (const [op, stats] of Object.entries(providerSummary)) {
        const s = stats as any;
        markdown += `| ${op} | ${s.avgLatency.toFixed(2)} | ${s.avgThroughput.toFixed(2)} | ${s.avgErrorRate.toFixed(2)} |\n`;
      }

      markdown += '\n#### Scalability\n\n';

      const scalabilityData = config.vectorCounts.map((count) => {
        const searchResult = results.find(
          (r) => r.provider === provider && r.operation === 'search' && r.vectorCount === count
        );
        return {
          count,
          latency: searchResult?.avgLatencyMs || 0,
        };
      });

      markdown += '| Vector Count | Search Latency (ms) |\n';
      markdown += '|--------------|--------------------|\n';
      scalabilityData.forEach((data) => {
        markdown += `| ${data.count.toLocaleString()} | ${data.latency.toFixed(2)} |\n`;
      });

      markdown += '\n';
    }

    markdown += this.generateMigrationRecommendations(config.vectorCounts);

    return markdown;
  }

  /**
   * Generate migration recommendations
   */
  private static generateMigrationRecommendations(vectorCounts: number[]): string {
    const currentVectorCount = Math.max(...vectorCounts);
    let markdown = '## Migration Recommendations\n\n';

    if (currentVectorCount < 100000) {
      markdown += '- **Current Scale**: Small dataset\n';
      markdown += '- **Recommendation**: pgvector is sufficient for your current needs\n';
      markdown += '- **Migration Trigger**: Consider migration when approaching 500K vectors\n';
    } else if (currentVectorCount < 1000000) {
      markdown += '- **Current Scale**: Medium dataset\n';
      markdown += '- **Recommendation**: Start planning migration to dedicated vector DB\n';
      markdown += '- **Best Options**: Pinecone or Qdrant for ease of migration\n';
    } else {
      markdown += '- **Current Scale**: Large dataset\n';
      markdown += '- **Recommendation**: Immediate migration to dedicated vector DB recommended\n';
      markdown += '- **Best Options**: Pinecone for managed solution, Weaviate for hybrid search\n';
    }

    return markdown;
  }
}