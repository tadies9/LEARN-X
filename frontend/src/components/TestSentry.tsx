'use client';

import { useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Button } from '@/components/ui/button';

export function TestSentry() {
  const [message, setMessage] = useState<string>('');

  const testSentryError = () => {
    setMessage('Sending test error to Sentry...');
    
    // Create error with context
    const error = new Error('Test error from LEARN-X Frontend');
    
    Sentry.withScope((scope) => {
      scope.setTag('test', true);
      scope.setLevel('error');
      scope.setContext('test_details', {
        component: 'TestSentry',
        timestamp: new Date().toISOString(),
        userAction: 'clicked test button'
      });
      
      Sentry.captureException(error);
    });
    
    setMessage('Test error sent! Check your Sentry dashboard.');
  };

  const testUnhandledError = () => {
    throw new Error('Unhandled test error from LEARN-X Frontend');
  };

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
      <h3 className="text-lg font-semibold mb-2">Sentry Test (Dev Only)</h3>
      <div className="space-y-2">
        <Button 
          onClick={testSentryError}
          variant="outline"
          size="sm"
        >
          Send Test Error to Sentry
        </Button>
        <Button 
          onClick={testUnhandledError}
          variant="outline"
          size="sm"
          className="ml-2"
        >
          Trigger Unhandled Error
        </Button>
      </div>
      {message && (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {message}
        </p>
      )}
    </div>
  );
}