import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const userJourneyErrors = new Counter('user_journey_errors');
const fileProcessingRate = new Rate('file_processing_success_rate');
const aiGenerationTime = new Trend('ai_generation_response_time');
const vectorSearchTime = new Trend('vector_search_response_time');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up to 10 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete below 2s
    http_req_failed: ['rate<0.05'],    // Error rate must be below 5%
    user_journey_errors: ['count<10'], // Less than 10 user journey errors
    file_processing_success_rate: ['rate>0.95'], // 95% file processing success
    ai_generation_response_time: ['p(95)<10000'], // 95% of AI requests under 10s
    vector_search_response_time: ['p(95)<1000'],  // 95% of searches under 1s
  },
};

// Configuration
const BASE_URL = 'http://localhost:8080';
const API_BASE = `${BASE_URL}/api/v1`;

// Test data
let authToken = '';
let testUserId = '';
let testCourseId = '';
let testModuleId = '';

export function setup() {
  console.log('🚀 Setting up load test environment...');
  
  // Create test user and get auth token
  const registerResponse = http.post(`${API_BASE}/auth/register`, JSON.stringify({
    email: `loadtest-${Date.now()}@example.com`,
    password: 'LoadTest123!',
    full_name: 'Load Test User',
    persona: {
      learning_style: 'visual',
      expertise_level: 'intermediate',
      interests: ['programming', 'web development']
    }
  }), {
    headers: { 'Content-Type': 'application/json' }
  });

  check(registerResponse, {
    'user registration successful': (r) => r.status === 201,
  });

  if (registerResponse.status !== 201) {
    console.error('Failed to register test user:', registerResponse.body);
    return {};
  }

  // Login to get token
  const loginResponse = http.post(`${API_BASE}/auth/login`, JSON.stringify({
    email: registerResponse.json().user.email,
    password: 'LoadTest123!'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });

  check(loginResponse, {
    'user login successful': (r) => r.status === 200,
  });

  if (loginResponse.status !== 200) {
    console.error('Failed to login test user:', loginResponse.body);
    return {};
  }

  const loginData = loginResponse.json();
  authToken = loginData.token;
  testUserId = loginData.user.id;

  // Create test course
  const courseResponse = http.post(`${API_BASE}/courses`, JSON.stringify({
    title: 'Load Test Course',
    description: 'Course for load testing',
    category: 'technology'
  }), {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (courseResponse.status === 201) {
    testCourseId = courseResponse.json().id;
  }

  // Create test module
  const moduleResponse = http.post(`${API_BASE}/modules`, JSON.stringify({
    course_id: testCourseId,
    title: 'Load Test Module',
    description: 'Module for load testing'
  }), {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (moduleResponse.status === 201) {
    testModuleId = moduleResponse.json().id;
  }

  console.log('✅ Load test setup completed');
  
  return {
    authToken,
    testUserId,
    testCourseId,
    testModuleId
  };
}

export default function(data) {
  // Use setup data if available, otherwise create per-VU data
  const token = data.authToken || createTestUser();
  const userId = data.testUserId;
  const courseId = data.testCourseId;
  const moduleId = data.testModuleId;

  if (!token) {
    userJourneyErrors.add(1);
    return;
  }

  // Simulate different user scenarios with weighted distribution
  const scenario = Math.random();
  
  if (scenario < 0.4) {
    // 40% - File upload and processing journey
    simulateFileUploadJourney(token, moduleId);
  } else if (scenario < 0.7) {
    // 30% - AI content generation journey
    simulateAIContentJourney(token, userId);
  } else if (scenario < 0.9) {
    // 20% - Vector search and discovery journey
    simulateSearchJourney(token, userId);
  } else {
    // 10% - Dashboard and analytics journey
    simulateDashboardJourney(token, userId);
  }

  sleep(1); // Think time between actions
}

function createTestUser() {
  const userEmail = `loadtest-vu-${__VU}-${Math.random().toString(36).substr(2, 9)}@example.com`;
  
  const registerResponse = http.post(`${API_BASE}/auth/register`, JSON.stringify({
    email: userEmail,
    password: 'LoadTest123!',
    full_name: `Load Test User ${__VU}`,
    persona: {
      learning_style: ['visual', 'auditory', 'kinesthetic'][Math.floor(Math.random() * 3)],
      expertise_level: ['beginner', 'intermediate', 'expert'][Math.floor(Math.random() * 3)],
      interests: ['programming', 'data science', 'design'][Math.floor(Math.random() * 3)]
    }
  }), {
    headers: { 'Content-Type': 'application/json' }
  });

  if (registerResponse.status !== 201) {
    userJourneyErrors.add(1);
    return null;
  }

  const loginResponse = http.post(`${API_BASE}/auth/login`, JSON.stringify({
    email: userEmail,
    password: 'LoadTest123!'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });

  if (loginResponse.status !== 200) {
    userJourneyErrors.add(1);
    return null;
  }

  return loginResponse.json().token;
}

function simulateFileUploadJourney(token, moduleId) {
  console.log('📁 Simulating file upload journey...');
  
  // Create mock file content
  const fileContent = `Load test content ${Date.now()} - This is a comprehensive document for testing file processing capabilities. It contains multiple paragraphs to ensure proper chunking and embedding generation.`;
  
  // Upload file
  const formData = {
    file: http.file(Buffer.from(fileContent), 'loadtest-document.txt', 'text/plain'),
    module_id: moduleId || 'default-module'
  };

  const uploadResponse = http.post(`${API_BASE}/files/upload`, formData, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const uploadSuccess = check(uploadResponse, {
    'file upload successful': (r) => r.status === 200,
    'file upload response time OK': (r) => r.timings.duration < 5000,
  });

  fileProcessingRate.add(uploadSuccess);

  if (!uploadSuccess) {
    userJourneyErrors.add(1);
    return;
  }

  const fileId = uploadResponse.json().file_id;

  // Poll for processing completion
  let processingComplete = false;
  let attempts = 0;
  const maxAttempts = 30; // 30 seconds max wait

  while (!processingComplete && attempts < maxAttempts) {
    sleep(1);
    attempts++;

    const statusResponse = http.get(`${API_BASE}/files/${fileId}/status`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (statusResponse.status === 200) {
      const status = statusResponse.json();
      processingComplete = status.processing_status === 'completed';
    }
  }

  check(null, {
    'file processing completed in time': () => processingComplete,
  });

  if (!processingComplete) {
    userJourneyErrors.add(1);
  }
}

function simulateAIContentJourney(token, userId) {
  console.log('🤖 Simulating AI content generation journey...');
  
  // Get user's files first
  const filesResponse = http.get(`${API_BASE}/files?user_id=${userId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (filesResponse.status !== 200 || !filesResponse.json().files?.length) {
    // Create a quick file for AI generation
    const quickFileResponse = http.post(`${API_BASE}/files`, JSON.stringify({
      original_name: 'quick-ai-test.txt',
      content: 'Quick content for AI generation testing.',
      mime_type: 'text/plain'
    }), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (quickFileResponse.status !== 201) {
      userJourneyErrors.add(1);
      return;
    }
  }

  const files = filesResponse.json().files || [{ id: 'mock-file-id' }];
  const randomFile = files[Math.floor(Math.random() * files.length)];

  // Generate AI content
  const aiStartTime = Date.now();
  const aiResponse = http.post(`${API_BASE}/ai/generate-content`, JSON.stringify({
    file_id: randomFile.id,
    content_type: ['summary', 'flashcards', 'quiz'][Math.floor(Math.random() * 3)],
    persona: {
      learning_style: 'visual',
      expertise_level: 'intermediate'
    }
  }), {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const aiDuration = Date.now() - aiStartTime;
  aiGenerationTime.add(aiDuration);

  const aiSuccess = check(aiResponse, {
    'AI generation successful': (r) => r.status === 200,
    'AI generation response time OK': (r) => aiDuration < 15000,
  });

  if (!aiSuccess) {
    userJourneyErrors.add(1);
  }
}

function simulateSearchJourney(token, userId) {
  console.log('🔍 Simulating search and discovery journey...');
  
  const searchQueries = [
    'machine learning algorithms',
    'web development best practices',
    'data structures and algorithms',
    'user interface design principles',
    'database optimization techniques'
  ];

  const query = searchQueries[Math.floor(Math.random() * searchQueries.length)];
  
  // Perform semantic search
  const searchStartTime = Date.now();
  const searchResponse = http.post(`${API_BASE}/search/semantic`, JSON.stringify({
    query: query,
    user_id: userId,
    limit: 10
  }), {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const searchDuration = Date.now() - searchStartTime;
  vectorSearchTime.add(searchDuration);

  const searchSuccess = check(searchResponse, {
    'search successful': (r) => r.status === 200,
    'search response time OK': (r) => searchDuration < 2000,
    'search returns results': (r) => r.json().results?.length > 0,
  });

  if (!searchSuccess) {
    userJourneyErrors.add(1);
  }

  // Follow up with content retrieval
  if (searchSuccess && searchResponse.json().results?.length > 0) {
    const firstResult = searchResponse.json().results[0];
    
    const contentResponse = http.get(`${API_BASE}/files/${firstResult.file_id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    check(contentResponse, {
      'content retrieval successful': (r) => r.status === 200,
    });
  }
}

function simulateDashboardJourney(token, userId) {
  console.log('📊 Simulating dashboard and analytics journey...');
  
  // Load dashboard data
  const dashboardResponse = http.get(`${API_BASE}/dashboard`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const dashboardSuccess = check(dashboardResponse, {
    'dashboard load successful': (r) => r.status === 200,
    'dashboard response time OK': (r) => r.timings.duration < 3000,
  });

  if (!dashboardSuccess) {
    userJourneyErrors.add(1);
    return;
  }

  // Load analytics data
  const analyticsResponse = http.get(`${API_BASE}/analytics/user/${userId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  check(analyticsResponse, {
    'analytics load successful': (r) => r.status === 200,
  });

  // Load courses
  const coursesResponse = http.get(`${API_BASE}/courses`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  check(coursesResponse, {
    'courses load successful': (r) => r.status === 200,
  });
}

export function teardown(data) {
  console.log('🧹 Cleaning up load test data...');
  
  if (data.authToken && data.testUserId) {
    // Clean up test data if needed
    // Note: In a real scenario, you might want to clean up test users and data
    console.log('✅ Load test cleanup completed');
  }
}

export function handleSummary(data) {
  console.log('📊 Generating load test summary...');
  
  const summary = {
    timestamp: new Date().toISOString(),
    duration: data.state.testRunDurationMs,
    vus_max: data.state.vusMax,
    iterations: data.metrics.iterations.values.count,
    http_requests: data.metrics.http_reqs.values.count,
    avg_response_time: data.metrics.http_req_duration.values.avg,
    p95_response_time: data.metrics.http_req_duration.values['p(95)'],
    error_rate: data.metrics.http_req_failed.values.rate,
    thresholds: data.thresholds,
    custom_metrics: {
      user_journey_errors: data.metrics.user_journey_errors?.values.count || 0,
      file_processing_rate: data.metrics.file_processing_success_rate?.values.rate || 0,
      avg_ai_generation_time: data.metrics.ai_generation_response_time?.values.avg || 0,
      avg_vector_search_time: data.metrics.vector_search_response_time?.values.avg || 0,
    }
  };

  return {
    'load-test-results.json': JSON.stringify(summary, null, 2),
  };
}