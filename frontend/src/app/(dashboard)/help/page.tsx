'use client';

// Disable static generation for this page
export const dynamic = 'force-dynamic';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { HelpCircle, Search, MessageSquare, Book, Video, Mail, Phone } from 'lucide-react';

export default function HelpPage() {
  const faqs = [
    {
      id: 1,
      question: 'How do I enroll in a course?',
      answer:
        'To enroll in a course, navigate to the Courses page, find the course you want, and click the "Enroll" button.',
      category: 'Courses',
    },
    {
      id: 2,
      question: 'Can I download course materials?',
      answer:
        'Yes, you can download most course materials including PDFs, slides, and code files from the module pages.',
      category: 'Content',
    },
    {
      id: 3,
      question: 'How do I track my learning progress?',
      answer:
        'Your progress is automatically tracked and can be viewed on your Dashboard and in the Analytics section.',
      category: 'Progress',
    },
    {
      id: 4,
      question: 'What payment methods do you accept?',
      answer:
        'We accept all major credit cards, PayPal, and bank transfers for premium subscriptions.',
      category: 'Billing',
    },
    {
      id: 5,
      question: 'How do I reset my password?',
      answer:
        'Click on "Forgot Password" on the login page and follow the email instructions to reset your password.',
      category: 'Account',
    },
  ];

  const categories = ['All', 'Courses', 'Content', 'Progress', 'Billing', 'Account'];

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <HelpCircle className="h-8 w-8 text-primary" />
          Help & Support
        </h1>
        <p className="text-muted-foreground">
          Find answers to common questions or get in touch with our support team
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search help articles..." className="pl-10" />
              </div>
            </CardContent>
          </Card>

          {/* FAQ Categories */}
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
              <CardDescription>Quick answers to common questions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-6">
                {categories.map((category) => (
                  <Badge
                    key={category}
                    variant={category === 'All' ? 'default' : 'secondary'}
                    className="cursor-pointer hover:bg-primary/80"
                  >
                    {category}
                  </Badge>
                ))}
              </div>

              <div className="space-y-4">
                {faqs.map((faq) => (
                  <div key={faq.id} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium">{faq.question}</h3>
                      <Badge variant="outline" className="text-xs">
                        {faq.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Contact Form */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Support</CardTitle>
              <CardDescription>
                Can't find what you're looking for? Send us a message
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input placeholder="Your name" />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input placeholder="your.email@example.com" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Subject</label>
                <Input placeholder="How can we help you?" />
              </div>
              <div>
                <label className="text-sm font-medium">Message</label>
                <Textarea placeholder="Describe your issue or question in detail..." rows={4} />
              </div>
              <Button>
                <MessageSquare className="h-4 w-4 mr-2" />
                Send Message
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Book className="h-4 w-4 mr-2" />
                User Guide
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Video className="h-4 w-4 mr-2" />
                Video Tutorials
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <MessageSquare className="h-4 w-4 mr-2" />
                Community Forum
              </Button>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Get in Touch</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Email Support</p>
                  <p className="text-sm text-muted-foreground">support@learn-x.com</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Phone Support</p>
                  <p className="text-sm text-muted-foreground">1-800-LEARN-X</p>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <p className="font-medium">Business Hours:</p>
                <p>Monday - Friday: 9AM - 6PM EST</p>
                <p>Saturday: 10AM - 4PM EST</p>
              </div>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm">All systems operational</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Last checked: Just now</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
