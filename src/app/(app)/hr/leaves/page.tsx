
"use client";

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClipboardList, Plus, Search, Calendar, User, Trash2, CheckCircle2, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function LeaveManagementPage() {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  // Form states
  const [formData, setFormData] = useState({
    employeeId: '',
    leaveType: 'Annual',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    totalDays: 1,
    isPaid: true,
    month: format(new Date(), 'yyyy-MM'),
    reason: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [leavesRes, empsRes] = await Promise.all([
        fetch('/api/hr/leaves'),
        fetch('/api/hr/employees')
      ]);
      
      if (leavesRes.ok) setLeaves(await leavesRes.json());
      if (empsRes.ok) setEmployees(await empsRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/hr/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        toast({ title: "Leave Added", description: "The leave record has been saved." });
        setIsDialogOpen(false);
        fetchData();
        // Reset form
        setFormData({
          employeeId: '',
          leaveType: 'Annual',
          startDate: format(new Date(), 'yyyy-MM-dd'),
          endDate: format(new Date(), 'yyyy-MM-dd'),
          totalDays: 1,
          isPaid: true,
          month: format(new Date(), 'yyyy-MM'),
          reason: ''
        });
      }
    } catch (err) {
      toast({ title: "Error", description: "Could not save leave.", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this leave record?")) return;
    
    try {
      const res = await fetch(`/api/hr/leaves/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: "Deleted", description: "Leave record removed." });
        fetchData();
      }
    } catch (err) {
      toast({ title: "Error", description: "Delete failed.", variant: "destructive" });
    }
  };

  const filteredLeaves = leaves.filter(l => 
    l.employeeName.toLowerCase().includes(search.toLowerCase()) || 
    l.employeeId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leave Management</h1>
          <p className="text-muted-foreground mt-1">Track employee leaves and manage balances.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full shadow-lg gap-2">
              <Plus className="h-4 w-4" /> Add Leave Request
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>New Leave Entry</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-medium">Employee</label>
                  <Select 
                    value={formData.employeeId} 
                    onValueChange={(v) => setFormData({...formData, employeeId: v})}
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
                  <label className="text-sm font-medium">Leave Type</label>
                  <Select 
                    value={formData.leaveType} 
                    onValueChange={(v) => {
                      const isPaid = !(['Unpaid', 'Other Unpaid'].includes(v));
                      setFormData({...formData, leaveType: v, isPaid});
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Annual">Annual (Paid)</SelectItem>
                      <SelectItem value="Sick">Sick Leave</SelectItem>
                      <SelectItem value="Maternity">Maternity</SelectItem>
                      <SelectItem value="Paternity">Paternity</SelectItem>
                      <SelectItem value="Compassionate">Compassionate</SelectItem>
                      <SelectItem value="Unpaid">Unpaid Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Payroll Month</label>
                  <Input 
                    type="month" 
                    value={formData.month} 
                    onChange={(e) => setFormData({...formData, month: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <Input 
                    type="date" 
                    value={formData.startDate} 
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <Input 
                    type="date" 
                    value={formData.endDate} 
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Total Days</label>
                  <Input 
                    type="number" 
                    step="0.5"
                    value={formData.totalDays} 
                    onChange={(e) => setFormData({...formData, totalDays: parseFloat(e.target.value)})}
                  />
                </div>

                <div className="flex items-center space-x-2 pt-8">
                  <input 
                    type="checkbox" 
                    checked={formData.isPaid} 
                    onChange={(e) => setFormData({...formData, isPaid: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label className="text-sm font-medium">Is Paid Leave?</label>
                </div>

                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-medium">Reason (Optional)</label>
                  <Input 
                    placeholder="Brief reason for leave..."
                    value={formData.reason} 
                    onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full">Save Leave Record</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <StatCard title="Active Leaves" value={leaves.filter(l => l.status === 'Approved').length} icon={<Calendar className="text-blue-500" />} />
        <StatCard title="Total Days (This Month)" value={leaves.reduce((a, b) => a + b.totalDays, 0)} icon={<Clock className="text-orange-500" />} />
        <StatCard title="Unpaid Days" value={leaves.filter(l => !l.isPaid).reduce((a, b) => a + b.totalDays, 0)} icon={<Trash2 className="text-red-500" />} />
        <StatCard title="Approval Rate" value="100%" icon={<CheckCircle2 className="text-green-500" />} />
      </div>

      <Card className="border-none shadow-2xl overflow-hidden bg-white/50 backdrop-blur-md">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle>Leave Records</CardTitle>
            <CardDescription>View and manage employee leave history.</CardDescription>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or ID..." 
              className="pl-10 rounded-full" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-secondary/20">
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Leave Type</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Total Days</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Payroll Month</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10">Loading leaves...</TableCell></TableRow>
              ) : filteredLeaves.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No leave records found.</TableCell></TableRow>
              ) : (
                filteredLeaves.map(leave => (
                  <TableRow key={leave.id} className="hover:bg-primary/5 transition-colors group">
                    <TableCell>
                      <div className="font-semibold">{leave.employeeName}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">{leave.employeeId}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50">
                        {leave.leaveType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {format(new Date(leave.startDate), 'dd MMM')} - {format(new Date(leave.endDate), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell className="font-bold">
                      {leave.totalDays} Days
                    </TableCell>
                    <TableCell>
                      <Badge className={leave.isPaid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"} variant="outline">
                        {leave.isPaid ? 'Paid' : 'Unpaid'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {leave.month}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDelete(leave.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full"
                      >
                        <Trash2 className="h-4 w-4" />
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

function StatCard({ title, value, icon }: any) {
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
