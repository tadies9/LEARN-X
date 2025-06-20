'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Loader2,
  Sparkles,
  Scissors,
  BookOpen,
  Brain,
  ClipboardList,
  X,
  Download,
  Share2,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useState } from 'react';

interface StudyDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeJobs: Map<string, any>;
  completedContent: Map<string, any>;
  isGenerating: boolean;
}

export function StudyDrawer({
  open,
  onOpenChange,
  activeJobs,
  completedContent,
  isGenerating,
}: StudyDrawerProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('flashcards');

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: 'Copied to clipboard',
      description: 'Content has been copied to your clipboard.',
    });
  };

  const handleDownload = (content: any, type: string) => {
    // Create a blob and download
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `study-${type}-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Group content by type
  const flashcards = Array.from(completedContent.values())
    .filter((item) => item.action === 'flashcards')
    .flatMap((item) => item.content.flashcards || []);

  const summaries = Array.from(completedContent.values())
    .filter((item) => item.action === 'summary')
    .map((item) => ({
      fileName: item.fileName,
      summary: item.content.summary,
    }));

  const bulkContent = Array.from(completedContent.values()).filter(
    (item) => item.action === 'bulk'
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[600px] sm:max-w-[600px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Study Materials
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="flashcards" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Flashcards
                {flashcards.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {flashcards.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="summaries" className="flex items-center gap-2">
                <Scissors className="h-4 w-4" />
                Summaries
                {summaries.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {summaries.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="active" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Active
                {activeJobs.size > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {activeJobs.size}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[calc(100vh-200px)] mt-6">
              {/* Flashcards Tab */}
              <TabsContent value="flashcards" className="space-y-4">
                {flashcards.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No flashcards generated yet.</p>
                    <p className="text-sm mt-1">
                      Click the flashcard button on any file to generate.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload({ flashcards }, 'flashcards')}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download All
                      </Button>
                    </div>
                    {flashcards.map((card, index) => (
                      <Card
                        key={index}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                      >
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Question</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="mb-4">{card.question}</p>
                          <Separator className="my-3" />
                          <p className="text-sm text-muted-foreground">Answer</p>
                          <p className="mt-1">{card.answer}</p>
                          <div className="flex justify-end mt-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopy(`Q: ${card.question}\nA: ${card.answer}`)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Summaries Tab */}
              <TabsContent value="summaries" className="space-y-4">
                {summaries.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Scissors className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No summaries generated yet.</p>
                    <p className="text-sm mt-1">
                      Click the summary button on any file to generate.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {summaries.map((item, index) => (
                      <Card key={index}>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center justify-between">
                            {item.fileName}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopy(item.summary)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="prose prose-sm max-w-none">{item.summary}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Active Jobs Tab */}
              <TabsContent value="active" className="space-y-4">
                {activeJobs.size === 0 && !isGenerating ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50 text-green-600" />
                    <p>All jobs completed!</p>
                    <p className="text-sm mt-1">Check the other tabs for your generated content.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Array.from(activeJobs.entries()).map(([jobId, job]) => (
                      <Card key={jobId} className="relative">
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-3">
                            <Loader2 className="h-5 w-5 animate-spin text-primary mt-0.5" />
                            <div className="flex-1">
                              <p className="font-medium">
                                {job.action === 'bulk'
                                  ? `Generating study pack for ${job.fileIds.length} files`
                                  : `Generating ${job.action} for ${job.fileName}`}
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">
                                Started {new Date(job.startedAt).toLocaleTimeString()}
                              </p>
                              <div className="mt-3">
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary animate-pulse"
                                    style={{ width: '60%' }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
