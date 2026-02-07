'use client'

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Truck, MapPin, Clock, Package, Phone, Navigation, User } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import type { AuthenticatedUser } from '@/lib/auth-middleware';

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
    }
  }, [token]);

  const fetchDriverData = async () => {
    try {
      setIsLoading(true);
      
      // Get driver username from auth context
      const driverId = user?.username; // Use username as driver ID
      
      if (!driverId) {
        throw new Error('Driver ID not found in auth context');
      }
      
      console.log('[DRIVER DASHBOARD] Fetching driver data for:', driverId);
      
      // Fetch driver data using username
      const driverResponse = await fetch(`/api/drivers/${driverId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      console.log('[DRIVER DASHBOARD] Driver API response status:', driverResponse.status);
      
      if (driverResponse.status === 404) {
        // Driver record doesn't exist - show setup message
        console.log('Driver record not found, showing setup options');
        setDriver(null);
        setAssignments([]);
        setIsLoading(false);
        return;
      }
      
      if (!driverResponse.ok) {
        throw new Error(`Failed to fetch driver data: ${driverResponse.status} ${driverResponse.statusText}`);
      }
      
      const { driver: driverData, assignments: driverAssignments } = await driverResponse.json();
      console.log('[DRIVER DASHBOARD] Driver data loaded:', { 
        driver: { id: driverData?.id, name: driverData?.name, status: driverData?.status },
        assignments: driverAssignments?.length || 0 
      });
      
      setDriver(driverData);
      setAssignments(driverAssignments);
    } catch (error) {
      console.error('Error fetching driver data:', error);
      toast({
        title: "Error",
        description: "Failed to load driver data",
        variant: "destructive"
      });
      // Set empty state on error
      setDriver(null);
      setAssignments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const updateDriverLocation = async (lat: number, lng: number) => {
    if (!user?.username || !token) return;
    
    try {
      await fetch(`/api/drivers/${user.username}`, {
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
  }, [driver]);

  const updateAssignmentStatus = async (assignmentId: string, newStatus: 'accepted' | 'picked_up' | 'in_transit' | 'delivered') => {
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

      // Also update order status in ecommerce_orders via a proxy/direct call if needed
      // Our backend handles most of this in the PATCH assignment route.

      // Refresh driver data to get updated status
      if (newStatus === 'delivered') {
        setTimeout(() => {
          fetchDriverData();
        }, 1000); // Small delay to allow backend processing
      }

      toast({
        title: "Status Updated",
        description: newStatus === 'delivered' 
          ? `Order marked as delivered. You are now available for new assignments!` 
          : `Order status updated to ${newStatus}`,
        className: "bg-green-600 text-white"
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
      case 'assigned': return 'New Assignment';
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

  if (!user || (user.role as string) !== 'driver') {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl border">
          <div className="text-6xl mb-4">🚚</div>
          <h1 className="text-2xl font-bold mb-2">Access Restricted</h1>
          <p className="text-muted-foreground mb-6">Please log in as a driver to access this portal.</p>
          <Button onClick={() => router.push('/login')} className="bg-indigo-600 hover:bg-indigo-700">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  // If driver data doesn't exist, show setup message
  if (!driver) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🚚</div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome, Driver!</h1>
            <p className="text-gray-600">Your driver profile needs to be set up by HR</p>
          </div>

          <Card className="bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Driver Profile Setup Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-medium text-blue-800 mb-2">Account Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Username:</span>
                      <div className="font-medium">{user.username}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Role:</span>
                      <div className="font-medium capitalize">{user.role}</div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h3 className="font-medium text-yellow-800 mb-2">Next Steps</h3>
                  <ul className="space-y-2 text-sm text-yellow-700">
                    <li className="flex items-start gap-2">
                      <span>•</span>
                      <span>Contact HR to register you as an official driver</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>•</span>
                      <span>HR will assign your vehicle type and contact information</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>•</span>
                      <span>Once registered, you'll be able to access delivery assignments</span>
                    </li>
                  </ul>
                </div>

                <div className="flex justify-center gap-4 pt-4">
                  <Button variant="outline" onClick={() => router.push('/profile')}>
                    View Profile
                  </Button>
                  <Button 
                    onClick={() => window.location.reload()} 
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Refresh Status
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!driver) {
    // Driver is authenticated but no driver record exists
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="text-6xl mb-6">🚛</div>
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Driver Setup Required</h1>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              Your account is set up but your driver profile needs to be created. 
              Please contact HR or your administrator to set up your driver record.
            </p>
            
            <Card className="bg-white/80 backdrop-blur-sm max-w-md mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Your Account Info
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-left">
                  <div>
                    <p className="text-sm text-gray-500">Username</p>
                    <p className="font-medium">{user.username}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Role</p>
                    <p className="font-medium capitalize">{user.role}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">User ID</p>
                    <p className="font-medium">{user.id}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={logout}
                variant="outline"
                className="border-gray-300 hover:bg-gray-100"
              >
                Logout
              </Button>
              <Button 
                onClick={() => router.push('/hr/driver-data-debug')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Debug Driver Data
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      {/* Driver Info Card */}
      <Card className="bg-white shadow-sm border-none ring-1 ring-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">{getVehicleIcon(driver.vehicleType)}</span>
              Driver Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-semibold">{driver.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-semibold flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {driver.phone}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">License Plate</p>
                <p className="font-semibold">{driver.licensePlate}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Vehicle Type</p>
                <p className="font-semibold">{driver.vehicleType.toUpperCase()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    driver.status === 'available' ? 'bg-green-500' : 
                    driver.status === 'busy' ? 'bg-yellow-500' : 'bg-gray-500'
                  }`}></div>
                  <span className="font-semibold capitalize">
                    {driver.status === 'available' ? 'Available for Assignments' : 
                     driver.status === 'busy' ? 'Currently Busy' : 'Offline'}
                  </span>
                  {driver.status === 'available' && (
                    <Badge className="bg-green-100 text-green-800 border-green-200 text-xs ml-2">
                      Ready for New Orders
                    </Badge>
                  )}
                </div>
                {/* Capacity Indicator */}
                <div className="mt-1 text-xs text-gray-500">
                  {driver.vehicleType === 'motorbike' && (
                    <span>Can carry up to 3 orders simultaneously</span>
                  )}
                  {driver.vehicleType === 'car' && (
                    <span>Can carry up to 5 orders simultaneously</span>
                  )}
                  {driver.vehicleType === 'van' && (
                    <span>Can carry up to 10 orders simultaneously</span>
                  )}
                  {driver.vehicleType === 'truck' && (
                    <span>Can carry up to 20 orders simultaneously</span>
                  )}
                </div>
              </div>
            </div>
            
            {driver.currentLocation && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-500 mb-2">Current Location</p>
                <p className="font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  Lat: {driver.currentLocation.lat.toFixed(6)}, 
                  Lng: {driver.currentLocation.lng.toFixed(6)}
                  <span className="text-xs text-gray-500 ml-2">
                    (Updated: {new Date(driver.currentLocation.lastUpdated).toLocaleTimeString()})
                  </span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Assignments */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Active Deliveries</h2>
          
          {assignments.filter(a => a.status !== 'delivered' && a.status !== 'cancelled').length === 0 ? (
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No Active Deliveries</h3>
                <p className="text-gray-500">You don't have any assigned deliveries at the moment.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {assignments
                .filter(a => a.status !== 'delivered' && a.status !== 'cancelled')
                .map((assignment) => (
                  <Card key={assignment.id} className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <CardTitle className="flex items-center gap-2">
                          <Package className="h-5 w-5" />
                          Order #{assignment.orderId}
                        </CardTitle>
                        <Badge className={`${getStatusColor(assignment.status)} text-white`}>
                          {getStatusText(assignment.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {assignment.pickupLocation && (
                          <div>
                            <p className="text-sm text-gray-500 flex items-center gap-1 mb-1">
                              <MapPin className="h-4 w-4" />
                              Pickup Location
                            </p>
                            <p className="font-medium">{assignment.pickupLocation.name}</p>
                            <p className="text-sm text-gray-600">
                              {assignment.pickupLocation.lat.toFixed(6)}, {assignment.pickupLocation.lng.toFixed(6)}
                            </p>
                          </div>
                        )}
                        
                        {assignment.deliveryLocation && (
                          <div>
                            <p className="text-sm text-gray-500 flex items-center gap-1 mb-1">
                              <Navigation className="h-4 w-4" />
                              Delivery Address
                            </p>
                            <p className="font-medium">{assignment.deliveryLocation.name}</p>
                            <p className="text-sm text-gray-600">
                              {assignment.deliveryLocation.lat.toFixed(6)}, {assignment.deliveryLocation.lng.toFixed(6)}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {assignment.estimatedDeliveryTime && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                          <Clock className="h-4 w-4" />
                          Estimated Delivery: {new Date(assignment.estimatedDeliveryTime).toLocaleString()}
                        </div>
                      )}
                      
                      {/* Order Details & Map */}
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                          <Truck className="h-4 w-4" />
                          Delivery Journey
                        </h4>
                        
                        <div className="relative pl-8 space-y-8">
                          {/* Vertical Line */}
                          <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-300"></div>
                          
                          {/* Pickup Point */}
                          <div className="relative">
                            <div className="absolute -left-[27px] top-1 h-4 w-4 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center">
                              <div className="h-1.5 w-1.5 rounded-full bg-white"></div>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Start: Pickup Location</p>
                              <p className="font-medium text-gray-900">{assignment.pickupLocation?.name}</p>
                              <p className="text-xs text-gray-500">Coordinates: {assignment.pickupLocation?.lat.toFixed(4)}, {assignment.pickupLocation?.lng.toFixed(4)}</p>
                            </div>
                          </div>
                          
                          {/* Delivery Point */}
                          <div className="relative">
                            <div className="absolute -left-[27px] top-1 h-4 w-4 rounded-full bg-orange-600 border-2 border-white flex items-center justify-center">
                              <div className="h-1.5 w-1.5 rounded-full bg-white"></div>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-orange-600 uppercase tracking-wider">End: Customer Location</p>
                              <p className="font-medium text-gray-900">{assignment.deliveryLocation?.name}</p>
                              <p className="text-xs text-gray-500">Coordinates: {assignment.deliveryLocation?.lat.toFixed(4)}, {assignment.deliveryLocation?.lng.toFixed(4)}</p>
                            </div>
                          </div>
                        </div>

                        {/* Order Items */}
                        {assignment.orderDetails && (
                          <div className="mt-6 pt-6 border-t border-gray-200">
                            <h5 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              Order Details ({assignment.orderDetails.items.length} items)
                            </h5>
                            <div className="space-y-2">
                              {assignment.orderDetails.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center text-sm p-2 bg-white rounded border border-gray-100">
                                  <div>
                                    <span className="font-medium">{item.name}</span>
                                    <span className="text-gray-500 ml-2">x{item.quantity}</span>
                                    <span className="text-xs text-gray-400 block">{item.color} | {item.size}</span>
                                  </div>
                                  <span className="font-semibold text-gray-900">${(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                              ))}
                              <div className="flex justify-between items-center pt-2 font-bold text-gray-900">
                                <span>Total Amount</span>
                                <span>${assignment.orderDetails.totalAmount.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2 mt-6">
                        {assignment.status === 'assigned' && (
                          <Button
                            onClick={() => updateAssignmentStatus(assignment.id, 'accepted')}
                            disabled={updatingStatus === assignment.id}
                            className="bg-orange-600 hover:bg-orange-700 text-white font-bold"
                          >
                            {updatingStatus === assignment.id ? 'Accepting...' : 'Accept Order'}
                          </Button>
                        )}

                        {assignment.status === 'accepted' && (
                          <Button
                            onClick={() => updateAssignmentStatus(assignment.id, 'picked_up')}
                            disabled={updatingStatus === assignment.id}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            {updatingStatus === assignment.id ? 'Updating...' : 'Mark as Picked Up'}
                          </Button>
                        )}
                        
                        {assignment.status === 'picked_up' && (
                          <Button
                            onClick={() => updateAssignmentStatus(assignment.id, 'in_transit')}
                            disabled={updatingStatus === assignment.id}
                            className="bg-indigo-600 hover:bg-indigo-700"
                          >
                            {updatingStatus === assignment.id ? 'Updating...' : 'Start Delivery'}
                          </Button>
                        )}
                        
                        {assignment.status === 'in_transit' && (
                          <Button
                            onClick={() => updateAssignmentStatus(assignment.id, 'delivered')}
                            disabled={updatingStatus === assignment.id}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {updatingStatus === assignment.id ? 'Updating...' : 'Mark as Delivered'}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </div>

        {/* Completed Deliveries */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Delivery History</h2>
          
          {assignments.filter(a => a.status === 'delivered').length === 0 ? (
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardContent className="py-12 text-center">
                <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No Delivery History</h3>
                <p className="text-gray-500">Your completed deliveries will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {assignments
                .filter(a => a.status === 'delivered')
                .slice(0, 5) // Show only last 5 completed deliveries
                .map((assignment) => (
                  <Card key={assignment.id} className="bg-white/80 backdrop-blur-sm">
                    <CardContent className="py-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <h3 className="font-semibold">Order #{assignment.orderId}</h3>
                          <p className="text-sm text-gray-600">
                            Delivered on {assignment.actualDeliveryTime ? new Date(assignment.actualDeliveryTime).toLocaleDateString() : 'Unknown date'}
                          </p>
                        </div>
                        <Badge className="bg-green-500 text-white">
                          Delivered
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </div>
    </div>
  );
}