"use client";

import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { 
  Search, 
  Filter, 
  Eye, 
  Truck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Package,
  MoreVertical,
  ClipboardList
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import Link from "next/link";

export default function OrderManagementPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const { token } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (token) {
      fetchOrders();
    }
  }, [token]);

  useEffect(() => {
    filterOrders();
  }, [searchTerm, statusFilter, orders]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/ecommerce-manager/orders', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const { orders: data } = await res.json();
        setOrders(data);
        setFilteredOrders(data);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterOrders = () => {
    let result = orders;
    
    if (statusFilter !== "all") {
      result = result.filter(order => order.status === statusFilter);
    }
    
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(order => 
        order.id.toLowerCase().includes(lowerSearch) || 
        order.customerName.toLowerCase().includes(lowerSearch) ||
        order.customerPhone.toLowerCase().includes(lowerSearch)
      );
    }
    
    setFilteredOrders(result);
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/ecommerce-manager/orders', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ orderId, status: newStatus })
      });

      if (res.ok) {
        toast({
          title: "Status Updated",
          description: `Order ${orderId} is now ${newStatus}`,
          className: "bg-green-600 text-white"
        });
        fetchOrders();
        if (selectedOrder?.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: newStatus });
        }
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500 hover:bg-yellow-600';
      case 'confirmed': return 'bg-blue-500 hover:bg-blue-600';
      case 'processing': return 'bg-purple-500 hover:bg-purple-600';
      case 'shipped': return 'bg-indigo-500 hover:bg-indigo-600';
      case 'delivered': return 'bg-green-500 hover:bg-green-600';
      case 'cancelled': return 'bg-red-500 hover:bg-red-600';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Order Management</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all eCommerce customer orders
          </p>
        </div>
        <Button onClick={fetchOrders} variant="outline">
          <Clock className="mr-2 h-4 w-4" />
          Refresh Orders
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders, customers, or phones..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading orders...
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-accent/50">
                    <TableCell className="font-mono font-medium">{order.id}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{order.customerName}</span>
                        <span className="text-xs text-muted-foreground">{order.customerPhone}</span>
                      </div>
                    </TableCell>
                    <TableCell>{order.orderItems?.length || 0} items</TableCell>
                    <TableCell className="font-bold whitespace-nowrap">
                      ETB {(order.totalAmount || 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={order.paymentStatus === 'paid' ? 'default' : 'outline'} 
                             className={order.paymentStatus === 'paid' ? 'bg-green-600' : ''}>
                        {order.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(order)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2 text-2xl">
                                <ClipboardList className="h-6 w-6 text-primary" />
                                Order Details: {selectedOrder?.id}
                              </DialogTitle>
                              <DialogDescription>
                                Detailed view of the customer's professional collection request
                              </DialogDescription>
                            </DialogHeader>
                            
                            {selectedOrder && (
                              <div className="space-y-6 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Customer Info</h4>
                                    <p className="font-bold text-lg">{selectedOrder.customerName}</p>
                                    <p className="text-sm">{selectedOrder.customerEmail}</p>
                                    <p className="text-sm">{selectedOrder.customerPhone}</p>
                                  </div>
                                  <div className="space-y-1 text-right">
                                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Delivery Address</h4>
                                    <p className="font-medium">{selectedOrder.city}, {selectedOrder.subCity}</p>
                                    <p className="text-sm">{selectedOrder.deliveryAddress}</p>
                                  </div>
                                </div>

                                <div className="border rounded-lg overflow-hidden">
                                  <div className="bg-accent px-4 py-2 font-semibold">Ordered Items</div>
                                  <div className="divide-y">
                                    {selectedOrder.orderItems?.map((item: any, idx: number) => (
                                      <div key={idx} className="flex gap-4 p-4 items-center">
                                        <div className="h-16 w-16 bg-muted rounded relative overflow-hidden flex-shrink-0">
                                          {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="object-cover w-full h-full" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="font-bold truncate">{item.name}</p>
                                          <p className="text-sm text-muted-foreground">
                                            Size: {item.size} | Color: {item.color}
                                          </p>
                                        </div>
                                        <div className="text-right">
                                          <p className="font-bold">ETB {item.price?.toLocaleString()}</p>
                                          <p className="text-sm">Qty: {item.quantity}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="bg-accent/30 p-4 space-y-2">
                                    <div className="flex justify-between text-sm">
                                      <span>Items Total</span>
                                      <span>ETB {(selectedOrder.totalAmount - (selectedOrder.transportationCost || 0)).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                      <span>Transportation Cost</span>
                                      <span>ETB {(selectedOrder.transportationCost || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                                      <span>Total Amount</span>
                                      <span className="text-primary">ETB {selectedOrder.totalAmount?.toLocaleString()}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-3 pt-4 border-t">
                                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Update Order Status</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => (
                                      <Button 
                                        key={s} 
                                        variant={selectedOrder.status === s ? "default" : "outline"}
                                        size="sm"
                                        className={selectedOrder.status === s ? getStatusColor(s) : ""}
                                        onClick={() => handleUpdateStatus(selectedOrder.id, s)}
                                      >
                                        {s}
                                      </Button>
                                    ))}
                                  </div>
                                </div>

                                {selectedOrder.status === 'shipped' && (
                                  <div className="pt-4 border-t">
                                     <Link href={`/track-order/${selectedOrder.id}`} target="_blank">
                                        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-6">
                                            <Truck className="h-5 w-5 mr-3" />
                                            TRACK SHIPMENT LOCATION
                                        </Button>
                                     </Link>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
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
