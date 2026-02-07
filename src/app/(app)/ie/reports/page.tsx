'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Download, 
  BarChart3, 
  Users, 
  TrendingUp, 
  Zap, 
  Clock, 
  PieChart as PieChartIcon,
  RefreshCw,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
  PieChart,
  Pie
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function ReportsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const fetchWithAuth = async (url: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    const headers = {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
    return fetch(url, { headers });
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth('/api/ie/reports?type=all');
      if (res.ok) {
        const reportData = await res.json();
        setData(reportData);
      } else {
        throw new Error('Failed to fetch reports');
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast({
        title: "Connection Error",
        description: "Could not load report data. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        <p className="text-muted-foreground animate-pulse font-medium">Generating analytical reports...</p>
      </div>
    );
  }

  const kpis = [
    { label: 'Avg Efficiency', value: `${data?.kpis?.avgEfficiency || 0}%`, icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-100' },
    { label: 'Active Operations', value: data?.kpis?.totalOperations || 0, icon: FileText, color: 'text-blue-500', bg: 'bg-blue-100' },
    { label: 'Machine Fleet', value: data?.kpis?.totalMachines || 0, icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-100' },
  ];

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom duration-700 p-6">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">IE Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Real-time insights into production efficiency, SAM deployment, and line performance.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchReports}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline">
            <FileText className="mr-2 h-4 w-4 text-red-500" />
            Export analytics
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {kpis.map((kpi, idx) => (
          <Card key={idx} className="border-none shadow-md bg-white/50 backdrop-blur-sm group hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                <h3 className="text-3xl font-bold mt-1">{kpi.value}</h3>
              </div>
              <div className={`p-4 rounded-2xl ${kpi.bg} group-hover:scale-110 transition-transform duration-300`}>
                <kpi.icon className={`h-8 w-8 ${kpi.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-12">
        {/* Efficiency Chart */}
        <Card className="lg:col-span-8 shadow-md border-none">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-blue-500" />
                Efficiency Trends
              </CardTitle>
              <CardDescription>Daily efficiency analysis by production category</CardDescription>
            </div>
            <div className="flex gap-2">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-blue-500" /> Efficiency (%)
              </span>
            </div>
          </CardHeader>
          <CardContent className="h-[400px]">
            {data?.efficiency?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.efficiency}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="reportDate" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#888', fontSize: 12}}
                    tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="efficiency" 
                    stroke="#3b82f6" 
                    strokeWidth={4} 
                    dot={{fill: '#3b82f6', r: 4}} 
                    activeDot={{r: 6, strokeWidth: 0}}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full bg-muted/20 rounded-2xl border-2 border-dashed">
                <TrendingUp className="h-10 w-10 text-muted-foreground/40 mb-2" />
                <p className="text-muted-foreground font-medium">Insufficient production logs for trending</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SAM Analysis */}
        <Card className="lg:col-span-4 shadow-md border-none">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <PieChartIcon className="h-6 w-6 text-indigo-500" />
              SAM Breakdown
            </CardTitle>
            <CardDescription>Average SMV per operation category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {data?.sam?.categorySAM?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.sam.categorySAM}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="avgSMV"
                      nameKey="category"
                    >
                      {data.sam.categorySAM.map((_entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full bg-muted/20 rounded-2xl border-2 border-dashed">
                  <AlertCircle className="h-10 w-10 text-muted-foreground/40 mb-2" />
                  <p className="text-muted-foreground font-medium text-sm text-center px-4">No operation library data found</p>
                </div>
              )}
            </div>
            
            <div className="mt-6 space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Top Operations</h4>
              {data?.sam?.topSMVOperations?.slice(0, 3).map((op: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold truncate max-w-[150px]">{op.operationName}</p>
                    <p className="text-xs text-muted-foreground">{op.category}</p>
                  </div>
                  <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 border-none font-bold">
                    {op.standardSMV.toFixed(2)}m
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Line Performance Table */}
        <Card className="lg:col-span-12 shadow-md border-none overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-6">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Users className="h-6 w-6 text-blue-400" />
              Line Balancing Performance
            </CardTitle>
            <CardDescription className="text-slate-300">Workstation utilization and operator efficiency metrics</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {data?.performance?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      <th className="p-4 font-bold text-sm text-slate-600">Line ID</th>
                      <th className="p-4 font-bold text-sm text-slate-600">Workstations</th>
                      <th className="p-4 font-bold text-sm text-slate-600">Operators</th>
                      <th className="p-4 font-bold text-sm text-slate-600">Avg Target (pcs/h)</th>
                      <th className="p-4 font-bold text-sm text-slate-600">Line Efficiency</th>
                      <th className="p-4 font-bold text-sm text-slate-600">Health</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.performance.map((line: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/50 border-b transition-colors">
                        <td className="p-4 font-black text-blue-600">{line.lineId}</td>
                        <td className="p-4 text-sm font-medium">{line.workstations}</td>
                        <td className="p-4 text-sm font-medium">{line.operators}</td>
                        <td className="p-4 text-sm font-medium">{line.avgTarget.toFixed(2)}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-[100px]">
                              <div 
                                className={`h-full rounded-full ${line.avgEfficiency > 80 ? 'bg-green-500' : line.avgEfficiency > 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${line.avgEfficiency}%` }}
                              />
                            </div>
                            <span className="text-sm font-bold">{line.avgEfficiency.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge className={line.avgEfficiency > 80 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}>
                            {line.avgEfficiency > 80 ? 'Optimal' : 'Needs Tuning'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-20 gap-4 text-center">
                <div className="p-4 bg-slate-50 rounded-full">
                  <Zap className="h-10 w-10 text-slate-300" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-600">No Balancing Data</h4>
                  <p className="text-muted-foreground max-w-xs mx-auto">Active line balancing plans are required to generate performance metrics.</p>
                </div>
                <Button variant="outline" className="rounded-full">Go to Line Balancing</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}