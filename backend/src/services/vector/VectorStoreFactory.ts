import { IVectorStore, IVectorStoreFactory } from './interfaces/IVectorStore';
import { PgVectorStore } from './stores/PgVectorStore';
import { logger } from '../../utils/logger';

export type VectorStoreProvider = 'pgvector';

export interface VectorStoreConfig {
  provider: VectorStoreProvider;
  // Provider-specific configurations
  pgvector?: {
    tableName?: string;
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

      default:
        throw new Error(`Unsupported vector store provider: ${provider}`);
    }

    this.stores.set(provider, store);
    logger.info(`[VectorStoreFactory] Created new ${provider} instance`);

    return store;
  }

  isSupported(provider: string): boolean {
    return ['pgvector'].includes(provider);
  }

  getProviders(): string[] {
    return ['pgvector'];
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
