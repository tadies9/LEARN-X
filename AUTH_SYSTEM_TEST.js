// System Test for Complete Authentication Flow
// Tests: Registration -> Email Verification -> Login -> Profile Access -> Logout

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Configuration
const SUPABASE_URL = 'https://fiuypfvcfodtjzuzhjie.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpdXlwZnZjZm9kdGp6dXpoamllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1MTYwODQsImV4cCI6MjA2NTA5MjA4NH0.7iMSR2YS8diFb5EP8E83BI_yC8gXoysL20XMHQI0FCE';
const API_URL = 'http://localhost:8080/api/v1';

// Test user
const timestamp = Math.floor(Date.now() / 1000);
const testEmail = `test.user${timestamp}@gmail.com`;
const testPassword = 'TestPassword123!';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test results
let testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// Helper functions
function logTest(testName, passed, error = null) {
  if (passed) {
    console.log(`✅ ${testName}`);
    testResults.passed++;
  } else {
    console.log(`❌ ${testName}`);
    if (error) console.log(`   Error: ${error}`);
    testResults.failed++;
    if (error) testResults.errors.push({ test: testName, error });
  }
}

async function testAuthFlow() {
  console.log('=== Authentication System Test ===\n');
  
  // Test 1: User Registration
  console.log('1. Testing User Registration...');
  try {
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test User'
        }
      }
    });
    
    if (signUpError) throw signUpError;
    logTest('User Registration', true);
    
    // Store user info
    const userId = signUpData.user?.id;
    console.log(`   User ID: ${userId}`);
    console.log(`   Email: ${testEmail}`);
    
  } catch (error) {
    logTest('User Registration', false, error.message);
    return; // Can't continue without registration
  }
  
  // Test 2: Login with Unverified Email
  console.log('\n2. Testing Login with Unverified Email...');
  try {
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    // Should allow login even if email not verified (Supabase default)
    if (loginError) throw loginError;
    logTest('Login with Unverified Email', true);
    
    // Get session
    const session = loginData.session;
    const accessToken = session?.access_token;
    console.log(`   Session obtained: ${!!accessToken}`);
    
    // Test 3: Access Protected API Endpoint
    console.log('\n3. Testing Protected API Access...');
    try {
      const response = await axios.get(`${API_URL}/persona`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      // Might return 404 if no persona exists yet, which is fine
      if (response.status === 200 || response.status === 404) {
        logTest('Protected API Access', true);
      } else {
        throw new Error(`Unexpected status: ${response.status}`);
      }
    } catch (apiError) {
      if (apiError.response?.status === 404) {
        logTest('Protected API Access', true);
      } else {
        logTest('Protected API Access', false, apiError.message);
      }
    }
    
    // Test 4: Refresh Token
    console.log('\n4. Testing Token Refresh...');
    try {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) throw refreshError;
      logTest('Token Refresh', !!refreshData.session);
    } catch (error) {
      logTest('Token Refresh', false, error.message);
    }
    
    // Test 5: Get User Profile
    console.log('\n5. Testing Get User Profile...');
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      logTest('Get User Profile', true);
      console.log(`   User Email: ${user.email}`);
      console.log(`   User Role: ${user.role}`);
    } catch (error) {
      logTest('Get User Profile', false, error.message);
    }
    
    // Test 6: Update User Metadata
    console.log('\n6. Testing Update User Metadata...');
    try {
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        data: { 
          full_name: 'Updated Test User',
          onboarding_completed: true 
        }
      });
      if (updateError) throw updateError;
      logTest('Update User Metadata', true);
    } catch (error) {
      logTest('Update User Metadata', false, error.message);
    }
    
    // Test 7: Logout
    console.log('\n7. Testing Logout...');
    try {
      const { error: logoutError } = await supabase.auth.signOut();
      if (logoutError) throw logoutError;
      
      // Verify session is cleared
      const { data: { session } } = await supabase.auth.getSession();
      logTest('Logout', !session);
    } catch (error) {
      logTest('Logout', false, error.message);
    }
    
    // Test 8: Access Protected Endpoint After Logout
    console.log('\n8. Testing Protected Access After Logout...');
    try {
      const response = await axios.get(`${API_URL}/persona`);
      logTest('Protected Access After Logout', false, 'Should have been rejected');
    } catch (error) {
      if (error.response?.status === 401) {
        logTest('Protected Access After Logout', true);
      } else {
        logTest('Protected Access After Logout', false, error.message);
      }
    }
    
  } catch (error) {
    logTest('Login Flow', false, error.message);
  }
  
  // Summary
  console.log('\n=== Test Summary ===');
  console.log(`Tests Passed: ${testResults.passed}`);
  console.log(`Tests Failed: ${testResults.failed}`);
  
  if (testResults.errors.length > 0) {
    console.log('\nErrors:');
    testResults.errors.forEach(({ test, error }) => {
      console.log(`- ${test}: ${error}`);
    });
  }
  
  // Cleanup - try to delete test user
  console.log('\nCleaning up test user...');
  // Note: User deletion requires service role key, skipping for now
}

// Run the test
testAuthFlow().catch(console.error);