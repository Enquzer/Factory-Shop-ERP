'use client'

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/*
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
*/
import { Separator } from '@/components/ui/separator';
import { Truck, MapPin, Clock, Package, Phone, Navigation, User, CheckCircle2, XCircle, ArrowRight, Route } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
// import type { AuthenticatedUser } from '@/lib/auth-middleware';
import dynamic from 'next/dynamic';
import { ScrollArea } from '@/components/ui/scroll-area';

const DriverMap = dynamic(() => import('@/components/driver-map'), { 
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center bg-gray-100 text-gray-400">Loading Map...</div>
});

type DriverAssignment = {
  id: string;
  driverId: string;
  orderId: string;
  assignedBy: string;
  assignedAt: Date;
  status: 'assigned' | 'accepted' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  pickupLocation?: {
    lat: number;
    lng: number;
    name: string;
  };
  deliveryLocation?: {
    lat: number;
    lng: number;
    name: string;
  };
  estimatedDeliveryTime?: Date;
  actualPickupTime?: Date;
  actualDeliveryTime?: Date;
  orderDetails?: {
    customerName: string;
    customerPhone: string;
    totalAmount: number;
    deliveryAddress: string;
    trackingNumber: string;
    orderStatus: string;
    items: Array<{
      name: string;
      quantity: number;
      price: number;
      color: string;
      size: string;
    }>;
  };
};

type Driver = {
  id: string;
  name: string;
  phone: string;
  licensePlate: string;
  vehicleType: 'motorbike' | 'car' | 'van' | 'truck';
  status: 'available' | 'busy' | 'offline';
  currentLocation?: {
    lat: number;
    lng: number;
    lastUpdated: Date;
  };
  assignedOrders: string[];
  createdAt: Date;
  updatedAt: Date;
  maxCapacity?: number;
  activeOrderCount?: number;
};

