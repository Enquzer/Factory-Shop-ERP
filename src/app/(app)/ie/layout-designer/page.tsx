'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useSystemSettings } from '@/contexts/system-settings-context';
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
  Move,
  Users,
  Layout,
  Calendar,
  BarChart3,
  ChevronLeft,
  ArrowRightLeft,
  UserPlus,
  FileText,
  Download
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';

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

export default function LayoutDesignerPage() {
  const { user } = useAuth();
  const { settings } = useSystemSettings();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const layoutId = searchParams.get('id');
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Layout state
  const [layoutName, setLayoutName] = useState('');
  const [selectedSection, setSelectedSection] = useState('Sewing');
  const [orderId, setOrderId] = useState('');
  const [productCode, setProductCode] = useState('');
  const [productImage, setProductImage] = useState<string | null>(null);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [layoutAreaRef, setLayoutAreaRef] = useState<HTMLDivElement | null>(null);
  
  // Drag and drop states
  const [draggedMachine, setDraggedMachine] = useState<Machine | null>(null);
  const [movingMachineIndex, setMovingMachineIndex] = useState<number | null>(null);
  const [machinePositions, setMachinePositions] = useState<Array<{
    machine: Machine;
    x: number;
    y: number;
    rotation: number;
    sequence: number;
    operatorId?: string;
    operatorName?: string;
  }>>([]);
  
  const [operators, setOperators] = useState<any[]>([]);
  
  const [selectedMachinePosition, setSelectedMachinePosition] = useState<number | null>(null);
  const [connections, setConnections] = useState<Array<{
    fromId: number;
    toId: number;
    label?: string;
  }>>([]);

  useEffect(() => {
    fetchMachines();
    fetchOperators();
    fetchActiveOrders();
    if (layoutId) {
      fetchLayout(layoutId);
    }
  }, [layoutId]);

  const fetchLayout = async (id: string) => {
    try {
      setLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`/api/ie/machines/layouts/${id}`, { headers });
      if (response.ok) {
        const data = await response.json();
        setLayoutName(data.layoutName || '');
        setOrderId(data.orderId || '');
        setProductCode(data.productCode || '');
        setSelectedSection(data.section || 'Sewing');
        
        // Reconstruct machine positions with full machine objects
        // We might need to wait for machines to be fetched first
        // or join the data here if machines are already available
        if (data.machinePositions) {
          // We'll handle matching machine objects in a separate effect or after current machines fetch
          setMachinePositions(data.machinePositions.map((p: any) => ({
            ...p,
            machine: machines.find(m => m.id === p.machineId) || { id: p.machineId, machineName: 'Loading...' }
          })));
        }
      }
    } catch (error) {
      console.error('Error fetching layout:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveOrders = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/marketing-orders', { headers });
      if (response.ok) {
        const result = await response.json();
        const active = result.filter((o: any) => !o.isCompleted);
        setActiveOrders(active);
      }
    } catch (error) {
      console.error('Error fetching active orders:', error);
    }
  };

  useEffect(() => {
    if (machines.length > 0 && machinePositions.length > 0) {
      const updatedPositions = machinePositions.map(pos => {
        if (!pos.machine.machineCode || pos.machine.machineName === 'Loading...') {
          const fullMachine = machines.find(m => m.id === (pos as any).machineId);
          if (fullMachine) return { ...pos, machine: fullMachine };
        }
        return pos;
      });
      // Only update if there's an actual change to prevent loops
      if (JSON.stringify(updatedPositions) !== JSON.stringify(machinePositions)) {
        setMachinePositions(updatedPositions);
      }
    }
  }, [machines, machinePositions]);

  const fetchOperators = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/ie/machines/operators?available=true', { headers });
      if (response.ok) {
        const result = await response.json();
        setOperators(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching operators:', error);
    }
  };

  const fetchMachines = async () => {
    try {
      setLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/ie/machines', { headers });
      if (response.ok) {
        const result = await response.json();
        setMachines(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching machines:', error);
      toast({
        title: "Error",
        description: "Failed to fetch machine list",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (machine: Machine, e: React.DragEvent, index: number | null = null) => {
    if (index !== null) {
      setMovingMachineIndex(index);
    } else {
      setDraggedMachine(machine);
    }
    e.dataTransfer.setData('text/plain', machine.id.toString());
    // Use an empty image to avoid default ghosting if we want custom dragging feedback, 
    // but for now default ghosting is fine.
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!layoutAreaRef) return;
    
    // If we're neither dragging a new machine nor moving an old one, exit
    if (!draggedMachine && movingMachineIndex === null) return;
    
    const rect = layoutAreaRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
      if (movingMachineIndex !== null) {
        // Handle moving an existing machine
        setMachinePositions(prev => {
          const updated = [...prev];
          updated[movingMachineIndex] = {
            ...updated[movingMachineIndex],
            x: x - 48,
            y: y - 48
          };
          return updated;
        });
        setMovingMachineIndex(null);
      } else if (draggedMachine) {
        // Handle adding a new machine
        const newSequence = machinePositions.length + 1;
        setMachinePositions(prev => [
          ...prev,
          {
            machine: draggedMachine,
            x: x - 48,
            y: y - 48,
            rotation: 0,
            sequence: newSequence
          }
        ]);
        setDraggedMachine(null);
      }
    }
    
    setDraggedMachine(null);
    setMovingMachineIndex(null);
  };

  const filteredMachines = machines.filter(machine => 
    machine.machineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    machine.machineCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    machine.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveLayout = async () => {
    if (!layoutName) {
      toast({
        title: "Error",
        description: "Please enter a layout name",
        variant: "destructive"
      });
      return;
    }
    
    if (machinePositions.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one machine to the layout",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const layoutData = {
        layoutName,
        orderId: orderId || '',
        productCode: productCode || '',
        section: selectedSection,
        machinePositions: machinePositions.map(pos => ({
          machineId: pos.machine.id,
          x: pos.x,
          y: pos.y,
          rotation: pos.rotation,
          sequence: pos.sequence,
          operatorId: pos.operatorId,
          operatorName: pos.operatorName
        }))
      };

      const response = await fetch(layoutId ? `/api/ie/machines/layouts/${layoutId}` : '/api/ie/machines/layouts', {
        method: layoutId ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify(layoutData)
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Layout Saved",
          description: "Your machine layout has been saved successfully"
        });
        router.push('/ie/machines');
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save layout",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error saving layout:', error);
      toast({
        title: "Error",
        description: "Failed to save layout",
        variant: "destructive"
      });
    }
  };

  const handleExportPDF = async () => {
    const { generateMachineLayoutPDF } = await import('@/lib/pdf-generator');
    const layoutData = {
      layoutName,
      orderId,
      productCode,
      section: selectedSection,
      machinePositions: machinePositions.map((pos, idx) => ({
        ...pos,
        machineId: pos.machine.id,
        sequence: idx + 1
      }))
    };
    
    const branding = {
      companyName: settings.companyName,
      logo: settings.logo || undefined,
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor
    };

    const url = await generateMachineLayoutPDF(layoutData, branding);
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Layout className="h-8 w-8 text-primary" />
              Machine Layout Designer
            </h1>
            <p className="text-muted-foreground">
              Design production layouts by dragging and positioning machines
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchMachines}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Assets
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <FileText className="mr-2 h-4 w-4 text-red-500" />
            Export PDF
          </Button>
          <Button onClick={handleSaveLayout}>
            <Calendar className="mr-2 h-4 w-4" />
            {layoutId ? 'Update Layout' : 'Save Layout'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar: Controls & Palette */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Layout Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="layoutName">Layout Name *</Label>
                <Input
                  id="layoutName"
                  value={layoutName}
                  onChange={(e) => setLayoutName(e.target.value)}
                  placeholder="e.g., Sewing Line A - Polo Top"
                />
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="orderId">Select Order</Label>
                    <Select 
                      value={orderId} 
                      onValueChange={(val) => {
                        const order = activeOrders.find(o => o.orderNumber === val || o.id === val);
                        if (order) {
                          setOrderId(order.orderNumber || order.id);
                          setProductCode(order.productCode);
                          setProductImage(order.imageUrl);
                          // Auto-fill layout name if empty
                          if (!layoutName) {
                            setLayoutName(`${order.orderNumber} - ${order.productName}`);
                          }
                        }
                      }}
                    >
                      <SelectTrigger id="orderId">
                        <SelectValue placeholder="Select an active order" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeOrders.map(order => (
                          <SelectItem key={order.id} value={order.orderNumber || order.id}>
                            {order.orderNumber}: {order.productName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {productCode && (
                  <div className="bg-muted/30 p-3 rounded-xl border border-dashed border-muted flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="w-16 h-16 bg-background rounded-lg border overflow-hidden flex-shrink-0 shadow-sm">
                      {productImage ? (
                        <img 
                          src={productImage} 
                          alt={productCode} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground bg-accent">
                          No Image
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] uppercase font-black opacity-40">Product Code</div>
                      <div className="font-bold text-sm truncate">{productCode}</div>
                      <div className="text-[10px] text-muted-foreground">Linked to production flow</div>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="section">Process Section</Label>
                <Select value={selectedSection} onValueChange={setSelectedSection}>
                  <SelectTrigger>
                    <SelectValue />
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
            </CardContent>
          </Card>

          <Card className="flex-1 flex flex-col min-h-[400px]">
            <CardHeader className="pb-3 text-lg font-semibold flex flex-row items-center justify-between">
              Machine Palette
              <Badge variant="secondary">{filteredMachines.length}</Badge>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0">
              <div className="px-4 pb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search machines..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-10"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[500px] px-4 pb-4 space-y-2">
                {filteredMachines.map(machine => (
                  <div
                    key={machine.id}
                    className="p-3 border rounded-lg cursor-move bg-card hover:bg-accent hover:text-accent-foreground transition-all duration-200 border-l-4 border-l-primary group shadow-sm"
                    draggable
                    onDragStart={(e) => handleDragStart(machine, e)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="font-semibold text-sm">{machine.machineName}</div>
                      <Badge variant="outline" className="text-[10px] scale-90 uppercase tracking-tighter">
                        {machine.machineCode}
                      </Badge>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1 flex gap-2">
                       <span>{machine.category}</span>
                       <span>•</span>
                       <span>{machine.capacity} {machine.unit}</span>
                    </div>
                  </div>
                ))}
                {filteredMachines.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground italic">
                    No machines found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Canvas Area */}
        <div className="lg:col-span-3">
          <Card className="h-full min-h-[700px] flex flex-col shadow-xl border-dashed border-2">
            <CardHeader className="bg-muted/50 py-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Design Canvas</CardTitle>
                <CardDescription className="text-xs">Drag machines here to arrange the flow</CardDescription>
              </div>
              <div className="flex gap-2">
                 <Button variant="ghost" size="sm" onClick={() => setMachinePositions([])}>
                   Clear All
                 </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 relative overflow-hidden bg-dot-pattern">
              <div 
                ref={setLayoutAreaRef}
                className="absolute inset-0 w-full h-full cursor-crosshair"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => setSelectedMachinePosition(null)}
              >
                {/* SVG for connections/flow */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  <defs>
                    <marker
                      id="arrowhead"
                      markerWidth="10"
                      markerHeight="7"
                      refX="12"
                      refY="3.5"
                      orient="auto"
                    >
                      <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
                    </marker>
                  </defs>
                  {machinePositions.length > 1 && machinePositions.slice(0, -1).map((pos, idx) => {
                     const nextPos = machinePositions[idx + 1];
                     const midX = (pos.x + 48 + nextPos.x + 48) / 2;
                     const midY = (pos.y + 48 + nextPos.y + 48) / 2;
                     
                     return (
                       <g key={`flow-group-${idx}`}>
                         <line
                          key={`flow-${idx}`}
                          x1={pos.x + 48}
                          y1={pos.y + 48}
                          x2={nextPos.x + 48}
                          y2={nextPos.y + 48}
                          stroke="#3b82f6"
                          strokeWidth="2"
                          strokeDasharray="4 4"
                          markerEnd="url(#arrowhead)"
                          className="animate-pulse"
                         />
                         <foreignObject 
                          x={midX - 12} 
                          y={midY - 12} 
                          width="24" 
                          height="24"
                          className="pointer-events-auto"
                         >
                           <button
                             type="button"
                             className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-blue-600 transition-colors border border-white"
                             title="Swap Order"
                             onClick={(e) => {
                               e.stopPropagation();
                               const updated = [...machinePositions];
                               // Swap machines and their assignments
                               const tempMachine = updated[idx].machine;
                               const tempOpId = updated[idx].operatorId;
                               const tempOpName = updated[idx].operatorName;
                               
                               updated[idx].machine = updated[idx+1].machine;
                               updated[idx].operatorId = updated[idx+1].operatorId;
                               updated[idx].operatorName = updated[idx+1].operatorName;
                               
                               updated[idx+1].machine = tempMachine;
                               updated[idx+1].operatorId = tempOpId;
                               updated[idx+1].operatorName = tempOpName;
                               
                               setMachinePositions(updated);
                               toast({
                                 title: "Flow Interchanged",
                                 description: `Swapped ${updated[idx+1].machine.machineName} and ${updated[idx].machine.machineName}`
                               });
                             }}
                           >
                             <ArrowRightLeft className="h-3 w-3" />
                           </button>
                         </foreignObject>
                       </g>
                     );
                  })}
                </svg>

                {/* Machines on canvas */}
                {machinePositions.map((pos, index) => (
                  <div
                    key={`${index}-${pos.machine.id}`}
                    className={`absolute w-24 h-24 rounded-2xl flex flex-col items-center justify-center text-[11px] font-bold shadow-2xl transition-all hover:scale-105 active:cursor-grabbing border-2 ${
                      selectedMachinePosition === index 
                        ? 'border-blue-500 bg-blue-100 text-blue-900 z-50 ring-4 ring-blue-500/20' 
                        : 'border-white bg-primary text-primary-foreground'
                    }`}
                    style={{
                      left: `${pos.x}px`,
                      top: `${pos.y}px`,
                      transform: `rotate(${pos.rotation}deg)`
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMachinePosition(index);
                    }}
                    draggable
                    onDragStart={(e) => handleDragStart(pos.machine, e, index)}
                  >
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center">
                      <div className="text-[10px] uppercase opacity-60 font-black mb-1 leading-none">
                        {pos.machine.machineName}
                      </div>
                      {pos.operatorName ? (
                        <div className="bg-white/90 text-primary px-2 py-1 rounded-md text-[10px] font-black shadow-sm flex items-center gap-1 border border-primary/20">
                          <Users className="h-3 w-3" />
                          {pos.operatorName.split(' ')[0]}
                        </div>
                      ) : (
                        <div className="text-[8px] opacity-40 font-normal italic">
                          No Operator
                        </div>
                      )}
                    </div>
                    <div className="absolute -top-3 -right-3 w-8 h-8 bg-accent text-accent-foreground rounded-full flex items-center justify-center text-xs shadow-md border-2 border-background font-black">
                      {pos.sequence}
                    </div>
                  </div>
                ))}

                {machinePositions.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                    <div className="text-center">
                       <Move className="h-20 w-20 mx-auto mb-4" />
                       <h2 className="text-4xl font-black uppercase tracking-tighter">Production Canvas</h2>
                       <p className="text-xl">Ready for design</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Float Toolbar for selected machine */}
              {selectedMachinePosition !== null && (
                <div className="absolute bottom-6 right-6 bg-background/80 backdrop-blur-md border shadow-2xl rounded-2xl p-4 w-64 animate-in slide-in-from-right duration-300">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-sm">Machine Properties</h4>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedMachinePosition(null)}>
                      <Plus className="rotate-45 h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase opacity-60">Sequence</Label>
                        <Input
                          type="number"
                          size={1}
                          className="h-8"
                          value={machinePositions[selectedMachinePosition].sequence}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setMachinePositions(prev => {
                              const updated = [...prev];
                              updated[selectedMachinePosition].sequence = val;
                              return updated;
                            });
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase opacity-60">Rotation</Label>
                        <Input
                          type="number"
                          className="h-8"
                          value={machinePositions[selectedMachinePosition].rotation}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setMachinePositions(prev => {
                              const updated = [...prev];
                              updated[selectedMachinePosition].rotation = val;
                              return updated;
                            });
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase opacity-60">Assign Operator</Label>
                      <Select 
                        value={machinePositions[selectedMachinePosition].operatorId || "unassigned"}
                        onValueChange={(val) => {
                          const op = operators.find(o => o.employeeId === val);
                          setMachinePositions(prev => {
                            const updated = [...prev];
                            updated[selectedMachinePosition].operatorId = val === "unassigned" ? undefined : val;
                            updated[selectedMachinePosition].operatorName = val === "unassigned" ? undefined : op?.name;
                            return updated;
                          });
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select Operator" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {operators.map(op => (
                            <SelectItem key={op.employeeId} value={op.employeeId}>
                              {op.name} ({op.employeeId})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                        <Label className="text-[10px] uppercase opacity-60">Coordinates</Label>
                        <div className="text-[10px] font-mono mt-1 opacity-80">
                          X: {Math.round(machinePositions[selectedMachinePosition].x)} | 
                          Y: {Math.round(machinePositions[selectedMachinePosition].y)}
                        </div>
                    </div>
                    <Button 
                      variant="destructive" 
                      className="w-full h-8 text-xs rounded-lg"
                      onClick={() => {
                        setMachinePositions(machinePositions.filter((_, i) => i !== selectedMachinePosition));
                        setSelectedMachinePosition(null);
                      }}
                    >
                      Remove from Canvas
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      <style jsx global>{`
        .bg-grid-pattern {
          background-image: radial-gradient(circle, #cbd5e1 1px, transparent 1px);
          background-size: 20px 20px;
        }
        .bg-dot-pattern {
          background-image: radial-gradient(#64748b 0.5px, transparent 0.5px);
          background-size: 24px 24px;
        }
      `}</style>
    </div>
  );
}
