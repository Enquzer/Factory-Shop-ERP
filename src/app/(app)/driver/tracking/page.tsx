'use client'

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Navigation, Truck, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

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
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Geolocation error:", error);
          toast({
            title: "Location Error",
            description: "Please enable location services for live tracking.",
            variant: "destructive"
          });
        },
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [token]);

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
        const active = assignments.find((a: any) => 
          ['accepted', 'picked_up', 'in_transit'].includes(a.status)
        );
        setActiveDelivery(active || null);
      }
    } catch (error) {
      console.error('Error fetching active delivery:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Live Tracking</h1>
          <p className="text-muted-foreground">Monitor your current position and active route</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchActiveDelivery}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="aspect-video bg-muted flex items-center justify-center relative overflow-hidden border-2 border-indigo-100">
            {/* Mock Map Background */}
            <div className="absolute inset-0 opacity-10">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="gray" strokeWidth="0.5"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>
            
            <div className="z-10 text-center p-8">
              {location ? (
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-full shadow-2xl inline-block animate-bounce border-4 border-indigo-500">
                    <Navigation className="h-10 w-10 text-indigo-600 fill-indigo-100 rotate-45" />
                  </div>
                  <div className="bg-white/90 backdrop-blur px-6 py-3 rounded-2xl shadow-lg">
                    <p className="text-sm font-bold text-indigo-900">Your Current Position</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground animate-pulse font-medium">Acquiring GPS Signal...</p>
              )}
            </div>
          </Card>

          {activeDelivery && (
            <Card className="bg-indigo-600 text-white shadow-indigo-200">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-3 rounded-full">
                    <Truck className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">In Progress: #{activeDelivery.orderId}</h3>
                    <p className="text-indigo-100 text-sm">{activeDelivery.deliveryLocation?.name}</p>
                  </div>
                </div>
                <Button variant="secondary" className="bg-white text-indigo-600 hover:bg-indigo-50">
                  Detailed Route
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Location Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-xl space-y-1">
                <p className="text-xs font-bold text-muted-foreground uppercase">GPS Accuracy</p>
                <p className="font-semibold text-green-600">High (±5m)</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-xl space-y-1">
                <p className="text-xs font-bold text-muted-foreground uppercase">Connection Status</p>
                <p className="font-semibold text-blue-600 capitalize">Online</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-xl space-y-1">
                <p className="text-xs font-bold text-muted-foreground uppercase">Current Task</p>
                <p className="font-semibold">{activeDelivery ? 'On Delivery' : 'Standby'}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-100 italic">
            <CardContent className="p-4 text-sm text-blue-700">
              Note: Live tracking data is shared with the customer once you mark the order as "In Transit".
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