export default function DriverDashboard() {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [assignments, setAssignments] = useState<DriverAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const { token, logout, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (token) {
      fetchDriverData();
      
      // Set up periodic refresh every 30 seconds
      const interval = setInterval(() => {
        fetchDriverData();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [token]);

  const fetchDriverData = async () => {
    try {
      // Don't set full loading on refresh to avoid flickering
      if (!driver) setIsLoading(true);
      
      // Get driver username from auth context
      const driverId = user?.username; // Use username as driver ID
      
      if (!driverId) {
        throw new Error('Driver ID not found in auth context');
      }
      
      // Fetch driver data using username
      const driverResponse = await fetch(`/api/drivers/${driverId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (driverResponse.status === 404) {
        // Driver record doesn't exist - show setup message
        setDriver(null);
        setAssignments([]);
        setIsLoading(false);
        return;
      }
      
      if (!driverResponse.ok) {
        throw new Error(`Failed to fetch driver data: ${driverResponse.status} ${driverResponse.statusText}`);
      }
      
      const { driver: driverData, assignments: driverAssignments } = await driverResponse.json();
      
      setDriver(driverData);
      setAssignments(driverAssignments);
    } catch (error) {
      console.error('Error fetching driver data:', error);
      toast({
        title: "Error",
        description: "Failed to load driver data",
        variant: "destructive"
      });
      // Keep existing data if refresh fails, only clear if initial load
      if (!driver) {
          setDriver(null);
          setAssignments([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateDriverLocation = async (lat: number, lng: number) => {
    if (!user?.username || !token || driver?.status === 'offline') return;
    
    try {
      const response = await fetch(`/api/drivers/${user.username}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentLocation: {
            lat,
            lng,
            lastUpdated: new Date()
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.driver) {
          setDriver((prev) => {
            if (!prev) return data.driver;
            return {
              ...prev,
              currentLocation: data.driver.currentLocation
            };
          });
        }
      }
    } catch (error) {
      console.error('Failed to update location:', error);
    }
  };

  useEffect(() => {
    if (driver && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          updateDriverLocation(position.coords.latitude, position.coords.longitude);
        },
        (error) => console.error('Geolocation error:', error),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [driver?.id]);

  const updateDriverStatus = async (newStatus: 'available' | 'busy' | 'offline') => {
    try {
      if (!user?.username || !token) return;
      
      setUpdatingStatus('driver-status');
      
      const response = await fetch(`/api/drivers/${user.username}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: newStatus
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update driver status');
      }
      
      const { driver: updatedDriver } = await response.json();
      
      // Update local state
      setDriver(updatedDriver);
      
      toast({
        title: newStatus === 'offline' ? "You are now Offline" : "Status Updated",
        description: newStatus === 'offline' 
          ? "Location tracking paused. You won't receive new assignments." 
          : `Your status has been updated to ${newStatus}`,
        className: newStatus === 'offline' ? "bg-slate-800 text-white" : "bg-green-600 text-white"
      });
    } catch (error) {
      console.error('Error updating driver status:', error);
      toast({
        title: "Error",
        description: "Failed to update driver status",
        variant: "destructive"
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const updateAssignmentStatus = async (assignmentId: string, newStatus: 'accepted' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled') => {
    try {
      setUpdatingStatus(assignmentId);
      
      const response = await fetch(`/api/driver-assignments/${assignmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update status');
      }
      
      const { assignment } = await response.json();
      
      // Update local state
      setAssignments(prev => prev.map(a => 
        a.id === assignmentId ? { ...a, ...assignment } : a
      ));

      // Refresh driver data to get updated status/assignments list
      if (newStatus === 'delivered' || newStatus === 'cancelled') {
        setTimeout(() => {
          fetchDriverData();
        }, 1000); // Small delay to allow backend processing
      }

      const statusMessages = {
          accepted: 'Order Accepted! Navigate to pickup.',
          picked_up: 'Order Picked Up! Head to delivery location.',
          in_transit: 'Delivery Started!',
          delivered: 'Order Delivered! Great job.',
          cancelled: 'Assignment Rejected/Cancelled.'
      };

      toast({
        title: newStatus === 'cancelled' ? "Assignment Rejected" : "Status Updated",
        description: statusMessages[newStatus] || `Order status updated to ${newStatus}`,
        className: newStatus === 'cancelled' ? "bg-red-600 text-white" : "bg-green-600 text-white"
      });
    } catch (error) {
      console.error('Error updating assignment status:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive"
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'bg-yellow-500';
      case 'accepted': return 'bg-orange-500';
      case 'picked_up': return 'bg-blue-500';
      case 'in_transit': return 'bg-indigo-500';
      case 'delivered': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'assigned': return 'Action Required';
      case 'accepted': return 'Accepted';
      case 'picked_up': return 'Picked Up';
      case 'in_transit': return 'In Transit';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const getVehicleIcon = (vehicleType: string) => {
    switch (vehicleType) {
      case 'motorbike': return '🏍️';
      case 'car': return '🚗';
      case 'van': return '🚐';
      case 'truck': return '🚚';
      default: return '🚗';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Access check
  if (!user || user.role !== 'driver') {
    return (
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <Card className="max-w-md w-full p-6 text-center">
            <h1 className="text-2xl font-bold mb-4">Driver Portal</h1>
            <p className="text-gray-500 mb-6">Please log in with a driver account.</p>
            <Button onClick={() => router.push('/login')}>Go to Login</Button>
          </Card>
        </div>
    );
  }
  
  // Driver setup check
  if (!driver) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-50">
            <Card className="max-w-lg w-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Truck className="h-6 w-6" /> Driver Account Setup
                    </CardTitle>
                    <CardDescription>Your account is not yet linked to a driver profile.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-gray-500 mb-4">
                        Please contact the fleet manager or HR to initialize your driver profile. 
                        Once set up, you will be able to receive and manage delivery assignments here.
                    </p>
                    <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200 mb-4">
                        <p className="text-sm font-medium text-yellow-800">Debug Info:</p>
                        <p className="text-xs text-yellow-700">Username: {user.username}</p>
                        <p className="text-xs text-yellow-700">Role: {user.role}</p>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={logout}>Logout</Button>
                    <Button onClick={() => window.location.reload()}>Refresh</Button>
                </CardFooter>
            </Card>
        </div>
      );
  }

  // Filter assignments
  const pendingAssignments = assignments.filter(a => a.status === 'assigned');
  const activeAssignments = assignments.filter(a => ['accepted', 'picked_up', 'in_transit'].includes(a.status));
  const completedAssignments = assignments.filter(a => a.status === 'delivered');

  // Sort active assignments - assuming inferred sequence by estimatedDeliveryTime or assignedAt
  const sortedActive = [...activeAssignments].sort((a, b) => {
      // Sort priority: status (accepted -> picked_up -> in_transit)
      // Actually, standard sort by estimated delivery time is best for route logic
      const timeA = a.estimatedDeliveryTime ? new Date(a.estimatedDeliveryTime).getTime() : 0;
      const timeB = b.estimatedDeliveryTime ? new Date(b.estimatedDeliveryTime).getTime() : 0;
      return timeA - timeB;
  });

  const triggerAutoPin = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          updateDriverLocation(position.coords.latitude, position.coords.longitude);
          toast({
            title: "Location Synced",
            description: "Your current coordinates have been precision-pinned.",
            className: "bg-indigo-600 text-white"
          });
        },
        (error) => {
          console.error("Geolocation error:", error);
          toast({
            title: "GPS Error",
            description: "Could not acquire precise location. Please check permissions.",
            variant: "destructive"
          });
        },
        { enableHighAccuracy: true }
      );
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-8 max-w-7xl mx-auto min-h-screen bg-gray-50/50">
      
      {/* Header & Status */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border">
        <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
                {getVehicleIcon(driver.vehicleType)} Hello, {driver.name.split(' ')[0]}
            </h1>
            <p className="text-sm text-gray-500 flex items-center gap-2">
                <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">{driver.licensePlate}</span>
                <span>•</span>
                <span className={driver.status === 'available' ? 'text-green-600 font-medium' : 'text-gray-500'}>
                    {driver.status.toUpperCase()}
                </span>
            </p>
            {/* Capacity Meter */}
            {driver.maxCapacity && (
                <div className="mt-2 w-full max-w-[200px]">
                    <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase mb-1">
                        <span>Load Capacity</span>
                        <span>{driver.activeOrderCount || 0} / {driver.maxCapacity}</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-500 ${
                                (driver.activeOrderCount || 0) >= driver.maxCapacity ? 'bg-red-500' : 
                                (driver.activeOrderCount || 0) > 0 ? 'bg-indigo-500' : 'bg-gray-300'
                            }`}
                            style={{ width: `${Math.min(100, ((driver.activeOrderCount || 0) / driver.maxCapacity) * 100)}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
        
        <div className="flex gap-2">
            <Button 
                size="sm" 
                variant={driver.status === 'available' ? 'default' : 'outline'}
                className={driver.status === 'available' ? 'bg-green-600 hover:bg-green-700' : ''}
                onClick={() => updateDriverStatus('available')}
                disabled={updatingStatus === 'driver-status'}
            >
                Available
            </Button>
            <Button 
                size="sm" 
                variant={driver.status === 'busy' ? 'default' : 'outline'}
                className={driver.status === 'busy' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
                onClick={() => updateDriverStatus('busy')}
                disabled={updatingStatus === 'driver-status'}
            >
                Busy
            </Button>
             <Button 
                size="sm" 
                variant={driver.status === 'offline' ? 'default' : 'outline'}
                className={driver.status === 'offline' ? 'bg-slate-600 hover:bg-slate-700' : ''}
                onClick={() => updateDriverStatus('offline')}
                disabled={updatingStatus === 'driver-status'}
            >
                Offline
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: New & Active Tasks */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* 1. New Assignments Alert */}
            {pendingAssignments.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-primary">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                        </span>
                        New Assignments ({pendingAssignments.length})
                    </h2>
                    {pendingAssignments.map(assignment => (
                        <Card key={assignment.id} className="border-l-4 border-l-orange-500 shadow-md animate-in slide-in-from-left duration-300">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg">Delivery Request</CardTitle>
                                        <CardDescription>
                                            Order #{assignment.orderId} • {new Date(assignment.assignedAt).toLocaleTimeString()}
                                        </CardDescription>
                                    </div>
                                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">New</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
                                <div className="space-y-1">
                                    <span className="text-xs text-gray-500 font-bold uppercase">Pickup</span>
                                    <p className="font-medium">{assignment.pickupLocation?.name || 'Warehouse'}</p>
                                    <p className="text-gray-500 text-xs">
                                        {assignment.pickupLocation?.lat.toFixed(4)}, {assignment.pickupLocation?.lng.toFixed(4)}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-gray-500 font-bold uppercase">Dropoff</span>
                                    <p className="font-medium">{assignment.deliveryLocation?.name || 'Customer'}</p>
                                    <p className="text-gray-500 text-xs">{assignment.orderDetails?.deliveryAddress}</p>
                                </div>
                                {/* Order Summary */}
                                {assignment.orderDetails && (
                                    <div className="md:col-span-2 bg-gray-50 p-2 rounded border border-dashed text-xs text-gray-600">
                                        <p className="font-semibold mb-1">Items: {assignment.orderDetails.items.length}</p>
                                        <p>{assignment.orderDetails.items.map(i => `${i.quantity}x ${i.name}`).join(', ').substring(0, 100)}...</p>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="flex gap-3 justify-end bg-gray-50/50 py-3">
                                <Button 
                                    variant="destructive" 
                                    onClick={() => updateAssignmentStatus(assignment.id, 'cancelled')}
                                    disabled={!!updatingStatus}
                                >
                                    <XCircle className="w-4 h-4 mr-2" /> Reject
                                </Button>
                                <Button 
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => updateAssignmentStatus(assignment.id, 'accepted')}
                                    disabled={!!updatingStatus}
                                >
                                    <CheckCircle2 className="w-4 h-4 mr-2" /> Accept Order
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            {/* 2. Current Route / Active Tasks */}
            <div>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Route className="h-5 w-5 text-indigo-600" />
                    Current Route Queue
                </h2>
                
                {sortedActive.length === 0 ? (
                    <Card className="bg-slate-50 border-dashed">
                        <CardContent className="py-8 text-center text-gray-500">
                            <p>No active deliveries.</p>
                            <p className="text-sm">Wait for new assignments or check Completed history.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        <div className="relative pl-6 border-l-2 border-indigo-100 space-y-8 ml-3">
                            {sortedActive.map((assignment, index) => {
                                const isNext = index === 0;
                                return (
                                    <div key={assignment.id} className="relative">
                                        {/* Status Dot */}
                                        <span className={`absolute -left-[31px] top-4 h-6 w-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center
                                            ${isNext ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                                            <span className="text-[10px] font-bold text-white">{index + 1}</span>
                                        </span>

                                        <Card className={`${isNext ? 'border-indigo-600 shadow-md ring-1 ring-indigo-100' : 'opacity-90'}`}>
                                            <CardHeader className="pb-2">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <Badge variant={isNext ? "default" : "secondary"} className="mb-2">
                                                            {getStatusText(assignment.status)}
                                                        </Badge>
                                                        <CardTitle className="text-base">Order #{assignment.orderId}</CardTitle>
                                                    </div>
                                                    {isNext && <span className="text-xs font-bold text-indigo-600 animate-pulse">CURRENT STOP</span>}
                                                </div>
                                            </CardHeader>
                                            
                                            <CardContent className="text-sm space-y-4">
                                                {/* Pickup & Dropoff Visual Line */}
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 p-2 bg-blue-50/50 rounded border border-blue-100">
                                                        <p className="text-[10px] uppercase text-blue-600 font-bold">From</p>
                                                        <p className="font-medium truncate">{assignment.pickupLocation?.name}</p>
                                                    </div>
                                                    <ArrowRight className="text-gray-300 h-4 w-4 shrink-0" />
                                                    <div className="flex-1 p-2 bg-orange-50/50 rounded border border-orange-100">
                                                        <p className="text-[10px] uppercase text-orange-600 font-bold">To</p>
                                                        <p className="font-medium truncate">{assignment.deliveryLocation?.name}</p>
                                                    </div>
                                                </div>

                                                {/* Actions based on status */}
                                                <div className="pt-2">
                                                     {assignment.status === 'accepted' && (
                                                        <Button 
                                                            className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg"
                                                            onClick={() => updateAssignmentStatus(assignment.id, 'picked_up')}
                                                            disabled={!!updatingStatus}
                                                        >
                                                            <Package className="mr-2" /> Confirm Pickup
                                                        </Button>
                                                     )}
                                                     {assignment.status === 'picked_up' && (
                                                        <Button 
                                                            className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-lg"
                                                            onClick={() => updateAssignmentStatus(assignment.id, 'in_transit')}
                                                            disabled={!!updatingStatus}
                                                        >
                                                            <Truck className="mr-2" /> Start Journey
                                                        </Button>
                                                     )}
                                                     {assignment.status === 'in_transit' && (
                                                        <Button 
                                                            className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg"
                                                            onClick={() => updateAssignmentStatus(assignment.id, 'delivered')}
                                                            disabled={!!updatingStatus}
                                                        >
                                                            <CheckCircle2 className="mr-2" /> Confirm Delivery
                                                        </Button>
                                                     )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

        </div>

        {/* Right Column: Map & History */}
        <div className="space-y-6">
            
            {/* Map Card */}
            <Card className="overflow-hidden border-none shadow-xl rounded-3xl">
                <CardHeader className="bg-white border-b pb-3 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-black flex items-center gap-2 italic text-indigo-700">
                             <Navigation className="h-4 w-4" /> LOCAL DISPATCH HUB
                        </CardTitle>
                        <CardDescription className="text-[10px] uppercase font-bold tracking-widest opacity-60">Real-time assets tracking</CardDescription>
                    </div>
                    <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 px-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-bold text-[10px]"
                        onClick={triggerAutoPin}
                    >
                        <MapPin className="h-3 w-3 mr-1" /> AUTO-PIN ME
                    </Button>
                </CardHeader>
                <div className="h-[400px] md:h-[500px] p-2 bg-slate-100">
                    <DriverMap 
                        driverLocation={driver.currentLocation}
                        vehicleType={driver.vehicleType}
                        // Show next pickup/dropoff on map
                        pickupLocation={sortedActive[0]?.pickupLocation}
                        deliveryLocation={sortedActive[0]?.deliveryLocation}
                        secondaryDeliveryLocation={sortedActive[1]?.deliveryLocation}
                    />
                </div>
            </Card>

            {/* Recent History */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-[300px]">
                        {completedAssignments.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm">No completed deliveries yet.</div>
                        ) : (
                            <div className="divide-y">
                                {completedAssignments.map(a => (
                                    <div key={a.id} className="p-3 hover:bg-gray-50 border-l-2 border-l-green-500">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-bold text-xs">#{a.orderId}</span>
                                            <Badge variant="secondary" className="bg-green-100 text-green-800 text-[10px]">
                                                DELIVERED
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-gray-600 flex items-center gap-1 mb-1">
                                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                                            Delivered to {a.deliveryLocation?.name}
                                        </p>
                                        {a.actualDeliveryTime && (
                                            <p className="text-[10px] text-gray-500">
                                                Completed: {new Date(a.actualDeliveryTime).toLocaleString()}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>

        </div>

      </div>

    </div>
  );
}