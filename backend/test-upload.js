const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');
const path = require('path');

async function testFileUpload() {
  try {
    // First, we need to login to get a token
    console.log('1. Testing login...');
    const loginResponse = await axios.post('http://localhost:8080/api/v1/auth/login', {
      email: 'test@example.com', // Replace with your test user
      password: 'password123' // Replace with your test password
    });
    
    const token = loginResponse.data.token;
    console.log('✓ Login successful, got token');

    // Create a test file
    const testFilePath = path.join(__dirname, 'test-file.txt');
    fs.writeFileSync(testFilePath, 'This is a test file for upload');
    
    // Prepare form data
    const form = new FormData();
    form.append('file', fs.createReadStream(testFilePath));
    form.append('moduleId', 'your-module-id-here'); // Replace with actual module ID
    form.append('name', 'Test Upload File');
    form.append('description', 'Testing file upload functionality');

    // Upload file
    console.log('\n2. Testing file upload...');
    const uploadResponse = await axios.post(
      'http://localhost:8080/api/v1/files/upload',
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${token}`
        }
      }
    );

    console.log('✓ File uploaded successfully!');
    console.log('Response:', uploadResponse.data);

    // Clean up
    fs.unlinkSync(testFilePath);

  } catch (error) {
    console.error('✗ Error:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.log('\nPlease update the test with valid credentials');
    }
  }
}

// Run the test
console.log('Starting file upload test...\n');
testFileUpload();