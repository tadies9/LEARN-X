#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const API_URL = 'http://localhost:3001';

async function testFileProcessing() {
  console.log('🧪 Testing File Processing Pipeline\n');

  try {
    // 1. Get a test user and course
    const { data: courses } = await supabase
      .from('courses')
      .select('id, title, user_id, modules(id, title)')
      .limit(1);

    if (!courses || courses.length === 0) {
      console.log('❌ No courses found. Creating test data...');
      
      // Get first user
      const { data: users } = await supabase.auth.admin.listUsers();
      if (!users?.users?.length) {
        console.log('❌ No users found');
        return;
      }
      
      const userId = users.users[0].id;
      console.log('Using user:', userId);
      
      // Create test course
      const { data: course } = await supabase
        .from('courses')
        .insert({
          user_id: userId,
          title: 'Test Course for File Processing',
          description: 'Test course',
          is_public: false
        })
        .select()
        .single();
        
      // Create test module
      const { data: module } = await supabase
        .from('modules')
        .insert({
          course_id: course.id,
          title: 'Test Module',
          description: 'Test module',
          order_index: 0
        })
        .select()
        .single();
        
      console.log('✅ Created test course and module');
      
      // Set for testing
      courses[0] = { ...course, modules: [module], user_id: userId };
    }

    const course = courses[0];
    const module = course.modules[0];
    const userId = course.user_id;

    console.log('📚 Using course:', course.title);
    console.log('📁 Using module:', module.title);
    console.log('👤 User ID:', userId);

    // 2. Create a test file
    const testContent = `
# Machine Learning Fundamentals

Machine learning is a subset of artificial intelligence that enables computers to learn from data.

## Types of Machine Learning

1. **Supervised Learning**: Learning from labeled data
   - Classification: Predicting categories
   - Regression: Predicting continuous values

2. **Unsupervised Learning**: Finding patterns in unlabeled data
   - Clustering: Grouping similar items
   - Dimensionality reduction: Simplifying complex data

3. **Reinforcement Learning**: Learning through trial and error
   - Agent learns by interacting with environment
   - Receives rewards or penalties for actions

## Key Concepts

- **Training Data**: Data used to train the model
- **Validation Data**: Data used to tune hyperparameters
- **Test Data**: Data used to evaluate final performance
- **Feature Engineering**: Creating useful features from raw data
- **Model Evaluation**: Measuring how well the model performs
    `.trim();

    // Write to temporary file
    const fs = await import('fs');
    const tempFile = '/tmp/test-ml-content.txt';
    fs.writeFileSync(tempFile, testContent);

    // 3. Upload file via API
    console.log('\n📤 Uploading file...');
    
    const form = new FormData();
    form.append('file', fs.createReadStream(tempFile), {
      filename: 'test-ml-content.txt',
      contentType: 'text/plain'
    });
    form.append('moduleId', module.id);
    form.append('name', 'Machine Learning Basics');

    const uploadResponse = await fetch(`${API_URL}/api/v1/files/upload`, {
      method: 'POST',
      headers: {
        'x-user-id': userId,
        ...form.getHeaders()
      },
      body: form
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      console.error('❌ Upload failed:', error);
      return;
    }

    const { data: uploadedFile } = await uploadResponse.json();
    console.log('✅ File uploaded:', uploadedFile.id);

    // 4. Monitor processing progress
    console.log('\n⏳ Monitoring file processing...');
    
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
      const { data: file } = await supabase
        .from('course_files')
        .select('status, error_message')
        .eq('id', uploadedFile.id)
        .single();
        
      console.log(`  Status: ${file.status}`);
      
      if (file.status === 'completed') {
        console.log('✅ File processing completed!');
        break;
      } else if (file.status === 'failed') {
        console.log('❌ File processing failed:', file.error_message);
        break;
      }
      
      attempts++;
    }

    // 5. Check chunks and embeddings
    console.log('\n📊 Checking results...');
    
    const { data: chunks } = await supabase
      .from('file_chunks')
      .select('id')
      .eq('file_id', uploadedFile.id);
      
    console.log(`  Chunks created: ${chunks?.length || 0}`);
    
    const { data: embeddings } = await supabase
      .from('file_embeddings')
      .select('id')
      .eq('file_id', uploadedFile.id);
      
    console.log(`  Embeddings created: ${embeddings?.length || 0}`);

    // 6. Check queue status
    console.log('\n📨 Queue Status:');
    
    const queues = ['file_processing', 'embedding_generation'];
    for (const queueName of queues) {
      try {
        const { data: queueSize } = await supabase
          .rpc('pgmq_queue_depth', { queue_name: queueName });
        console.log(`  ${queueName}: ${queueSize || 0} messages`);
      } catch (err) {
        console.log(`  ${queueName}: Unable to check`);
      }
    }

    console.log('\n✅ Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Check if server is running first
console.log('⏳ Checking if backend server is running...');
fetch(`${API_URL}/health`)
  .then(() => {
    console.log('✅ Backend server is running!\n');
    testFileProcessing();
  })
  .catch(() => {
    console.log('❌ Backend server is not running. Please start it with: npm run dev');
    process.exit(1);
  });