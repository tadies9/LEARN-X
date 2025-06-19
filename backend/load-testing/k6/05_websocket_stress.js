/**
 * Enhanced k6 Load Test: WebSocket Real-time Features
 * Tests WebSocket connections, real-time updates, and collaboration features
 */

import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

// Custom metrics
const wsConnectRate = new Rate('ws_connect_success');
const messageRate = new Rate('ws_message_success');
const wsLatency = new Trend('ws_message_latency');
const reconnectRate = new Rate('ws_reconnect_success');
const broadcastLatency = new Trend('ws_broadcast_latency');
const totalMessages = new Counter('ws_total_messages');
const totalReconnects = new Counter('ws_total_reconnects');
const concurrentConnections = new Counter('ws_concurrent_connections');

export const options = {
  scenarios: {
    // Scenario 1: Learning session connections (main load)
    learning_sessions: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },    // Initial users
        { duration: '1m', target: 60 },     // Regular usage
        { duration: '2m', target: 120 },    // Peak hours
        { duration: '1m', target: 150 },    // Stress test
        { duration: '30s', target: 0 },     // Ramp down
      ],
      gracefulRampDown: '30s',
      exec: 'learningSession',
    },
    
    // Scenario 2: Real-time collaboration (fewer users, more activity)
    collaboration: {
      executor: 'constant-vus',
      vus: 25,
      duration: '4m',
      startTime: '1m',
      exec: 'collaborativeSession',
    },
    
    // Scenario 3: Connection resilience testing
    reconnection_test: {
      executor: 'constant-vus',
      vus: 10,
      duration: '3m',
      startTime: '2m',
      exec: 'reconnectionTest',
    },
    
    // Scenario 4: Broadcast performance testing
    broadcast_test: {
      executor: 'constant-vus',
      vus: 5,
      duration: '2m',
      startTime: '3m',
      exec: 'broadcastTest',
    },
  },
  thresholds: {
    ws_connect_success: ['rate>0.95'],
    ws_message_success: ['rate>0.98'],
    ws_message_latency: ['p(95)<150'],
    ws_broadcast_latency: ['p(95)<200'],
    ws_reconnect_success: ['rate>0.9'],
    ws_req_duration: ['p(95)<3000'],
  },
};

const WS_URL = __ENV.WS_URL || 'ws://localhost:8080';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';

// Realistic message types for different scenarios
const LEARNING_MESSAGES = [
  { type: 'learning_progress', data: { fileId: 'test-file', progress: 0.5, chunkId: 'chunk-1' } },
  { type: 'chunk_highlight', data: { chunkId: 'test-chunk', highlight: true, color: '#yellow' } },
  { type: 'quiz_response', data: { questionId: 'q1', answer: 'A', confidence: 0.8 } },
  { type: 'note_create', data: { noteId: 'note1', content: 'Test note', position: { x: 100, y: 200 } } },
  { type: 'bookmark_add', data: { chunkId: 'chunk-2', timestamp: Date.now() } },
  { type: 'session_heartbeat', data: { status: 'active', lastActivity: Date.now() } },
];

const COLLABORATION_MESSAGES = [
  { type: 'cursor_move', data: { x: 150, y: 300, userId: 'user-1' } },
  { type: 'text_select', data: { start: 100, end: 200, text: 'selected text' } },
  { type: 'annotation_add', data: { type: 'highlight', content: 'important', range: [50, 100] } },
  { type: 'presence_update', data: { status: 'typing', location: 'document-section-1' } },
  { type: 'chat_message', data: { message: 'Quick question about this section', channel: 'study-group' } },
  { type: 'voice_activity', data: { speaking: true, level: 0.7 } },
];

const SYSTEM_MESSAGES = [
  { type: 'ai_generation_start', data: { requestId: 'req-123', estimatedTime: 5000 } },
  { type: 'ai_generation_progress', data: { requestId: 'req-123', progress: 0.3 } },
  { type: 'file_processing_update', data: { fileId: 'file-456', status: 'chunking', progress: 0.6 } },
  { type: 'notification', data: { title: 'Assignment due soon', urgency: 'medium' } },
];

