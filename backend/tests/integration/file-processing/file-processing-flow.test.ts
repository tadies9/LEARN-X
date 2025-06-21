import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import {
  TestDatabase,
  TestRedis,
  TestFiles,
  TestAPI,
  PerformanceTracker,
  waitForCondition,
} from '../../utils/test-helpers';
import { testConfig } from '../../config/test.config';
import path from 'path';

describe('File Processing Integration Tests', () => {
  let db: TestDatabase;
  let redis: TestRedis;
  let api: TestAPI;
  let testData: { userId: string; courseId: string; moduleId: string };
  let authToken: string;

  beforeAll(async () => {
    // Initialize test infrastructure
    db = new TestDatabase();
    redis = new TestRedis();
    api = new TestAPI();

    // Seed test data
    testData = await db.seed();

    // Mock auth token
    authToken = 'test-auth-token';
  });

  afterAll(async () => {
    // Cleanup
    await db.cleanup();
    await redis.cleanup();
    await redis.disconnect();
  });

  beforeEach(async () => {
    // Clear any previous test data
    await redis.cleanup();
  });

  describe('Complete File Processing Flow', () => {
    test('should process PDF file end-to-end', async () => {
      const tracker = new PerformanceTracker();

      // Create test PDF file
      const pdfContent = TestFiles.getSampleFile('sample.pdf');

      // Start tracking
      tracker.start('file-upload');

      // 1. Upload file
      const uploadResponse = await api.uploadFile(
        pdfContent,
        'test-document.pdf',
        testData.moduleId,
        authToken
      );

      expect(uploadResponse.status).toBe(200);
      const { file_id } = await uploadResponse.json();

      tracker.end('file-upload');
      tracker.start('file-processing');

      // 2. Wait for processing to complete
      await waitForCondition(async () => {
        const statusResponse = await api.getFileProcessingStatus(file_id, authToken);
        const status = await statusResponse.json();
        return status.processing_status === 'completed';
      }, 60000); // 60 second timeout

      tracker.end('file-processing');

      // 3. Verify file data
      const fileResponse = await fetch(`${testConfig.api.baseUrl}/api/v1/files/${file_id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const fileData = await fileResponse.json();

      // Assertions
      expect(fileData).toMatchObject({
        id: file_id,
        module_id: testData.moduleId,
        original_name: 'test-document.pdf',
        processing_status: 'completed',
        mime_type: 'application/pdf',
      });

      expect(fileData.metadata).toMatchObject({
        page_count: expect.any(Number),
        word_count: expect.any(Number),
        has_images: expect.any(Boolean),
      });

      // 4. Verify chunks were created
      const chunksResponse = await fetch(
        `${testConfig.api.baseUrl}/api/v1/files/${file_id}/chunks`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      const chunks = await chunksResponse.json();
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0]).toMatchObject({
        content: expect.any(String),
        chunk_index: expect.any(Number),
        metadata: expect.any(Object),
      });

      // 5. Verify embeddings were generated
      expect(chunks[0].embedding_status).toBe('completed');

      // 6. Verify AI content was generated
      const aiContentResponse = await fetch(
        `${testConfig.api.baseUrl}/api/v1/files/${file_id}/ai-content`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      const aiContent = await aiContentResponse.json();
      expect(aiContent).toMatchObject({
        summary: expect.any(String),
        key_concepts: expect.any(Array),
        flashcards: expect.any(Array),
        quiz_questions: expect.any(Array),
      });

      // Performance assertions
      const report = tracker.getReport();
      expect(report['file-upload'].duration).toBeLessThan(
        testConfig.performance.apiResponseThreshold * 2
      );
      expect(report['file-processing'].duration).toBeLessThan(
        testConfig.performance.fileProcessingThreshold
      );
    });

    test('should process Word document', async () => {
      const docContent = TestFiles.getSampleFile('sample.docx');

      const uploadResponse = await api.uploadFile(
        docContent,
        'test-document.docx',
        testData.moduleId,
        authToken
      );

      expect(uploadResponse.status).toBe(200);
      const { file_id } = await uploadResponse.json();

      // Wait for processing
      await waitForCondition(async () => {
        const statusResponse = await api.getFileProcessingStatus(file_id, authToken);
        const status = await statusResponse.json();
        return status.processing_status === 'completed';
      });

      // Verify Word-specific metadata
      const fileResponse = await fetch(`${testConfig.api.baseUrl}/api/v1/files/${file_id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const fileData = await fileResponse.json();
      expect(fileData.mime_type).toMatch(
        /application\/(vnd\.openxmlformats-officedocument\.wordprocessingml\.document|msword)/
      );
      expect(fileData.metadata.word_count).toBeGreaterThan(0);
    });

    test('should process plain text file', async () => {
      const textContent = TestFiles.createMockFile(
        'This is a test document with multiple paragraphs.\\n\\n' +
          'It contains important information that should be processed.\\n\\n' +
          'The AI should be able to extract key concepts from this text.'
      );

      const uploadResponse = await api.uploadFile(
        textContent.buffer,
        'test-document.txt',
        testData.moduleId,
        authToken
      );

      expect(uploadResponse.status).toBe(200);
      const { file_id } = await uploadResponse.json();

      // Wait for processing
      await waitForCondition(async () => {
        const statusResponse = await api.getFileProcessingStatus(file_id, authToken);
        const status = await statusResponse.json();
        return status.processing_status === 'completed';
      });

      // Verify text processing
      const chunksResponse = await fetch(
        `${testConfig.api.baseUrl}/api/v1/files/${file_id}/chunks`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      const chunks = await chunksResponse.json();
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].content).toContain('test document');
    });
  });

  describe('Error Handling', () => {
    test('should handle unsupported file types', async () => {
      const unsupportedFile = TestFiles.createMockFile('test content', 'test.xyz');

      const uploadResponse = await api.uploadFile(
        unsupportedFile.buffer,
        'test.xyz',
        testData.moduleId,
        authToken
      );

      expect(uploadResponse.status).toBe(400);
      const error = await uploadResponse.json();
      expect(error.error).toContain('Unsupported file type');
    });

    test('should handle oversized files', async () => {
      const largeFile = TestFiles.createLargeFile(50); // 50MB file

      const uploadResponse = await api.uploadFile(
        largeFile,
        'large-file.txt',
        testData.moduleId,
        authToken
      );

      expect(uploadResponse.status).toBe(413);
      const error = await uploadResponse.json();
      expect(error.error).toContain('File too large');
    });

    test('should handle corrupted files gracefully', async () => {
      const corruptedPDF = Buffer.from('%PDF-1.4 corrupted content');

      const uploadResponse = await api.uploadFile(
        corruptedPDF,
        'corrupted.pdf',
        testData.moduleId,
        authToken
      );

      expect(uploadResponse.status).toBe(200);
      const { file_id } = await uploadResponse.json();

      // Wait for processing to fail
      await waitForCondition(async () => {
        const statusResponse = await api.getFileProcessingStatus(file_id, authToken);
        const status = await statusResponse.json();
        return status.processing_status === 'failed';
      });

      // Verify error details
      const fileResponse = await fetch(`${testConfig.api.baseUrl}/api/v1/files/${file_id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const fileData = await fileResponse.json();
      expect(fileData.processing_status).toBe('failed');
      expect(fileData.error_details).toBeDefined();
    });
  });

  describe('Concurrent Processing', () => {
    test('should handle multiple file uploads concurrently', async () => {
      const files = [
        TestFiles.createMockFile('Content 1', 'file1.txt'),
        TestFiles.createMockFile('Content 2', 'file2.txt'),
        TestFiles.createMockFile('Content 3', 'file3.txt'),
      ];

      const tracker = new PerformanceTracker();
      tracker.start('concurrent-upload');

      // Upload all files concurrently
      const uploadPromises = files.map((file) =>
        api.uploadFile(file.buffer, file.originalname, testData.moduleId, authToken)
      );

      const responses = await Promise.all(uploadPromises);
      tracker.end('concurrent-upload');

      // All uploads should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      // Extract file IDs
      const fileIds = await Promise.all(
        responses.map(async (r) => {
          const data = await r.json();
          return data.file_id;
        })
      );

      // Wait for all files to be processed
      await Promise.all(
        fileIds.map((fileId) =>
          waitForCondition(async () => {
            const statusResponse = await api.getFileProcessingStatus(fileId, authToken);
            const status = await statusResponse.json();
            return status.processing_status === 'completed';
          })
        )
      );

      // Verify all files were processed successfully
      const fileStatuses = await Promise.all(
        fileIds.map(async (fileId) => {
          const response = await fetch(`${testConfig.api.baseUrl}/api/v1/files/${fileId}`, {
            headers: { Authorization: `Bearer ${authToken}` },
          });
          return response.json();
        })
      );

      fileStatuses.forEach((file) => {
        expect(file.processing_status).toBe('completed');
      });

      // Performance check
      const report = tracker.getReport();
      expect(report['concurrent-upload'].duration).toBeLessThan(
        testConfig.performance.apiResponseThreshold * files.length
      );
    });
  });

  describe('Resume Processing', () => {
    test('should resume processing after interruption', async () => {
      const file = TestFiles.createMockFile('Content for resume test', 'resume-test.txt');

      // Upload file
      const uploadResponse = await api.uploadFile(
        file.buffer,
        file.originalname,
        testData.moduleId,
        authToken
      );

      expect(uploadResponse.status).toBe(200);
      const { file_id } = await uploadResponse.json();

      // Simulate processing interruption by manually updating status
      // This would normally happen if worker crashes

      // Wait a bit for initial processing to start
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Force re-queue the job
      const requeueResponse = await fetch(
        `${testConfig.api.baseUrl}/api/v1/admin/files/${file_id}/reprocess`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      expect(requeueResponse.status).toBe(200);

      // Wait for reprocessing to complete
      await waitForCondition(async () => {
        const statusResponse = await api.getFileProcessingStatus(file_id, authToken);
        const status = await statusResponse.json();
        return status.processing_status === 'completed';
      });

      // Verify file was processed successfully
      const fileResponse = await fetch(`${testConfig.api.baseUrl}/api/v1/files/${file_id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const fileData = await fileResponse.json();
      expect(fileData.processing_status).toBe('completed');
    });
  });
});
