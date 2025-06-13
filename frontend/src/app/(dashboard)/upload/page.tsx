'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  FileText, 
  Image, 
  Video, 
  FileCode,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Brain
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';

export default function UploadPage() {
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      // Simulate file processing
      setIsProcessing(true);
      setProcessingProgress(0);
      
      const newFiles = acceptedFiles.map(file => ({
        id: Math.random().toString(36),
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'processing',
        aiStatus: 'queued'
      }));
      
      setUploadedFiles(prev => [...prev, ...newFiles]);
      
      // Simulate AI processing
      const interval = setInterval(() => {
        setProcessingProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsProcessing(false);
            setUploadedFiles(current => 
              current.map(file => ({
                ...file,
                status: 'completed',
                aiStatus: 'personalized'
              }))
            );
            return 100;
          }
          return prev + 10;
        });
      }, 500);
    },
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc']
    }
  });

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return FileText;
    if (type.includes('image')) return Image;
    if (type.includes('video')) return Video;
    if (type.includes('text')) return FileCode;
    return FileText;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Upload className="h-8 w-8 text-primary" />
          Upload Learning Content
        </h1>
        <p className="text-muted-foreground">
          Upload any document and let our AI transform it into personalized study materials just for you
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upload Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Drag & Drop Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI-Powered Content Upload
              </CardTitle>
              <CardDescription>
                Drop your PDFs, documents, or research papers here. Our AI will analyze and personalize them based on your learning profile.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive 
                    ? 'border-primary bg-primary/5' 
                    : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                {isDragActive ? (
                  <p className="text-lg">Drop your files here...</p>
                ) : (
                  <div>
                    <p className="text-lg mb-2">Drag & drop your learning materials here</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      or click to browse files
                    </p>
                    <Button variant="outline">
                      Choose Files
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Supported Formats */}
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="secondary">PDF</Badge>
                <Badge variant="secondary">DOCX</Badge>
                <Badge variant="secondary">TXT</Badge>
                <Badge variant="secondary">Research Papers</Badge>
                <Badge variant="secondary">Textbooks</Badge>
              </div>
            </CardContent>
          </Card>

          {/* URL Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Import from URL</CardTitle>
              <CardDescription>
                Import content from online articles, research papers, or documentation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="url">Content URL</Label>
                <Input 
                  id="url" 
                  placeholder="https://example.com/article-or-pdf" 
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="title">Custom Title (Optional)</Label>
                <Input 
                  id="title" 
                  placeholder="Give this content a memorable name" 
                  className="mt-1"
                />
              </div>
              <Button className="w-full">
                <Brain className="h-4 w-4 mr-2" />
                Import & Personalize
              </Button>
            </CardContent>
          </Card>

          {/* Processing Status */}
          {isProcessing && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary animate-pulse" />
                  AI Processing Your Content
                </CardTitle>
                <CardDescription>
                  Our AI is analyzing your content and personalizing it based on your learning profile...
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Processing Progress</span>
                    <span>{processingProgress}%</span>
                  </div>
                  <Progress value={processingProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    This usually takes 30-60 seconds depending on document length
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Uploaded Files */}
          {uploadedFiles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Uploads</CardTitle>
                <CardDescription>Your uploaded content and personalization status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {uploadedFiles.map((file) => {
                    const FileIcon = getFileIcon(file.type);
                    return (
                      <div key={file.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <FileIcon className="h-8 w-8 text-primary" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {file.status === 'completed' ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Ready
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Processing
                            </Badge>
                          )}
                          {file.aiStatus === 'personalized' && (
                            <Badge className="bg-blue-100 text-blue-800">
                              <Sparkles className="h-3 w-3 mr-1" />
                              Personalized
                            </Badge>
                          )}
                        </div>
                        {file.status === 'completed' && (
                          <Button size="sm">
                            Start Studying
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* How It Works */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How AI Personalization Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <Upload className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">1. Upload Content</p>
                  <p className="text-xs text-muted-foreground">
                    Upload any PDF, document, or research paper
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
                    Our AI analyzes content using your persona
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
      </div>
    </div>
  );
}