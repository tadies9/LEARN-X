import type { Section, HierarchyNode } from './StructureAnalysis';

export class DocumentParser {
  private readonly HEADING_PATTERNS = [
    /^#{1,6}\s+(.+)$/m, // Markdown headings
    /^Chapter\s+(\d+[\.\:]?\s*.+)$/im,
    /^Section\s+(\d+[\.\:]?\s*.+)$/im,
    /^Unit\s+(\d+[\.\:]?\s*.+)$/im,
    /^Module\s+(\d+[\.\:]?\s*.+)$/im,
    /^Lesson\s+(\d+[\.\:]?\s*.+)$/im,
    /^Part\s+([IVX\d]+[\.\:]?\s*.+)$/im,
    /^(\d+\.?\d*)\s+([A-Z].+)$/m, // Numbered sections
    /^([A-Z][A-Z\s]{2,})$/m, // All caps headings
  ];

  extractSections(content: string): Section[] {
    const sections: Section[] = [];
    const lines = content.split('\n');
    let currentSection: Section | null = null;
    let currentContent: string[] = [];
    let currentIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headingMatch = this.detectHeading(line);

      if (headingMatch) {
        // Save previous section
        if (currentSection) {
          currentSection.content = currentContent.join('\n').trim();
          currentSection.endIndex = currentIndex;
          sections.push(currentSection);
        }

        // Start new section
        currentSection = {
          id: `section-${sections.length}`,
          title: headingMatch.title,
          level: headingMatch.level,
          content: '',
          startIndex: currentIndex + line.length + 1,
          endIndex: 0,
          subsections: [],
        };
        currentContent = [];
      } else if (currentSection) {
        currentContent.push(line);
      }

      currentIndex += line.length + 1; // +1 for newline
    }

    // Save last section
    if (currentSection) {
      currentSection.content = currentContent.join('\n').trim();
      currentSection.endIndex = content.length;
      sections.push(currentSection);
    }

    // If no sections found, treat entire content as one section
    if (sections.length === 0 && content.trim()) {
      sections.push({
        id: 'section-0',
        title: 'Main Content',
        level: 1,
        content: content.trim(),
        startIndex: 0,
        endIndex: content.length,
        subsections: [],
      });
    }

    // Build subsection relationships
    this.buildSubsections(sections);

    return sections;
  }

  private detectHeading(line: string): { title: string; level: number } | null {
    const trimmed = line.trim();
    if (!trimmed) return null;

    // Check markdown headings
    const mdMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (mdMatch) {
      return {
        title: mdMatch[2],
        level: mdMatch[1].length,
      };
    }

    // Check chapter/section patterns
    for (const pattern of this.HEADING_PATTERNS.slice(1)) {
      const match = trimmed.match(pattern);
      if (match) {
        // Estimate level based on keyword
        let level = 1;
        if (/^chapter/i.test(trimmed)) level = 1;
        else if (/^section/i.test(trimmed)) level = 2;
        else if (/^subsection/i.test(trimmed)) level = 3;
        else if (/^\d+\.\d+/.test(trimmed)) level = 3;
        else if (/^\d+\./.test(trimmed)) level = 2;

        return {
          title: match[1] || trimmed,
          level,
        };
      }
    }

    // Check if it's a short line in all caps (likely a heading)
    if (trimmed.length < 50 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
      return {
        title: trimmed,
        level: 2,
      };
    }

    return null;
  }

  private buildSubsections(sections: Section[]): void {
    const stack: Section[] = [];

    for (const section of sections) {
      // Pop sections from stack that are at same or higher level
      while (stack.length > 0 && stack[stack.length - 1].level >= section.level) {
        stack.pop();
      }

      // Add as subsection to parent if exists
      if (stack.length > 0) {
        stack[stack.length - 1].subsections.push(section);
      }

      stack.push(section);
    }
  }

  buildHierarchy(sections: Section[]): HierarchyNode[] {
    const hierarchy: HierarchyNode[] = [];
    const stack: { node: HierarchyNode; section: Section }[] = [];

    for (const section of sections) {
      const node: HierarchyNode = {
        id: section.id,
        title: section.title,
        level: section.level,
        children: [],
      };

      // Pop nodes from stack that are at same or higher level
      while (stack.length > 0 && stack[stack.length - 1].section.level >= section.level) {
        stack.pop();
      }

      // Add to parent or root
      if (stack.length > 0) {
        stack[stack.length - 1].node.children.push(node);
      } else {
        hierarchy.push(node);
      }

      stack.push({ node, section });
    }

    return hierarchy;
  }

  extractTitle(content: string, fileName?: string): string {
    // Try to extract from content
    const lines = content.split('\n').slice(0, 10); // Check first 10 lines
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && trimmed.length < 100) {
        // Check if it looks like a title
        if (/^#\s+/.test(trimmed)) {
          return trimmed.replace(/^#\s+/, '');
        }
        if (/^title:\s*/i.test(trimmed)) {
          return trimmed.replace(/^title:\s*/i, '');
        }
        if (trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
          return trimmed;
        }
      }
    }

    // Fallback to filename
    if (fileName) {
      return fileName.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
    }

    return 'Untitled Document';
  }
}