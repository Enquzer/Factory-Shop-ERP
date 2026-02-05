
"use client";

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, Star, Filter, Search, Check, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function SkillMatrixPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/hr/employees');
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.filter((e: any) => e.jobCenter === 'Sewing machine operator'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const operations = ['Cutting', 'Sewing', 'QC', 'Packing', 'Ironing', 'Finishing'];

  const getSkillLevelColor = (level: number) => {
    if (level >= 4) return 'bg-green-500 text-white border-green-600';
    if (level >= 3) return 'bg-blue-500 text-white border-blue-600';
    if (level >= 2) return 'bg-yellow-500 text-white border-yellow-600';
    if (level >= 1) return 'bg-slate-400 text-white border-slate-500';
    return 'bg-gray-100 text-gray-400 border-gray-200';
  };

  const handleSkillUpdate = async (employeeId: string, operation: string, level: number) => {
    setUpdating(`${employeeId}-${operation}`);
    try {
      // Find the employee to get current skills
      const employee = employees.find(e => e.employeeId === employeeId);
      if (!employee) return;

      const currentSkills = [...(employee.skills || [])];
      const skillIndex = currentSkills.findIndex((s: any) => s.operation === operation);

      if (skillIndex > -1) {
        currentSkills[skillIndex] = { ...currentSkills[skillIndex], level };
      } else {
        currentSkills.push({ operation, level });
      }

      const res = await fetch(`/api/hr/employees/${employeeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skills: currentSkills })
      });

      if (res.ok) {
        toast({
          title: "Skill Updated",
          description: `Updated ${operation} to Level ${level} for ${employee.name}`,
        });
        // Update local state
        setEmployees(prev => prev.map(e => 
          e.employeeId === employeeId ? { ...e, skills: currentSkills } : e
        ));
      } else {
        throw new Error("Update failed");
      }
    } catch (err) {
      toast({
        title: "Update Failed",
        description: "Could not save skill level.",
        variant: "destructive"
      });
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Skill Matrix</h1>
          <p className="text-muted-foreground mt-1">Monitor competency levels across production stages.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search operators..." 
              className="pl-10 rounded-full" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <OverviewCard title="Average Skill Level" value="3.8/5.0" icon={<Star className="text-yellow-500" />} />
        <OverviewCard title="Multi-skilled Staff" value="85%" icon={<TrendingUp className="text-green-500" />} />
        <OverviewCard title="Critical Skill Gaps" value="2" icon={<Target className="text-red-500" />} />
      </div>

      <Card className="border-none shadow-2xl overflow-hidden bg-white/50 backdrop-blur-md">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
          <CardTitle>Operator Skill Profiles</CardTitle>
          <CardDescription>Scale: 1 (Basics) to 5 (Master/Trainer)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-secondary/20">
              <TableRow>
                <TableHead className="font-bold">Operator</TableHead>
                {operations.map(op => (
                  <TableHead key={op} className="text-center font-bold">{op}</TableHead>
                ))}
                <TableHead className="text-right font-bold">Overall</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10">Loading matrix...</TableCell></TableRow>
              ) : employees.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10">No operators found.</TableCell></TableRow>
              ) : (
                employees.map(emp => {
                  const skills = emp.skills || [];
                  const skillMap: any = {};
                  skills.forEach((s: any) => skillMap[s.operation] = s.level);
                  
                  const avg = (Object.values(skillMap).reduce((a: any, b: any) => a + b, 0) as number) / (Object.keys(skillMap).length || 1);

                  return (
                    <TableRow key={emp.id} className="hover:bg-primary/5 transition-colors group">
                      <TableCell>
                        <div className="font-semibold text-sm">{emp.name}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{emp.employeeId}</div>
                      </TableCell>
                      {operations.map(op => {
                        const level = skillMap[op] || 0;
                        return (
                            <TableCell key={op} className="text-center p-2">
                            <Popover>
                              <PopoverTrigger asChild>
                                <div className={cn(
                                  "mx-auto h-9 w-9 rounded-xl border-2 flex items-center justify-center text-xs font-bold transition-all transform cursor-pointer hover:scale-110 hover:shadow-lg active:scale-95",
                                  getSkillLevelColor(level),
                                  updating === `${emp.employeeId}-${op}` && "animate-pulse opacity-50"
                                )}>
                                  {updating === `${emp.employeeId}-${op}` ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    level || '-'
                                  )}
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-48 p-2 rounded-2xl shadow-2xl border-none bg-white/90 backdrop-blur-md" side="bottom">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 px-2">Rate Proficiency</div>
                                <div className="grid grid-cols-5 gap-1">
                                  {[1, 2, 3, 4, 5].map((l) => (
                                    <button
                                      key={l}
                                      onClick={() => handleSkillUpdate(emp.employeeId, op, l)}
                                      className={cn(
                                        "h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all",
                                        level === l 
                                          ? "bg-primary text-primary-foreground shadow-inner" 
                                          : "hover:bg-primary/10 text-muted-foreground"
                                      )}
                                    >
                                      {l}
                                    </button>
                                  ))}
                                </div>
                                <div className="mt-2 pt-2 border-t grid grid-cols-1 gap-1">
                                  <button
                                    onClick={() => handleSkillUpdate(emp.employeeId, op, 0)}
                                    className="text-[10px] py-1 text-center hover:bg-red-50 text-red-500 font-bold rounded-lg transition-colors"
                                  >
                                    Reset / Remove
                                  </button>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right">
                        <Badge variant={avg >= 4 ? "default" : "secondary"}>
                          {avg.toFixed(1)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function OverviewCard({ title, value, icon }: any) {
  return (
    <Card className="border-none shadow-lg">
      <CardContent className="pt-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold mt-1">{value}</h3>
          </div>
          <div className="p-3 bg-secondary/30 rounded-full">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
