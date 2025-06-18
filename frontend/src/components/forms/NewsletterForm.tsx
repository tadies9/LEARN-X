'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Mail, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const newsletterSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type NewsletterFormData = z.infer<typeof newsletterSchema>;

export function NewsletterForm() {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewsletterFormData>({
    resolver: zodResolver(newsletterSchema),
  });

  const onSubmit = async (_data: NewsletterFormData) => {
    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast.success('Successfully subscribed to our newsletter!');
    reset();
    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div>
        <h3 className="font-semibold mb-2">Stay Updated</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Get the latest updates on AI in education
        </p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            {...register('email')}
            type="email"
            placeholder="Enter your email"
            className="pl-10"
            disabled={isLoading}
          />
        </div>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Subscribe'}
        </Button>
      </div>

      {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}

      <p className="text-xs text-muted-foreground">
        By subscribing, you agree to our Privacy Policy and consent to receive updates.
      </p>
    </form>
  );
}
