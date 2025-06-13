'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  Send, 
  Sparkles, 
  BookOpen, 
  Target,
  MessageSquare,
  Lightbulb,
  Zap,
  User,
  Bot
} from 'lucide-react';

export default function AITutorPage() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: "Hi! I'm your personal AI tutor, tailored specifically for you as a basketball fan and visual learner. I can help explain concepts using sports analogies, create visual study guides, and answer questions about your uploaded materials. What would you like to explore today?",
      timestamp: new Date(),
      personalization: 'Basketball analogies, Visual explanations'
    },
  ]);

  const [selectedContext, setSelectedContext] = useState<string | null>(null);

  // Mock data for study context
  const studyContexts = [
    {
      id: 'ml-fundamentals',
      title: 'Machine Learning Fundamentals',
      type: 'Study Material',
      progress: 60,
      lastTopic: 'Neural Networks'
    },
    {
      id: 'react-hooks',
      title: 'React Hooks Deep Dive',
      type: 'Study Material', 
      progress: 85,
      lastTopic: 'useEffect patterns'
    },
    {
      id: 'database-design',
      title: 'Database Design Principles',
      type: 'Study Material',
      progress: 100,
      lastTopic: 'Normalization'
    }
  ];

  const quickActions = [
    {
      icon: Lightbulb,
      title: "Explain with Basketball",
      description: "Use basketball analogies to explain complex concepts",
      prompt: "Can you explain this concept using basketball analogies?"
    },
    {
      icon: Target,
      title: "Create Visual Summary",
      description: "Generate a visual diagram or flowchart",
      prompt: "Create a visual summary of this topic with diagrams"
    },
    {
      icon: Zap,
      title: "Quick Quiz",
      description: "Test your understanding with personalized questions",
      prompt: "Quiz me on this topic with questions tailored to my learning style"
    },
    {
      icon: BookOpen,
      title: "Study Plan",
      description: "Get a personalized study plan for this material",
      prompt: "Create a personalized study plan for mastering this topic"
    }
  ];

  const handleSendMessage = () => {
    if (!message.trim()) return;

    const newMessage = {
      id: messages.length + 1,
      type: 'user' as const,
      content: message,
      timestamp: new Date(),
    };

    setMessages([...messages, newMessage]);
    setMessage('');

    // Simulate AI response based on personalization
    setTimeout(() => {
      let aiResponse = "I understand your question. ";
      
      if (message.toLowerCase().includes('basketball')) {
        aiResponse += "Since you love basketball, let me explain this like a game strategy...";
      } else if (message.toLowerCase().includes('visual')) {
        aiResponse += "As a visual learner, I'll create a diagram to help you understand...";
      } else {
        aiResponse += "Based on your learning profile (basketball fan, visual learner), here's how I'd explain this...";
      }
      
      const aiMessage = {
        id: messages.length + 2,
        type: 'ai' as const,
        content: aiResponse,
        timestamp: new Date(),
        personalization: 'Tailored for basketball fan, visual learner',
      };
      
      setMessages(prev => [...prev, aiMessage]);
    }, 1000);
  };

  const handleQuickAction = (prompt: string) => {
    setMessage(prompt);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Brain className="h-8 w-8 text-primary" />
          AI Tutor
        </h1>
        <p className="text-muted-foreground">
          Your personalized AI tutor that explains everything in your language
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Main Chat Interface */}
        <div className="lg:col-span-3">
          <Card className="h-[600px] flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Personalized AI Chat
                  </CardTitle>
                  <CardDescription>
                    Explanations tailored to your interests and learning style
                  </CardDescription>
                </div>
                {selectedContext && (
                  <Badge variant="outline">
                    Context: {studyContexts.find(c => c.id === selectedContext)?.title}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <ScrollArea className="flex-1 mb-4">
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-4 rounded-lg ${
                          msg.type === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <div className="flex items-start gap-2 mb-2">
                          {msg.type === 'user' ? (
                            <User className="h-4 w-4 mt-1" />
                          ) : (
                            <Bot className="h-4 w-4 mt-1" />
                          )}
                          <div className="flex-1">
                            <p className="text-sm">{msg.content}</p>
                            {msg.type === 'ai' && msg.personalization && (
                              <div className="mt-2">
                                <Badge variant="secondary" className="text-xs">
                                  🎯 {msg.personalization}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-xs opacity-70">
                          {msg.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              {/* Message Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Ask me anything about your study materials..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <Button onClick={handleSendMessage}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Study Context Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Study Context</CardTitle>
              <CardDescription>
                Select material for focused discussion
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant={selectedContext === null ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => setSelectedContext(null)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                General Chat
              </Button>
              {studyContexts.map((context) => (
                <Button
                  key={context.id}
                  variant={selectedContext === context.id ? "default" : "outline"}
                  className="w-full justify-start text-left h-auto p-3"
                  onClick={() => setSelectedContext(context.id)}
                >
                  <div>
                    <p className="text-sm font-medium">{context.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {context.progress}% • {context.lastTopic}
                    </p>
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
              <CardDescription>
                Common requests for your learning style
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="w-full text-left justify-start h-auto p-3"
                  onClick={() => handleQuickAction(action.prompt)}
                >
                  <action.icon className="h-4 w-4 mr-2 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{action.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Personalization Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your AI Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <p className="font-medium mb-2">Personalization Active:</p>
                <div className="space-y-1">
                  <Badge variant="outline" className="text-xs">
                    🏀 Basketball analogies
                  </Badge>
                  <br />
                  <Badge variant="outline" className="text-xs">
                    👁️ Visual explanations
                  </Badge>
                  <br />
                  <Badge variant="outline" className="text-xs">
                    💼 Professional context
                  </Badge>
                  <br />
                  <Badge variant="outline" className="text-xs">
                    🎯 Beginner-friendly
                  </Badge>
                </div>
              </div>
              <Button variant="outline" className="w-full text-xs">
                Update Profile
              </Button>
            </CardContent>
          </Card>

          {/* AI Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AI Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm">Online & Personalized</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Responses tailored to your learning profile
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}