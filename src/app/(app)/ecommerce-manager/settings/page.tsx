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
  const [capacitySettings, setCapacitySettings] = useState({
    motorbike: "3",
    car: "5",
    van: "10",
    truck: "20"
  });
  const [shopCoords, setShopCoords] = useState({
    lat: "",
    lng: "",
    address: ""
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingLogistics, setIsSavingLogistics] = useState(false);
  const [isSavingCapacity, setIsSavingCapacity] = useState(false);
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
        setCapacitySettings({
          motorbike: data.capacity_limit_motorbike || "3",
          car: data.capacity_limit_car || "5",
          van: data.capacity_limit_van || "10",
          truck: data.capacity_limit_truck || "20"
        });

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
      console.error('Error fetching settings:', error);
      toast({ title: "Error", description: "Failed to load config", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePrimaryShop = async () => {
    if (!primaryShopId) return;
    try {
      setIsSaving(true);
      const res = await fetch('/api/ecommerce-manager/settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ key: 'ecommerce_primary_shop_id', value: primaryShopId })
      });
      if (res.ok) {
        toast({ title: "Updated", description: "Primary shop saved", className: "bg-green-600 text-white" });
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
      const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
      await Promise.all([
        fetch('/api/ecommerce-manager/settings', { method: 'POST', headers: authHeaders, body: JSON.stringify({ key: 'ecommerce_standard_rate', value: logisticsSettings.standardRate }) }),
        fetch('/api/ecommerce-manager/settings', { method: 'POST', headers: authHeaders, body: JSON.stringify({ key: 'ecommerce_express_multiplier', value: logisticsSettings.expressMultiplier }) }),
        fetch('/api/ecommerce-manager/settings', { method: 'POST', headers: authHeaders, body: JSON.stringify({ key: 'ecommerce_free_delivery_threshold', value: logisticsSettings.freeThreshold }) }),
        fetch('/api/ecommerce-manager/settings', { method: 'POST', headers: authHeaders, body: JSON.stringify({ key: 'ecommerce_enable_free_delivery', value: logisticsSettings.enableFreeDelivery.toString() }) })
      ]);
      toast({ title: "Updated", description: "Logistics pricing updated", className: "bg-green-600 text-white" });
    } catch (error) {
      toast({ title: "Error", description: "Save failed", variant: "destructive" });
    } finally {
      setIsSavingLogistics(false);
    }
  };

  const handleSaveCapacity = async () => {
    try {
      setIsSavingCapacity(true);
      const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
      await Promise.all([
        fetch('/api/ecommerce-manager/settings', { method: 'POST', headers: authHeaders, body: JSON.stringify({ key: 'capacity_limit_motorbike', value: capacitySettings.motorbike }) }),
        fetch('/api/ecommerce-manager/settings', { method: 'POST', headers: authHeaders, body: JSON.stringify({ key: 'capacity_limit_car', value: capacitySettings.car }) }),
        fetch('/api/ecommerce-manager/settings', { method: 'POST', headers: authHeaders, body: JSON.stringify({ key: 'capacity_limit_van', value: capacitySettings.van }) }),
        fetch('/api/ecommerce-manager/settings', { method: 'POST', headers: authHeaders, body: JSON.stringify({ key: 'capacity_limit_truck', value: capacitySettings.truck }) })
      ]);
      toast({ title: "Updated", description: "Capacity limits saved", className: "bg-green-600 text-white" });
    } catch (error) {
      toast({ title: "Error", description: "Save failed", variant: "destructive" });
    } finally {
      setIsSavingCapacity(false);
    }
  };

  const handleSaveShopLocation = async () => {
    if (!primaryShopId) return;
    try {
      setIsSavingLocation(true);
      const res = await fetch(`/api/shops?id=${primaryShopId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          latitude: parseFloat(shopCoords.lat),
          longitude: parseFloat(shopCoords.lng),
          exactLocation: shopCoords.address
        })
      });
      if (res.ok) {
        toast({ title: "Updated", description: "Shop location saved", className: "bg-green-600 text-white" });
        fetchData();
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
        toast({ title: "GPS Captured", description: "Shop coordinates updated." });
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
          <p className="text-muted-foreground mt-1">Global platform & logistics settings</p>
        </div>
        <Button onClick={fetchData} variant="outline" disabled={isLoading}>
          <RefreshCcw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card className="border-indigo-100 shadow-sm">
            <CardHeader className="bg-indigo-50/50">
              <CardTitle className="flex items-center gap-2 text-indigo-900">
                <Globe className="h-5 w-5 text-indigo-600" />
                Store Connectivity
              </CardTitle>
              <CardDescription>Primary shop for inventory & location reference</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label>Primary eCommerce Shop</Label>
                <div className="flex gap-2">
                  <Select value={primaryShopId} onValueChange={setPrimaryShopId}>
                    <SelectTrigger className="h-11 border-indigo-200">
                      <SelectValue placeholder="Select shop" />
                    </SelectTrigger>
                    <SelectContent>
                      {shops.map((shop) => (
                        <SelectItem key={shop.id} value={shop.id.toString()}>{shop.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleSavePrimaryShop} disabled={isSaving || !primaryShopId} className="bg-indigo-600">
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {primaryShopId && (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-sm flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-rose-500" /> Shop GPS
                    </h3>
                    <Button variant="ghost" size="sm" onClick={getCurrentLocation}>Get Multi-Order Coords</Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input placeholder="Lat" value={shopCoords.lat} onChange={(e) => setShopCoords({...shopCoords, lat: e.target.value})} />
                    <Input placeholder="Lng" value={shopCoords.lng} onChange={(e) => setShopCoords({...shopCoords, lng: e.target.value})} />
                  </div>
                  <Input className="mt-2" placeholder="Address" value={shopCoords.address} onChange={(e) => setShopCoords({...shopCoords, address: e.target.value})} />
                  <Button className="w-full mt-3 bg-slate-800" onClick={handleSaveShopLocation} disabled={isSavingLocation}>Save Location</Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <p className="text-xs text-amber-800">Role Restriction: Some core data can only be modified by Factory Admins.</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Logistics Section */}
          <Card className="border-orange-100 shadow-sm border-2">
            <CardHeader className="bg-orange-50/50">
              <CardTitle className="flex items-center gap-2 text-orange-900">
                <Truck className="h-5 w-5 text-orange-600" /> Logistics Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Standard Rate (ETB/KM)</Label>
                  <Input type="number" value={logisticsSettings.standardRate} onChange={(e) => setLogisticsSettings({...logisticsSettings, standardRate: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Express Mult.</Label>
                  <Input type="number" step="0.1" value={logisticsSettings.expressMultiplier} onChange={(e) => setLogisticsSettings({...logisticsSettings, expressMultiplier: e.target.value})} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>Free Delivery Threshold</Label>
                <Switch checked={logisticsSettings.enableFreeDelivery} onCheckedChange={(c) => setLogisticsSettings({...logisticsSettings, enableFreeDelivery: c})} />
              </div>
              {logisticsSettings.enableFreeDelivery && (
                <Input type="number" value={logisticsSettings.freeThreshold} onChange={(e) => setLogisticsSettings({...logisticsSettings, freeThreshold: e.target.value})} />
              )}
              <Button onClick={handleSaveLogistics} disabled={isSavingLogistics} className="w-full bg-orange-600 h-12 font-bold">Update Logistics</Button>
            </CardContent>
          </Card>

          {/* Capacity Section */}
          <Card className="border-indigo-100 shadow-sm border-2">
            <CardHeader className="bg-indigo-50/50">
              <CardTitle className="flex items-center gap-2 text-indigo-900">
                <Truck className="h-5 w-5 text-indigo-600" /> Delivery Capacity
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Motorbike</Label><Input type="number" value={capacitySettings.motorbike} onChange={(e) => setCapacitySettings({...capacitySettings, motorbike: e.target.value})} /></div>
                <div><Label>Car</Label><Input type="number" value={capacitySettings.car} onChange={(e) => setCapacitySettings({...capacitySettings, car: e.target.value})} /></div>
                <div><Label>Van</Label><Input type="number" value={capacitySettings.van} onChange={(e) => setCapacitySettings({...capacitySettings, van: e.target.value})} /></div>
                <div><Label>Truck</Label><Input type="number" value={capacitySettings.truck} onChange={(e) => setCapacitySettings({...capacitySettings, truck: e.target.value})} /></div>
              </div>
              <Button onClick={handleSaveCapacity} disabled={isSavingCapacity} className="w-full bg-indigo-600 h-12 font-bold">Update Capacity Limits</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
