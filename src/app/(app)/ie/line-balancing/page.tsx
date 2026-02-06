'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Plus, Settings, BarChart3, Factory, Clock, AlertTriangle, Zap } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/auth-context';

interface Workstation {
  id: number;
  workstationCode: string;
  workstationName: string;
  section: string;
  capacity: number;
  currentLoad: number;
  status: 'available' | 'occupied' | 'maintenance';
  smv: number;
  efficiency: number;
  targetEfficiency: number;
}

interface LineBalance {
  id: number;
  orderId: string;
  productCode: string;
  lineName: string;
  section: string;
  targetOutput: number;
  workingHours: number;
  numberOfWorkstations: number;
  totalSMV: number;
  calculatedCycleTime: number;
  actualCycleTime: number;
  lineEfficiency: number;
  status: 'planned' | 'active' | 'completed';
  createdAt: string;
}

interface MarketingOrder {
  id: string; // Changed from number to string to match actual ID type
  orderNumber: string;
  productCode: string;
  productName: string;
  quantity: number;
  status: string;
}

export default function LineBalancingPage() {
  const { user } = useAuth();
  const [workstations, setWorkstations] = useState<Workstation[]>([]);
  const [lineBalances, setLineBalances] = useState<LineBalance[]>([]);
  const [marketingOrders, setMarketingOrders] = useState<MarketingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [productCode, setProductCode] = useState('');
  const [targetOutput, setTargetOutput] = useState('');
  const [workingHours, setWorkingHours] = useState('8');
  const [autoBalance, setAutoBalance] = useState(true);
  
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Get auth token
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Fetch workstations
      const workstationsRes = await fetch('/api/ie/line-balancing/workstations', { headers });
      if (workstationsRes.ok) {
        const workstationsData = await workstationsRes.json();
        setWorkstations(workstationsData.data || []);
      }
      
      // Fetch line balances
      const lineBalancesRes = await fetch('/api/ie/line-balancing', { headers });
      if (lineBalancesRes.ok) {
        const lineBalancesData = await lineBalancesRes.json();
        setLineBalances(lineBalancesData.data || []);
      }
      
      // Fetch all marketing orders
      const ordersRes = await fetch('/api/marketing-orders', { headers });
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        console.log('Marketing orders raw data:', ordersData);
        const ordersArray = Array.isArray(ordersData) ? ordersData : (ordersData.data || []);
        console.log('Marketing orders array:', ordersArray);
        
        // Filter for orders that are in production-relevant stages
        // But also include a fallback to show more if this list is too small
        let filtered = ordersArray.filter((order: any) => {
          const status = (order.status || '').toLowerCase();
          return status.includes('sewing') || 
                 status.includes('cutting') || 
                 status.includes('planning') ||
                 status.includes('placed') ||
                 status.includes('sample') ||
                 status.includes('finishing') ||
                 status.includes('packing') ||
                 status.includes('inspection') ||
                 status.includes('progress');
        });

        // If filtering leaves nothing but we have orders, show the first 20 as a fallback
        if (filtered.length === 0 && ordersArray.length > 0) {
          console.warn('No orders matched filter, showing all as fallback');
          filtered = ordersArray;
        }

        setMarketingOrders(filtered);
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOrderSelect = (orderId: string) => {
    setSelectedOrderId(orderId);
    // Use loose equality in case one is a number and the other is a string
    const selectedOrder = marketingOrders.find(order => order.id == orderId);
    if (selectedOrder) {
      setProductCode(selectedOrder.productCode);
    }
  };

  const handleCreateLineBalance = async () => {
    try {
      if (!selectedOrderId || !productCode || !targetOutput) {
        toast({
          title: 'Error',
          description: 'Please fill all required fields',
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

      const response = await fetch('/api/ie/line-balancing', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          orderId: selectedOrderId,
          productCode,
          targetOutput: parseInt(targetOutput),
          workingHours: parseInt(workingHours),
          autoBalance
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: 'Success',
          description: autoBalance 
            ? `Line balance created with ${result.data.workstations?.length || 0} workstations. Efficiency: ${result.data.efficiency?.toFixed(1)}%`
            : 'Line balance created successfully'
        });
        setIsCreateDialogOpen(false);
        resetForm();
        fetchData();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create line balance',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error creating line balance:', error);
      toast({
        title: 'Error',
        description: 'Failed to create line balance',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setSelectedOrderId('');
    setProductCode('');
    setTargetOutput('');
    setWorkingHours('8');
  };

  const filteredWorkstations = sectionFilter === 'all' 
    ? workstations 
    : workstations.filter(ws => ws.section === sectionFilter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'occupied': return 'bg-yellow-100 text-yellow-800';
      case 'maintenance': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 90) return 'text-green-600';
    if (efficiency >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Line Balancing</h1>
          <p className="text-muted-foreground">
            Digital line balancing and workstation optimization
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Line Setup
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Line Balance</DialogTitle>
              <DialogDescription>
                Set up a new production line configuration for orders in the sewing stage
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="orderId">Marketing Order (Sewing Stage) *</Label>
                <Select value={selectedOrderId} onValueChange={handleOrderSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a marketing order in sewing stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {marketingOrders
                      .map((order) => (
                        <SelectItem key={order.id} value={order.id}>
                          <div className="flex justify-between w-full">
                            <span>{order.orderNumber}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground text-sm">
                                {order.productName} ({order.quantity} units)
                              </span>
                              <Badge 
                                variant={order.status === 'Sewing' ? 'default' : 'secondary'}
                                className={order.status === 'Sewing' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}
                              >
                                {order.status}
                              </Badge>
                            </div>
                          </div>
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="productCode">Product Code</Label>
                <Input
                  id="productCode"
                  value={productCode}
                  onChange={(e) => setProductCode(e.target.value)}
                  placeholder="Product code will auto-populate"
                  readOnly
                  className="bg-muted"
                />
              </div>
              <div>
                <Label htmlFor="targetOutput">Target Output (units/hour) *</Label>
                <Input
                  id="targetOutput"
                  type="number"
                  value={targetOutput}
                  onChange={(e) => setTargetOutput(e.target.value)}
                  placeholder="Enter target output"
                />
              </div>
              <div>
                <Label htmlFor="workingHours">Working Hours</Label>
                <Input
                  id="workingHours"
                  type="number"
                  value={workingHours}
                  onChange={(e) => setWorkingHours(e.target.value)}
                  placeholder="Enter working hours"
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border bg-primary/5">
                <div className="space-y-0.5">
                  <Label htmlFor="autoBalance" className="text-base font-semibold flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    Automatic Line Balancing
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically distribute operations across available workstations
                  </p>
                </div>
                <Switch
                  id="autoBalance"
                  checked={autoBalance}
                  onCheckedChange={setAutoBalance}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateLineBalance}>
                  Create Line Balance
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Workstations</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workstations.length}</div>
            <p className="text-xs text-muted-foreground">
              {workstations.filter(ws => ws.status === 'available').length} available
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Lines</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {lineBalances.filter(lb => lb.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {lineBalances.length} total configurations
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Efficiency</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {lineBalances.length > 0 
                ? `${(lineBalances.reduce((sum, lb) => sum + lb.lineEfficiency, 0) / lineBalances.length).toFixed(1)}%`
                : '0%'
              }
            </div>
            <p className="text-xs text-muted-foreground">Across all lines</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bottlenecks</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {lineBalances.filter(lb => lb.lineEfficiency < 80).length}
            </div>
            <p className="text-xs text-muted-foreground">Lines below 80% efficiency</p>
          </CardContent>
        </Card>
      </div>

      {/* Workstations Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Workstations
          </CardTitle>
          <CardDescription>
            Available production workstations by section
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Select value={sectionFilter} onValueChange={setSectionFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                <SelectItem value="Cutting">Cutting</SelectItem>
                <SelectItem value="Sewing">Sewing</SelectItem>
                <SelectItem value="Finishing">Finishing</SelectItem>
                <SelectItem value="Packing">Packing</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workstation</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Current Load</TableHead>
                <TableHead>SMV</TableHead>
                <TableHead>Efficiency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWorkstations.map((workstation) => (
                <TableRow key={workstation.id}>
                  <TableCell className="font-medium">
                    {workstation.workstationCode}
                    <div className="text-sm text-muted-foreground">
                      {workstation.workstationName}
                    </div>
                  </TableCell>
                  <TableCell>{workstation.section}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(workstation.status)}>
                      {workstation.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{workstation.capacity} units/hr</TableCell>
                  <TableCell>{workstation.currentLoad}</TableCell>
                  <TableCell>{workstation.smv.toFixed(2)}</TableCell>
                  <TableCell className={getEfficiencyColor(workstation.efficiency)}>
                    {workstation.efficiency.toFixed(1)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Line Balances Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Line Configurations
          </CardTitle>
          <CardDescription>
            Current production line setups and efficiency metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lineBalances.length === 0 ? (
            <div className="flex items-center justify-center h-32 border-2 border-dashed rounded-lg">
              <div className="text-center">
                <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">No Line Configurations</h3>
                <p className="text-muted-foreground">
                  Create your first production line configuration
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Line Name</TableHead>
                  <TableHead>Order/Product</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Target Output</TableHead>
                  <TableHead>Workstations</TableHead>
                  <TableHead>Cycle Time</TableHead>
                  <TableHead>Efficiency</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineBalances.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-medium">{line.lineName}</TableCell>
                    <TableCell>
                      <div>{line.orderId}</div>
                      <div className="text-sm text-muted-foreground">{line.productCode}</div>
                    </TableCell>
                    <TableCell>{line.section}</TableCell>
                    <TableCell>{line.targetOutput} units/hr</TableCell>
                    <TableCell>{line.numberOfWorkstations}</TableCell>
                    <TableCell>
                      <div>{line.calculatedCycleTime.toFixed(2)} min</div>
                      <div className="text-sm text-muted-foreground">actual: {line.actualCycleTime.toFixed(2)} min</div>
                    </TableCell>
                    <TableCell className={getEfficiencyColor(line.lineEfficiency)}>
                      {line.lineEfficiency.toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      <Badge variant={line.status === 'active' ? 'default' : 'secondary'}>
                        {line.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}