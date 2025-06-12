import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  showText?: boolean;
  width?: number;
  height?: number;
}

export function Logo({ className, showText = true, width = 40, height = 40 }: LogoProps) {
  return (
    <Link href="/" className={cn('flex items-center space-x-2', className)}>
      <Image
        src="/images/logo-optimized.svg"
        alt="LEARN-X Logo"
        width={width}
        height={height}
        className="object-contain"
        priority
        unoptimized // For SVGs, Next.js Image optimization can be skipped
      />
      {showText && <span className="font-display text-2xl font-bold text-primary">LEARN-X</span>}
    </Link>
  );
}
