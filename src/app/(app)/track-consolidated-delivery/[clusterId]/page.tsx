'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Package, 
  Truck, 
  MapPin, 
  Clock, 
  Navigation, 
  Phone, 
  CheckCircle,
  AlertCircle,
  Loader2,
  Route,
  RefreshCw
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface ConsolidatedDeliveryInfo {
  clusterId: string
  driverInfo: {
    id: string
    name: string
    phone: string
    vehicleType: string
    licensePlate: string
    currentLocation?: {
      lat: number
      lng: number
      lastUpdated: string
    }
    status: string
  }
  orders: Array<{
    id: string
    customerName: string
    deliveryAddress: string
    status: string
    trackingNumber: string
    estimatedDeliveryTime: string
    items: Array<{
      name: string
      quantity: number
      price: number
    }>
  }>
  routeInfo: {
    totalDistance: number
    estimatedDuration: number
    sequence: Array<{
      orderId: string
      customerName: string
      address: string
      position: number
    }>
    currentStop: number
  }
  deliveryProgress: {
    completedStops: number
    totalStops: number
    percentage: number
  }
}

export default function ConsolidatedDeliveryTracking() {
  const params = useParams()
  const clusterId = params.clusterId as string
  const [deliveryInfo, setDeliveryInfo] = useState<ConsolidatedDeliveryInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (clusterId) {
      fetchDeliveryInfo()
      
      // Set up auto-refresh every 30 seconds
      const interval = setInterval(fetchDeliveryInfo, 30000)
      setRefreshInterval(interval)
      
      return () => {
        if (interval) clearInterval(interval)
      }
    }
  }, [clusterId])

  const fetchDeliveryInfo = async () => {
    try {
      setIsLoading(true)
      
      // In a real implementation, this would call an API endpoint
      // For demo purposes, I'll simulate the data structure
      const mockData: ConsolidatedDeliveryInfo = {
        clusterId: clusterId,
        driverInfo: {
          id: "DRV-001",
          name: "Abebe Transport",
          phone: "+251911223344",
          vehicleType: "car",
          licensePlate: "AA 1234",
          currentLocation: {
            lat: 9.025,
            lng: 38.758,
            lastUpdated: new Date().toISOString()
          },
          status: "in_transit"
        },
        orders: [
          {
            id: "ECOM-001",
            customerName: "Abebe Kebede",
            deliveryAddress: "Bole Road, Near Bole Medhanealem Church",
            status: "in_transit",
            trackingNumber: "MLK-123456-ABCD",
            estimatedDeliveryTime: new Date(Date.now() + 45 * 60000).toISOString(),
            items: [
              { name: "Men's Cotton Shirt", quantity: 2, price: 1500 },
              { name: "Women's Blouse", quantity: 1, price: 1500 }
            ]
          },
          {
            id: "ECOM-002",
            customerName: "Fatima Hassan",
            deliveryAddress: "Bole Road, Near Bole Market",
            status: "in_transit",
            trackingNumber: "MLK-123457-EFGH",
            estimatedDeliveryTime: new Date(Date.now() + 60 * 60000).toISOString(),
            items: [
              { name: "Kids T-shirt", quantity: 3, price: 800 },
              { name: "Women's Skirt", quantity: 1, price: 2000 }
            ]
          },
          {
            id: "ECOM-003",
            customerName: "Yohannes Tekle",
            deliveryAddress: "Bole Road, Near Bole Condominiums",
            status: "picked_up",
            trackingNumber: "MLK-123458-IJKL",
            estimatedDeliveryTime: new Date(Date.now() + 75 * 60000).toISOString(),
            items: [
              { name: "Men's Jeans", quantity: 1, price: 2500 },
              { name: "Women's Dress", quantity: 1, price: 3300 }
            ]
          }
        ],
        routeInfo: {
          totalDistance: 12.5,
          estimatedDuration: 90,
          sequence: [
            { orderId: "ECOM-001", customerName: "Abebe Kebede", address: "Bole Medhanealem", position: 1 },
            { orderId: "ECOM-002", customerName: "Fatima Hassan", address: "Bole Market", position: 2 },
            { orderId: "ECOM-003", customerName: "Yohannes Tekle", address: "Bole Condominiums", position: 3 }
          ],
          currentStop: 1
        },
        deliveryProgress: {
          completedStops: 0,
          totalStops: 3,
          percentage: 0
        }
      }
      
      setDeliveryInfo(mockData)
      
    } catch (error) {
      console.error('Error fetching delivery info:', error)
      toast({
        title: "Error",
        description: "Failed to load delivery information",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getVehicleIcon = (vehicleType: string) => {
    switch (vehicleType) {
      case 'motorbike': return '🏍️'
      case 'car': return '🚗'
      case 'van': return '🚐'
      case 'truck': return '🚚'
      default: return '🚗'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'picked_up': return 'bg-blue-100 text-blue-800'
      case 'in_transit': return 'bg-orange-100 text-orange-800'
      case 'delivered': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading delivery information...</p>
        </div>
      </div>
    )
  }

  if (!deliveryInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Delivery Not Found</h1>
          <p className="text-gray-600 mb-6">We couldn't find tracking information for this consolidated delivery.</p>
          <Button onClick={() => window.history.back()} className="bg-blue-600 hover:bg-blue-700">
            Back to Previous Page
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Route className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Consolidated Delivery Tracking</h1>
          <p className="text-gray-600">Cluster ID: {deliveryInfo.clusterId}</p>
          <Badge className="mt-2 bg-blue-600 text-white">
            {deliveryInfo.orders.length} Orders in Consolidated Route
          </Badge>
        </div>

        {/* Progress Overview */}
        <Card className="mb-6 bg-white/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-600" />
              Delivery Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">
                  Route Completion
                </span>
                <span className="text-sm font-bold text-blue-600">
                  {deliveryInfo.deliveryProgress.percentage}% 
                  ({deliveryInfo.deliveryProgress.completedStops}/{deliveryInfo.deliveryProgress.totalStops} stops)
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${deliveryInfo.deliveryProgress.percentage}%` }}
                ></div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Total Distance:</span>
                  <span className="font-semibold ml-2">{deliveryInfo.routeInfo.totalDistance.toFixed(1)} km</span>
                </div>
                <div>
                  <span className="text-gray-500">Estimated Time:</span>
                  <span className="font-semibold ml-2">{deliveryInfo.routeInfo.estimatedDuration} min</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Driver Information */}
        <Card className="mb-6 bg-white/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">{getVehicleIcon(deliveryInfo.driverInfo.vehicleType)}</span>
              Driver Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Driver Name</p>
                <p className="font-semibold">{deliveryInfo.driverInfo.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Contact</p>
                <p className="font-semibold flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {deliveryInfo.driverInfo.phone}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Vehicle</p>
                <p className="font-semibold capitalize">{deliveryInfo.driverInfo.vehicleType}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">License Plate</p>
                <p className="font-semibold">{deliveryInfo.driverInfo.licensePlate}</p>
              </div>
            </div>
            
            {deliveryInfo.driverInfo.currentLocation && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-500 mb-2">Current Location</p>
                <p className="font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  Lat: {deliveryInfo.driverInfo.currentLocation.lat.toFixed(6)}, 
                  Lng: {deliveryInfo.driverInfo.currentLocation.lng.toFixed(6)}
                  <span className="text-xs text-gray-500 ml-2">
                    (Updated: {new Date(deliveryInfo.driverInfo.currentLocation.lastUpdated).toLocaleTimeString()})
                  </span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delivery Route Sequence */}
        <Card className="mb-6 bg-white/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-green-600" />
              Delivery Route Sequence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {deliveryInfo.routeInfo.sequence.map((stop, index) => {
                const order = deliveryInfo.orders.find(o => o.id === stop.orderId)
                const isCompleted = index < deliveryInfo.routeInfo.currentStop
                const isCurrent = index === deliveryInfo.routeInfo.currentStop - 1
                
                return (
                  <div 
                    key={stop.orderId} 
                    className={`p-4 rounded-lg border-2 ${
                      isCurrent ? 'border-blue-500 bg-blue-50' : 
                      isCompleted ? 'border-green-500 bg-green-50' : 
                      'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          isCurrent ? 'bg-blue-500 text-white' : 
                          isCompleted ? 'bg-green-500 text-white' : 
                          'bg-gray-300 text-gray-700'
                        }`}>
                          {stop.position}
                        </div>
                        <div>
                          <h3 className="font-semibold">{stop.customerName}</h3>
                          <p className="text-sm text-gray-600">{stop.address}</p>
                          {order && (
                            <Badge className={`mt-1 ${getStatusColor(order.status)}`}>
                              {order.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {isCompleted && (
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      )}
                      
                      {isCurrent && (
                        <div className="flex items-center gap-2 text-blue-600">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm font-medium">CURRENT STOP</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Individual Order Details */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Order Details</h2>
          <div className="grid gap-4">
            {deliveryInfo.orders.map((order) => (
              <Card key={order.id} className="bg-white/80 backdrop-blur">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Order #{order.id.split('-')[1]}
                    </CardTitle>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500">Customer</p>
                      <p className="font-semibold">{order.customerName}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Delivery Address</p>
                      <p className="font-medium">{order.deliveryAddress}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Tracking Number</p>
                      <p className="font-mono font-semibold text-blue-600">{order.trackingNumber}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Estimated Delivery</p>
                      <p className="font-semibold">
                        {new Date(order.estimatedDeliveryTime).toLocaleString()}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Items</p>
                      <div className="space-y-2">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span>{item.name} <span className="text-gray-500">(x{item.quantity})</span></span>
                            <span className="font-medium">ETB {(item.price * item.quantity).toLocaleString()}</span>
                          </div>
                        ))}
                        <div className="border-t pt-2 flex justify-between font-bold">
                          <span>Total</span>
                          <span>ETB {order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Refresh Button */}
        <div className="text-center">
          <Button 
            onClick={fetchDeliveryInfo}
            variant="outline"
            className="bg-white/80 backdrop-blur"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Tracking Information
          </Button>
        </div>
      </div>
    </div>
  )
}