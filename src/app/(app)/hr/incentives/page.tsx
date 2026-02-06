
"use client";

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Banknote, Download, Calculator, TrendingUp, AlertCircle, FileText, Settings } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

import Link from 'next/link';

export default function IncentivesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState('2026-02');
  const [calculating, setCalculating] = useState(false);

  const months = [
    { value: '2026-02', label: 'February 2026' },
    { value: '2026-01', label: 'January 2026' },
    { value: '2025-12', label: 'December 2025' },
  ];

  const fetchIncentives = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hr/incentives?month=${month}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async () => {
    setCalculating(true);
    // Simulate real calculation delay
    setTimeout(async () => {
      await fetchIncentives();
      setCalculating(false);
    }, 1500);
  };

  useEffect(() => {
    fetchIncentives();
  }, [month]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monthly Incentives</h1>
          <p className="text-muted-foreground mt-1">Tier-based performance bonus calculations.</p>
        </div>
        <div className="flex gap-3">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[180px] rounded-full">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {months.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleCalculate} disabled={calculating} className="rounded-full shadow-lg">
            <Calculator className={`mr-2 h-4 w-4 ${calculating ? 'animate-spin' : ''}`} /> 
            {calculating ? 'Calculating...' : 'Recalculate'}
          </Button>
          <Button variant="outline" className="rounded-full">
            <Download className="mr-2 h-4 w-4" /> Export Payroll
          </Button>
          <Link href="/hr/settings">
            <Button variant="ghost" className="rounded-full">
              <Settings className="mr-2 h-4 w-4" /> Rules
            </Button>
          </Link>
        </div>
      </div>

      {data ? (
        <>
          <div className="grid gap-6 md:grid-cols-3">
            <SummaryCard 
              title="Total Bonus Pool" 
              value={`${data.results.reduce((a: any, b: any) => a + b.bonus, 0).toFixed(2)} Br`} 
              icon={<Banknote className="text-purple-500" />}
              description="Across all departments"
            />
            <SummaryCard 
              title="Avg. Sewing Bonus" 
              value={`${data.avgSewingBonus.toFixed(2)} Br`} 
              icon={<TrendingUp className="text-green-500" />}
              description="Benchmark for indirect tiers"
            />
            <SummaryCard 
              title="Employees Paid" 
              value={data.results.length} 
              icon={<FileText className="text-blue-500" />}
              description="Incentive-eligible staff"
            />
          </div>

          <Card className="border-none shadow-xl overflow-hidden bg-card/40 backdrop-blur-md">
            <CardHeader className="bg-secondary/10 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Bonus Distribution List</CardTitle>
                  <CardDescription>Breakdown by direct and indirect labor types</CardDescription>
                </div>
                <Badge variant="outline" className="bg-background">{month}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Job Center</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Multiplier/Rate</TableHead>
                    <TableHead className="text-right font-bold">Bonus Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.results.map((item: any) => (
                    <TableRow key={item.employeeId} className="hover:bg-primary/5">
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">{item.jobCenter}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.type === 'Direct' ? 'default' : 'outline'} className={item.type === 'Direct' ? 'bg-indigo-500' : ''}>
                          {item.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {item.type === 'Direct' ? 'Piece-rate' : 'Job Center Rate'}
                      </TableCell>
                      <TableCell className="text-right font-bold text-lg text-primary">
                        {item.bonus.toFixed(2)} Br
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
           {loading ? (
             <>
               <Progress value={45} className="w-64" />
               <p className="text-muted-foreground animate-pulse">Calculating performance metrics...</p>
             </>
           ) : (
             <>
               <AlertCircle className="h-12 w-12 text-muted-foreground opacity-20" />
               <p className="text-muted-foreground">No data available for the selected month.</p>
               <Button onClick={handleCalculate} variant="secondary">Run Calculation</Button>
             </>
           )}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ title, value, icon, description }: any) {
  return (
    <Card className="border-none shadow-lg bg-gradient-to-br from-card to-secondary/10">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-background rounded-2xl shadow-sm">
            {icon}
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
