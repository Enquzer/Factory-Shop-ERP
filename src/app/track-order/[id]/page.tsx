"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCustomerAuth } from "@/contexts/customer-auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/logo";
import { 
  Package, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Truck, 
  AlertCircle, 
  ArrowLeft,
  Phone,
  User,
  Navigation,
  ShieldCheck,
  Calendar,
  Loader2,
  ChevronRight
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import dynamic from "next/dynamic";

// Dynamically import the map component to avoid SSR issues with Leaflet
const DriverMap = dynamic(() => import("@/components/driver-map"), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        <span className="text-sm font-medium text-slate-500">Loading Map...</span>
      </div>
    </div>
  )
});

interface TrackingData {
  orderId: string;
  orderStatus: string;
  paymentStatus: string;
  trackingNumber?: string;
  deliveryAddress: string;
  city: string;
  driverAssignment?: {
    id: string;
    driverId: string;
    status: string;
    pickupLocation?: { lat: number; lng: number; name: string };
    deliveryLocation?: { lat: number; lng: number; name: string };
    estimatedDeliveryTime?: string;
  };
  driverInfo?: {
    id: string;
    name: string;
    phone: string;
    vehicleType: string;
    currentLocation?: { lat: number; lng: number; lastUpdated: string };
    status: string;
  };
  createdAt: string;
}

