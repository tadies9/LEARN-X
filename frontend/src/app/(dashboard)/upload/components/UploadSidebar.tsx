import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Brain, Sparkles } from 'lucide-react';

export function UploadSidebar() {
  return (
    <div className="space-y-6">
      {/* How it Works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How It Works</CardTitle>
          <CardDescription>
            Our AI-powered workflow transforms your content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">1. Upload</p>
              <p className="text-xs text-muted-foreground">
                Drop any PDF, document, or research paper
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">2. AI Analysis</p>
              <p className="text-xs text-muted-foreground">
                Content extracted, summarized & structured
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">3. Personalization</p>
              <p className="text-xs text-muted-foreground">
                Content transformed with your interests & style
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Upload Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span className="text-sm">Documents Processed</span>
            <span className="text-sm font-medium">23</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">Total Pages</span>
            <span className="text-sm font-medium">2,847</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">Study Materials Created</span>
            <span className="text-sm font-medium">156</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">Time Saved</span>
            <span className="text-sm font-medium">47 hours</span>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">💡 Pro Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>• Upload research papers for personalized summaries</p>
          <p>• Course materials become interactive study guides</p>
          <p>• The more specific your persona, the better the personalization</p>
          <p>• Try uploading content in your native language</p>
        </CardContent>
      </Card>
    </div>
  );
}