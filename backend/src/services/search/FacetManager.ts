import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { SearchOptions, SearchResult, SearchFilters } from './types';
import { ContentType } from '../document/DocumentAnalyzer';

export interface SearchFacet {
  field: string;
  values: Array<{
    value: string;
    count: number;
    label?: string;
  }>;
}

export interface FacetedSearchResponse {
  results: SearchResult[];
  facets: SearchFacet[];
  totalCount: number;
  appliedFilters: SearchFilters;
}

export class FacetManager {
  async searchWithFacets(
    _query: string,
    userId: string,
    options: SearchOptions,
    baseResults: SearchResult[]
  ): Promise<FacetedSearchResponse> {
    logger.info('[FacetManager] Generating facets for search results');

    // Get facet data based on current results
    const facets = await this.generateFacets(baseResults, userId, options.filters || {});

    // Enrich facets with user-friendly labels
    const enrichedFacets = this.enrichFacets(facets);

    return {
      results: baseResults,
      facets: enrichedFacets,
      totalCount: baseResults.length,
      appliedFilters: options.filters || {},
    };
  }

  private async generateFacets(
    results: SearchResult[],
    userId: string,
    currentFilters: SearchFilters
  ): Promise<SearchFacet[]> {
    const facets: SearchFacet[] = [];

    // Get file IDs from results
    const fileIds = [...new Set(results.map((r) => r.fileId))];

    // Generate content type facet
    const contentTypeFacet = await this.generateContentTypeFacet(fileIds, currentFilters);
    if (contentTypeFacet) facets.push(contentTypeFacet);

    // Generate importance facet
    const importanceFacet = await this.generateImportanceFacet(fileIds, currentFilters);
    if (importanceFacet) facets.push(importanceFacet);

    // Generate course facet
    const courseFacet = await this.generateCourseFacet(fileIds, userId, currentFilters);
    if (courseFacet) facets.push(courseFacet);

    // Generate file type facet
    const fileTypeFacet = await this.generateFileTypeFacet(fileIds, currentFilters);
    if (fileTypeFacet) facets.push(fileTypeFacet);

    // Generate date range facet
    const dateRangeFacet = await this.generateDateRangeFacet(fileIds, currentFilters);
    if (dateRangeFacet) facets.push(dateRangeFacet);

    return facets;
  }

