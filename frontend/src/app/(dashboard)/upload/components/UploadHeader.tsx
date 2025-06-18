import { Upload } from 'lucide-react';

export function UploadHeader() {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
        <Upload className="h-8 w-8 text-primary" />
        Upload Learning Content
      </h1>
      <p className="text-muted-foreground">
        Upload any document and let our AI transform it into personalized study materials just for
        you
      </p>
    </div>
  );
}
