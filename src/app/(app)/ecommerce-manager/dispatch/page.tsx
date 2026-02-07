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
import { Label } from "@/components/ui/label";
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
  Truck, 
  Package, 
  MapPin, 
  Search, 
  RefreshCcw,
  Plane,
  DollarSign,
  AlertTriangle,
  Send,
  User,
  Clock,
  Hash
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

export default function DispatchCenterPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [shops, setShops] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [dispatchData, setDispatchData] = useState({
    shopId: "",
    driverId: "",
    transportationCost: 0,
    trackingNumber: "",
    estimatedDeliveryTime: "",
    notes: ""
  });
  const { token } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const authHeaders: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      // Fetch both orders and shops
      const [ordersRes, shopsRes] = await Promise.all([
        fetch('/api/ecommerce-manager/orders', { headers: authHeaders }),
        fetch('/api/shops?limit=0', { headers: authHeaders })
      ]);

      if (ordersRes.ok && shopsRes.ok) {
        const { orders: allOrders } = await ordersRes.json();
        const shopsData = await shopsRes.json();
        const allShops = Array.isArray(shopsData) ? shopsData : (shopsData.shops || []);
        
        // Fetch drivers too
        const driversRes = await fetch('/api/drivers', { headers: authHeaders });
        if (driversRes.ok) {
          const { drivers: allDrivers } = await driversRes.json();
          console.log('[DISPATCH PAGE] Received drivers:', allDrivers);
          console.log('[DISPATCH PAGE] Total drivers:', allDrivers?.length || 0);
                
          if (allDrivers) {
            const availableDrivers = allDrivers.filter((d: any) => d.status === 'available');
            console.log('[DISPATCH PAGE] Available drivers:', availableDrivers.length);
            console.log('[DISPATCH PAGE] Available driver details:', availableDrivers.map((d: any) => ({
              id: d.id,
              name: `${d.first_name} ${d.last_name}`,
              status: d.status,
              vehicle: d.vehicle_type
            })));
          }
                
          setDrivers(allDrivers || []);
        }

        // Filter orders that are ready for dispatch (confirmed or processing)
        const dispatchable = allOrders.filter((o: any) => 
          ['confirmed', 'processing'].includes(o.status)
        );
        
        setOrders(dispatchable);
        setShops(allShops);
      }
    } catch (error) {
      console.error('Error fetching dispatch data:', error);
      toast({
        title: "Error",
        description: "Failed to load dispatch center data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateTrackingNumber = () => {
    const random = Math.floor(100000 + Math.random() * 900000); // 6 digits
    return `TRX-${random}`;
  };

  const calculateTransportCost = (order: any) => {
    if (order.transportationCost && order.transportationCost > 0) return order.transportationCost;
    if (order.transportation_cost && order.transportation_cost > 0) return order.transportation_cost;
    
    // Basic calculation if not preset
    const baseCost = 100;
    const itemCost = (order.orderItems?.length || 0) * 50;
    return baseCost + itemCost;
  };

  const handleOrderSelect = (order: any) => {
    setSelectedOrder(order);
    const trackingNumber = generateTrackingNumber();
    const transportCost = calculateTransportCost(order);
    
    setDispatchData({
      shopId: order.shopId || "",
      driverId: "",
      transportationCost: transportCost,
      trackingNumber: trackingNumber,
      estimatedDeliveryTime: "",
      notes: ""
    });
  };

  const handleDispatch = async () => {
    if (!selectedOrder || !dispatchData.shopId || !dispatchData.driverId) {
      toast({
        title: "Missing Information",
        description: "Please select both a shop and a driver.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsUpdating(true);
      // Use the consolidated assignment API
      const res = await fetch('/api/ecommerce/dispatch/assign', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          driverId: dispatchData.driverId,
          shopId: dispatchData.shopId,
          trackingNumber: dispatchData.trackingNumber,
          transportCost: dispatchData.transportationCost,
          estimatedDeliveryTime: dispatchData.estimatedDeliveryTime,
          notes: dispatchData.notes
        })
      });

      if (res.ok) {
        toast({
          title: "Dispatch Successful",
          description: `Order ${selectedOrder.id} has been dispatched.`,
          className: "bg-green-600 text-white"
        });
        fetchData();
        setSelectedOrder(null);
        setDispatchData({ shopId: "", driverId: "", transportationCost: 0, trackingNumber: "", estimatedDeliveryTime: "", notes: "" });
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to dispatch order');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process dispatch",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Truck className="h-8 w-8 text-indigo-500" />
            Dispatch Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Assign shops, set shipping costs, and dispatch eCommerce collections
          </p>
        </div>
        <Button onClick={fetchData} variant="outline">
          <RefreshCcw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="md:col-span-1 bg-indigo-50 border-indigo-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-indigo-700">Ready for Dispatch</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-900">{orders.length}</div>
            <p className="text-xs text-indigo-600 mt-1">Confirmed or Processing orders</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dispatch Queue</CardTitle>
          <CardDescription>Orders awaiting fulfilment and shipment</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer / Location</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">Loading queue...</TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    <Package className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    No orders awaiting dispatch
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono font-medium">{order.id}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{order.customerName}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {order.city}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{order.orderItems?.length || 0} items</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-indigo-200 text-indigo-700">
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            className="bg-indigo-600 hover:bg-indigo-700 h-8" 
                            onClick={() => handleOrderSelect(order)}
                          >
                            <Send className="mr-2 h-3.5 w-3.5" />
                            Dispatch Now
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Truck className="h-5 w-5 text-indigo-600" />
                              Prepare Order for Dispatch
                            </DialogTitle>
                            <DialogDescription>
                              Assign a shop and enter shipping details for {selectedOrder?.id}
                            </DialogDescription>
                          </DialogHeader>
                          
                          {selectedOrder && (
                            <div className="space-y-4 py-4">
                              <div className="bg-muted/50 p-3 rounded-md space-y-1">
                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">Shipping Destination</p>
                                <p className="font-bold">{selectedOrder.customerName}</p>
                                <p className="text-sm">{selectedOrder.deliveryAddress}, {selectedOrder.city}</p>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="shop">Select Dispatch Shop</Label>
                                <Select 
                                  value={dispatchData.shopId} 
                                  onValueChange={(v) => setDispatchData({...dispatchData, shopId: v})}
                                >
                                  <SelectTrigger id="shop">
                                    <SelectValue placeholder="Which shop will send this?" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {shops.map((shop) => (
                                      <SelectItem key={shop.id} value={shop.id}>
                                        {shop.name} ({shop.city})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <p className="text-[10px] text-amber-600 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" /> Inventory will be reduced from this shop
                                </p>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="cost" className="flex justify-between">
                                    Transport Cost (ETB)
                                    <button 
                                      onClick={() => setDispatchData({...dispatchData, transportationCost: calculateTransportCost(selectedOrder)})}
                                      className="text-[10px] text-indigo-600 hover:underline flex items-center gap-0.5"
                                    >
                                      <RefreshCcw className="h-2.5 w-2.5" /> Re-calculate
                                    </button>
                                  </Label>
                                  <div className="relative">
                                    <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                      id="cost"
                                      type="number"
                                      className="pl-8"
                                      placeholder="0.00"
                                      value={dispatchData.transportationCost}
                                      onChange={(e) => setDispatchData({...dispatchData, transportationCost: parseFloat(e.target.value) || 0})}
                                    />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="tracking" className="flex justify-between">
                                    Tracking Number
                                    <button 
                                      onClick={() => setDispatchData({...dispatchData, trackingNumber: generateTrackingNumber()})}
                                      className="text-[10px] text-indigo-600 hover:underline flex items-center gap-0.5"
                                    >
                                      <RefreshCcw className="h-2.5 w-2.5" /> New
                                    </button>
                                  </Label>
                                  <div className="relative">
                                    <Hash className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                      id="tracking"
                                      className="pl-8"
                                      value={dispatchData.trackingNumber}
                                      onChange={(e) => setDispatchData({...dispatchData, trackingNumber: e.target.value})}
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="driver">Select Driver *</Label>
                                <Select 
                                  value={dispatchData.driverId} 
                                  onValueChange={(v) => setDispatchData({...dispatchData, driverId: v})}
                                >
                                  <SelectTrigger id="driver">
                                    <SelectValue placeholder="Assign a driver" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {drivers.filter(d => d.status === 'available').map((driver) => (
                                      <SelectItem key={driver.id} value={driver.id.toString()}>
                                        <div className="flex flex-col">
                                          <div className="font-medium">{driver.first_name} {driver.last_name}</div>
                                          <div className="text-xs text-muted-foreground">{driver.vehicle_type}</div>
                                        </div>
                                      </SelectItem>
                                    ))}
                                    {drivers.filter(d => d.status === 'available').length === 0 && (
                                      <SelectItem value="none" disabled>No available drivers</SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="deliveryTime">Estimated Delivery</Label>
                                  <div className="relative">
                                    <Clock className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                      id="deliveryTime"
                                      type="datetime-local"
                                      className="pl-8"
                                      value={dispatchData.estimatedDeliveryTime}
                                      onChange={(e) => setDispatchData({...dispatchData, estimatedDeliveryTime: e.target.value})}
                                    />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="notes">Delivery Notes</Label>
                                  <Input 
                                    id="notes"
                                    placeholder="Instructions..."
                                    value={dispatchData.notes}
                                    onChange={(e) => setDispatchData({...dispatchData, notes: e.target.value})}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setSelectedOrder(null)}>Cancel</Button>
                            <Button 
                              onClick={handleDispatch} 
                              disabled={!dispatchData.shopId || !dispatchData.driverId || isUpdating}
                              className="bg-indigo-600 hover:bg-indigo-700"
                            >
                              {isUpdating ? "Processing..." : "Confirm Shipment"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
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
