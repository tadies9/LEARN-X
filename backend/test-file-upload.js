const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testFileUpload() {
  try {
    // Test credentials - you need to update these
    const email = 'test@example.com';
    const password = 'password123';
    const moduleId = '3f4455b6-f435-483b-a712-017fc0fd2b5e'; // Update with a valid module ID

    console.log('1. Logging in...');
    const loginResponse = await axios.post('http://localhost:8080/api/v1/auth/login', {
      email,
      password
    });

    const token = loginResponse.data.token || loginResponse.data.data?.token;
    console.log('✓ Login successful');

    // Create a test file
    const testContent = 'This is a test file for upload testing';
    fs.writeFileSync('test-upload.txt', testContent);

    // Prepare form data
    const form = new FormData();
    form.append('file', fs.createReadStream('test-upload.txt'));
    form.append('moduleId', moduleId);
    form.append('name', 'Test Upload File');
    form.append('description', 'Testing file upload functionality');
    form.append('processingOptions', JSON.stringify({
      generateSummary: true,
      extractKeypoints: true,
      generateQuestions: false
    }));

    console.log('\n2. Uploading file...');
    console.log('Module ID:', moduleId);
    
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
    console.log('Response:', JSON.stringify(uploadResponse.data, null, 2));

    // Clean up
    fs.unlinkSync('test-upload.txt');

  } catch (error) {
    console.error('\n✗ Error occurred:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('\nTips:');
      if (error.response.status === 401) {
        console.error('- Update the email and password with valid credentials');
      } else if (error.response.status === 403) {
        console.error('- Make sure the moduleId belongs to a course owned by the test user');
      } else if (error.response.status === 400) {
        console.error('- Check that the moduleId is valid');
      }
    } else {
      console.error(error.message);
    }
  }
}

console.log('=== File Upload Test ===\n');
console.log('Note: Update the credentials and moduleId before running\n');
testFileUpload();