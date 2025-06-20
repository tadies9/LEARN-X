'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function TestExplain() {
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const testExplain = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setResponse('Not authenticated');
        return;
      }

      const url = 'http://localhost:8080/api/v1/learn/explain/stream';
      console.log('Testing URL:', url);
      
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          fileId: '9c908e3b-a832-45cc-8b8c-baa1d93600ec',
          topicId: 'Test Topic',
          mode: 'explain'
        }),
      });

      console.log('Response status:', res.status);
      
      if (!res.ok) {
        const text = await res.text();
        setResponse(`Error ${res.status}: ${text}`);
      } else {
        setResponse('Success! Reading stream...\n\n');
        
        // Read stream
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';
        
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            console.log('Stream chunk:', chunk);
            fullResponse += chunk;
            setResponse(prev => prev + chunk);
          }
          
          console.log('Full stream response:', fullResponse);
        }
      }
    } catch (error) {
      setResponse(`Error: ${error}`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Test Explain Endpoint</h1>
      <button onClick={testExplain} disabled={loading}>
        {loading ? 'Testing...' : 'Test Explain API'}
      </button>
      <pre>{response}</pre>
    </div>
  );
}