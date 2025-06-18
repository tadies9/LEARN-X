import { QueryIntent } from './AccuracyCalculator';

export class QueryProcessor {
  /**
   * Analyze query intent to improve search accuracy
   */
  analyzeQueryIntent(query: string): QueryIntent {
    const lowerQuery = query.toLowerCase();

    // Detect query type based on patterns
    let type: QueryIntent['type'] = 'general';
    const expectedContentTypes: string[] = [];

    if (
      lowerQuery.includes('what is') ||
      lowerQuery.includes('define') ||
      lowerQuery.includes('definition')
    ) {
      type = 'definition';
      expectedContentTypes.push('definition', 'key-concept');
    } else if (
      lowerQuery.includes('explain') ||
      lowerQuery.includes('how does') ||
      lowerQuery.includes('why')
    ) {
      type = 'explanation';
      expectedContentTypes.push('explanation', 'theory');
    } else if (
      lowerQuery.includes('example') ||
      lowerQuery.includes('instance') ||
      lowerQuery.includes('demonstrate')
    ) {
      type = 'example';
      expectedContentTypes.push('example', 'practice');
    } else if (
      lowerQuery.includes('difference') ||
      lowerQuery.includes('compare') ||
      lowerQuery.includes('versus')
    ) {
      type = 'comparison';
      expectedContentTypes.push('comparison', 'explanation');
    } else if (
      lowerQuery.includes('how to') ||
      lowerQuery.includes('steps') ||
      lowerQuery.includes('implement')
    ) {
      type = 'how-to';
      expectedContentTypes.push('practice', 'example', 'steps');
    }

    // Extract key concepts and keywords using enhanced methods
    const concepts = this.extractConcepts(query);
    const keywords = this.extractEnhancedKeywords(query);

    return {
      type,
      keywords,
      concepts,
      expectedContentTypes,
    };
  }

  /**
   * Optimize search parameters based on query intent
   */
  optimizeSearchForIntent(intent: QueryIntent, baseOptions: any): any {
    const options = { ...baseOptions };

    switch (intent.type) {
      case 'definition':
        options.weightVector = 0.6;
        options.weightKeyword = 0.4;
        options.filters = {
          ...options.filters,
          contentTypes: intent.expectedContentTypes,
          importance: ['high', 'medium'],
        };
        options.limit = 5;
        break;

      case 'explanation':
        options.weightVector = 0.8;
        options.weightKeyword = 0.2;
        options.semanticBoost = true;
        options.contextWindow = 5;
        options.limit = 10;
        break;

      case 'example':
        options.weightVector = 0.7;
        options.weightKeyword = 0.3;
        options.filters = {
          ...options.filters,
          contentTypes: intent.expectedContentTypes,
        };
        options.diversityFactor = 0.4;
        break;

      case 'comparison':
        options.weightVector = 0.75;
        options.weightKeyword = 0.25;
        options.diversityFactor = 0.5;
        options.limit = 15;
        break;

      case 'how-to':
        options.weightVector = 0.5;
        options.weightKeyword = 0.5;
        options.filters = {
          ...options.filters,
          contentTypes: ['practice', 'example', 'steps'],
        };
        options.rerank = true;
        break;

      default:
        options.weightVector = 0.7;
        options.weightKeyword = 0.3;
        options.semanticBoost = true;
    }

    return options;
  }

  /**
   * Extract concepts from query using enhanced NLP
   */
  private extractConcepts(query: string): string[] {
    const concepts: string[] = [];

    // Common ML/AI concepts (expand this list based on your domain)
    const knownConcepts = [
      'machine learning',
      'neural network',
      'deep learning',
      'artificial intelligence',
      'algorithm',
      'optimization',
      'gradient descent',
      'backpropagation',
      'training',
      'model',
      'dataset',
      'feature',
      'classification',
      'regression',
      'clustering',
      'supervised learning',
      'unsupervised learning',
      'reinforcement learning',
    ];

    const lowerQuery = query.toLowerCase();
    knownConcepts.forEach((concept) => {
      if (lowerQuery.includes(concept)) {
        concepts.push(concept);
      }
    });

    // Extract noun phrases (simplified)
    const words = query.split(/\s+/);
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`.toLowerCase();
      if (!concepts.includes(bigram) && this.isLikelyNounPhrase(bigram)) {
        concepts.push(bigram);
      }
    }

    return [...new Set(concepts)];
  }

  /**
   * Enhanced keyword extraction
   */
  private extractEnhancedKeywords(query: string): string[] {
    const stopWords = new Set([
      'a',
      'an',
      'and',
      'are',
      'as',
      'at',
      'be',
      'by',
      'for',
      'from',
      'has',
      'he',
      'in',
      'is',
      'it',
      'its',
      'of',
      'on',
      'that',
      'the',
      'to',
      'was',
      'will',
      'with',
      'what',
      'when',
      'where',
      'who',
      'why',
      'how',
      'can',
      'could',
      'should',
      'would',
      'does',
      'do',
      'did',
      'explain',
      'show',
      'tell',
    ]);

    const words = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word));

    // Add stemmed versions (simplified)
    const keywords = new Set(words);
    words.forEach((word) => {
      if (word.endsWith('ing')) {
        keywords.add(word.slice(0, -3));
      } else if (word.endsWith('ed')) {
        keywords.add(word.slice(0, -2));
      } else if (word.endsWith('s') && word.length > 3) {
        keywords.add(word.slice(0, -1));
      }
    });

    return Array.from(keywords);
  }

  /**
   * Check if a phrase is likely a noun phrase
   */
  private isLikelyNounPhrase(phrase: string): boolean {
    const words = phrase.split(' ');
    if (words.length !== 2) return false;

    // Simple heuristic: avoid phrases starting with verbs
    const verbStarts = ['is', 'are', 'was', 'were', 'have', 'has', 'had'];
    return !verbStarts.includes(words[0]);
  }
}
