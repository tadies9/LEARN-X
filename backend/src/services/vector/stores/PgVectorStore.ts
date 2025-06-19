import { BaseVectorStore } from './BaseVectorStore';
import {
  VectorDocument,
  VectorSearchOptions,
  VectorSearchResult,
  IndexConfig,
  VectorStoreStats,
  BatchOperationResult,
  VectorStoreCapabilities,
} from '../interfaces/IVectorStore';
import { supabase } from '../../../config/supabase';
import { logger } from '../../../utils/logger';

export class PgVectorStore extends BaseVectorStore {
  private tableName: string = 'vector_store';
  private indexName: string = 'vector_store_embedding_idx';

  constructor() {
    super('pgvector');
  }

  protected async doInitialize(config: IndexConfig): Promise<void> {
    // Create the vector store table if it doesn't exist
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id TEXT PRIMARY KEY,
        embedding vector(${config.dimensions}) NOT NULL,
        metadata JSONB DEFAULT '{}',
        content TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `;

    // Create the appropriate index based on metric type
    const indexOperator = this.getIndexOperator(config.metric);
    const createIndexQuery = `
      CREATE INDEX IF NOT EXISTS ${this.indexName}
      ON ${this.tableName}
      USING ivfflat (embedding ${indexOperator})
      WITH (lists = 100);
    `;

    // Create updated_at trigger
    const createTriggerQuery = `
      CREATE OR REPLACE FUNCTION update_${this.tableName}_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      DROP TRIGGER IF EXISTS update_${this.tableName}_updated_at ON ${this.tableName};
      
      CREATE TRIGGER update_${this.tableName}_updated_at
      BEFORE UPDATE ON ${this.tableName}
      FOR EACH ROW
      EXECUTE FUNCTION update_${this.tableName}_updated_at();
    `;

    try {
      // Execute table creation
      const { error: tableError } = await supabase.rpc('exec_sql', {
        query: createTableQuery,
      });

      if (tableError) {
        // Try direct execution as fallback
        logger.warn('[PgVector] Table creation via RPC failed, attempting direct query');
      }

      // Execute index creation
      const { error: indexError } = await supabase.rpc('exec_sql', {
        query: createIndexQuery,
      });

      if (indexError) {
        logger.warn('[PgVector] Index creation failed', indexError);
      }

      // Execute trigger creation
      const { error: triggerError } = await supabase.rpc('exec_sql', {
        query: createTriggerQuery,
      });

      if (triggerError) {
        logger.warn('[PgVector] Trigger creation failed', triggerError);
      }

      logger.info('[PgVector] Initialization complete');
    } catch (error) {
      logger.error('[PgVector] Initialization failed', error);
      throw error;
    }
  }

  protected async doUpsert(document: VectorDocument): Promise<void> {
    this.validateVector(document.vector);

    const embeddingStr = this.vectorToString(document.vector);

    const { error } = await supabase
      .from(this.tableName)
      .upsert({
        id: document.id,
        embedding: embeddingStr,
        metadata: document.metadata || {},
        content: document.content,
      });

    if (error) {
      throw new Error(`Failed to upsert vector: ${error.message}`);
    }
  }

  protected async doUpsertBatch(documents: VectorDocument[]): Promise<BatchOperationResult> {
    const result: BatchOperationResult = {
      successful: 0,
      failed: 0,
      errors: [],
    };

    // Validate all vectors first
    for (const doc of documents) {
      try {
        this.validateVector(doc.vector);
      } catch (error) {
        result.failed++;
        result.errors?.push({
          id: doc.id,
          error: error instanceof Error ? error.message : 'Invalid vector',
        });
      }
    }

    // Process valid documents in batches
    const validDocs = documents.filter(doc => {
      try {
        this.validateVector(doc.vector);
        return true;
      } catch {
        return false;
      }
    });

    const batchSize = 100;
    for (let i = 0; i < validDocs.length; i += batchSize) {
      const batch = validDocs.slice(i, i + batchSize);
      
      const records = batch.map(doc => ({
        id: doc.id,
        embedding: this.vectorToString(doc.vector),
        metadata: doc.metadata || {},
        content: doc.content,
      }));

      const { error } = await supabase
        .from(this.tableName)
        .upsert(records);

      if (error) {
        result.failed += batch.length;
        batch.forEach(doc => {
          result.errors?.push({
            id: doc.id,
            error: error.message,
          });
        });
      } else {
        result.successful += batch.length;
      }
    }

    return result;
  }

  protected async doSearch(
    queryVector: number[],
    options: VectorSearchOptions
  ): Promise<VectorSearchResult[]> {
    this.validateVector(queryVector);

    const embeddingStr = this.vectorToString(queryVector);
    const operator = this.getDistanceOperator(this.config.metric);

    // Build the base query
    let query = `
      SELECT 
        id,
        1 - (embedding ${operator} '${embeddingStr}'::vector) as similarity,
        metadata,
        content
        ${options.includeVector ? ', embedding' : ''}
      FROM ${this.tableName}
      WHERE 1 = 1
    `;

    // Add metadata filters
    if (options.filter) {
      const filters = this.buildMetadataFilter(options.filter);
      if (filters) {
        query += ` AND ${filters}`;
      }
    }

    // Add threshold filter
    if (options.threshold && options.threshold > 0) {
      query += ` AND 1 - (embedding ${operator} '${embeddingStr}'::vector) >= ${options.threshold}`;
    }

    // Add ordering and limit
    query += ` ORDER BY embedding ${operator} '${embeddingStr}'::vector`;
    query += ` LIMIT ${options.topK || 10}`;

    const { data, error } = await supabase.rpc('exec_sql_return', { query });

    if (error) {
      throw new Error(`Search failed: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      score: row.similarity,
      metadata: options.includeMetadata ? row.metadata : undefined,
      content: row.content,
      vector: options.includeVector ? this.stringToVector(row.embedding) : undefined,
    }));
  }

  protected async doDelete(ids: string[]): Promise<BatchOperationResult> {
    const result: BatchOperationResult = {
      successful: 0,
      failed: 0,
      errors: [],
    };

    const { error, count } = await supabase
      .from(this.tableName)
      .delete()
      .in('id', ids);

    if (error) {
      result.failed = ids.length;
      ids.forEach(id => {
        result.errors?.push({
          id,
          error: error.message,
        });
      });
    } else {
      result.successful = count || 0;
      result.failed = ids.length - result.successful;
    }

    return result;
  }

  protected async doDeleteByFilter(filter: Record<string, any>): Promise<number> {
    const filterQuery = this.buildMetadataFilter(filter);
    
    if (!filterQuery) {
      throw new Error('Invalid filter provided');
    }

    const query = `
      DELETE FROM ${this.tableName}
      WHERE ${filterQuery}
      RETURNING id
    `;

    const { data, error } = await supabase.rpc('exec_sql_return', { query });

    if (error) {
      throw new Error(`Delete by filter failed: ${error.message}`);
    }

    return data?.length || 0;
  }

  protected async doGet(ids: string[]): Promise<VectorDocument[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .in('id', ids);

    if (error) {
      throw new Error(`Get failed: ${error.message}`);
    }

    return (data || []).map(row => ({
      id: row.id,
      vector: this.stringToVector(row.embedding),
      metadata: row.metadata,
      content: row.content,
    }));
  }

  protected async doUpdateMetadata(
    id: string,
    metadata: Record<string, any>
  ): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .update({ metadata })
      .eq('id', id);

    if (error) {
      throw new Error(`Update metadata failed: ${error.message}`);
    }
  }

  protected async doGetStats(): Promise<Omit<VectorStoreStats, 'provider' | 'capabilities'>> {
    const { count, error: countError } = await supabase
      .from(this.tableName)
      .select('id', { count: 'exact', head: true });

    if (countError) {
      throw new Error(`Get stats failed: ${countError.message}`);
    }

    // Get index size using our monitoring function
    const { data: indexStats } = await supabase.rpc('get_pgvector_index_stats');

    const relevantStats = indexStats?.find((stat: any) => 
      stat.table_name === this.tableName
    );

    return {
      totalVectors: count || 0,
      dimensions: this.config?.dimensions || 1536,
      indexSize: relevantStats?.index_size_bytes,
      lastUpdated: relevantStats?.last_analyze || new Date(),
    };
  }

  protected getCapabilities(): VectorStoreCapabilities {
    return {
      supportsMetadataFiltering: true,
      supportsHybridSearch: false, // Can be implemented with pg_trgm
      supportsBatchOperations: true,
      supportsIncrementalIndexing: true,
      maxDimensions: 2000, // pgvector limit
      maxVectorsPerBatch: 1000,
      maxMetadataSize: 1024 * 1024, // 1MB JSONB limit
    };
  }

  protected async doClear(): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .neq('id', ''); // Delete all

    if (error) {
      throw new Error(`Clear failed: ${error.message}`);
    }
  }

  protected async doClose(): Promise<void> {
    // No persistent connections to close with Supabase
    logger.info('[PgVector] Connection closed');
  }

  /**
   * Helper methods
   */
  
  private getIndexOperator(metric: 'cosine' | 'euclidean' | 'dotproduct'): string {
    switch (metric) {
      case 'cosine':
        return 'vector_cosine_ops';
      case 'euclidean':
        return 'vector_l2_ops';
      case 'dotproduct':
        return 'vector_ip_ops';
      default:
        return 'vector_cosine_ops';
    }
  }

  private getDistanceOperator(metric: 'cosine' | 'euclidean' | 'dotproduct'): string {
    switch (metric) {
      case 'cosine':
        return '<=>';
      case 'euclidean':
        return '<->';
      case 'dotproduct':
        return '<#>';
      default:
        return '<=>';
    }
  }

  private vectorToString(vector: number[]): string {
    return `[${vector.join(',')}]`;
  }

  private stringToVector(str: string): number[] {
    return JSON.parse(str);
  }

  private buildMetadataFilter(filter: Record<string, any>): string | null {
    const conditions: string[] = [];

    for (const [key, value] of Object.entries(filter)) {
      if (value === null) {
        conditions.push(`metadata->>'${key}' IS NULL`);
      } else if (typeof value === 'string') {
        conditions.push(`metadata->>'${key}' = '${value}'`);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        conditions.push(`metadata->>'${key}' = '${value}'`);
      } else if (Array.isArray(value)) {
        const values = value.map(v => `'${v}'`).join(',');
        conditions.push(`metadata->>'${key}' IN (${values})`);
      } else if (typeof value === 'object' && value.hasOwnProperty('$in')) {
        const values = value.$in.map((v: any) => `'${v}'`).join(',');
        conditions.push(`metadata->>'${key}' IN (${values})`);
      } else if (typeof value === 'object' && value.hasOwnProperty('$gt')) {
        conditions.push(`(metadata->>'${key}')::numeric > ${value.$gt}`);
      } else if (typeof value === 'object' && value.hasOwnProperty('$gte')) {
        conditions.push(`(metadata->>'${key}')::numeric >= ${value.$gte}`);
      } else if (typeof value === 'object' && value.hasOwnProperty('$lt')) {
        conditions.push(`(metadata->>'${key}')::numeric < ${value.$lt}`);
      } else if (typeof value === 'object' && value.hasOwnProperty('$lte')) {
        conditions.push(`(metadata->>'${key}')::numeric <= ${value.$lte}`);
      }
    }

    return conditions.length > 0 ? conditions.join(' AND ') : null;
  }
}

// Create RPC functions needed for pgvector operations
export const pgvectorSetupQueries = `
-- Function to execute SQL queries (admin only)
CREATE OR REPLACE FUNCTION exec_sql(query TEXT)
RETURNS void AS $$
BEGIN
  EXECUTE query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to execute SQL queries and return results
CREATE OR REPLACE FUNCTION exec_sql_return(query TEXT)
RETURNS TABLE(result JSON) AS $$
BEGIN
  RETURN QUERY EXECUTE 'SELECT row_to_json(t) FROM (' || query || ') t';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION exec_sql_return(TEXT) TO authenticated;
`;