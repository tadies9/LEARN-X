'use client';

import { ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Topic } from '../types/study';

interface SidebarPanelProps {
  outline: Topic[];
  selectedTopic: string | null;
  selectedSubtopic: string | null;
  expandedTopics: Set<string>;
  isLoadingOutline: boolean;
  onToggleTopic: (topicId: string) => void;
  onSelectSubtopic: (topicId: string, subtopicId: string) => void;
}

export function SidebarPanel({
  outline,
  selectedTopic,
  selectedSubtopic,
  expandedTopics,
  isLoadingOutline,
  onToggleTopic,
  onSelectSubtopic,
}: SidebarPanelProps) {
  return (
    <div className="border-r bg-gray-50 overflow-y-auto w-[25%]">
      <div className="p-4">
        <h2 className="font-semibold mb-4">Outline</h2>

        {/* Topics */}
        <div className="space-y-2">
          {outline.map((topic) => (
            <div key={topic.id} className="rounded-lg bg-white border">
              <button
                onClick={() => onToggleTopic(topic.id)}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-sm">{topic.title}</span>
                {expandedTopics.has(topic.id) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>

              {/* Subtopics */}
              {expandedTopics.has(topic.id) && (
                <div className="border-t">
                  {topic.subtopics.map((subtopic) => (
                    <button
                      key={subtopic.id}
                      onClick={() => onSelectSubtopic(topic.id, subtopic.id)}
                      className={cn(
                        'w-full px-6 py-2 text-left text-sm hover:bg-gray-50 transition-colors flex items-center justify-between',
                        selectedTopic === topic.id &&
                          selectedSubtopic === subtopic.id &&
                          'bg-primary/10 text-primary'
                      )}
                    >
                      <span className="capitalize">{subtopic.title}</span>
                      {subtopic.completed && <span className="text-green-600">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Loading more topics indicator */}
        {isLoadingOutline && (
          <div className="mt-4 text-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mx-auto"></div>
            <p className="text-xs text-muted-foreground mt-2">Loading more topics...</p>
          </div>
        )}
      </div>
    </div>
  );
}
