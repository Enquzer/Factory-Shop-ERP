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
  Trash2
} from 'lucide-react';
import { MarketingOrder, getMarketingOrders, updateMarketingOrder } from '@/lib/marketing-orders';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

export default function ReceiveGoodsPage() {
  const [orders, setOrders] = useState<MarketingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<MarketingOrder | null>(null);
  const [registrationData, setRegistrationData] = useState<any[]>([]);
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
  }, []);

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
                            <Image src={order.imageUrl} alt={order.productName} fill className="object-cover" />
                        </div>
                    ) : (
                        <div className="h-16 w-16 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                            <ImageIcon className="h-8 w-8" />
                        </div>
                    )}
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
            <div className="col-span-full py-20 text-center text-muted-foreground border-2 border-dashed rounded-2xl bg-gray-50/50">
              <Inbox className="h-16 w-16 mx-auto mb-4 opacity-20 text-orange-500" />
              <p className="text-xl font-medium">No goods awaiting reception</p>
              <p className="text-sm mt-2">Incoming products from Packing will appear here.</p>
            </div>
          )}
        </div>
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
                            <Image src={selectedOrder.imageUrl} alt={selectedOrder.productName} fill className="object-cover" />
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
