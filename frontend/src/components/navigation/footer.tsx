import Link from 'next/link';
import { Logo } from '@/components/ui/logo';
import { NewsletterForm } from '@/components/forms/newsletter-form';
import {
  Twitter,
  Linkedin,
  Github,
  Mail,
  Building2,
  GraduationCap,
  BookOpen,
  Shield,
} from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <Logo />
            <p className="text-sm text-muted-foreground">
              Transforming education with AI-powered personalized learning experiences.
            </p>
            <div className="flex space-x-4">
              <Link
                href="https://twitter.com"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Twitter className="h-5 w-5" />
              </Link>
              <Link
                href="https://linkedin.com"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Linkedin className="h-5 w-5" />
              </Link>
              <Link
                href="https://github.com"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Github className="h-5 w-5" />
              </Link>
              <Link
                href="mailto:contact@learn-x.com"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Mail className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h3 className="font-semibold mb-4">Platform</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/features"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="/how-it-works"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  How It Works
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="/integrations"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Integrations
                </Link>
              </li>
              <li>
                <Link
                  href="/api"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  API Documentation
                </Link>
              </li>
            </ul>
          </div>

          {/* Solutions */}
          <div>
            <h3 className="font-semibold mb-4">Solutions</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/solutions/k12"
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                >
                  <GraduationCap className="h-4 w-4" />
                  K-12 Schools
                </Link>
              </li>
              <li>
                <Link
                  href="/solutions/higher-ed"
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                >
                  <Building2 className="h-4 w-4" />
                  Universities
                </Link>
              </li>
              <li>
                <Link
                  href="/solutions/corporate"
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                >
                  <BookOpen className="h-4 w-4" />
                  Corporate Training
                </Link>
              </li>
              <li>
                <Link
                  href="/solutions/tutoring"
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                >
                  <Shield className="h-4 w-4" />
                  Tutoring Centers
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/about"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="/careers"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Careers
                </Link>
              </li>
              <li>
                <Link
                  href="/press"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Press
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="md:col-span-2 lg:col-span-1">
            <NewsletterForm />
          </div>
        </div>

        {/* Compliance Section */}
        <div className="mt-12 pt-8 border-t">
          <div className="flex flex-wrap items-center justify-center gap-8 mb-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4 text-primary" />
              <span>SOC 2 Type II Certified</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4 text-primary" />
              <span>FERPA Compliant</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4 text-primary" />
              <span>GDPR Compliant</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4 text-primary" />
              <span>WCAG AA Verified</span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2025 Learn-X Learning, Inc. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm">
              <Link
                href="/privacy"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Terms
              </Link>
              <Link
                href="/compliance"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Compliance
              </Link>
              <Link
                href="/security"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Security
              </Link>
              <Link
                href="/status"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                System Status
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
