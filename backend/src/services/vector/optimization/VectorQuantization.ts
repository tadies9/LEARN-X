// Removed unused import '../../../utils/logger';

export interface QuantizationConfig {
  method: 'scalar' | 'product' | 'binary';
  bits: 4 | 8 | 16; // For scalar quantization
  codebookSize?: number; // For product quantization
  subVectorSize?: number; // For product quantization
}

export interface QuantizedVector {
  originalDimensions: number;
  quantizedData: Uint8Array | Uint16Array;
  quantizationInfo: {
    method: string;
    scale?: number;
    offset?: number;
    codebook?: number[][] | number[][][];
  };
}

export class VectorQuantization {
  private config: QuantizationConfig;

  constructor(config: QuantizationConfig) {
    this.config = config;
  }

  /**
   * Quantize a single vector
   */
  quantize(vector: number[]): QuantizedVector {
    switch (this.config.method) {
      case 'scalar':
        return this.scalarQuantize(vector);
      case 'product':
        return this.productQuantize(vector);
      case 'binary':
        return this.binaryQuantize(vector);
      default:
        throw new Error(`Unsupported quantization method: ${this.config.method}`);
    }
  }

  /**
   * Quantize multiple vectors
   */
  quantizeBatch(vectors: number[][]): QuantizedVector[] {
    if (vectors.length === 0) return [];

    // For product quantization, we need to train a codebook
    if (this.config.method === 'product') {
      return this.productQuantizeBatch(vectors);
    }

    // For scalar and binary quantization, process individually
    return vectors.map(vector => this.quantize(vector));
  }

  /**
   * Dequantize a vector (approximate reconstruction)
   */
  dequantize(quantized: QuantizedVector): number[] {
    switch (quantized.quantizationInfo.method) {
      case 'scalar':
        return this.scalarDequantize(quantized);
      case 'product':
        return this.productDequantize(quantized);
      case 'binary':
        return this.binaryDequantize(quantized);
      default:
        throw new Error(`Unsupported quantization method: ${quantized.quantizationInfo.method}`);
    }
  }

  /**
   * Calculate compression ratio
   */
  getCompressionRatio(originalDimensions: number): number {
    const originalSize = originalDimensions * 32; // 32 bits for float

    let quantizedSize: number;
    switch (this.config.method) {
      case 'scalar':
        quantizedSize = originalDimensions * this.config.bits;
        break;
      case 'product':
        const subVectors = Math.ceil(originalDimensions / (this.config.subVectorSize || 8));
        quantizedSize = subVectors * 8; // Assuming 8-bit indices
        break;
      case 'binary':
        quantizedSize = originalDimensions; // 1 bit per dimension
        break;
      default:
        quantizedSize = originalSize;
    }

    return originalSize / quantizedSize;
  }

  /**
   * Estimate search accuracy after quantization
   */
  estimateAccuracy(): number {
    // Rough estimates based on typical quantization performance
    switch (this.config.method) {
      case 'scalar':
        return this.config.bits === 8 ? 0.95 : this.config.bits === 4 ? 0.85 : 0.98;
      case 'product':
        return 0.90; // Depends on codebook size and subvector size
      case 'binary':
        return 0.75; // Significant accuracy loss but huge compression
      default:
        return 1.0;
    }
  }

  /**
   * Scalar quantization implementation
   */
  private scalarQuantize(vector: number[]): QuantizedVector {
    const min = Math.min(...vector);
    const max = Math.max(...vector);
    const range = max - min;
    const scale = range / ((1 << this.config.bits) - 1);
    
    let quantizedData: Uint8Array | Uint16Array;
    
    if (this.config.bits <= 8) {
      quantizedData = new Uint8Array(vector.length);
      for (let i = 0; i < vector.length; i++) {
        quantizedData[i] = Math.round((vector[i] - min) / scale);
      }
    } else {
      quantizedData = new Uint16Array(vector.length);
      for (let i = 0; i < vector.length; i++) {
        (quantizedData as Uint16Array)[i] = Math.round((vector[i] - min) / scale);
      }
    }

    return {
      originalDimensions: vector.length,
      quantizedData,
      quantizationInfo: {
        method: 'scalar',
        scale,
        offset: min,
      },
    };
  }

