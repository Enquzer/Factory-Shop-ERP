'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Package, 
  ArrowLeft, 
  Inbox, 
  CheckCircle,
  Truck,
  Image as ImageIcon,
  Save,
  Plus,
  Trash2,
  ShoppingCart
} from 'lucide-react';
import { MarketingOrder, getMarketingOrders, updateMarketingOrder } from '@/lib/marketing-orders';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { format } from 'date-fns';

export default function ReceiveGoodsPage() {
  const [orders, setOrders] = useState<MarketingOrder[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<MarketingOrder | null>(null);
  const [registrationData, setRegistrationData] = useState<any[]>([]);
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
    fetchPurchaseRequests();
  }, []);

  const fetchPurchaseRequests = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch('/api/purchase-requests/received', {
        headers
      });
      
      if (res.ok) {
        const data = await res.json();
        setPurchaseRequests(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching purchase requests:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const allOrders = await getMarketingOrders();
      // Only show orders in 'Store' stage
      setOrders(allOrders.filter(o => o.status === 'Store'));
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrder = (order: MarketingOrder) => {
    setSelectedOrder(order);
    // Initialize registration data with existing items from order
    setRegistrationData(order.items.map(item => ({
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      price: 0,
      productCode: order.productCode
    })));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...registrationData];
    updated[index] = { ...updated[index], [field]: value };
    setRegistrationData(updated);
  };

  const addItem = () => {
    setRegistrationData([...registrationData, { size: '', color: '', quantity: 0, price: 0, productCode: selectedOrder?.productCode || '' }]);
  };

  const removeItem = (index: number) => {
    setRegistrationData(registrationData.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedOrder) return;

    try {
      // 1. Update the order status to 'Delivery' 
      // and mark as completed to trigger inventory update logic in the API
      // We can pass the updated items back if the API supported it, 
      // but for now we follow the existing pattern where isCompleted uses order.items.
      
      // If we want to support price/code updates, we'd need to update the marketing_order_items too.
      // For now, let's just trigger the completion.
      const success = await updateMarketingOrder(selectedOrder.id, {
          status: 'Delivery',
          isCompleted: true,
          items: registrationData 
      });

      if (success) {
        toast({
          title: "Goods Received",
          description: `Order ${selectedOrder.orderNumber} has been registered to inventory.`,
        });
        setSelectedOrder(null);
        fetchOrders();
      }
    } catch (error) {
      console.error('Error registering goods:', error);
      toast({
        title: "Error",
        description: "Failed to register goods.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => selectedOrder ? setSelectedOrder(null) : router.push('/store/dashboard')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold">Receive Goods</h1>
      </div>

      {!selectedOrder ? (
        <>
          {/* Marketing Orders Section */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Package className="h-6 w-6 text-orange-500" />
              Marketing Orders from Packing
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {orders.length > 0 ? (
                orders.map(order => (
                  <Card key={order.id} className="hover:shadow-lg transition-shadow cursor-pointer border-none shadow-md bg-white overflow-hidden" onClick={() => handleSelectOrder(order)}>
                    <div className="h-2 bg-orange-500" />
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                            {order.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{new Date(order.updatedAt).toLocaleDateString()}</span>
                      </div>
                      <CardTitle className="mt-2 text-xl font-bold">{order.orderNumber}</CardTitle>
                      <CardDescription className="font-medium text-gray-900">{order.productName}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        {order.imageUrl ? (
                            <div className="relative h-16 w-16 rounded-lg overflow-hidden border shadow-sm">
                                <Image src={order.imageUrl} alt={order.productName} width={64} height={64} className="object-cover w-full h-full" />
                            </div>
                        ) : (
                            <div className="h-16 w-16 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                                <ImageIcon className="h-8 w-8" />
                            </div>
                        )
                        }
                        <div>
                            <div className="text-sm font-bold">Qty: {order.quantity} units</div>
                            <div className="text-xs font-mono text-muted-foreground">{order.productCode}</div>
                        </div>
                      </div>
                      <Button className="w-full mt-4 bg-orange-600 hover:bg-orange-700 shadow-md">
                        Register Receipt
                      </Button>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-2xl bg-gray-50/50">
                  <Inbox className="h-12 w-12 mx-auto mb-4 opacity-20 text-orange-500" />
                  <p className="text-lg font-medium">No marketing orders awaiting reception</p>
                  <p className="text-sm mt-2">Incoming products from Packing will appear here.</p>
                </div>
              )}
            </div>
          </div>

          {/* Purchase Requests Section */}
          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Truck className="h-6 w-6 text-blue-500" />
              Recently Received Purchase Requests
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {purchaseRequests.length > 0 ? (
                purchaseRequests.map(request => (
                  <Card key={request.id} className="border-none shadow-md bg-white overflow-hidden">
                    <div className="h-2 bg-blue-500" />
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-2">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {request.status}
                          </Badge>
                          <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">
                            <ShoppingCart className="h-3 w-3 mr-1" />
                            Purchased
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{format(new Date(request.receivedDate), 'MMM dd, yyyy')}</span>
                      </div>
                      <CardTitle className="mt-2 text-xl font-bold">{request.materialName}</CardTitle>
                      <CardDescription className="font-medium text-gray-900">
                        Requested by {request.requesterUsername}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Quantity:</span>
                          <span className="text-sm font-medium">{request.quantity} {request.unitOfMeasure || 'units'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Supplier:</span>
                          <span className="text-sm font-medium">{request.supplier || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Cost:</span>
                          <span className="text-sm font-medium">
                            {request.costPerUnit ? `${(request.costPerUnit * request.quantity).toFixed(2)} ETB` : 'N/A'}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mb-4">
                        {request.reason}
                      </div>
                      <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700 shadow-md" 
                        onClick={async () => {
                          try {
                            // Automatically register this purchase request in raw materials inventory
                            const response = await fetch('/api/raw-materials/register-purchase', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                purchaseRequestId: request.id,
                                materialName: request.materialName,
                                quantity: request.quantity,
                                unitOfMeasure: request.unitOfMeasure || 'units',
                                costPerUnit: request.costPerUnit,
                                supplier: request.supplier,
                                category: 'Fabric' // Default category, can be improved
                              })
                            });
                            
                            if (response.ok) {
                              toast({
                                title: "Success",
                                description: `${request.materialName} (${request.quantity} ${request.unitOfMeasure || 'units'}) has been automatically registered in raw material inventory.`,
                              });
                              // Refresh the list to show updated status
                              fetchPurchaseRequests();
                            } else {
                              const error = await response.json();
                              toast({
                                title: "Error",
                                description: error.error || "Failed to register material in inventory",
                                variant: "destructive"
                              });
                            }
                          } catch (error) {
                            toast({
                              title: "Error",
                              description: "Failed to register material in inventory",
                              variant: "destructive"
                            });
                          }
                        }}
                      >
                        Register in Inventory
                      </Button>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-2xl bg-gray-50/50">
                  <Truck className="h-12 w-12 mx-auto mb-4 opacity-20 text-blue-500" />
                  <p className="text-lg font-medium">No recent purchase requests received</p>
                  <p className="text-sm mt-2">Materials received from suppliers will appear here for inventory registration.</p>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-gray-50/50">
                <CardTitle>Inventory Registration</CardTitle>
                <CardDescription>Verify and set prices for incoming stock of {selectedOrder.orderNumber}</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b">
                                <th className="text-left pb-4 font-bold text-gray-600 uppercase text-[10px] tracking-wider">Product Code</th>
                                <th className="text-left pb-4 font-bold text-gray-600 uppercase text-[10px] tracking-wider">Size</th>
                                <th className="text-left pb-4 font-bold text-gray-600 uppercase text-[10px] tracking-wider">Color</th>
                                <th className="text-left pb-4 font-bold text-gray-600 uppercase text-[10px] tracking-wider">Qty</th>
                                <th className="text-left pb-4 font-bold text-gray-600 uppercase text-[10px] tracking-wider">Selling Price</th>
                                <th className="text-right pb-4 font-bold text-gray-600 uppercase text-[10px] tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {registrationData.map((item, index) => (
                                <tr key={index} className="group hover:bg-gray-50/50 transition-colors">
                                    <td className="py-3 pr-2">
                                        <Input 
                                            value={item.productCode} 
                                            onChange={(e) => updateItem(index, 'productCode', e.target.value)}
                                            className="h-9 font-mono uppercase text-xs"
                                        />
                                    </td>
                                    <td className="py-3 pr-2">
                                        <Input 
                                            value={item.size} 
                                            onChange={(e) => updateItem(index, 'size', e.target.value)}
                                            placeholder="Size"
                                            className="h-9"
                                        />
                                    </td>
                                    <td className="py-3 pr-2">
                                        <Input 
                                            value={item.color} 
                                            onChange={(e) => updateItem(index, 'color', e.target.value)}
                                            placeholder="Color"
                                            className="h-9"
                                        />
                                    </td>
                                    <td className="py-3 pr-2">
                                        <Input 
                                            type="number"
                                            value={item.quantity} 
                                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                                            className="h-9 w-20 font-bold"
                                        />
                                    </td>
                                    <td className="py-3 pr-2">
                                        <div className="relative">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">ETB</span>
                                            <Input 
                                                type="number"
                                                value={item.price} 
                                                onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                                                className="h-9 w-28 pl-9 text-right"
                                            />
                                        </div>
                                    </td>
                                    <td className="py-3 text-right">
                                        <Button variant="ghost" size="sm" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Button variant="outline" size="sm" onClick={addItem} className="w-full border-dashed">
                    <Plus className="h-4 w-4 mr-2" /> Add Item
                </Button>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
                <Button variant="outline" onClick={() => setSelectedOrder(null)}>Cancel</Button>
                <Button onClick={handleSubmit}>
                    <Save className="h-4 w-4 mr-2" />
                    Complete Registration
                </Button>
            </div>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex justify-center mb-4">
                    {selectedOrder.imageUrl ? (
                        <div className="relative h-48 w-full rounded-lg overflow-hidden border shadow-sm">
                            <Image src={selectedOrder.imageUrl} alt={selectedOrder.productName} width={400} height={400} className="object-cover w-full h-full" />
                        </div>
                    ) : (
                        <div className="h-48 w-full rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                            <ImageIcon className="h-16 w-16" />
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="text-muted-foreground">Product:</div>
                    <div className="font-medium">{selectedOrder.productName}</div>
                    
                    <div className="text-muted-foreground">Code:</div>
                    <div className="font-medium">{selectedOrder.productCode}</div>
                    
                    <div className="text-muted-foreground">Total Qty:</div>
                    <div className="font-medium">{selectedOrder.quantity} units</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
