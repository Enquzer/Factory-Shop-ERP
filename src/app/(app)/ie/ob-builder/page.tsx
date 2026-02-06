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
  Upload
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

export default function OBBuilderPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<OrderWithOB[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithOB | null>(null);
  const [obItems, setObItems] = useState<OBItem[]>([]);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

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
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (error) {
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
      if (res.ok) {
        const data = await res.json();
        setSelectedOrder(order);
        setObItems(data.items || []);
        setIsViewDialogOpen(true);
      }
    } catch (error) {
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
      
      const res = await fetch(`/api/ie/ob/${order.id}/convert`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ productCode: order.productCode })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast({
          title: "Success",
          description: data.message
        });
        fetchOrders(); // Refresh the list
      } else {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive"
        });
      }
    } catch (error) {
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
      
      const res = await fetch(`/api/ie/ob/${order.id}/sync`, {
        method: 'PUT',
        headers
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast({
          title: "Success",
          description: data.message
        });
        fetchOrders(); // Refresh the list
      } else {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error syncing OB:', error);
      toast({
        title: "Error",
        description: "Failed to sync operation bulletin",
        variant: "destructive"
      });
    }
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
          <Button variant="outline" onClick={fetchOrders}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
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
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
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
                    <TableCell className="font-medium">{item.sequence}</TableCell>
                    <TableCell>{item.componentName || '-'}</TableCell>
                    <TableCell>{item.operationName}</TableCell>
                    <TableCell>{item.machineType}</TableCell>
                    <TableCell className="text-right">{item.smv?.toFixed(3) || '0.000'}</TableCell>
                    <TableCell className="text-right">{item.manpower || 1}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            {selectedOrder?.source === 'IE' && user?.role === 'ie_admin' && (
              <Button onClick={() => {
                setIsViewDialogOpen(false);
                // TODO: Implement edit functionality
                toast({
                  title: "Edit Feature",
                  description: "Edit functionality will be implemented in next phase"
                });
              }}>
                <Edit3 className="mr-2 h-4 w-4" />
                Edit OB
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}