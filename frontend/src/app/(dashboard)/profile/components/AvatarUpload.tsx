import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, User } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface AvatarUploadProps {
  userId: string;
  avatarUrl?: string | null;
  fullName?: string;
  onAvatarChange: (url: string) => void;
}

export function AvatarUpload({ userId, avatarUrl, fullName, onAvatarChange }: AvatarUploadProps) {
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const supabase = createClient();
  const { toast } = useToast();

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !event.target.files[0]) return;

    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`;

    setUploadingAvatar(true);
    try {
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, {
        upsert: true,
      });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(fileName);

      onAvatarChange(publicUrl);

      toast({
        title: 'Avatar uploaded',
        description: 'Your avatar has been uploaded successfully.',
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload avatar. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex items-center gap-6">
      <div className="relative">
        <Avatar className="h-24 w-24">
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback>
            {fullName ? getInitials(fullName) : <User className="h-12 w-12" />}
          </AvatarFallback>
        </Avatar>
        <label
          htmlFor="avatar-upload"
          className="absolute bottom-0 right-0 p-1 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90"
        >
          {uploadingAvatar ? <LoadingSpinner size="sm" /> : <Camera className="h-4 w-4" />}
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
            disabled={uploadingAvatar}
          />
        </label>
      </div>
      <div>
        <h3 className="font-semibold">Profile Picture</h3>
        <p className="text-sm text-muted-foreground">Click the camera icon to upload a new photo</p>
      </div>
    </div>
  );
}
