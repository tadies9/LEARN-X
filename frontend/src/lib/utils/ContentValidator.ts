/**
 * Content validation and safety checks for HTML sanitization
 * Handles Mermaid diagram processing and content validation
 */

import { looksLikeMermaidDiagram } from './SanitizationRules';
import type { MermaidConfig } from './SanitizationConfig';

/** Content validator for HTML and Mermaid content */
export class ContentValidator {
  constructor(private mermaidConfig: MermaidConfig) {}

  /** Extract and fix malformed mermaid diagrams mixed with text */
  extractAndFixMermaidDiagrams(html: string): string {
    if (!this.mermaidConfig.enabled) return html;
    if (
      html.includes(`class="${this.mermaidConfig.containerClass}"`) &&
      html.includes(`class="${this.mermaidConfig.sourceClass}"`)
    ) {
      return html;
    }

    const simpleMermaidInParagraph =
      /<p[^>]*>\s*((?:graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|gantt)[\s\S]*?)<\/p>/gi;
    let result = html.replace(simpleMermaidInParagraph, (match, diagramContent) => {
      if (looksLikeMermaidDiagram(diagramContent)) {
        const cleanDiagram = this.cleanMermaidContent(diagramContent);
        if (cleanDiagram.length <= this.mermaidConfig.maxSize) {
          return this.createMermaidFigure(cleanDiagram);
        }
      }
      return match;
    });

    const plainMermaidPattern =
      /^((?:graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|gantt)[\s\S]*?)(?=<|$)/i;
    const plainMatch = result.match(plainMermaidPattern);
    if (plainMatch && looksLikeMermaidDiagram(plainMatch[1])) {
      const cleanDiagram = this.cleanMermaidContent(plainMatch[1]);
      if (cleanDiagram.length <= this.mermaidConfig.maxSize) {
        result = result.replace(plainMermaidPattern, this.createMermaidFigure(cleanDiagram));
      }
    }

    const malformedPattern =
      /(?:^|\n|>)([^<]*?)((?:graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|gantt)\s+(?:TD|LR|TB|BT|RL)?[^<]+?)(?=<|$)/gi;
    const foundDiagrams: string[] = [];
    result = result.replace(malformedPattern, (match, prefix, diagram) => {
      if (looksLikeMermaidDiagram(diagram)) {
        const cleanDiagram = this.extractDiagramFromMixedContent(diagram);
        if (cleanDiagram && cleanDiagram.length <= this.mermaidConfig.maxSize) {
          foundDiagrams.push(cleanDiagram);
          return prefix + '[DIAGRAM_PLACEHOLDER]';
        }
      }
      return match;
    });
    const cutOffPattern =
      /((?:graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|gantt)\s+(?:TD|LR|TB|BT|RL)?[^<]+)$/i;
    const cutOffMatch = result.match(cutOffPattern);
    if (cutOffMatch && looksLikeMermaidDiagram(cutOffMatch[1])) {
      const diagram = cutOffMatch[1];
      const cleanDiagram = this.extractDiagramFromMixedContent(diagram);
      if (cleanDiagram && cleanDiagram.length <= this.mermaidConfig.maxSize) {
        foundDiagrams.push(cleanDiagram);
        result = result.replace(cutOffPattern, '[DIAGRAM_PLACEHOLDER]');
      }
    }
    foundDiagrams.forEach((diagram) => {
      result = result.replace('[DIAGRAM_PLACEHOLDER]', this.createMermaidFigure(diagram));
    });

    return result;
  }

  /** Create Mermaid figure HTML */
  private createMermaidFigure(diagram: string): string {
    const sourceStyle = this.mermaidConfig.hideSource ? 'style="display:none"' : '';
    return `<figure><div class="${this.mermaidConfig.containerClass}"><pre class="${this.mermaidConfig.sourceClass}" ${sourceStyle}>${diagram}</pre></div><figcaption>Diagram</figcaption></figure>`;
  }

