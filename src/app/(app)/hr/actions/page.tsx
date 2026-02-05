
"use client";

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Award, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  FileText, 
  Plus, 
  Search, 
  Download,
  User,
  Calendar,
  Briefcase
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { exportEmployeeActionLetterToPDF } from '@/lib/pdf-export-utils';

export default function RewardDisciplinePage() {
  const [actions, setActions] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  // Form State
  const [formData, setFormData] = useState({
    employeeId: '',
    actionType: 'Warning',
    title: '',
    description: '',
    newPosition: '',
    newSalary: '',
    effectiveDate: format(new Date(), 'yyyy-MM-dd'),
    issuedBy: 'HR Manager'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [actionsRes, employeesRes] = await Promise.all([
        fetch('/api/hr/actions'),
        fetch('/api/hr/employees')
      ]);
      if (actionsRes.ok) setActions(await actionsRes.json());
      if (employeesRes.ok) setEmployees(await employeesRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    const selectedEmp = employees.find(e => e.employeeId === formData.employeeId);
    if (!selectedEmp) {
      toast({ title: "Error", description: "Please select an employee", variant: "destructive" });
      return;
    }

    const payload = {
      ...formData,
      oldPosition: selectedEmp.jobCenter,
      oldSalary: selectedEmp.baseSalary,
      newSalary: formData.newSalary ? parseFloat(formData.newSalary) : undefined
    };

    try {
      const res = await fetch('/api/hr/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast({ title: "Success", description: "Action recorded successfully" });
        setIsModalOpen(false);
        fetchData();
        // Option to download immediately
        const actionForPdf = {
          ...payload,
          employeeName: selectedEmp.name,
          currentPosition: selectedEmp.jobCenter
        };
        exportEmployeeActionLetterToPDF(actionForPdf);
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to record action", variant: "destructive" });
    }
  };

  const filteredActions = actions.filter(a => 
    a.employeeName.toLowerCase().includes(search.toLowerCase()) ||
    a.employeeId.toLowerCase().includes(search.toLowerCase()) ||
    a.title.toLowerCase().includes(search.toLowerCase())
  );

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'Warning': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'Reward': return <Award className="h-4 w-4 text-yellow-500" />;
      case 'Promotion': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'Demotion': return <TrendingDown className="h-4 w-4 text-orange-500" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getActionBadge = (type: string) => {
    switch (type) {
      case 'Warning': return <Badge variant="destructive">{type}</Badge>;
      case 'Reward': return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-none">{type}</Badge>;
      case 'Promotion': return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none">{type}</Badge>;
      case 'Demotion': return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-none">{type}</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Reward & Discipline
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage official letters, promotions, and disciplinary actions.
          </p>
        </div>
        
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full shadow-lg hover:shadow-primary/20 transition-all gap-2">
              <Plus className="h-4 w-4" /> Issue New Letter/Action
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>New HR Action / Letter</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Employee</label>
                <Select 
                  onValueChange={(val) => setFormData({ ...formData, employeeId: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.employeeId} value={emp.employeeId}>
                        {emp.name} ({emp.employeeId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Action Type</label>
                <Select 
                  defaultValue="Warning"
                  onValueChange={(val) => setFormData({ ...formData, actionType: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Warning">Warning Letter</SelectItem>
                    <SelectItem value="Reward">Reward / Appreciation</SelectItem>
                    <SelectItem value="Promotion">Promotion</SelectItem>
                    <SelectItem value="Demotion">Demotion</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-sm font-medium">Subject / Title</label>
                <Input 
                  placeholder="e.g. First Written Warning for Tardiness"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-sm font-medium">Description (For Letter Body)</label>
                <textarea 
                  className="w-full min-h-[100px] p-3 rounded-md border bg-background text-sm"
                  placeholder="Write the full content of the letter here..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {(formData.actionType === 'Promotion' || formData.actionType === 'Demotion') && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">New Position</label>
                    <Input 
                      placeholder="e.g. Senior Operator"
                      value={formData.newPosition}
                      onChange={(e) => setFormData({ ...formData, newPosition: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">New Salary (Br)</label>
                    <Input 
                      type="number"
                      placeholder="e.g. 15000"
                      value={formData.newSalary}
                      onChange={(e) => setFormData({ ...formData, newSalary: e.target.value })}
                    />
                  </div>
                </>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Effective Date</label>
                <Input 
                  type="date"
                  value={formData.effectiveDate}
                  onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Issued By</label>
                <Input 
                  value={formData.issuedBy}
                  onChange={(e) => setFormData({ ...formData, issuedBy: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate}>Issue Action & Generate PDF</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-xl bg-card/40 backdrop-blur-md overflow-hidden">
        <CardHeader className="bg-secondary/10 border-b">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name, ID or title..." 
                className="w-64 border-none shadow-none focus-visible:ring-0 bg-transparent"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-secondary/5">
              <TableRow>
                <TableHead className="pl-6">Employee</TableHead>
                <TableHead>Action Type</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Effective Date</TableHead>
                <TableHead>Issued By</TableHead>
                <TableHead className="text-right pr-6">Letter</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <div className="flex justify-center items-center gap-2 text-muted-foreground">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                      Loading records...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredActions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No reward or disciplinary actions found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredActions.map((action) => (
                  <TableRow key={action.id} className="group hover:bg-secondary/5 transition-colors">
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-full">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-semibold">{action.employeeName}</div>
                          <div className="text-xs text-muted-foreground">{action.employeeId}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getActionIcon(action.actionType)}
                        {getActionBadge(action.actionType)}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate font-medium">
                      {action.title}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs">
                        <Calendar className="h-3 w-3" />
                        {action.effectiveDate}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground font-medium">
                      {action.issuedBy}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="gap-2 hover:bg-primary/10 text-primary"
                        onClick={() => exportEmployeeActionLetterToPDF(action)}
                      >
                        <Download className="h-4 w-4" /> Letter
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
