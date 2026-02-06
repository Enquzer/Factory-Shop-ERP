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
  FileText
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
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [machineToDelete, setMachineToDelete] = useState<Machine | null>(null);
  
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
    </div>
  );
}