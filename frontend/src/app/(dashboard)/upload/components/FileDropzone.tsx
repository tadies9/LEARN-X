import { useDropzone } from 'react-dropzone';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Sparkles } from 'lucide-react';

interface FileDropzoneProps {
  onDrop: (acceptedFiles: File[]) => void;
}

export function FileDropzone({ onDrop }: FileDropzoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI-Powered Content Upload
        </CardTitle>
        <CardDescription>
          Drop your PDFs, documents, or research papers here. Our AI will analyze and personalize
          them based on your learning profile.
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
              <p className="text-sm text-muted-foreground mb-4">or click to browse files</p>
              <Button variant="outline">Choose Files</Button>
            </div>
          )}
        </div>

        <div className="mt-4 text-xs text-muted-foreground">
          <p>Supported formats: PDF, DOCX, TXT, MD • Max file size: 50MB</p>
        </div>
      </CardContent>
    </Card>
  );
}
