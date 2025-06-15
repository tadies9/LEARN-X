const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testFileUpload() {
  try {
    // First, we need to get an auth token
    console.log('Getting auth token...');
    const authResponse = await axios.post('http://localhost:3001/api/v1/auth/login', {
      email: 'test@example.com', // Replace with actual test user
      password: 'password123' // Replace with actual password
    });
    
    const token = authResponse.data.data.access_token;
    console.log('Got token');

    // Create a test file
    const testContent = `This is a test document for the semantic AI system.
    
    Introduction
    This document contains several sections to test the chunking and processing capabilities.
    
    Section 1: Overview
    The system should be able to identify this as a separate section and chunk it appropriately.
    
    Section 2: Details
    This section contains more detailed information that should be processed separately.
    
    Conclusion
    The document ends here.`;
    
    const testFilePath = path.join(__dirname, 'test-document.txt');
    fs.writeFileSync(testFilePath, testContent);
    
    // Create form data
    const form = new FormData();
    form.append('file', fs.createReadStream(testFilePath));
    form.append('courseId', 'default'); // Replace with actual course ID
    form.append('moduleId', 'default-module'); // Replace with actual module ID
    form.append('name', 'Test Semantic Document');
    form.append('description', 'Testing file upload and processing');
    
    // Upload file
    console.log('Uploading file...');
    const uploadResponse = await axios.post(
      'http://localhost:3001/api/v1/files/upload',
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('Upload response:', uploadResponse.data);
    
    // Clean up
    fs.unlinkSync(testFilePath);
    
  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testFileUpload();