  /**
   * Scalar dequantization
   */
  private scalarDequantize(quantized: QuantizedVector): number[] {
    const { scale, offset } = quantized.quantizationInfo;
    const result = new Array(quantized.originalDimensions);

    for (let i = 0; i < quantized.originalDimensions; i++) {
      result[i] = quantized.quantizedData[i] * scale! + offset!;
    }

    return result;
  }

  /**
   * Product quantization implementation
   */
  private productQuantize(vector: number[]): QuantizedVector {
    // This is a simplified implementation
    // In practice, you'd need to train codebooks
    const subVectorSize = this.config.subVectorSize || 8;
    const numSubVectors = Math.ceil(vector.length / subVectorSize);
    const codebookSize = this.config.codebookSize || 256;
    
    // Generate random codebook (in practice, use k-means clustering)
    const codebook = this.generateRandomCodebook(subVectorSize, codebookSize);
    
    const quantizedData = new Uint8Array(numSubVectors);
    
    for (let i = 0; i < numSubVectors; i++) {
      const startIdx = i * subVectorSize;
      const endIdx = Math.min(startIdx + subVectorSize, vector.length);
      const subVector = vector.slice(startIdx, endIdx);
      
      // Pad if necessary
      while (subVector.length < subVectorSize) {
        subVector.push(0);
      }
      
      // Find nearest codeword
      let bestIdx = 0;
      let bestDistance = Infinity;
      
      for (let j = 0; j < codebook.length; j++) {
        const distance = this.euclideanDistance(subVector, codebook[j]);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIdx = j;
        }
      }
      
      quantizedData[i] = bestIdx;
    }

