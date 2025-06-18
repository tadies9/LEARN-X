'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Library,
  Download,
  FileText,
  Video,
  Image,
  FileCode,
  Search,
  Filter,
  Bookmark,
  Clock,
  Eye,
} from 'lucide-react';

export default function LibraryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');

  // Mock data for library items
  const libraryItems = [
    {
      id: 1,
      title: 'JavaScript ES6 Cheat Sheet',
      type: 'PDF',
      course: 'JavaScript Fundamentals',
      size: '2.5 MB',
      downloadDate: '2024-12-10',
      category: 'Reference',
      icon: FileText,
      downloaded: true,
      bookmarked: true,
    },
    {
      id: 2,
      title: 'React Hooks Deep Dive Video',
      type: 'Video',
      course: 'React Development',
      size: '145 MB',
      downloadDate: '2024-12-08',
      duration: '45 min',
      category: 'Lecture',
      icon: Video,
      downloaded: true,
      bookmarked: false,
    },
    {
      id: 3,
      title: 'Component Architecture Diagram',
      type: 'Image',
      course: 'React Development',
      size: '1.2 MB',
      downloadDate: '2024-12-12',
      category: 'Visual Aid',
      icon: Image,
      downloaded: true,
      bookmarked: true,
    },
    {
      id: 4,
      title: 'TypeScript Config Template',
      type: 'Code',
      course: 'TypeScript Mastery',
      size: '0.8 MB',
      downloadDate: '2024-12-05',
      category: 'Template',
      icon: FileCode,
      downloaded: true,
      bookmarked: false,
    },
    {
      id: 5,
      title: 'Database Schema Examples',
      type: 'PDF',
      course: 'Database Design',
      size: '3.1 MB',
      downloadDate: '2024-12-03',
      category: 'Example',
      icon: FileText,
      downloaded: false,
      bookmarked: true,
    },
    {
      id: 6,
      title: 'AI-Generated Summary: Functions',
      type: 'AI Content',
      course: 'JavaScript Fundamentals',
      size: '0.5 MB',
      downloadDate: '2024-12-11',
      category: 'AI Generated',
      icon: FileText,
      downloaded: true,
      bookmarked: false,
      aiGenerated: true,
    },
  ];

  const categories = [
    'All',
    'Reference',
    'Lecture',
    'Visual Aid',
    'Template',
    'Example',
    'AI Generated',
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'PDF':
        return 'bg-red-100 text-red-800';
      case 'Video':
        return 'bg-blue-100 text-blue-800';
      case 'Image':
        return 'bg-green-100 text-green-800';
      case 'Code':
        return 'bg-purple-100 text-purple-800';
      case 'AI Content':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredItems = libraryItems.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.course.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab =
      selectedTab === 'all' ||
      (selectedTab === 'downloaded' && item.downloaded) ||
      (selectedTab === 'bookmarked' && item.bookmarked) ||
      (selectedTab === 'ai-generated' && item.aiGenerated);
    return matchesSearch && matchesTab;
  });

  const downloadedCount = libraryItems.filter((item) => item.downloaded).length;
  const bookmarkedCount = libraryItems.filter((item) => item.bookmarked).length;
  const aiGeneratedCount = libraryItems.filter((item) => item.aiGenerated).length;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Library className="h-8 w-8 text-primary" />
          My Library
        </h1>
        <p className="text-muted-foreground">
          Access your downloaded materials, bookmarks, and AI-generated content
        </p>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search library..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>

          {/* Category filters */}
          <div className="flex gap-2 flex-wrap">
            {categories.map((category) => (
              <Badge
                key={category}
                variant="secondary"
                className="cursor-pointer hover:bg-primary/80"
              >
                {category}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Library Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All ({libraryItems.length})</TabsTrigger>
          <TabsTrigger value="downloaded">Downloaded ({downloadedCount})</TabsTrigger>
          <TabsTrigger value="bookmarked">Bookmarked ({bookmarkedCount})</TabsTrigger>
          <TabsTrigger value="ai-generated">AI Generated ({aiGeneratedCount})</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="mt-6">
          {/* Stats Overview */}
          <div className="grid gap-6 md:grid-cols-3 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                    <p className="text-2xl font-bold">{filteredItems.length}</p>
                  </div>
                  <Library className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Storage Used</p>
                    <p className="text-2xl font-bold">152 MB</p>
                  </div>
                  <Download className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">This Week</p>
                    <p className="text-2xl font-bold">8 items</p>
                  </div>
                  <Clock className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Library Items Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <item.icon className="h-5 w-5 text-primary" />
                      <Badge className={getTypeColor(item.type)}>{item.type}</Badge>
                      {item.aiGenerated && (
                        <Badge variant="outline" className="text-xs">
                          AI
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {item.bookmarked && (
                        <Bookmark className="h-4 w-4 text-yellow-500 fill-current" />
                      )}
                      {item.downloaded && <Download className="h-4 w-4 text-green-500" />}
                    </div>
                  </div>
                  <CardTitle className="text-base line-clamp-2">{item.title}</CardTitle>
                  <CardDescription className="text-sm">{item.course}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Size: {item.size}</span>
                      {item.duration && <span>Duration: {item.duration}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">Added: {item.downloadDate}</div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      {!item.downloaded && (
                        <Button size="sm" className="flex-1">
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Library className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No items found</p>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your search or filters
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
