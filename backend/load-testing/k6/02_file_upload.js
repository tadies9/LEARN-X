/**
 * k6 Load Test: File Upload Flow
 * Tests file upload, processing status checks, and chunk retrieval
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { FormData } from 'https://jslib.k6.io/formdata/0.0.2/index.js';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const uploadSuccessRate = new Rate('upload_success');
const uploadDuration = new Trend('upload_duration');
const processingDuration = new Trend('processing_duration');

export const options = {
  scenarios: {
    file_upload: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '1m', target: 5 },    // Ramp to 5 concurrent uploads
        { duration: '3m', target: 10 },   // Stay at 10 concurrent uploads
        { duration: '1m', target: 20 },   // Spike to 20 concurrent uploads
        { duration: '2m', target: 20 },   // Maintain spike
        { duration: '1m', target: 0 },    // Ramp down
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<3000'],     // 95% under 3s (file uploads are slower)
    upload_success: ['rate>0.95'],         // 95% upload success rate
    upload_duration: ['p(95)<5000'],       // 95% of uploads under 5s
    processing_duration: ['p(95)<30000'],  // 95% processed within 30s
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080/api/v1';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token'; // In production, get from auth flow

// Generate test file content
function generateTestFile(sizeKB) {
  const content = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(
    Math.floor((sizeKB * 1024) / 60) // Approximate size
  );
  return new File([content], `test-file-${Date.now()}.txt`, { type: 'text/plain' });
}

export default function () {
  const moduleId = 'test-module-id'; // In production, use actual module IDs
  const startTime = Date.now();
  
  // 1. Upload file
  const fd = new FormData();
  const testFile = generateTestFile(100); // 100KB test file
  fd.append('file', http.file(testFile.content, testFile.name, testFile.type));
  fd.append('moduleId', moduleId);
  
  const uploadParams = {
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
    tags: { name: 'file_upload' },
    timeout: '30s',
  };
  
  const uploadRes = http.post(`${BASE_URL}/files/upload`, fd.body(), {
    ...uploadParams,
    headers: {
      ...uploadParams.headers,
      'Content-Type': `multipart/form-data; boundary=${fd.boundary}`,
    },
  });
  
  const uploadSuccess = check(uploadRes, {
    'upload status is 200': (r) => r.status === 200,
    'upload returns file data': (r) => r.json('file') !== undefined,
    'upload returns file id': (r) => r.json('file.id') !== undefined,
  });
  
  uploadSuccessRate.add(uploadSuccess);
  uploadDuration.add(Date.now() - startTime);
  
  if (!uploadSuccess) {
    console.error(`Upload failed: ${uploadRes.status} - ${uploadRes.body}`);
    return;
  }
  
  const fileId = uploadRes.json('file.id');
  sleep(2);
  
  // 2. Poll for processing completion
  const processingStartTime = Date.now();
  let processingComplete = false;
  let attempts = 0;
  const maxAttempts = 30; // Max 30 attempts (60 seconds with 2s sleep)
  
  while (!processingComplete && attempts < maxAttempts) {
    const statusRes = http.get(
      `${BASE_URL}/files/${fileId}/status`,
      {
        headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` },
        tags: { name: 'check_status' },
      }
    );
    
    if (statusRes.status === 200) {
      const status = statusRes.json('status');
      if (status === 'completed') {
        processingComplete = true;
        processingDuration.add(Date.now() - processingStartTime);
      } else if (status === 'failed') {
        console.error(`File processing failed for ${fileId}`);
        break;
      }
    }
    
    if (!processingComplete) {
      sleep(2);
      attempts++;
    }
  }
  
  if (!processingComplete) {
    console.warn(`Processing timeout for file ${fileId} after ${attempts} attempts`);
    return;
  }
  
  // 3. Get file chunks
  const chunksRes = http.get(
    `${BASE_URL}/files/${fileId}/chunks`,
    {
      headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` },
      tags: { name: 'get_chunks' },
    }
  );
  
  check(chunksRes, {
    'chunks status is 200': (r) => r.status === 200,
    'chunks is array': (r) => Array.isArray(r.json('chunks')),
    'chunks not empty': (r) => r.json('chunks').length > 0,
  });
  
  sleep(1);
  
  // 4. Search within file chunks
  const searchPayload = JSON.stringify({
    query: 'Lorem ipsum',
    fileId: fileId,
    limit: 5,
  });
  
  const searchRes = http.post(
    `${BASE_URL}/search`,
    searchPayload,
    {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      tags: { name: 'search_chunks' },
    }
  );
  
  check(searchRes, {
    'search status is 200': (r) => r.status === 200,
    'search returns results': (r) => r.json('results') !== undefined,
  });
}

export function teardown() {
  console.log('File upload load test completed');
}