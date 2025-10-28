"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles } from "lucide-react";
import { ownerKPIQA } from "@/ai/flows/owner-kpi-flow";

export function AIInsightsWidget() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsLoading(true);
    setAnswer("");
    
    try {
      const result = await ownerKPIQA({ query });
      setAnswer(result.answer);
    } catch (error) {
      console.error("Error getting AI response:", error);
      setAnswer("Sorry, I encountered an error while processing your request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI Business Insights
        </CardTitle>
        <CardDescription>
          Ask questions about your business performance and get AI-powered insights
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <Textarea
              placeholder="e.g., What was our best performing product last month? or How has our sales growth trended this quarter?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1"
              rows={3}
            />
            <Button type="submit" disabled={isLoading} className="h-fit self-end">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Ask"
              )}
            </Button>
          </div>
        </form>
        
        {answer && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">AI Response:</h4>
            <p className="text-sm">{answer}</p>
          </div>
        )}
        
        <div className="mt-4 text-xs text-muted-foreground">
          <p>Try asking questions like:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>"Show me which shop bought the most men's products last quarter."</li>
            <li>"Compare on-time delivery rate between this month and last month."</li>
            <li>"List all products sent to Jemo Branch in the last 30 days."</li>
            <li>"Show me the most delayed production orders."</li>
            <li>"How many unique products were ordered by shops this quarter?"</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}