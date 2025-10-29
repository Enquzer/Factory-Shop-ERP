"use client";

import { useState, useMemo } from 'react';
import { Search, BookOpen, ChevronRight, X } from 'lucide-react';
import { helpDocuments, helpCategories, HelpDocument, HelpCategory } from '@/lib/help-docs';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

export function HelpCenter() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<HelpDocument | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Filter documents based on user role and search query
  const filteredDocuments = useMemo(() => {
    return helpDocuments.filter(doc => {
      // Role-based filtering
      const hasAccess = doc.roles.includes('all') || 
                        (user?.role === 'factory' && doc.roles.includes('factory')) || 
                        (user?.role === 'shop' && doc.roles.includes('shop'));
      
      if (!hasAccess) return false;
      
      // Search filtering
      if (!searchQuery) return true;
      
      const query = searchQuery.toLowerCase();
      return (
        doc.title.toLowerCase().includes(query) ||
        doc.content.toLowerCase().includes(query) ||
        doc.tags.some(tag => tag.toLowerCase().includes(query))
      );
    });
  }, [searchQuery, user?.role]);

  // Group documents by category
  const documentsByCategory = useMemo(() => {
    const grouped: Record<string, HelpDocument[]> = {};
    
    filteredDocuments.forEach(doc => {
      if (!grouped[doc.category]) {
        grouped[doc.category] = [];
      }
      grouped[doc.category].push(doc);
    });
    
    return grouped;
  }, [filteredDocuments]);

  // Filter categories based on available documents
  const availableCategories = useMemo(() => {
    const categoryIds = Object.keys(documentsByCategory);
    return helpCategories.filter(category => categoryIds.includes(category.id));
  }, [documentsByCategory]);

  const handleDocumentSelect = (doc: HelpDocument) => {
    setSelectedDocument(doc);
    setIsDialogOpen(true);
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(selectedCategory === categoryId ? null : categoryId);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          <span className="hidden sm:inline">Help</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center justify-between">
            <span>Help Center</span>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsDialogOpen(false)}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 border-r flex flex-col">
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search help articles..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="px-2 pb-4">
                <h3 className="px-4 py-2 text-sm font-semibold text-muted-foreground">Categories</h3>
                <div className="space-y-1">
                  {availableCategories.map((category) => (
                    <button
                      key={category.id}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-lg px-4 py-2 text-left text-sm transition-colors hover:bg-muted",
                        selectedCategory === category.id && "bg-muted"
                      )}
                      onClick={() => handleCategorySelect(category.id)}
                    >
                      <span className="text-lg">{category.icon}</span>
                      <span className="flex-1">{category.title}</span>
                      <ChevronRight 
                        className={cn(
                          "h-4 w-4 transition-transform",
                          selectedCategory === category.id && "rotate-90"
                        )} 
                      />
                    </button>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </div>
          
          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {selectedDocument ? (
              <DocumentViewer 
                document={selectedDocument} 
                onBack={() => setSelectedDocument(null)} 
              />
            ) : (
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold">
                      {searchQuery ? `Search results for "${searchQuery}"` : "Help Documentation"}
                    </h2>
                    <p className="text-muted-foreground">
                      {searchQuery 
                        ? `Found ${filteredDocuments.length} articles` 
                        : "Browse our documentation to learn how to use the system"}
                    </p>
                  </div>
                  
                  {filteredDocuments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No articles found</h3>
                      <p className="text-muted-foreground">
                        Try adjusting your search terms or browse categories
                      </p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => setSearchQuery('')}
                      >
                        Clear search
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {Object.entries(documentsByCategory).map(([categoryId, docs]) => {
                        const category = helpCategories.find(c => c.id === categoryId);
                        if (!category) return null;
                        
                        // If a category is selected, only show that category
                        if (selectedCategory && selectedCategory !== categoryId) return null;
                        
                        return (
                          <div key={categoryId}>
                            <h3 className="flex items-center gap-2 text-lg font-semibold mb-3">
                              <span className="text-lg">{category.icon}</span>
                              {category.title}
                            </h3>
                            <div className="grid gap-3">
                              {docs.map((doc) => (
                                <button
                                  key={doc.id}
                                  className="flex items-start gap-3 rounded-lg border p-4 text-left hover:bg-muted transition-colors"
                                  onClick={() => handleDocumentSelect(doc)}
                                >
                                  <div className="flex-1">
                                    <h4 className="font-medium">{doc.title}</h4>
                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                      {doc.content.replace(/<[^>]*>/g, '').substring(0, 100)}...
                                    </p>
                                    <div className="flex gap-2 mt-2 flex-wrap">
                                      {doc.tags.slice(0, 3).map((tag) => (
                                        <Badge key={tag} variant="secondary" className="text-xs">
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DocumentViewer({ 
  document, 
  onBack 
}: { 
  document: HelpDocument; 
  onBack: () => void; 
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4 flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Back
        </Button>
        <Badge variant="secondary" className="text-xs">
          {helpCategories.find(c => c.id === document.category)?.title}
        </Badge>
      </div>
      
      <ScrollArea className="flex-1 p-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">{document.title}</h1>
          
          <div className="flex gap-2 mb-6 flex-wrap">
            {document.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
          
          <div 
            className="prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: formatContent(document.content) }}
          />
        </div>
      </ScrollArea>
    </div>
  );
}

function formatContent(content: string): string {
  // Convert markdown-like formatting to HTML
  let formatted = content
    // Convert ## headers to <h2>
    .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mt-6 mb-3">$1</h2>')
    // Convert ### headers to <h3>
    .replace(/^### (.*$)/gm, '<h3 class="text-lg font-medium mt-5 mb-2">$1</h3>')
    // Convert #### headers to <h4>
    .replace(/^#### (.*$)/gm, '<h4 class="font-medium mt-4 mb-2">$1</h4>')
    // Convert bullet points
    .replace(/^\d+\. (.*$)/gm, '<li class="mb-1">$1</li>')
    .replace(/<li/g, '<li class="list-decimal list-inside"')
    // Convert numbered lists
    .replace(/^- (.*$)/gm, '<li class="mb-1">$1</li>')
    .replace(/<li/g, '<li class="list-disc list-inside"')
    // Convert paragraphs
    .replace(/^\s*$(?:\n)/gm, '</p><p class="mb-4">')
    // Wrap content in paragraph tags
    .replace(/^(.*)$/gm, '<p class="mb-4">$1</p>');
  
  // Fix duplicate paragraph tags
  formatted = formatted
    .replace(/<p class="mb-4"><\/p>/g, '')
    .replace(/<p class="mb-4"><h/g, '<h')
    .replace(/<\/h\d><\/p>/g, '</h2>');
  
  // Wrap list items in proper list tags
  formatted = formatted
    .replace(/(<li class="list-disc[^>]*>.*<\/li>)+/g, '<ul class="mb-4">$&</ul>')
    .replace(/(<li class="list-decimal[^>]*>.*<\/li>)+/g, '<ol class="mb-4">$&</ol>');
  
  return formatted;
}