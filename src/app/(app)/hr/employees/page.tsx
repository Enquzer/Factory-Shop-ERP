
"use client";

import { useEffect, useState, useRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, 
  UserPlus, 
  Phone, 
  MapPin, 
  Pencil, 
  Trash2, 
  Trophy, 
  Banknote, 
  History as HistoryIcon, 
  ShieldCheck, 
  Target, 
  Loader2,
  TrendingUp,
  User,
  Camera,
  Upload,
  PlusCircle
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { format } from 'date-fns';
import Link from 'next/link';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/hr/employees');
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (employeeId: string) => {
    if (!confirm(`Are you sure you want to delete employee ${employeeId}?`)) return;
    
    try {
      const res = await fetch(`/api/hr/employees/${employeeId}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: "Deleted", description: "Employee removed successfully." });
        fetchEmployees();
      } else {
        throw new Error("Failed to delete");
      }
    } catch (err) {
      toast({ title: "Error", description: "Could not delete employee.", variant: "destructive" });
    }
  };

  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(search.toLowerCase()) || 
    e.employeeId.toLowerCase().includes(search.toLowerCase()) ||
    e.jobCenter.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employee Directory</h1>
          <p className="text-muted-foreground mt-1">Manage your workforce and their records.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search employees..." 
              className="pl-10 rounded-full" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Link href="/hr/employees/new">
            <Button className="rounded-full shadow-lg hover:shadow-primary/20 transition-all">
              <UserPlus className="mr-2 h-4 w-4" /> Add Employee
            </Button>
          </Link>
        </div>
      </div>

      <Card className="border-none shadow-xl bg-card/60 backdrop-blur-md overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-secondary/30">
              <TableRow>
                <TableHead className="w-[80px] pl-6">Profile</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Job Center</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Join Date</TableHead>
                <TableHead className="text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                    <p className="text-sm text-muted-foreground">Fetching records...</p>
                  </TableCell>
                </TableRow>
              ) : filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground italic">No employees found.</TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((emp) => (
                  <TableRow key={emp.employeeId} className="group hover:bg-primary/5 transition-colors">
                    <TableCell className="pl-6">
                      <Avatar className="h-10 w-10 border-2 border-background group-hover:border-primary/20 transition-all">
                        <AvatarImage src={emp.profilePicture} />
                        <AvatarFallback className="bg-primary/10 text-primary uppercase">
                          {emp.name.split(' ').map((n: string) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold">{emp.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{emp.employeeId}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal bg-secondary/50">
                        {emp.jobCenter}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${emp.status === 'Active' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className="text-sm font-medium">{emp.status}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-tighter">
                          <Trophy className="h-3 w-3 text-yellow-500" /> {emp.loyaltyStatus || 'Member'}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-tighter">
                          <Banknote className="h-3 w-3 text-green-500" /> {emp.baseSalary?.toLocaleString() || '0'} Br
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-medium text-muted-foreground">
                      {emp.joinedDate || 'N/A'}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-2">
                        <EmployeeDetailDialog employee={emp} />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-red-500 hover:bg-red-500/10"
                          onClick={() => handleDelete(emp.employeeId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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

function EmployeeDetailDialog({ employee }: { employee: any }) {
  const { token } = useAuth();
  const [actions, setActions] = useState<any[]>([]);
  const [training, setTraining] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [photo, setPhoto] = useState(employee.profilePicture);
  const [uploading, setUploading] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [editData, setEditData] = useState({
    departmentId: employee.departmentId?.toString() || 'none',
    managerId: employee.managerId || 'none',
    status: employee.status
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetch('/api/hr/departments').then(res => res.json()).then(setDepartments);
    fetch('/api/hr/employees').then(res => res.json()).then(setAllEmployees);
  }, []);


  useEffect(() => {
    const fetchData = async () => {
      try {
        const [actRes, trRes, exRes] = await Promise.all([
          fetch(`/api/hr/actions?employeeId=${employee.employeeId}`),
          fetch(`/api/hr/training?employeeId=${employee.employeeId}`),
          fetch(`/api/hr/exams?employeeId=${employee.employeeId}`)
        ]);
        if (actRes.ok) setActions(await actRes.json());
        if (trRes.ok) setTraining(await trRes.json());
        if (exRes.ok) setExams(await exRes.json());
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, [employee.employeeId]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: uploadFormData,
      });

      if (res.ok) {
        const data = await res.json();
        const patchRes = await fetch('/api/hr/employees', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employeeId: employee.employeeId, profilePicture: data.url }),
        });

        if (patchRes.ok) {
          setPhoto(data.url);
          toast({ title: "Updated", description: "Profile photo updated successfully." });
        }
      }
    } catch (err) {
      toast({ title: "Error", description: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleQuickUpdate = async (updates: any) => {
    try {
      const res = await fetch('/api/hr/employees', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: employee.employeeId, ...updates }),
      });
      if (res.ok) {
        toast({ title: "Updated", description: "Employee record updated." });
      }
    } catch (err) {
      console.error(err);
    }
  };


  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:bg-blue-500/10">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="sr-only">Employee Details: {employee.name}</DialogTitle>
          <DialogDescription className="sr-only">Comprehensive view and management of employee profile, assignments, and performance.</DialogDescription>
          <div className="flex flex-col md:flex-row items-center gap-6 pb-6 border-b">

            <div className="relative group">
              <Avatar className="h-24 w-24 border-4 border-primary/10 shadow-xl transition-all group-hover:brightness-50">
                <AvatarImage src={photo} />
                <AvatarFallback className="text-3xl bg-secondary/50 font-bold">{employee.name[0]}</AvatarFallback>
              </Avatar>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handlePhotoUpload} 
              />
              <Button 
                size="icon"
                variant="ghost"
                className="absolute inset-0 m-auto h-10 w-10 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
              </Button>
            </div>
            <div className="text-center md:text-left">
              <DialogTitle className="text-3xl font-bold tracking-tight">{employee.name}</DialogTitle>
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-3">
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">{employee.jobCenter}</Badge>
                <Badge variant="outline" className="font-mono">{employee.employeeId}</Badge>
                <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-200">
                  {employee.loyaltyStatus || 'Standard Member'}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-8 py-8">
          <div className="space-y-8">
            <section>
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4 flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Contact & Personal
              </h3>
              <div className="bg-secondary/20 p-5 rounded-2xl space-y-4 border border-border/50">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Phone</span>
                  <span className="text-sm font-semibold">{employee.phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Joined Date</span>
                  <span className="text-sm font-semibold">{employee.joinedDate || 'N/A'}</span>
                </div>
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-3 w-3" /> Residential Address
                  </span>
                  <p className="text-sm leading-relaxed text-foreground/80">{employee.address || 'No address provided'}</p>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-green-500" /> Organization & Status
              </h3>
              <div className="bg-secondary/20 p-5 rounded-2xl space-y-4 border border-border/50">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">Department</label>
                  <Select 
                    value={editData.departmentId} 
                    onValueChange={(val) => {
                      setEditData(prev => ({ ...prev, departmentId: val }));
                      handleQuickUpdate({ departmentId: val === 'none' ? null : parseInt(val) });
                    }}
                  >
                    <SelectTrigger className="h-9 bg-background/50">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Department</SelectItem>
                      {departments.map(dept => (
                        <SelectItem key={dept.id} value={dept.id.toString()}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">Reporting Manager</label>
                  <Select 
                    value={editData.managerId} 
                    onValueChange={(val) => {
                      setEditData(prev => ({ ...prev, managerId: val }));
                      handleQuickUpdate({ managerId: val === 'none' ? null : val });
                    }}
                  >
                    <SelectTrigger className="h-9 bg-background/50">
                      <SelectValue placeholder="Select manager" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Manager (Top Level)</SelectItem>
                      {allEmployees.filter(e => e.employeeId !== employee.employeeId).map(emp => (
                        <SelectItem key={emp.employeeId} value={emp.employeeId}>{emp.name} ({emp.employeeId})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">Employment Status</label>
                  <Select 
                    value={editData.status} 
                    onValueChange={(val) => {
                      setEditData(prev => ({ ...prev, status: val }));
                      handleQuickUpdate({ status: val });
                    }}
                  >
                    <SelectTrigger className="h-9 bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                      <SelectItem value="On Leave">On Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>


            <SalaryAdjustmentForm employee={employee} />
          </div>

          <div className="space-y-8">
            <section>
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4 flex items-center gap-2">
                <HistoryIcon className="h-4 w-4 text-blue-500" /> Career & Action History
              </h3>
              <div className="space-y-4">
                {actions.length > 0 ? (
                  actions.map((act) => (
                    <div key={act.id} className="border-l-2 border-primary/20 pl-4 py-1 relative">
                      <div className="absolute -left-[5px] top-2 h-2 w-2 rounded-full bg-primary" />
                      <div className="flex justify-between items-start">
                        <p className="text-[10px] font-bold text-primary uppercase tracking-wider">{act.actionType}</p>
                        <span className="text-[9px] text-muted-foreground">{act.effectiveDate}</span>
                      </div>
                      <p className="text-xs font-semibold">{act.title}</p>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">{act.description}</p>
                    </div>
                  ))
                ) : (
                  <div className="border-l-2 border-primary/20 pl-5 py-1">
                    <p className="text-[10px] font-bold text-primary mb-1 uppercase tracking-wider">Advancement Track</p>
                    <p className="text-sm text-foreground/80 italic">{employee.promotionTrack || 'No advancement history logged.'}</p>
                  </div>
                )}
                
                <div className="border-l-2 border-primary/20 pl-5 py-1">
                  <p className="text-[10px] font-bold text-primary mb-1 uppercase tracking-wider">Certifications & Exams</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {exams.length > 0 ? (
                      exams.map((ex) => (
                        <Badge key={ex.id} variant={ex.result === 'Pass' ? 'default' : 'destructive'} className={ex.result === 'Pass' ? 'bg-green-500' : ''}>
                          {ex.examTitle}: {ex.score}% ({ex.result})
                        </Badge>
                      ))
                    ) : (
                      <span className="text-[11px] text-muted-foreground italic">No formal certifications recorded.</span>
                    )}
                  </div>
                </div>

                <div className="border-l-2 border-primary/20 pl-5 py-1">
                  <p className="text-[10px] font-bold text-primary mb-1 uppercase tracking-wider">Training Modules</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {training.length > 0 ? (
                      training.map((tr) => (
                        <Badge key={tr.id} variant="outline" className={tr.status === 'Completed' ? 'border-green-500 text-green-600' : ''}>
                          {tr.moduleTitle} ({tr.status})
                        </Badge>
                      ))
                    ) : (
                      <span className="text-[11px] text-muted-foreground italic">No training history found.</span>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4 flex items-center gap-2">
                <Target className="h-4 w-4 text-red-500" /> Operation Skills
              </h3>
              <div className="flex flex-wrap gap-2 bg-secondary/10 p-4 rounded-2xl border border-dashed border-border">
                {employee.skills && employee.skills.length > 0 ? (
                  employee.skills.map((skill: any, i: number) => (
                    <Badge key={i} className="px-3 py-1 bg-background text-foreground border-border hover:bg-secondary">
                      {skill.operation} <span className="ml-2 text-primary font-bold">Lvl {skill.level}</span>
                    </Badge>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic w-full text-center py-2">No skills logged in matrix.</p>
                )}
              </div>
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SalaryAdjustmentForm({ employee }: { employee: any }) {
  const [amount, setAmount] = useState(0);
  const [basis, setBasis] = useState('Gross');
  const [type, setType] = useState('Increment');
  const [reason, setReason] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const { toast } = useToast();

  const handleAdjust = async () => {
    if (amount <= 0) return;
    try {
      const res = await fetch('/api/hr/settings/salary-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee.employeeId,
          oldSalary: employee.baseSalary,
          newSalary: type === 'Increment' ? employee.baseSalary + amount : employee.baseSalary - amount,
          changeType: type,
          effectiveDate: date,
          basis,
          reason,
          executedBy: 'HR Manager'
        })
      });

      if (res.ok) {
        toast({ title: "Salary Updated", description: "Adjustment recorded in history." });
        window.location.reload(); // Refresh to show new salary
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to record adjustment.", variant: "destructive" });
    }
  };

  return (
    <section>
      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-purple-500" /> Salary Adjustment
      </h3>
      <div className="bg-secondary/20 p-5 rounded-2xl space-y-4 border border-border/50">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase">Change Type</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Increment">Increment</SelectItem>
                <SelectItem value="Demotion">Demotion</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase">Adjustment Amount (Br)</label>
            <Input 
              type="number" 
              className="h-8" 
              value={amount} 
              onChange={(e) => setAmount(parseFloat(e.target.value))} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase">Adjustment Basis</label>
            <Select value={basis} onValueChange={setBasis}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Gross">On Gross (Base)</SelectItem>
                <SelectItem value="Net">On Net (Manual Adjustment)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase">Effective Date</label>
            <Input 
              type="date" 
              className="h-8 text-xs" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
            />
          </div>
          <div className="space-y-2 col-span-2">
            <label className="text-[10px] font-bold uppercase">Reason for Change</label>
            <Input 
              placeholder="e.g. Annual Review, Promotion" 
              className="h-8" 
              value={reason} 
              onChange={(e) => setReason(e.target.value)} 
            />
          </div>
        </div>
        <Button onClick={handleAdjust} className="w-full h-8 text-xs gap-2" variant="secondary">
          Confirm Adjustment
        </Button>
      </div>
    </section>
  );
}
