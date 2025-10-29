"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';

interface DailyProductionData {
  date: string;
  quantity: number;
}

interface DailyProductionChartProps {
  orderId: string;
  totalQuantity: number;
}

export function DailyProductionChart({ orderId, totalQuantity }: DailyProductionChartProps) {
  const [data, setData] = useState<DailyProductionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDailyProductionData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/marketing-orders/daily-production-chart?orderId=${orderId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch daily production data');
        }
        
        const chartData: DailyProductionData[] = await response.json();
        setData(chartData);
      } catch (err) {
        console.error('Error fetching daily production data:', err);
        setError('Failed to load production data');
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchDailyProductionData();
    }
  }, [orderId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Production Progress</CardTitle>
          <CardDescription>Tracking production quantity over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Production Progress</CardTitle>
          <CardDescription>Tracking production quantity over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-red-500">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Production Progress</CardTitle>
          <CardDescription>Tracking production quantity over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No production data available yet
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate cumulative quantities
  let cumulativeQuantity = 0;
  const chartDataWithCumulative = data.map(item => {
    cumulativeQuantity += item.quantity;
    return {
      ...item,
      cumulativeQuantity,
      dateLabel: new Date(item.date).toLocaleDateString()
    };
  });

  // Add target line data
  const targetData = chartDataWithCumulative.map(item => ({
    ...item,
    target: totalQuantity
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Production Progress</CardTitle>
        <CardDescription>Tracking production quantity over time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={targetData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 50,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="dateLabel" 
                angle={-45} 
                textAnchor="end" 
                height={60}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                domain={[0, totalQuantity * 1.1]} 
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                formatter={(value) => [value, 'Quantity']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="cumulativeQuantity"
                name="Produced Quantity"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="target"
                name="Target Quantity"
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          <p>Total Target: {totalQuantity} units</p>
          <p>Currently Produced: {chartDataWithCumulative[chartDataWithCumulative.length - 1]?.cumulativeQuantity || 0} units</p>
          <p>Remaining: {totalQuantity - (chartDataWithCumulative[chartDataWithCumulative.length - 1]?.cumulativeQuantity || 0)} units</p>
        </div>
      </CardContent>
    </Card>
  );
}