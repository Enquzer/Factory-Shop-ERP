'use client'

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Package, Truck, MapPin, Clock, Navigation, Phone, Calendar } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

type TrackingInfo = {
  orderId: string;
  orderStatus: string;
  paymentStatus: string;
  trackingNumber?: string;
  dispatchDate?: Date;
  deliveryAddress: string;
  city: string;
  driverAssignment?: {
    id: string;
    driverId: string;
    status: string;
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
  };
  driverInfo?: {
    id: string;
    name: string;
    phone: string;
    vehicleType: string;
    currentLocation?: {
      lat: number;
      lng: number;
      lastUpdated: Date;
    };
    status: string;
  };
  orderItems: any[];
  totalAmount: number;
  transportationCost: number;
  createdAt: Date;
  updatedAt: Date;
};

export default function OrderTrackingPage({ params }: { params: { orderId: string } }) {
  const [trackingInfo, setTrackingInfo] = useState<TrackingInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (token && params.orderId) {
      fetchTrackingInfo();
    }
  }, [token, params.orderId]);

  const fetchTrackingInfo = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/order-tracking/${params.orderId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch tracking information');
      }
      
      const { trackingInfo: data } = await response.json();
      setTrackingInfo(data);
    } catch (error) {
      console.error('Error fetching tracking info:', error);
      toast({
        title: "Error",
        description: "Failed to load order tracking information",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-500';
      case 'processing': return 'bg-blue-500';
      case 'confirmed': return 'bg-indigo-500';
      case 'shipped': return 'bg-purple-500';
      case 'in_transit': return 'bg-orange-500';
      case 'delivered': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getDriverStatusText = (status: string) => {
    switch (status) {
      case 'assigned': return 'Driver Assigned';
      case 'accepted': return 'Order Accepted';
      case 'picked_up': return 'Order Picked Up';
      case 'in_transit': return 'On the Way';
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order tracking...</p>
        </div>
      </div>
    );
  }

  if (!trackingInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Order Not Found</h1>
          <p className="text-gray-600 mb-6">We couldn't find tracking information for this order.</p>
          <Button onClick={() => router.push('/')} className="bg-blue-600 hover:bg-blue-700">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Tracking</h1>
          <p className="text-gray-600">Track your order #{trackingInfo.orderId}</p>
        </div>

        {/* Order Summary */}
        <Card className="mb-6 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Details
              </span>
              <Badge className={`${getStatusColor(trackingInfo.orderStatus)} text-white`}>
                {trackingInfo.orderStatus.charAt(0).toUpperCase() + trackingInfo.orderStatus.slice(1)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Order ID</p>
                <p className="font-semibold">{trackingInfo.orderId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Order Date</p>
                <p className="font-semibold flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(trackingInfo.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="font-semibold">ETB {trackingInfo.totalAmount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Payment Status</p>
                <p className="font-semibold capitalize">{trackingInfo.paymentStatus}</p>
              </div>
            </div>
            
            {trackingInfo.trackingNumber && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-500">Tracking Number</p>
                <p className="font-semibold text-blue-600">{trackingInfo.trackingNumber}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Driver Information */}
        {trackingInfo.driverInfo && trackingInfo.driverAssignment ? (
          <Card className="mb-6 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Delivery Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Driver Details */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <span className="text-2xl">{getVehicleIcon(trackingInfo.driverInfo.vehicleType)}</span>
                    Driver Details
                  </h3>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Driver Name</p>
                      <p className="font-semibold">{trackingInfo.driverInfo.name}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        Contact
                      </p>
                      <p className="font-semibold">{trackingInfo.driverInfo.phone}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Vehicle Type</p>
                      <p className="font-semibold capitalize">{trackingInfo.driverInfo.vehicleType}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Delivery Status</p>
                      <Badge className={`${getStatusColor(trackingInfo.driverAssignment.status)} text-white`}>
                        {getDriverStatusText(trackingInfo.driverAssignment.status)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Location Information */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Locations
                  </h3>
                  
                  <div className="space-y-4">
                    {trackingInfo.driverAssignment.pickupLocation && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm font-medium text-blue-800 mb-1">Pickup Location</p>
                        <p className="text-sm">{trackingInfo.driverAssignment.pickupLocation.name}</p>
                        <p className="text-xs text-blue-600">
                          {trackingInfo.driverAssignment.pickupLocation.lat.toFixed(6)}, {trackingInfo.driverAssignment.pickupLocation.lng.toFixed(6)}
                        </p>
                      </div>
                    )}
                    
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-sm font-medium text-green-800 mb-1">Delivery Address</p>
                      <p className="text-sm">{trackingInfo.deliveryAddress}</p>
                      <p className="text-sm text-gray-600">{trackingInfo.city}</p>
                    </div>
                    
                    {trackingInfo.driverInfo.currentLocation && (
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <p className="text-sm font-medium text-purple-800 mb-1">Driver's Current Location</p>
                        <p className="text-xs text-purple-600">
                          Lat: {trackingInfo.driverInfo.currentLocation.lat.toFixed(6)}, 
                          Lng: {trackingInfo.driverInfo.currentLocation.lng.toFixed(6)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Last updated: {new Date(trackingInfo.driverInfo.currentLocation.lastUpdated).toLocaleTimeString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {trackingInfo.driverAssignment.estimatedDeliveryTime && (
                <div className="mt-6 pt-4 border-t">
                  <p className="text-sm text-gray-500 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Estimated Delivery Time
                  </p>
                  <p className="font-semibold text-lg">
                    {new Date(trackingInfo.driverAssignment.estimatedDeliveryTime).toLocaleString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6 bg-white/80 backdrop-blur-sm">
            <CardContent className="py-8 text-center">
              <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Order Not Yet Assigned</h3>
              <p className="text-gray-500">
                Your order is being processed and will be assigned to a driver soon.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Order Items */}
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trackingInfo.orderItems.map((item: any, index: number) => (
                <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  {item.imageUrl ? (
                    <img 
                      src={item.imageUrl} 
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-md"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded-md flex items-center justify-center">
                      <Package className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="font-semibold">{item.name}</h4>
                    <p className="text-sm text-gray-600">
                      {item.color} • {item.size} • Qty: {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">ETB {(item.price * item.quantity).toLocaleString()}</p>
                    <p className="text-sm text-gray-500">ETB {item.price}/each</p>
                  </div>
                </div>
              ))}
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>ETB {trackingInfo.totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee:</span>
                  <span>ETB {trackingInfo.transportationCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total:</span>
                  <span>ETB {(trackingInfo.totalAmount + trackingInfo.transportationCost).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}