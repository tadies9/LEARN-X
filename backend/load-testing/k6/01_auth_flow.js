/**
 * k6 Load Test: Authentication Flow
 * Tests login, token refresh, and authenticated requests
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const loginSuccessRate = new Rate('login_success');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 users
    { duration: '2m', target: 50 },    // Stay at 50 users
    { duration: '30s', target: 100 },  // Spike to 100 users
    { duration: '2m', target: 100 },   // Stay at 100 users
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    errors: ['rate<0.1'],             // Error rate under 10%
    login_success: ['rate>0.9'],      // Login success rate over 90%
  },
};

// Test users (in production, load from CSV)
const users = new SharedArray('users', function () {
  return [
    { email: 'test1@example.com', password: 'password123' },
    { email: 'test2@example.com', password: 'password123' },
    { email: 'test3@example.com', password: 'password123' },
    { email: 'test4@example.com', password: 'password123' },
    { email: 'test5@example.com', password: 'password123' },
  ];
});

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080/api/v1';

export function setup() {
  // Setup code - create test users if needed
  console.log('Setting up auth flow test...');
  
  // Check if API is responsive
  const healthCheck = http.get(`${BASE_URL}/health`);
  check(healthCheck, {
    'API is healthy': (r) => r.status === 200,
  });
  
  return { startTime: new Date().toISOString() };
}

export default function () {
  // Select a random user
  const user = users[Math.floor(Math.random() * users.length)];
  
  // 1. Login
  const loginPayload = JSON.stringify({
    email: user.email,
    password: user.password,
  });
  
  const loginParams = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { name: 'login' },
  };
  
  const loginRes = http.post(`${BASE_URL}/auth/login`, loginPayload, loginParams);
  
  const loginSuccess = check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'login has token': (r) => r.json('token') !== undefined,
    'login has user data': (r) => r.json('user') !== undefined,
  });
  
  loginSuccessRate.add(loginSuccess);
  errorRate.add(!loginSuccess);
  
  if (!loginSuccess) {
    console.error(`Login failed for ${user.email}: ${loginRes.status} - ${loginRes.body}`);
    return;
  }
  
  const token = loginRes.json('token');
  const userId = loginRes.json('user.id');
  
  sleep(1); // Think time
  
  // 2. Get user profile
  const authHeaders = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    tags: { name: 'get_profile' },
  };
  
  const profileRes = http.get(`${BASE_URL}/auth/profile`, authHeaders);
  
  check(profileRes, {
    'profile status is 200': (r) => r.status === 200,
    'profile has user data': (r) => r.json('user') !== undefined,
  });
  
  sleep(2);
  
  // 3. Get user's courses
  const coursesRes = http.get(`${BASE_URL}/courses`, authHeaders);
  
  check(coursesRes, {
    'courses status is 200': (r) => r.status === 200,
    'courses is array': (r) => Array.isArray(r.json('courses')),
  });
  
  sleep(1);
  
  // 4. Get dashboard data
  const dashboardRes = http.get(`${BASE_URL}/dashboard/stats`, authHeaders);
  
  check(dashboardRes, {
    'dashboard status is 200': (r) => r.status === 200,
    'dashboard has stats': (r) => r.json('stats') !== undefined,
  });
  
  sleep(2);
  
  // 5. Logout (optional)
  const logoutRes = http.post(`${BASE_URL}/auth/logout`, null, authHeaders);
  
  check(logoutRes, {
    'logout status is 200': (r) => r.status === 200,
  });
}

export function teardown(data) {
  console.log(`Auth flow test completed. Started at: ${data.startTime}`);
}