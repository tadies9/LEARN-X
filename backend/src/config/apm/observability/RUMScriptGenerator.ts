import { RUMConfiguration } from './types/observability.types';

export class RUMScriptGenerator {
  static generateScript(config: RUMConfiguration): string {
    return `
(function() {
  if (!window.LearnXRUM) {
    window.LearnXRUM = {
      config: ${JSON.stringify({
        enabled: config.enabled,
        sampleRate: config.sampleRate,
        trackingEndpoint: config.trackingEndpoint,
        errorReporting: config.errorReporting,
        performanceTracking: config.performanceTracking,
      })},
      
      sessionId: null,
      userId: null,
      
      init: function(options) {
        if (!this.config.enabled) return;
        
        this.sessionId = this.generateSessionId();
        this.userId = options.userId;
        
        this.startSession();
        this.setupErrorTracking();
        this.setupPerformanceTracking();
        this.setupPageTracking();
      },
      
      startSession: function() {
        this.sendEvent('session_start', {
          sessionId: this.sessionId,
          userId: this.userId,
          userAgent: navigator.userAgent,
          url: window.location.href,
          referrer: document.referrer,
          timestamp: Date.now()
        });
      },
      
      trackPageView: function(pageData) {
        if (!this.config.enabled) return;
        
        this.sendEvent('page_view', {
          sessionId: this.sessionId,
          userId: this.userId,
          ...pageData,
          timestamp: Date.now()
        });
      },
      
      trackApiCall: function(callData) {
        if (!this.config.enabled) return;
        
        this.sendEvent('api_call', {
          sessionId: this.sessionId,
          userId: this.userId,
          ...callData,
          timestamp: Date.now()
        });
      },
      
      trackError: function(error) {
        if (!this.config.enabled || !this.config.errorReporting) return;
        
        this.sendEvent('error', {
          sessionId: this.sessionId,
          userId: this.userId,
          message: error.message,
          stack: error.stack,
          source: 'frontend',
          severity: 'medium',
          context: {
            url: window.location.href,
            userAgent: navigator.userAgent
          },
          timestamp: Date.now()
        });
      },
      
      trackCustomEvent: function(eventName, properties) {
        if (!this.config.enabled) return;
        
        this.sendEvent('custom_event', {
          sessionId: this.sessionId,
          userId: this.userId,
          eventName: eventName,
          properties: properties,
          timestamp: Date.now()
        });
      },
      
      setupErrorTracking: function() {
        if (!this.config.errorReporting) return;
        
        window.addEventListener('error', (event) => {
          this.trackError(event.error);
        });
        
        window.addEventListener('unhandledrejection', (event) => {
          this.trackError(new Error(event.reason));
        });
      },
      
      setupPerformanceTracking: function() {
        if (!this.config.performanceTracking) return;
        
        window.addEventListener('load', () => {
          setTimeout(() => {
            const navigation = performance.getEntriesByType('navigation')[0];
            const paint = performance.getEntriesByType('paint');
            
            this.sendEvent('performance', {
              sessionId: this.sessionId,
              userId: this.userId,
              vitals: {
                ttfb: navigation.responseStart - navigation.requestStart,
                fcp: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
                loadTime: navigation.loadEventEnd - navigation.loadEventStart
              },
              timestamp: Date.now()
            });
          }, 1000);
        });
      },
      
      setupPageTracking: function() {
        // Track initial page load
        this.trackPageView({
          pageId: this.generatePageId(),
          url: window.location.href,
          title: document.title,
          loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart
        });
        
        // Track SPA navigation
        let lastUrl = window.location.href;
        new MutationObserver(() => {
          if (window.location.href !== lastUrl) {
            lastUrl = window.location.href;
            this.trackPageView({
              pageId: this.generatePageId(),
              url: window.location.href,
              title: document.title,
              loadTime: 0 // SPA navigation
            });
          }
        }).observe(document, { subtree: true, childList: true });
      },
      
      sendEvent: function(eventType, data) {
        if (Math.random() > this.config.sampleRate) return;
        
        fetch(this.config.trackingEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: eventType,
            data: data
          })
        }).catch(error => {
          console.warn('RUM tracking failed:', error);
        });
      },
      
      generateSessionId: function() {
        return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      },
      
      generatePageId: function() {
        return 'page_' + Math.random().toString(36).substr(2, 9);
      }
    };
  }
})();`;
  }
}