// Scenario 1: Learning Session WebSocket Testing
export function learningSession() {
  const userId = `learner-${__VU}-${Date.now()}`;
  const sessionId = `session-${__VU}-${Date.now()}`;
  const fileId = `file-${Math.floor(Math.random() * 100)}`;
  
  const url = `${WS_URL}/learning/ws?token=${AUTH_TOKEN}&userId=${userId}&sessionId=${sessionId}&fileId=${fileId}`;
  
  const response = ws.connect(url, { tags: { name: 'learning_session' } }, function (socket) {
    let connected = false;
    let messagesReceived = 0;
    let lastHeartbeat = Date.now();
    
    concurrentConnections.add(1);
    
    socket.on('open', () => {
      connected = true;
      wsConnectRate.add(true);
      
      // Send session start
      socket.send(JSON.stringify({
        type: 'session_start',
        data: {
          userId,
          fileId,
          timestamp: Date.now(),
          userAgent: 'k6-test-client',
        },
      }));
    });
    
    socket.on('error', (e) => {
      wsConnectRate.add(false);
      console.error(`Learning session error: ${e}`);
    });
    
    socket.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        messageRate.add(true);
        totalMessages.add(1);
        messagesReceived++;
        
        // Handle different message types
        switch (message.type) {
          case 'heartbeat_ack':
            wsLatency.add(Date.now() - lastHeartbeat);
            break;
          case 'progress_sync':
            // Acknowledge progress sync
            socket.send(JSON.stringify({
              type: 'progress_ack',
              data: { syncId: message.data.syncId },
            }));
            break;
          case 'ai_content':
            // Process AI-generated content
            if (message.data.content) {
              socket.send(JSON.stringify({
                type: 'content_viewed',
                data: { contentId: message.data.id, timestamp: Date.now() },
              }));
            }
            break;
        }
      } catch (e) {
        messageRate.add(false);
      }
    });
    
    socket.on('close', () => {
      connected = false;
      concurrentConnections.add(-1);
    });
    
    // Simulate learning activity
    socket.setTimeout(() => {
      let activityCounter = 0;
      
      const activityInterval = socket.setInterval(() => {
        if (!connected) return;
        
        activityCounter++;
        
        // Send heartbeat every 30 seconds
        if (activityCounter % 30 === 0) {
          lastHeartbeat = Date.now();
          socket.send(JSON.stringify({
            type: 'heartbeat',
            timestamp: lastHeartbeat,
          }));
        }
        
        // Random learning activity
        if (Math.random() > 0.6) {
          const message = LEARNING_MESSAGES[Math.floor(Math.random() * LEARNING_MESSAGES.length)];
          socket.send(JSON.stringify({
            ...message,
            timestamp: Date.now(),
            userId,
            sessionId,
          }));
        }
        
      }, 1000);
      
      // End session after test duration
      socket.setTimeout(() => {
        if (connected) {
          socket.send(JSON.stringify({
            type: 'session_end',
            data: { reason: 'test_complete', messagesReceived },
          }));
          socket.close();
        }
      }, 180000); // 3 minutes
      
    }, 1000);
  });
  
  check(response, {
    'Learning session connected': (r) => r && r.status === 101,
  });
  
  sleep(1);
}

// Scenario 2: Collaborative Learning Testing
export function collaborativeSession() {
  const userId = `collaborator-${__VU}-${Date.now()}`;
  const roomId = `room-${Math.floor(__VU / 5)}`; // Group users into rooms
  
  const url = `${WS_URL}/collaborate/ws?token=${AUTH_TOKEN}&userId=${userId}&roomId=${roomId}`;
  
  const response = ws.connect(url, { tags: { name: 'collaboration' } }, function (socket) {
    let connected = false;
    let collaborators = [];
    
    socket.on('open', () => {
      connected = true;
      wsConnectRate.add(true);
      
      socket.send(JSON.stringify({
        type: 'join_room',
        data: { userId, roomId, capabilities: ['chat', 'cursor', 'voice'] },
      }));
    });
    
    socket.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        messageRate.add(true);
        totalMessages.add(1);
        
        switch (message.type) {
          case 'room_joined':
            collaborators = message.data.participants || [];
            break;
          case 'user_joined':
            collaborators.push(message.data.user);
            break;
          case 'user_left':
            collaborators = collaborators.filter(u => u.id !== message.data.userId);
            break;
          case 'broadcast':
            if (message.data.senderId !== userId) {
              broadcastLatency.add(Date.now() - message.data.timestamp);
            }
            break;
        }
      } catch (e) {
        messageRate.add(false);
      }
    });
    
    socket.on('close', () => {
      connected = false;
    });
    
    // Simulate collaborative activity
    socket.setTimeout(() => {
      const activityInterval = socket.setInterval(() => {
        if (!connected) return;
        
        // High frequency collaboration messages
        if (Math.random() > 0.4) {
          const message = COLLABORATION_MESSAGES[Math.floor(Math.random() * COLLABORATION_MESSAGES.length)];
          socket.send(JSON.stringify({
            ...message,
            timestamp: Date.now(),
            userId,
            roomId,
          }));
        }
        
      }, 500); // More frequent updates for collaboration
      
      socket.setTimeout(() => {
        if (connected) {
          socket.send(JSON.stringify({
            type: 'leave_room',
            data: { userId, roomId },
          }));
          socket.close();
        }
      }, 240000); // 4 minutes
      
    }, 500);
  });
  
  check(response, {
    'Collaboration session connected': (r) => r && r.status === 101,
  });
}

