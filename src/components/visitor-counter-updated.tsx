"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Users, Plus, Minus, TrendingUp, Calendar } from 'lucide-react';

interface VisitorCounterProps {
  selectedDate?: string; // Format: YYYY-MM-DD
}

export default function VisitorCounterUpdated({ selectedDate }: VisitorCounterProps) {
  const { user } = useAuth();
  const [visitorCount, setVisitorCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [shopId, setShopId] = useState<string | null>(null);
  const [displayDate, setDisplayDate] = useState('');

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

  // Update display date whenever selectedDate changes
  useEffect(() => {
    const dateToDisplay = selectedDate ? new Date(selectedDate) : new Date();
    const formatted = dateToDisplay.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    setDisplayDate(formatted);
  }, [selectedDate]);

  // Fetch visitor count whenever shopId or selectedDate changes
  useEffect(() => {
    if (shopId) {
      fetchVisitorCount();
    }
  }, [shopId, selectedDate]);

  const fetchVisitorCount = async () => {
    try {
      setLoading(true);
      const url = selectedDate 
        ? `/api/pos/visitors?shopId=${shopId}&date=${selectedDate}`
        : `/api/pos/visitors?shopId=${shopId}`;
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        // If specific date requested, use that count, else fallback to today
        setVisitorCount(selectedDate ? data.count : data.today);
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
          count: 1,
          date: selectedDate // Pass the selected date to the API
        })
      });

      if (res.ok) {
        await fetchVisitorCount();
      } else {
        const error = await res.json();
        console.error('Error adding visitor:', error.error);
      }
    } catch (error) {
      console.error('Error adding visitor:', error);
    }
  };

  const addMultipleVisitors = async (count: number) => {
    try {
      const res = await fetch('/api/pos/visitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId: shopId,
          count: count,
          date: selectedDate // Pass the selected date to the API
        })
      });

      if (res.ok) {
        await fetchVisitorCount();
      } else {
        const error = await res.json();
        console.error('Error adding visitors:', error.error);
      }
    } catch (error) {
      console.error('Error adding visitors:', error);
    }
  };

  if (loading && !visitorCount) {
    return (
      <Card>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-none shadow-lg">
      <CardHeader className="pb-3 bg-slate-50/50">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-600 uppercase tracking-wider">
          <Users className="h-4 w-4 text-primary" />
          Visitor Traffic
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-4xl font-black text-slate-900 leading-none">{visitorCount}</div>
            <div className="text-[10px] font-bold text-slate-400 mt-2 flex items-center gap-1 uppercase">
              <Calendar className="h-3 w-3" />
              {displayDate}
            </div>
          </div>
          <div className="flex gap-1 items-center">
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 text-rose-500 border-rose-100 hover:bg-rose-50 hover:text-rose-600 shadow-sm"
              onClick={() => addMultipleVisitors(-1)}
              disabled={visitorCount <= 0}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 text-[10px] font-bold border-slate-200 hover:bg-slate-50"
              onClick={() => addMultipleVisitors(5)}
            >
              +5
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 text-[10px] font-bold border-slate-200 hover:bg-slate-50"
              onClick={() => addMultipleVisitors(10)}
            >
              +10
            </Button>
            <Button
              size="sm"
              className="h-8 w-8 p-0 shadow-md transition-transform active:scale-95 ml-1"
              onClick={addVisitor}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
