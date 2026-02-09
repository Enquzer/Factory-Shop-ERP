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
  Download,
  Trash2,
  AlertTriangle
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
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  ReferenceArea
} from 'recharts';
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

export default function LayoutDesignerPage() {
  const { user } = useAuth();
  const { settings } = useSystemSettings();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const layoutId = searchParams.get('id');

const PitchDiagram = ({ taktTime, batchSize, orderQuantity }: { taktTime: number, batchSize: number, orderQuantity: number }) => {
  const pitch = taktTime * batchSize;
  const data = [];
  const totalPitches = Math.min(20, Math.ceil(orderQuantity / (batchSize || 1)));
  
  for (let i = 0; i <= totalPitches; i++) {
    data.push({
      pitch: `P${i}`,
      time: (i * pitch).toFixed(1),
      goal: i * batchSize,
    });
  }

  return (
    <div className="h-[250px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="pitch" label={{ value: 'Pitch (Batch Intervals)', position: 'insideBottom', offset: -5 }} />
          <YAxis label={{ value: 'Units', angle: -90, position: 'insideLeft' }} />
          <Tooltip content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <div className="bg-background border p-2 shadow-sm rounded-md text-xs">
                  <p className="font-bold">{payload[0].payload.pitch}</p>
                  <p>Time: {payload[0].payload.time} min</p>
                  <p>Goal: {payload[0].value} units</p>
                </div>
              );
            }
            return null;
          }} />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="goal" 
            stroke="#2563eb" 
            strokeWidth={3} 
            dot={{ r: 4, fill: '#2563eb' }}
            activeDot={{ r: 6 }}
            name="Production Goal Line" 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const M2MChart = ({ machine, allMachines, currentIndex }: { machine: any; allMachines?: any[]; currentIndex?: number }) => {
  const m2m = machine.m2m || { loadingTime: 0.2, machineRunTime: 0.5, unloadingTime: 0.1, walkingTime: 0.1 };
  
  // Single machine totals
  const totalCycle = m2m.loadingTime + m2m.machineRunTime + m2m.unloadingTime + m2m.walkingTime;
  const humanTime = m2m.loadingTime + m2m.unloadingTime + m2m.walkingTime;
  const machineTime = m2m.machineRunTime;
  
  // Multi-machine logic
  // Find other machines assigned to the same operator
  const operatorId = machine.operatorId;
  const siblingMachines = operatorId && allMachines 
    ? allMachines.filter((m, idx) => m.operatorId === operatorId && idx !== currentIndex)
    : [];
  
  // Calculate total manual work operator does away from this machine
  const manualWorkElsewhere = siblingMachines.reduce((sum, m) => {
    const mm = m.m2m || { loadingTime: 0, unloadingTime: 0, walkingTime: 0 };
    return sum + (mm.loadingTime || 0) + (mm.unloadingTime || 0) + (mm.walkingTime || 0);
  }, 0);

  // Interference happens if operator is away longer than machine run time
  const interference = Math.max(0, manualWorkElsewhere - machine.m2m?.machineRunTime);
  const adjustedCycle = totalCycle + interference;

  const segments = [
    { name: 'Loading', val: m2m.loadingTime, opBusy: true, macBusy: true, color: '#3b82f6' },
    { name: 'Run Time', val: m2m.machineRunTime, opBusy: false, macBusy: true, color: '#ef4444' },
    { name: 'Unload', val: m2m.unloadingTime, opBusy: true, macBusy: true, color: '#10b981' },
    { name: 'Walking', val: m2m.walkingTime, opBusy: true, macBusy: false, color: '#f59e0b' },
  ];

  return (
    <div className="space-y-6">
      {siblingMachines.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 p-2 rounded-lg flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-[10px] font-black text-blue-700 uppercase tracking-tighter">
            Multitasking: Operator also handling {siblingMachines.length} other station(s)
          </span>
        </div>
      )}

      {/* Operator Lane */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tighter opacity-50">
          <span>Operator Track</span>
          <span>{(humanTime + manualWorkElsewhere).toFixed(2)}m Total Activity</span>
        </div>
        <div className="h-10 w-full bg-slate-100 rounded-md overflow-hidden flex relative border shadow-inner">
          {segments.map((seg, i) => (
            <div 
              key={`op-${i}`}
              style={{ 
                width: `${(seg.val / adjustedCycle) * 100}%`, 
                backgroundColor: seg.opBusy ? seg.color : '#f1f5f9',
                opacity: seg.opBusy ? 1 : 0.2
              }}
              className="h-full flex items-center justify-center text-[8px] text-white font-black overflow-hidden"
            >
              {seg.opBusy && seg.val > 0.05 ? seg.name[0] : ''}
            </div>
          ))}
          {manualWorkElsewhere > 0 && (
            <div 
              style={{ width: `${(manualWorkElsewhere / adjustedCycle) * 100}%`, backgroundColor: '#475569' }}
              className="h-full flex items-center justify-center text-[8px] text-white font-black overflow-hidden"
              title="Work on other machines"
            >
              OTHERS
            </div>
          )}
        </div>
      </div>

      {/* Machine Lane */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tighter opacity-50">
          <span>Machine Track</span>
          <span>{machineTime.toFixed(2)}m Processing</span>
        </div>
        <div className="h-10 w-full bg-slate-100 rounded-md overflow-hidden flex relative border shadow-inner">
          {segments.map((seg, i) => (
            <div 
              key={`mac-${i}`}
              style={{ 
                width: `${(seg.val / adjustedCycle) * 100}%`, 
                backgroundColor: seg.macBusy ? (seg.name === 'Run Time' ? '#ef4444' : '#94a3b8') : '#f1f5f9',
                opacity: seg.macBusy ? 1 : 0.2
              }}
              className="h-full flex items-center justify-center text-[8px] text-white font-black overflow-hidden"
            >
              {seg.macBusy && seg.val > 0.05 ? (seg.name === 'Run Time' ? 'RUN' : 'W') : ''}
            </div>
          ))}
          {interference > 0 && (
            <div 
              style={{ width: `${(interference / adjustedCycle) * 100}%`, backgroundColor: '#fcd34d' }}
              className="h-full flex items-center justify-center text-[8px] text-amber-900 font-black overflow-hidden"
              title="Machine idle waiting for operator"
            >
              IDLE (Conflict)
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2 border-t">
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-bold opacity-50 uppercase">
            <span>Man/Machine Balance</span>
            <span>{((humanTime / machineTime) * 100).toFixed(0)}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
            <div className="h-full bg-blue-500" style={{ width: `${(humanTime / totalCycle) * 100}%` }} />
            <div className="h-full bg-red-500" style={{ width: `${(machineTime / totalCycle) * 100}%` }} />
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-bold opacity-50 uppercase">
             <span>NVA Ratio</span>
             <span>{((m2m.walkingTime / totalCycle) * 100).toFixed(0)}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500" style={{ width: `${(m2m.walkingTime / totalCycle) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 text-center relative overflow-hidden">
        {interference > 0 && (
          <div className="absolute top-0 left-0 w-full h-1 bg-amber-400 animate-pulse" />
        )}
        <div className="text-[10px] font-black text-primary uppercase tracking-widest leading-none mb-1">Total System Cycle Time</div>
        <div className="text-3xl font-black text-primary leading-none">
          {adjustedCycle.toFixed(2)} <span className="text-sm">min</span>
        </div>
        {interference > 0 && (
          <div className="text-[9px] font-bold text-amber-700 mt-2 uppercase flex items-center justify-center gap-1">
             <AlertTriangle className="h-3 w-3" /> Includes {interference.toFixed(2)}m Interference Loss
          </div>
        )}
      </div>
    </div>
  );
};
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
    matchingOperation?: {
      sequence: number;
      opCode: string;
      operationName: string;
      smv: number;
    } | null;
    matchingOperations?: Array<{
      sequence: number;
      opCode: string;
      operationName: string;
      smv: number;
    }>;
    // M2M fields
    m2m?: {
      loadingTime: number; // minutes
      machineRunTime: number; // minutes
      unloadingTime: number; // minutes
      walkingTime: number; // minutes
    };
  }>>([]);
  
  const [operators, setOperators] = useState<any[]>([]);
  
  const [selectedMachinePosition, setSelectedMachinePosition] = useState<number | null>(null);
  const [connections, setConnections] = useState<Array<{
    fromId: number;
    toId: number;
    label?: string;
  }>>([]);
  
  // Production calculation state
  const [orderQuantity, setOrderQuantity] = useState<number>(0);
  const [deliveryDays, setDeliveryDays] = useState<number>(0);
  const [ieAllowance, setIeAllowance] = useState<number>(10); // percentage
  const [productionAnalysis, setProductionAnalysis] = useState<any>(null);
  const [bottlenecks, setBottlenecks] = useState<number[]>([]); // Critical Bottlenecks
  const [flowLimiters, setFlowLimiters] = useState<number[]>([]);
  const [lineBalance, setLineBalance] = useState<any>(null);
  const [batchSize, setBatchSize] = useState<number>(10); // bundle size
  
  // Operation breakdown state
  const [operationBreakdown, setOperationBreakdown] = useState<any[]>([]);
  const [obSource, setObSource] = useState<string>(''); // 'IE' or 'Planning'

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
        
        // Set order quantity and delivery days if available
        if (data.orderId) {
          // First get the order details to get the internal ID
          const orderResponse = await fetch('/api/marketing-orders', { headers });
          if (orderResponse.ok) {
            const orders = await orderResponse.json();
            const order = orders.find((o: any) => o.orderNumber === data.orderId);
            if (order) {
              setOrderQuantity(order.quantity || 0);
              // Calculate delivery days from planning module
              if (order.plannedDeliveryDate || order.deliveryDate) {
                const deliveryDate = new Date(order.plannedDeliveryDate || order.deliveryDate);
                const today = new Date();
                const diffTime = deliveryDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                setDeliveryDays(Math.max(1, diffDays)); // Minimum 1 day
              }
              
              // Fetch operation breakdown using the internal order ID
              fetchOperationBreakdown(order.id);
            }
          }
        }
        
        // Process machine positions with full machine objects
        if (data.machinePositions && machines.length > 0) {
          const positionsWithMachines = data.machinePositions.map((pos: any) => {
            const machine = machines.find(m => m.id === pos.machineId);
            return {
              ...pos,
              machine: machine || { 
                id: pos.machineId, 
                machineName: `Machine ${pos.machineId}`,
                machineCode: `M${pos.machineId}`,
                category: 'Unknown',
                capacity: 0,
                unit: 'units/hour'
              }
            };
          });
          setMachinePositions(positionsWithMachines);
        } else if (data.machinePositions) {
          // Store raw positions to be processed when machines load
          setMachinePositions(data.machinePositions.map((pos: any) => ({
            ...pos,
            machine: { 
              id: pos.machineId, 
              machineName: `Loading...`,
              machineCode: `M${pos.machineId}`,
              category: 'Loading...',
              capacity: 0,
              unit: 'units/hour'
            }
          })));
        }
      }
    } catch (error) {
      console.error('Error fetching layout:', error);
      toast({
        title: "Error",
        description: "Failed to load layout",
        variant: "destructive"
      });
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

  const fetchOperationBreakdown = async (orderId: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/ie/ob/${orderId}`, { headers });
      
      if (response.ok) {
        const result = await response.json();
        setOperationBreakdown(result.items || []);
        setObSource(result.source || '');
        
        // Auto-arrange machines based on operation breakdown
        if (result.items && result.items.length > 0) {
          await autoArrangeMachines(result.items);
        }
        
        toast({
          title: "Operation Breakdown Loaded",
          description: `Loaded ${result.items?.length || 0} operations from ${result.source || 'unknown'} module`
        });
      } else {
        const errorText = await response.text();
        toast({
          title: "Warning",
          description: `Could not load operation breakdown: ${response.status}`,
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error fetching operation breakdown:', error);
      toast({
        title: "Warning",
        description: "Could not load operation breakdown for this order",
        variant: "default"
      });
    }
  };

  // Auto-arrange machines based on operation breakdown sequence
  const autoArrangeMachines = async (operations: any[]) => {
    // Clear existing machine positions
    setMachinePositions([]);
    
    // Get available machines that match the operation requirements
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
      const machineResponse = await fetch('/api/ie/machines', { headers });
      if (!machineResponse.ok) return;
      
      const machineResult = await machineResponse.json();
      const availableMachines = machineResult.data || [];
      
      // Create machine positions based on operations with row-wrapping logic
      const canvasWidth = layoutAreaRef?.clientWidth || 800;
      const spacingX = 140;
      const spacingY = 150;
      const padding = 50;
      const machinesPerRow = Math.max(1, Math.floor((canvasWidth - padding * 2) / spacingX));

      const newPositions = operations.map((op, index) => {
        // Find matching machine for this operation
        let matchingMachine = availableMachines.find((machine: any) => 
          machine.machineType.toLowerCase().includes(op.machineType?.toLowerCase() || '') ||
          machine.category.toLowerCase().includes(op.componentName?.toLowerCase() || '')
        );
        
        // If no exact match, use first available machine as fallback
        if (!matchingMachine && availableMachines.length > 0) {
          matchingMachine = availableMachines[0];
        }
        
        if (matchingMachine) {
          const row = Math.floor(index / machinesPerRow);
          const col = index % machinesPerRow;

          return {
            machine: matchingMachine,
            x: padding + (col * spacingX),
            y: padding + (row * spacingY),
            rotation: 0,
            sequence: index + 1,
            operatorId: undefined,
            operatorName: undefined,
            matchingOperation: {
              sequence: op.sequence,
              opCode: op.opCode || op.operationName,
              operationName: op.operationName,
              smv: op.smv || op.standardSMV || 0
            }
          };
        }
        return null;
      }).filter(pos => pos !== null) as typeof machinePositions;
      
      setMachinePositions(newPositions);
      
      toast({
        title: "Auto-Arrangement Complete",
        description: `Arranged ${newPositions.length} machines based on operation sequence`
      });
      
    } catch (error) {
      console.error('Error auto-arranging machines:', error);
    }
  };

  // Calculate line balance metrics using user's formulas
  const calculateLineBalance = () => {
    if (machinePositions.length === 0 || (operationBreakdown.length === 0 && !machinePositions.some(p => p.matchingOperations?.length))) return;
    
    const workingHoursPerDay = 8;
    const availableWorkingTimeMinutes = 60 * workingHoursPerDay;
    const demandPerDay = orderQuantity / (deliveryDays || 1);
    
    // A. Takt Time (Tt) = Available Working Time / Customer Demand
    const taktTime = availableWorkingTimeMinutes / (demandPerDay || 1);
    
    // Sum SMV (Total Work Content)
    let sumSMV = operationBreakdown.reduce((sum, op) => sum + (op.smv || op.standardSMV || 0), 0);
    if (sumSMV === 0) {
      // Fallback: sum from assigned operations
      machinePositions.forEach(pos => {
        if (pos.matchingOperations) {
          pos.matchingOperations.forEach(op => sumSMV += (op.smv || 0));
        } else if (pos.matchingOperation) {
          sumSMV += (pos.matchingOperation.smv || 0);
        }
      });
    }

    // B. Theoretical Minimum Number of Stations (N) = Sum SMV / Tt
    const theoreticalMinStations = Math.ceil(sumSMV / (taktTime || 1));
    
    // Cycle Time of Bottleneck (highest total SMV in a station)
    const workstations = machinePositions.map((pos, index) => {
      let load = 0;
      if (pos.matchingOperations) {
        load = pos.matchingOperations.reduce((s, op) => s + (op.smv || 0), 0);
      } else if (pos.matchingOperation) {
        load = pos.matchingOperation.smv || 0;
      }
      
      return {
        workstationId: index + 1,
        machineName: pos.machine.machineName,
        load,
        idleTime: 0, // calculated below
        efficiency: 0, // calculated below
        isBottleneck: false // calculated below
      };
    });
    
    const bottleneckCycleTime = Math.max(...workstations.map(ws => ws.load), 0.001);
    
    // C. Line Efficiency (E) = (Sum SMV / (Actual Stations * Cycle Time of Bottleneck)) * 100
    const actualStations = machinePositions.length;
    const lineEfficiency = (sumSMV / (actualStations * bottleneckCycleTime)) * 100;
    
    // D. Balance Loss = 100% - Line Efficiency
    const balanceLoss = 100 - lineEfficiency;
    
    // Update workstation details with idle time and bottleneck status
    const updatedWorkstations = workstations.map(ws => ({
      ...ws,
      idleTime: bottleneckCycleTime - ws.load,
      efficiency: (ws.load / bottleneckCycleTime) * 100,
      isBottleneck: ws.load === bottleneckCycleTime
    }));
    
    const balanceData = {
      taktTime,
      totalCycleTime: sumSMV,
      lineEfficiency,
      theoreticalMinStations,
      balanceLoss,
      workstations: updatedWorkstations,
      bottleneckWorkstation: updatedWorkstations.find(ws => ws.isBottleneck),
      numberOfWorkstations: actualStations
    };
    
    setLineBalance(balanceData);
    
    toast({
      title: "Line Balance Analysis Complete",
      description: `Efficiency: ${lineEfficiency.toFixed(1)}% | Bottleneck: ${balanceData.bottleneckWorkstation?.machineName || 'None'}`
    });
  };

  // Step 3: Workstation Assignment (Heuristic Logic)
  const autoBalanceWorkstations = async () => {
    if (!orderQuantity || !deliveryDays || operationBreakdown.length === 0) {
      toast({
        title: "Missing Data",
        description: "Please select an order and set quantity/delivery timeline",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const workingHoursPerDay = 8;
      const availableTime = workingHoursPerDay * 60; // minutes
      const efficiencyAllowance = 100 / (100 + ieAllowance);
      const demand = orderQuantity / deliveryDays;
      
      // Step 2: Calculate Target Cycle Time (Ct)
      const ct = (availableTime * efficiencyAllowance) / demand;

      // Group operations into workstations
      const stations: any[] = [];
      let currentOps: any[] = [];
      let currentLoad = 0;

      const sortedOps = [...operationBreakdown].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

      sortedOps.forEach(op => {
        const opSMV = op.smv || op.standardSMV || 0;
        if (currentLoad + opSMV <= ct && currentOps.length > 0) {
          currentOps.push(op);
          currentLoad += opSMV;
        } else {
          if (currentOps.length > 0) {
            stations.push({ ops: currentOps, load: currentLoad });
          }
          currentOps = [op];
          currentLoad = opSMV;
        }
      });
      if (currentOps.length > 0) {
        stations.push({ ops: currentOps, load: currentLoad });
      }

      // Fetch machines for placement
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
      const machineResponse = await fetch('/api/ie/machines', { headers });
      const machineResult = await machineResponse.json();
      const availableMachines = machineResult.data || [];

      const canvasWidth = layoutAreaRef?.clientWidth || 800;
      const spacingX = 140;
      const spacingY = 150;
      const padding = 50;
      const machinesPerRow = Math.max(1, Math.floor((canvasWidth - padding * 2) / spacingX));

      const newPositions = stations.map((station, index) => {
        // Find best machine based on most frequent type in ops or just first available
        const mainOp = station.ops[0];
        let matchingMachine = availableMachines.find((m: any) => 
          m.machineType.toLowerCase().includes(mainOp.machineType?.toLowerCase() || '')
        );
        if (!matchingMachine) matchingMachine = availableMachines[0];

        const row = Math.floor(index / machinesPerRow);
        const col = index % machinesPerRow;

        return {
          machine: matchingMachine,
          x: padding + (col * spacingX),
          y: padding + (row * spacingY),
          rotation: 0,
          sequence: index + 1,
          matchingOperations: station.ops.map((op: any) => ({
            sequence: op.sequence,
            opCode: op.opCode || op.operationName,
            operationName: op.operationName,
            smv: op.smv || op.standardSMV || 0
          }))
        };
      });

      setMachinePositions(newPositions);
      toast({
        title: "Balanced Assignment Complete",
        description: `Grouped ${operationBreakdown.length} operations into ${newPositions.length} workstations (Target CT: ${ct.toFixed(2)} min)`
      });
      
    } catch (error) {
      console.error('Error auto-balancing:', error);
      toast({ title: "Error", description: "Failed to perform balanced assignment", variant: "destructive" });
    } finally {
      setLoading(false);
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

  // Grid snapping configuration
  const GRID_SIZE = 30; // pixels
  const ALIGN_SPACING = 120; // pixels between aligned machines
  
  const snapToGrid = (coord: number) => {
    return Math.round(coord / GRID_SIZE) * GRID_SIZE;
  };
  
  const checkOverlap = (newX: number, newY: number, currentIndex?: number) => {
    const machineSize = 96;
    return machinePositions.some((pos, index) => {
      if (currentIndex !== undefined && index === currentIndex) return false;
      
      const existingRight = pos.x + machineSize;
      const existingBottom = pos.y + machineSize;
      const newRight = newX + machineSize;
      const newBottom = newY + machineSize;
      
      return (
        newX < existingRight &&
        newRight > pos.x &&
        newY < existingBottom &&
        newBottom > pos.y
      );
    });
  };
  
  const alignMachinesHorizontally = (positions: typeof machinePositions) => {
    if (!layoutAreaRef) return positions;
    
    // Sort by sequence or current x
    const sorted = [...positions].sort((a, b) => a.sequence - b.sequence);
    
    const canvasWidth = layoutAreaRef.clientWidth || 800;
    const spacingX = 140; // Horizontal gap
    const spacingY = 150; // Vertical gap
    const padding = 50;
    const machineWidth = 96;
    
    // Calculate how many machines fit in one row
    const machinesPerRow = Math.max(1, Math.floor((canvasWidth - padding * 2) / spacingX));
    
    return sorted.map((pos, index) => {
      const row = Math.floor(index / machinesPerRow);
      const col = index % machinesPerRow;
      
      return {
        ...pos,
        x: padding + (col * spacingX),
        y: padding + (row * spacingY),
      };
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!layoutAreaRef) return;
    
    const rect = layoutAreaRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const machineSize = 96;
    
    // Calculate top-left based on click center (subtracting 48)
    // and immediately clamp to area boundaries
    const finalX = Math.max(0, Math.min(x - 48, rect.width - machineSize));
    const finalY = Math.max(0, Math.min(y - 48, rect.height - machineSize));
    
    // Snap to grid AFTER clamping
    const snappedX = snapToGrid(finalX);
    const snappedY = snapToGrid(finalY);

    // Check for overlap using the snapped coordinates
    if (checkOverlap(snappedX, snappedY, movingMachineIndex ?? undefined)) {
      toast({
        title: "Overlap Detected",
        description: "Cannot place machine here - would overlap with existing machine",
        variant: "destructive"
      });
      setDraggedMachine(null);
      setMovingMachineIndex(null);
      return;
    }
    
    if (movingMachineIndex !== null) {
      // Handle moving an existing machine
      setMachinePositions(prev => {
        const updated = [...prev];
        updated[movingMachineIndex] = {
          ...updated[movingMachineIndex],
          x: snappedX,
          y: snappedY
        };
        
        // Auto-align if Ctrl key is pressed
        if (e.ctrlKey) {
          return alignMachinesHorizontally(updated);
        }
        
        return updated;
      });
      setMovingMachineIndex(null);
    } else if (draggedMachine) {
      // Handle adding a new machine
      const newSequence = machinePositions.length + 1;
      const newPosition = {
        machine: draggedMachine,
        x: snappedX,
        y: snappedY,
        rotation: 0,
        sequence: newSequence
      };
      
      setMachinePositions(prev => {
        const updated = [...prev, newPosition];
        
        // Auto-align if Shift key is pressed
        if (e.shiftKey) {
          return alignMachinesHorizontally(updated);
        }
        
        return updated;
      });
      setDraggedMachine(null);
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
        batchSize,
        machinePositions: machinePositions.map(pos => ({
          machineId: pos.machine.id,
          x: pos.x,
          y: pos.y,
          rotation: pos.rotation,
          sequence: pos.sequence,
          operatorId: pos.operatorId,
          operatorName: pos.operatorName,
          m2m: pos.m2m
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
      productImage,
      section: selectedSection,
      machinePositions: machinePositions.map((pos, idx) => ({
        ...pos,
        machineId: pos.machine.id,
        sequence: pos.sequence || idx + 1
      })),
      operationBreakdown,
      lineBalance,
      productionAnalysis,
      orderQuantity,
      deliveryDays,
      batchSize,
      branding: {
        companyName: settings.companyName,
        logo: settings.logo || undefined,
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor
      }
    };
    
    try {
      const url = await generateMachineLayoutPDF(layoutData, layoutData.branding);
      window.open(url, '_blank');
      
      // Clean up the blob URL after a delay
      setTimeout(() => {
        try {
          URL.revokeObjectURL(url);
        } catch (error) {}
      }, 1000);
    } catch (error) {
      console.error('PDF export failed:', error);
      toast({
        title: "Export Failed",
        description: "There was an error generating the PDF report.",
        variant: "destructive"
      });
    }
  };

  // Calculate production requirements and identify bottlenecks
  const calculateProductionFlow = async () => {
    if (!orderQuantity || !deliveryDays || machinePositions.length === 0) {
      toast({
        title: "Missing Data",
        description: "Please select an order and set quantity/delivery timeline",
        variant: "destructive"
      });
      return;
    }

    try {
      const workingHoursPerDay = 8;
      const totalWorkingHours = deliveryDays * workingHoursPerDay;
      const requiredOutputPerHour = orderQuantity / totalWorkingHours;
      
      // Apply IE allowance (buffer)
      const adjustedRequiredOutput = requiredOutputPerHour * (1 + ieAllowance / 100);
      
      // Calculate total SMV from operation breakdown if available
      let totalSMV = 0;
      if (operationBreakdown.length > 0) {
        totalSMV = operationBreakdown.reduce((sum: number, op: any) => 
          sum + (op.smv || op.standardSMV || 0), 0
        );
      }
      
      // Fetch operator skill data
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const operatorSkillsResponse = await fetch('/api/ie/operators/skills', { headers });
      const operatorSkills = operatorSkillsResponse.ok ? await operatorSkillsResponse.json() : { data: [] };
      
      // Analyze each machine in the flow
      const analysis = machinePositions.map((pos, index) => {
        const machine = pos.machine;
        const operator = operatorSkills.data?.find((op: any) => op.employeeId === pos.operatorId);
        
        // Base capacity from machine specs
        let effectiveCapacity = machine.capacity;
        
        // Adjust for operator skill (if assigned)
        if (operator) {
          const skillFactor = operator.skillLevel === 'expert' ? 1.2 : 
                             operator.skillLevel === 'intermediate' ? 1.0 : 
                             operator.skillLevel === 'beginner' ? 0.7 : 1.0;
          effectiveCapacity *= skillFactor;
        }
        
        // Use already assigned operations if available
        let ops = pos.matchingOperations || (pos.matchingOperation ? [pos.matchingOperation] : []);
        const opSMV = ops.reduce((sum, o) => sum + (o.smv || 0), 0);
        
        // Target is what the whole line needs to produce
        const targetOutput = adjustedRequiredOutput;
        
        // Capacity is limited by both machine speed and process time (SMV)
        // If SMV is 0, we only use machine capacity.
        // If SMV > 0, process capacity = 60 / SMV
        const processCapacity = opSMV > 0 ? (60 / opSMV) : effectiveCapacity;
        
        // Workstation capacity is the bottleneck of machine vs process
        const workstationCapacity = Math.min(effectiveCapacity, processCapacity);
        
        const utilization = (targetOutput / workstationCapacity) * 100;
        
        return {
          index,
          machineId: machine.id,
          machineName: machine.machineName,
          machineCode: machine.machineCode,
          baseCapacity: machine.capacity,
          effectiveCapacity,
          requiredOutput: targetOutput,
          utilization,
          operatorAssigned: !!pos.operatorId,
          operatorName: pos.operatorName,
          operatorSkill: operator?.skillLevel || 'unassigned',
          isBottleneck: utilization > 100,
          matchingOperations: ops,
          workstationCapacity
        };
      });
      
      // Map results for analysis report and canvas
      const analysisWithStatus = analysis.map((item: any) => {
        const isCritical = item.utilization > 100;
        const isMin = item.workstationCapacity === Math.min(...analysis.map((a: any) => a.workstationCapacity));
        
        return {
          ...item,
          status: isCritical ? 'CRITICAL BOTTLENECK' : (isMin ? 'FLOW LIMITER' : 'CLEAR')
        };
      });

      setProductionAnalysis({
        requiredOutputPerHour: adjustedRequiredOutput,
        totalWorkingHours,
        totalSMV,
        analysis: analysisWithStatus
      });
      
      // Update machine positions with matching operations
      setMachinePositions(prev => prev.map((pos, index) => {
        const analysisItem = analysisWithStatus.find((a: any) => a.index === index);
        return {
          ...pos,
          matchingOperations: analysisItem?.matchingOperations || []
        };
      }));
      
      // Identify Critical Bottlenecks and Flow Limiters
      const criticalIndices = analysisWithStatus
        .map((item: any, index: number) => item.status === 'CRITICAL BOTTLENECK' ? index : -1)
        .filter((index: number) => index !== -1);
      
      const limiterIndices = analysisWithStatus
        .map((item: any, index: number) => item.status === 'FLOW LIMITER' ? index : -1)
        .filter((index: number) => index !== -1);
      
      setBottlenecks(criticalIndices);
      setFlowLimiters(limiterIndices);
      
      toast({
        title: "Analysis Complete",
        description: `Identified ${criticalIndices.length} critical bottleneck(s) and ${limiterIndices.length} flow limiter(s)`
      });
      
    } catch (error) {
      console.error('Error calculating production flow:', error);
      toast({
        title: "Error",
        description: "Failed to calculate production requirements",
        variant: "destructive"
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
    <div className="space-y-6 animate-in fade-in duration-700 w-full max-w-full overflow-x-hidden">
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
                          // Auto-populate order quantity
                          setOrderQuantity(order.quantity || 0);
                          
                          // Calculate delivery days from planning module
                          if (order.plannedDeliveryDate || order.deliveryDate) {
                            const deliveryDate = new Date(order.plannedDeliveryDate || order.deliveryDate);
                            const today = new Date();
                            const diffTime = deliveryDate.getTime() - today.getTime();
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            setDeliveryDays(Math.max(1, diffDays)); // Minimum 1 day
                          }
                          
                          // Fetch operation breakdown for this order
                          const orderIdToFetch = order.id; // Use internal ID, not orderNumber
                          fetchOperationBreakdown(orderIdToFetch);
                          
                          // Sanitize image URL: If it's a blob URL from the server, it's likely invalid/revoked.
                          // Only allow real paths (e.g. /uploads/...) or data URIs.
                          const imgUrl = order.imageUrl;
                          if (imgUrl && !imgUrl.startsWith('blob:')) {
                            setProductImage(imgUrl);
                          } else {
                            setProductImage(null);
                          }
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
                <Label htmlFor="section" className="text-sm">Process Section</Label>
                <Select value={selectedSection} onValueChange={setSelectedSection}>
                  <SelectTrigger className="h-10">
                    <SelectValue className="text-sm" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cutting" className="text-sm">Cutting</SelectItem>
                    <SelectItem value="Sewing" className="text-sm">Sewing</SelectItem>
                    <SelectItem value="Finishing" className="text-sm">Finishing</SelectItem>
                    <SelectItem value="Packing" className="text-sm">Packing</SelectItem>
                    <SelectItem value="Quality Control" className="text-sm">Quality Control</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Operation Breakdown Preview - Always visible when operations loaded */}
              {operationBreakdown.length > 0 && (
                <Card className="border-dashed border-blue-500/50 bg-blue-50/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Factory className="h-5 w-5 text-blue-600" />
                      Operation Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm uppercase font-bold text-blue-700">
                        {operationBreakdown.length} Operations Loaded
                      </div>
                      <Badge 
                        variant="secondary" 
                        className="text-xs h-6"
                      >
                        {obSource}
                      </Badge>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {operationBreakdown.map((op: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm p-2 bg-white/50 rounded">
                          <div className="flex-1">
                            <div className="font-medium">
                              {op.sequence}. {op.operationName || op.opCode}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {op.componentName || 'General Operation'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-blue-600 font-mono">
                              {op.smv || op.standardSMV || 0} SMV
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {op.machineType || 'Any Machine'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Production Requirements */}
              {orderId && (
                <Card className="border-dashed border-yellow-500/50 bg-yellow-50/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-yellow-600" />
                      Production Requirements
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="orderQty" className="text-sm">Order Quantity</Label>
                        <Input
                          id="orderQty"
                          type="number"
                          value={orderQuantity}
                          onChange={(e) => setOrderQuantity(parseInt(e.target.value) || 0)}
                          placeholder="Units"
                          className="h-10 text-base"
                        />
                      </div>
                      <div>
                        <Label htmlFor="deliveryDays" className="text-sm">Delivery Days</Label>
                        <Input
                          id="deliveryDays"
                          type="number"
                          value={deliveryDays}
                          onChange={(e) => setDeliveryDays(parseInt(e.target.value) || 0)}
                          placeholder="Days"
                          className="h-10 text-base"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm">Batch Size (Bundle)</Label>
                        <Input
                          type="number"
                          value={batchSize}
                          onChange={(e) => setBatchSize(parseInt(e.target.value) || 1)}
                          className="h-10 text-base"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">IE Allowance (%)</Label>
                        <Input
                          type="number"
                          value={ieAllowance}
                          onChange={(e) => setIeAllowance(parseInt(e.target.value) || 0)}
                          className="h-10 text-base"
                        />
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <Button 
                        onClick={calculateProductionFlow}
                        className="w-full h-10 text-base"
                        disabled={!orderQuantity || !deliveryDays}
                      >
                        <BarChart3 className="mr-1 h-4 w-4" />
                        Analyze Flow & Bottlenecks
                      </Button>
                      
                      {operationBreakdown.length > 0 && (
                        <Button 
                          onClick={() => autoArrangeMachines(operationBreakdown)}
                          className="w-full h-10 text-base"
                          variant="secondary"
                        >
                          <Layout className="mr-1 h-4 w-4" />
                          Re-Arrange Machines
                        </Button>
                      )}
                      
                      {machinePositions.length > 0 && operationBreakdown.length > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                          <Button 
                            onClick={calculateLineBalance}
                            className="h-10 text-base"
                            variant="outline"
                          >
                            <BarChart3 className="mr-1 h-4 w-4" />
                            Line Balance
                          </Button>
                          <Button 
                            onClick={autoBalanceWorkstations}
                            className="h-10 text-base bg-blue-600 hover:bg-blue-700"
                          >
                            <Layout className="mr-1 h-4 w-4" />
                            Auto-Balance
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {lineBalance && (
                      <div className="mt-4">
                        <Tabs defaultValue="balance" className="w-full">
                          <TabsList className="grid w-full grid-cols-3 h-11 bg-slate-100 p-1 rounded-xl">
                            <TabsTrigger value="balance" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-bold uppercase tracking-tighter">Balance</TabsTrigger>
                            <TabsTrigger value="pitch" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-bold uppercase tracking-tighter">Pitch</TabsTrigger>
                            <TabsTrigger value="m2m" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-bold uppercase tracking-tighter">M2M</TabsTrigger>
                          </TabsList>
                          
                          <TabsContent value="balance" className="pt-4 animate-in fade-in duration-500">
                            <div className="grid grid-cols-2 gap-x-6 gap-y-3 bg-white p-4 rounded-xl border-2 border-slate-100 shadow-sm transition-all hover:border-blue-100">
                              <div className="flex justify-between text-sm">
                                <span className="opacity-60 font-bold">Takt Time:</span>
                                <span className="text-green-600 font-black">{lineBalance.taktTime.toFixed(3)}m</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="opacity-60 font-bold">Efficiency:</span>
                                <span className={`font-black ${lineBalance.lineEfficiency >= 80 ? 'text-green-600' : 'text-red-600'}`}>
                                  {lineBalance.lineEfficiency.toFixed(1)}%
                                </span>
                              </div>
                              <div className="flex justify-between text-sm border-t pt-2">
                                <span className="opacity-60 font-bold">Min Workers:</span>
                                <span className="text-blue-600 font-black">{lineBalance.theoreticalMinStations}</span>
                              </div>
                              <div className="flex justify-between text-sm border-t pt-2">
                                <span className="opacity-60 font-bold">Loss %:</span>
                                <span className="text-red-600 font-black">{lineBalance.balanceLoss.toFixed(1)}%</span>
                              </div>
                            </div>
                            
                            <div className="mt-4 max-h-[250px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                              {lineBalance.workstations.map((ws: any) => (
                                <div key={ws.workstationId} className={`p-4 rounded-xl border-2 flex flex-col gap-2 transition-all hover:scale-[1.02] ${ws.isBottleneck ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                                  <div className="flex justify-between items-center">
                                    <span className="font-black text-[10px] uppercase tracking-wider truncate max-w-[150px]">Ws #{ws.workstationId}: {ws.machineName}</span>
                                    {ws.isBottleneck && <Badge variant="destructive" className="h-4 text-[8px] animate-pulse rounded-full font-black">BOTTLENECK</Badge>}
                                  </div>
                                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                                    <div 
                                      className={`h-full transition-all duration-1000 ${ws.isBottleneck ? 'bg-red-500' : 'bg-blue-600'}`} 
                                      style={{ width: `${Math.min(100, ws.efficiency)}%` }}
                                    />
                                  </div>
                                  <div className="flex justify-between text-[10px] font-black opacity-40 uppercase tracking-tighter">
                                    <span>Process: {ws.load.toFixed(2)}m</span>
                                    <span>Idle: {ws.idleTime.toFixed(2)}m</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </TabsContent>
                          
                          <TabsContent value="pitch" className="pt-4 space-y-4 animate-in fade-in duration-500">
                            <div className="bg-white p-4 rounded-xl border-2 border-slate-100 shadow-sm overflow-hidden">
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 text-center border-b pb-2">Production Goal Pitch Diagram</h4>
                              <div className="text-xl font-black text-primary mb-1 text-center">
                                {(lineBalance.taktTime * batchSize).toFixed(2)} MIN / BUNDLE
                              </div>
                              <p className="text-[10px] text-muted-foreground leading-tight font-medium text-center italic">Planned production pace for a bundle size of {batchSize} pieces.</p>
                              
                              <PitchDiagram 
                                taktTime={lineBalance.taktTime} 
                                batchSize={batchSize} 
                                orderQuantity={orderQuantity} 
                              />
                            </div>
                          </TabsContent>
                          
                          <TabsContent value="m2m" className="pt-4 space-y-4 animate-in fade-in duration-500">
                            <div className="bg-white p-4 rounded-xl border-2 border-slate-100 shadow-sm transition-all hover:border-orange-100">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 text-center border-b pb-2">Worker-Machine (M2M) Interaction</h4>
                                
                                {selectedMachinePosition !== null ? (
                                  <div className="animate-in slide-in-from-bottom duration-300">
                                    <div className="flex items-center gap-4 mb-5 border-b pb-4">
                                      <div className="w-12 h-12 rounded-2xl bg-primary shadow-2xl flex items-center justify-center font-black text-white text-xl">
                                        {machinePositions[selectedMachinePosition].sequence}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="font-black text-sm truncate uppercase leading-tight">{machinePositions[selectedMachinePosition].machine.machineName}</div>
                                        <div className="text-[10px] opacity-40 uppercase font-black tracking-widest">{machinePositions[selectedMachinePosition].machine.machineCode}</div>
                                      </div>
                                    </div>
                                    
                                    <M2MChart 
                                      machine={machinePositions[selectedMachinePosition]} 
                                      allMachines={machinePositions}
                                      currentIndex={selectedMachinePosition}
                                    />
                                  </div>
                                ) : (
                                  <div className="text-center py-16 text-muted-foreground flex flex-col items-center gap-3">
                                    <Search className="h-12 w-12 opacity-10" />
                                    <span className="text-[11px] font-black uppercase tracking-widest opacity-40">Select machine on canvas</span>
                                  </div>
                                )}
                            </div>
                          </TabsContent>
                        </Tabs>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
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
          <Card className="h-full min-h-[700px] flex flex-col shadow-xl border-dashed border-2 w-full">
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
            <CardContent className="flex-1 p-0 relative overflow-hidden bg-dot-pattern w-full">
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
                {machinePositions.map((pos, index) => {
                  const isBottleneck = bottlenecks.includes(index);
                  const isFlowLimiter = flowLimiters.includes(index);
                  const utilization = productionAnalysis?.analysis?.find((a: any) => a.index === index)?.utilization || 0;
                  
                  return (
                    <div
                      key={`${index}-${pos.machine.id}`}
                      className={`absolute w-24 h-24 rounded-2xl flex flex-col items-center justify-center text-sm font-bold shadow-2xl transition-all hover:scale-105 active:cursor-grabbing border-2 ${
                        selectedMachinePosition === index 
                          ? 'border-blue-500 bg-blue-100 text-blue-900 z-50 ring-4 ring-blue-500/20' 
                          : isBottleneck
                            ? 'border-red-500 bg-red-100 text-red-900 animate-pulse ring-4 ring-red-500/30'
                            : isFlowLimiter
                              ? 'border-yellow-600 bg-yellow-50 text-yellow-900 ring-4 ring-yellow-500/20'
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
                        <div className="text-xs uppercase opacity-60 font-black mb-1 leading-none">
                          {pos.machine.machineName}
                        </div>
                        {((pos.matchingOperations && pos.matchingOperations.length > 0) || pos.matchingOperation) && (
                          <div className={`text-[10px] px-2 py-1 rounded mb-1 max-w-full overflow-hidden ${
                            isBottleneck 
                              ? 'bg-red-200 text-red-800' 
                              : isFlowLimiter
                                ? 'bg-yellow-200 text-yellow-800'
                                : 'bg-blue-100 text-blue-800'
                          }`}>
                            {pos.matchingOperations && pos.matchingOperations.length > 0 ? (
                                <span>{pos.matchingOperations.length} Ops ({pos.matchingOperations.reduce((s,o)=>s+o.smv,0).toFixed(2)}m)</span>
                            ) : (
                                <span>Op {pos.matchingOperation?.sequence}: {pos.matchingOperation?.operationName}</span>
                            )}
                          </div>
                        )}
                        {pos.operatorName ? (
                          <div className={`px-2 py-1 rounded-md text-xs font-black shadow-sm flex items-center gap-1 border ${
                            isBottleneck 
                              ? 'bg-red-200 text-red-800 border-red-300' 
                              : 'bg-white/90 text-primary border-primary/20'
                          }`}>
                            <Users className="h-3 w-3" />
                            {pos.operatorName.split(' ')[0]}
                          </div>
                        ) : (
                          <div className="text-[8px] opacity-40 font-normal italic">
                            No Operator
                          </div>
                        )}
                        
                        {/* Status/Utilization badge */}
                        {(isBottleneck || isFlowLimiter) && utilization > 0 && (
                          <div className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-white text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap font-black shadow-sm ${
                            isBottleneck ? 'bg-red-500' : 'bg-yellow-600'
                          }`}>
                            {isBottleneck ? `BOTTLENECK ${utilization.toFixed(0)}%` : 'FLOW LIMITER'}
                          </div>
                        )}
                      </div>
                      <div className={`absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center text-xs shadow-md border-2 border-background font-black ${
                        isBottleneck ? 'bg-red-500 text-white' : isFlowLimiter ? 'bg-yellow-600 text-white' : 'bg-accent text-accent-foreground'
                      }`}>
                        {pos.sequence}
                      </div>
                    </div>
                  );
                })}

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

              {/* Float Toolbar for selected machine - positioned near the machine */}
              {selectedMachinePosition !== null && machinePositions[selectedMachinePosition] && layoutAreaRef && (
                (() => {
                  const idx = selectedMachinePosition;
                  const pos = machinePositions[idx];
                  
                  return (
                    <div 
                      className="absolute bg-background/90 backdrop-blur-md border shadow-2xl rounded-2xl p-4 w-64 animate-in slide-in-from-right duration-300 z-50 transition-all hover:bg-background"
                      style={{
                        left: `${Math.min(pos.x + 120, (layoutAreaRef?.clientWidth || 800) - 280)}px`,
                        top: `${Math.min(pos.y, (layoutAreaRef?.clientHeight || 600) - 200)}px`,
                        maxWidth: '256px'
                      }}
                    >
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-black text-xs uppercase tracking-widest opacity-40">Machine Properties</h4>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full" 
                            onClick={() => {
                              setMachinePositions(machinePositions.filter((_, i) => i !== idx));
                              setSelectedMachinePosition(null);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setSelectedMachinePosition(null)}>
                            <Plus className="rotate-45 h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold opacity-60">Sequence</Label>
                            <Input
                              type="number"
                              size={1}
                              className="h-9 text-sm font-black bg-slate-50 border-slate-200"
                              value={pos.sequence}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setMachinePositions(prev => {
                                  const updated = [...prev];
                                  updated[idx].sequence = val;
                                  return updated;
                                });
                              }}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold opacity-60">Rotation</Label>
                            <Input
                              type="number"
                              className="h-9 text-sm font-black bg-slate-50 border-slate-200"
                              value={pos.rotation}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setMachinePositions(prev => {
                                  const updated = [...prev];
                                  updated[idx].rotation = val;
                                  return updated;
                                });
                              }}
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold opacity-60">Operator</Label>
                          <Select 
                            value={pos.operatorId || "unassigned"}
                            onValueChange={(val) => {
                              const op = operators.find(o => o.employeeId === val);
                              setMachinePositions(prev => {
                                const updated = [...prev];
                                updated[idx].operatorId = val === "unassigned" ? undefined : val;
                                updated[idx].operatorName = val === "unassigned" ? undefined : op?.name;
                                return updated;
                              });
                            }}
                          >
                            <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-200 font-bold">
                              <SelectValue placeholder="Unassigned" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned" className="text-xs">Unassigned</SelectItem>
                              {operators.map(op => (
                                <SelectItem key={op.employeeId} value={op.employeeId} className="text-xs">
                                  {op.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
    
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold opacity-60">Base Capacity</Label>
                          <Input
                            type="number"
                            className="h-9 text-sm font-black bg-slate-50 border-slate-200"
                            value={pos.machine.capacity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setMachinePositions(prev => {
                                const updated = [...prev];
                                updated[idx] = {
                                  ...updated[idx],
                                  machine: {
                                    ...updated[idx].machine,
                                    capacity: val
                                  }
                                };
                                return updated;
                              });
                            }}
                          />
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                          <h5 className="text-[10px] uppercase font-black opacity-30 tracking-widest">M2M Timing (min)</h5>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[9px] font-bold opacity-50 uppercase">Loading</Label>
                              <Input
                                type="number"
                                step="0.01"
                                className="h-8 text-xs font-black font-mono bg-blue-50/50 border-blue-100"
                                value={pos.m2m?.loadingTime || 0}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setMachinePositions(prev => {
                                    const updated = [...prev];
                                    updated[idx] = {
                                      ...updated[idx],
                                      m2m: { ...(updated[idx].m2m || { machineRunTime: 0, unloadingTime: 0, walkingTime: 0 }), loadingTime: val }
                                    };
                                    return updated;
                                  });
                                }}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[9px] font-bold opacity-50 uppercase">Run Time</Label>
                              <Input
                                type="number"
                                step="0.01"
                                className="h-8 text-xs font-black font-mono bg-red-50/50 border-red-100"
                                value={pos.m2m?.machineRunTime || 0}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setMachinePositions(prev => {
                                    const updated = [...prev];
                                    updated[idx] = {
                                      ...updated[idx],
                                      m2m: { ...(updated[idx].m2m || { loadingTime: 0, unloadingTime: 0, walkingTime: 0 }), machineRunTime: val }
                                    };
                                    return updated;
                                  });
                                }}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[9px] font-bold opacity-50 uppercase">Unload</Label>
                              <Input
                                type="number"
                                step="0.01"
                                className="h-8 text-xs font-black font-mono bg-green-50/50 border-green-100"
                                value={pos.m2m?.unloadingTime || 0}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setMachinePositions(prev => {
                                    const updated = [...prev];
                                    updated[idx] = {
                                      ...updated[idx],
                                      m2m: { ...(updated[idx].m2m || { loadingTime: 0, machineRunTime: 0, walkingTime: 0 }), unloadingTime: val }
                                    };
                                    return updated;
                                  });
                                }}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[9px] font-bold opacity-50 uppercase">Walking</Label>
                              <Input
                                type="number"
                                step="0.01"
                                className="h-8 text-xs font-black font-mono bg-orange-50/50 border-orange-100"
                                value={pos.m2m?.walkingTime || 0}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setMachinePositions(prev => {
                                    const updated = [...prev];
                                    updated[idx] = {
                                      ...updated[idx],
                                      m2m: { ...(updated[idx].m2m || { loadingTime: 0, machineRunTime: 0, unloadingTime: 0 }), walkingTime: val }
                                    };
                                    return updated;
                                  });
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()
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
