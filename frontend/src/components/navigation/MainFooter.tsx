import Link from "next/link";

import { Twitter, Linkedin, ThumbsDown, Mail } from "lucide-react";

export function MainFooter() {
  return (
    <footer className="w-full border-t bg-background py-12">
      <div className="container grid gap-8 md:grid-cols-4">
        <div className="space-y-4">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            LEARN-X
          </Link>
          <p className="text-sm text-muted-foreground">
            Transforming education with AI-powered personalized learning experiences.
          </p>
          <div className="flex space-x-4">
            <Link
              href="#"
              className="text-muted-foreground hover:text-foreground"
              aria-label="Twitter"
            >
              <Twitter className="h-5 w-5" />
              <span className="sr-only">Twitter</span>
            </Link>
            <Link
              href="#"
              className="text-muted-foreground hover:text-foreground"
              aria-label="LinkedIn"
            >
              <Linkedin className="h-5 w-5" />
              <span className="sr-only">LinkedIn</span>
            </Link>
            <Link
              href="#"
              className="text-muted-foreground hover:text-foreground"
              aria-label="Discord"
            >
              <ThumbsDown className="h-5 w-5" />
              <span className="sr-only">Discord</span>
            </Link>
            <Link
              href="#"
              className="text-muted-foreground hover:text-foreground"
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
      <div className="container mt-8 border-t pt-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-xs text-muted-foreground">
            © 2025 Learn-X Learning, Inc. All rights reserved.
          </p>
          <div className="mt-4 md:mt-0 text-xs text-muted-foreground">
            <p>
              FERPA-compliant. GDPR-ready.{" "}
              <Link href="/security" className="underline">
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
      <h3 className="text-sm font-medium uppercase tracking-wider">{title}</h3>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}