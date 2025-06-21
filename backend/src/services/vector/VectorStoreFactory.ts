import { IVectorStore, IVectorStoreFactory } from './interfaces/IVectorStore';
import { PgVectorStore } from './stores/PgVectorStore';
import { PineconeStore } from './stores/PineconeStore';
import { WeaviateStore } from './stores/WeaviateStore';
import { QdrantStore } from './stores/QdrantStore';
import { logger } from '../../utils/logger';

export type VectorStoreProvider = 'pgvector' | 'pinecone' | 'weaviate' | 'qdrant';

export interface VectorStoreConfig {
  provider: VectorStoreProvider;
  // Provider-specific configurations
  pgvector?: {
    tableName?: string;
  };
  pinecone?: {
    apiKey: string;
    environment: string;
    indexName?: string;
  };
  weaviate?: {
    url: string;
    apiKey?: string;
    className?: string;
  };
  qdrant?: {
    url: string;
    apiKey?: string;
    collectionName?: string;
  };
}

export class VectorStoreFactory implements IVectorStoreFactory {
  private static instance: VectorStoreFactory;
  private stores: Map<string, IVectorStore> = new Map();

  private constructor() {}

  static getInstance(): VectorStoreFactory {
    if (!VectorStoreFactory.instance) {
      VectorStoreFactory.instance = new VectorStoreFactory();
    }
    return VectorStoreFactory.instance;
  }

  create(provider: string, config?: any): IVectorStore {
    // Return existing instance if already created
    if (this.stores.has(provider)) {
      logger.info(`[VectorStoreFactory] Returning existing ${provider} instance`);
      return this.stores.get(provider)!;
    }

    let store: IVectorStore;

    switch (provider) {
      case 'pgvector':
        store = new PgVectorStore();
        break;

      case 'pinecone':
        if (!config?.pinecone?.apiKey) {
          throw new Error('Pinecone API key is required');
        }
        store = new PineconeStore();
        break;

      case 'weaviate':
        if (!config?.weaviate?.url) {
          throw new Error('Weaviate URL is required');
        }
        store = new WeaviateStore();
        break;

      case 'qdrant':
        if (!config?.qdrant?.url) {
          throw new Error('Qdrant URL is required');
        }
        store = new QdrantStore();
        break;

      default:
        throw new Error(`Unsupported vector store provider: ${provider}`);
    }

    this.stores.set(provider, store);
    logger.info(`[VectorStoreFactory] Created new ${provider} instance`);

    return store;
  }

  isSupported(provider: string): boolean {
    return ['pgvector', 'pinecone', 'weaviate', 'qdrant'].includes(provider);
  }

  getProviders(): string[] {
    return ['pgvector', 'pinecone', 'weaviate', 'qdrant'];
  }

  /**
   * Get or create a vector store instance
   */
  async getStore(config: VectorStoreConfig): Promise<IVectorStore> {
    const store = this.create(config.provider, config);

    // Initialize if not already initialized
    const isHealthy = await store.healthCheck();
    if (!isHealthy) {
      logger.info(`[VectorStoreFactory] Initializing ${config.provider} store`);
      await store.initialize({
        dimensions: 1536, // Default OpenAI embedding dimensions
        metric: 'cosine',
      });
    }

    return store;
  }

  /**
   * Close all vector store connections
   */
  async closeAll(): Promise<void> {
    const closePromises = Array.from(this.stores.values()).map((store) =>
      store
        .close()
        .catch((error) => logger.error('[VectorStoreFactory] Error closing store', error))
    );

    await Promise.all(closePromises);
    this.stores.clear();

    logger.info('[VectorStoreFactory] All stores closed');
  }
}

// Export singleton instance
export const vectorStoreFactory = VectorStoreFactory.getInstance();
