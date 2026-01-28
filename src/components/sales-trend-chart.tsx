"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp } from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type TimePeriod = 'daily' | 'monthly' | 'quarterly' | 'annual';

interface SalesTrendProps {
  shopId: string | null;
  selectedDate: string;
}

interface ChartDataPoint {
  period: string;
  sales: number;
  quantity: number;
}

export default function SalesTrendChart({ shopId, selectedDate }: SalesTrendProps) {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('daily');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (shopId) {
      fetchChartData();
    }
  }, [shopId, timePeriod, selectedDate]);

  const fetchChartData = async () => {
    if (!shopId) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/pos/sales/trends?shopId=${shopId}&period=${timePeriod}&date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        setChartData(data.trends || []);
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  const periodButtons: { value: TimePeriod; label: string }[] = [
    { value: 'daily', label: 'Daily' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'annual', label: 'Annual' }
  ];

  const getTitle = () => {
    switch (timePeriod) {
      case 'daily': return 'Daily Sales (Last 7 Days)';
      case 'monthly': return 'Monthly Sales (Last 12 Months)';
      case 'quarterly': return 'Quarterly Sales (Last 4 Quarters)';
      case 'annual': return 'Annual Sales Trend';
      default: return 'Sales Trend';
    }
  };

  return (
    <Card className="border-none shadow-xl bg-white overflow-hidden rounded-2xl">
      <CardHeader className="bg-slate-50/50 pb-4 border-b">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="text-sm font-black flex items-center gap-2 uppercase tracking-widest text-slate-500">
            <BarChart3 className="h-4 w-4 text-primary" />
            {getTitle()}
          </CardTitle>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            {periodButtons.map(({ value, label }) => (
              <Button
                key={value}
                size="sm"
                variant={timePeriod === value ? 'default' : 'ghost'}
                onClick={() => setTimePeriod(value)}
                className={`text-xs font-bold transition-all ${
                  timePeriod === value 
                    ? 'bg-white shadow-sm' 
                    : 'hover:bg-white/50'
                }`}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {loading ? (
          <div className="h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-80 flex flex-col items-center justify-center text-slate-400">
            <TrendingUp className="h-12 w-12 mb-3 opacity-20" />
            <p className="text-sm font-bold">No sales data available for this period</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                dataKey="period" 
                tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }}
                stroke="#cbd5e1"
              />
              <YAxis 
                yAxisId="left"
                tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }}
                stroke="#cbd5e1"
                label={{ value: 'Sales (ETB)', angle: -90, position: 'insideLeft', style: { fontSize: 10, fontWeight: 700, fill: '#64748b' } }}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }}
                stroke="#cbd5e1"
                label={{ value: 'Quantity', angle: 90, position: 'insideRight', style: { fontSize: 10, fontWeight: 700, fill: '#64748b' } }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: 'none', 
                  borderRadius: '12px', 
                  padding: '12px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
                }}
                labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}
                itemStyle={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}
                formatter={(value: number, name: string) => {
                  if (name === 'sales') return [`ETB ${value.toLocaleString()}`, 'Sales Amount'];
                  if (name === 'quantity') return [`${value} units`, 'Quantity Sold'];
                  return [value, name];
                }}
              />
              <Legend 
                wrapperStyle={{ fontSize: '12px', fontWeight: 700 }}
                formatter={(value) => {
                  if (value === 'sales') return 'Sales Amount (ETB)';
                  if (value === 'quantity') return 'Quantity Sold';
                  return value;
                }}
              />
              <Bar 
                yAxisId="left"
                dataKey="sales" 
                fill="#6366f1" 
                radius={[8, 8, 0, 0]}
                name="sales"
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="quantity" 
                stroke="#10b981" 
                strokeWidth={3}
                dot={{ fill: '#10b981', r: 5 }}
                activeDot={{ r: 7 }}
                name="quantity"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
