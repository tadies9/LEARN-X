import Link from "next/link";
import Image from "next/image";

import { Twitter, Linkedin, ThumbsDown, Mail } from "lucide-react";

export function MainFooter() {
  return (
    <footer className="w-full border-t bg-black dark:bg-slate-900 py-12">
      <div className="container grid gap-8 md:grid-cols-4">
        <div className="space-y-4">
          <Link href="/" className="inline-block">
            <Image
              src="/images/logoo.svg"
              alt="LEARN-X Logo"
              width={100}
              height={35}
              className="h-auto w-auto"
            />
          </Link>
          <p className="text-sm text-slate-400">
            Transforming education with AI-powered personalized learning experiences.
          </p>
          <div className="flex space-x-4">
            <Link
              href="#"
              className="text-slate-400 hover:text-slate-200"
              aria-label="Twitter"
            >
              <Twitter className="h-5 w-5" />
              <span className="sr-only">Twitter</span>
            </Link>
            <Link
              href="#"
              className="text-slate-400 hover:text-slate-200"
              aria-label="LinkedIn"
            >
              <Linkedin className="h-5 w-5" />
              <span className="sr-only">LinkedIn</span>
            </Link>
            <Link
              href="#"
              className="text-slate-400 hover:text-slate-200"
              aria-label="Discord"
            >
              <ThumbsDown className="h-5 w-5" />
              <span className="sr-only">Discord</span>
            </Link>
            <Link
              href="#"
              className="text-slate-400 hover:text-slate-200"
              aria-label="Email"
            >
              <Mail className="h-5 w-5" />
              <span className="sr-only">Email</span>
            </Link>
          </div>
        </div>
        <FooterSection
          title="PLATFORM"
          links={[
            { href: "/features", label: "Features" },
            { href: "/how-it-works", label: "How It Works" },
            { href: "/for-students", label: "For Students" },
            { href: "/for-educators", label: "For Educators" },
            { href: "/resources", label: "Resources" },
          ]}
        />
        <FooterSection
          title="COMPANY"
          links={[
            { href: "/about", label: "About" },
            { href: "/blog", label: "Blog" },
            { href: "/careers", label: "Careers" },
            { href: "/press", label: "Press" },
            { href: "/contact", label: "Contact" },
          ]}
        />
        <FooterSection
          title="LEGAL"
          links={[
            { href: "/terms", label: "Terms" },
            { href: "/privacy", label: "Privacy" },
            { href: "/cookies", label: "Cookies" },
            { href: "/licenses", label: "Licenses" },
            { href: "/accessibility", label: "Accessibility" },
          ]}
        />
      </div>
      <div className="container mt-8 border-t border-gray-200 dark:border-gray-800 pt-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-xs text-slate-400">
            © 2025 Learn-X Learning, Inc. All rights reserved.
          </p>
          <div className="mt-4 md:mt-0 text-xs text-slate-400">
            <p>
              FERPA-compliant. GDPR-ready.{" "}
              <Link href="/security" className="underline hover:text-slate-200">
                Security details
              </Link>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

interface FooterSectionProps {
  title: string;
  links: Array<{ href: string; label: string }>;
}

function FooterSection({ title, links }: FooterSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium uppercase tracking-wider text-slate-200">{title}</h3>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-slate-400 hover:text-slate-200"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}