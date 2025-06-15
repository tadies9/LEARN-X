const axios = require('axios');

async function testFileProcessing() {
  try {
    // Check job tracking endpoint
    console.log('1. Checking job tracking status...');
    const jobsResponse = await axios.get('http://localhost:3001/api/v1/debug/job-tracking');
    
    console.log('Job tracking status:');
    console.log(JSON.stringify(jobsResponse.data, null, 2));

    // Check queue health
    console.log('\n2. Checking queue health...');
    const healthResponse = await axios.get('http://localhost:3001/api/v1/debug/queue-health');
    
    console.log('Queue health:');
    console.log(JSON.stringify(healthResponse.data, null, 2));

    // Check for any files in processing state
    console.log('\n3. Checking files in processing state...');
    const filesResponse = await axios.get('http://localhost:3001/api/v1/debug/files-by-status/processing');
    
    console.log('Files in processing:');
    console.log(JSON.stringify(filesResponse.data, null, 2));

  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

testFileProcessing();