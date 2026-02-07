'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  ClipboardList, 
  Plus, 
  Calendar as CalendarIcon, 
  Search, 
  Trash2, 
  Wrench, 
  User, 
  Clock, 
  ChevronRight,
  MoreVertical,
  Settings,
  Edit,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
const MachineIcon = Wrench;
const UserIcon = User;
import { format } from 'date-fns';

interface ResourcePlan {
  id: number;
  planName: string;
  description: string;
  startDate: string;
  endDate: string;
  status: string;
  createdBy: string;
  createdAt: string;
}

interface Allocation {
  resourceType: 'Machine' | 'Operator';
  resourceId: string;
  resourceName?: string;
  shift: string;
  notes: string;
}

export default function ResourcePlanningPage() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<ResourcePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Form State
  const [newPlan, setNewPlan] = useState({
    planName: '',
    description: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    status: 'Active' as const
  });
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    const headers = {
      ...(options.headers || {}),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
    return fetch(url, { ...options, headers });
  };

  useEffect(() => {
    fetchPlans();
    fetchResources();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth('/api/ie/resource-planning');
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast({
        title: "Error",
        description: "Failed to fetch resource plans",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchResources = async () => {
    try {
      const machineRes = await fetchWithAuth('/api/ie/machines');
      if (machineRes.ok) {
        const data = await machineRes.json();
        setMachines(data.data || []);
      }
      
      const operatorRes = await fetchWithAuth('/api/ie/machines/operators?available=true');
      if (operatorRes.ok) {
        const data = await operatorRes.json();
        setOperators(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching resources:', error);
    }
  };

  const handleCreatePlan = async () => {
    if (!newPlan.planName || !newPlan.startDate || !newPlan.endDate) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const res = await fetchWithAuth('/api/ie/resource-planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: newPlan,
          allocations
        })
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: "Resource plan created successfully",
        });
        setIsCreateDialogOpen(false);
        resetForm();
        fetchPlans();
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create plan');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setNewPlan({
      planName: '',
      description: '',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      status: 'Active'
    });
    setAllocations([]);
  };

  const addAllocation = () => {
    setAllocations([...allocations, {
      resourceType: 'Machine',
      resourceId: '',
      shift: 'Day',
      notes: ''
    }]);
  };

  const removeAllocation = (index: number) => {
    setAllocations(allocations.filter((_, i) => i !== index));
  };

  const updateAllocation = (index: number, field: keyof Allocation, value: string) => {
    const updated = [...allocations];
    if (field === 'resourceType') {
      // Clear resource ID when switching between Machine and Operator
      updated[index] = { ...updated[index], [field]: value as 'Machine' | 'Operator', resourceId: '' };
    } else {
      (updated[index] as any)[field] = value;
    }
    setAllocations(updated);
  };

  const viewPlanDetail = async (id: number) => {
    try {
      setLoadingDetail(true);
      setIsDetailDialogOpen(true);
      const res = await fetchWithAuth(`/api/ie/resource-planning/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedPlan(data);
      }
    } catch (error) {
      console.error('Error fetching plan detail:', error);
      toast({
        title: "Error",
        description: "Failed to fetch plan details",
        variant: "destructive"
      });
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDeletePlan = async (id: number) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;

    try {
      const res = await fetchWithAuth(`/api/ie/resource-planning/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast({
          title: "Deleted",
          description: "Plan deleted successfully",
        });
        fetchPlans();
        if (selectedPlan?.id === id) setIsDetailDialogOpen(false);
      }
    } catch (error) {
      console.error('Error deleting plan:', error);
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom duration-700 p-6">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resource Planning</h1>
          <p className="text-muted-foreground">
            Optically plan and track machine and operator availability across shifts.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <CalendarIcon className="mr-2 h-4 w-4" />
            Full Schedule
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Plan Resources
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">Create Resource Plan</DialogTitle>
                <DialogDescription>
                  Define a new schedule for machine and operator allocations.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="planName">Plan Name *</Label>
                    <Input 
                      id="planName" 
                      placeholder="e.g. Week 7 Production" 
                      value={newPlan.planName}
                      onChange={(e) => setNewPlan({...newPlan, planName: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Start Date *</Label>
                      <Input 
                        id="startDate" 
                        type="date" 
                        value={newPlan.startDate}
                        onChange={(e) => setNewPlan({...newPlan, startDate: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate">End Date *</Label>
                      <Input 
                        id="endDate" 
                        type="date" 
                        value={newPlan.endDate}
                        onChange={(e) => setNewPlan({...newPlan, endDate: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea 
                      id="description" 
                      placeholder="Optional notes about this plan..." 
                      className="min-h-[120px]"
                      value={newPlan.description}
                      onChange={(e) => setNewPlan({...newPlan, description: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t pt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-blue-500" />
                    Allocations
                  </h3>
                  <Button variant="outline" size="sm" onClick={addAllocation}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Allocation
                  </Button>
                </div>

                <div className="border rounded-xl overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Resource</TableHead>
                        <TableHead>Shift</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allocations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">
                            No resources added. Click "Add Allocation" to start.
                          </TableCell>
                        </TableRow>
                      ) : (
                        allocations.map((alloc, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <Select 
                                value={alloc.resourceType} 
                                onValueChange={(val: any) => updateAllocation(idx, 'resourceType', val)}
                              >
                                <SelectTrigger className="w-[120px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Machine">Machine</SelectItem>
                                  <SelectItem value="Operator">Operator</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Select 
                                value={alloc.resourceId} 
                                onValueChange={(val) => updateAllocation(idx, 'resourceId', val)}
                              >
                                <SelectTrigger className="min-w-[200px]">
                                  <SelectValue placeholder="Select resource" />
                                </SelectTrigger>
                                <SelectContent>
                                  {alloc.resourceType === 'Machine' ? (
                                    machines.map(m => (
                                      <SelectItem key={m.id} value={m.id.toString()}>
                                        {m.machineCode} - {m.machineName}
                                      </SelectItem>
                                    ))
                                  ) : (
                                    operators.map(o => (
                                      <SelectItem key={o.employeeId} value={o.employeeId}>
                                        {o.name} ({o.employeeId})
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Select 
                                value={alloc.shift} 
                                onValueChange={(val) => updateAllocation(idx, 'shift', val)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Day">Day</SelectItem>
                                  <SelectItem value="Night">Night</SelectItem>
                                  <SelectItem value="Overtime">Overtime</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input 
                                placeholder="Notes..." 
                                value={alloc.notes}
                                onChange={(e) => updateAllocation(idx, 'notes', e.target.value)}
                              />
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => removeAllocation(idx)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreatePlan}>Create Plan</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
          <p className="text-muted-foreground animate-pulse">Loading planning schedules...</p>
        </div>
      ) : plans.length === 0 ? (
        <Card className="border-2 border-dashed bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center h-80 space-y-6 text-center">
            <div className="p-4 bg-muted rounded-full">
              <CalendarIcon className="h-12 w-12 text-muted-foreground/60" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold tracking-tight">No Resource Plans Found</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Start optimization by creating your first resource allocation plan for machines and operators.
              </p>
            </div>
            <Button size="lg" onClick={() => setIsCreateDialogOpen(true)} className="rounded-full px-8 shadow-lg">
              <Plus className="mr-2 h-5 w-5" />
              Create Your First Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card key={plan.id} className="group hover:shadow-xl transition-all duration-300 border-l-4 border-l-blue-500 overflow-hidden relative">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <Badge variant={plan.status === 'Active' ? 'default' : 'secondary'} className="mb-2">
                    {plan.status}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
                <CardTitle className="text-xl group-hover:text-blue-600 transition-colors cursor-pointer" onClick={() => viewPlanDetail(plan.id)}>
                  {plan.planName}
                </CardTitle>
                <CardDescription className="line-clamp-2 min-h-[3rem]">
                  {plan.description || "No description provided."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {format(new Date(plan.startDate), 'MMM d')} - {format(new Date(plan.endDate), 'MMM d, yyyy')}
                  </div>
                </div>
                
                <div className="pt-4 flex items-center justify-between border-t border-muted">
                  <div className="flex -space-x-2">
                    <div className="h-8 w-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center z-10">
                      <MachineIcon className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="h-8 w-8 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center z-0">
                      <UserIcon className="h-4 w-4 text-indigo-600" />
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-blue-600 font-medium hover:bg-blue-50" onClick={() => viewPlanDetail(plan.id)}>
                    View Schedule
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <DialogTitle className="text-3xl font-bold">
                {loadingDetail ? "Loading Plan..." : selectedPlan?.planName}
              </DialogTitle>
              {!loadingDetail && selectedPlan && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => window.print()}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeletePlan(selectedPlan.id)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              )}
            </div>
            {!loadingDetail && selectedPlan && (
              <DialogDescription className="text-lg">
                Scheduling period: <span className="font-semibold text-foreground">{format(new Date(selectedPlan.startDate), 'MMMM d')} to {format(new Date(selectedPlan.endDate), 'MMMM d, yyyy')}</span>
              </DialogDescription>
            )}
            {loadingDetail && (
              <DialogDescription>Please wait while we fetch the plan details.</DialogDescription>
            )}
          </DialogHeader>

          {loadingDetail ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p>Loading schedule details...</p>
            </div>
          ) : selectedPlan && (
            <>

              <div className="space-y-6 py-4">
                <div className="p-4 bg-muted/40 rounded-xl border border-muted">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    Plan Overview
                  </h4>
                  <p className="text-muted-foreground italic">
                    {selectedPlan.description || "The planner did not provide a detailed description for this schedule."}
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Resource Allocations
                  </h3>
                  <div className="border rounded-xl overflow-hidden shadow-sm">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Resource</TableHead>
                          <TableHead>Shift</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedPlan.allocations?.map((alloc: any) => (
                          <TableRow key={alloc.id} className="hover:bg-muted/30">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {alloc.resourceType === 'Machine' ? 
                                  <MachineIcon className="h-4 w-4 text-blue-500" /> : 
                                  <UserIcon className="h-4 w-4 text-indigo-500" />
                                }
                                <span className="font-medium">{alloc.resourceType}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold">{alloc.resourceName || alloc.resourceId}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                {alloc.shift}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 text-green-600 text-sm">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Allocated
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground whitespace-pre-wrap max-w-xs overflow-hidden text-ellipsis">
                              {alloc.notes || "No special instructions."}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-4">
                    <div className="p-3 bg-blue-100 rounded-xl">
                      <MachineIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-blue-900">Machine Cap.</h4>
                      <p className="text-3xl font-black text-blue-700">
                        {selectedPlan.allocations?.filter((a: any) => a.resourceType === 'Machine').length}
                      </p>
                      <p className="text-sm text-blue-600/80">Active machines allocated</p>
                    </div>
                  </div>
                  <div className="p-5 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-start gap-4">
                    <div className="p-3 bg-indigo-100 rounded-xl">
                      <UserIcon className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-indigo-900">Workforce</h4>
                      <p className="text-3xl font-black text-indigo-700">
                        {selectedPlan.allocations?.filter((a: any) => a.resourceType === 'Operator').length}
                      </p>
                      <p className="text-sm text-indigo-600/80">Operators scheduled</p>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="bg-muted/30 -mx-6 -mb-6 p-6 mt-4">
                <div className="flex justify-between items-center w-full">
                  <div className="text-xs text-muted-foreground">
                    Created by <span className="font-medium text-foreground">{selectedPlan.createdBy}</span> on {format(new Date(selectedPlan.createdAt), 'PPp')}
                  </div>
                  <Button onClick={() => setIsDetailDialogOpen(false)}>Close View</Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}