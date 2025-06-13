const axios = require('axios');
require('dotenv').config();

async function testCourseCreation() {
  console.log('Testing course creation endpoint...');
  
  // Get Supabase auth token
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  );

  // Login with a test user (you'll need to create one)
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test@example.com', // Replace with a real test user
    password: 'testpassword123' // Replace with real password
  });

  if (authError) {
    console.error('Auth error:', authError);
    return;
  }

  console.log('Authenticated successfully');

  try {
    const response = await axios.post(
      'http://localhost:8080/api/v1/courses',
      {
        title: 'Test Course',
        description: 'This is a test course',
        isPublic: false
      },
      {
        headers: {
          'Authorization': `Bearer ${authData.session.access_token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Course created successfully:', response.data);
  } catch (error) {
    console.error('Error creating course:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Headers:', error.response?.headers);
    
    if (error.response?.status === 500) {
      console.error('\nInternal server error details:');
      console.error(JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Check if backend is running
axios.get('http://localhost:8080/health')
  .then(() => {
    console.log('Backend is running');
    testCourseCreation();
  })
  .catch(() => {
    console.error('Backend is not running on port 8080. Please start it first.');
  });