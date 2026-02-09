'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  MapPin, 
  Truck, 
  Package, 
  Route, 
  Zap, 
  Clock, 
  DollarSign,
  Users,
  Navigation,
  AlertCircle,
  CheckCircle,
  Play,
  Settings,
  RefreshCw
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import dynamic from 'next/dynamic';

// Dynamically import map component to avoid SSR issues
const RouteOptimizationMap = dynamic(() => import('@/components/route-optimization-map'), { 
  ssr: false,
  loading: () => <div className="h-96 flex items-center justify-center bg-gray-100 rounded-lg">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
      <p className="mt-2 text-gray-500">Loading map visualization...</p>
    </div>
  </div>
});

interface OrderCluster {
  clusterId: string;
  orders: any[];
  orderDetails: any[];
  optimizedSequence: any[];
  centroid: { lat: number, lng: number };
  totalDistance: number;
  estimatedDuration: number;
  driverCapacity: number;
  isOptimizable: boolean;
  sequenceDistance: number;
  estimatedCompletionTime: string;
}

interface RouteOptimizationData {
  clusters: OrderCluster[];
  unclusteredOrders: any[];
  efficiencyMetrics: {
    clusteringEfficiency: number;
    distanceEfficiency: number;
    timeEfficiency: number;
    overallScore: number;
    totalOrders: number;
    clusteredOrders: number;
    unclusteredOrders: number;
  };
  optimizationSummary: {
    totalDistanceSaved: number;
    estimatedTimeSaved: number;
    efficiencyScore: number;
    numberOfClusters: number;
    averageOrdersPerCluster: number;
  };
  parameters: {
    vehicleType: string;
    clusteringRadiusKm: number;
    maxOrdersPerVehicle: number;
  };
}

interface Driver {
  id: string | number;
  username: string;
  employee_id?: number;
  first_name: string;
  last_name: string;
  phone: string;
  vehicle_type: string;
  status: string;
  currentLocation?: {
    lat: number;
    lng: number;
  };
}

