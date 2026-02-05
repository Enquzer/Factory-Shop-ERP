"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { useCustomerAuth } from "@/contexts/customer-auth-context";
import { Logo } from "@/components/logo";
import { Minus, Plus, Trash2, ShoppingCart, Package, MapPin, Truck, CreditCard, ChevronRight, Map as MapIcon, Info, ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

// Dynamically import LocationMap to avoid SSR issues with Leaflet
import dynamic from 'next/dynamic';
const LocationMap = dynamic(() => import('@/components/ui/location-map'), { 
  ssr: false,
  loading: () => <div className="h-[400px] w-full bg-slate-100 animate-pulse rounded-lg border-2 border-slate-200 flex items-center justify-center text-slate-400">Loading Map...</div>
});

// Distance calculation using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function CartPage() {
  const { user } = useCustomerAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { 
    items, 
    itemCount, 
    totalPrice, 
    isLoading: isCartLoading, 
    error, 
    updateQuantity, 
    removeItem, 
    clearCart 
  } = useCart();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [sourceShop, setSourceShop] = useState<any>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const isLoading = isCartLoading || isSubmitting || isLoadingSettings;
  
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutData, setCheckoutData] = useState({
    fullName: "",
    phone: "",
    city: "Addis Ababa",
    subCity: "",
    address: "",
    deliveryMethod: "standard",
    paymentMethod: "telebirr",
    lat: "", 
    lng: ""
  });

  // Sync user data to checkout form
  useEffect(() => {
    if (user) {
      setCheckoutData(prev => ({
        ...prev,
        fullName: prev.fullName || (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : ""),
        phone: prev.phone || user.phone || "",
        city: user.city || prev.city,
        address: prev.address || user.deliveryAddress || ""
      }));
    }
  }, [user]);

  const [roadDistance, setRoadDistance] = useState(0);
  const [routeGeometry, setRouteGeometry] = useState<[number, number][]>([]);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [routingStatus, setRoutingStatus] = useState<"pending" | "road" | "straight" | "error">("pending");

  // Road distance effect
  useEffect(() => {
    const controller = new AbortController();

    const fetchRoute = async () => {
      if (!sourceShop?.latitude || !sourceShop?.longitude || !checkoutData.lat || !checkoutData.lng) {
        setRoadDistance(0);
        setRouteGeometry([]);
        setRoutingStatus("pending");
        return;
      }

      setIsCalculatingRoute(true);
      try {
        const start = `${sourceShop.longitude},${sourceShop.latitude}`;
        const end = `${checkoutData.lng},${checkoutData.lat}`;
        
        // Using OSRM German Demo Server (often more stable/faster)
        const res = await fetch(`https://routing.openstreetmap.de/routed-car/route/v1/driving/${start};${end}?overview=full&geometries=geojson`, {
            signal: controller.signal
        });
        
        if (!res.ok) throw new Error("Route API responded with error");
        
        const data = await res.json();

        if (data.code === 'Ok' && data.routes?.[0]) {
            const route = data.routes[0];
            setRoadDistance(route.distance / 1000); // meters to km
            
            // OSRM returns [lon, lat], Leaflet needs [lat, lon]
            const coords = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
            setRouteGeometry(coords);
            setRoutingStatus("road");
        } else {
            throw new Error("No road route found between these points");
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        
        console.warn("Road calculation failed, falling back to straight line:", err);
        // Fallback to straight line calculation
        const d = calculateDistance(
            parseFloat(sourceShop.latitude), parseFloat(sourceShop.longitude),
            parseFloat(checkoutData.lat), parseFloat(checkoutData.lng)
        );
        setRoadDistance(d);
        setRouteGeometry([
            [parseFloat(sourceShop.latitude), parseFloat(sourceShop.longitude)], 
            [parseFloat(checkoutData.lat), parseFloat(checkoutData.lng)]
        ]);
        setRoutingStatus("straight");
      } finally {
        setIsCalculatingRoute(false);
      }
    };

    const timeout = setTimeout(fetchRoute, 1000); // Debounce to avoid rate limits
    return () => {
        clearTimeout(timeout);
        controller.abort();
    };
  }, [sourceShop, checkoutData.lat, checkoutData.lng]);

  // Use roadDistance for calculation
  const distance = roadDistance;
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const token = localStorage.getItem('customerAuthToken');
        if (!token) return;

        const res = await fetch('/api/ecommerce-manager/settings', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
          const config = await res.json();
          setSettings(config);

          const shopId = config.ecommerce_primary_shop_id;
          if (shopId) {
            const shopRes = await fetch(`/api/shops?id=${shopId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (shopRes.ok) {
              setSourceShop(await shopRes.json());
            }
          }
        }
      } catch (err) {
        console.error("Error fetching config:", err);
      } finally {
        setIsLoadingSettings(false);
      }
    };

    if (user) {
      fetchConfig();
    } else {
      setIsLoadingSettings(false);
    }
  }, [user]);


  // Calculate delivery fee
  const deliveryFee = useMemo(() => {
    if (!settings) return 50; // Default fallback

    // Free delivery check (only if enabled)
    const isFreeDeliveryEnabled = settings.ecommerce_enable_free_delivery === 'true';
    const freeThreshold = parseFloat(settings.ecommerce_free_delivery_threshold || "5000");
    
    if (isFreeDeliveryEnabled && totalPrice >= freeThreshold) return 0;

    const baseRate = parseFloat(settings.ecommerce_standard_rate || "10");
    const multiplier = parseFloat(settings.ecommerce_express_multiplier || "1.5");
    
    // console.log('DEBUG: Fee Config', { baseRate, multiplier, distance });
    
    let fee = distance * baseRate;
    
    // Minimum fee protection
    if (fee < 50) fee = 50;

    if (checkoutData.deliveryMethod === 'express') {
      fee *= multiplier;
    }

    return Math.round(fee);
  }, [settings, distance, checkoutData.deliveryMethod, totalPrice]);

  const handleCheckout = async () => {
    if (!user || items.length === 0) return;
    
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('customerAuthToken');
      const tax = totalPrice * 0.15;
      const totalAmount = totalPrice + deliveryFee + tax;

      const response = await fetch('/api/ecommerce/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          customerId: user.username,
          customerName: checkoutData.fullName,
          customerEmail: user.email,
          customerPhone: checkoutData.phone,
          deliveryAddress: checkoutData.address,
          city: checkoutData.city,
          subCity: checkoutData.subCity,
          totalAmount,
          transportationCost: deliveryFee,
          latitude: parseFloat(checkoutData.lat) || null,
          longitude: parseFloat(checkoutData.lng) || null,
          deliveryDistance: distance,
          deliveryType: checkoutData.deliveryMethod,
          items: items.map(item => ({
            productId: item.productId,
            productVariantId: item.productVariantId,
            name: item.name,
            price: item.price,
            color: item.color,
            size: item.size,
            quantity: item.quantity,
            imageUrl: item.imageUrl
          })),
          paymentMethod: checkoutData.paymentMethod
        })
      });

      if (response.ok) {
        toast({
          title: "Order Placed Successfully!",
          description: "Your order is being processed. Total ETB " + totalAmount.toLocaleString(),
          className: "bg-green-600 text-white",
        });
        
        await clearCart();
        router.push('/ecommerce'); 
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to place order');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      toast({
        title: "Checkout Failed",
        description: err instanceof Error ? err.message : "Error processing order",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUserLocation = () => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setCheckoutData(prev => ({
          ...prev,
          lat: position.coords.latitude.toFixed(6),
          lng: position.coords.longitude.toFixed(6)
        }));
        toast({ title: "Location Registered", description: "Successfully pinpointed your delivery coordinates." });
      }, (error) => {
        console.warn("Geolocation error:", error);
        toast({ title: "Location Error", description: "Please enter your location manually or allow permission.", variant: "destructive" });
      });
    }
  };

  // Auto-get location when showing checkout
  useEffect(() => {
    if (showCheckout && !checkoutData.lat) {
      getUserLocation();
    }
  }, [showCheckout]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 bg-white/90 backdrop-blur-sm">
          <CardContent className="text-center py-12">
            <ShoppingCart className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-gray-800">Please Sign In</h2>
            <p className="text-gray-600 mb-6">You need to be logged in to view your cart</p>
            <Link href="/ecommerce/login">
              <Button className="bg-gradient-to-r from-green-700 to-green-800">Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading && !isSubmitting) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-gradient-to-r from-green-900 to-green-800 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Logo className="h-10" />
              <h1 className="text-2xl font-bold text-white">Your Shopping Cart</h1>
            </div>
            <Link href="/ecommerce">
              <Button className="bg-orange-500 hover:bg-orange-600 text-white border-none font-bold shadow-lg shadow-orange-900/20 group">
                <ArrowLeft className="h-5 w-5 mr-2 text-white transition-transform group-hover:-translate-x-1" />
                Back Store
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {items.length === 0 ? (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="text-center py-16">
              <ShoppingCart className="h-20 w-20 text-green-600 mx-auto mb-6" />
              <h2 className="text-2xl font-semibold mb-2">Your cart is empty</h2>
              <Link href="/ecommerce"><Button className="bg-green-700 mt-4">Start Shopping</Button></Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {!showCheckout ? (
                <Card className="border-none shadow-sm overflow-hidden">
                  <CardHeader className="bg-white border-b flex flex-row items-center justify-between">
                    <CardTitle>Shopping Bag ({itemCount} items)</CardTitle>
                    <Button variant="ghost" size="sm" onClick={clearCart} className="text-gray-500 hover:text-red-500">
                      <Trash2 className="h-4 w-4 mr-2" /> Clear
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0 bg-white">
                    <div className="divide-y text-sm">
                      {items.map((item) => (
                        <div key={item.id} className="p-6 flex items-center gap-6">
                          <Image src={item.imageUrl || "/placeholder-product.png"} alt={item.name} width={80} height={80} className="rounded-lg object-cover" />
                          <div className="flex-1">
                            <h3 className="font-bold text-lg">{item.name}</h3>
                            <div className="flex gap-2 mt-1">
                                <Badge variant="outline">{item.color}</Badge>
                                <Badge variant="outline">Size: {item.size}</Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</Button>
                            <span className="font-bold">{item.quantity}</span>
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</Button>
                          </div>
                          <div className="text-right font-black">ETB {(item.price * item.quantity).toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-none shadow-sm overflow-hidden transition-all">
                  <CardHeader className="bg-white border-b flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 italic">
                        <Truck className="h-5 w-5 text-green-600" />
                        Delivery Logistics
                      </CardTitle>
                      <CardDescription>Precision location for accurate fees</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setShowCheckout(false)} className="text-green-700">Back</Button>
                  </CardHeader>
                  <CardContent className="p-8 space-y-8 bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input value={checkoutData.fullName} onChange={(e) => setCheckoutData({...checkoutData, fullName: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input value={checkoutData.phone} onChange={(e) => setCheckoutData({...checkoutData, phone: e.target.value})} />
                      </div>
                    </div>
                    {/* Detailed Logistics Debug / Info */}
                    <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-2">
                        <div className="font-bold text-slate-800 border-b pb-1 mb-2">Logistics Details</div>
                        <div className="flex justify-between">
                            <span>Origin Shop:</span>
                            <span className="font-mono">{sourceShop ? sourceShop.name : "Not Configured"}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Origin Coords:</span>
                            <span className="font-mono">
                                {sourceShop?.latitude ? `${Number(sourceShop.latitude).toFixed(4)}, ${Number(sourceShop.longitude).toFixed(4)}` : "MISSING"}
                            </span>
                        </div>
                        <div className="flex justify-between border-t border-dashed pt-2 mt-2">
                            <span>Destination Coords:</span>
                            <span className="font-mono">
                                {checkoutData.lat ? `${Number(checkoutData.lat).toFixed(4)}, ${Number(checkoutData.lng).toFixed(4)}` : "Pending..."}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>Raw Distance:</span>
                            <span className="font-mono">{distance.toFixed(4)} KM</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Base Rate:</span>
                            <span className="font-mono">{settings?.ecommerce_standard_rate} ETB/KM</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>City</Label>
                        <Input value={checkoutData.city} readOnly className="bg-gray-50" />
                      </div>
                      <div className="space-y-2">
                        <Label>Subcity / Area</Label>
                        <Input placeholder="e.g. Bole" value={checkoutData.subCity} onChange={(e) => setCheckoutData({...checkoutData, subCity: e.target.value})} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Street Address / Landmark</Label>
                      <Input value={checkoutData.address} onChange={(e) => setCheckoutData({...checkoutData, address: e.target.value})} />
                    </div>



                    {/* Geolocation Section */}
                    <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold flex items-center gap-2">
                                <MapIcon className="h-4 w-4 text-indigo-600" />
                                Interactive Delivery Map
                            </h3>
                            <Button size="sm" onClick={getUserLocation} className="bg-indigo-600 hover:bg-indigo-700">
                                <MapPin className="h-4 w-4 mr-2" /> Auto-Pin My Location
                            </Button>
                        </div>

                        {/* Map Component */}
                        <div className="w-full">
                            <LocationMap 
                                shopLocation={sourceShop && sourceShop.latitude && sourceShop.longitude ? {
                                    lat: parseFloat(sourceShop.latitude),
                                    lng: parseFloat(sourceShop.longitude),
                                    name: sourceShop.name || "Shop"
                                } : null}
                                userLocation={checkoutData.lat && checkoutData.lng ? {
                                    lat: parseFloat(checkoutData.lat),
                                    lng: parseFloat(checkoutData.lng)
                                } : null}
                                distance={distance}
                                routingStatus={routingStatus}
                                routePoints={routeGeometry}
                                isSelected={routingStatus === 'road'}
                                onLocationSelect={(lat: number, lng: number) => {
                                    setCheckoutData(prev => ({
                                        ...prev,
                                        lat: lat.toFixed(6),
                                        lng: lng.toFixed(6)
                                    }));
                                }}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-slate-500 uppercase">Lat</Label>
                                <Input value={checkoutData.lat} onChange={(e) => setCheckoutData({...checkoutData, lat: e.target.value})} placeholder="0.000000" className="bg-white" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-slate-500 uppercase">Long</Label>
                                <Input value={checkoutData.lng} onChange={(e) => setCheckoutData({...checkoutData, lng: e.target.value})} placeholder="0.000000" className="bg-white" />
                            </div>
                        </div>
                        {!checkoutData.lat && (
                            <p className="text-[10px] text-rose-500 font-bold flex items-center gap-1">
                                <Info className="h-3 w-3" /> Please use the map or click "Auto-Pin" to set location
                            </p>
                        )}
                        {distance > 0 && (
                            <div className={`p-3 rounded-lg text-xs font-bold flex flex-col gap-1 ${routingStatus === 'road' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                <div className="flex justify-between items-center">
                                    <span>{routingStatus === 'road' ? 'Road Distance' : 'Straight Distance (Offline)'}: {distance.toFixed(2)} KM</span>
                                    <span>Estimated Fee: ETB {deliveryFee.toLocaleString()}</span>
                                </div>
                                {isCalculatingRoute && <div className="text-[9px] animate-pulse">Calculating shortest road route...</div>}
                                {routingStatus === 'straight' && <div className="text-[9px]">Road network unreachable. Estimate using direct line.</div>}
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">
                      <Label>Delivery Method</Label>
                      <RadioGroup value={checkoutData.deliveryMethod} onValueChange={(v: string) => setCheckoutData({...checkoutData, deliveryMethod: v})} className="grid grid-cols-2 gap-4">
                        <div className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${checkoutData.deliveryMethod === 'standard' ? 'border-orange-500 bg-orange-50/30' : 'border-gray-100'}`} onClick={() => setCheckoutData({...checkoutData, deliveryMethod: 'standard'})}>
                          <div className="font-bold text-sm">Standard</div>
                          <div className="text-[10px] opacity-60">3-5 Days</div>
                        </div>
                        <div className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${checkoutData.deliveryMethod === 'express' ? 'border-orange-500 bg-orange-50/30' : 'border-gray-100'}`} onClick={() => setCheckoutData({...checkoutData, deliveryMethod: 'express'})}>
                          <div className="font-bold text-sm">Express</div>
                          <div className="text-[10px] opacity-60">Next Day</div>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="space-y-3 pt-4 border-t">
                      <Label>Payment Gateway</Label>
                      <RadioGroup value={checkoutData.paymentMethod} onValueChange={(v: string) => setCheckoutData({...checkoutData, paymentMethod: v})} className="grid grid-cols-3 gap-4">
                        {['telebirr', 'cbe', 'cash'].map((method) => (
                           <div key={method} className={`p-4 rounded-xl border-2 text-center cursor-pointer ${checkoutData.paymentMethod === method ? 'border-green-500 bg-green-50' : 'border-gray-100'}`} onClick={() => setCheckoutData({...checkoutData, paymentMethod: method})}>
                              <div className="font-black text-[10px] uppercase">{method}</div>
                           </div>
                        ))}
                      </RadioGroup>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            
            <div className="lg:sticky lg:top-8 h-fit">
              <Card className="border-none shadow-xl bg-white overflow-hidden rounded-2xl">
                <CardHeader className="bg-gray-50/50">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-orange-500" /> Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Subtotal</span>
                      <span className="font-bold">ETB {totalPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Delivery Fee</span>
                      <span className={`${deliveryFee === 0 ? 'text-green-600 font-black' : 'font-bold'}`}>
                        {deliveryFee === 0 ? 'FREE' : `ETB ${deliveryFee.toLocaleString()}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tax (15%)</span>
                      <span className="font-bold">ETB {(totalPrice * 0.15).toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="border-t border-dashed pt-4">
                    <div className="bg-gray-900 p-4 rounded-xl text-white flex justify-between items-center">
                      <span className="text-xs uppercase opacity-60">Grand Total</span>
                      <span className="text-xl font-black">ETB {(totalPrice + deliveryFee + (totalPrice * 0.15)).toLocaleString()}</span>
                    </div>
                  </div>
                  
                  {!showCheckout ? (
                    <Button onClick={() => setShowCheckout(true)} className="w-full bg-orange-500 h-14 rounded-xl font-black shadow-lg" size="lg">
                      Process Order <ChevronRight className="ml-2" />
                    </Button>
                  ) : (
                    <Button onClick={handleCheckout} className="w-full bg-green-600 h-14 rounded-xl font-black shadow-lg" size="lg" disabled={isSubmitting || !checkoutData.lat}>
                      {isSubmitting ? "Submitting..." : "Pay & Complete"}
                    </Button>
                  )}

                  {settings?.ecommerce_enable_free_delivery === 'true' && totalPrice >= parseFloat(settings?.ecommerce_free_delivery_threshold || "5000") && (
                    <div className="bg-green-50 text-green-700 p-3 rounded-lg text-[10px] font-bold text-center border border-green-200">
                        🎉 YOU QUALIFY FOR FREE DELIVERY!
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}