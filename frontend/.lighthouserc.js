module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      staticDistDir: '.next',
      url: ['http://localhost:3000'],
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        // Performance budgets
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 3000 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
        'speed-index': ['error', { maxNumericValue: 4000 }],
        
        // Bundle size budgets
        'resource-summary:script:size': ['error', { maxNumericValue: 400000 }], // 400KB
        'resource-summary:stylesheet:size': ['error', { maxNumericValue: 100000 }], // 100KB
        'resource-summary:image:size': ['error', { maxNumericValue: 500000 }], // 500KB
        'resource-summary:total:size': ['error', { maxNumericValue: 1500000 }], // 1.5MB
        
        // Accessibility
        'categories:accessibility': ['error', { minScore: 0.95 }],
        
        // Best practices
        'categories:best-practices': ['error', { minScore: 0.9 }],
        
        // SEO
        'categories:seo': ['error', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};