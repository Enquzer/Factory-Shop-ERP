'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Plus, 
  Search, 
  RefreshCw, 
  ArrowRight, 
  Edit3,
  Eye,
  Download,
  Upload,
  Trash2,
  Save,
  X
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface OrderWithOB {
  id: string;
  orderNumber: string;
  productCode: string;
  productName: string;
  source: 'IE' | 'Planning' | 'Error';
  lastModified: string;
}

interface OBItem {
  sequence: number;
  operationName: string;
  machineType: string;
  smv: number;
  manpower: number;
  componentName?: string;
}

interface Machine {
  id: number;
  machineCode: string;
  machineName: string;
  machineType: string;
  category: string;
}

export default function OBBuilderPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<OrderWithOB[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [machines, setMachines] = useState<Machine[]>([]);
  const [machinesLoading, setMachinesLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithOB | null>(null);
  const [obItems, setObItems] = useState<OBItem[]>([]);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchMachines();
  }, []);

  const fetchMachines = async () => {
    try {
      setMachinesLoading(true);
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
      setMachinesLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      // Get auth token
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch('/api/ie/ob/orders', { headers });
      
      if (!res.ok) {
        if (res.status === 401) {
          toast({
            title: "Unauthorized",
            description: "You are not authorized to perform this action. Please log in again.",
            variant: "destructive"
          });
          return;
        }
        const errorData = await res.json().catch(() => ({ error: 'Server error: ' + res.statusText }));
        toast({
          title: "Error",
          description: errorData.error || 'Failed to fetch orders with OB',
          variant: "destructive"
        });
        return;
      }
      
      const data = await res.json();
      setOrders(data);
    } catch (error: any) {
      if (error.message && error.message.includes('Unauthorized')) {
        toast({
          title: "Unauthorized",
          description: "You are not authorized to perform this action. Please log in again.",
          variant: "destructive"
        });
        return;
      }
      console.error('Error fetching orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch orders with OB",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const viewOB = async (order: OrderWithOB) => {
    try {
      // Get auth token
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch(`/api/ie/ob/${order.id}`, { headers });
      
      if (!res.ok) {
        if (res.status === 401) {
          toast({
            title: "Unauthorized",
            description: "You are not authorized to perform this action. Please log in again.",
            variant: "destructive"
          });
          return;
        }
        const errorData = await res.json().catch(() => ({ error: 'Server error: ' + res.statusText }));
        toast({
          title: "Error",
          description: errorData.error || 'Failed to load operation bulletin',
          variant: "destructive"
        });
        return;
      }
      
      const data = await res.json();
      setSelectedOrder(order);
      setObItems(data.items || []);
      setIsViewDialogOpen(true);
    } catch (error: any) {
      if (error.message && error.message.includes('Unauthorized')) {
        toast({
          title: "Unauthorized",
          description: "You are not authorized to perform this action. Please log in again.",
          variant: "destructive"
        });
        return;
      }
      console.error('Error viewing OB:', error);
      toast({
        title: "Error",
        description: "Failed to load operation bulletin",
        variant: "destructive"
      });
    }
  };

  const convertToIEOB = async (order: OrderWithOB) => {
    try {
      // Get auth token
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch(`/api/ie/ob/${order.id}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ productCode: order.productCode })
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          toast({
            title: "Unauthorized",
            description: "You are not authorized to perform this action. Please log in again.",
            variant: "destructive"
          });
          return;
        }
        const errorData = await res.json().catch(() => ({ error: 'Server error: ' + res.statusText }));
        toast({
          title: "Error",
          description: errorData.error || 'An error occurred',
          variant: "destructive"
        });
        return;
      }
      
      const data = await res.json().catch(() => ({ error: 'Invalid response from server' }));
      
      toast({
        title: "Success",
        description: data.message
      });
      fetchOrders(); // Refresh the list
    } catch (error: any) {
      if (error.message && error.message.includes('Unauthorized')) {
        toast({
          title: "Unauthorized",
          description: "You are not authorized to perform this action. Please log in again.",
          variant: "destructive"
        });
        return;
      }
      console.error('Error converting OB:', error);
      toast({
        title: "Error",
        description: "Failed to convert operation bulletin",
        variant: "destructive"
      });
    }
  };

  const syncToPlanning = async (order: OrderWithOB) => {
    try {
      // Get auth token
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch(`/api/ie/ob/${order.id}`, {
        method: 'PUT',
        headers
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          toast({
            title: "Unauthorized",
            description: "You are not authorized to perform this action. Please log in again.",
            variant: "destructive"
          });
          return;
        }
        const errorData = await res.json().catch(() => ({ error: 'Server error: ' + res.statusText }));
        toast({
          title: "Error",
          description: errorData.error || 'An error occurred',
          variant: "destructive"
        });
        return;
      }
      
      const data = await res.json().catch(() => ({ error: 'Invalid response from server' }));
      
      toast({
        title: "Success",
        description: data.message
      });
      fetchOrders(); // Refresh the list
    } catch (error: any) {
      if (error.message && error.message.includes('Unauthorized')) {
        toast({
          title: "Unauthorized",
          description: "You are not authorized to perform this action. Please log in again.",
          variant: "destructive"
        });
        return;
      }
      console.error('Error syncing OB:', error);
      toast({
        title: "Error",
        description: "Failed to sync operation bulletin",
        variant: "destructive"
      });
    }
  };

  const saveIEOB = async () => {
    if (!selectedOrder) return;
    try {
      setSaving(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch(`/api/ie/ob/${selectedOrder.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ items: obItems })
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          toast({
            title: "Unauthorized",
            description: "You are not authorized to perform this action. Please log in again.",
            variant: "destructive"
          });
          return;
        }
        const errorData = await res.json().catch(() => ({ error: 'Server error: ' + res.statusText }));
        toast({
          title: "Error",
          description: errorData.error || 'An error occurred',
          variant: "destructive"
        });
        return;
      }
      
      const data = await res.json().catch(() => ({ error: 'Invalid response from server' }));
      
      toast({
        title: "Success",
        description: data.message || "IE OB updated successfully"
      });
      setIsEditing(false);
      fetchOrders(); // Refresh the list
    } catch (error: any) {
      if (error.message && error.message.includes('Unauthorized')) {
        toast({
          title: "Unauthorized",
          description: "You are not authorized to perform this action. Please log in again.",
          variant: "destructive"
        });
        return;
      }
      console.error('Error saving IE OB:', error);
      toast({
        title: "Error",
        description: "Failed to save operation bulletin",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const addRow = () => {
    const nextSeq = obItems.length > 0 ? Math.max(...obItems.map(i => i.sequence)) + 1 : 1;
    setObItems([...obItems, { sequence: nextSeq, operationName: '', machineType: '', smv: 0, manpower: 1 }]);
  };

  const removeRow = (index: number) => {
    setObItems(obItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof OBItem, value: any) => {
    const newItems = [...obItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setObItems(newItems);
  };

  const filteredOrders = orders.filter(order =>
    order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.productCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.productName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'IE':
        return <Badge className="bg-blue-100 text-blue-800">IE Created</Badge>;
      case 'Planning':
        return <Badge className="bg-green-100 text-green-800">Planning Created</Badge>;
      default:
        return <Badge variant="destructive">Error</Badge>;
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
          <h1 className="text-3xl font-bold tracking-tight">OB Builder</h1>
          <p className="text-muted-foreground">
            Operation Bulletin creation and management
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchMachines} disabled={machinesLoading}>
            {machinesLoading ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh Machines
          </Button>
          <Button variant="outline" onClick={fetchOrders}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Orders
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create New OB
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order number, product code, or product name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Orders with Operation Bulletins ({filteredOrders.length})
          </CardTitle>
          <CardDescription>
            Manage and view operation bulletins for existing orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order Number</TableHead>
                  <TableHead>Product Code</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Last Modified</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.orderNumber}</TableCell>
                    <TableCell>{order.productCode}</TableCell>
                    <TableCell>{order.productName}</TableCell>
                    <TableCell>{getSourceBadge(order.source)}</TableCell>
                    <TableCell>
                      {new Date(order.lastModified).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewOB(order)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        {order.source === 'Planning' && user?.role === 'ie_admin' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => convertToIEOB(order)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {order.source === 'IE' && user?.role === 'ie_admin' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => syncToPlanning(order)}
                          >
                            <Upload className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {filteredOrders.length === 0 && (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              No orders with operation bulletins found
            </div>
          )}
        </CardContent>
      </Card>

      {/* View OB Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={(open) => {
        setIsViewDialogOpen(open);
        if (!open) setIsEditing(false);
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Operation Bulletin - {selectedOrder?.orderNumber}</span>
              {selectedOrder && getSourceBadge(selectedOrder.source)}
            </DialogTitle>
            <DialogDescription>
              Product: {selectedOrder?.productCode} - {selectedOrder?.productName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0">
                <TableRow>
                  <TableHead className="w-[80px]">Seq</TableHead>
                  <TableHead>Component</TableHead>
                  <TableHead>Operation Name</TableHead>
                  <TableHead>Machine Type</TableHead>
                  <TableHead className="text-right">SMV</TableHead>
                  <TableHead className="text-right">MP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {obItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {isEditing ? (
                        <Input 
                          type="number" 
                          value={item.sequence || 0} 
                          onChange={(e) => updateItem(index, 'sequence', parseInt(e.target.value) || 0)}
                          className="w-16 h-8 text-xs"
                        />
                      ) : item.sequence || 0}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input 
                          value={item.componentName || ''} 
                          onChange={(e) => updateItem(index, 'componentName', e.target.value)}
                          className="h-8 text-xs"
                          placeholder="e.g. Front"
                        />
                      ) : (item.componentName || '-')}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input 
                          value={item.operationName || ''} 
                          onChange={(e) => updateItem(index, 'operationName', e.target.value)}
                          className="h-8 text-xs"
                        />
                      ) : item.operationName || ''}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Select 
                          value={item.machineType || "none"} 
                          onValueChange={(value) => updateItem(index, 'machineType', value === "none" ? "" : value)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select machine type" />
                          </SelectTrigger>
                          <SelectContent>
                            {machinesLoading ? (
                              <SelectItem value="loading" disabled>
                                Loading machines...
                              </SelectItem>
                            ) : (
                              <>
                                <SelectItem value="none">None/General</SelectItem>
                                {Array.from(new Set(machines.map(m => m.machineType)))
                                  .filter(type => type)
                                  .sort()
                                  .map(type => (
                                    <SelectItem key={type} value={type}>
                                      {type}
                                    </SelectItem>
                                  ))
                                }
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      ) : item.machineType || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditing ? (
                        <Input 
                          type="number" 
                          step="0.001"
                          value={item.smv || 0} 
                          onChange={(e) => updateItem(index, 'smv', parseFloat(e.target.value) || 0)}
                          className="w-20 h-8 text-xs text-right"
                        />
                      ) : (item.smv?.toFixed(3) || '0.000')}
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditing ? (
                        <Input 
                          type="number" 
                          value={item.manpower || 1} 
                          onChange={(e) => updateItem(index, 'manpower', parseInt(e.target.value) || 1)}
                          className="w-16 h-8 text-xs text-right"
                        />
                      ) : (item.manpower || 1)}
                    </TableCell>
                    {isEditing && (
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => removeRow(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="flex justify-between items-center pt-4 border-t">
            <div>
              {isEditing && (
                <Button variant="outline" size="sm" onClick={addRow}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Operation
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => {
                setIsViewDialogOpen(false);
                setIsEditing(false);
              }}>
                Cancel
              </Button>
              
              {selectedOrder?.source === 'IE' && user?.role === 'ie_admin' && (
                isEditing ? (
                  <Button onClick={saveIEOB} disabled={saving}>
                    {saving ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                ) : (
                  <Button onClick={() => setIsEditing(true)}>
                    <Edit3 className="mr-2 h-4 w-4" />
                    Edit OB
                  </Button>
                )
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}