import { PostgrestQueryBuilder } from '@supabase/postgrest-js';
import { logger } from '../../utils/logger';
// Removed unused import '../../config/supabase';

interface QueryPattern {
  table: string;
  filters: string[];
  frequency: number;
}

interface MaterializedView {
  name: string;
  query: string;
  refreshInterval: string;
  indices: string[];
}

interface QueryOptimization {
  original: string;
  optimized: string;
  improvements: string[];
  estimatedSpeedup: number;
}

/**
 * Service for optimizing database queries and suggesting performance improvements
 */
export class QueryOptimizer {
  private queryPatterns: Map<string, QueryPattern> = new Map();
  
  /**
   * Optimize a Supabase select query
   */
  optimizeSelect<T>(query: PostgrestQueryBuilder<any, any, T>): PostgrestQueryBuilder<any, any, T> {
    // Note: Supabase query builder doesn't expose internal state easily,
    // so we'll provide optimization hints instead
    
    // Add optimization hints as comments
    logger.info('Query optimization hints:', {
      tip1: 'Use select() with specific columns instead of *',
      tip2: 'Add .limit() to prevent fetching too many rows',
      tip3: 'Use indexes on filter columns',
      tip4: 'Consider using .range() for pagination',
    });

    return query;
  }

  /**
   * Analyze query patterns and suggest optimizations
   */
  async analyzeQueryPatterns(
    table: string,
    filters: string[],
    orderBy?: string
  ): Promise<QueryOptimization> {
    const key = `${table}:${filters.join(',')}:${orderBy || ''}`;
    
    // Track query pattern
    const pattern = this.queryPatterns.get(key) || {
      table,
      filters,
      frequency: 0,
    };
    pattern.frequency++;
    this.queryPatterns.set(key, pattern);

    // Generate optimization suggestions
    const improvements: string[] = [];
    let estimatedSpeedup = 1;

    // Check for missing indexes
    const indexSuggestions = await this.suggestIndexes(table, filters);
    if (indexSuggestions.length > 0) {
      improvements.push(...indexSuggestions);
      estimatedSpeedup *= 2;
    }

    // Check for full table scans
    if (filters.length === 0) {
      improvements.push('Add filters to avoid full table scan');
      improvements.push('Consider pagination with .range()');
    }

    // Check for common anti-patterns
    if (filters.includes('created_at') && !orderBy?.includes('created_at')) {
      improvements.push('Consider ordering by created_at when filtering by date');
    }

    // Build optimized query suggestion
    const original = this.buildQueryString(table, filters, orderBy);
    const optimized = this.buildOptimizedQueryString(table, filters, orderBy, improvements);

    return {
      original,
      optimized,
      improvements,
      estimatedSpeedup,
    };
  }

  /**
   * Suggest indexes based on query patterns
   */
  async suggestIndexes(table: string, columns: string[]): Promise<string[]> {
    const suggestions: string[] = [];
    
    // Check existing indexes
    const existingIndexes = await this.getExistingIndexes(table);
    
    // Single column indexes
    for (const column of columns) {
      if (!existingIndexes.some(idx => idx.includes(column))) {
        suggestions.push(`CREATE INDEX idx_${table}_${column} ON ${table}(${column})`);
      }
    }

    // Composite indexes for frequently used combinations
    if (columns.length > 1) {
      const compositeKey = columns.sort().join('_');
      if (!existingIndexes.some(idx => idx.includes(compositeKey))) {
        suggestions.push(
          `CREATE INDEX idx_${table}_${compositeKey} ON ${table}(${columns.join(', ')})`
        );
      }
    }

    return suggestions;
  }

  /**
   * Suggest materialized views for complex queries
   */
  suggestMaterializedViews(patterns: QueryPattern[]): MaterializedView[] {
    const views: MaterializedView[] = [];
    
    // Find high-frequency patterns that would benefit from materialization
    const highFrequencyPatterns = patterns.filter(p => p.frequency > 100);
    
    for (const pattern of highFrequencyPatterns) {
      if (pattern.table === 'analytics_events' && pattern.filters.includes('user_id')) {
        views.push({
          name: 'mv_user_analytics_summary',
          query: `
            CREATE MATERIALIZED VIEW mv_user_analytics_summary AS
            SELECT 
              user_id,
              DATE(created_at) as date,
              COUNT(*) as event_count,
              SUM(value) as total_value,
              AVG(value) as avg_value
            FROM analytics_events
            GROUP BY user_id, DATE(created_at)
          `,
          refreshInterval: 'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_analytics_summary',
          indices: [
            'CREATE INDEX idx_mv_user_analytics_user_date ON mv_user_analytics_summary(user_id, date)',
          ],
        });
      }

      if (pattern.table === 'study_sessions' && pattern.filters.includes('user_id')) {
        views.push({
          name: 'mv_user_study_stats',
          query: `
            CREATE MATERIALIZED VIEW mv_user_study_stats AS
            SELECT 
              user_id,
              DATE(created_at) as study_date,
              COUNT(*) as session_count,
              SUM(duration) as total_minutes,
              MAX(duration) as longest_session
            FROM study_sessions
            GROUP BY user_id, DATE(created_at)
          `,
          refreshInterval: 'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_study_stats',
          indices: [
            'CREATE INDEX idx_mv_study_stats_user ON mv_user_study_stats(user_id)',
            'CREATE INDEX idx_mv_study_stats_date ON mv_user_study_stats(study_date DESC)',
          ],
        });
      }
    }

    return views;
  }

