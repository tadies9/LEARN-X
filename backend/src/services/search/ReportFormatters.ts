import { AccuracyReport } from './ReportGenerator';

/**
 * Formatting utilities for different report output types
 */
export class ReportFormatters {
  /**
   * Format report as plain text
   */
  formatAsText(report: AccuracyReport): string {
    const lines: string[] = [];
    
    lines.push(`=== ${report.reportType.toUpperCase()} ACCURACY REPORT ===`);
    lines.push(`Generated: ${report.timestamp}`);
    lines.push('');
    
    lines.push('SUMMARY:');
    lines.push(`Overall Score: ${report.summary.overallScore.toFixed(1)}/100 (${report.summary.status.toUpperCase()})`);
    lines.push(`Critical Issues: ${report.summary.criticalIssues}`);
    lines.push('');
    
    lines.push('KEY METRICS:');
    Object.entries(report.summary.keyMetrics).forEach(([key, value]) => {
      lines.push(`  ${key}: ${typeof value === 'number' ? value.toFixed(2) : value}`);
    });
    lines.push('');
    
    if (report.recommendations.length > 0) {
      lines.push('RECOMMENDATIONS:');
      report.recommendations.forEach((rec, index) => {
        lines.push(`  ${index + 1}. ${rec}`);
      });
      lines.push('');
    }
    
    return lines.join('\n');
  }

  /**
   * Format report as JSON
   */
  formatAsJSON(report: AccuracyReport): string {
    return JSON.stringify(report, null, 2);
  }

  /**
   * Format report as HTML
   */
  formatAsHTML(report: AccuracyReport): string {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>${report.reportType.toUpperCase()} Accuracy Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background-color: #f0f0f0; padding: 15px; border-radius: 5px; }
        .summary { margin: 20px 0; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
        .metric { background-color: #f9f9f9; padding: 10px; border-radius: 3px; }
        .recommendations { margin: 20px 0; }
        .recommendations li { margin: 5px 0; }
        .status-excellent { color: #28a745; }
        .status-good { color: #17a2b8; }
        .status-needs_improvement { color: #ffc107; }
        .status-poor { color: #dc3545; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${report.reportType.toUpperCase()} Accuracy Report</h1>
        <p>Generated: ${new Date(report.timestamp).toLocaleString()}</p>
    </div>
    
    <div class="summary">
        <h2>Summary</h2>
        <p><strong>Overall Score:</strong> 
            <span class="status-${report.summary.status}">
                ${report.summary.overallScore.toFixed(1)}/100 (${report.summary.status.toUpperCase()})
            </span>
        </p>
        <p><strong>Critical Issues:</strong> ${report.summary.criticalIssues}</p>
    </div>
    
    <div class="metrics">
        <h2>Key Metrics</h2>
        ${Object.entries(report.summary.keyMetrics).map(([key, value]) => `
            <div class="metric">
                <strong>${key}:</strong> ${typeof value === 'number' ? value.toFixed(2) : value}
            </div>
        `).join('')}
    </div>
    
    ${report.recommendations.length > 0 ? `
    <div class="recommendations">
        <h2>Recommendations</h2>
        <ol>
            ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ol>
    </div>
    ` : ''}
</body>
</html>`;
    
    return html;
  }

  /**
   * Format report as CSV (simplified)
   */
  formatAsCSV(report: AccuracyReport): string {
    const lines: string[] = [];
    
    // Header
    lines.push('Report Type,Timestamp,Overall Score,Status,Critical Issues');
    
    // Summary row
    lines.push([
      report.reportType,
      report.timestamp,
      report.summary.overallScore.toFixed(2),
      report.summary.status,
      report.summary.criticalIssues.toString()
    ].join(','));
    
    // Metrics section
    lines.push('');
    lines.push('Metric,Value');
    Object.entries(report.summary.keyMetrics).forEach(([key, value]) => {
      lines.push(`${key},${typeof value === 'number' ? value.toFixed(2) : value}`);
    });
    
    // Recommendations section
    if (report.recommendations.length > 0) {
      lines.push('');
      lines.push('Recommendations');
      report.recommendations.forEach(rec => {
        lines.push(`"${rec}"`);
      });
    }
    
    return lines.join('\n');
  }

  /**
   * Format report as Markdown
   */
  formatAsMarkdown(report: AccuracyReport): string {
    const lines: string[] = [];
    
    lines.push(`# ${report.reportType.toUpperCase()} Accuracy Report`);
    lines.push(`*Generated: ${new Date(report.timestamp).toLocaleString()}*`);
    lines.push('');
    
    lines.push('## Summary');
    lines.push(`**Overall Score:** ${report.summary.overallScore.toFixed(1)}/100 (${report.summary.status.toUpperCase()})`);
    lines.push(`**Critical Issues:** ${report.summary.criticalIssues}`);
    lines.push('');
    
    lines.push('## Key Metrics');
    Object.entries(report.summary.keyMetrics).forEach(([key, value]) => {
      lines.push(`- **${key}:** ${typeof value === 'number' ? value.toFixed(2) : value}`);
    });
    lines.push('');
    
    if (report.recommendations.length > 0) {
      lines.push('## Recommendations');
      report.recommendations.forEach((rec, index) => {
        lines.push(`${index + 1}. ${rec}`);
      });
      lines.push('');
    }
    
    return lines.join('\n');
  }

  /**
   * Format report summary as compact string
   */
  formatSummaryCompact(report: AccuracyReport): string {
    return `${report.reportType.toUpperCase()}: ${report.summary.overallScore.toFixed(1)}/100 (${report.summary.status.toUpperCase()}) - ${report.summary.criticalIssues} critical issues`;
  }

  /**
   * Format metrics for display in tables
   */
  formatMetricsTable(report: AccuracyReport): Array<{key: string, value: string}> {
    return Object.entries(report.summary.keyMetrics).map(([key, value]) => ({
      key: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
      value: typeof value === 'number' ? value.toFixed(2) : String(value)
    }));
  }

  /**
   * Format recommendations as numbered list
   */
  formatRecommendationsList(report: AccuracyReport): string[] {
    return report.recommendations.map((rec, index) => `${index + 1}. ${rec}`);
  }
}