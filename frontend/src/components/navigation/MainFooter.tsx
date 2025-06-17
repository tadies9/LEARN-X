import Link from "next/link";
import Image from "next/image";

import { Linkedin, Mail, Instagram } from "lucide-react";

export function MainFooter() {
  return (
    <footer className="w-full border-t bg-black dark:bg-slate-900 py-8">
      <div className="container">
        {/* Top row: Logo and primary actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <Link href="/" className="inline-block mb-4 md:mb-0">
            <Image
              src="/images/logoo.svg"
              alt="LEARN-X Logo"
              width={100}
              height={35}
              className="h-auto w-auto"
            />
          </Link>
          
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-slate-400 hover:text-slate-200"
            >
              Login
            </Link>
            <span className="text-slate-600">|</span>
            <Link
              href="/register"
              className="text-sm text-slate-400 hover:text-slate-200"
            >
              Get Started
            </Link>
          </div>
        </div>
        
        {/* Bottom row: Copyright, legal links, and social */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-4 md:mb-0">
            <span>© 2025 Learn-X</span>
            <span className="text-slate-600">·</span>
            <Link href="/terms" className="hover:text-slate-200">Terms</Link>
            <span className="text-slate-600">·</span>
            <Link href="/privacy" className="hover:text-slate-200">Privacy</Link>
            <span className="text-slate-600">·</span>
            <Link href="/contact" className="hover:text-slate-200">Contact</Link>
          </div>
          
          {/* Social icons */}
          <div className="flex items-center gap-3">
            <Link
              href="https://x.com/LEARN__X"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-slate-200 transition-colors"
              aria-label="X (formerly Twitter)"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </Link>
            <Link
              href="https://www.linkedin.com/company/learn-x1/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-slate-200 transition-colors"
              aria-label="LinkedIn"
            >
              <Linkedin className="h-4 w-4" />
            </Link>
            <Link
              href="https://www.instagram.com/learn___x"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-slate-200 transition-colors"
              aria-label="Instagram"
            >
              <Instagram className="h-4 w-4" />
            </Link>
            <Link
              href="mailto:tadiwa@learn-x.co"
              className="text-slate-400 hover:text-slate-200 transition-colors"
              aria-label="Email"
            >
              <Mail className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}