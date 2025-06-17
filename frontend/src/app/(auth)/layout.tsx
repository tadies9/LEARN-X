import Link from 'next/link';
import Image from 'next/image';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-[#0A1628]">
      <Link href="/" className="mb-8">
        <Image
          src="/images/logoo.svg"
          alt="LEARN-X Logo"
          width={120}
          height={40}
          className="h-auto w-auto"
          priority
        />
      </Link>
      <div className="w-full max-w-md space-y-8 px-4">{children}</div>
    </div>
  );
}
