// Test setup for LEARN-X integration tests
const dotenv = require('dotenv');

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Test utilities
const generateUUID = () => {
  return 'test-' + Math.random().toString(36).substring(2) + Date.now().toString(36);
};

const generateTestUser = () => ({
  id: generateUUID(),
  email: `test-${Date.now()}@example.com`,
  full_name: 'Test User',
  created_at: new Date().toISOString(),
});

const generateTestCourse = (userId) => ({
  id: generateUUID(),
  user_id: userId,
  title: 'Test Course',
  description: 'Test course description',
  created_at: new Date().toISOString(),
});

const generateTestModule = (courseId) => ({
  id: generateUUID(),
  course_id: courseId,
  title: 'Test Module',
  description: 'Test module description',
  created_at: new Date().toISOString(),
});

// Global test setup
beforeAll(async () => {
  console.log('🧪 Setting up test environment...');
});

afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
});

// Export utilities
module.exports = {
  generateUUID,
  generateTestUser,
  generateTestCourse,
  generateTestModule,
};
