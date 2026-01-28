"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, Users, ShoppingCart, Package, Award, Calendar, ArrowLeft } from 'lucide-react';
import SalesTrendChart from '@/components/sales-trend-chart';
import Link from 'next/link';

interface DashboardStats {
  atv: { period: string; value: number }[];
  upt: { period: string; value: number }[];
  conversionRate: { period: string; value: number }[];
  visitors: { period: string; value: number }[];
  bestSellingProducts: { productCode: string; quantity: number; name: string }[];
}

export default function POSDashboard() {
  const { user } = useAuth();
  const [shopId, setShopId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [stats, setStats] = useState<DashboardStats>({
    atv: [],
    upt: [],
    conversionRate: [],
    visitors: [],
    bestSellingProducts: []
  });
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<'7days' | '30days' | '90days'>('7days');

  // Get shopId for the current user
  useEffect(() => {
    if (!user) return;

    const fetchShopId = async () => {
      try {
        const response = await fetch(`/api/shops/${user.username}`);
        if (response.ok) {
          const shop = await response.json();
          if (shop?.id) {
            setShopId(shop.id);
            return;
          }
        }
        
        const allShopsRes = await fetch('/api/shops?limit=10');
        if (allShopsRes.ok) {
          const data = await allShopsRes.json();
          const shops = Array.isArray(data) ? data : (data.shops || []);
          if (shops.length > 0) {
            setShopId(shops[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching shop ID:', error);
      }
    };

    fetchShopId();
  }, [user?.username]);

  // Fetch dashboard stats
  useEffect(() => {
    if (shopId) {
      fetchDashboardStats();
    }
  }, [shopId, timePeriod]);

  const fetchDashboardStats = async () => {
    if (!shopId) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/pos/dashboard/stats?shopId=${shopId}&period=${timePeriod}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const periodButtons = [
    { value: '7days' as const, label: 'Last 7 Days' },
    { value: '30days' as const, label: 'Last 30 Days' },
    { value: '90days' as const, label: 'Last 90 Days' }
  ];

  const chartColors = {
    atv: '#6366f1',
    upt: '#8b5cf6',
    conversion: '#10b981',
    visitors: '#f59e0b',
    products: '#ec4899'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 max-w-7xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <Link href="/shop/pos">
                <Button variant="outline" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to POS
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center">
                    <BarChart className="h-5 w-5" />
                  </div>
                  Analytics Dashboard
                </h1>
                <p className="text-sm text-slate-500 font-medium mt-1">Comprehensive sales performance metrics</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                <Calendar className="h-4 w-4 text-slate-500" />
                <input 
                  type="date" 
                  value={selectedDate} 
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent border-none text-sm font-bold focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Time Period Selector */}
        <div className="mb-6 flex justify-center">
          <div className="inline-flex gap-2 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
            {periodButtons.map(({ value, label }) => (
              <Button
                key={value}
                size="sm"
                variant={timePeriod === value ? 'default' : 'ghost'}
                onClick={() => setTimePeriod(value)}
                className={`font-bold transition-all ${
                  timePeriod === value 
                    ? 'bg-primary text-white shadow-md' 
                    : 'hover:bg-slate-100'
                }`}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Sales Trend Chart - Full Width */}
            <SalesTrendChart shopId={shopId} selectedDate={selectedDate} />

            {/* Metrics Grid - 2 columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Average Transaction Value (ATV) */}
              <Card className="border-none shadow-xl bg-white overflow-hidden rounded-2xl">
                <CardHeader className="bg-slate-50/50 pb-4 border-b">
                  <CardTitle className="text-sm font-black flex items-center gap-2 uppercase tracking-widest text-slate-500">
                    <TrendingUp className="h-4 w-4" style={{ color: chartColors.atv }} />
                    Average Transaction Value (ATV)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={stats.atv}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="period" tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', padding: '12px' }}
                        labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 700 }}
                        itemStyle={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}
                        formatter={(value: number) => [`ETB ${value.toFixed(2)}`, 'ATV']}
                      />
                      <Bar dataKey="value" fill={chartColors.atv} radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  
                  {/* Data Table */}
                  <div className="mt-6 border-t border-slate-100 pt-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="text-left py-2 px-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Period</th>
                            <th className="text-right py-2 px-3 font-bold text-slate-600 text-xs uppercase tracking-wider">ATV (ETB)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.atv.map((row, index) => (
                            <tr key={index} className="border-b border-slate-50 hover:bg-slate-50">
                              <td className="py-2 px-3 font-medium text-slate-700">{row.period}</td>
                              <td className="py-2 px-3 text-right font-bold text-slate-900">{row.value.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Units Per Transaction (UPT) */}
              <Card className="border-none shadow-xl bg-white overflow-hidden rounded-2xl">
                <CardHeader className="bg-slate-50/50 pb-4 border-b">
                  <CardTitle className="text-sm font-black flex items-center gap-2 uppercase tracking-widest text-slate-500">
                    <ShoppingCart className="h-4 w-4" style={{ color: chartColors.upt }} />
                    Units Per Transaction (UPT)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={stats.upt}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="period" tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', padding: '12px' }}
                        labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 700 }}
                        itemStyle={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}
                        formatter={(value: number) => [`${value.toFixed(2)} units`, 'UPT']}
                      />
                      <Bar dataKey="value" fill={chartColors.upt} radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  
                  {/* Data Table */}
                  <div className="mt-6 border-t border-slate-100 pt-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="text-left py-2 px-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Period</th>
                            <th className="text-right py-2 px-3 font-bold text-slate-600 text-xs uppercase tracking-wider">UPT (Units)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.upt.map((row, index) => (
                            <tr key={index} className="border-b border-slate-50 hover:bg-slate-50">
                              <td className="py-2 px-3 font-medium text-slate-700">{row.period}</td>
                              <td className="py-2 px-3 text-right font-bold text-slate-900">{row.value.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Foot Traffic Conversion Rate */}
              <Card className="border-none shadow-xl bg-white overflow-hidden rounded-2xl">
                <CardHeader className="bg-slate-50/50 pb-4 border-b">
                  <CardTitle className="text-sm font-black flex items-center gap-2 uppercase tracking-widest text-slate-500">
                    <TrendingUp className="h-4 w-4" style={{ color: chartColors.conversion }} />
                    Conversion Rate
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={stats.conversionRate}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="period" tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', padding: '12px' }}
                        labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 700 }}
                        itemStyle={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}
                        formatter={(value: number) => [`${value.toFixed(1)}%`, 'Conversion']}
                      />
                      <Bar dataKey="value" fill={chartColors.conversion} radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  
                  {/* Data Table */}
                  <div className="mt-6 border-t border-slate-100 pt-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="text-left py-2 px-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Period</th>
                            <th className="text-right py-2 px-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Conversion (%)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.conversionRate.map((row, index) => (
                            <tr key={index} className="border-b border-slate-50 hover:bg-slate-50">
                              <td className="py-2 px-3 font-medium text-slate-700">{row.period}</td>
                              <td className="py-2 px-3 text-right font-bold text-slate-900">{row.value.toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Number of Visitors */}
              <Card className="border-none shadow-xl bg-white overflow-hidden rounded-2xl">
                <CardHeader className="bg-slate-50/50 pb-4 border-b">
                  <CardTitle className="text-sm font-black flex items-center gap-2 uppercase tracking-widest text-slate-500">
                    <Users className="h-4 w-4" style={{ color: chartColors.visitors }} />
                    Daily Visitors
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={stats.visitors}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="period" tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', padding: '12px' }}
                        labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 700 }}
                        itemStyle={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}
                        formatter={(value: number) => [`${value} visitors`, 'Traffic']}
                      />
                      <Bar dataKey="value" fill={chartColors.visitors} radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  
                  {/* Data Table */}
                  <div className="mt-6 border-t border-slate-100 pt-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="text-left py-2 px-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Period</th>
                            <th className="text-right py-2 px-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Visitors</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.visitors.map((row, index) => (
                            <tr key={index} className="border-b border-slate-50 hover:bg-slate-50">
                              <td className="py-2 px-3 font-medium text-slate-700">{row.period}</td>
                              <td className="py-2 px-3 text-right font-bold text-slate-900">{row.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Best Selling Products - Full Width */}
            <Card className="border-none shadow-xl bg-white overflow-hidden rounded-2xl">
              <CardHeader className="bg-slate-50/50 pb-4 border-b">
                <CardTitle className="text-sm font-black flex items-center gap-2 uppercase tracking-widest text-slate-500">
                  <Award className="h-4 w-4" style={{ color: chartColors.products }} />
                  Best Selling Products
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.bestSellingProducts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} />
                    <YAxis 
                      type="category" 
                      dataKey="productCode" 
                      tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }}
                      width={100}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', padding: '12px' }}
                      labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 700 }}
                      itemStyle={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}
                      formatter={(value: number, name: string, props: any) => [
                        `${value} units`,
                        props.payload.name || props.payload.productCode
                      ]}
                    />
                    <Bar dataKey="quantity" radius={[0, 8, 8, 0]}>
                      {stats.bestSellingProducts.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={chartColors.products} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                
                {/* Data Table */}
                <div className="mt-6 border-t border-slate-100 pt-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-2 px-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Product Code</th>
                          <th className="text-left py-2 px-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Product Name</th>
                          <th className="text-right py-2 px-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Quantity Sold</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.bestSellingProducts.map((row, index) => (
                          <tr key={index} className="border-b border-slate-50 hover:bg-slate-50">
                            <td className="py-2 px-3 font-medium text-slate-700">{row.productCode}</td>
                            <td className="py-2 px-3 font-medium text-slate-700">{row.name}</td>
                            <td className="py-2 px-3 text-right font-bold text-slate-900">{row.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}