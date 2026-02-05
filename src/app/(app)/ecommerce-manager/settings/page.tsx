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
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Settings, 
  Building2, 
  Globe, 
  Save, 
  RefreshCcw,
  CheckCircle2,
  Truck,
  MapPin,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

export default function EcommerceSettingsPage() {
  const [shops, setShops] = useState<any[]>([]);
  const [primaryShopId, setPrimaryShopId] = useState<string>("");
  const [logisticsSettings, setLogisticsSettings] = useState({
    standardRate: "10",
    expressMultiplier: "1.5",
    freeThreshold: "5000",
    enableFreeDelivery: false
  });
  const [shopCoords, setShopCoords] = useState({
    lat: "",
    lng: "",
    address: ""
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingLogistics, setIsSavingLogistics] = useState(false);
  const [isSavingLocation, setIsSavingLocation] = useState(false);
  
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
      
      const [shopsRes, settingsRes] = await Promise.all([
        fetch('/api/shops?limit=0', { headers: authHeaders }),
        fetch('/api/ecommerce-manager/settings', { headers: authHeaders })
      ]);

      let allShops = [];
      if (shopsRes.ok) {
        const data = await shopsRes.json();
        allShops = Array.isArray(data) ? data : (data.shops || []);
        setShops(allShops);
      }

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        const pId = data.ecommerce_primary_shop_id || "";
        setPrimaryShopId(pId);
        setLogisticsSettings({
          standardRate: data.ecommerce_standard_rate || "10",
          expressMultiplier: data.ecommerce_express_multiplier || "1.5",
          freeThreshold: data.ecommerce_free_delivery_threshold || "5000",
          enableFreeDelivery: data.ecommerce_enable_free_delivery === 'true'
        });

        // If primary shop is selected, set its coords
        if (pId) {
          const mainShop = allShops.find((s: any) => s.id.toString() === pId);
          if (mainShop) {
            setShopCoords({
              lat: mainShop.latitude?.toString() || "",
              lng: mainShop.longitude?.toString() || "",
              address: mainShop.exactLocation || ""
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching settings data:', error);
      toast({
        title: "Error",
        description: "Failed to load configuration",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePrimaryShop = async () => {
    if (!primaryShopId) {
      toast({
        title: "Selection Required",
        description: "Please select a primary shop",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch('/api/ecommerce-manager/settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          key: 'ecommerce_primary_shop_id',
          value: primaryShopId
        })
      });

      if (res.ok) {
        toast({
          title: "Config Updated",
          description: "eCommerce primary shop updated",
          className: "bg-green-600 text-white"
        });
        
        // Also update coords UI
        const mainShop = shops.find((s: any) => s.id.toString() === primaryShopId);
        if (mainShop) {
          setShopCoords({
            lat: mainShop.latitude?.toString() || "",
            lng: mainShop.longitude?.toString() || "",
            address: mainShop.exactLocation || ""
          });
        }
      }
    } catch (error) {
      toast({ title: "Error", description: "Save failed", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveLogistics = async () => {
    try {
      setIsSavingLogistics(true);
      const authHeaders: Record<string, string> = { 
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };

      await Promise.all([
        fetch('/api/ecommerce-manager/settings', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ key: 'ecommerce_standard_rate', value: logisticsSettings.standardRate })
        }),
        fetch('/api/ecommerce-manager/settings', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ key: 'ecommerce_express_multiplier', value: logisticsSettings.expressMultiplier })
        }),
        fetch('/api/ecommerce-manager/settings', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ key: 'ecommerce_free_delivery_threshold', value: logisticsSettings.freeThreshold })
        }),
        fetch('/api/ecommerce-manager/settings', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ key: 'ecommerce_enable_free_delivery', value: logisticsSettings.enableFreeDelivery })
        })
      ]);

      toast({
        title: "Logistics Updated",
        description: "Delivery fee settings saved successfully",
        className: "bg-green-600 text-white"
      });
    } catch (error) {
      toast({ title: "Error", description: "Save failed", variant: "destructive" });
    } finally {
      setIsSavingLogistics(false);
    }
  };

  const handleSaveShopLocation = async () => {
    if (!primaryShopId) return;

    try {
      setIsSavingLocation(true);
      const res = await fetch(`/api/shops?id=${primaryShopId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          latitude: parseFloat(shopCoords.lat),
          longitude: parseFloat(shopCoords.lng),
          exactLocation: shopCoords.address
        })
      });

      if (res.ok) {
        toast({
          title: "Location Updated",
          description: "Shop coordinates saved successfully",
          className: "bg-green-600 text-white"
        });
        fetchData(); // Refresh shops data
      }
    } catch (error) {
      toast({ title: "Error", description: "Save failed", variant: "destructive" });
    } finally {
      setIsSavingLocation(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setShopCoords(prev => ({
          ...prev,
          lat: position.coords.latitude.toFixed(6),
          lng: position.coords.longitude.toFixed(6)
        }));
        toast({ title: "Location Captured", description: "Successfully updated shop coordinates from your GPS." });
      }, (error) => {
        const errorMsg = error.code === 1 
          ? "Permission denied. Please enable location access in your browser settings for this site."
          : "Could not retrieve GPS coordinates. Please enter them manually.";
        
        toast({ 
          title: "Location Access Blocked", 
          description: errorMsg, 
          variant: "destructive" 
        });
      });
    } else {
      toast({ 
        title: "Not Supported", 
        description: "Your browser does not support geolocation.", 
        variant: "destructive" 
      });
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 text-indigo-900">
            <Settings className="h-8 w-8 text-indigo-500" />
            Website Configuration
          </h1>
          <p className="text-muted-foreground mt-1">
            Global settings for the public-facing eCommerce platform & logistics
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" disabled={isLoading}>
          <RefreshCcw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          {/* Store Connectivity */}
          <Card className="border-indigo-100 shadow-sm">
            <CardHeader className="bg-indigo-50/50">
              <CardTitle className="flex items-center gap-2 text-indigo-900">
                <Globe className="h-5 w-5 text-indigo-600" />
                Store Connectivity
              </CardTitle>
              <CardDescription>
                Primary shop for inventory & location reference
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="primary-shop">Primary eCommerce Shop</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select 
                      value={primaryShopId} 
                      onValueChange={(val) => {
                        setPrimaryShopId(val);
                        const selectedShop = shops.find((s: any) => s.id.toString() === val);
                        if (selectedShop) {
                          setShopCoords({
                            lat: selectedShop.latitude?.toString() || "",
                            lng: selectedShop.longitude?.toString() || "",
                            address: selectedShop.exactLocation || ""
                          });
                        }
                      }}
                    >
                      <SelectTrigger id="primary-shop" className="h-11 border-indigo-200">
                        <SelectValue placeholder="Select shop" />
                      </SelectTrigger>
                      <SelectContent>
                        {shops.map((shop) => (
                          <SelectItem key={shop.id} value={shop.id.toString()}>
                            {shop.name} ({shop.city})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={handleSavePrimaryShop} 
                    disabled={isSaving || !primaryShopId}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {isSaving ? "Saving..." : <Save className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {primaryShopId && (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-sm flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-rose-500" />
                      Shop Coordinates
                    </h3>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={getCurrentLocation}>
                      Get Current Location
                    </Button>
                  </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Latitude</Label>
                        <Input 
                          value={shopCoords.lat} 
                          onChange={(e) => setShopCoords({...shopCoords, lat: e.target.value})}
                          placeholder="e.g. 9.0227"
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Longitude</Label>
                        <Input 
                          value={shopCoords.lng} 
                          onChange={(e) => setShopCoords({...shopCoords, lng: e.target.value})}
                          placeholder="e.g. 38.7460"
                          className="h-9 text-sm"
                        />
                      </div>
                      </div>
                      <div className="space-y-1 mt-3">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Exact Address / Location</Label>
                        <div className="flex gap-2">
                          <Input 
                            value={shopCoords.address} 
                            onChange={(e) => setShopCoords({...shopCoords, address: e.target.value})}
                            placeholder="e.g. Merkato, Somale Tera"
                            className="h-9 text-sm"
                          />
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-9 whitespace-nowrap bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 border-indigo-200"
                            onClick={async () => {
                              const input = shopCoords.address.trim();
                              if (!input) {
                                toast({ title: "Input Required", description: "Enter an address or 'Lat, Lng' coordinates.", variant: "destructive" });
                                return;
                              }

                              // Check if input is "Lat, Lng" (e.g. "9.0104, 38.7474")
                              const coordPattern = /^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/;
                              const match = input.match(coordPattern);

                              if (match) {
                                // Direct coordinate input
                                const lat = parseFloat(match[1]);
                                const lng = parseFloat(match[3]);
                                
                                if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                                  setShopCoords(prev => ({
                                    ...prev,
                                    lat: lat.toFixed(6),
                                    lng: lng.toFixed(6)
                                  }));
                                  toast({ 
                                    title: "Coordinates Detected", 
                                    description: "Successfully parsed latitude and longitude directly from input.", 
                                    className: "bg-green-600 text-white" 
                                  });
                                  return;
                                }
                              }

                              // Standard Address Lookup
                              try {
                                toast({ title: "Searching...", description: "Looking up location on OpenStreetMap..." });
                                
                                // Clean up input for search (remove existing coords if mixed, or just use as is)
                                // If it doesn't contain "Addis Ababa", append it for better local results, unless it looks like a full address
                                const searchQuery = input.toLowerCase().includes('addis ababa') ? input : `${input}, Addis Ababa`;
                                
                                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
                                
                                if (res.ok) {
                                  const data = await res.json();
                                  if (data && data.length > 0) {
                                    setShopCoords(prev => ({
                                      ...prev,
                                      lat: parseFloat(data[0].lat).toFixed(6),
                                      lng: parseFloat(data[0].lon).toFixed(6)
                                    }));
                                    toast({ title: "Location Found!", description: `Found: ${data[0].display_name.substring(0, 40)}...`, className: "bg-green-600 text-white" });
                                  } else {
                                    toast({ title: "Not Found", description: "Could not find coordinates. Try a more specific address or enter 'Lat, Lng' directly.", variant: "destructive" });
                                  }
                                } else {
                                    throw new Error("API Error");
                                }
                              } catch (e) {
                                toast({ title: "Lookup Failed", description: "Connection error or service unavailable.", variant: "destructive" });
                              }
                            }}
                          >
                            <MapPin className="h-4 w-4 mr-1" /> Lookup / Parse
                          </Button>
                        </div>
                      </div>
                    <Button 
                      className="w-full mt-4 h-9 bg-slate-800 hover:bg-slate-900" 
                      onClick={handleSaveShopLocation}
                      disabled={isSavingLocation}
                    >
                    {isSavingLocation ? "Saving..." : "Save Shop Location"}
                  </Button>
                  <p className="text-[10px] text-muted-foreground mt-2 italic text-center">
                    These coordinates are used as the starting point for delivery distance calculations.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Access Banner */}
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-4 shadow-sm">
            <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0" />
            <div className="space-y-1">
              <h4 className="font-bold text-amber-900 text-sm italic underline">Role Restriction Active</h4>
              <p className="text-xs text-amber-800 leading-relaxed">
                As an eCommerce Manager, you can configure website logistics but cannot modify core shop data like 
                Profit Margins or ownership. Contact a Factory Administrator for structural changes.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Logistics Section */}
          <Card className="border-orange-100 shadow-sm border-2">
            <CardHeader className="bg-orange-50/50">
              <CardTitle className="flex items-center gap-2 text-orange-900">
                <Truck className="h-5 w-5 text-orange-600" />
                Logistics & Delivery Fees
              </CardTitle>
              <CardDescription>
                Control how transport costs are calculated for customers
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold">Standard Rate (ETB/KM)</Label>
                    <Input 
                      type="number" 
                      value={logisticsSettings.standardRate}
                      onChange={(e) => setLogisticsSettings({...logisticsSettings, standardRate: e.target.value})}
                      className="h-12 border-orange-200 focus-visible:ring-orange-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-bold">Express Multiplier</Label>
                    <Input 
                      type="number" 
                      step="0.1"
                      value={logisticsSettings.expressMultiplier}
                      onChange={(e) => setLogisticsSettings({...logisticsSettings, expressMultiplier: e.target.value})}
                      className="h-12 border-orange-200 focus-visible:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-orange-100">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-bold flex flex-col gap-1">
                      <span>Enable Free Delivery</span>
                      <span className="text-[10px] font-normal text-muted-foreground">Automatically waive fees for large orders</span>
                    </Label>
                    <Switch
                      checked={logisticsSettings.enableFreeDelivery}
                      onCheckedChange={(checked) => setLogisticsSettings({...logisticsSettings, enableFreeDelivery: checked})}
                    />
                  </div>

                  {logisticsSettings.enableFreeDelivery && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                      <Label className="text-sm font-bold">Free Delivery Threshold (ETB)</Label>
                      <Input 
                        type="number" 
                        value={logisticsSettings.freeThreshold}
                        onChange={(e) => setLogisticsSettings({...logisticsSettings, freeThreshold: e.target.value})}
                        className="h-12 border-orange-200 focus-visible:ring-orange-500"
                        placeholder="e.g. 5000"
                      />
                      <p className="text-[11px] text-muted-foreground">Orders above this amount will have free shipping regardless of distance.</p>
                    </div>
                  )}
                </div>

                <Button 
                  onClick={handleSaveLogistics} 
                  disabled={isSavingLogistics}
                  className="w-full bg-orange-600 hover:bg-orange-700 h-14 text-lg font-black shadow-lg shadow-orange-600/20"
                >
                  {isSavingLogistics ? "Saving Logistics..." : <><Save className="mr-2 h-5 w-5" /> Update Pricing Engine</>}
                </Button>
              </div>

              <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                <p className="text-xs font-bold text-orange-800 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Calculation Logic
                </p>
                <div className="text-[11px] text-orange-700 space-y-1">
                  <p>• <strong>Distance:</strong> Straight-line KM between Shop & Customer.</p>
                  <p>• <strong>Standard:</strong> Distance × Standard Rate.</p>
                  <p>• <strong>Express:</strong> (Distance × Standard Rate) × Multiplier.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
