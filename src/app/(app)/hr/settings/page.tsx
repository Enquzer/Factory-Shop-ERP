
"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Settings,
  Scale,
  History,
  Save,
  Plus,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Percent,
  ClipboardList
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function HRSettingsPage() {
  const [globalSettings, setGlobalSettings] = useState<any>({});
  const [taxBrackets, setTaxBrackets] = useState<any[]>([]);
  const [salaryHistory, setSalaryHistory] = useState<any[]>([]);
  const [leaveConfigs, setLeaveConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [gsRes, taxRes, histRes, leaveRes] = await Promise.all([
        fetch("/api/hr/settings"),
        fetch("/api/hr/settings/tax"),
        fetch("/api/hr/settings/salary-history"),
        fetch("/api/hr/settings/leaves"),
      ]);

      if (gsRes.ok) setGlobalSettings(await gsRes.json());
      if (taxRes.ok) setTaxBrackets(await taxRes.json());
      if (histRes.ok) setSalaryHistory(await histRes.json());
      if (leaveRes.ok) setLeaveConfigs(await leaveRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGlobal = async () => {
    try {
      const res = await fetch("/api/hr/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(globalSettings),
      });
      if (res.ok) {
        toast({ title: "Updated", description: "Global settings saved." });
      }
    } catch (err) {
      toast({ title: "Error", description: "Update failed", variant: "destructive" });
    }
  };

  const handleUpdateBracket = async (bracket: any) => {
    try {
      const res = await fetch("/api/hr/settings/tax", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bracket),
      });
      if (res.ok) {
        toast({ title: "Updated", description: "Tax bracket updated." });
      }
    } catch (err) {
      toast({ title: "Error", description: "Update failed", variant: "destructive" });
    }
  };

  const handleUpdateLeaveConfig = async (config: any) => {
    try {
      const res = await fetch("/api/hr/settings/leaves", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        toast({ title: "Updated", description: "Leave configuration saved." });
      }
    } catch (err) {
      toast({ title: "Error", description: "Update failed", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">HR Configuration</h1>
        <p className="text-muted-foreground mt-1">
          System-wide rules for tax, pension, and payroll calculations.
        </p>
      </div>

      <Tabs defaultValue="pension" className="space-y-4">
        <TabsList className="bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="pension" className="rounded-lg gap-2">
            <Settings className="h-4 w-4" /> Global Rules
          </TabsTrigger>
          <TabsTrigger value="tax" className="rounded-lg gap-2">
            <Scale className="h-4 w-4" /> Tax Brackets
          </TabsTrigger>
          <TabsTrigger value="leaves" className="rounded-lg gap-2">
            <ClipboardList className="h-4 w-4" /> Leave Rules
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg gap-2">
            <History className="h-4 w-4" /> Salary Tracking
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pension">
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle>Global Statutory Rules</CardTitle>
              <CardDescription>
                Set standard percentages for pension and monthly parameters.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Employee Pension (%)</label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      value={globalSettings.pension_employee_pct * 100 || ""}
                      onChange={(e) =>
                        setGlobalSettings({
                          ...globalSettings,
                          pension_employee_pct: parseFloat(e.target.value) / 100,
                        })
                      }
                    />
                    <Percent className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Employer Pension (%)</label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      value={globalSettings.pension_employer_pct * 100 || ""}
                      onChange={(e) =>
                        setGlobalSettings({
                          ...globalSettings,
                          pension_employer_pct: parseFloat(e.target.value) / 100,
                        })
                      }
                    />
                    <Percent className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Monthly Working Days</label>
                  <Input
                    type="number"
                    value={globalSettings.working_days_per_month || ""}
                    onChange={(e) =>
                      setGlobalSettings({
                        ...globalSettings,
                        working_days_per_month: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <Button onClick={handleUpdateGlobal} className="gap-2">
                <Save className="h-4 w-4" /> Save Global Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax">
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle>Tax Rate Table (Progressive)</CardTitle>
              <CardDescription>
                Define salary scales and their corresponding tax rates and deductions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Min Salary (Br)</TableHead>
                    <TableHead>Max Salary (Br)</TableHead>
                    <TableHead>Rate (%)</TableHead>
                    <TableHead>Deduction (Br)</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxBrackets.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>
                        <Input
                          type="number"
                          className="h-8 w-24"
                          value={b.minSalary}
                          onChange={(e) => {
                            const updated = taxBrackets.map((x) =>
                              x.id === b.id ? { ...x, minSalary: parseFloat(e.target.value) } : x
                            );
                            setTaxBrackets(updated);
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          placeholder="No Limit"
                          className="h-8 w-24"
                          value={b.maxSalary || ""}
                          onChange={(e) => {
                            const updated = taxBrackets.map((x) =>
                              x.id === b.id
                                ? { ...x, maxSalary: e.target.value ? parseFloat(e.target.value) : null }
                                : x
                            );
                            setTaxBrackets(updated);
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            className="h-8 w-16"
                            value={b.rate * 100}
                            onChange={(e) => {
                              const updated = taxBrackets.map((x) =>
                                x.id === b.id ? { ...x, rate: parseFloat(e.target.value) / 100 } : x
                              );
                              setTaxBrackets(updated);
                            }}
                          />
                          <span>%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="h-8 w-24"
                          value={b.deduction}
                          onChange={(e) => {
                            const updated = taxBrackets.map((x) =>
                              x.id === b.id ? { ...x, deduction: parseFloat(e.target.value) } : x
                            );
                            setTaxBrackets(updated);
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUpdateBracket(b)}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaves">
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle>Leave Impact Configuration</CardTitle>
              <CardDescription>
                Configure which leave types result in salary deductions and their impact factor.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead>Deduction Factor (0-1)</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveConfigs.map((lc) => (
                    <TableRow key={lc.leaveType}>
                      <TableCell className="font-bold">{lc.leaveType}</TableCell>
                      <TableCell>
                        <Badge
                          variant={lc.isPaid ? "outline" : "destructive"}
                          className="cursor-pointer"
                          onClick={() => {
                            const updated = leaveConfigs.map(c => 
                              c.leaveType === lc.leaveType ? { ...c, isPaid: !c.isPaid } : c
                            );
                            setLeaveConfigs(updated);
                          }}
                        >
                          {lc.isPaid ? "Paid Leave" : "Unpaid Leave"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step="0.1"
                            max="1"
                            min="0"
                            className="h-8 w-24"
                            value={lc.deductionFactor}
                            onChange={(e) => {
                              const updated = leaveConfigs.map(c => 
                                c.leaveType === lc.leaveType ? { ...c, deductionFactor: parseFloat(e.target.value) } : c
                              );
                              setLeaveConfigs(updated);
                            }}
                          />
                          <span className="text-[10px] text-muted-foreground">(1.0 = Full Deduction)</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUpdateLeaveConfig(lc)}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle>Workforce Salary Progression</CardTitle>
              <CardDescription>
                Track history of increments and demotions across the factory.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Old Salary</TableHead>
                    <TableHead>New Salary</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead>Effective Date</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salaryHistory.map((h) => {
                    const diff = h.newSalary - h.oldSalary;
                    const pct = (diff / h.oldSalary) * 100;
                    return (
                      <TableRow key={h.id}>
                        <TableCell>
                          <div className="font-semibold">{h.employeeName}</div>
                          <div className="text-[10px] text-muted-foreground uppercase">{h.employeeId}</div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              h.changeType === "Increment"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }
                            variant="outline"
                          >
                            {h.changeType}
                          </Badge>
                        </TableCell>
                        <TableCell>{h.oldSalary.toLocaleString()} Br</TableCell>
                        <TableCell className="font-bold">{h.newSalary.toLocaleString()} Br</TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-1 text-xs ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {diff >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {Math.abs(pct).toFixed(1)}%
                          </div>
                        </TableCell>
                        <TableCell>{h.effectiveDate}</TableCell>
                        <TableCell className="text-muted-foreground">{h.reason}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
