'use client'

import { useState, useEffect } from 'react'
import { calculateDistance } from '@/lib/utils'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { 
  Package, 
  Truck, 
  MapPin, 
  Navigation, 
  User, 
  Phone, 
  Calendar,
  DollarSign,
  Hash,
  Clock,
  Info
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type Order = {
  id: string
  order_id?: string
  customer_name?: string
  customerName?: string
  customer_phone?: string
  customerPhone?: string
  total_amount?: number
  totalAmount?: number
  items_count?: number
  orderItems?: any[]
  shipping_address?: string
  deliveryAddress?: string
  status: string
  created_at?: string
  createdAt?: string
  transportation_cost?: number
  transportationCost?: number
  latitude?: number
  longitude?: number
}

type Driver = {
  id: string | number
  username: string
  employee_id?: number
  first_name: string
  last_name: string
  phone: string
  vehicle_type: string
  status?: string
}

export default function DispatchPreparation() {
  const [orders, setOrders] = useState<Order[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [dispatchData, setDispatchData] = useState({
    driverId: '',
    shopId: '',
    estimatedDeliveryTime: '',
    trackingNumber: '',
    transportCost: 0,
    notes: ''
  })
  
  const [shops, setShops] = useState<any[]>([])
  
  const { token } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    fetchOrders()
    fetchDrivers()
    fetchShops()
  }, [token])

  const fetchShops = async () => {
    try {
      const response = await fetch('/api/shops', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      if (response.ok) {
        const data = await response.json()
        // If data is an array, use it directly. If it's a paginated object, use data.shops.
        setShops(Array.isArray(data) ? data : (data.shops || []))
      }
    } catch (error) {
      console.error('Error fetching shops:', error)
    }
  }

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/ecommerce-manager/orders?status=confirmed,ready_for_dispatch', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      
      if (response.ok) {
        const data = await response.json()
        // Map backend fields to frontend types if needed
        const mappedOrders = (data.orders || []).map((o: any) => ({
          ...o,
          transportation_cost: o.transportationCost || o.transportation_cost
        }))
        setOrders(mappedOrders)
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDrivers = async () => {
    try {
      console.log('[DISPATCH] Fetching drivers from API...');
      const response = await fetch('/api/drivers', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      
      console.log('[DISPATCH] API Response status:', response.status, response.ok);
      
      if (response.ok) {
        const data = await response.json()
        console.log('[DISPATCH] API returned data:', data);
        console.log('[DISPATCH] Drivers array:', data.drivers);
        console.log('[DISPATCH] Number of drivers:', data.drivers?.length || 0);
        
        // Log each driver's details
        if (data.drivers) {
          data.drivers.forEach((driver: any, index: number) => {
            console.log(`[DISPATCH] Driver ${index + 1}:`, {
              id: driver.id,
              first_name: driver.first_name,
              last_name: driver.last_name,
              status: driver.status,
              vehicle_type: driver.vehicle_type
            });
          });
          
          const availableDrivers = data.drivers.filter((d: any) => d.status === 'available');
          console.log(`[DISPATCH] Available drivers: ${availableDrivers.length} out of ${data.drivers.length}`);
          console.log('[DISPATCH] Available driver IDs:', availableDrivers.map((d: any) => d.id));
        }
        
        setDrivers(data.drivers || [])
      } else {
        console.error('[DISPATCH] API returned error status:', response.status);
        const errorText = await response.text();
        console.error('[DISPATCH] Error response:', errorText);
      }
    } catch (error) {
      console.error('[DISPATCH] Error fetching drivers:', error)
    }
  }

  const generateTrackingNumber = () => {
    const random = Math.floor(100000 + Math.random() * 900000); // 6 digits
    return `TRX-${random}`;
  }

  const calculateTransportCost = (order: Order & { transportation_cost?: number }) => {
    // Detailed logic: Use the pre-calculated transportation cost from the order (GPS based)
    if (order.transportation_cost && order.transportation_cost > 0) {
      return order.transportation_cost
    }
    
    const baseCost = 100 // ETB
    let distanceCost = 0
    
    if (order.latitude && order.longitude) {
      // Assume factory is at 9.033, 38.750 (Addis Ababa center)
      const FACTORY_LAT = 9.033 
      const FACTORY_LNG = 38.750
      const distance = calculateDistance(FACTORY_LAT, FACTORY_LNG, order.latitude, order.longitude)
      distanceCost = Math.round(distance * 15) // 15 ETB per km
    } else {
      // Fallback to item count if GPS not available
      const perItemCost = 50 // ETB per item
      const itemsCount = order.items_count || order.orderItems?.length || 0
      distanceCost = itemsCount * perItemCost
    }
    
    return baseCost + distanceCost
  }

  const handleOrderSelect = (order: Order) => {
    setSelectedOrder(order)
    const trackingNumber = generateTrackingNumber()
    const transportCost = order.transportationCost || order.transportation_cost || calculateTransportCost(order)
    
    setDispatchData({
      driverId: '',
      shopId: '',
      estimatedDeliveryTime: '',
      trackingNumber,
      transportCost,
      notes: ''
    })
  }

  const handleAssignDriver = async () => {
    if (!selectedOrder || !dispatchData.driverId || !dispatchData.shopId || !dispatchData.trackingNumber) {
      toast({
        title: 'Error',
        description: 'Please select an order, driver, shop, and ensure a tracking number is generated',
        variant: 'destructive'
      })
      return
    }

    try {
      const requestBody = {
        orderId: selectedOrder.id,
        driverId: dispatchData.driverId,
        shopId: dispatchData.shopId,
        trackingNumber: dispatchData.trackingNumber,
        estimatedDeliveryTime: dispatchData.estimatedDeliveryTime,
        transportCost: dispatchData.transportCost,
        notes: dispatchData.notes
      };
      
      console.log('[FRONTEND] Sending dispatch request:', requestBody);
      console.log('[FRONTEND] Validation:');
      console.log('  orderId:', requestBody.orderId, '(valid:', !!requestBody.orderId, ')');
      console.log('  driverId:', requestBody.driverId, '(valid:', !!requestBody.driverId, ')');
      console.log('  shopId:', requestBody.shopId, '(valid:', !!requestBody.shopId, ')');
      console.log('  trackingNumber:', requestBody.trackingNumber, '(valid:', !!requestBody.trackingNumber, ')');
      
      const response = await fetch('/api/ecommerce/dispatch/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Driver assigned successfully!'
        })
        // Refresh orders
        fetchOrders()
        setSelectedOrder(null)
        setDispatchData({
          driverId: '',
          shopId: '',
          estimatedDeliveryTime: '',
          trackingNumber: '',
          transportCost: 0,
          notes: ''
        })
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to assign driver',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to assign driver',
        variant: 'destructive'
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dispatch data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🚚</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Dispatch Preparation</h1>
          <p className="text-gray-600">Assign drivers and prepare orders for delivery</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Orders List */}
          <div className="lg:col-span-1">
            <Card className="bg-white/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Orders Ready for Dispatch ({orders.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {orders.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No orders ready for dispatch</p>
                  ) : (
                    orders.map((order) => (
                      <div 
                        key={order.id}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          selectedOrder?.id === order.id 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        onClick={() => handleOrderSelect(order)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium text-gray-800">{order.order_id || order.id}</h3>
                          <Badge variant="secondary">{order.status}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">{order.customer_name || order.customerName}</p>
                        <p className="text-sm text-gray-500">{order.items_count || order.orderItems?.length || 0} items • ETB {(order.total_amount || order.totalAmount || 0).toLocaleString()}</p>
                        <p className="text-xs text-gray-400 mt-1">{order.created_at || order.createdAt}</p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Dispatch Form */}
          <div className="lg:col-span-2">
            <Card className="bg-white/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  {selectedOrder ? 'Prepare Dispatch' : 'Select an Order'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedOrder ? (
                  <div className="space-y-6">
                    {/* Order Details */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-medium text-gray-800 mb-3">Order Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Order ID:</span>
                          <div className="font-medium">{selectedOrder.order_id || selectedOrder.id}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Customer:</span>
                          <div className="font-medium">{selectedOrder.customer_name || selectedOrder.customerName}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Phone:</span>
                          <div className="font-medium">{selectedOrder.customer_phone || selectedOrder.customerPhone}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Items:</span>
                          <div className="font-medium">{selectedOrder.items_count || selectedOrder.orderItems?.length || 0} items</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Amount:</span>
                           <div className="font-medium">ETB {(selectedOrder.total_amount || selectedOrder.totalAmount || 0).toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Address:</span>
                          <div className="font-medium text-sm">{selectedOrder.shipping_address || selectedOrder.deliveryAddress}</div>
                        </div>
                      </div>
                    </div>

                    {/* Dispatch Form */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="shop">Select Dispatch Shop *</Label>
                        <Select value={dispatchData.shopId} onValueChange={(value) => setDispatchData({...dispatchData, shopId: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Which shop will send this?" />
                          </SelectTrigger>
                          <SelectContent>
                            {shops.map((shop) => (
                              <SelectItem key={shop.id} value={shop.id.toString()}>
                                <div className="flex flex-col">
                                  <div className="font-medium">{shop.name}</div>
                                  <div className="text-xs text-gray-500">{shop.address}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Info className="h-3 w-3" />
                          Inventory will be reduced from this shop
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="driver">Select Driver *</Label>
                        <Select value={dispatchData.driverId} onValueChange={(value) => setDispatchData({...dispatchData, driverId: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Assign a driver" />
                          </SelectTrigger>
                          <SelectContent>
                            {(() => {
                              const availableDrivers = drivers.filter(d => d.status === 'available');
                              console.log('[DISPATCH] Rendering driver dropdown. Total drivers:', drivers.length, 'Available:', availableDrivers.length);
                              console.log('[DISPATCH] Available drivers:', availableDrivers);
                              return availableDrivers.map((driver) => (
                                <SelectItem key={driver.id} value={driver.id.toString()}>
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    <div>
                                      <div className="font-medium">{driver.first_name} {driver.last_name}</div>
                                      <div className="text-xs text-gray-500">{driver.vehicle_type}</div>
                                    </div>
                                  </div>
                                </SelectItem>
                              ));
                            })()}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="trackingNumber">Tracking Number</Label>
                        <div className="relative">
                          <Hash className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="trackingNumber"
                            value={dispatchData.trackingNumber}
                            onChange={(e) => setDispatchData({...dispatchData, trackingNumber: e.target.value})}
                            className="pl-10"
                            placeholder="Auto-generated"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="deliveryTime">Estimated Delivery Time</Label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="deliveryTime"
                            type="datetime-local"
                            value={dispatchData.estimatedDeliveryTime}
                            onChange={(e) => setDispatchData({...dispatchData, estimatedDeliveryTime: e.target.value})}
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="transportCost">Transport Cost (ETB)</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="transportCost"
                            type="number"
                            value={dispatchData.transportCost}
                            onChange={(e) => setDispatchData({...dispatchData, transportCost: parseFloat(e.target.value) || 0})}
                            className="pl-10"
                            placeholder="Auto-calculated"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="notes">Delivery Notes</Label>
                        <Textarea
                          id="notes"
                          value={dispatchData.notes}
                          onChange={(e) => setDispatchData({...dispatchData, notes: e.target.value})}
                          placeholder="Special delivery instructions..."
                          rows={3}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-4">
                      <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleAssignDriver}
                        disabled={!dispatchData.driverId || !dispatchData.shopId}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Assign Driver & Dispatch
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Select an order to prepare for dispatch</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}