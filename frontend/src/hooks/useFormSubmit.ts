import { useState } from 'react';
import { toast } from 'sonner';

interface UseFormSubmitOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
}

interface UseFormSubmitReturn<T> {
  submit: (submitFunction: () => Promise<T>) => Promise<void>;
  isSubmitting: boolean;
  error: Error | null;
}

export function useFormSubmit<T>(
  options: UseFormSubmitOptions<T> = {}
): UseFormSubmitReturn<T> {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const {
    onSuccess,
    onError,
    showSuccessToast = true,
    showErrorToast = true,
    successMessage = 'Form submitted successfully',
  } = options;

  const submit = async (submitFunction: () => Promise<T>) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const result = await submitFunction();

      if (showSuccessToast) {
        toast.success(successMessage);
      }

      onSuccess?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An error occurred');
      setError(error);

      if (showErrorToast) {
        toast.error(error.message || 'An error occurred');
      }

      onError?.(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submit,
    isSubmitting,
    error,
  };
}