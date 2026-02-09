"use client";

import { useState, useEffect, useMemo } from "react";
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
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  Truck, 
  Package, 
  MapPin, 
  Search, 
  RefreshCcw,
  DollarSign,
  AlertTriangle,
  Send,
  User,
  Clock,
  Hash,
  Eye,
  CheckCircle2,
  MoreVertical,
  Navigation,
  ExternalLink,
  Phone,
  Calendar,
  Layers,
  ShoppingBag
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { calculateDistance } from "@/lib/utils";

// Types
type Order = {
  id: string;
  order_id?: string;
  customerName: string;
  customerPhone?: string;
  deliveryAddress: string;
  city: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  orderItems?: any[];
  latitude?: number;
  longitude?: number;
  transportationCost?: number;
  trackingNumber?: string;
  driverId?: string;
  shopId?: string;
};

type Driver = {
  id: string | number;
  first_name: string;
  last_name: string;
  vehicle_type: string;
  status: string;
  phone?: string;
  active_order_count?: number;
  max_capacity?: number;
};

type Shop = {
  id: string;
  name: string;
  city: string;
  address?: string;
};

export default function DispatchMasterCenter() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("ready");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Dispatch Form State
  const [dispatchForm, setDispatchForm] = useState({
    shopId: "",
    driverId: "",
    transportationCost: 0,
    trackingNumber: "",
    estimatedDeliveryTime: "",
    notes: ""
  });

  const { token } = useAuth();
  const { toast } = useToast();

  const FACTORY_LAT = 9.033;
  const FACTORY_LNG = 38.750;

  useEffect(() => {
    if (token) {
      fetchAllData();
    }
  }, [token]);

  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      const authHeaders: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      const [ordersRes, shopsRes, driversRes] = await Promise.all([
        fetch('/api/ecommerce-manager/orders', { headers: authHeaders }),
        fetch('/api/shops?limit=0', { headers: authHeaders }),
        fetch('/api/drivers', { headers: authHeaders })
      ]);

      if (ordersRes.ok && shopsRes.ok && driversRes.ok) {
        const { orders: allOrders } = await ordersRes.json();
        const shopsData = await shopsRes.json();
        const { drivers: allDrivers } = await driversRes.json();

        setOrders(allOrders || []);
        setShops(Array.isArray(shopsData) ? shopsData : (shopsData.shops || []));
        setDrivers((allDrivers || []).map((d: any) => ({
          ...d,
          active_order_count: d.active_order_count || 0,
          max_capacity: d.max_capacity || 1
        })));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Load Error",
        description: "Failed to connect to the dispatch system.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateTrackingNumber = () => {
    const random = Math.floor(100000 + Math.random() * 900000);
    return `TRX-${random}`;
  };

  const calculateCost = (order: Order) => {
    if (order.transportationCost && order.transportationCost > 0) return order.transportationCost;
    
    const base = 100;
    let distanceCost = 0;
    
    if (order.latitude && order.longitude) {
      const distance = calculateDistance(FACTORY_LAT, FACTORY_LNG, order.latitude, order.longitude);
      distanceCost = Math.round(distance * 15); // 15 ETB per km
    } else {
      distanceCost = (order.orderItems?.length || 0) * 50;
    }
    return base + distanceCost;
  };

  const handlePrepareDispatch = (order: Order) => {
    setSelectedOrder(order);
    
    // Check if it's a reassignment or fresh dispatch
    const isInTransit = ['shipped', 'in_transit'].includes(order.status.toLowerCase());
    
    setDispatchForm({
      shopId: order.shopId || (shops.length > 0 ? shops[0].id : ""),
      driverId: order.driverId || "",
      transportationCost: calculateCost(order),
      trackingNumber: order.trackingNumber || generateTrackingNumber(),
      estimatedDeliveryTime: "",
      notes: ""
    });
    setIsSheetOpen(true);
  };

  const executeDispatch = async () => {
    if (!selectedOrder || !dispatchForm.shopId || !dispatchForm.driverId) {
      toast({
        title: "Incomplete Form",
        description: "Please assign both a shop and a driver.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsUpdating(true);
      const res = await fetch('/api/ecommerce/dispatch/assign', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          driverId: dispatchForm.driverId,
          shopId: dispatchForm.shopId,
          trackingNumber: dispatchForm.trackingNumber,
          transportCost: dispatchForm.transportationCost,
          estimatedDeliveryTime: dispatchForm.estimatedDeliveryTime,
          notes: dispatchForm.notes
        })
      });

      if (res.ok) {
        toast({
          title: "Order Dispatched!",
          description: `Order ${selectedOrder.id} is now on its way.`,
          className: "bg-emerald-600 text-white shadow-xl"
        });
        fetchAllData();
        setIsSheetOpen(false);
      } else {
        const err = await res.json();
        throw new Error(err.error || "Dispatch failed");
      }
    } catch (error: any) {
      toast({
        title: "Dispatch Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Filtering Logic
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesSearch = o.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           o.customerName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const status = o.status.toLowerCase();
      if (activeTab === "ready") {
        return matchesSearch && ['confirmed', 'processing', 'ready_for_dispatch', 'ready'].includes(status);
      } else if (activeTab === "transit") {
        return matchesSearch && ['shipped', 'in_transit'].includes(status);
      } else if (activeTab === "delivered") {
        return matchesSearch && status === 'delivered';
      }
      return matchesSearch;
    });
  }, [orders, searchTerm, activeTab]);

  const stats = useMemo(() => ({
    ready: orders.filter(o => ['confirmed', 'processing', 'ready_for_dispatch', 'ready'].includes(o.status.toLowerCase())).length,
    transit: orders.filter(o => ['shipped', 'in_transit'].includes(o.status.toLowerCase())).length,
    delivered: orders.filter(o => o.status.toLowerCase() === 'delivered').length,
    drivers: drivers.filter(d => d.status !== 'offline').length
  }), [orders, drivers]);

  return (
    <div className="min-h-screen p-6 space-y-8 bg-slate-50/50">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
              <Truck className="h-8 w-8 text-white" />
            </div>
            Dispatch Master Center
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Next-gen order fulfillment and logistics distribution
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search ID or Customer..." 
              className="pl-10 h-11 border-slate-200 bg-white shadow-sm rounded-xl focus:ring-indigo-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button 
            onClick={fetchAllData} 
            variant="outline" 
            className="h-11 rounded-xl border-slate-200 hover:bg-slate-50"
            disabled={isLoading}
          >
            <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Modern Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Ready to Ship", value: stats.ready, icon: Package, color: "bg-amber-600", light: "bg-amber-50", text: "text-amber-700" },
          { label: "In Transit", value: stats.transit, icon: Navigation, color: "bg-blue-600", light: "bg-blue-50", text: "text-blue-700" },
          { label: "Total Delivered", value: stats.delivered, icon: CheckCircle2, color: "bg-emerald-600", light: "bg-emerald-50", text: "text-emerald-700" },
          { label: "Active Drivers", value: stats.drivers, icon: User, color: "bg-indigo-600", light: "bg-indigo-50", text: "text-indigo-700" }
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-sm hover:shadow-md transition-shadow rounded-3xl overflow-hidden group">
            <CardContent className="p-0">
              <div className="flex items-stretch h-32">
                <div className={`${stat.color} w-3 group-hover:w-5 transition-all outline-none`} />
                <div className="p-6 flex flex-col justify-center">
                  <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-1">{stat.label}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-slate-900">{stat.value}</span>
                    <stat.icon className={`h-5 w-5 ${stat.text} opacity-50`} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Area */}
      <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-white overflow-hidden">
        <CardHeader className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <Tabs defaultValue="ready" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="bg-slate-100 p-1 rounded-2xl h-14">
              <TabsTrigger value="ready" className="rounded-xl px-8 font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm h-12">
                Pending Dispatch
                <Badge className="ml-2 bg-indigo-100 text-indigo-700 border-none">{stats.ready}</Badge>
              </TabsTrigger>
              <TabsTrigger value="transit" className="rounded-xl px-8 font-bold data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm h-12">
                Out for Delivery
                <Badge className="ml-2 bg-blue-100 text-blue-700 border-none">{stats.transit}</Badge>
              </TabsTrigger>
              <TabsTrigger value="delivered" className="rounded-xl px-8 font-bold data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm h-12">
                Completed
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-none">
                  <TableHead className="pl-8 py-5 font-bold text-slate-700">Order Information</TableHead>
                  <TableHead className="py-5 font-bold text-slate-700">Destination</TableHead>
                  <TableHead className="py-5 font-bold text-slate-700">Payload</TableHead>
                  <TableHead className="py-5 font-bold text-slate-700">Finance</TableHead>
                  <TableHead className="py-5 font-bold text-slate-700">Status</TableHead>
                  <TableHead className="pr-8 text-right font-bold text-slate-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="animate-pulse">
                      <TableCell colSpan={6} className="py-12 text-center text-slate-400">Synchronizing logistics chain...</TableCell>
                    </TableRow>
                  ))
                ) : filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-32 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-6 bg-slate-100 rounded-full">
                          <Package className="h-12 w-12 text-slate-300" />
                        </div>
                        <p className="text-xl font-bold text-slate-400">No shipments found in this category</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id} className="group hover:bg-slate-50/80 transition-colors border-slate-100">
                      <TableCell className="pl-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-indigo-50 rounded-xl">
                            <Hash className="h-5 w-5 text-indigo-600" />
                          </div>
                          <div>
                            <div className="font-black text-slate-900">{order.id}</div>
                            <div className="text-xs text-slate-400 font-bold flex items-center gap-1 mt-1 uppercase tracking-tighter">
                              <Calendar className="h-3 w-3" /> {new Date(order.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="font-bold text-slate-900">{order.customerName}</div>
                          <div className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <MapPin className="h-3.5 w-3.5 text-indigo-400" /> {order.city}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-lg bg-indigo-50 text-indigo-700 border-indigo-100 px-3 py-1 font-bold">
                          {order.orderItems?.length || 0} Units
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="font-black text-slate-900">{order.totalAmount.toLocaleString()} ETB</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Valuation</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`px-4 py-1.5 rounded-full font-bold shadow-sm ${
                          order.status.toLowerCase().includes('transit') || order.status === 'shipped'
                            ? 'bg-blue-600 text-white' 
                            : order.status === 'delivered'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-amber-500 text-white'
                        }`}>
                          {order.status.split('_').join(' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-8 text-right">
                        <div className="flex justify-end gap-2">
                          {['confirmed', 'processing', 'ready_for_dispatch', 'ready', 'pending'].includes(order.status.toLowerCase()) ? (
                            <Button 
                              onClick={() => handlePrepareDispatch(order)}
                              className="bg-slate-900 hover:bg-black text-white px-5 rounded-xl h-10 shadow-lg shadow-slate-200"
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Dispatch
                            </Button>
                          ) : ['shipped', 'in_transit'].includes(order.status.toLowerCase()) ? (
                            <div className="flex items-center gap-2">
                              <Button 
                                onClick={() => handlePrepareDispatch(order)}
                                variant="outline"
                                className="px-5 rounded-xl h-10 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                              >
                                <RefreshCcw className="h-4 w-4 mr-2" />
                                Reassign
                              </Button>
                              <Button 
                                disabled
                                className="bg-blue-50 text-blue-600 border-blue-100 px-3 rounded-xl h-10"
                                variant="outline"
                              >
                                <Navigation className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button 
                              disabled
                              className="px-5 rounded-xl h-10 shadow-sm border bg-emerald-50 text-emerald-600 border-emerald-100"
                              variant="outline"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Delivered
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Dispatch Detail Popout */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-2xl border-none shadow-2xl overflow-y-auto bg-slate-50/50 p-0">
          <div className={`${['shipped', 'in_transit'].includes(selectedOrder?.status?.toLowerCase() || '') ? 'bg-amber-600' : 'bg-indigo-600'} h-40 flex items-end p-8 transition-colors`}>
            <div className="flex items-center gap-4 text-white">
              <div className="p-4 bg-white/20 backdrop-blur rounded-3xl">
                <Truck className="h-8 w-8" />
              </div>
              <div>
                <SheetTitle className="text-white text-3xl font-black">
                  {['shipped', 'in_transit'].includes(selectedOrder?.status?.toLowerCase() || '') ? 'Reassign Shipment' : 'Shipment Console'}
                </SheetTitle>
                <SheetDescription className="text-indigo-100 font-medium font-mono tracking-tighter uppercase">
                  Logistics override: {selectedOrder?.id}
                </SheetDescription>
              </div>
            </div>
          </div>

          {selectedOrder && (
            <div className="px-8 -mt-10 pb-12 space-y-8">
              {/* Customer Insight Card */}
              <Card className="rounded-[2.5rem] border-none shadow-xl shadow-indigo-100/50 bg-white overflow-hidden">
                <CardHeader className="bg-white border-b border-slate-50 p-6 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                      <User className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800 tracking-tight">{selectedOrder.customerName}</h4>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Premium Customer</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="rounded-xl h-10 w-10 border-slate-100">
                      <Phone className="h-4 w-4 text-indigo-600" />
                    </Button>
                    <Button variant="outline" size="icon" className="rounded-xl h-10 w-10 border-slate-100">
                      <MapPin className="h-4 w-4 text-indigo-600" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Delivery Address</label>
                      <p className="font-bold text-slate-700 leading-tight">{selectedOrder.deliveryAddress}, {selectedOrder.city}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Package Contents</label>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {selectedOrder.orderItems?.map((item, idx) => (
                          <Badge key={idx} variant="secondary" className="bg-slate-100 border-none text-slate-600 font-bold text-[10px]">
                            {item.quantity}x {item.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Dispatch Configuration Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                    Routing Configuration
                  </h3>
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-black text-slate-500 ml-1 uppercase">Dispatch Source Shop</Label>
                  <Select 
                    value={dispatchForm.shopId} 
                    onValueChange={(v) => setDispatchForm({...dispatchForm, shopId: v})}
                  >
                    <SelectTrigger className="h-14 rounded-2xl border-slate-200 bg-white shadow-sm font-bold text-slate-700 focus:ring-indigo-500">
                      <SelectValue placeholder="Origin Point" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-2xl p-2">
                      {shops.map((shop) => (
                        <SelectItem key={shop.id} value={shop.id} className="rounded-xl py-3 font-bold">
                          <div className="flex flex-col">
                            <span>{shop.name}</span>
                            <span className="text-[10px] text-slate-400 font-medium">{shop.city} Depot</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-black text-slate-500 ml-1 uppercase">Assigned Field Agent</Label>
                  <Select 
                    value={dispatchForm.driverId} 
                    onValueChange={(v) => {
                      const driver = drivers.find(d => d.id.toString() === v);
                      setDispatchForm({...dispatchForm, driverId: v});
                    }}
                  >
                    <SelectTrigger className="h-14 rounded-2xl border-slate-200 bg-white shadow-sm font-bold text-slate-700 focus:ring-indigo-500">
                      <SelectValue placeholder="Select Field Agent" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-2xl p-2 max-h-[400px]">
                      {drivers.length === 0 ? (
                        <SelectItem value="none" disabled>No field agents found</SelectItem>
                      ) : (
                        drivers.map((driver) => {
                          const isFull = (driver.active_order_count || 0) >= (driver.max_capacity || 1);
                          const isOffline = driver.status === 'offline';
                          
                          return (
                            <SelectItem 
                              key={driver.id} 
                              value={driver.id.toString()} 
                              disabled={isFull || isOffline}
                              className={`rounded-xl py-3 font-bold ${isFull || isOffline ? 'opacity-50' : ''}`}
                            >
                              <div className="flex justify-between items-center w-full min-w-[200px]">
                                <div className="flex flex-col">
                                  <span>{driver.first_name} {driver.last_name}</span>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[10px] text-indigo-500 font-black uppercase tracking-widest">{driver.vehicle_type}</span>
                                    <span className="text-[10px] text-slate-300">•</span>
                                    <span className={`text-[10px] font-bold uppercase ${isOffline ? 'text-rose-500' : 'text-emerald-500'}`}>
                                      {driver.status}
                                    </span>
                                  </div>
                                </div>
                                <Badge variant="outline" className={`ml-4 ${isFull ? 'bg-red-50 text-red-600 border-red-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                                  {driver.active_order_count || 0} / {driver.max_capacity || 1} Load
                                </Badge>
                              </div>
                            </SelectItem>
                          );
                        })
                      )}
                    </SelectContent>
                  </Select>
                  {dispatchForm.driverId && drivers.find(d => d.id.toString() === dispatchForm.driverId) && (
                    <div className="flex items-center gap-2 px-2">
                       {(() => {
                         const d = drivers.find(dr => dr.id.toString() === dispatchForm.driverId);
                         const active = d?.active_order_count || 0;
                         const max = d?.max_capacity || 1;
                         if (active >= max) {
                           return <p className="text-[10px] font-black text-rose-600 flex items-center gap-1 uppercase tracking-tight"><AlertTriangle className="h-3 w-3" /> DRIVER AT FULL CAPACITY</p>;
                         }
                         if (active >= max - 1 && max > 1) {
                           return <p className="text-[10px] font-black text-amber-600 flex items-center gap-1 uppercase tracking-tight"><AlertTriangle className="h-3 w-3" /> NEAR CAPACITY LIMIT</p>;
                         }
                         return <p className="text-[10px] font-black text-emerald-600 flex items-center gap-1 uppercase tracking-tight"><CheckCircle2 className="h-3 w-3" /> DRIVER HAS CAPACITY</p>;
                       })()}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center ml-1">
                    <Label className="text-xs font-black text-slate-500 uppercase">Estimated Fulfillment Cost</Label>
                    <button 
                      onClick={() => setDispatchForm({...dispatchForm, transportationCost: calculateCost(selectedOrder)})}
                      className="text-[10px] text-indigo-600 font-black hover:underline flex items-center gap-1"
                    >
                      <RefreshCcw className="h-2.5 w-2.5" /> RE-CALC
                    </button>
                  </div>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-500" />
                    <Input 
                      type="number"
                      className="pl-12 h-14 rounded-2xl border-slate-200 bg-white shadow-sm font-black text-indigo-700 focus:ring-indigo-500 text-lg"
                      value={dispatchForm.transportationCost}
                      onChange={(e) => setDispatchForm({...dispatchForm, transportationCost: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center ml-1">
                    <Label className="text-xs font-black text-slate-500 uppercase">Tracking Identifier</Label>
                    <button 
                      onClick={() => setDispatchForm({...dispatchForm, trackingNumber: generateTrackingNumber()})}
                      className="text-[10px] text-indigo-600 font-black hover:underline flex items-center gap-1"
                    >
                      <RefreshCcw className="h-2.5 w-2.5" /> NEW
                    </button>
                  </div>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input 
                      className="pl-12 h-14 rounded-2xl border-slate-200 bg-white shadow-sm font-black text-slate-700 focus:ring-indigo-500 text-lg"
                      value={dispatchForm.trackingNumber}
                      onChange={(e) => setDispatchForm({...dispatchForm, trackingNumber: e.target.value})}
                    />
                  </div>
                </div>

                <div className="md:col-span-2 space-y-3">
                  <Label className="text-xs font-black text-slate-500 ml-1 uppercase">Dispatch Notes (Internal)</Label>
                  <Input 
                    placeholder="Fragile handling, gate codes, etc..."
                    className="h-14 rounded-2xl border-slate-200 bg-white shadow-sm font-bold text-slate-700 focus:ring-indigo-500"
                    value={dispatchForm.notes}
                    onChange={(e) => setDispatchForm({...dispatchForm, notes: e.target.value})}
                  />
                </div>

                <div className="md:col-span-2 pt-6">
                  <Button 
                    onClick={executeDispatch} 
                    disabled={isUpdating}
                    className="w-full h-16 rounded-3xl bg-indigo-600 hover:bg-black text-white text-xl font-black shadow-xl shadow-indigo-200 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3"
                  >
                    {isUpdating ? (
                      <>
                        <RefreshCcw className="h-6 w-6 animate-spin" />
                        INITIATING LOGISTICS...
                      </>
                    ) : (
                      <>
                        <Send className="h-6 w-6" />
                        AUTHORIZE SHIPMENT
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
