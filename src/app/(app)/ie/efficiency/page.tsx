'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  RefreshCw, 
  Loader2, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Clock,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import Link from 'next/link';

export default function EfficiencyMonitorPage() {
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

  const fetchMonitorData = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth('/api/ie/reports?type=all');
      if (res.ok) {
        const reportData = await res.json();
        setData(reportData);
      } else {
        throw new Error('Failed to fetch monitoring data');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Monitoring Offline",
        description: "Unable to establish connection with production logs.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitorData();
    // Auto refresh every 30 seconds for "Real-time" feel
    const interval = setInterval(fetchMonitorData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        <p className="text-muted-foreground font-medium">Initializing Real-time Efficiency Monitor...</p>
      </div>
    );
  }

  const activeAlerts = data?.alerts || [];
  const performance = data?.performance || [];
  const avgEff = parseFloat(data?.kpis?.avgEfficiency || 0);

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom duration-700 p-6">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Efficiency Monitor</h1>
          <p className="text-muted-foreground">
            Real-time production floor performance and bottleneck detection.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchMonitorData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync Now
          </Button>
          <Link href="/ie/reports">
            <Button variant="outline">
              <BarChart3 className="mr-2 h-4 w-4" />
              Full Analytics
            </Button>
          </Link>
        </div>
      </div>

      {/* Real-time KPI Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="relative overflow-hidden border-none shadow-lg bg-white group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-500">
            <TrendingUp size={80} />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Global Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black">{avgEff}%</span>
              {avgEff > 70 ? (
                <span className="flex items-center text-sm font-bold text-green-600">
                  <ArrowUpRight className="h-4 w-4" /> +2.4%
                </span>
              ) : (
                <span className="flex items-center text-sm font-bold text-orange-600">
                  <ArrowDownRight className="h-4 w-4" /> -1.2%
                </span>
              )}
            </div>
            <div className="mt-4 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
               <div 
                 className={`h-full transition-all duration-1000 ${avgEff > 80 ? 'bg-green-500' : 'bg-yellow-500'}`}
                 style={{ width: `${avgEff}%` }}
               />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Aggregated across {performance.length} active lines</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-none shadow-lg bg-white group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-500">
            <Users size={80} />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Active Lines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-black">{performance.length}</div>
            <p className="text-sm font-medium text-slate-500 mt-2">Currently in production</p>
            <div className="flex gap-1 mt-4">
               {performance.slice(0, 5).map((l: any, i: number) => (
                 <div key={i} className={`h-2 w-full rounded-full ${l.avgEfficiency > 75 ? 'bg-green-400' : 'bg-slate-200'}`} title={l.lineId} />
               ))}
            </div>
          </CardContent>
        </Card>

        <Card className={`relative overflow-hidden border-none shadow-lg group ${activeAlerts.length > 0 ? 'bg-red-50' : 'bg-white'}`}>
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-500">
            <AlertTriangle size={80} />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Active Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-5xl font-black ${activeAlerts.length > 0 ? 'text-red-600' : 'text-slate-900'}`}>{activeAlerts.length}</div>
            {activeAlerts.length > 0 ? (
              <p className="text-sm font-bold text-red-600 mt-2 animate-pulse flex items-center gap-1">
                <Zap className="h-4 w-4" /> Action Required
              </p>
            ) : (
              <p className="text-sm font-medium text-green-600 mt-2">System Healthy</p>
            )}
            <div className="mt-4">
              <Link href="#alerts" className="text-xs font-bold text-blue-600 hover:underline">View details →</Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Real-time Load Chart */}
        <Card className="lg:col-span-8 border-none shadow-xl bg-slate-900 text-white overflow-hidden">
          <CardHeader className="pb-0">
            <div className="flex justify-between items-center">
               <div className="space-y-1">
                 <CardTitle className="text-xl flex items-center gap-2">
                   <Activity className="h-5 w-5 text-green-400" />
                   Efficiency Pulse
                 </CardTitle>
                 <CardDescription className="text-slate-400">Live output efficiency vs target metrics</CardDescription>
               </div>
               <div className="flex gap-4 text-xs">
                 <span className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-green-400" /> Efficiency</span>
                 <span className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-slate-600" /> 80% Benchmark</span>
               </div>
            </div>
          </CardHeader>
          <CardContent className="h-[350px] p-0 mt-6 px-4">
            {data?.efficiency?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.efficiency}>
                  <defs>
                    <linearGradient id="colorEff" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4ade80" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                  <XAxis 
                    dataKey="reportDate" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 10}}
                    tickFormatter={(val) => new Date(val).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px'}}
                    itemStyle={{color: '#4ade80'}}
                  />
                  <Area type="monotone" dataKey="efficiency" stroke="#4ade80" fillOpacity={1} fill="url(#colorEff)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500">
                <Clock className="h-10 w-10 animate-spin-slow" />
                <p className="font-medium">Waiting for production heartbeat...</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bottleneck Alerts */}
        <Card id="alerts" className="lg:col-span-4 border-none shadow-xl bg-white overflow-hidden">
          <CardHeader className="bg-slate-50">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Monitoring Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             <div className="divide-y max-h-[400px] overflow-y-auto">
                {activeAlerts.length > 0 ? activeAlerts.map((alert: any, idx: number) => (
                  <div key={idx} className="p-4 hover:bg-slate-50 transition-colors flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${alert.severity === 'Critical' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                      <Zap className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{alert.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Source: <span className="font-semibold text-slate-700">{alert.source}</span></p>
                      <div className="mt-2 flex items-center justify-between">
                         <span className="text-xs font-black text-red-500">{alert.value}% Eff.</span>
                         <Badge variant="outline" className="text-[10px] py-0">{alert.severity}</Badge>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center px-6 gap-2">
                    <div className="p-3 bg-green-50 rounded-full">
                       <Zap className="h-6 w-6 text-green-500" />
                    </div>
                    <p className="font-bold text-slate-800">No Critical Bottlenecks</p>
                    <p className="text-xs text-muted-foreground tracking-tight">Production is flowing within optimal parameters.</p>
                  </div>
                )}
             </div>
             {activeAlerts.length > 0 && (
               <div className="p-4 bg-slate-50 border-t">
                  <Button variant="ghost" className="w-full text-xs font-bold text-blue-600 hover:bg-blue-50" size="sm">
                    Acknowledge All Alerts
                  </Button>
               </div>
             )}
          </CardContent>
        </Card>
      </div>

      {/* Production Line Efficiency Sub-dashboard */}
      <h3 className="text-2xl font-black flex items-center gap-3 mt-10">
        <Users className="h-6 w-6 text-blue-600" />
        Line-by-Line Status
      </h3>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {performance.length > 0 ? performance.map((line: any, i: number) => (
          <Card key={i} className="border-none shadow-md hover:shadow-xl transition-shadow duration-300">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-1">
                  <h4 className="font-black text-xl text-slate-800">{line.lineId}</h4>
                  <p className="text-xs font-medium text-slate-400">Target: {line.avgTarget} pcs/h</p>
                </div>
                <Badge className={line.avgEfficiency > 75 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                  {line.avgEfficiency.toFixed(1)}%
                </Badge>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span>Current Load</span>
                  <span>{line.workstations} Workstations</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${line.avgEfficiency > 75 ? 'bg-green-500' : 'bg-yellow-500'}`} 
                    style={{ width: `${line.avgEfficiency}%` }} 
                  />
                </div>
                <div className="flex items-center justify-between pt-2">
                   <div className="flex -space-x-2">
                      {[...Array(Math.min(line.operators, 4))].map((_, idx) => (
                        <div key={idx} className="h-6 w-6 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold">
                           OP
                        </div>
                      ))}
                      {line.operators > 4 && <div className="h-6 w-6 rounded-full border-2 border-white bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold">+{line.operators-4}</div>}
                   </div>
                   <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-slate-100" asChild>
                      <Link href={`/ie/line-balancing/`}>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                   </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )) : (
          [...Array(4)].map((_, i) => (
            <Card key={i} className="border-none shadow-sm opacity-50 bg-slate-50">
              <CardContent className="p-6 h-40 flex items-center justify-center">
                <p className="text-xs text-slate-400 font-medium italic">Pending Configuration...</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}