export default function RouteOptimizationDashboard() {
  const [optimizationData, setOptimizationData] = useState<RouteOptimizationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVehicleType, setSelectedVehicleType] = useState('car');
  const [clusteringRadius, setClusteringRadius] = useState('3');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDrivers, setSelectedDrivers] = useState<Record<string, string>>({});
  const { token } = useAuth();

  useEffect(() => {
    console.log('RouteOptimizationDashboard: Token sync', { hasToken: !!token });
    if (token) {
      fetchOptimizationData();
      fetchDrivers();
    }
  }, [token, selectedVehicleType, clusteringRadius]);

  const fetchOptimizationData = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching optimization data for', selectedVehicleType, clusteringRadius);
      const response = await fetch(
        `/api/ecommerce-manager/route-optimization?vehicleType=${selectedVehicleType}&radius=${clusteringRadius}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('Optimization data received:', { 
          clusterCount: data.clusters?.length, 
          unclusteredCount: data.unclusteredOrders?.length 
        });
        setOptimizationData(data);
      } else {
        toast({
          title: "Error",
          description: "Failed to load route optimization data",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching optimization data:', error);
      toast({
        title: "Error",
        description: "Failed to connect to optimization service",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const response = await fetch('/api/drivers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDrivers(data.drivers || []);
      } else {
        console.error('Failed to fetch drivers');
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
    }
  };

  const handleApplyOptimization = async (clusterId: string, driverId: string, orders: any[]) => {
    try {
      console.log('Dispatching cluster:', clusterId, 'to driver:', driverId, 'Orders:', orders);
      
      // Get available shops for assignment
      const shopsRes = await fetch('/api/shops?limit=0', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const shopsData = await shopsRes.json();
      const shops = Array.isArray(shopsData) ? shopsData : (shopsData.shops || []);
      
      if (shops.length === 0) {
        toast({
          title: "No Shops Available",
          description: "There are no shops available for dispatch.",
          variant: "destructive"
        });
        return;
      }
      
      // Auto-select first available shop
      const selectedShop = shops[0];
      
      const orderIds = orders.map(o => String(o.id || o.orderId || o.order_id));
      console.log('Sending order IDs:', orderIds);

      const response = await fetch('/api/ecommerce-manager/route-optimization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          clusterId,
          driverId,
          shopId: selectedShop.id,
          orderIds: orderIds,
          trackingNumberPrefix: 'MLK' // Milk-run prefix
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "Cluster Assigned Successfully",
          description: `Assigned ${result.ordersAssigned} orders to ${result.driverName} from ${selectedShop.name}`,
          className: "bg-green-600 text-white shadow-lg"
        });
        
        // Refresh the data
        fetchOptimizationData();
        fetchDrivers();
      } else {
        toast({
          title: "Assignment Failed",
          description: result.error || 'Failed to assign cluster to driver',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error applying optimization:', error);
      toast({
        title: "Error",
        description: "Failed to process cluster assignment",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Analyzing delivery routes...</p>
        </div>
      </div>
    );
  }

  if (!optimizationData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="bg-white/80 backdrop-blur">
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Data Available</h3>
              <p className="text-gray-500">Unable to load route optimization data.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <Route className="h-8 w-8 text-indigo-600" />
                Route Optimization Dashboard
              </h1>
              <p className="text-gray-600">
                Optimize delivery routes and consolidate orders for maximum efficiency
              </p>
            </div>
            <Button onClick={fetchOptimizationData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Analysis
            </Button>
          </div>
        </div>

        {/* Configuration Panel */}
        <Card className="mb-8 bg-white/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Optimization Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Vehicle Type</label>
                <Select value={selectedVehicleType} onValueChange={setSelectedVehicleType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="motorbike">Motorbike (3 orders)</SelectItem>
                    <SelectItem value="car">Car (5 orders)</SelectItem>
                    <SelectItem value="van">Van (10 orders)</SelectItem>
                    <SelectItem value="truck">Truck (20 orders)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Clustering Radius</label>
                <Select value={clusteringRadius} onValueChange={setClusteringRadius}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 km</SelectItem>
                    <SelectItem value="2">2 km</SelectItem>
                    <SelectItem value="3">3 km</SelectItem>
                    <SelectItem value="5">5 km</SelectItem>
                    <SelectItem value="10">10 km</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button onClick={fetchOptimizationData} className="w-full">
                  <Zap className="h-4 w-4 mr-2" />
                  Re-analyze Routes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Efficiency Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800">Efficiency Score</p>
                  <p className="text-3xl font-bold text-green-900">
                    {(optimizationData.efficiencyMetrics?.overallScore || 0).toFixed(0)}%
                  </p>
                </div>
                <Zap className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-xs text-green-700 mt-2">
                Overall route optimization effectiveness
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-cyan-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800">Distance Saved</p>
                  <p className="text-3xl font-bold text-blue-900">
                    {(optimizationData.optimizationSummary?.totalDistanceSaved || 0).toFixed(1)}km
                  </p>
                </div>
                <Navigation className="h-8 w-8 text-blue-600" />
              </div>
              <p className="text-xs text-blue-700 mt-2">
                Total kilometers optimized
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-orange-100 border-amber-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-800">Time Saved</p>
                  <p className="text-3xl font-bold text-amber-900">
                    {Math.round(optimizationData.optimizationSummary?.estimatedTimeSaved || 0)}min
                  </p>
                </div>
                <Clock className="h-8 w-8 text-amber-600" />
              </div>
              <p className="text-xs text-amber-700 mt-2">
                Estimated delivery time improvement
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-800">Waiting Dispatch</p>
                  <p className="text-3xl font-bold text-purple-900">
                    {(optimizationData.efficiencyMetrics?.unclusteredOrders || 0) + (optimizationData.efficiencyMetrics?.clusteredOrders || 0)}
                  </p>
                </div>
                <Package className="h-8 w-8 text-purple-600" />
              </div>
              <p className="text-xs text-purple-700 mt-2">
                Orders ready to be clustered/assigned
              </p>
              <div className="mt-2 text-[10px] text-purple-700 flex flex-wrap gap-1">
                {Object.entries((optimizationData as any).statusCounts || {}).map(([status, count]) => (
                  <span key={status} className="bg-purple-200/50 px-1.5 py-0.5 rounded">
                    {status}: {count as number}
                  </span>
                ))}
              </div>
              {(optimizationData as any).noGpsCount > 0 && (
                <p className="text-[9px] text-red-500 mt-1 font-medium italic">
                  * {(optimizationData as any).noGpsCount} orders missing GPS coordinates
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Map Visualization Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Route Visualization</h2>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-indigo-600" />
                <span className="text-xs text-gray-600">Main Depot</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-xs text-gray-600">Milk Run Path</span>
              </div>
            </div>
          </div>
          <Card className="bg-white/80 backdrop-blur">
            <CardContent className="p-4">
              <div className="h-96 rounded-lg overflow-hidden">
                <RouteOptimizationMap 
                  optimizationData={optimizationData} 
                  drivers={drivers} 
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Clustered Orders Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Optimized Delivery Clusters</h2>
            <Badge variant="outline" className="bg-white text-indigo-700 border-indigo-200">
              {optimizationData.clusters.length} Groups Identified
            </Badge>
          </div>
          
          {optimizationData.clusters.length === 0 ? (
            <Card className="bg-white/80 backdrop-blur rounded-2xl shadow-sm border-gray-100">
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-gray-200">
                  <Package className="h-8 w-8 text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">No Clusters Formed</h3>
                <p className="text-gray-500 max-w-sm mx-auto">
                  Increase the clustering radius or check for pending orders with location data to see optimized routes.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {optimizationData.clusters.map((cluster, idx) => {
                const clusterColors = ['#6366f1', '#ef4444', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];
                const color = clusterColors[idx % clusterColors.length];
                const clusterDriverId = `driver-${cluster.clusterId}`;
                
                return (
                  <Card key={cluster.clusterId} className="bg-white/80 backdrop-blur overflow-hidden border-0 shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-300">
                    <div className="h-2 w-full" style={{ backgroundColor: color }} />
                    <CardHeader className="pb-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div 
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg"
                            style={{ backgroundColor: color }}
                          >
                            <Truck className="h-6 w-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-xl font-bold text-gray-900">
                                Route Cluster {idx + 1}
                              </CardTitle>
                              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100">
                                {cluster.orders.length} Deliveries
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3" /> Area Centroid: {cluster.centroid.lat.toFixed(3)}, {cluster.centroid.lng.toFixed(3)}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                          <div className="w-full sm:w-48">
                            <Select 
                              value={selectedDrivers[cluster.clusterId] || ''}
                              onValueChange={(val) => {
                                setSelectedDrivers(prev => ({
                                  ...prev,
                                  [cluster.clusterId]: val
                                }));
                              }}
                            >
                              <SelectTrigger className="bg-white border-gray-200">
                                <SelectValue placeholder="Select a Driver" />
                              </SelectTrigger>
                              <SelectContent>
                                {drivers.filter(d => d.status === 'available').map(driver => (
                                  <SelectItem key={driver.id} value={String(driver.id)}>
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-green-500" />
                                      <span>{driver.first_name} {driver.last_name}</span>
                                      <span className="text-xs text-gray-400">({driver.vehicle_type})</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button 
                            onClick={() => {
                              const driverId = selectedDrivers[cluster.clusterId];
                              if (!driverId) {
                                toast({
                                  title: "Selection Required",
                                  description: "Please select a driver for this cluster first.",
                                  variant: "destructive"
                                });
                                return;
                              }
                              handleApplyOptimization(cluster.clusterId, driverId, cluster.orders);
                            }}
                            className="w-full sm:w-auto shadow-md"
                            style={{ backgroundColor: color }}
                          >
                            <Play className="h-4 w-4 mr-2 fill-white" />
                            Dispatch Group
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        {/* Metrics Column */}
                        <div className="space-y-4">
                          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Route Metrics</h4>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-gray-600">
                                  <Navigation className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm">Total Distance</span>
                                </div>
                                <span className="text-sm font-bold text-gray-900">{cluster.totalDistance.toFixed(2)} km</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-gray-600">
                                  <MapPin className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm">Farthest Stop</span>
                                </div>
                                <span className="text-sm font-bold text-orange-600">
                                  {(cluster as any).maxDistanceFromDepot?.toFixed(2) || '0.00'} km
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-gray-600">
                                  <Clock className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm">Est. Time</span>
                                </div>
                                <span className="text-sm font-bold text-gray-900">{Math.round(cluster.estimatedDuration)} min</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-gray-600">
                                  <DollarSign className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm">Cluster Value</span>
                                </div>
                                <span className="text-sm font-bold text-green-600">ETB {cluster.orderDetails.reduce((sum, o) => sum + (o.totalAmount || 0), 0).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>

                          <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3">Stop Order</h4>
                            <div className="space-y-4 relative">
                              <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-indigo-100 border-dashed border-l" />
                              <div className="flex items-center gap-3 relative z-10">
                                <div className="w-6 h-6 rounded-full bg-white border-2 border-indigo-600 flex items-center justify-center overflow-hidden shadow-sm">
                                  <img src="/logo.png" alt="Shop" className="w-full h-full object-contain p-0.5" />
                                </div>
                                <span className="text-xs font-bold text-gray-500">Shop Location (Start)</span>
                              </div>
                              {cluster.optimizedSequence.map((step, idx) => (
                                <div key={step.orderId} className="flex items-center gap-3 relative z-10">
                                  <div 
                                    className="w-6 h-6 rounded-full text-white flex items-center justify-center text-[10px] font-bold shadow-md"
                                    style={{ backgroundColor: color }}
                                  >
                                    {idx + 1}
                                  </div>
                                  <span className="text-xs font-semibold text-gray-700 truncate max-w-[150px]">{step.customerName}</span>
                                </div>
                              ))}
                              <div className="flex items-center gap-3 relative z-10">
                                <div className="w-6 h-6 rounded-full bg-white border-2 border-indigo-600 flex items-center justify-center overflow-hidden shadow-sm">
                                  <img src="/logo.png" alt="Shop" className="w-full h-full object-contain p-0.5" />
                                </div>
                                <span className="text-xs font-bold text-gray-500">Shop Location (End)</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Order Cards grid */}
                        <div className="lg:col-span-3">
                          <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                             <Package className="h-4 w-4 text-gray-400" />
                             Order Breakdowns
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {cluster.orderDetails.map((order) => (
                              <div key={order.id} className="group p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all duration-200">
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                                      <Users className="h-5 w-5 text-gray-400 group-hover:text-indigo-600" />
                                    </div>
                                    <div>
                                      <h5 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{order.customerName}</h5>
                                      <p className="text-[10px] font-mono text-gray-400">ORDER #{order.id.slice(0, 8).toUpperCase()}</p>
                                    </div>
                                  </div>
                                  <Badge variant="outline" className="text-[10px] rounded-lg">
                                    {order.status}
                                  </Badge>
                                </div>
                                <div className="flex items-start gap-2 mb-3">
                                  <MapPin className="h-4 w-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                                  <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{order.deliveryAddress}</p>
                                </div>
                                <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                                  <span className="text-xs text-gray-400 flex items-center gap-1">
                                    <RefreshCw className="h-3 w-3" /> Updated {new Date(order.createdAt).toLocaleDateString()}
                                  </span>
                                  <span className="text-sm font-bold text-green-600">ETB {order.totalAmount.toLocaleString()}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>


        {/* Unclustered Orders */}
        {optimizationData.unclusteredOrders.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Individual Orders ({optimizationData.unclusteredOrders.length})
            </h2>
            <Card className="bg-white/80 backdrop-blur">
              <CardContent>
                <div className="grid gap-4">
                  {optimizationData.unclusteredOrders.map((order) => (
                    <div key={order.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{order.customerName}</h3>
                          <p className="text-sm text-gray-600 mt-1">{order.deliveryAddress}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline">{order.status}</Badge>
                            <span className="text-sm font-medium">ETB {order.totalAmount.toLocaleString()}</span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          <Truck className="h-4 w-4 mr-2" />
                          Assign Driver
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}