  /** Extract clean diagram from mixed content */
  private extractDiagramFromMixedContent(content: string): string | null {
    const diagramMatch = content.match(
      /((?:graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|gantt)\s+(?:TD|LR|TB|BT|RL)?)/
    );
    if (!diagramMatch) return null;
    const diagramType = diagramMatch[1];
    const nodeMap = new Map<string, string>();
    const connections: string[] = [];
    const nodePattern = /([A-Z]\w*)\[([^\]]+)\]/g;
    let nodeMatch;
    while ((nodeMatch = nodePattern.exec(content)) !== null) {
      const [, nodeId, label] = nodeMatch;
      const cleanLabel = label
        .trim()
        .replace(/^["']|["']$/g, '')
        .replace(/["']/g, '')
        .substring(0, 30);
      nodeMap.set(nodeId, cleanLabel);
    }
    const incompleteNodePattern = /([A-Z]\w*)\[([^<\]\n]+?)(?:["']?\s*$|["']?\s*<|["']?\s*\n)/g;
    let incompleteMatch;
    while ((incompleteMatch = incompleteNodePattern.exec(content)) !== null) {
      const [, nodeId, partialLabel] = incompleteMatch;
      if (!nodeMap.has(nodeId)) {
        const cleanLabel = partialLabel
          .trim()
          .replace(/^["']|["']$/g, '')
          .replace(/["']/g, '')
          .substring(0, 30);
        nodeMap.set(nodeId, cleanLabel || nodeId);
      }
    }
    const connectionPattern = /([A-Z]\w*)\s*(-->|==>|-.->|--x|---)\s*([A-Z]\w*)/g;
    let connMatch;
    const connectedNodes = new Set<string>();
    while ((connMatch = connectionPattern.exec(content)) !== null) {
      const [, from, arrow, to] = connMatch;
      connections.push(`${from} ${arrow} ${to}`);
      connectedNodes.add(from);
      connectedNodes.add(to);
    }
    connectedNodes.forEach((nodeId) => {
      if (!nodeMap.has(nodeId)) nodeMap.set(nodeId, nodeId);
    });
    if (nodeMap.size === 0 || connections.length === 0) return null;
    const nodeDefinitions = Array.from(nodeMap.entries()).map(
      ([id, label]) => `    ${id}[${label}]`
    );
    return [diagramType, ...nodeDefinitions, ...connections.map((c) => `    ${c}`)].join('\n');
  }

  /** Clean mermaid content */
  cleanMermaidContent(content: string): string {
    const cleaned = content
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/<[^>]+>/g, '')
      .replace(/\s*table>\s*/g, ' ')
      .replace(/\s*thead>\s*/g, ' ')
      .replace(/\s*tbody>\s*/g, ' ')
      .replace(/\s*<\s*/g, ' ')
      .replace(/\s*>\s*/g, ' ')
      .replace(/\[([^\]]*?)(?:<[^>]*>)+([^\]]*?)\]/g, '[$1$2]')
      .replace(/\s+/g, ' ')
      .replace(/(\w+)\s+(-->|==>|-.->|--x|---)\s+(\w+)/g, '\n    $1 $2 $3')
      .replace(
        /(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|gantt)\s+(TD|LR|TB|BT|RL)?/i,
        '$1 $2\n'
      )
      .replace(/(\w+)\s*\[([^\]]+)\]/g, '\n    $1[$2]');
    return cleaned.trim();
  }

  /** Validate if content contains potentially dangerous patterns */
  validateContentSafety(content: string): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    if (/<script\b/i.test(content)) issues.push('Contains script tags');
    if (/\son\w+\s*=/i.test(content)) issues.push('Contains event handlers');
    if (/javascript:/i.test(content)) issues.push('Contains javascript: URLs');
    if (/data:text\/html/i.test(content)) issues.push('Contains dangerous data URLs');
    if (this.calculateNestingDepth(content) > 50) issues.push('Excessive HTML nesting detected');
    return { isValid: issues.length === 0, issues };
  }

  /** Calculate maximum nesting depth of HTML elements */
  private calculateNestingDepth(html: string): number {
    let depth = 0,
      maxDepth = 0;
    const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
    let match;
    while ((match = tagRegex.exec(html)) !== null) {
      const [fullMatch, tagName] = match;
      if (fullMatch.startsWith('</')) {
        depth = Math.max(0, depth - 1);
      } else if (!fullMatch.endsWith('/>')) {
        const selfClosingTags = ['img', 'br', 'hr', 'input', 'meta', 'link'];
        if (!selfClosingTags.includes(tagName.toLowerCase())) {
          depth++;
          maxDepth = Math.max(maxDepth, depth);
        }
      }
    }
    return maxDepth;
  }

  /** Process pre-formatted Mermaid diagrams */
  processMermaidDiagrams(html: string): string {
    if (!this.mermaidConfig.enabled) return html;
    return html.replace(/<pre\s+class="mermaid">([\s\S]*?)<\/pre>/gi, (match, content) => {
      const cleanedContent = this.cleanMermaidContent(content);
      if (cleanedContent.length > this.mermaidConfig.maxSize) {
        return `<div class="mermaid-error">Diagram too large to display</div>`;
      }
      const escapedContent = cleanedContent.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      return `<div class="${this.mermaidConfig.containerClass}" data-mermaid="${escapedContent}"></div>`;
    });
  }
}
