export interface DocumentStructure {
  title?: string;
  sections: Section[];
  metadata: DocumentMetadata;
  contentTypes: ContentTypeDistribution;
  hierarchy: HierarchyNode[];
}

export interface Section {
  id: string;
  title: string;
  level: number; // 1-6 for heading levels
  content: string;
  startIndex: number;
  endIndex: number;
  subsections: Section[];
  contentType?: ContentType;
  keywords?: string[];
}

export interface HierarchyNode {
  id: string;
  title: string;
  level: number;
  children: HierarchyNode[];
}

export type ContentType =
  | 'definition'
  | 'explanation'
  | 'example'
  | 'theory'
  | 'practice'
  | 'summary'
  | 'introduction'
  | 'conclusion'
  | 'question'
  | 'answer'
  | 'code'
  | 'equation'
  | 'list'
  | 'table'
  | 'other';

// Import types needed for this module
import type { DocumentMetadata } from './MetadataExtraction';
import type { ContentTypeDistribution } from './ContentAnalysis';

// Re-export from other modules for convenience
export type { DocumentMetadata } from './MetadataExtraction';
export type { ContentTypeDistribution } from './ContentAnalysis';