    return {
      originalDimensions: vector.length,
      quantizedData,
      quantizationInfo: {
        method: 'product',
        codebook,
      },
    };
  }

  /**
   * Product quantization for batches (with proper codebook training)
   */
  private productQuantizeBatch(vectors: number[][]): QuantizedVector[] {
    const subVectorSize = this.config.subVectorSize || 8;
    const codebookSize = this.config.codebookSize || 256;
    const dimensions = vectors[0].length;
    const numSubVectors = Math.ceil(dimensions / subVectorSize);

    // Train codebooks for each subvector position
    const codebooks: number[][][] = [];
    
    for (let i = 0; i < numSubVectors; i++) {
      const startIdx = i * subVectorSize;
      const endIdx = Math.min(startIdx + subVectorSize, dimensions);
      
      // Collect all subvectors at this position
      const subVectors = vectors.map(v => {
        const sub = v.slice(startIdx, endIdx);
        while (sub.length < subVectorSize) {
          sub.push(0);
        }
        return sub;
      });
      
      // Train codebook using k-means (simplified)
      const codebook = this.trainCodebook(subVectors, codebookSize);
      codebooks.push(codebook);
    }

    // Now quantize all vectors using trained codebooks
    return vectors.map(vector => {
      const quantizedData = new Uint8Array(numSubVectors);
      
      for (let i = 0; i < numSubVectors; i++) {
        const startIdx = i * subVectorSize;
        const endIdx = Math.min(startIdx + subVectorSize, vector.length);
        const subVector = vector.slice(startIdx, endIdx);
        
        while (subVector.length < subVectorSize) {
          subVector.push(0);
        }
        
        // Find nearest codeword in the codebook for this position
        let bestIdx = 0;
        let bestDistance = Infinity;
        
        for (let j = 0; j < codebooks[i].length; j++) {
          const distance = this.euclideanDistance(subVector, codebooks[i][j]);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestIdx = j;
          }
        }
        
        quantizedData[i] = bestIdx;
      }

      return {
        originalDimensions: vector.length,
        quantizedData,
        quantizationInfo: {
          method: 'product',
          codebook: codebooks,
        },
      };
    });
  }

  /**
   * Product dequantization
   */
  private productDequantize(quantized: QuantizedVector): number[] {
    const codebooks = quantized.quantizationInfo.codebook as number[][][];
    const result: number[] = [];

    for (let i = 0; i < quantized.quantizedData.length; i++) {
      const codewordIdx = quantized.quantizedData[i];
      const codeword = codebooks[i][codewordIdx];
      result.push(...codeword);
    }

    return result.slice(0, quantized.originalDimensions);
  }

  /**
   * Binary quantization (sign-based)
   */
  private binaryQuantize(vector: number[]): QuantizedVector {
    const bitsPerByte = 8;
    const numBytes = Math.ceil(vector.length / bitsPerByte);
    const quantizedData = new Uint8Array(numBytes);

    for (let i = 0; i < vector.length; i++) {
      const byteIdx = Math.floor(i / bitsPerByte);
      const bitIdx = i % bitsPerByte;
      
      if (vector[i] >= 0) {
        quantizedData[byteIdx] |= (1 << bitIdx);
      }
    }

    return {
      originalDimensions: vector.length,
      quantizedData,
      quantizationInfo: {
        method: 'binary',
      },
    };
  }

  /**
   * Binary dequantization
   */
  private binaryDequantize(quantized: QuantizedVector): number[] {
    const bitsPerByte = 8;
    const result = new Array(quantized.originalDimensions);

    for (let i = 0; i < quantized.originalDimensions; i++) {
      const byteIdx = Math.floor(i / bitsPerByte);
      const bitIdx = i % bitsPerByte;
      
      const bit = (quantized.quantizedData[byteIdx] >> bitIdx) & 1;
      result[i] = bit === 1 ? 1.0 : -1.0;
    }

    return result;
  }

  /**
   * Helper methods
   */
  private euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  private generateRandomCodebook(dimensions: number, size: number): number[][] {
    const codebook: number[][] = [];
    
    for (let i = 0; i < size; i++) {
      const codeword: number[] = [];
      for (let j = 0; j < dimensions; j++) {
        codeword.push(Math.random() * 2 - 1); // Random values between -1 and 1
      }
      codebook.push(codeword);
    }
    
    return codebook;
  }

  private trainCodebook(vectors: number[][], k: number): number[][] {
    // Simplified k-means implementation
    if (vectors.length === 0) return [];
    
    const dimensions = vectors[0].length;
    const centroids: number[][] = [];
    
    // Initialize centroids randomly
    for (let i = 0; i < k; i++) {
      const centroid: number[] = [];
      for (let j = 0; j < dimensions; j++) {
        centroid.push(Math.random() * 2 - 1);
      }
      centroids.push(centroid);
    }
    
    // Run a few iterations of k-means
    for (let iter = 0; iter < 10; iter++) {
      const clusters: number[][][] = Array.from({ length: k }, () => []);
      
      // Assign vectors to closest centroids
      for (const vector of vectors) {
        let bestIdx = 0;
        let bestDistance = Infinity;
        
        for (let i = 0; i < centroids.length; i++) {
          const distance = this.euclideanDistance(vector, centroids[i]);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestIdx = i;
          }
        }
        
        clusters[bestIdx].push(vector);
      }
      
      // Update centroids
      for (let i = 0; i < k; i++) {
        if (clusters[i].length > 0) {
          for (let j = 0; j < dimensions; j++) {
            const sum = clusters[i].reduce((acc, vector) => acc + vector[j], 0);
            centroids[i][j] = sum / clusters[i].length;
          }
        }
      }
    }
    
    return centroids;
  }
}

/**
 * Factory function to create quantizer with optimal settings
 */
export function createOptimalQuantizer(options: {
  targetCompressionRatio: number;
  minAccuracy: number;
  vectorDimensions: number;
}): VectorQuantization {
  const { targetCompressionRatio, minAccuracy, vectorDimensions } = options;

  // Choose quantization method based on requirements
  if (targetCompressionRatio >= 32 && minAccuracy >= 0.7) {
    // Binary quantization for maximum compression
    return new VectorQuantization({
      method: 'binary',
      bits: 4,
    });
  } else if (targetCompressionRatio >= 8 && minAccuracy >= 0.85) {
    // Product quantization for good compression with decent accuracy
    return new VectorQuantization({
      method: 'product',
      bits: 8,
      codebookSize: 256,
      subVectorSize: Math.min(8, Math.floor(vectorDimensions / 16)),
    });
  } else if (targetCompressionRatio >= 4 && minAccuracy >= 0.95) {
    // 8-bit scalar quantization for balanced approach
    return new VectorQuantization({
      method: 'scalar',
      bits: 8,
    });
  } else {
    // 16-bit scalar quantization for high accuracy
    return new VectorQuantization({
      method: 'scalar',
      bits: 16,
    });
  }
}