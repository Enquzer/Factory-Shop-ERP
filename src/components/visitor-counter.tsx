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
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Get shopId for the current user
  useEffect(() => {
    if (!user || user.role !== 'shop' || !user.username) {
      setIsInitialLoad(false);
      return;
    }

    // Validate username format
    if (typeof user.username !== 'string' || user.username.trim().length === 0) {
      console.error('Invalid username:', user.username);
      setIsInitialLoad(false);
      return;
    }

    // Add a small delay to ensure auth context is fully initialized
    const timer = setTimeout(() => {
      const fetchShopId = async () => {
        try {
          // Encode the username to handle special characters
          const encodedUsername = encodeURIComponent(user.username);
          
          const response = await fetch(`/api/shops/${encodedUsername}`);
          
          if (response.ok) {
            const shop = await response.json();
            if (shop && shop.id) {
              setShopId(shop.id);
            }
          } else {
            const errorText = await response.text();
            console.error(`Failed to fetch shop '${user.username}' (status ${response.status}):`, errorText);
            
            // Retry once after a short delay if it's a server error
            if (response.status >= 500) {
              console.log('Retrying shop fetch in 1 second...');
              setTimeout(async () => {
                try {
                  const retryResponse = await fetch(`/api/shops/${encodedUsername}`);
                  if (retryResponse.ok) {
                    const retryShop = await retryResponse.json();
                    if (retryShop && retryShop.id) {
                      setShopId(retryShop.id);
                      console.log('Shop fetch retry successful');
                    }
                  } else {
                    console.error('Retry also failed with status:', retryResponse.status);
                  }
                } catch (retryError) {
                  console.error("Retry failed:", retryError);
                }
              }, 1000);
            }
          }
        } catch (error) {
          console.error(`Error fetching shop '${user.username}':`, error);
        } finally {
          setIsInitialLoad(false);
        }
      };

      fetchShopId();
    }, 150); // 150ms delay

    return () => clearTimeout(timer);
  }, [user?.username, user?.role]);

  // Fetch visitor count
  useEffect(() => {
    if (shopId && !isInitialLoad) {
      fetchVisitorCount();
    }
  }, [shopId, isInitialLoad]);

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