"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Plus, TrendingUp } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function VisitorCounter() {
  const { user } = useAuth();
  const [visitorCount, setVisitorCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [shopId, setShopId] = useState<string | null>(null);

  // Get shopId for the current user
  useEffect(() => {
    if (!user || user.role !== 'shop') return;

    const fetchShopId = async () => {
      try {
        const response = await fetch(`/api/shops/${user.username}`);
        if (response.ok) {
          const shop = await response.json();
          if (shop) {
            setShopId(shop.id);
          }
        }
      } catch (error) {
        console.error('Error fetching shop ID:', error);
      }
    };

    fetchShopId();
  }, [user?.username]);

  // Fetch visitor count
  useEffect(() => {
    if (shopId) {
      fetchVisitorCount();
    }
  }, [shopId]);

  const fetchVisitorCount = async () => {
    try {
      const res = await fetch(`/api/pos/visitors?shopId=${shopId}`);
      if (res.ok) {
        const data = await res.json();
        setVisitorCount(data.today);
      }
    } catch (error) {
      console.error('Error fetching visitor count:', error);
    } finally {
      setLoading(false);
    }
  };

  const addVisitor = async () => {
    try {
      const res = await fetch('/api/pos/visitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId: shopId,
          count: 1
        })
      });

      if (res.ok) {
        const data = await res.json();
        setVisitorCount(data.count);
        toast({
          title: "Visitor counted",
          description: "Visitor added to count",
        });
      } else {
        const error = await res.json();
        toast({
          title: "Error",
          description: error.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error adding visitor:', error);
      toast({
        title: "Error",
        description: "Failed to add visitor",
        variant: "destructive"
      });
    }
  };

  const addMultipleVisitors = async (count: number) => {
    try {
      const res = await fetch('/api/pos/visitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId: shopId,
          count: count
        })
      });

      if (res.ok) {
        const data = await res.json();
        setVisitorCount(data.count);
        toast({
          title: "Visitors counted",
          description: `${count} visitors added to count`,
        });
      } else {
        const error = await res.json();
        toast({
          title: "Error",
          description: error.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error adding visitors:', error);
      toast({
        title: "Error",
        description: "Failed to add visitors",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Visitor Counter
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold">{visitorCount}</div>
            <div className="text-sm text-muted-foreground">Visitors today</div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => addMultipleVisitors(5)}
            >
              +5
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => addMultipleVisitors(10)}
            >
              +10
            </Button>
            <Button
              size="sm"
              onClick={addVisitor}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Foot Traffic Rate</span>
            <span className="font-medium">0%</span>
          </div>
          <div className="mt-2 w-full bg-secondary rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full" 
              style={{ width: '0%' }}
            ></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}