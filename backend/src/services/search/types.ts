import { ContentType } from '../document/DocumentAnalyzer';

export interface SearchOptions {
  limit?: number;
  offset?: number;
  threshold?: number;
  searchType?: 'vector' | 'keyword' | 'hybrid';
  filters?: SearchFilters;
  weightVector?: number; // Weight for vector search (0-1)
  weightKeyword?: number; // Weight for keyword search (0-1)
  includeContent?: boolean;
  highlightMatches?: boolean;
}

export interface SearchFilters {
  courseId?: string;
  moduleId?: string;
  fileId?: string;
  fileTypes?: string[];
  contentTypes?: ContentType[];
  importance?: ('high' | 'medium' | 'low')[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
}

export interface SearchResult {
  id: string;
  fileId: string;
  fileName: string;
  content: string;
  highlights?: string[];
  score: number;
  vectorScore?: number;
  keywordScore?: number;
  metadata: {
    chunkIndex: number;
    contentType: string;
    importance: string;
    sectionTitle?: string;
    concepts?: string[];
    keywords?: string[];
  };
  context?: {
    before?: string;
    after?: string;
  };
  scoreComponents?: {
    vector: number;
    recency: number;
    popularity: number;
    personal: number;
  };
}

export interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  searchTime: number;
  cached: boolean;
  query: {
    original: string;
    processed: string;
    keywords: string[];
    filters: SearchFilters;
  };
}
