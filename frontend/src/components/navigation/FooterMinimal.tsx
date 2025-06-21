import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';

const footerLinks = {
  Product: [
    { href: '/features', label: 'Features' },
    { href: '/demo', label: 'Demo' },
  ],
  Company: [
    { href: '/about', label: 'About' },
    { href: '/blog', label: 'Blog' },
  ],
  Legal: [
    { href: '/privacy', label: 'Privacy' },
    { href: '/terms', label: 'Terms' },
  ],
  Support: [
    { href: '/help', label: 'Help Center' },
    { href: '/contact', label: 'Contact' },
  ],
};

export function FooterMinimal() {
  return (
    <footer className="border-t">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Logo */}
          <div className="col-span-2 md:col-span-1">
            <Logo showText={false} width={48} height={48} />
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="font-medium mb-4 text-sm">{category}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t">
          <p className="text-sm text-muted-foreground text-center">
            © 2025 LEARN-X. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
