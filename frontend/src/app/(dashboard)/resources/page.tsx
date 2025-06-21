'use client';

import {
  FileText,
  Download,
  ExternalLink,
  Search,
  Filter,
  BookOpen,
  Video,
  FileCode,
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

export default function ResourcesPage() {
  const resources = [
    {
      id: 1,
      title: 'React Documentation',
      description: 'Official React documentation and guides',
      type: 'Documentation',
      category: 'React',
      url: 'https://react.dev',
      icon: BookOpen,
      downloads: 0,
    },
    {
      id: 2,
      title: 'JavaScript Cheat Sheet',
      description: 'Quick reference for JavaScript syntax and methods',
      type: 'Cheat Sheet',
      category: 'JavaScript',
      url: '#',
      icon: FileText,
      downloads: 245,
    },
    {
      id: 3,
      title: 'CSS Grid Video Tutorial',
      description: 'Complete guide to CSS Grid layout system',
      type: 'Video',
      category: 'CSS',
      url: '#',
      icon: Video,
      downloads: 0,
    },
    {
      id: 4,
      title: 'Node.js Starter Template',
      description: 'Boilerplate code for Node.js projects',
      type: 'Code Template',
      category: 'Node.js',
      url: '#',
      icon: FileCode,
      downloads: 89,
    },
    {
      id: 5,
      title: 'Database Design Principles',
      description: 'Comprehensive guide to database design best practices',
      type: 'Guide',
      category: 'Database',
      url: '#',
      icon: BookOpen,
      downloads: 156,
    },
  ];

  const categories = ['All', 'React', 'JavaScript', 'CSS', 'Node.js', 'Database'];

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <FileText className="h-8 w-8 text-primary" />
          Learning Resources
        </h1>
        <p className="text-muted-foreground">
          Access helpful materials, templates, and references for your learning journey
        </p>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search resources..." className="pl-10" />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
          <div className="flex gap-2 mt-4">
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
        </CardContent>
      </Card>

      {/* Resources Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {resources.map((resource) => (
          <Card key={resource.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <resource.icon className="h-5 w-5 text-primary" />
                  <Badge variant="outline" className="text-xs">
                    {resource.type}
                  </Badge>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {resource.category}
                </Badge>
              </div>
              <CardTitle className="text-lg">{resource.title}</CardTitle>
              <CardDescription>{resource.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {resource.downloads > 0 && <span>{resource.downloads} downloads</span>}
                </div>
                <div className="flex gap-2">
                  {resource.downloads > 0 ? (
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Open
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Upload Section */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Contribute Resources</CardTitle>
          <CardDescription>Share helpful resources with the learning community</CardDescription>
        </CardHeader>
        <CardContent>
          <Button>
            <FileText className="h-4 w-4 mr-2" />
            Upload Resource
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
