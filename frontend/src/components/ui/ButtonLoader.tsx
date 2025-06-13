import { LoadingSpinner } from './LoadingSpinner';

interface ButtonLoaderProps {
  loading: boolean;
  children: React.ReactNode;
  loadingText?: string;
}

export function ButtonLoader({ loading, children, loadingText }: ButtonLoaderProps) {
  if (loading) {
    return (
      <>
        <LoadingSpinner size="sm" className="mr-2" />
        {loadingText || 'Loading...'}
      </>
    );
  }

  return <>{children}</>;
}
