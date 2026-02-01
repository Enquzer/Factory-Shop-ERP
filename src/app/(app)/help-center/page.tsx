"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Search, Book, User, Wrench, HelpCircle, Package, BarChart4, ClipboardList, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { helpDocuments, helpCategories, HelpDocument } from "@/lib/help-docs";
import { useAuth } from "@/contexts/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function HelpCenterPage() {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState("getting-started");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDocument, setSelectedDocument] = useState<HelpDocument | null>(null);

  // Filter documents based on user role, category, and search query
  const filteredDocuments = useMemo(() => {
    return helpDocuments.filter(doc => {
      // Role-based filtering
      const hasAccess = doc.roles.includes('all') || 
                        (user?.role === 'factory' && doc.roles.includes('factory')) || 
                        (user?.role === 'shop' && doc.roles.includes('shop'));
      
      if (!hasAccess) return false;
      
      // Category filtering (only if not searching, or finding all for search)
      if (!searchQuery && doc.category !== activeCategory) return false;

      // Search filtering
      if (!searchQuery) return true;
      
      const query = searchQuery.toLowerCase();
      return (
        doc.title.toLowerCase().includes(query) ||
        doc.content.toLowerCase().includes(query) ||
        doc.tags.some(tag => tag.toLowerCase().includes(query))
      );
    });
  }, [activeCategory, searchQuery, user?.role]);

  // Map category IDs to icons
  const getCategoryIcon = (id: string) => {
    switch (id) {
      case 'getting-started': return Book;
      case 'orders': return ClipboardList;
      case 'inventory': return Package;
      case 'reports': return BarChart4;
      case 'profile': return User;
      case 'troubleshooting': return Wrench;
      default: return HelpCircle;
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-7xl h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex flex-col md:flex-row gap-8 flex-1 overflow-hidden">
        
        {/* Help Sidebar */}
        <aside className="w-full md:w-64 shrink-0 space-y-8 flex flex-col">
          <div className="space-y-2 shrink-0">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <HelpCircle className="h-6 w-6 text-primary" />
              Help Center
            </h1>
            <p className="text-sm text-muted-foreground">
              Find answers to common questions and learn how to use the system effectively.
            </p>
          </div>

          <div className="relative shrink-0">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search help articles..."
              className="pl-9 bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="space-y-4 flex-1 overflow-auto">
            <h3 className="font-semibold text-sm text-foreground/70 uppercase tracking-wider">Categories</h3>
            <nav className="space-y-1">
              {helpCategories.map(cat => {
                 const Icon = getCategoryIcon(cat.id);
                 return (
                  <SidebarItem 
                    key={cat.id}
                    icon={Icon} 
                    label={cat.title} 
                    active={activeCategory === cat.id && !searchQuery} 
                    onClick={() => {
                      setActiveCategory(cat.id);
                      setSearchQuery("");
                      setSelectedDocument(null);
                    }}
                  />
                 )
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 bg-card rounded-xl border shadow-sm overflow-hidden flex flex-col">
          {selectedDocument ? (
             <DocumentViewer 
               document={selectedDocument} 
               onBack={() => setSelectedDocument(null)} 
             />
          ) : (
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    {searchQuery ? "Search Results" : helpCategories.find(c => c.id === activeCategory)?.title || "Help Articles"}
                  </h2>
                  <p className="text-muted-foreground">
                    {searchQuery 
                      ? `Found ${filteredDocuments.length} articles matching "${searchQuery}"`
                      : helpCategories.find(c => c.id === activeCategory)?.description || "Browse our documentation"}
                  </p>
                </div>

                <div className="grid gap-4">
                  {filteredDocuments.length > 0 ? (
                    filteredDocuments.map(doc => (
                      <Card 
                        key={doc.id} 
                        className="cursor-pointer hover:bg-muted/50 transition-colors border-l-4 border-l-transparent hover:border-l-primary"
                        onClick={() => setSelectedDocument(doc)}
                      >
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start gap-4">
                             <div className="space-y-2">
                                <h3 className="font-semibold text-lg">{doc.title}</h3>
                                <div className="flex flex-wrap gap-2">
                                  {doc.tags.slice(0, 4).map(tag => (
                                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                                  ))}
                                </div>
                             </div>
                             <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      No articles found. Try adjusting your search or selecting a different category.
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
        </main>
      </div>
    </div>
  );
}

function SidebarItem({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
        active 
          ? "bg-primary/10 text-primary" 
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
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
      <div className="border-b p-4 flex items-center gap-2 bg-muted/30">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          ← Back to list
        </Button>
      </div>
      
      <ScrollArea className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">{document.title}</h1>
            <div className="flex gap-2 flex-wrap">
               {document.tags.map((tag) => (
                 <Badge key={tag} variant="outline">{tag}</Badge>
               ))}
            </div>
          </div>
          
          <div 
            className="prose prose-slate dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: formatContent(document.content) }}
          />
        </div>
      </ScrollArea>
    </div>
  );
}

// Reuse the format/sanitize functions from help-center.tsx logic (simplified here)
function formatContent(content: string): string {
    // Basic formatting for markdown-like headers and lists
    let formatted = content
      .replace(/^## (.*$)/gm, '<h2 class="text-2xl font-bold mt-8 mb-4 border-b pb-2">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-xl font-semibold mt-6 mb-3">$1</h3>')
      .replace(/^#### (.*$)/gm, '<h4 class="font-semibold mt-4 mb-2">$1</h4>')
      .replace(/^\d+\. (.*$)/gm, '<li class="mb-1 ml-4 list-decimal">$1</li>')
      .replace(/^- (.*$)/gm, '<li class="mb-1 ml-4 list-disc">$1</li>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
      .replace(/^\s*$(?:\n)/gm, '<div class="h-4"></div>')
      .replace(/^(?!<h|<li|<div)(.*)$/gm, '<p class="mb-4 leading-relaxed">$1</p>');
    
    return formatted;
}