  private async generateContentTypeFacet(
    fileIds: string[],
    _currentFilters: SearchFilters
  ): Promise<SearchFacet | null> {
    const { data, error } = await supabase
      .from('semantic_chunks')
      .select('chunk_type')
      .in('file_id', fileIds)
      .not('chunk_type', 'is', null);

    if (error || !data) {
      logger.error('[FacetManager] Error generating content type facet:', error);
      return null;
    }

    // Count occurrences
    const counts = data.reduce(
      (acc, item) => {
        const type = item.chunk_type as ContentType;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const values = Object.entries(counts)
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);

    return {
      field: 'contentType',
      values,
    };
  }

  private async generateImportanceFacet(
    fileIds: string[],
    _currentFilters: SearchFilters
  ): Promise<SearchFacet | null> {
    const { data, error } = await supabase
      .from('semantic_chunks')
      .select('importance')
      .in('file_id', fileIds)
      .not('importance', 'is', null);

    if (error || !data) {
      logger.error('[FacetManager] Error generating importance facet:', error);
      return null;
    }

    // Count occurrences
    const counts = data.reduce(
      (acc, item) => {
        acc[item.importance] = (acc[item.importance] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const importanceOrder = ['high', 'medium', 'low'];
    const values = importanceOrder
      .filter((imp) => counts[imp] > 0)
      .map((value) => ({ value, count: counts[value] }));

    return {
      field: 'importance',
      values,
    };
  }

  private async generateCourseFacet(
    fileIds: string[],
    _userId: string,
    _currentFilters: SearchFilters
  ): Promise<SearchFacet | null> {
    const { data, error } = await supabase
      .from('semantic_chunks')
      .select(
        `
        course_id,
        courses!inner(id, title)
      `
      )
      .in('file_id', fileIds)
      .not('course_id', 'is', null);

    if (error || !data) {
      logger.error('[FacetManager] Error generating course facet:', error);
      return null;
    }

    // Count occurrences and get course titles
    const courseMap = new Map<string, { count: number; title: string }>();
    data.forEach((item) => {
      const courseId = item.course_id;
      const courseTitle = (item.courses as any)?.title || 'Unknown Course';

      if (!courseMap.has(courseId)) {
        courseMap.set(courseId, { count: 0, title: courseTitle });
      }

      const course = courseMap.get(courseId)!;
      course.count++;
    });

    const values = Array.from(courseMap.entries())
      .map(([courseId, { count, title }]) => ({
        value: courseId,
        count,
        label: title,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 courses

    return {
      field: 'course',
      values,
    };
  }

  private async generateFileTypeFacet(
    fileIds: string[],
    _currentFilters: SearchFilters
  ): Promise<SearchFacet | null> {
    const { data, error } = await supabase
      .from('files')
      .select('mime_type')
      .in('id', fileIds)
      .not('mime_type', 'is', null);

    if (error || !data) {
      logger.error('[FacetManager] Error generating file type facet:', error);
      return null;
    }

    // Count occurrences and simplify mime types
    const counts = data.reduce(
      (acc, item) => {
        const simpleType = this.simplifyMimeType(item.mime_type);
        acc[simpleType] = (acc[simpleType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const values = Object.entries(counts)
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);

    return {
      field: 'fileType',
      values,
    };
  }

  private async generateDateRangeFacet(
    fileIds: string[],
    _currentFilters: SearchFilters
  ): Promise<SearchFacet | null> {
    const { data, error } = await supabase
      .from('files')
      .select('created_at')
      .in('id', fileIds)
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      logger.error('[FacetManager] Error generating date range facet:', error);
      return null;
    }

    // Calculate date ranges
    const now = new Date();
    const ranges = [
      { value: 'today', label: 'Today', count: 0 },
      { value: 'week', label: 'This Week', count: 0 },
      { value: 'month', label: 'This Month', count: 0 },
      { value: 'quarter', label: 'Last 3 Months', count: 0 },
      { value: 'year', label: 'This Year', count: 0 },
      { value: 'older', label: 'Older', count: 0 },
    ];

    data.forEach((item) => {
      const date = new Date(item.created_at);
      const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === 0) {
        ranges[0].count++;
      } else if (daysDiff <= 7) {
        ranges[1].count++;
      } else if (daysDiff <= 30) {
        ranges[2].count++;
      } else if (daysDiff <= 90) {
        ranges[3].count++;
      } else if (daysDiff <= 365) {
        ranges[4].count++;
      } else {
        ranges[5].count++;
      }
    });

    return {
      field: 'dateRange',
      values: ranges.filter((r) => r.count > 0),
    };
  }

  private enrichFacets(facets: SearchFacet[]): SearchFacet[] {
    return facets.map((facet) => {
      switch (facet.field) {
        case 'contentType':
          return {
            ...facet,
            values: facet.values.map((v) => ({
              ...v,
              label: this.getContentTypeLabel(v.value),
            })),
          };

        case 'importance':
          return {
            ...facet,
            values: facet.values.map((v) => ({
              ...v,
              label: this.getImportanceLabel(v.value),
            })),
          };

        case 'fileType':
          return {
            ...facet,
            values: facet.values.map((v) => ({
              ...v,
              label: this.getFileTypeLabel(v.value),
            })),
          };

        default:
          return facet;
      }
    });
  }

  private simplifyMimeType(mimeType: string): string {
    if (mimeType.includes('pdf')) return 'PDF';
    if (mimeType.includes('image')) return 'Image';
    if (mimeType.includes('video')) return 'Video';
    if (mimeType.includes('audio')) return 'Audio';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'Document';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'Spreadsheet';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'Presentation';
    if (mimeType.includes('text')) return 'Text';
    return 'Other';
  }

  private getContentTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      heading: 'Headings',
      paragraph: 'Paragraphs',
      list: 'Lists',
      code: 'Code Blocks',
      table: 'Tables',
      quote: 'Quotes',
      definition: 'Definitions',
      example: 'Examples',
      figure: 'Figures',
      caption: 'Captions',
      summary: 'Summaries',
      introduction: 'Introductions',
      conclusion: 'Conclusions',
      math: 'Mathematical Content',
      metadata: 'Metadata',
    };
    return labels[type] || type;
  }

  private getImportanceLabel(importance: string): string {
    const labels: Record<string, string> = {
      high: 'High Priority',
      medium: 'Medium Priority',
      low: 'Low Priority',
    };
    return labels[importance] || importance;
  }

  private getFileTypeLabel(type: string): string {
    return type; // Already simplified in simplifyMimeType
  }
}
