/**
 * Enhanced k6 Load Test: AI Generation Endpoints
 * Tests outline generation, streaming content, and caching validation
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import ws from 'k6/ws';

// Custom metrics
const aiSuccessRate = new Rate('ai_generation_success');
const outlineGenTime = new Trend('outline_generation_time');
const contentGenTime = new Trend('content_generation_time');
const streamingLatency = new Trend('streaming_latency');
const cacheHitRate = new Rate('cache_hits');
const cacheMissRate = new Rate('cache_misses');
const streamingChunks = new Counter('streaming_chunks_received');
const tokenUsage = new Counter('total_tokens_used');

export const options = {
  scenarios: {
    // Scenario 1: Outline generation (moderate volume)
    outline_generation: {
      executor: 'constant-arrival-rate',
      rate: 3,           // 3 requests per second (reduced for realistic load)
      timeUnit: '1s',
      duration: '6m',
      preAllocatedVUs: 15,
      maxVUs: 30,
      exec: 'generateOutline',
    },
    // Scenario 2: Streaming content generation
    streaming_content: {
      executor: 'constant-arrival-rate',
      rate: 2,           // 2 requests per second
      timeUnit: '1s',
      duration: '6m',
      preAllocatedVUs: 10,
      maxVUs: 20,
      exec: 'generateStreamingContent',
      startTime: '1m',
    },
    // Scenario 3: Cache validation (higher volume)
    cache_testing: {
      executor: 'constant-arrival-rate',
      rate: 8,           // 8 requests per second for cache testing
      timeUnit: '1s',
      duration: '4m',
      preAllocatedVUs: 20,
      maxVUs: 40,
      exec: 'testCaching',
      startTime: '2m',
    },
    // Scenario 4: Personalized content (realistic user patterns)
    personalized_generation: {
      executor: 'constant-arrival-rate',
      rate: 1.5,         // 1.5 requests per second
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 8,
      maxVUs: 15,
      exec: 'generatePersonalizedContent',
      startTime: '3m',
    },
  },
  thresholds: {
    'http_req_duration{scenario:outline_generation}': ['p(95)<10000'],
    'http_req_duration{scenario:streaming_content}': ['p(95)<15000'],
    'http_req_duration{scenario:cache_testing}': ['p(95)<2000'],
    'http_req_duration{scenario:personalized_generation}': ['p(95)<12000'],
    ai_generation_success: ['rate>0.9'],
    outline_generation_time: ['p(95)<12000'],
    content_generation_time: ['p(95)<18000'],
    streaming_latency: ['p(95)<500'],
    cache_hits: ['rate>0.3'],  // At least 30% cache hit rate expected
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080/api/v1';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';

// Test data for outline generation
const TOPICS = [
  'Introduction to Machine Learning',
  'Advanced React Patterns',
  'Microservices Architecture',
  'Database Optimization Techniques',
  'Cloud Native Applications',
  'DevOps Best Practices',
  'API Design Principles',
  'Security in Web Applications',
  'Performance Optimization',
  'System Design Fundamentals',
];

const PERSONAS = [
  { level: 'beginner', style: 'visual', goals: ['understand basics', 'practical examples'] },
  { level: 'intermediate', style: 'practical', goals: ['real-world projects', 'best practices'] },
  { level: 'advanced', style: 'theoretical', goals: ['deep understanding', 'optimization'] },
];

export function generateOutline() {
  const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
  const persona = PERSONAS[Math.floor(Math.random() * PERSONAS.length)];
  const startTime = Date.now();
  
  const payload = JSON.stringify({
    topic: topic,
    duration: '2 weeks',
    persona: persona,
    preferences: {
      depth: 'comprehensive',
      includeExercises: true,
      includeProjects: true,
    },
  });
  
  const params = {
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    tags: { 
      name: 'generate_outline',
      scenario: 'outline_generation',
    },
    timeout: '30s',
  };
  
  const res = http.post(`${BASE_URL}/learn/outline`, payload, params);
  
  const success = check(res, {
    'outline status is 200': (r) => r.status === 200,
    'outline has modules': (r) => r.json('outline.modules') !== undefined,
    'outline has metadata': (r) => r.json('outline.metadata') !== undefined,
  });
  
  aiSuccessRate.add(success);
  outlineGenTime.add(Date.now() - startTime);
  
  // Check if response was cached
  const cached = res.headers['X-Cache-Hit'] === 'true';
  cacheHitRate.add(cached);
  
  if (!success) {
    console.error(`Outline generation failed for "${topic}": ${res.status}`);
  }
  
  sleep(2);
}

export function generateStreamingContent() {
  const fileId = 'test-file-id';
  const startTime = Date.now();
  
  const prompts = [
    'Explain this concept step by step with examples',
    'Create a comprehensive tutorial on this topic',
    'Generate practice questions and detailed explanations',
    'Summarize the key points and provide real-world applications',
    'Create an interactive learning module for this content',
  ];
  
  const payload = JSON.stringify({
    prompt: prompts[Math.floor(Math.random() * prompts.length)],
    fileId: fileId,
    chunkIds: ['chunk1', 'chunk2', 'chunk3'],
    context: {
      persona: PERSONAS[Math.floor(Math.random() * PERSONAS.length)],
      previousInteractions: Math.floor(Math.random() * 10),
      sessionId: `session-${Math.random().toString(36).substr(2, 9)}`,
    },
    options: {
      temperature: 0.7,
      maxTokens: 1000,
      stream: true,
    },
  });
  
  const params = {
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    },
    tags: { 
      name: 'streaming_content',
      scenario: 'streaming_content',
    },
    timeout: '60s',
  };
  
  const res = http.post(`${BASE_URL}/ai/generate/stream`, payload, params);
  
  let chunksReceived = 0;
  let totalTokens = 0;
  let firstChunkTime = null;
  
  if (res.body) {
    const lines = res.body.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        chunksReceived++;
        if (firstChunkTime === null) {
          firstChunkTime = Date.now() - startTime;
          streamingLatency.add(firstChunkTime);
        }
        
        try {
          const data = JSON.parse(line.substring(6));
          if (data.tokens) {
            totalTokens += data.tokens;
          }
        } catch (e) {
          // Ignore parsing errors for partial chunks
        }
      }
    }
  }
  
  const success = check(res, {
    'streaming status is 200': (r) => r.status === 200,
    'received streaming chunks': () => chunksReceived > 0,
    'first chunk within 2s': () => firstChunkTime && firstChunkTime < 2000,
    'content-type is event-stream': (r) => r.headers['Content-Type']?.includes('text/event-stream'),
  });
  
  aiSuccessRate.add(success);
  contentGenTime.add(Date.now() - startTime);
  streamingChunks.add(chunksReceived);
  tokenUsage.add(totalTokens);
  
  // Check caching headers
  const cached = res.headers['X-Cache-Hit'] === 'true';
  cacheHitRate.add(cached);
  if (!cached) cacheMissRate.add(true);
  
  if (!success) {
    console.error(`Streaming content generation failed: ${res.status}`);
  }
  
  sleep(2);
}

export function testCaching() {
  // Test cache behavior with repeated requests
  const cacheablePrompts = [
    'What is machine learning?',
    'Explain React hooks',
    'Database indexing basics',
    'RESTful API principles',
    'Docker containers overview',
  ];
  
  const prompt = cacheablePrompts[Math.floor(Math.random() * cacheablePrompts.length)];
  const startTime = Date.now();
  
  const payload = JSON.stringify({
    prompt: prompt,
    context: {
      persona: { level: 'beginner' }, // Simple persona for caching
      useCache: true,
    },
    options: {
      temperature: 0.3, // Low temperature for consistent responses
      maxTokens: 200,
    },
  });
  
  const params = {
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
      'X-Cache-Key': `cache-test-${prompt.replace(/\s+/g, '-')}`,
    },
    tags: { 
      name: 'cache_test',
      scenario: 'cache_testing',
    },
    timeout: '10s',
  };
  
  const res = http.post(`${BASE_URL}/ai/generate`, payload, params);
  
  const cached = res.headers['X-Cache-Hit'] === 'true';
  const cacheStatus = res.headers['X-Cache-Status'] || 'unknown';
  
  const success = check(res, {
    'cache test status is 200': (r) => r.status === 200,
    'has cache headers': (r) => r.headers['X-Cache-Status'] !== undefined,
    'response time appropriate for cache status': (r) => {
      const responseTime = Date.now() - startTime;
      if (cached) {
        return responseTime < 1000; // Cached responses should be fast
      } else {
        return responseTime < 10000; // Non-cached can be slower
      }
    },
  });
  
  aiSuccessRate.add(success);
  cacheHitRate.add(cached);
  if (!cached) cacheMissRate.add(true);
  
  sleep(0.5); // Short sleep for cache testing
}

export function generatePersonalizedContent() {
  const startTime = Date.now();
  
  // More complex persona for personalization testing
  const complexPersonas = [
    {
      level: 'beginner',
      style: 'visual',
      goals: ['understand basics', 'see practical examples'],
      preferences: { format: 'step-by-step', examples: true, diagrams: true },
      background: 'student',
      pace: 'slow',
    },
    {
      level: 'intermediate',
      style: 'hands-on',
      goals: ['build projects', 'solve real problems'],
      preferences: { format: 'tutorial', code: true, challenges: true },
      background: 'developer',
      pace: 'medium',
    },
    {
      level: 'advanced',
      style: 'theoretical',
      goals: ['optimize performance', 'understand architecture'],
      preferences: { format: 'technical', depth: 'comprehensive', research: true },
      background: 'architect',
      pace: 'fast',
    },
  ];
  
  const persona = complexPersonas[Math.floor(Math.random() * complexPersonas.length)];
  
  const payload = JSON.stringify({
    prompt: 'Generate personalized learning content for this topic',
    fileId: 'test-file-id',
    context: {
      persona: persona,
      learningHistory: [
        { topic: 'previous-topic-1', completion: 0.8, time_spent: 3600 },
        { topic: 'previous-topic-2', completion: 0.6, time_spent: 2400 },
      ],
      currentSession: {
        duration: Math.floor(Math.random() * 3600),
        interactions: Math.floor(Math.random() * 20),
        difficulty_adjustments: Math.floor(Math.random() * 5),
      },
    },
    options: {
      temperature: 0.8,
      maxTokens: 800,
      personalize: true,
      includeMetadata: true,
    },
  });
  
  const params = {
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
      'X-Persona-Level': persona.level,
      'X-Learning-Style': persona.style,
    },
    tags: { 
      name: 'personalized_content',
      scenario: 'personalized_generation',
    },
    timeout: '30s',
  };
  
  const res = http.post(`${BASE_URL}/ai/generate/personalized`, payload, params);
  
  const success = check(res, {
    'personalized status is 200': (r) => r.status === 200,
    'has personalized content': (r) => r.json('content') !== undefined,
    'has adaptation metadata': (r) => r.json('metadata.adaptations') !== undefined,
    'includes persona matching': (r) => r.json('metadata.persona_match_score') !== undefined,
    'has difficulty rating': (r) => r.json('metadata.difficulty_level') !== undefined,
  });
  
  aiSuccessRate.add(success);
  contentGenTime.add(Date.now() - startTime);
  
  // Track token usage for cost analysis
  const tokensUsed = res.json('metadata.tokens_used') || 0;
  tokenUsage.add(tokensUsed);
  
  if (!success) {
    console.error(`Personalized content generation failed: ${res.status}`);
  }
  
  sleep(4); // Longer sleep for complex generation
}

export function teardown() {
  console.log('AI generation load test completed');
}