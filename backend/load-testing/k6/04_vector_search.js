/**
 * k6 Load Test: Vector Search Performance
 * Tests semantic search across file chunks
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const searchSuccessRate = new Rate('search_success');
const searchLatency = new Trend('search_latency');
const resultsFound = new Counter('results_found');
const emptyResults = new Rate('empty_results');

export const options = {
  scenarios: {
    // Scenario 1: Basic search load
    basic_search: {
      executor: 'constant-arrival-rate',
      rate: 20,          // 20 searches per second
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 50,
      maxVUs: 100,
      exec: 'basicSearch',
    },
    // Scenario 2: Complex filtered search
    filtered_search: {
      executor: 'constant-arrival-rate',
      rate: 10,          // 10 searches per second
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 30,
      maxVUs: 60,
      exec: 'filteredSearch',
      startTime: '30s',
    },
    // Scenario 3: Burst search (simulating user behavior)
    burst_search: {
      executor: 'ramping-arrival-rate',
      startRate: 5,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 200,
      stages: [
        { duration: '30s', target: 50 },   // Ramp up to 50/s
        { duration: '1m', target: 100 },   // Spike to 100/s
        { duration: '30s', target: 20 },   // Drop to 20/s
        { duration: '2m', target: 30 },    // Stabilize at 30/s
        { duration: '30s', target: 0 },    // Ramp down
      ],
      exec: 'burstSearch',
    },
  },
  thresholds: {
    'http_req_duration{scenario:basic_search}': ['p(95)<1000'],    // 95% under 1s
    'http_req_duration{scenario:filtered_search}': ['p(95)<1500'], // 95% under 1.5s
    'http_req_duration{scenario:burst_search}': ['p(95)<2000'],    // 95% under 2s
    search_success: ['rate>0.95'],                                 // 95% success rate
    search_latency: ['p(95)<1200'],                               // 95% under 1.2s
    empty_results: ['rate<0.1'],                                   // Less than 10% empty
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080/api/v1';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';

// Search queries pool
const SEARCH_QUERIES = [
  'machine learning algorithms',
  'react hooks useState',
  'database indexing strategies',
  'microservices communication',
  'authentication best practices',
  'performance optimization techniques',
  'cloud deployment strategies',
  'API design patterns',
  'data structures and algorithms',
  'system design principles',
  'security vulnerabilities',
  'testing methodologies',
  'continuous integration',
  'docker containerization',
  'kubernetes orchestration',
];

const FILE_TYPES = ['application/pdf', 'text/plain', 'text/markdown'];
const CHUNK_TYPES = ['content', 'summary', 'title', 'section'];
const IMPORTANCE_LEVELS = ['high', 'medium', 'low'];

export function basicSearch() {
  const query = SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)];
  const startTime = Date.now();
  
  const payload = JSON.stringify({
    query: query,
    limit: 10,
    threshold: 0.7,
  });
  
  const params = {
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    tags: { 
      name: 'basic_search',
      scenario: 'basic_search',
    },
  };
  
  const res = http.post(`${BASE_URL}/search`, payload, params);
  
  const success = check(res, {
    'search status is 200': (r) => r.status === 200,
    'search has results array': (r) => Array.isArray(r.json('results')),
    'search has metadata': (r) => r.json('metadata') !== undefined,
  });
  
  searchSuccessRate.add(success);
  searchLatency.add(Date.now() - startTime);
  
  if (success) {
    const results = res.json('results');
    resultsFound.add(results.length);
    emptyResults.add(results.length === 0);
  }
  
  sleep(0.5);
}

export function filteredSearch() {
  const query = SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)];
  const startTime = Date.now();
  
  const payload = JSON.stringify({
    query: query,
    limit: 20,
    threshold: 0.75,
    filters: {
      fileTypes: [FILE_TYPES[Math.floor(Math.random() * FILE_TYPES.length)]],
      chunkTypes: [
        CHUNK_TYPES[Math.floor(Math.random() * CHUNK_TYPES.length)],
        CHUNK_TYPES[Math.floor(Math.random() * CHUNK_TYPES.length)],
      ],
      importance: [IMPORTANCE_LEVELS[Math.floor(Math.random() * IMPORTANCE_LEVELS.length)]],
      courseId: Math.random() > 0.5 ? 'test-course-id' : null,
    },
  });
  
  const params = {
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    tags: { 
      name: 'filtered_search',
      scenario: 'filtered_search',
    },
  };
  
  const res = http.post(`${BASE_URL}/search/advanced`, payload, params);
  
  const success = check(res, {
    'filtered search status is 200': (r) => r.status === 200,
    'filtered search has results': (r) => r.json('results') !== undefined,
    'filtered search has facets': (r) => r.json('facets') !== undefined,
  });
  
  searchSuccessRate.add(success);
  searchLatency.add(Date.now() - startTime);
  
  if (success) {
    const results = res.json('results') || [];
    resultsFound.add(results.length);
    emptyResults.add(results.length === 0);
  }
  
  sleep(1);
}

export function burstSearch() {
  // Simulate rapid successive searches (autocomplete-like behavior)
  const baseQuery = SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)];
  const words = baseQuery.split(' ');
  
  // Simulate typing - search after each word
  let currentQuery = '';
  for (let i = 0; i < words.length; i++) {
    currentQuery += (i > 0 ? ' ' : '') + words[i];
    const startTime = Date.now();
    
    const payload = JSON.stringify({
      query: currentQuery,
      limit: 5,
      threshold: 0.6,
      fast: true, // Use fast mode for autocomplete
    });
    
    const params = {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      tags: { 
        name: 'burst_search',
        scenario: 'burst_search',
        query_length: currentQuery.length,
      },
    };
    
    const res = http.post(`${BASE_URL}/search/instant`, payload, params);
    
    const success = check(res, {
      'burst search status is 200': (r) => r.status === 200,
    });
    
    searchSuccessRate.add(success);
    searchLatency.add(Date.now() - startTime);
    
    sleep(0.1); // 100ms between keystrokes
  }
}

export function teardown() {
  console.log('Vector search load test completed');
}