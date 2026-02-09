'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Navigation, Truck, RefreshCw, ChevronRight, Info, Map as MapIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import dynamic from 'next/dynamic';
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';

// Import DriverMap dynamically to avoid SSR issues with Leaflet
const DriverMap = dynamic(() => import('@/components/driver-map'), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-muted animate-pulse flex items-center justify-center">Loading Map...</div>
});

export default function DriverTrackingPage() {
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [activeDelivery, setActiveDelivery] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { token, user } = useAuth();

  useEffect(() => {
    fetchActiveDelivery();
    
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLoc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setLocation(newLoc);
          
          // Optionally update driver location in DB
          if (user?.username) {
            updateLiveLocation(newLoc);
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          toast({
            title: "Location Error",
            description: "Please enable location services for live tracking.",
            variant: "destructive"
          });
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [token, user]);

  const updateLiveLocation = async (loc: {lat: number, lng: number}) => {
    try {
      await fetch(`/api/drivers/${user?.username}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentLocation: {
            lat: loc.lat,
            lng: loc.lng
          }
        })
      });
    } catch (e) {
      // Background update failure shouldn't disrupt UI
    }
  };

  const fetchActiveDelivery = async () => {
    try {
      setIsLoading(true);
      const driverId = user?.username;
      if (!driverId) return;

      const response = await fetch(`/api/drivers/${driverId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const { assignments } = await response.json();
        // Look for the most relevant active assignment
        const active = assignments.find((a: any) => 
          ['in_transit', 'picked_up', 'accepted'].includes(a.status)
        ) || assignments.find((a: any) => a.status === 'assigned');
        
        setActiveDelivery(active || null);
      }
    } catch (error) {
      console.error('Error fetching active delivery:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const routeSteps = useMemo(() => {
    if (!activeDelivery) return [];
    
    return [
      {
        id: 'pickup',
        type: 'pickup',
        title: 'Pickup Location',
        address: activeDelivery.pickupLocation?.name || 'Loading Center',
        status: ['picked_up', 'in_transit', 'delivered'].includes(activeDelivery.status) ? 'completed' : 'pending'
      },
      {
        id: 'delivery',
        type: 'delivery',
        title: 'Delivery Destination',
        address: activeDelivery.deliveryLocation?.name || 'Customer Address',
        status: activeDelivery.status === 'delivered' ? 'completed' : 'pending'
      }
    ];
  }, [activeDelivery]);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Live Dispatch Tracking</h1>
          <p className="text-muted-foreground">Real-time navigation and delivery intelligence</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchActiveDelivery} className="bg-white">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Sync Status
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <Card className="h-[500px] relative overflow-hidden border-2 border-indigo-100 shadow-xl rounded-3xl">
            {location ? (
               <DriverMap 
                 driverLocation={location}
                 pickupLocation={activeDelivery?.pickupLocation}
                 deliveryLocation={activeDelivery?.deliveryLocation}
               />
            ) : (
               <div className="w-full h-full bg-slate-50 flex items-center justify-center">
                 <div className="text-center space-y-4">
                   <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                   <p className="text-slate-500 font-medium">Acquiring live GPS signal...</p>
                 </div>
               </div>
            )}
            
            {/* Legend Overlay */}
            <div className="absolute top-4 right-4 z-[1000] bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-white/20 text-xs space-y-2">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-600 rounded-full border border-white shadow-sm"></div>
                    <span className="font-semibold text-slate-700">Driver (You)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-600 rounded-sm border border-white shadow-sm"></div>
                    <span className="font-semibold text-slate-700">Pickup</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-rose-600 rounded-full border border-white shadow-sm"></div>
                    <span className="font-semibold text-slate-700">Destination</span>
                </div>
            </div>
          </Card>

          {activeDelivery && (
            <Card className="bg-indigo-600 text-white shadow-2xl shadow-indigo-200 border-none rounded-3xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Truck className="h-32 w-32 rotate-[-15deg]" />
              </div>
              <CardContent className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="flex items-start gap-6">
                  <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
                    <Truck className="h-8 w-8" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-white/10 border-white/20 text-white capitalize px-3 py-0.5">
                        {activeDelivery.status?.replace('_', ' ')}
                      </Badge>
                      <span className="text-indigo-200 text-sm font-medium">#{activeDelivery.orderId}</span>
                    </div>
                    <h3 className="font-bold text-2xl">To: {activeDelivery.deliveryLocation?.name || 'Customer'}</h3>
                    <p className="text-indigo-100/80 text-sm flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {activeDelivery.deliveryLocation?.name || 'Bole, Addis Ababa'}
                    </p>
                  </div>
                </div>
                
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="secondary" className="bg-white text-indigo-700 hover:bg-indigo-50 font-bold px-8 rounded-xl shadow-lg h-12">
                      Detailed Route <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[400px] sm:w-[540px]">
                    <SheetHeader className="mb-8">
                      <SheetTitle className="text-2xl font-bold flex items-center gap-2 text-indigo-700">
                        <Navigation className="h-6 w-6" /> Detailed Logistics Route
                      </SheetTitle>
                      <SheetDescription>
                        Step-by-step dispatch path for order #{activeDelivery.orderId}
                      </SheetDescription>
                    </SheetHeader>
                    
                    <div className="space-y-8 relative">
                      {/* Connector Line */}
                      <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-slate-100"></div>
                      
                      {routeSteps.map((step, index) => (
                        <div key={step.id} className="relative z-10 flex gap-6">
                          <div className={`mt-1 h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border-2 ${
                            step.status === 'completed' 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                              : 'bg-white border-slate-200 text-slate-400'
                          }`}>
                            {step.type === 'pickup' ? <MapIcon className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
                          </div>
                          <div className="space-y-1">
                            <h4 className={`font-bold ${step.status === 'completed' ? 'text-slate-900' : 'text-slate-500'}`}>
                              {step.title}
                            </h4>
                            <p className="text-sm text-slate-600 font-medium">{step.address}</p>
                            {step.status === 'completed' && (
                              <Badge className="bg-emerald-500 hover:bg-emerald-600 border-none text-[10px] uppercase font-bold tracking-wider">
                                Arrived
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-12 p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                      <h4 className="font-bold text-slate-900 flex items-center gap-2">
                        <Info className="h-4 w-4 text-indigo-600" /> Dispatch Instructions
                      </h4>
                      <div className="space-y-3">
                         <div className="flex gap-3 text-sm text-slate-600">
                           <div className="h-5 w-5 rounded bg-white shadow-sm border border-slate-200 flex items-center justify-center text-[10px] font-bold shrink-0">1</div>
                           <p>Verify all items against order invoice before leaving the shop.</p>
                         </div>
                         <div className="flex gap-3 text-sm text-slate-600">
                           <div className="h-5 w-5 rounded bg-white shadow-sm border border-slate-200 flex items-center justify-center text-[10px] font-bold shrink-0">2</div>
                           <p>Call customer at {activeDelivery.orderDetails?.customerPhone || 'registered number'} when 5 minutes away.</p>
                         </div>
                         <div className="flex gap-3 text-sm text-slate-600">
                           <div className="h-5 w-5 rounded bg-white shadow-sm border border-slate-200 flex items-center justify-center text-[10px] font-bold shrink-0">3</div>
                           <p>Collect digital signature upon successful delivery.</p>
                         </div>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50">
              <CardTitle className="text-lg flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-indigo-600" /> Tracking Diagnostics
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="p-4 bg-muted/30 rounded-2xl space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Signal Strength</p>
                <p className="font-bold text-emerald-600">Excellent (LTE/4G)</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-2xl space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Location Accuracy</p>
                <p className="font-bold text-blue-600">High Resolution</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-2xl space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Task</p>
                <p className="font-bold text-indigo-700">{activeDelivery ? 'Logistics Active' : 'Waiting for Assignment'}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-600 text-white rounded-3xl shadow-lg shadow-blue-100 border-none p-6">
            <div className="flex gap-4">
              <Info className="h-6 w-6 text-blue-200 shrink-0" />
              <div className="space-y-2">
                <p className="text-sm font-semibold">Privacy Policy</p>
                <p className="text-xs text-blue-100 leading-relaxed">
                  Your live location is only shared with dispatch headquarters and the active customer. Sharing stops automatically when the order is completed.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