export default function TrackOrderPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useCustomerAuth();
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchTracking = async () => {
    try {
      const token = localStorage.getItem('customerAuthToken');
      const response = await fetch(`/api/order-tracking/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTrackingData(data.trackingInfo);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error("Error fetching tracking:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && id) {
      fetchTracking();
      // Polling for live updates every 30 seconds
      const interval = setInterval(fetchTracking, 30000);
      return () => clearInterval(interval);
    } else if (!user) {
      setIsLoading(false);
    }
  }, [user, id]);

  const calculateETA = () => {
    if (!trackingData?.driverInfo?.currentLocation || !trackingData?.driverAssignment?.deliveryLocation) {
      return null;
    }

    const start = trackingData.driverInfo.currentLocation;
    const end = trackingData.driverAssignment.deliveryLocation;

    // Haversine formula for distance
    const R = 6371; // Earth's radius in km
    const dLat = (end.lat - start.lat) * Math.PI / 180;
    const dLon = (end.lng - start.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(start.lat * Math.PI / 180) * Math.cos(end.lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    // Average speeds in km/h
    const speedMap: Record<string, number> = {
      'motorbike': 25,
      'car': 35,
      'van': 30,
      'truck': 25
    };
    const speed = speedMap[trackingData.driverInfo.vehicleType] || 30;
    
    const timeHours = distance / speed;
    const timeMinutes = Math.round(timeHours * 60) + 5; // Add 5 mins buffer

    return {
      minutes: timeMinutes,
      distance: distance.toFixed(1)
    };
  };

  const eta = calculateETA();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-slate-500 font-medium animate-pulse">Initializing Tracking...</p>
        </div>
      </div>
    );
  }

  if (!user || !trackingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full text-center p-8 border-none shadow-xl rounded-3xl">
          <AlertCircle className="h-16 w-16 text-rose-200 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{!user ? "Authentication Required" : "Order Not Found"}</h2>
          <p className="text-slate-500 mb-8">{!user ? "Please sign in to track your order." : "We couldn't retrieve tracking information for this order."}</p>
          <Link href={!user ? "/ecommerce/login" : "/ecommerce/orders"}>
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-12 font-bold shadow-lg transition-all active:scale-95">
              {!user ? "Take me to Login" : "View My Orders"}
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const isOrderOnWay = ['picked_up', 'in_transit'].includes(trackingData.orderStatus) || 
                      (trackingData.driverAssignment?.status && ['picked_up', 'in_transit'].includes(trackingData.driverAssignment.status));

  const isDelivered = trackingData.orderStatus === 'delivered' || trackingData.driverAssignment?.status === 'delivered';

  // If order is delivered, show delivery confirmation screen
  if (isDelivered) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-[1000] border-b border-slate-100 shadow-sm">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
               <Link href={`/ecommerce/orders/${id}`}>
                  <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100">
                      <ArrowLeft className="h-5 w-5 text-slate-600" />
                  </Button>
               </Link>
               <Logo className="h-8 md:h-10" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest bg-emerald-100 px-3 py-1 rounded-full">DELIVERED</span>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-12 md:py-20">
          <div className="max-w-2xl mx-auto">
            <Card className="border-none shadow-2xl rounded-[3rem] overflow-hidden">
              <CardContent className="p-12 text-center">
                {/* Success Icon */}
                <div className="mb-8 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-32 h-32 bg-emerald-100 rounded-full animate-ping opacity-20"></div>
                  </div>
                  <div className="relative flex items-center justify-center">
                    <div className="w-32 h-32 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-200">
                      <CheckCircle2 className="h-16 w-16 text-white" />
                    </div>
                  </div>
                </div>

                {/* Success Message */}
                <h1 className="text-4xl font-black text-slate-900 mb-4">Order Delivered Successfully!</h1>
                <p className="text-lg text-slate-600 mb-2">Order #{id.toString().split('-').pop()}</p>
                <p className="text-slate-500 mb-8">Your package has been delivered to your doorstep. Thank you for shopping with us!</p>

                {/* Delivery Details */}
                <div className="bg-slate-50 rounded-2xl p-6 mb-8 text-left">
                  <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Package className="h-5 w-5 text-emerald-600" />
                    Delivery Information
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Delivered To:</span>
                      <span className="font-bold text-slate-900">{trackingData.deliveryAddress}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">City:</span>
                      <span className="font-bold text-slate-900">{trackingData.city}</span>
                    </div>
                    {trackingData.driverInfo && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Delivered By:</span>
                        <span className="font-bold text-slate-900">{trackingData.driverInfo.name}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500">Order Date:</span>
                      <span className="font-bold text-slate-900">{format(new Date(trackingData.createdAt), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href={`/ecommerce/orders/${id}`} className="flex-1">
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 rounded-xl font-bold shadow-lg shadow-emerald-200">
                      View Order Details
                    </Button>
                  </Link>
                  <Link href="/ecommerce/products" className="flex-1">
                    <Button variant="outline" className="w-full h-12 rounded-xl font-bold border-2">
                      Continue Shopping
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // Normal tracking interface for orders in transit
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-[1000] border-b border-slate-100 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <Link href={`/ecommerce/orders/${id}`}>
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100">
                    <ArrowLeft className="h-5 w-5 text-slate-600" />
                </Button>
             </Link>
             <Logo className="h-8 md:h-10" />
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden md:inline text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">LIVE TRACKING</span>
            {eta && (
                <div className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 shadow-md animate-pulse">
                    <Clock className="h-4 w-4" />
                    ~{eta.minutes} mins away
                </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 md:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Tracking Info */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Status Header */}
            <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-5">
                  <Navigation className="h-32 w-32 rotate-45" />
               </div>
               <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                     <span>Order #{id.toString().split('-').pop()}</span>
                     <span>{format(new Date(trackingData.createdAt), 'MMM d, yyyy')}</span>
                  </div>
                  <h1 className="text-3xl font-black text-slate-900 mb-2 leading-tight">
                    {trackingData.orderStatus === 'delivered' ? 'Order Delivered!' : 
                     isOrderOnWay ? 'Your Order is On the Way!' : 'Preparing Your Order'}
                  </h1>
                  <p className="text-slate-500 text-sm font-medium mb-6">
                    {trackingData.orderStatus === 'delivered' ? 'Enjoy your purchase! Thank you for shopping with us.' :
                     isOrderOnWay ? `${trackingData.driverInfo?.name} is out for delivery with your package.` :
                     'We are confirming your items and assigning a driver. Stay tuned!'}
                  </p>

                  <div className="flex flex-wrap gap-3">
                     <Badge className={`rounded-full px-4 py-1.5 text-xs font-bold border-none ${
                        trackingData.orderStatus === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                        isOrderOnWay ? 'bg-blue-100 text-blue-700 animate-pulse' :
                        'bg-amber-100 text-amber-700'
                     }`}>
                        {trackingData.orderStatus.replace('_', ' ').toUpperCase()}
                     </Badge>
                     <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase">
                        <ShieldCheck className="h-3 w-3" /> Secure Delivery
                     </div>
                  </div>
               </div>
            </div>

            {/* Delivery Timeline / Details */}
            <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50 overflow-hidden">
              <CardContent className="p-0">
                <div className="p-8 border-b border-slate-50 bg-slate-50/50">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Truck className="h-5 w-5 text-blue-600" />
                    Delivery Details
                  </h3>
                </div>
                <div className="p-8 space-y-8">
                   {/* Pickup */}
                   <div className="flex gap-4 relative">
                      <div className="absolute top-10 bottom-0 left-[11px] w-[2px] bg-slate-100"></div>
                      <div className="h-6 w-6 rounded-full bg-blue-100 border-4 border-white shadow-sm flex-shrink-0 z-10"></div>
                      <div>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pick-up Location</p>
                         <p className="text-sm font-bold text-slate-900">{trackingData.driverAssignment?.pickupLocation?.name || "Original Store"}</p>
                         <p className="text-xs text-slate-500 mt-1">Order processed and handed to driver.</p>
                      </div>
                   </div>

                   {/* Destination */}
                   <div className="flex gap-4">
                      <div className="h-6 w-6 rounded-full bg-emerald-100 border-4 border-white shadow-sm flex-shrink-0 z-10 flex items-center justify-center">
                         <MapPin className="h-3 w-3 text-emerald-600" />
                      </div>
                      <div>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Final Destination</p>
                         <p className="text-sm font-bold text-slate-900">{trackingData.deliveryAddress}</p>
                         <p className="text-xs text-slate-500 mt-1">{trackingData.city}</p>
                      </div>
                   </div>
                </div>
              </CardContent>
            </Card>

            {/* Driver Card */}
            {trackingData.driverInfo && (
               <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                     <User className="h-32 w-32" />
                  </div>
                  
                  <div className="flex items-center gap-4 mb-6 relative z-10">
                     <div className="h-16 w-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                        <User className="h-8 w-8 text-blue-400" />
                     </div>
                     <div>
                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] mb-1">Your Driver</p>
                        <h4 className="text-xl font-black">{trackingData.driverInfo.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                           <Badge variant="outline" className="border-white/20 text-white/60 text-[10px] uppercase px-2 py-0">
                              {trackingData.driverInfo.vehicleType}
                           </Badge>
                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                           <span className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Active Now</span>
                        </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 relative z-10">
                     <a href={`tel:${trackingData.driverInfo.phone}`} className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl py-4 transition-all active:scale-95 border border-white/5">
                        <Phone className="h-5 w-5" />
                        <span className="font-bold text-sm">Call Driver</span>
                     </a>
                     <div className="flex flex-col items-center justify-center bg-white/10 backdrop-blur-md rounded-2xl py-4 border border-white/5">
                        <span className="text-[10px] font-bold text-white/40 uppercase mb-1 tracking-tighter">Current Speed</span>
                        <span className="font-black text-lg">--- <span className="text-[10px] opacity-40 italic">km/h</span></span>
                     </div>
                  </div>
               </div>
            )}

            <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Last updated: {format(lastUpdated, 'h:mm:ss a')}
            </p>
          </div>

          {/* Right Column: Map */}
          <div className="lg:col-span-7 h-[600px] lg:h-auto min-h-[500px]">
             <div className="w-full h-full rounded-[3rem] overflow-hidden shadow-2xl shadow-slate-300/50 border-8 border-white bg-white relative">
                <DriverMap 
                   driverLocation={trackingData.driverInfo?.currentLocation}
                   pickupLocation={trackingData.driverAssignment?.pickupLocation}
                   deliveryLocation={trackingData.driverAssignment?.deliveryLocation}
                   vehicleType={trackingData.driverInfo?.vehicleType}
                />
                
                {/* Map Overlays */}
                <div className="absolute top-8 left-8 right-8 flex justify-between pointer-events-none">
                   {eta && (
                      <div className="bg-white/90 backdrop-blur-xl p-6 rounded-3xl shadow-2xl pointer-events-auto border border-white/50 animate-in fade-in slide-in-from-top-4 duration-700">
                         <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                               <Navigation className="h-6 w-6 text-white" />
                            </div>
                            <div>
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Estimated Arrival</p>
                               <h5 className="text-2xl font-black text-slate-900">{eta.minutes} <span className="text-sm text-slate-400">mins</span></h5>
                            </div>
                         </div>
                         <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-8">
                            <div className="flex flex-col">
                               <span className="text-[10px] font-bold text-slate-400 uppercase">Distance</span>
                               <span className="font-bold text-slate-700">{eta.distance} km</span>
                            </div>
                            <div className="flex flex-col text-right">
                               <span className="text-[10px] font-bold text-slate-400 uppercase">Status</span>
                               <span className="font-bold text-blue-600 uppercase text-xs tracking-tighter">In Transit</span>
                            </div>
                         </div>
                      </div>
                   )}
                </div>

                {trackingData.orderStatus === 'delivered' && (
                   <div className="absolute inset-x-8 bottom-8 pointer-events-none flex justify-center">
                      <div className="bg-emerald-600 text-white px-8 py-6 rounded-3xl shadow-2xl pointer-events-auto flex items-center gap-4 animate-in zoom-in-95 duration-500">
                         <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                            <CheckCircle2 className="h-8 w-8" />
                         </div>
                         <div>
                            <p className="text-sm font-bold">Successfully Delivered</p>
                            <p className="text-xs text-white/70">Your order has reached its destination.</p>
                         </div>
                         <Button 
                           variant="outline" 
                           className="ml-4 border-white/30 bg-white/10 hover:bg-white/20 text-white rounded-xl h-12"
                           onClick={() => router.push(`/ecommerce/orders/${id}`)}
                         >
                            Finish
                         </Button>
                      </div>
                   </div>
                )}
             </div>
          </div>

        </div>
      </main>
    </div>
  );
}
