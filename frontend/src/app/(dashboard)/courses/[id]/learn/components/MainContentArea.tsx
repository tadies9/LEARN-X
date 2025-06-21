'use client';

import { useRef } from 'react';
import {
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  Meh,
  Save,
  Download,
  RefreshCw,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { Topic, ReactionType } from '../types/study';

interface MainContentAreaProps {
  selectedTopic: string | null;
  selectedSubtopic: string | null;
  outline: Topic[];
  streamingContent: string;
  isStreaming: boolean;
  quickNote: string;
  reaction: ReactionType | null;
  onQuickNoteChange: (note: string) => void;
  onReaction: (reaction: ReactionType) => void;
  onSaveContent: () => void;
  onRegenerate: () => void;
}

export function MainContentArea({
  selectedTopic,
  selectedSubtopic,
  outline,
  streamingContent,
  isStreaming,
  quickNote,
  reaction,
  onQuickNoteChange,
  onReaction,
  onSaveContent,
  onRegenerate,
}: MainContentAreaProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const getTopicInfo = () => {
    if (!selectedTopic || !selectedSubtopic) return null;
    const topic = outline.find((t) => t.id === selectedTopic);
    if (!topic) return null;
    const subtopic = topic.subtopics.find((st) => st.id === selectedSubtopic);
    return { topic, subtopic };
  };

  const topicInfo = getTopicInfo();

  return (
    <div className="flex-1 flex flex-col">
      {/* Content Header */}
      {topicInfo && (
        <div className="border-b px-6 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{topicInfo.topic.title}</h3>
              <p className="text-sm text-muted-foreground capitalize">
                {topicInfo.subtopic?.title}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                title="Save for Later"
                onClick={onSaveContent}
                disabled={!streamingContent || isStreaming}
              >
                <Save className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" title="Download">
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="Regenerate"
                onClick={onRegenerate}
                disabled={isStreaming}
              >
                <RefreshCw className={cn('h-4 w-4', isStreaming && 'animate-spin')} />
              </Button>
              <Button variant="ghost" size="icon" title="Settings">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Content Body */}
      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto p-6"
        key={`${selectedTopic}-${selectedSubtopic}`}
      >
        {!selectedTopic || !selectedSubtopic ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Select a topic from the outline to begin learning</p>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {/* Streaming Content */}
            <div className="prose prose-lg max-w-none dark:prose-invert">
              {isStreaming && streamingContent ? (
                <div>
                  <div
                    dangerouslySetInnerHTML={{ __html: streamingContent }}
                    className="[&_div[style*='background-color']]:p-4 [&_div[style*='background-color']]:rounded-lg [&_div[style*='background-color']]:my-4 [&_details]:border [&_details]:p-4 [&_details]:rounded-lg [&_details]:my-2"
                  />
                  <div className="flex items-center gap-2 text-muted-foreground mt-4">
                    <div className="animate-pulse rounded-full h-2 w-2 bg-primary"></div>
                    <span className="text-sm">Generating more content...</span>
                  </div>
                </div>
              ) : streamingContent ? (
                <div
                  dangerouslySetInnerHTML={{ __html: streamingContent }}
                  className="[&_div[style*='background-color']]:p-4 [&_div[style*='background-color']]:rounded-lg [&_div[style*='background-color']]:my-4 [&_details]:border [&_details]:p-4 [&_details]:rounded-lg [&_details]:my-2"
                />
              ) : isStreaming ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span>Loading personalized content...</span>
                </div>
              ) : (
                <p className="text-muted-foreground">Content will appear here...</p>
              )}
            </div>

            {/* Quick Note */}
            {streamingContent && (
              <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Quick Note
                </h4>
                <textarea
                  value={quickNote}
                  onChange={(e) => onQuickNoteChange(e.target.value)}
                  placeholder="Jot down your thoughts..."
                  className="w-full h-20 p-2 border rounded-md resize-none"
                />
              </div>
            )}

            {/* Reaction Buttons */}
            {streamingContent && !isStreaming && (
              <div className="mt-6 flex items-center justify-center gap-4">
                <span className="text-sm text-muted-foreground">Was this helpful?</span>
                <div className="flex gap-2">
                  <Button
                    variant={reaction === 'positive' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onReaction('positive')}
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={reaction === 'neutral' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onReaction('neutral')}
                  >
                    <Meh className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={reaction === 'negative' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onReaction('negative')}
                  >
                    <ThumbsDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
