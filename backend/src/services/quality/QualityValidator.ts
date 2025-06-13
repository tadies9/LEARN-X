import { logger } from '../../utils/logger';

export interface ValidationResult {
  passed: boolean;
  accuracy: number;
  safety: number;
  issues: string[];
}

export class QualityValidator {
  validate(generated: string, source: string[]): ValidationResult {
    const accuracyResult = this.checkFactualAccuracy(generated, source);
    const safetyResult = this.checkSafety(generated);

    const issues: string[] = [];

    if (accuracyResult < 0.98) {
      issues.push(`Accuracy below threshold: ${(accuracyResult * 100).toFixed(1)}%`);
    }

    if (safetyResult < 1.0) {
      issues.push('Content safety check failed');
    }

    return {
      passed: accuracyResult >= 0.98 && safetyResult === 1.0,
      accuracy: accuracyResult,
      safety: safetyResult,
      issues,
    };
  }

  checkFactualAccuracy(generated: string, source: string[]): number {
    try {
      // Check for key entities and facts
      const checks = {
        quotes: this.checkQuotesIntegrity(generated, source),
        numbers: this.checkNumbersPreserved(generated, source),
        dates: this.checkDatesUnchanged(generated, source),
        names: this.checkNamesAccuracy(generated, source),
        technicalTerms: this.checkTechnicalTerms(generated, source),
      };

      // Calculate weighted accuracy score
      const weights = {
        quotes: 0.3,
        numbers: 0.25,
        dates: 0.2,
        names: 0.15,
        technicalTerms: 0.1,
      };

      let totalScore = 0;
      let totalWeight = 0;

      for (const [key, score] of Object.entries(checks)) {
        if (score !== null) {
          totalScore += score * weights[key as keyof typeof weights];
          totalWeight += weights[key as keyof typeof weights];
        }
      }

      // Normalize score
      const accuracy = totalWeight > 0 ? totalScore / totalWeight : 1.0;

      logger.info(`Factual accuracy check: ${(accuracy * 100).toFixed(1)}%`);
      return accuracy;
    } catch (error) {
      logger.error('Accuracy check failed:', error);
      return 0;
    }
  }

  checkSafety(generated: string): number {
    try {
      const lowerContent = generated.toLowerCase();

      // Check for inappropriate content patterns
      const inappropriatePatterns = [
        /\b(offensive|inappropriate|harmful)\b/,
        /\b(hate|discriminat|racist|sexist)\b/,
        /\b(violence|violent|abuse|harm)\b/,
        /\b(illegal|criminal|unlawful)\b/,
      ];

      for (const pattern of inappropriatePatterns) {
        if (pattern.test(lowerContent)) {
          logger.warn('Safety check failed: inappropriate content detected');
          return 0;
        }
      }

      // Check for hallucination indicators
      const hallucinationPhrases = [
        'in my opinion',
        'i believe',
        'i think',
        'from my experience',
        'as an ai',
        'i cannot',
        'i am unable',
      ];

      for (const phrase of hallucinationPhrases) {
        if (lowerContent.includes(phrase)) {
          logger.warn('Safety check warning: potential hallucination detected');
          return 0.8; // Reduced score but not failed
        }
      }

      return 1.0;
    } catch (error) {
      logger.error('Safety check failed:', error);
      return 0;
    }
  }

  private checkQuotesIntegrity(generated: string, source: string[]): number {
    // Extract quotes from both generated and source
    const generatedQuotes = this.extractQuotes(generated);
    const sourceQuotes = source.flatMap((s) => this.extractQuotes(s));

    if (generatedQuotes.length === 0) return 1.0; // No quotes to check

    let matchedQuotes = 0;
    for (const genQuote of generatedQuotes) {
      if (sourceQuotes.some((srcQuote) => this.fuzzyMatch(genQuote, srcQuote, 0.95))) {
        matchedQuotes++;
      }
    }

    return matchedQuotes / generatedQuotes.length;
  }

  private checkNumbersPreserved(generated: string, source: string[]): number {
    const generatedNumbers = this.extractNumbers(generated);
    const sourceNumbers = source.flatMap((s) => this.extractNumbers(s));

    if (generatedNumbers.length === 0) return 1.0;

    let preservedNumbers = 0;
    for (const num of generatedNumbers) {
      if (sourceNumbers.includes(num)) {
        preservedNumbers++;
      }
    }

    return preservedNumbers / generatedNumbers.length;
  }

  private checkDatesUnchanged(generated: string, source: string[]): number {
    const generatedDates = this.extractDates(generated);
    const sourceDates = source.flatMap((s) => this.extractDates(s));

    if (generatedDates.length === 0) return 1.0;

    let unchangedDates = 0;
    for (const date of generatedDates) {
      if (sourceDates.includes(date)) {
        unchangedDates++;
      }
    }

    return unchangedDates / generatedDates.length;
  }

  private checkNamesAccuracy(generated: string, source: string[]): number {
    const generatedNames = this.extractNames(generated);
    const sourceNames = source.flatMap((s) => this.extractNames(s));

    if (generatedNames.length === 0) return 1.0;

    let accurateNames = 0;
    for (const name of generatedNames) {
      if (sourceNames.some((srcName) => this.fuzzyMatch(name, srcName, 0.9))) {
        accurateNames++;
      }
    }

    return accurateNames / generatedNames.length;
  }

  private checkTechnicalTerms(generated: string, source: string[]): number {
    // Simple check for technical terms preservation
    const technicalPattern = /\b[A-Z]{2,}\b|\b\w+(?:API|SDK|SQL|XML|JSON|HTML|CSS)\b/g;
    const generatedTerms = Array.from(generated.matchAll(technicalPattern)).map((m) => m[0]);
    const sourceTerms = source.flatMap((s) =>
      Array.from(s.matchAll(technicalPattern)).map((m) => m[0])
    );

    if (generatedTerms.length === 0) return 1.0;

    let preservedTerms = 0;
    for (const term of generatedTerms) {
      if (sourceTerms.includes(term)) {
        preservedTerms++;
      }
    }

    return preservedTerms / generatedTerms.length;
  }

  private extractQuotes(text: string): string[] {
    const quotes: string[] = [];
    const quoteRegex = /"([^"]+)"|'([^']+)'|"([^"]+)"|'([^']+)'/g;
    let match;

    while ((match = quoteRegex.exec(text)) !== null) {
      quotes.push(match[1] || match[2] || match[3] || match[4]);
    }

    return quotes;
  }

  private extractNumbers(text: string): string[] {
    const numberRegex = /\b\d+(?:\.\d+)?%?\b/g;
    return Array.from(text.matchAll(numberRegex)).map((m) => m[0]);
  }

  private extractDates(text: string): string[] {
    const dateRegex = /\b(?:\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}|\w+ \d{1,2}, \d{4})\b/g;
    return Array.from(text.matchAll(dateRegex)).map((m) => m[0]);
  }

  private extractNames(text: string): string[] {
    // Simple proper noun detection
    const nameRegex = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g;
    return Array.from(text.matchAll(nameRegex)).map((m) => m[0]);
  }

  private fuzzyMatch(str1: string, str2: string, threshold: number): boolean {
    const similarity = this.calculateSimilarity(str1.toLowerCase(), str2.toLowerCase());
    return similarity >= threshold;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}