  /**
   * Get query execution plan
   */
  async explainQuery(_query: string): Promise<{
    plan: string;
    cost: number;
    suggestions: string[];
  }> {
    try {
      // This would need direct DB access to run EXPLAIN
      // For now, return mock data
      return {
        plan: 'Seq Scan on table',
        cost: 1000,
        suggestions: [
          'Consider adding an index',
          'Use more selective filters',
        ],
      };
    } catch (error) {
      logger.error('Error explaining query:', error);
      throw error;
    }
  }

  /**
   * Optimize bulk operations
   */
  optimizeBulkOperation(
    operation: 'insert' | 'update' | 'delete',
    recordCount: number
  ): {
    strategy: string;
    batchSize: number;
    parallelism: number;
  } {
    if (operation === 'insert') {
      if (recordCount > 10000) {
        return {
          strategy: 'Use COPY command via direct connection',
          batchSize: 5000,
          parallelism: 4,
        };
      } else if (recordCount > 1000) {
        return {
          strategy: 'Use multi-value INSERT',
          batchSize: 500,
          parallelism: 2,
        };
      } else {
        return {
          strategy: 'Use batched inserts',
          batchSize: 100,
          parallelism: 1,
        };
      }
    }

    if (operation === 'update' || operation === 'delete') {
      return {
        strategy: 'Use batched operations with transactions',
        batchSize: recordCount > 1000 ? 200 : 50,
        parallelism: 1,
      };
    }

    return {
      strategy: 'Standard operation',
      batchSize: 100,
      parallelism: 1,
    };
  }

  /**
   * Monitor slow queries
   */
  async getSlowQueries(_thresholdMs: number = 1000): Promise<Array<{
    query: string;
    duration: number;
    timestamp: Date;
    suggestions: string[];
  }>> {
    // This would integrate with query logs
    // For now, return mock data
    return [
      {
        query: 'SELECT * FROM large_table WHERE status = ?',
        duration: 2500,
        timestamp: new Date(),
        suggestions: [
          'Add index on status column',
          'Consider partitioning the table',
        ],
      },
    ];
  }

  /**
   * Private helper methods
   */
  private async getExistingIndexes(_table: string): Promise<string[]> {
    // This would query pg_indexes
    // For now, return empty array
    return [];
  }

  private buildQueryString(
    table: string,
    filters: string[],
    orderBy?: string
  ): string {
    let query = `SELECT * FROM ${table}`;
    
    if (filters.length > 0) {
      query += ` WHERE ${filters.map(f => `${f} = ?`).join(' AND ')}`;
    }
    
    if (orderBy) {
      query += ` ORDER BY ${orderBy}`;
    }
    
    return query;
  }

  private buildOptimizedQueryString(
    table: string,
    filters: string[],
    orderBy: string | undefined,
    _improvements: string[]
  ): string {
    let query = `SELECT /* optimized */ * FROM ${table}`;
    
    if (filters.length > 0) {
      query += ` WHERE ${filters.map(f => `${f} = ?`).join(' AND ')}`;
    }
    
    if (orderBy) {
      query += ` ORDER BY ${orderBy}`;
    }
    
    // Add limit if not present
    if (!query.includes('LIMIT')) {
      query += ' LIMIT 100';
    }
    
    return query;
  }

  /**
   * Get optimization report
   */
  async getOptimizationReport(): Promise<{
    topPatterns: QueryPattern[];
    suggestedIndexes: string[];
    suggestedViews: MaterializedView[];
  }> {
    const topPatterns = Array.from(this.queryPatterns.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);

    const allIndexes = new Set<string>();
    
    for (const pattern of topPatterns) {
      const indexes = await this.suggestIndexes(pattern.table, pattern.filters);
      indexes.forEach((idx: string) => allIndexes.add(idx));
    }

    const suggestedViews = this.suggestMaterializedViews(topPatterns);

    return {
      topPatterns,
      suggestedIndexes: Array.from(allIndexes),
      suggestedViews,
    };
  }
}

// Export singleton instance
export const queryOptimizer = new QueryOptimizer();