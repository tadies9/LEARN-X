'use client';

import { useRef, useEffect, useCallback } from 'react';

interface SyncedScrollingOptions {
  onPageChange?: (page: number) => void;
  onSectionHighlight?: (sectionId: string) => void;
}

export function useSyncedScrolling(options: SyncedScrollingOptions = {}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const personalizedRef = useRef<HTMLDivElement>(null);
  const isScrollingSynced = useRef(false);
  const scrollTimeout = useRef<NodeJS.Timeout>();

  // Sync scroll from content viewer to personalized panel
  const syncContentToPersonalized = useCallback((scrollTop: number, pageHeight: number) => {
    if (!personalizedRef.current || isScrollingSynced.current) return;
    
    isScrollingSynced.current = true;
    
    // Calculate relative position
    const relativePosition = scrollTop / (contentRef.current?.scrollHeight || 1);
    const targetScrollTop = relativePosition * (personalizedRef.current.scrollHeight || 0);
    
    personalizedRef.current.scrollTop = targetScrollTop;
    
    // Calculate current page based on scroll position
    if (pageHeight > 0) {
      const currentPage = Math.floor(scrollTop / pageHeight) + 1;
      options.onPageChange?.(currentPage);
    }
    
    // Reset sync flag after a short delay
    clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      isScrollingSynced.current = false;
    }, 100);
  }, [options.onPageChange]);

  // Sync scroll from personalized panel to content viewer
  const syncPersonalizedToContent = useCallback((scrollTop: number) => {
    if (!contentRef.current || isScrollingSynced.current) return;
    
    isScrollingSynced.current = true;
    
    // Calculate relative position
    const relativePosition = scrollTop / (personalizedRef.current?.scrollHeight || 1);
    const targetScrollTop = relativePosition * (contentRef.current.scrollHeight || 0);
    
    contentRef.current.scrollTop = targetScrollTop;
    
    // Reset sync flag after a short delay
    clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      isScrollingSynced.current = false;
    }, 100);
  }, []);

  // Handle content scroll events
  const handleContentScroll = useCallback((event: Event) => {
    const target = event.target as HTMLDivElement;
    if (target && !isScrollingSynced.current) {
      const pageHeight = target.clientHeight; // Approximate page height
      syncContentToPersonalized(target.scrollTop, pageHeight);
    }
  }, [syncContentToPersonalized]);

  // Handle personalized panel scroll events
  const handlePersonalizedScroll = useCallback((event: Event) => {
    const target = event.target as HTMLDivElement;
    if (target && !isScrollingSynced.current) {
      syncPersonalizedToContent(target.scrollTop);
    }
  }, [syncPersonalizedToContent]);

  // Set up scroll listeners
  useEffect(() => {
    const contentElement = contentRef.current;
    const personalizedElement = personalizedRef.current;

    if (contentElement) {
      contentElement.addEventListener('scroll', handleContentScroll, { passive: true });
    }

    if (personalizedElement) {
      personalizedElement.addEventListener('scroll', handlePersonalizedScroll, { passive: true });
    }

    return () => {
      if (contentElement) {
        contentElement.removeEventListener('scroll', handleContentScroll);
      }
      if (personalizedElement) {
        personalizedElement.removeEventListener('scroll', handlePersonalizedScroll);
      }
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, [handleContentScroll, handlePersonalizedScroll]);

  // Scroll to specific section
  const scrollToSection = useCallback((sectionId: string) => {
    // Find the section element in the personalized panel
    const sectionElement = personalizedRef.current?.querySelector(`[data-section-id="${sectionId}"]`);
    if (sectionElement && personalizedRef.current) {
      const offsetTop = (sectionElement as HTMLElement).offsetTop;
      personalizedRef.current.scrollTop = offsetTop;
      options.onSectionHighlight?.(sectionId);
    }
  }, [options.onSectionHighlight]);

  // Scroll to specific page
  const scrollToPage = useCallback((page: number, pageHeight: number = 800) => {
    if (contentRef.current) {
      const targetScrollTop = (page - 1) * pageHeight;
      contentRef.current.scrollTop = targetScrollTop;
    }
  }, []);

  return {
    contentRef,
    personalizedRef,
    scrollToSection,
    scrollToPage,
  };
}