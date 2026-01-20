"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Order, getOrder } from "@/lib/orders";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  Package,
  MapPin, 
  FileText,
  User,
  Truck,
  CheckCircle,
  AlertTriangle
} from "lucide-react";

export default function StoreOrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchOrder(params.id as string);
    }
  }, [params.id]);

  const fetchOrder = async (id: string) => {
    try {
      setLoading(true);
      const fetchedOrder = await getOrder(id);
      if (!fetchedOrder) {
        setError("Order not found");
      } else {
        setOrder(fetchedOrder);
      }
    } catch (err) {
      console.error("Error fetching order:", err);
      setError("Failed to load order details");
    } finally {
      setLoading(false);
    }
  };

  const handleDispatch = async () => {
    if (!order) return;
    
    try {
      setProcessing(true);
      const res = await fetch(`/api/orders/${order.id}/dispatch`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'Dispatched',
          actionBy: 'store'
        })
      });

      if (res.ok) {
        // Refresh order data
        fetchOrder(order.id);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to dispatch order');
      }
    } catch (err) {
      console.error('Dispatch error:', err);
      alert('Failed to dispatch order');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-500 p-4 rounded-md">
          {error || "Order not found"}
        </div>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Order {order.id}</h1>
            <div className="flex items-center text-sm text-muted-foreground mt-1">
              <Calendar className="mr-2 h-4 w-4" />
              {new Date(order.date).toLocaleDateString()}
              <span className="mx-2">•</span>
              <User className="mr-2 h-4 w-4" />
              {order.shopName}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
            <Badge 
                variant={
                    order.status === 'Paid' ? 'default' : 
                    order.status === 'Dispatched' ? 'secondary' : 
                    'outline'
                }
                className={
                    order.status === 'Paid' ? 'bg-green-100 text-green-800' :
                    order.status === 'Dispatched' ? 'bg-blue-100 text-blue-800' :
                    ''
                }
            >
                {order.status}
            </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
            {/* Order Items */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Order Items
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {order.items.map((item, index) => (
                            <div key={index} className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0">
                                <div className="flex gap-4">
                                    <div className="h-16 w-16 bg-gray-100 rounded-md overflow-hidden">
                                        {item.imageUrl ? (
                                            <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center text-gray-400">
                                                <Package className="h-8 w-8" />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <div className="font-medium">{item.name}</div>
                                        <div className="text-sm text-muted-foreground space-y-1">
                                            <div>Variant: {item.variant.color} / {item.variant.size}</div>
                                            <div>Qty: {item.quantity}</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-medium">
                                        ETB {(item.price * item.quantity).toLocaleString()}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        ETB {item.price.toLocaleString()} each
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div className="flex justify-between items-center pt-4 border-t font-bold text-lg">
                            <span>Total Amount</span>
                            <span>ETB {order.amount.toLocaleString()}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
            {/* Actions Card */}
          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <Truck className="h-4 w-4" />
                    Dispatch Actions
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                        <span>Current Status:</span>
                        <Badge variant="outline">{order.status}</Badge>
                    </div>
                    {order.status === 'Paid' && (
                        <div className="space-y-3">
                            <div className="p-3 bg-green-50 text-green-800 text-xs rounded-md">
                                Payment verified. Order is ready for dispatch.
                            </div>
                            <Button 
                                className="w-full bg-blue-600 hover:bg-blue-700"
                                onClick={handleDispatch}
                                disabled={processing}
                            >
                                {processing ? (
                                    <>Processing...</>
                                ) : (
                                    <>
                                        <Truck className="mr-2 h-4 w-4" />
                                        Dispatch Order
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                    {(order.status === 'Dispatched' || order.status === 'Delivered') && (
                        <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-md flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            Order has been dispatched.
                        </div>
                    )}
                </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="h-4 w-4" />
                    Delivery Info
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3 text-sm">
                   <div>
                        <span className="text-muted-foreground block">Shop Name</span>
                        <span className="font-medium">{order.shopName}</span>
                   </div>
                   {/* Add more delivery details here if available in order object */}
                </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
