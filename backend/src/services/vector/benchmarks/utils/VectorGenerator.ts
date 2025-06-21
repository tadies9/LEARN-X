export class VectorGenerator {
  /**
   * Generate random vectors
   */
  static generateRandomVectors(count: number, dimensions: number): number[][] {
    const vectors: number[][] = [];

    for (let i = 0; i < count; i++) {
      const vector = Array.from(
        { length: dimensions },
        () => Math.random() * 2 - 1 // Random values between -1 and 1
      );

      // Normalize vector
      const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
      const normalized = vector.map((val) => val / magnitude);

      vectors.push(normalized);
    }

    return vectors;
  }

  /**
   * Generate test documents
   */
  static generateDocuments(count: number, testVectors: number[][]): any[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `doc_${i}`,
      vector: testVectors[i],
      metadata: {
        index: i,
        category: `category_${i % 10}`,
        timestamp: new Date().toISOString(),
      },
      content: `Test document ${i} with sample content for benchmarking`,
    }));
  }

  /**
   * Create batches from items
   */
  static createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    return batches;
  }
}