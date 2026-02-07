'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Factory, 
  Plus, 
  Search, 
  RefreshCw, 
  Settings,
  Users,
  Layout,
  Pencil,
  Trash2,
  Download,
  FileText,
  Wrench,
  Clock,
  ClipboardCheck,
  AlertCircle,
  Calendar,
  History
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Machine {
  id: number;
  machineCode: string;
  machineName: string;
  machineType: string;
  category: string;
  brand: string;
  model: string;
  capacity: number;
  unit: string;
  status: string;
  department: string;
  lineSection: string;
}

interface MachineLayout {
  id: number;
  layoutName: string;
  orderId: string;
  productCode: string;
  section: string;
  machinePositions: Array<{
    machineId: number;
    x: number;
    y: number;
    rotation: number;
    sequence: number;
  }>;
  createdAt: string;
}

interface OperatorAssignment {
  id: number;
  orderId: string;
  machineId: number;
  operatorId: string;
  operationCode: string;
  startDate: string;
  endDate: string | null;
  status: string;
  efficiencyRating: number;
  operatorName: string;
  machineName: string;
  machineType: string;
}

export default function MachineManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [layouts, setLayouts] = useState<MachineLayout[]>([]);
  const [operators, setOperators] = useState<OperatorAssignment[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [maintenanceStats, setMaintenanceStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSection, setFilterSection] = useState('all');
  const [activeTab, setActiveTab] = useState('inventory');
  
  // Dialog states
  const [isMachineDialogOpen, setIsMachineDialogOpen] = useState(false);
  const [isLayoutDialogOpen, setIsLayoutDialogOpen] = useState(false);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [isRegisterMachineDialogOpen, setIsRegisterMachineDialogOpen] = useState(false);
  const [isEditMachineDialogOpen, setIsEditMachineDialogOpen] = useState(false);
  const [isMaintenanceDialogOpen, setIsMaintenanceDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isEditMaintenanceDialogOpen, setIsEditMaintenanceDialogOpen] = useState(false);
  const [isDeleteMaintenanceConfirmOpen, setIsDeleteMaintenanceConfirmOpen] = useState(false);
  const [machineHistory, setMachineHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [machineToDelete, setMachineToDelete] = useState<Machine | null>(null);
  const [maintenanceToDelete, setMaintenanceToDelete] = useState<any | null>(null);
  const [selectedMaintenance, setSelectedMaintenance] = useState<any | null>(null);
  
  // Form states
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  
  // Machine creation form states
  const [newMachine, setNewMachine] = useState({
    machineCode: '',
    machineName: '',
    machineType: '',
    category: '',
    brand: '',
    model: '',
    capacity: '',
    unit: 'units/hour',
    department: '',
    lineSection: '',
    status: 'Available',
    description: ''
  });
  
  // Register machine form states
  const [registerMachine, setRegisterMachine] = useState({
    machineCode: '',
    machineName: '',
    machineType: '',
    category: '',
    brand: '',
    model: '',
    serialNumber: '',
    purchaseDate: '',
    warrantyExpiry: '',
    supplier: '',
    cost: '',
    section: '',
    capacity: '',
    status: 'Available',
    description: ''
  });

  // Maintenance schedule form states
  const [newSchedule, setNewSchedule] = useState({
    machineId: '',
    maintenanceType: 'Preventive' as any,
    scheduledDate: '',
    notes: ''
  });


  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // Get auth token
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Fetch all data in parallel
      const [machinesRes, layoutsRes, operatorsRes] = await Promise.all([
        fetch('/api/ie/machines', { headers }),
        fetch('/api/ie/machines/layouts', { headers }),
        fetch('/api/ie/machines/operators', { headers })
      ]);
      
      if (machinesRes.ok) {
        const machinesData = await machinesRes.json();
        setMachines(machinesData.data || []);
      }
      
      if (layoutsRes.ok) {
        const layoutsData = await layoutsRes.json();
        setLayouts(layoutsData.data || []);
      }
      
      if (operatorsRes.ok) {
        const operatorsData = await operatorsRes.json();
        setOperators(operatorsData.data || []);
      }

      const [maintRes, statsRes] = await Promise.all([
        fetch('/api/ie/machines/maintenance', { headers }),
        fetch('/api/ie/machines/maintenance?type=stats', { headers })
      ]);

      if (maintRes.ok) {
        const maintData = await maintRes.json();
        setSchedules(maintData.data || []);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setMaintenanceStats(statsData.data || null);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch machine data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };


  const filteredMachines = machines.filter(machine => {
    const matchesSearch = 
      machine.machineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      machine.machineCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      machine.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || machine.category === filterCategory;
    const matchesSection = filterSection === 'all' || machine.lineSection === filterSection;
    
    return matchesSearch && matchesCategory && matchesSection;
  });

  const getUniqueCategories = () => {
    return [...new Set(machines.map(m => m.category))];
  };

  const getUniqueSections = () => {
    return [...new Set(machines.map(m => m.lineSection))];
  };

  const resetMachineForm = () => {
    setNewMachine({
      machineCode: '',
      machineName: '',
      machineType: '',
      category: '',
      brand: '',
      model: '',
      capacity: '',
      unit: 'units/hour',
      department: '',
      lineSection: '',
      status: 'Available',
      description: ''
    });
    setIsMachineDialogOpen(false);
  };
  
  
  // Function to reset register machine form
  const resetRegisterMachineForm = () => {
    setRegisterMachine({
      machineCode: '',
      machineName: '',
      machineType: '',
      category: '',
      brand: '',
      model: '',
      serialNumber: '',
      purchaseDate: '',
      warrantyExpiry: '',
      supplier: '',
      cost: '',
      section: '',
      capacity: '',
      status: 'Available',
      description: ''
    });
    setIsRegisterMachineDialogOpen(false);
  };

  const handleCreateMachine = async () => {
    try {
      // Validation
      if (!newMachine.machineCode || !newMachine.machineName || !newMachine.category) {
        toast({
          title: 'Error',
          description: 'Please fill required fields: Machine Code, Machine Name, and Category',
          variant: 'destructive'
        });
        return;
      }

      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/ie/machines', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...newMachine,
          capacity: parseInt(newMachine.capacity) || 0
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: 'Success',
          description: `Machine ${newMachine.machineCode} created successfully`
        });
        resetMachineForm();
        fetchAllData(); // Refresh the machine list
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create machine',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error creating machine:', error);
      toast({
        title: 'Error',
        description: 'Failed to create machine',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateMachine = async () => {
    if (!selectedMachine) return;
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`/api/ie/machines/${selectedMachine.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(selectedMachine)
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Machine updated successfully' });
        setIsEditMachineDialogOpen(false);
        fetchAllData();
      } else {
        const res = await response.json();
        toast({ title: 'Error', description: res.error || 'Failed to update machine', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error updating machine:', error);
      toast({ title: 'Error', description: 'Failed to update machine', variant: 'destructive' });
    }
  };

  const handleViewHistory = async (machine: Machine) => {
    try {
      setLoadingHistory(true);
      setSelectedMachine(machine);
      setIsHistoryDialogOpen(true);
      
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(`/api/ie/machines/maintenance?machineId=${machine.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        setMachineHistory(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching machine history:', error);
      toast({ title: 'Error', description: 'Failed to fetch maintenance history', variant: 'destructive' });
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDeleteMachine = async () => {
    if (!machineToDelete) return;
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`/api/ie/machines/${machineToDelete.id}`, {
        method: 'DELETE',
        headers
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Machine deleted successfully' });
        setIsDeleteConfirmOpen(false);
        setMachineToDelete(null);
        fetchAllData();
      } else {
        const res = await response.json();
        toast({ title: 'Error', description: res.error || 'Failed to delete machine', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error deleting machine:', error);
      toast({ title: 'Error', description: 'Failed to delete machine', variant: 'destructive' });
    }
  };

  const generateInventoryPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const { addHeaderAndLogo, addFooter } = await import('@/lib/pdf-generator');

    const doc = new jsPDF();
    await addHeaderAndLogo(doc, 'Machine Inventory Report');

    const tableData = filteredMachines.map(m => [
      m.machineCode,
      m.machineName,
      m.category,
      m.machineType,
      m.brand || '-',
      `${m.capacity || 0} ${m.unit || ''}`,
      m.lineSection || '-',
      m.status
    ]);

    autoTable(doc, {
      startY: 55,
      head: [['Code', 'Name', 'Category', 'Type', 'Brand', 'Capacity', 'Section', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      styles: { fontSize: 8 }
    });

    addFooter(doc, (doc as any).lastAutoTable.finalY + 10);
    doc.save(`Machine_Inventory_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleDeleteLayout = async (id: number) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const headers: Record<string, string> = { 'Authorization': `Bearer ${token}` };
      
      const response = await fetch(`/api/ie/machines/layouts/${id}`, {
        method: 'DELETE',
        headers
      });

      if (response.ok) {
        toast({ title: "Success", description: "Layout deleted successfully" });
        fetchAllData();
      } else {
        const res = await response.json();
        toast({ title: "Error", description: res.error || "Failed to delete layout", variant: "destructive" });
      }
    } catch (error) {
      console.error('Error deleting layout:', error);
      toast({ title: "Error", description: "Failed to delete layout", variant: "destructive" });
    }
  };

  const generateLayoutPDF = async (layout: MachineLayout) => {
    // This will be called from the table row
    const { generateMachineLayoutPDF } = await import('@/lib/pdf-generator');
    // Fetch order details if needed, for now use layout data
    const url = await generateMachineLayoutPDF(layout);
    window.open(url, '_blank');
    
    // Clean up the blob URL after a delay to allow the browser to open it
    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch (error) {
        // URL might already be revoked or invalid, ignore the error
      }
    }, 1000);
  };

  const handleRegisterMachine = async () => {
    try {
      // Validation
      if (!registerMachine.machineCode || !registerMachine.machineName || !registerMachine.category) {
        toast({
          title: 'Error',
          description: 'Please fill required fields: Machine Code, Machine Name, and Category',
          variant: 'destructive'
        });
        return;
      }

      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/ie/machines/register', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...registerMachine,
          capacity: parseInt(registerMachine.capacity) || 0,
          cost: parseFloat(registerMachine.cost) || 0
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: 'Success',
          description: `Machine ${registerMachine.machineCode} registered successfully`
        });
        resetRegisterMachineForm();
        fetchAllData(); // Refresh the machine list
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to register machine',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error registering machine:', error);
      toast({
        title: 'Error',
        description: 'Failed to register machine',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Machine Management</h1>
          <p className="text-muted-foreground">
            Manage machines, layouts, and operator assignments
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAllData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={generateInventoryPDF}>
            <FileText className="mr-2 h-4 w-4 text-red-500" />
            Export PDF
          </Button>
          {(user?.role === 'ie_admin' || user?.role === 'ie_user') && (
            <>
              <Button variant="outline" onClick={() => router.push('/ie/line-balancing')}>
                <Users className="mr-2 h-4 w-4" />
                Line Balancing
              </Button>
              <Button onClick={() => router.push('/ie/layout-designer')}>
                <Layout className="mr-2 h-4 w-4" />
                Layout Designer
              </Button>
              <Button onClick={() => router.push('/ie/layouts')} variant="outline">
                <Layout className="mr-2 h-4 w-4" />
                View Layouts
              </Button>
              <Button onClick={() => setIsMachineDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Machine
              </Button>
              <Button onClick={() => setIsRegisterMachineDialogOpen(true)} variant="secondary">
                <Plus className="mr-2 h-4 w-4" />
                Register Machine
              </Button>
            </>
          )}
        </div>
      </div>



      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Factory className="h-4 w-4" />
            Machine Inventory
          </TabsTrigger>
          <TabsTrigger value="layouts" className="flex items-center gap-2">
            <Layout className="h-4 w-4" />
            Production Layouts
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Maintenance Scheduling
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-6">
          {/* Filters moved inside tab */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Search className="h-4 w-4" />
                Filter Machines
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4 py-2">
              <div className="relative flex-1 min-w-64">
                <Search className="absolute left-3 top-half -translate-y-half h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search machines..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-40 h-9">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {getUniqueCategories().map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
              </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-none shadow-md bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Total Machines</p>
                    <h3 className="text-2xl font-bold text-blue-900">{machines.length}</h3>
                  </div>
                  <Factory className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-md bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-green-600 uppercase tracking-wider">Active Layouts</p>
                    <h3 className="text-2xl font-bold text-green-900">{layouts.length}</h3>
                  </div>
                  <Layout className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-md bg-purple-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-purple-600 uppercase tracking-wider">Operators</p>
                    <h3 className="text-2xl font-bold text-purple-900">{operators.length > 0 ? 'Active' : 'N/A'}</h3>
                  </div>
                  <Users className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-md bg-amber-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Categories</p>
                    <h3 className="text-2xl font-bold text-amber-900">{getUniqueCategories().length}</h3>
                  </div>
                  <Settings className="h-8 w-8 text-amber-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Factory className="h-5 w-5" />
                Machine Inventory ({filteredMachines.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Machine Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMachines.map((machine) => (
                      <TableRow key={machine.id} className="hover:bg-primary/5">
                        <TableCell className="font-medium">{machine.machineCode}</TableCell>
                        <TableCell>{machine.machineName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{machine.category}</Badge>
                        </TableCell>
                        <TableCell>{machine.capacity} {machine.unit}</TableCell>
                        <TableCell>{machine.lineSection}</TableCell>
                        <TableCell>
                          <Badge variant={machine.status === 'active' ? 'default' : 'secondary'}>
                            {machine.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-slate-600 hover:text-blue-600" 
                              onClick={() => handleViewHistory(machine)}
                              title="View Maintenance History"
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-600" onClick={() => { setSelectedMachine({...machine}); setIsEditMachineDialogOpen(true); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600" onClick={() => { setMachineToDelete(machine); setIsDeleteConfirmOpen(true); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="layouts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layout className="h-5 w-5" />
                Production Layouts ({layouts.length})
              </CardTitle>
              <CardDescription>Manage saved line configurations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Layout Name</TableHead>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {layouts.map((layout) => (
                      <TableRow key={layout.id} className="hover:bg-primary/5">
                        <TableCell className="font-medium">{layout.layoutName}</TableCell>
                        <TableCell><Badge variant="outline">{layout.orderId}</Badge></TableCell>
                        <TableCell>{layout.productCode}</TableCell>
                        <TableCell>{layout.section}</TableCell>
                        <TableCell>{new Date(layout.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => router.push(`/ie/layout-designer?id=${layout.id}`)}>
                              <Pencil className="h-4 w-4 mr-1" /> Edit
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600" onClick={() => { if(confirm('Delete layout?')) handleDeleteLayout(layout.id); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => generateLayoutPDF(layout)}>
                              <Download className="h-4 w-4 mr-1" /> PDF
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {layouts.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No saved layouts.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-none shadow-md bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-orange-600 uppercase tracking-wider">Scheduled Tasks</p>
                    <h3 className="text-2xl font-bold text-orange-900">{maintenanceStats?.scheduled || 0}</h3>
                  </div>
                  <Clock className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-md bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">In Progress</p>
                    <h3 className="text-2xl font-bold text-blue-900">{maintenanceStats?.inProgress || 0}</h3>
                  </div>
                  <Wrench className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-md bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-red-600 uppercase tracking-wider">Overdue</p>
                    <h3 className="text-2xl font-bold text-red-900">{maintenanceStats?.overdue || 0}</h3>
                  </div>
                  <AlertCircle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-md bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-green-600 uppercase tracking-wider">Completed</p>
                    <h3 className="text-2xl font-bold text-green-900">{maintenanceStats?.completed || 0}</h3>
                  </div>
                  <ClipboardCheck className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Service Schedule
            </h2>
            <Button onClick={() => setIsMaintenanceDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Maintenance
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Active Schedules</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Machine</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schedules.map((schedule) => {
                        const scheduleDate = new Date(schedule.scheduledDate);
                        const isOverdue = schedule.status !== 'Completed' && scheduleDate < new Date();
                        const isUpcoming = schedule.status === 'Scheduled' && !isOverdue && 
                          (scheduleDate.getTime() - new Date().getTime()) < (2 * 24 * 60 * 60 * 1000);
                        
                        return (
                          <TableRow key={schedule.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-bold">{schedule.machineCode}</span>
                                <span className="text-xs text-muted-foreground truncate max-w-[150px]">{schedule.machineName}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-slate-50">{schedule.maintenanceType}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className={isOverdue ? "text-red-600 font-bold" : isUpcoming ? "text-amber-600 font-bold" : ""}>
                                  {scheduleDate.toLocaleDateString()}
                                </span>
                                {isOverdue && <span className="text-[10px] text-red-500 uppercase font-black">Overdue</span>}
                                {isUpcoming && <span className="text-[10px] text-amber-500 uppercase font-black animate-pulse">Upcoming</span>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                className={
                                  schedule.status === 'Completed' ? 'bg-green-100 text-green-700' : 
                                  schedule.status === 'In-Progress' ? 'bg-blue-100 text-blue-700' : 
                                  isOverdue ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                                }
                              >
                                {schedule.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end items-center gap-2">
                                <Select value={schedule.status} onValueChange={async (val) => {
                                  const token = localStorage.getItem('authToken');
                                  const res = await fetch(`/api/ie/machines/maintenance/${schedule.id}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                    body: JSON.stringify({ status: val })
                                  });
                                  if (res.ok) fetchAllData();
                                }}>
                                  <SelectTrigger className="h-8 w-[120px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Scheduled">Scheduled</SelectItem>
                                    <SelectItem value="In-Progress">In-Progress</SelectItem>
                                    <SelectItem value="Completed">Completed</SelectItem>
                                  </SelectContent>
                                </Select>
                                
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 text-blue-600" 
                                  onClick={() => { setSelectedMaintenance({...schedule}); setIsEditMaintenanceDialogOpen(true); }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 text-red-600" 
                                  onClick={() => { setMaintenanceToDelete(schedule); setIsDeleteMaintenanceConfirmOpen(true); }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {schedules.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">
                            No maintenance records found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="bg-slate-900 text-white border-none">
                <CardHeader>
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-blue-400">Maintenance Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Service Compliance</span>
                      <span>{maintenanceStats?.total ? Math.round((maintenanceStats.completed / maintenanceStats.total) * 100) : 0}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500" 
                        style={{ width: `${maintenanceStats?.total ? (maintenanceStats.completed / maintenanceStats.total) * 100 : 0}%` }} 
                      />
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-4">
                    <div className="text-center">
                       <p className="text-2xl font-black">{maintenanceStats?.overdue || 0}</p>
                       <p className="text-[10px] text-slate-400 uppercase font-bold">Unresolved</p>
                    </div>
                    <div className="text-center">
                       <p className="text-2xl font-black text-green-400">{maintenanceStats?.completed || 0}</p>
                       <p className="text-[10px] text-slate-400 uppercase font-bold">Resolved</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Maintenance Help Card */}
              <Card className="border-dashed border-2">
                <CardContent className="p-4 flex gap-3 italic text-sm text-muted-foreground">
                   <AlertCircle className="h-5 w-5 text-blue-500 shrink-0" />
                   <div>
                     <p className="font-bold text-foreground not-italic mb-1">Maintenance Guidelines</p>
                     <ul className="list-disc pl-4 space-y-1">
                       <li><b>Preventive:</b> Regular checks every 15 days.</li>
                       <li><b>Full Overhaul:</b> Deep tech check every 6 months.</li>
                       <li><b>Cleanup:</b> Daily or weekly lubrication.</li>
                     </ul>
                   </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>



      {/* Machine Creation Dialog */}
      <Dialog open={isMachineDialogOpen} onOpenChange={setIsMachineDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Machine</DialogTitle>
            <DialogDescription>
              Create a new machine to be available for all functionalities
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="machineCode">Machine Code *</Label>
              <Input
                id="machineCode"
                value={newMachine.machineCode}
                onChange={(e) => setNewMachine({...newMachine, machineCode: e.target.value})}
                placeholder="Enter machine code (e.g., CUT-001)"
              />
            </div>
            
            <div>
              <Label htmlFor="machineName">Machine Name *</Label>
              <Input
                id="machineName"
                value={newMachine.machineName}
                onChange={(e) => setNewMachine({...newMachine, machineName: e.target.value})}
                placeholder="Enter machine name"
              />
            </div>
            
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select value={newMachine.category} onValueChange={(value) => setNewMachine({...newMachine, category: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cutting">Cutting</SelectItem>
                  <SelectItem value="Sewing">Sewing</SelectItem>
                  <SelectItem value="Finishing">Finishing</SelectItem>
                  <SelectItem value="Packing">Packing</SelectItem>
                  <SelectItem value="Quality Control">Quality Control</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="machineType">Machine Type</Label>
              <Input
                id="machineType"
                value={newMachine.machineType}
                onChange={(e) => setNewMachine({...newMachine, machineType: e.target.value})}
                placeholder="Enter machine type"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="brand">Brand</Label>
                <Input
                  id="brand"
                  value={newMachine.brand}
                  onChange={(e) => setNewMachine({...newMachine, brand: e.target.value})}
                  placeholder="Brand"
                />
              </div>
              <div>
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={newMachine.model}
                  onChange={(e) => setNewMachine({...newMachine, model: e.target.value})}
                  placeholder="Model"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={newMachine.capacity}
                  onChange={(e) => setNewMachine({...newMachine, capacity: e.target.value})}
                  placeholder="Capacity"
                />
              </div>
              <div>
                <Label htmlFor="unit">Unit</Label>
                <Select value={newMachine.unit} onValueChange={(value) => setNewMachine({...newMachine, unit: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="units/hour">units/hour</SelectItem>
                    <SelectItem value="meters/hour">meters/hour</SelectItem>
                    <SelectItem value="pieces/hour">pieces/hour</SelectItem>
                    <SelectItem value="kg/hour">kg/hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={newMachine.department}
                onChange={(e) => setNewMachine({...newMachine, department: e.target.value})}
                placeholder="Department"
              />
            </div>
            
            <div>
              <Label htmlFor="lineSection">Line Section</Label>
              <Input
                id="lineSection"
                value={newMachine.lineSection}
                onChange={(e) => setNewMachine({...newMachine, lineSection: e.target.value})}
                placeholder="Line section"
              />
            </div>
            
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={newMachine.status} onValueChange={(value) => setNewMachine({...newMachine, status: value as any})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={resetMachineForm}>
              Cancel
            </Button>
            <Button onClick={handleCreateMachine}>
              Create Machine
            </Button>
          </div>
        </DialogContent>
      </Dialog>
            
      {/* Register Machine Dialog */}
      <Dialog open={isRegisterMachineDialogOpen} onOpenChange={setIsRegisterMachineDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Register New Machine
            </DialogTitle>
            <DialogDescription>
              Register a new machine with complete details including purchase information
            </DialogDescription>
          </DialogHeader>
                
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-semibold border-b pb-2">Basic Information</h3>
                    
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="registerMachineCode">Machine Code *</Label>
                  <Input
                    id="registerMachineCode"
                    value={registerMachine.machineCode}
                    onChange={(e) => setRegisterMachine({...registerMachine, machineCode: e.target.value})}
                    placeholder="Enter machine code (e.g., CUT-001)"
                  />
                </div>
                <div>
                  <Label htmlFor="registerMachineName">Machine Name *</Label>
                  <Input
                    id="registerMachineName"
                    value={registerMachine.machineName}
                    onChange={(e) => setRegisterMachine({...registerMachine, machineName: e.target.value})}
                    placeholder="Enter machine name"
                  />
                </div>
              </div>
                    
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="registerCategory">Category *</Label>
                  <Select value={registerMachine.category} onValueChange={(value) => setRegisterMachine({...registerMachine, category: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cutting">Cutting</SelectItem>
                      <SelectItem value="Sewing">Sewing</SelectItem>
                      <SelectItem value="Finishing">Finishing</SelectItem>
                      <SelectItem value="Packing">Packing</SelectItem>
                      <SelectItem value="Quality Control">Quality Control</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="registerMachineType">Machine Type</Label>
                  <Input
                    id="registerMachineType"
                    value={registerMachine.machineType}
                    onChange={(e) => setRegisterMachine({...registerMachine, machineType: e.target.value})}
                    placeholder="Machine type"
                  />
                </div>
              </div>
                    
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="registerBrand">Brand</Label>
                  <Input
                    id="registerBrand"
                    value={registerMachine.brand}
                    onChange={(e) => setRegisterMachine({...registerMachine, brand: e.target.value})}
                    placeholder="Brand"
                  />
                </div>
                <div>
                  <Label htmlFor="registerModel">Model</Label>
                  <Input
                    id="registerModel"
                    value={registerMachine.model}
                    onChange={(e) => setRegisterMachine({...registerMachine, model: e.target.value})}
                    placeholder="Model"
                  />
                </div>
              </div>
                    
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="registerSerialNumber">Serial Number</Label>
                  <Input
                    id="registerSerialNumber"
                    value={registerMachine.serialNumber}
                    onChange={(e) => setRegisterMachine({...registerMachine, serialNumber: e.target.value})}
                    placeholder="Serial number"
                  />
                </div>
                <div>
                  <Label htmlFor="registerCapacity">Capacity</Label>
                  <Input
                    id="registerCapacity"
                    type="number"
                    value={registerMachine.capacity}
                    onChange={(e) => setRegisterMachine({...registerMachine, capacity: e.target.value})}
                    placeholder="Capacity"
                  />
                </div>
              </div>
            </div>
                  
            {/* Purchase Information */}
            <div className="space-y-4">
              <h3 className="font-semibold border-b pb-2">Purchase Information</h3>
                    
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="registerSupplier">Supplier</Label>
                  <Input
                    id="registerSupplier"
                    value={registerMachine.supplier}
                    onChange={(e) => setRegisterMachine({...registerMachine, supplier: e.target.value})}
                    placeholder="Supplier name"
                  />
                </div>
                <div>
                  <Label htmlFor="registerCost">Cost</Label>
                  <Input
                    id="registerCost"
                    type="number"
                    value={registerMachine.cost}
                    onChange={(e) => setRegisterMachine({...registerMachine, cost: e.target.value})}
                    placeholder="Cost"
                  />
                </div>
              </div>
                    
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="registerPurchaseDate">Purchase Date</Label>
                  <Input
                    id="registerPurchaseDate"
                    type="date"
                    value={registerMachine.purchaseDate}
                    onChange={(e) => setRegisterMachine({...registerMachine, purchaseDate: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="registerWarrantyExpiry">Warranty Expiry</Label>
                  <Input
                    id="registerWarrantyExpiry"
                    type="date"
                    value={registerMachine.warrantyExpiry}
                    onChange={(e) => setRegisterMachine({...registerMachine, warrantyExpiry: e.target.value})}
                  />
                </div>
              </div>
                    
              <div>
                <Label htmlFor="registerSection">Section</Label>
                <Select value={registerMachine.section} onValueChange={(value) => setRegisterMachine({...registerMachine, section: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cutting">Cutting</SelectItem>
                    <SelectItem value="Sewing">Sewing</SelectItem>
                    <SelectItem value="Finishing">Finishing</SelectItem>
                    <SelectItem value="Packing">Packing</SelectItem>
                    <SelectItem value="Quality Control">Quality Control</SelectItem>
                  </SelectContent>
                </Select>
              </div>
                    
              <div>
                <Label htmlFor="registerStatus">Status</Label>
                <Select value={registerMachine.status} onValueChange={(value) => setRegisterMachine({...registerMachine, status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Available">Available</SelectItem>
                    <SelectItem value="In Use">In Use</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                    <SelectItem value="Out of Service">Out of Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
                
          <div className="space-y-4">
            <div>
              <Label htmlFor="registerDescription">Description</Label>
              <Textarea
                id="registerDescription"
                value={registerMachine.description}
                onChange={(e) => setRegisterMachine({...registerMachine, description: e.target.value})}
                placeholder="Machine description"
                rows={3}
              />
            </div>
          </div>
                
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={resetRegisterMachineForm}>
              Cancel
            </Button>
            <Button onClick={handleRegisterMachine}>
              Register Machine
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Machine Dialog */}
      <Dialog open={isEditMachineDialogOpen} onOpenChange={setIsEditMachineDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Machine</DialogTitle>
            <DialogDescription>Update machine information</DialogDescription>
          </DialogHeader>
          
          {selectedMachine && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Machine Code</Label>
                  <Input value={selectedMachine.machineCode} onChange={e => setSelectedMachine({...selectedMachine, machineCode: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label>Machine Name</Label>
                  <Input value={selectedMachine.machineName} onChange={e => setSelectedMachine({...selectedMachine, machineName: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Category</Label>
                  <Select value={selectedMachine.category} onValueChange={v => setSelectedMachine({...selectedMachine, category: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cutting">Cutting</SelectItem>
                      <SelectItem value="Sewing">Sewing</SelectItem>
                      <SelectItem value="Finishing">Finishing</SelectItem>
                      <SelectItem value="Packing">Packing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select value={selectedMachine.status} onValueChange={v => setSelectedMachine({...selectedMachine, status: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Line Section</Label>
                  <Input value={selectedMachine.lineSection} onChange={e => setSelectedMachine({...selectedMachine, lineSection: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label>Machine Type</Label>
                  <Input value={selectedMachine.machineType} onChange={e => setSelectedMachine({...selectedMachine, machineType: e.target.value})} />
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsEditMachineDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateMachine}>Update Machine</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {machineToDelete?.machineName}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteMachine}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>


      {/* Maintenance Scheduling Dialog */}
      <Dialog open={isMaintenanceDialogOpen} onOpenChange={setIsMaintenanceDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Maintenance</DialogTitle>
            <DialogDescription>Register a new maintenance event for a machine</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Target Machine *</Label>
              <Select value={newSchedule.machineId} onValueChange={(val) => setNewSchedule({...newSchedule, machineId: val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a machine" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {machines.map(m => (
                    <SelectItem key={m.id} value={m.id.toString()}>
                      {m.machineCode} - {m.machineName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Maintenance Type *</Label>
              <Select value={newSchedule.maintenanceType} onValueChange={(val) => setNewSchedule({...newSchedule, maintenanceType: val as any})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Preventive">Preventive Maintenance</SelectItem>
                  <SelectItem value="Full Overhaul">Full Overhaul</SelectItem>
                  <SelectItem value="Regular Cleanup">Regular Cleanup</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Scheduled Date *</Label>
              <Input 
                type="date" 
                value={newSchedule.scheduledDate} 
                onChange={(e) => setNewSchedule({...newSchedule, scheduledDate: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>Instructions / Notes</Label>
              <Textarea 
                placeholder="Special maintenance instructions..."
                value={newSchedule.notes}
                onChange={(e) => setNewSchedule({...newSchedule, notes: e.target.value})}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsMaintenanceDialogOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              if (!newSchedule.machineId || !newSchedule.scheduledDate) {
                toast({ title: "Validation Error", description: "Machine and Date are required", variant: "destructive" });
                return;
              }
              const token = localStorage.getItem('authToken');
              const res = await fetch('/api/ie/machines/maintenance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                  ...newSchedule,
                  machineId: parseInt(newSchedule.machineId)
                })
              });
              if (res.ok) {
                toast({ title: "Success", description: "Maintenance scheduled" });
                setIsMaintenanceDialogOpen(false);
                setNewSchedule({ machineId: '', maintenanceType: 'Preventive', scheduledDate: '', notes: '' });
                fetchAllData();
              }
            }}>
              Schedule Service
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Maintenance History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-blue-600" />
              Maintenance History: {selectedMachine?.machineCode}
            </DialogTitle>
            <DialogDescription>
              Chronological log of maintenance activities for {selectedMachine?.machineName}
            </DialogDescription>
          </DialogHeader>

          {loadingHistory ? (
            <div className="py-20 text-center text-muted-foreground flex flex-col items-center gap-2">
              <RefreshCw className="h-8 w-8 animate-spin" />
              Loading history...
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {machineHistory.length > 0 ? (
                <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-8">
                  {machineHistory.map((entry, idx) => (
                    <div key={entry.id} className="relative">
                      <div className="absolute -left-[33px] top-1 h-4 w-4 rounded-full border-2 border-white bg-blue-500 shadow-sm" />
                      <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 shadow-sm space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-black text-slate-900">{entry.maintenanceType}</p>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{new Date(entry.scheduledDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                          </div>
                          <Badge className={
                            entry.status === 'Completed' ? 'bg-green-100 text-green-700' : 
                            entry.status === 'In-Progress' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                          }>
                            {entry.status}
                          </Badge>
                        </div>
                        
                        {entry.notes && (
                          <div className="bg-white p-3 rounded border border-slate-200 text-sm italic text-slate-600">
                             "{entry.notes}"
                          </div>
                        )}
                        
                        <div className="pt-2 flex justify-between items-center text-[10px] text-slate-400 font-black uppercase tracking-tighter">
                          <span>Technician: {entry.performedBy || 'Unknown'}</span>
                          {entry.completedDate && <span>Completed: {new Date(entry.completedDate).toLocaleDateString()}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground italic border-2 border-dashed rounded-xl">
                  No maintenance records found for this machine.
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setIsHistoryDialogOpen(false)}>Close History</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Maintenance Dialog */}
      <Dialog open={isEditMaintenanceDialogOpen} onOpenChange={setIsEditMaintenanceDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Maintenance Record</DialogTitle>
            <DialogDescription>Modify the details of this service event</DialogDescription>
          </DialogHeader>
          
          {selectedMaintenance && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Machine Code</Label>
                <Input value={selectedMaintenance.machineCode} disabled className="bg-slate-50" />
              </div>

              <div className="space-y-2">
                <Label>Maintenance Type *</Label>
                <Select value={selectedMaintenance.maintenanceType} onValueChange={(val) => setSelectedMaintenance({...selectedMaintenance, maintenanceType: val as any})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Preventive">Preventive Maintenance</SelectItem>
                    <SelectItem value="Full Overhaul">Full Overhaul</SelectItem>
                    <SelectItem value="Regular Cleanup">Regular Cleanup</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Scheduled Date *</Label>
                <Input 
                  type="date" 
                  value={selectedMaintenance.scheduledDate.split('T')[0]} 
                  onChange={(e) => setSelectedMaintenance({...selectedMaintenance, scheduledDate: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>Instructions / Notes</Label>
                <Textarea 
                  placeholder="Maintenance details..."
                  value={selectedMaintenance.notes || ''}
                  onChange={(e) => setSelectedMaintenance({...selectedMaintenance, notes: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>Current Status</Label>
                <Select value={selectedMaintenance.status} onValueChange={(val) => setSelectedMaintenance({...selectedMaintenance, status: val as any})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Scheduled">Scheduled</SelectItem>
                    <SelectItem value="In-Progress">In-Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsEditMaintenanceDialogOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              const token = localStorage.getItem('authToken');
              const res = await fetch(`/api/ie/machines/maintenance/${selectedMaintenance.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(selectedMaintenance)
              });
              if (res.ok) {
                toast({ title: "Success", description: "Service record updated" });
                setIsEditMaintenanceDialogOpen(false);
                fetchAllData();
              }
            }}>
              Update Service
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Maintenance Confirmation */}
      <Dialog open={isDeleteMaintenanceConfirmOpen} onOpenChange={setIsDeleteMaintenanceConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancel Service?</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this maintenance record for {maintenanceToDelete?.machineCode}? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsDeleteMaintenanceConfirmOpen(false)}>Back</Button>
            <Button variant="destructive" onClick={async () => {
              const token = localStorage.getItem('authToken');
              const res = await fetch(`/api/ie/machines/maintenance/${maintenanceToDelete.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (res.ok) {
                toast({ title: "Deleted", description: "Maintenance record removed" });
                setIsDeleteMaintenanceConfirmOpen(false);
                fetchAllData();
              }
            }}>
              Delete Record
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}