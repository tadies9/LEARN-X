import { Pool, PoolClient } from 'pg';
import { logger } from '../../utils/logger';

interface AnalyticsData {
  userId: string;
  metric: string;
  value: number;
  timestamp: Date;
}

interface BulkEvent {
  userId: string;
  eventType: string;
  metadata: Record<string, any>;
  timestamp: Date;
}

interface AggregatedStats {
  totalUsers: number;
  totalEvents: number;
  avgEventValue: number;
  topEventTypes: Array<{ type: string; count: number }>;
}

interface TimeRange {
  start: Date;
  end: Date;
}

/**
 * Direct Postgres connection service for performance-critical operations
 * Bypasses Supabase RLS for read-heavy analytics and bulk operations
 */
export class DirectPostgresService {
  private pool: Pool;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;

  constructor() {
    // Parse DATABASE_URL or use individual config
    const connectionString = process.env.DATABASE_URL || this.buildConnectionString();

    this.pool = new Pool({
      connectionString,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected Postgres pool error:', err);
    });

    logger.info('Direct Postgres connection pool initialized');
  }

  /**
   * Bulk fetch analytics data for multiple users
   */
  async bulkFetchAnalytics(
    userIds: string[],
    metric?: string,
    timeRange?: TimeRange
  ): Promise<AnalyticsData[]> {
    const client = await this.pool.connect();

    try {
      let query = `
        SELECT 
          user_id,
          metric,
          value,
          created_at as timestamp
        FROM analytics_events
        WHERE user_id = ANY($1)
      `;

      const params: any[] = [userIds];
      let paramIndex = 2;

      if (metric) {
        query += ` AND metric = $${paramIndex}`;
        params.push(metric);
        paramIndex++;
      }

      if (timeRange) {
        query += ` AND created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
        params.push(timeRange.start, timeRange.end);
      }

      query += ' ORDER BY created_at DESC LIMIT 10000';

      const result = await client.query(query, params);

      return result.rows.map((row) => ({
        userId: row.user_id,
        metric: row.metric,
        value: row.value,
        timestamp: row.timestamp,
      }));
    } catch (error) {
      logger.error('Error bulk fetching analytics:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Batch insert events with high performance
   */
  async batchInsertEvents(events: BulkEvent[]): Promise<void> {
    if (events.length === 0) return;

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Use COPY for maximum performance with large datasets
      if (events.length > 1000) {
        await this.bulkCopy(client, events);
      } else {
        // Use multi-value INSERT for smaller batches
        await this.multiValueInsert(client, events);
      }

      await client.query('COMMIT');

      logger.info(`Successfully inserted ${events.length} events`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error batch inserting events:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get aggregated statistics with optimized queries
   */
  async getAggregatedStats(timeRange: TimeRange): Promise<AggregatedStats> {
    const client = await this.pool.connect();

    try {
      // Use parallel queries for better performance
      const [usersResult, eventsResult, topTypesResult] = await Promise.all([
        client.query(
          'SELECT COUNT(DISTINCT user_id) as count FROM analytics_events WHERE created_at BETWEEN $1 AND $2',
          [timeRange.start, timeRange.end]
        ),
        client.query(
          'SELECT COUNT(*) as total, AVG(value) as avg_value FROM analytics_events WHERE created_at BETWEEN $1 AND $2',
          [timeRange.start, timeRange.end]
        ),
        client.query(
          `
          SELECT event_type, COUNT(*) as count
          FROM analytics_events
          WHERE created_at BETWEEN $1 AND $2
          GROUP BY event_type
          ORDER BY count DESC
          LIMIT 10
        `,
          [timeRange.start, timeRange.end]
        ),
      ]);

      return {
        totalUsers: parseInt(usersResult.rows[0]?.count || '0'),
        totalEvents: parseInt(eventsResult.rows[0]?.total || '0'),
        avgEventValue: parseFloat(eventsResult.rows[0]?.avg_value || '0'),
        topEventTypes: topTypesResult.rows.map((row) => ({
          type: row.event_type,
          count: parseInt(row.count),
        })),
      };
    } catch (error) {
      logger.error('Error getting aggregated stats:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute raw query with retry logic
   */
  async executeQuery<T>(query: string, params?: any[], retries = this.maxRetries): Promise<T[]> {
    let lastError: Error | null = null;

    for (let i = 0; i < retries; i++) {
      const client = await this.pool.connect();

      try {
        const result = await client.query(query, params);
        return result.rows;
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Query failed (attempt ${i + 1}/${retries}):`, error);

        if (i < retries - 1) {
          await this.delay(this.retryDelay * (i + 1));
        }
      } finally {
        client.release();
      }
    }

    throw lastError || new Error('Query failed after retries');
  }

  /**
   * Create indexes for performance optimization
   */
  async createPerformanceIndexes(): Promise<void> {
    const indexes = [
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_user_created ON analytics_events(user_id, created_at DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_metric_created ON analytics_events(metric, created_at DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_type_created ON analytics_events(event_type, created_at DESC)',
    ];

    for (const indexQuery of indexes) {
      try {
        await this.executeQuery(indexQuery);
        logger.info(`Index created: ${indexQuery.split(' ')[5]}`);
      } catch (error) {
        logger.error('Error creating index:', error);
      }
    }
  }

  /**
   * Get query performance statistics
   */
  async getQueryStats(): Promise<
    Array<{
      query: string;
      calls: number;
      totalTime: number;
      meanTime: number;
    }>
  > {
    const query = `
      SELECT 
        query,
        calls,
        total_time,
        mean_time
      FROM pg_stat_statements
      WHERE query NOT LIKE '%pg_stat_statements%'
      ORDER BY total_time DESC
      LIMIT 20
    `;

    try {
      return await this.executeQuery(query);
    } catch (error) {
      logger.warn('pg_stat_statements not available:', error);
      return [];
    }
  }

  /**
   * Private helper methods
   */
  private buildConnectionString(): string {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || '5432';
    const database = process.env.DB_NAME || 'learnx';
    const user = process.env.DB_USER || 'postgres';
    const password = process.env.DB_PASSWORD || '';

    return `postgresql://${user}:${password}@${host}:${port}/${database}`;
  }

  private async bulkCopy(client: PoolClient, events: BulkEvent[]): Promise<void> {
    // For now, fall back to multi-value insert until pg-copy-streams is added
    // TODO: Implement proper COPY stream when pg-copy-streams is available
    return this.multiValueInsert(client, events);
  }

  private async multiValueInsert(client: PoolClient, events: BulkEvent[]): Promise<void> {
    const values: any[] = [];
    const placeholders: string[] = [];

    events.forEach((event, index) => {
      const base = index * 4;
      placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`);
      values.push(event.userId, event.eventType, JSON.stringify(event.metadata), event.timestamp);
    });

    const query = `
      INSERT INTO analytics_events (user_id, event_type, metadata, created_at)
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (id) DO NOTHING
    `;

    await client.query(query, values);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Alias for batchInsertEvents for backward compatibility
   */
  async bulkInsertEvents(events: BulkEvent[]): Promise<void> {
    return this.batchInsertEvents(events);
  }

  /**
   * Close the connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
    logger.info('Direct Postgres connection pool closed');
  }
}

// Export singleton instance
let directPostgresService: DirectPostgresService | null = null;

export function getDirectPostgresService(): DirectPostgresService {
  if (!directPostgresService) {
    directPostgresService = new DirectPostgresService();
  }
  return directPostgresService;
}