// Scenario 3: Reconnection Testing
export function reconnectionTest() {
  const userId = `reconnect-${__VU}-${Date.now()}`;
  let reconnectAttempts = 0;
  const maxReconnects = 3;
  
  function attemptConnection() {
    const url = `${WS_URL}/ws?token=${AUTH_TOKEN}&userId=${userId}&reconnect=${reconnectAttempts}`;
    
    const response = ws.connect(url, { tags: { name: 'reconnection_test' } }, function (socket) {
      let connected = false;
      
      socket.on('open', () => {
        connected = true;
        if (reconnectAttempts === 0) {
          wsConnectRate.add(true);
        } else {
          reconnectRate.add(true);
          totalReconnects.add(1);
        }
      });
      
      socket.on('error', (e) => {
        if (reconnectAttempts === 0) {
          wsConnectRate.add(false);
        } else {
          reconnectRate.add(false);
        }
      });
      
      socket.on('close', () => {
        connected = false;
      });
      
      // Force disconnect after random time (simulate network issues)
      socket.setTimeout(() => {
        if (connected) {
          socket.close();
          
          // Attempt reconnection
          if (reconnectAttempts < maxReconnects) {
            reconnectAttempts++;
            sleep(Math.random() * 2 + 1); // Random delay 1-3 seconds
            attemptConnection();
          }
        }
      }, Math.random() * 30000 + 10000); // Random time 10-40 seconds
    });
    
    return response;
  }
  
  const response = attemptConnection();
  check(response, {
    'Initial connection successful': (r) => r && r.status === 101,
  });
}

// Scenario 4: Broadcast Performance Testing
export function broadcastTest() {
  const userId = `broadcaster-${__VU}-${Date.now()}`;
  const isBroadcaster = __VU === 1; // Only first VU broadcasts
  
  const url = `${WS_URL}/broadcast/ws?token=${AUTH_TOKEN}&userId=${userId}&role=${isBroadcaster ? 'sender' : 'receiver'}`;
  
  const response = ws.connect(url, { tags: { name: 'broadcast_test' } }, function (socket) {
    let connected = false;
    let broadcastsSent = 0;
    let broadcastsReceived = 0;
    
    socket.on('open', () => {
      connected = true;
      wsConnectRate.add(true);
    });
    
    socket.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        messageRate.add(true);
        totalMessages.add(1);
        
        if (message.type === 'broadcast' && !isBroadcaster) {
          broadcastsReceived++;
          broadcastLatency.add(Date.now() - message.data.timestamp);
        }
      } catch (e) {
        messageRate.add(false);
      }
    });
    
    if (isBroadcaster) {
      // Send broadcasts every 2 seconds
      socket.setTimeout(() => {
        const broadcastInterval = socket.setInterval(() => {
          if (!connected) return;
          
          socket.send(JSON.stringify({
            type: 'broadcast',
            data: {
              message: `Broadcast ${++broadcastsSent}`,
              timestamp: Date.now(),
              senderId: userId,
            },
          }));
          
        }, 2000);
        
      }, 1000);
    }
    
    socket.setTimeout(() => {
      if (connected) {
        socket.close();
      }
    }, 120000); // 2 minutes
  });
  
  check(response, {
    'Broadcast connection established': (r) => r && r.status === 101,
  });
}

export function teardown() {
  console.log('WebSocket stress test completed');
}