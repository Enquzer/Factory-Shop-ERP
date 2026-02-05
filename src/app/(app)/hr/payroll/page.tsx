
"use client";

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Banknote, 
  Download, 
  Printer, 
  Calculator, 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet,
  ShieldCheck,
  Building2,
  Receipt
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { exportPayslipToPDF } from '@/lib/pdf-export-utils';

export default function PayrollPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState('2026-02');
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const fetchPayroll = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hr/payroll?month=${month}`);
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

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/hr/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month })
      });
      if (res.ok) {
        toast({ title: "Payroll Generated", description: `Successfully processed payroll for ${month}` });
        await fetchPayroll();
      }
    } catch (err) {
       toast({ title: "Error", description: "Generation failed", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleBulkPrint = async () => {
    toast({ title: "Bulk Export", description: "Generating all payslips..." });
    for (const row of data) {
       await exportPayslipToPDF(row);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, [month]);

  const totalNet = data.reduce((acc, curr) => acc + curr.netSalary, 0);
  const totalTax = data.reduce((acc, curr) => acc + curr.taxPayable, 0);
  const totalPension = data.reduce((acc, curr) => acc + curr.pensionEmployee + curr.pensionEmployer, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Payroll & Tax</h1>
          <p className="text-muted-foreground mt-1">Comprehensive monthly salary and statutory processing.</p>
        </div>
        <div className="flex gap-3">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[180px] rounded-full">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2026-02">February 2026</SelectItem>
              <SelectItem value="2026-01">January 2026</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleGenerate} disabled={generating} className="rounded-full shadow-lg">
            <Calculator className={`mr-2 h-4 w-4 ${generating ? 'animate-spin' : ''}`} /> 
            {generating ? 'Processing...' : 'Generate Payroll'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <StatCard title="Total Payout" value={`${totalNet.toLocaleString()} Br`} icon={<Wallet className="text-green-500" />} trend="+4.2%" />
        <StatCard title="Total Tax (PAYE)" value={`${totalTax.toLocaleString()} Br`} icon={<ShieldCheck className="text-blue-500" />} trend="+1.2%" />
        <StatCard title="Pension Pool" value={`${totalPension.toLocaleString()} Br`} icon={<Building2 className="text-purple-500" />} trend="Stable" />
        <StatCard title="Active Payouts" value={data.length} icon={<Receipt className="text-orange-500" />} trend="Full Workforce" />
      </div>

      <Card className="border-none shadow-xl overflow-hidden bg-card/40 backdrop-blur-md">
        <CardHeader className="bg-secondary/10 border-b">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Payroll Ledger</CardTitle>
              <CardDescription>Detailed breakdown of earnings, deductions, and net pay</CardDescription>
            </div>
            <div className="flex gap-2">
               <Button variant="outline" size="sm" onClick={handleBulkPrint} className="rounded-full"><Printer className="h-4 w-4 mr-2" /> Bulk Payslips</Button>
               <Button variant="outline" size="sm" className="rounded-full"><Download className="h-4 w-4 mr-2" /> Bank Export</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee ID</TableHead>
                <TableHead>Base Salary</TableHead>
                <TableHead>OT & Incentive</TableHead>
                <TableHead>Tax & Pension</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead className="text-right font-bold">Net Payout</TableHead>
                <TableHead className="text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="h-48 text-center animate-pulse">Calculating ledger...</TableCell></TableRow>
              ) : data.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="h-48 text-center text-muted-foreground">No payroll records found. Generate to start.</TableCell></TableRow>
              ) : (
                data.map((row) => (
                  <TableRow key={row.employeeId} className="hover:bg-primary/5 transition-colors">
                    <TableCell>
                      <div className="font-semibold">{row.employeeId}</div>
                    </TableCell>
                    <TableCell>{row.baseSalary.toFixed(2)} Br</TableCell>
                    <TableCell>
                      <div className="flex flex-col text-xs">
                        <span className="text-green-600">OT: {row.otPay.toFixed(2)} Br</span>
                        <span className="text-blue-600">Inc: {row.incentiveBonus.toFixed(2)} Br</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-xs">
                        <span className="text-orange-600">Tax: {row.taxPayable.toFixed(2)} Br</span>
                        <span className="text-purple-600">Pen(7%): {row.pensionEmployee.toFixed(2)} Br</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-red-500 text-xs">
                      -{(row.disciplinaryFines + row.otherDeductions).toFixed(2)} Br
                    </TableCell>
                    <TableCell className="text-right font-bold text-lg text-primary">
                      {row.netSalary.toFixed(2)} Br
                    </TableCell>
                    <TableCell className="text-center">
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         className="h-8 w-8 p-0 rounded-full text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                         onClick={() => exportPayslipToPDF(row)}
                       >
                         <Printer className="h-4 w-4" />
                       </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon, trend }: any) {
  return (
    <Card className="border-none shadow shadow-primary/10">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="p-2 bg-secondary/50 rounded-xl">{icon}</div>
          <Badge variant="outline" className="text-[10px] text-green-600 border-green-200">{trend}</Badge>
        </div>
        <div className="mt-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold mt-1">{value}</h3>
        </div>
      </CardContent>
    </Card>
  );
}
