/**
 * k6 Load Test: Full User Journey
 * Simulates complete user workflows from login to content generation
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { FormData } from 'https://jslib.k6.io/formdata/0.0.2/index.js';

// Custom metrics
const journeySuccessRate = new Rate('journey_complete');
const stepSuccessRate = new Rate('step_success');
const journeyDuration = new Trend('journey_duration');

export const options = {
  scenarios: {
    user_journey: {
      executor: 'constant-arrival-rate',
      rate: 2,           // 2 new users per second
      timeUnit: '1s',
      duration: '10m',
      preAllocatedVUs: 50,
      maxVUs: 100,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<3000'],     // 95% of requests under 3s
    journey_complete: ['rate>0.8'],        // 80% of journeys complete
    step_success: ['rate>0.9'],            // 90% of steps succeed
    journey_duration: ['p(95)<120000'],    // 95% complete under 2 minutes
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080/api/v1';

// Test data
const TEST_USERS = [
  { email: 'testuser1@example.com', password: 'password123' },
  { email: 'testuser2@example.com', password: 'password123' },
  { email: 'testuser3@example.com', password: 'password123' },
];

const COURSE_TOPICS = [
  'Introduction to JavaScript',
  'Python for Data Science',
  'Web Development Fundamentals',
  'Machine Learning Basics',
];

function generateTestFile(name, content) {
  return {
    name: name,
    content: content,
    type: 'text/plain',
  };
}

export default function () {
  const journeyStart = Date.now();
  let token = null;
  let userId = null;
  let courseId = null;
  let moduleId = null;
  let fileId = null;
  let journeySuccess = true;
  
  // Select random test user
  const testUser = TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)];
  
  // Step 1: Login
  group('1. User Login', () => {
    const loginRes = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({
        email: testUser.email,
        password: testUser.password,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'login' },
      }
    );
    
    const loginSuccess = check(loginRes, {
      'login successful': (r) => r.status === 200 && r.json('token'),
    });
    
    stepSuccessRate.add(loginSuccess);
    journeySuccess = journeySuccess && loginSuccess;
    
    if (loginSuccess) {
      token = loginRes.json('token');
      userId = loginRes.json('user.id');
    } else {
      console.error(`Login failed for ${testUser.email}`);
      return; // Exit early if login fails
    }
    
    sleep(1);
  });
  
  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  
  // Step 2: Create or get persona
  group('2. Setup Persona', () => {
    const personaRes = http.post(
      `${BASE_URL}/persona`,
      JSON.stringify({
        learningStyle: 'visual',
        experienceLevel: 'intermediate',
        goals: ['practical skills', 'career advancement'],
        preferences: {
          sessionDuration: 30,
          difficulty: 'moderate',
          interactionStyle: 'guided',
        },
      }),
      { headers: authHeaders, tags: { name: 'create_persona' } }
    );
    
    const personaSuccess = check(personaRes, {
      'persona created/updated': (r) => r.status === 200 || r.status === 201,
    });
    
    stepSuccessRate.add(personaSuccess);
    journeySuccess = journeySuccess && personaSuccess;
    
    sleep(1);
  });
  
  // Step 3: Create a course
  group('3. Create Course', () => {
    const topic = COURSE_TOPICS[Math.floor(Math.random() * COURSE_TOPICS.length)];
    
    const courseRes = http.post(
      `${BASE_URL}/courses`,
      JSON.stringify({
        name: `${topic} - ${Date.now()}`,
        description: `A comprehensive course on ${topic}`,
        metadata: {
          level: 'intermediate',
          duration: '4 weeks',
          topics: [topic],
        },
      }),
      { headers: authHeaders, tags: { name: 'create_course' } }
    );
    
    const courseSuccess = check(courseRes, {
      'course created': (r) => r.status === 201 && r.json('course.id'),
    });
    
    stepSuccessRate.add(courseSuccess);
    journeySuccess = journeySuccess && courseSuccess;
    
    if (courseSuccess) {
      courseId = courseRes.json('course.id');
    }
    
    sleep(1);
  });
  
  // Step 4: Generate course outline
  group('4. Generate Outline', () => {
    const outlineRes = http.post(
      `${BASE_URL}/learn/outline`,
      JSON.stringify({
        topic: COURSE_TOPICS[Math.floor(Math.random() * COURSE_TOPICS.length)],
        courseId: courseId,
        duration: '2 weeks',
        preferences: {
          depth: 'comprehensive',
          includeExercises: true,
        },
      }),
      { headers: authHeaders, tags: { name: 'generate_outline' }, timeout: '30s' }
    );
    
    const outlineSuccess = check(outlineRes, {
      'outline generated': (r) => r.status === 200 && r.json('outline'),
    });
    
    stepSuccessRate.add(outlineSuccess);
    journeySuccess = journeySuccess && outlineSuccess;
    
    sleep(2);
  });
  
  // Step 5: Create module
  group('5. Create Module', () => {
    const moduleRes = http.post(
      `${BASE_URL}/modules`,
      JSON.stringify({
        courseId: courseId,
        name: 'Module 1: Introduction',
        description: 'Introduction to the course topic',
        orderIndex: 1,
      }),
      { headers: authHeaders, tags: { name: 'create_module' } }
    );
    
    const moduleSuccess = check(moduleRes, {
      'module created': (r) => r.status === 201 && r.json('module.id'),
    });
    
    stepSuccessRate.add(moduleSuccess);
    journeySuccess = journeySuccess && moduleSuccess;
    
    if (moduleSuccess) {
      moduleId = moduleRes.json('module.id');
    }
    
    sleep(1);
  });
  
  // Step 6: Upload file
  group('6. Upload Content', () => {
    const fd = new FormData();
    const testFile = generateTestFile(
      `test-content-${Date.now()}.txt`,
      'This is test content for the module. It contains important information about the topic.'
    );
    
    fd.append('file', http.file(testFile.content, testFile.name, testFile.type));
    fd.append('moduleId', moduleId);
    
    const uploadRes = http.post(
      `${BASE_URL}/files/upload`,
      fd.body(),
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': `multipart/form-data; boundary=${fd.boundary}`,
        },
        tags: { name: 'file_upload' },
        timeout: '30s',
      }
    );
    
    const uploadSuccess = check(uploadRes, {
      'file uploaded': (r) => r.status === 200 && r.json('file.id'),
    });
    
    stepSuccessRate.add(uploadSuccess);
    journeySuccess = journeySuccess && uploadSuccess;
    
    if (uploadSuccess) {
      fileId = uploadRes.json('file.id');
    }
    
    sleep(3);
  });
  
  // Step 7: Search content
  group('7. Search Content', () => {
    const searchRes = http.post(
      `${BASE_URL}/search`,
      JSON.stringify({
        query: 'important information',
        courseId: courseId,
        limit: 5,
      }),
      { headers: authHeaders, tags: { name: 'search' } }
    );
    
    const searchSuccess = check(searchRes, {
      'search completed': (r) => r.status === 200 && r.json('results'),
    });
    
    stepSuccessRate.add(searchSuccess);
    journeySuccess = journeySuccess && searchSuccess;
    
    sleep(1);
  });
  
  // Step 8: Start learning session
  group('8. Learning Session', () => {
    const sessionRes = http.post(
      `${BASE_URL}/sessions`,
      JSON.stringify({
        fileId: fileId,
        metadata: {
          source: 'load_test',
          deviceType: 'desktop',
        },
      }),
      { headers: authHeaders, tags: { name: 'start_session' } }
    );
    
    const sessionSuccess = check(sessionRes, {
      'session started': (r) => r.status === 201 && r.json('session.id'),
    });
    
    stepSuccessRate.add(sessionSuccess);
    journeySuccess = journeySuccess && sessionSuccess;
    
    if (sessionSuccess) {
      const sessionId = sessionRes.json('session.id');
      
      // Simulate learning activity
      sleep(5);
      
      // End session
      http.patch(
        `${BASE_URL}/sessions/${sessionId}`,
        JSON.stringify({
          endTime: new Date().toISOString(),
          progress: 0.25,
        }),
        { headers: authHeaders, tags: { name: 'end_session' } }
      );
    }
  });
  
  // Step 9: Get dashboard stats
  group('9. Dashboard Stats', () => {
    const statsRes = http.get(
      `${BASE_URL}/dashboard/stats`,
      { headers: authHeaders, tags: { name: 'dashboard_stats' } }
    );
    
    const statsSuccess = check(statsRes, {
      'stats retrieved': (r) => r.status === 200 && r.json('stats'),
    });
    
    stepSuccessRate.add(statsSuccess);
    journeySuccess = journeySuccess && statsSuccess;
  });
  
  // Record journey metrics
  journeySuccessRate.add(journeySuccess);
  journeyDuration.add(Date.now() - journeyStart);
}

export function teardown() {
  console.log('Full user journey load test completed');
}