
"use client";

import { useEffect, useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Plus, 
  Search, 
  Users, 
  ChevronRight, 
  ChevronDown, 
  MoreVertical, 
  Edit2, 
  UserPlus, 
  FolderPlus,
  ArrowLeft,
  Loader2,
  Trash2,
  GitBranch,
  Building2,
  LayoutGrid,
  Settings,
  X,
  Minus,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

type Employee = {
  employeeId: string;
  name: string;
  jobCenter: string;
  departmentId?: number;
  managerId?: string;
  profilePicture?: string;
};

type Department = {
  id: number;
  name: string;
  managerId?: string;
  managerName?: string;
};

export default function OrgChartPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'hierarchy' | 'departments'>('hierarchy');
  const { toast } = useToast();

  const [isDeptDialogOpen, setIsDeptDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, deptRes] = await Promise.all([
        fetch('/api/hr/employees'),
        fetch('/api/hr/departments')
      ]);
      if (empRes.ok) setEmployees(await empRes.json());
      if (deptRes.ok) setDepartments(await deptRes.json());
    } catch (err) {
      toast({ title: "Error", description: "Failed to load hierarchy data.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDept = async (name: string, managerId?: string) => {
    try {
      const res = await fetch('/api/hr/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, managerId })
      });
      if (res.ok) {
        toast({ title: "Success", description: "Department created." });
        fetchData();
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to create department.", variant: "destructive" });
    }
  };

  const handleUpdateDept = async (name: string, managerId?: string) => {
    if (!selectedDept) return;
    try {
      const res = await fetch('/api/hr/departments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedDept.id, name, managerId })
      });
      if (res.ok) {
        toast({ title: "Updated", description: "Department updated." });
        fetchData();
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to update department.", variant: "destructive" });
    }
  };


  const handleUpdateEmployee = async (employeeId: string, updates: Partial<Employee>) => {
    try {
      const res = await fetch('/api/hr/employees', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, ...updates })
      });
      if (res.ok) {
        toast({ title: "Updated", description: "Employee assignment changed." });
        fetchData();
      }
    } catch (err) {
      toast({ title: "Error", description: "Update failed.", variant: "destructive" });
    }
  };

  // Hierarchy building logic
  const hierarchy = useMemo(() => {
    if (employees.length === 0) return [];

    const map: Record<string, any> = {};
    const root: any[] = [];

    // Create the map
    employees.forEach(emp => {
      map[emp.employeeId] = { ...emp, children: [] };
    });

    // Build the tree
    employees.forEach(emp => {
      if (emp.managerId && emp.managerId !== 'none' && map[emp.managerId] && emp.managerId !== emp.employeeId) {
        map[emp.managerId].children.push(map[emp.employeeId]);
      } else {
        root.push(map[emp.employeeId]);
      }
    });

    // Circular Reference Protection: 
    // If we have employees but no root was found, it means there's a loop.
    // We'll force the first employee as a root so the user can see and fix it.
    if (root.length === 0 && employees.length > 0) {
      root.push(map[employees[0].employeeId]);
      // Remove it from wherever it was incorrectly placed as a child
      Object.values(map).forEach((node: any) => {
        node.children = node.children.filter((child: any) => child.employeeId !== employees[0].employeeId);
      });
    }

    return root;
  }, [employees]);

  if (loading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Building organizational structure...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/hr">
            <Button variant="outline" size="icon" className="rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Organizational Chart</h1>
            <p className="text-muted-foreground">Dynamic workforce hierarchy and department management.</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            variant={viewMode === 'hierarchy' ? 'default' : 'outline'} 
            onClick={() => setViewMode('hierarchy')}
            className="rounded-full gap-2"
          >
            <GitBranch className="h-4 w-4" /> Reporting Hierarchy
          </Button>
          <Button 
            variant={viewMode === 'departments' ? 'default' : 'outline'} 
            onClick={() => setViewMode('departments')}
            className="rounded-full gap-2"
          >
            <Building2 className="h-4 w-4" /> Department View
          </Button>
          <Dialog open={isDeptDialogOpen} onOpenChange={(open) => {
            setIsDeptDialogOpen(open);
            if (!open) setSelectedDept(null);
          }}>
            <DialogTrigger asChild>
              <Button className="rounded-full gap-2 shadow-lg shadow-indigo-500/20">
                <FolderPlus className="h-4 w-4" /> Add Department
              </Button>
            </DialogTrigger>
            <DepartmentDialogContent 
              employees={employees} 
              onSave={selectedDept ? handleUpdateDept : handleCreateDept} 
              onClose={() => setIsDeptDialogOpen(false)} 
              department={selectedDept || undefined}
            />
          </Dialog>

        </div>
      </div>

      <Card className="border-none shadow-xl bg-card/60 backdrop-blur-md min-h-[600px]">
        <CardContent className="p-8">
          {viewMode === 'hierarchy' ? (
            <div className="overflow-x-auto pb-8">
              <div className="flex flex-col items-center">
                {hierarchy.map(node => (
                  <OrgNode 
                    key={node.employeeId} 
                    node={node} 
                    allEmployees={employees}
                    departments={departments}
                    onUpdate={handleUpdateEmployee}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {departments.map(dept => (
                <DepartmentCard 
                  key={dept.id} 
                  department={dept} 
                  employees={employees.filter(e => e.departmentId === dept.id)}
                  allEmployees={employees}
                  onUpdateEmployee={handleUpdateEmployee}
                  onEditDept={() => {
                    setSelectedDept(dept);
                    setIsDeptDialogOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function OrgNode({ node, level = 0, allEmployees, departments, onUpdate }: { node: any, level?: number, allEmployees: Employee[], departments: Department[], onUpdate: any }) {
  const [expanded, setExpanded] = useState(true);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isQuickMoveOpen, setIsQuickMoveOpen] = useState(false);

  return (
    <div className="flex flex-col items-center">
      <div className="relative group/node">
        {level > 0 && <div className="absolute -top-4 left-1/2 h-4 w-px bg-primary/20" />}
        
        {/* Top "+" Button - Change Manager */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 opacity-0 group-hover/node:opacity-100 transition-opacity z-10 flex gap-1">
          <Dialog open={isQuickMoveOpen} onOpenChange={setIsQuickMoveOpen}>
            <DialogTrigger asChild>
              <Button size="icon" variant="secondary" className="h-6 w-6 rounded-full shadow-md border border-primary/20 hover:bg-primary hover:text-white transition-all">
                <ArrowUp className="h-3 w-3" />
              </Button>
            </DialogTrigger>
            <ChangeManagerQuickDialog 
              employee={node} 
              allEmployees={allEmployees} 
              onUpdate={onUpdate} 
              onClose={() => setIsQuickMoveOpen(false)}
            />
          </Dialog>
          {node.managerId && node.managerId !== 'none' && (
             <Button 
               size="icon" 
               variant="destructive" 
               className="h-6 w-6 rounded-full shadow-md transition-all"
               onClick={() => onUpdate(node.employeeId, { managerId: 'none' })}
               title="Unlink from Manager"
             >
               <Minus className="h-3 w-3" />
             </Button>
          )}
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Card className={`relative w-64 p-4 border-2 transition-all hover:border-primary/50 hover:shadow-2xl cursor-pointer
              ${node.children.length > 0 ? 'border-primary/20 bg-primary/5' : 'border-border bg-card'}`}>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                  <AvatarImage src={node.profilePicture} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">{node.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{node.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate uppercase font-medium tracking-wider">{node.jobCenter}</p>
                </div>
                {node.children.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 hover:bg-primary/10 rounded-full" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpanded(!expanded);
                    }}
                  >
                    {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </Card>
          </DialogTrigger>
          <EmployeeAssignmentDialog 
            employee={node} 
            allEmployees={allEmployees} 
            departments={departments} 
            onUpdate={onUpdate} 
          />
        </Dialog>

        {/* Bottom "+" Button - Add Subordinate */}
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover/node:opacity-100 transition-opacity z-10 flex gap-1">
          <Dialog open={isQuickAddOpen} onOpenChange={setIsQuickAddOpen}>
            <DialogTrigger asChild>
              <Button size="icon" variant="default" className="h-6 w-6 rounded-full shadow-md shadow-primary/20 hover:scale-110 transition-all">
                <Plus className="h-3 w-3" />
              </Button>
            </DialogTrigger>
            <AddSubordinateQuickDialog 
              manager={node} 
              allEmployees={allEmployees} 
              onUpdate={onUpdate} 
              onClose={() => setIsQuickAddOpen(false)}
            />
          </Dialog>
        </div>
      </div>


      {expanded && node.children.length > 0 && (
        <div className="flex flex-col items-center mt-4">
          <div className="h-4 w-px bg-primary/20" />
          <div className="flex gap-4 relative pt-4">
            <div className="absolute top-0 left-0 right-0 h-px bg-primary/20 mx-auto w-[calc(100%-2rem)]" />
            {node.children.map((child: any) => (
              <OrgNode 
                key={child.employeeId} 
                node={child} 
                level={level + 1} 
                allEmployees={allEmployees} 
                departments={departments}
                onUpdate={onUpdate}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DepartmentCard({ department, employees, allEmployees, onUpdateEmployee, onEditDept }: { department: Department, employees: Employee[], allEmployees: Employee[], onUpdateEmployee: any, onEditDept: any }) {
  return (
    <Card className="border border-border/50 hover:border-primary/30 transition-all hover:shadow-lg bg-card/50 overflow-hidden">
      <CardHeader className="bg-secondary/20 py-4 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">{department.name}</CardTitle>
          <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-primary/70">
            Manager: {department.managerName || 'Not Assigned'}
          </CardDescription>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEditDept}>
          <Settings className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Team Size</span>
          <Badge variant="secondary" className="bg-primary/10 text-primary">{employees.length}</Badge>
        </div>
        <div className="space-y-2 mt-4">
          {employees.slice(0, 5).map(emp => (
            <div key={emp.employeeId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/30 transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarImage src={emp.profilePicture} />
                <AvatarFallback>{emp.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{emp.name}</p>
                <p className="text-[9px] text-muted-foreground truncate uppercase">{emp.jobCenter}</p>
              </div>
            </div>
          ))}
          {employees.length > 5 && (
            <p className="text-[10px] text-center text-muted-foreground pt-1">+ {employees.length - 5} more members</p>
          )}
          {employees.length === 0 && (
            <div className="py-8 text-center border-2 border-dashed rounded-xl border-border/50">
              <p className="text-xs text-muted-foreground italic">Empty Department</p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-0 pb-4 px-4">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full rounded-full gap-2 text-[11px] font-bold uppercase tracking-wider">
              <UserPlus className="h-3 w-3" /> Assign Members
            </Button>
          </DialogTrigger>
          <AssignToDeptDialog department={department} allEmployees={allEmployees} onUpdate={onUpdateEmployee} />
        </Dialog>
      </CardFooter>
    </Card>
  );
}

function DepartmentDialogContent({ employees, onSave, onClose, department }: { employees: Employee[], onSave: any, onClose: any, department?: Department }) {
  const [name, setName] = useState(department?.name || '');
  const [managerId, setManagerId] = useState(department?.managerId || 'none');

  useEffect(() => {
    setName(department?.name || '');
    setManagerId(department?.managerId || 'none');
  }, [department]);

  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{department ? 'Edit Department' : 'Create New Department'}</DialogTitle>
        <DialogDescription>
          {department ? 'Update the department name and assigning head of department.' : 'Define a new organizational department for workforce allocation.'}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <label htmlFor="name" className="text-sm font-medium">Department Name</label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Quality Control" />
        </div>
        <div className="grid gap-2">
          <label htmlFor="manager" className="text-sm font-medium">Department Head (Manager)</label>
          <Select value={managerId} onValueChange={setManagerId}>
            <SelectTrigger>
              <SelectValue placeholder="Select manager" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Manager Assigned</SelectItem>
              {employees.map(emp => (
                <SelectItem key={emp.employeeId} value={emp.employeeId}>{emp.name} ({emp.employeeId})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => { onSave(name, managerId === 'none' ? null : managerId); onClose(); }}>Save Changes</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function EmployeeAssignmentDialog({ employee, allEmployees, departments, onUpdate }: { employee: Employee, allEmployees: Employee[], departments: Department[], onUpdate: any }) {
  const [deptId, setDeptId] = useState(employee.departmentId?.toString() || 'none');
  const [managerId, setManagerId] = useState(employee.managerId || 'none');

  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <div className="flex items-center gap-4 mb-4">
          <Avatar className="h-16 w-16 border-4 border-primary/10">
            <AvatarImage src={employee.profilePicture} />
            <AvatarFallback className="text-xl">{employee.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <DialogTitle>{employee.name}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground uppercase">{employee.jobCenter}</DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="grid gap-6 py-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium">Department Allocation</label>
          <Select value={deptId} onValueChange={setDeptId}>
            <SelectTrigger>
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
        <div className="grid gap-2">
          <label className="text-sm font-medium">Reporting To (Manager)</label>
          <Select value={managerId} onValueChange={setManagerId}>
            <SelectTrigger>
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
      </div>
      <DialogFooter>
        <Button onClick={() => onUpdate(employee.employeeId, { 
          departmentId: deptId === 'none' ? null : parseInt(deptId),
          managerId: managerId === 'none' ? null : managerId
        })}>Save Hierarchy Changes</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function AssignToDeptDialog({ department, allEmployees, onUpdate }: { department: Department, allEmployees: Employee[], onUpdate: any }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const unassigned = allEmployees.filter(e => e.departmentId !== department.id);

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Assign Members to {department.name}</DialogTitle>
        <DialogDescription>Move employees from other departments or unassigned list.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4 max-h-[400px] overflow-y-auto">
        {unassigned.map(emp => (
          <div key={emp.employeeId} className="flex items-center justify-between p-3 rounded-xl bg-secondary/20 hover:bg-secondary/40 transition-colors">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={emp.profilePicture} />
                <AvatarFallback>{emp.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-bold">{emp.name}</p>
                <p className="text-[10px] uppercase text-muted-foreground">{emp.jobCenter}</p>
              </div>
            </div>
            <Button 
              size="sm" 
              variant="secondary"
              className="rounded-full h-8"
              onClick={() => onUpdate(emp.employeeId, { departmentId: department.id })}
            >
              Add to Team
            </Button>
          </div>
        ))}
      </div>
    </DialogContent>
  );
}

function AddSubordinateQuickDialog({ manager, allEmployees, onUpdate, onClose }: { manager: any, allEmployees: Employee[], onUpdate: any, onClose: any }) {
  const unassigned = allEmployees.filter(e => e.managerId !== manager.employeeId && e.employeeId !== manager.employeeId);

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Add Team Member for {manager.name}</DialogTitle>
        <DialogDescription>Assign an existing employee to report to {manager.name}.</DialogDescription>
      </DialogHeader>
      
      <div className="space-y-4 py-4">
        <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-2">
          {unassigned.length > 0 ? (
            unassigned.map(emp => (
              <div key={emp.employeeId} className="flex items-center justify-between p-3 rounded-xl bg-secondary/20 hover:bg-secondary/40 transition-colors border border-border/50">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={emp.profilePicture} />
                    <AvatarFallback>{emp.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{emp.name}</p>
                    <p className="text-[9px] uppercase text-muted-foreground truncate">{emp.jobCenter}</p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="secondary"
                  className="rounded-full h-8 text-xs font-bold"
                  onClick={() => {
                    onUpdate(emp.employeeId, { managerId: manager.employeeId });
                    onClose();
                  }}
                >
                  Link Report
                </Button>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground italic text-sm">No available employees to assign.</div>
          )}
        </div>
        
        <div className="pt-4 border-t flex justify-center">
          <Link href={`/hr/employees/new`}>
            <Button variant="outline" className="rounded-full gap-2">
              <UserPlus className="h-4 w-4" /> Register New Employee
            </Button>
          </Link>
        </div>
      </div>
    </DialogContent>
  );
}

function ChangeManagerQuickDialog({ employee, allEmployees, onUpdate, onClose }: { employee: any, allEmployees: Employee[], onUpdate: any, onClose: any }) {
  const possibleManagers = allEmployees.filter(e => e.employeeId !== employee.employeeId);

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Set Manager for {employee.name}</DialogTitle>
        <DialogDescription>Select who {employee.name} should report to.</DialogDescription>
      </DialogHeader>
      
      <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto pr-2">
        {possibleManagers.map(emp => (
          <div key={emp.employeeId} className="flex items-center justify-between p-3 rounded-xl bg-secondary/20 hover:bg-secondary/40 transition-colors border border-border/50">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={emp.profilePicture} />
                <AvatarFallback>{emp.name[0]}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">{emp.name}</p>
                <p className="text-[9px] uppercase text-muted-foreground truncate">{emp.jobCenter}</p>
              </div>
            </div>
            <Button 
              size="sm" 
              variant="secondary"
              className="rounded-full h-8 text-xs font-bold"
              onClick={() => {
                onUpdate(employee.employeeId, { managerId: emp.employeeId });
                onClose();
              }}
            >
              Set as Manager
            </Button>
          </div>
        ))}
      </div>
    </DialogContent>
  );
}

