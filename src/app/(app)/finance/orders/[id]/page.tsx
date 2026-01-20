"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Order, getOrder } from "@/lib/orders";
import { 
  ArrowLeft, 
  Calendar, 
  CreditCard, 
  Package, 
  MapPin, 
  FileText,
  User,
  Truck,
  CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingBar } from "@/components/loading-bar";
import { format } from "date-fns";
import Image from "next/image";
import { createAuthHeaders } from "@/lib/auth-helpers";

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const statusColors: Record<string, string> = {
    'Pending': 'bg-gray-100 text-gray-800',
    'Awaiting Payment': 'bg-yellow-100 text-yellow-800',
    'Paid': 'bg-green-100 text-green-800',
    'Released': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    'Dispatched': 'bg-blue-100 text-blue-800',
    'Delivered': 'bg-purple-100 text-purple-800',
    'Cancelled': 'bg-red-100 text-red-800'
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <LoadingBar isLoading={true} message="Loading order details..." />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-4">
        <h1 className="text-2xl font-bold text-destructive">Error</h1>
        <p className="text-muted-foreground">{error || "Order not found"}</p>
        <Button onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Order #{order.id}
            <Badge className={statusColors[order.status] || 'bg-gray-100 text-gray-800'}>
              {order.status}
            </Badge>
          </h1>
          <p className="text-muted-foreground text-sm">
            Created on {format(new Date(order.date), "MMMM d, yyyy")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content - Items and Summary */}
        <div className="md:col-span-2 space-y-6">
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
                  <div key={index} className="flex gap-4 items-start border-b pb-4 last:border-0 last:pb-0">
                    <div className="relative h-20 w-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden border">
                      {item.imageUrl || item.variant.imageUrl ? (
                         <Image 
                           src={item.imageUrl || item.variant.imageUrl || ''} 
                           alt={item.name}
                           fill
                           className="object-cover"
                         />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                          <Package className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{item.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Color: {item.variant.color}, Size: {item.variant.size}
                      </p>
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-sm">
                          {item.quantity} x ETB {item.price.toLocaleString()}
                        </p>
                        <p className="font-bold">
                          ETB {(item.quantity * item.price).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="pt-4 flex justify-between items-center border-t">
                  <span className="font-bold text-lg">Total Amount</span>
                  <span className="font-bold text-xl text-primary">
                    ETB {order.amount.toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Proof Display (if available) */}
          {order.paymentSlipUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                   <FileText className="h-5 w-5" />
                   Payment Receipt
                </CardTitle>
              </CardHeader>
              <CardContent>
                 <div className="relative h-64 w-full rounded-lg overflow-hidden border bg-gray-50">
                    <Image 
                       src={order.paymentSlipUrl} 
                       alt="Payment Receipt" 
                       fill
                       className="object-contain"
                     />
                 </div>
                 <div className="mt-4 flex justify-end">
                    <Button variant="outline" onClick={() => window.open(order.paymentSlipUrl, '_blank')}>
                        Open Original
                    </Button>
                 </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar Info - Customer, Delivery, etc */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
               <CardTitle className="flex items-center gap-2 text-base">
                 <User className="h-4 w-4" />
                 Shop Information
               </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p className="font-medium">{order.shopName}</p>
                <p className="text-sm text-muted-foreground">Shop ID: {order.shopId}</p>
                {/* Assuming address logic would be here if we had it in order obj */}
              </div>
            </CardContent>
          </Card>

          <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2 text-base">
                 <Truck className="h-4 w-4" />
                 Delivery Details
               </CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
                {order.requestedDeliveryDate && (
                    <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase">Requested Delivery</p>
                        <p>{format(new Date(order.requestedDeliveryDate), "MMM d, yyyy")}</p>
                    </div>
                )}
                {order.actualDispatchDate && (
                    <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase">Actual Dispatch</p>
                        <p>{format(new Date(order.actualDispatchDate), "MMM d, yyyy")}</p>
                    </div>
                )}
                 {!order.requestedDeliveryDate && !order.actualDispatchDate && (
                    <p className="text-sm text-muted-foreground italic">No specific delivery details</p>
                 )}
             </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <CreditCard className="h-4 w-4" />
                    Payment Status
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                        <span>Status:</span>
                        <Badge variant="outline">{order.status}</Badge>
                    </div>
                    {order.status === 'Awaiting Payment' && (
                        <div className="space-y-3">
                            <div className="p-3 bg-yellow-50 text-yellow-800 text-xs rounded-md">
                                Shop has marked this as paid. Please verify the receipt.
                            </div>
                            <Button 
                                className="w-full bg-green-600 hover:bg-green-700"
                                onClick={async () => {
                                    try {
                                        setLoading(true);
                                        const res = await fetch(`/api/orders/${order.id}/payment-verify`, {
                                            method: 'PUT',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                ...createAuthHeaders()
                                            },
                                            body: JSON.stringify({
                                                status: 'Paid',
                                                actionBy: 'finance'
                                            })
                                        });

                                        if (res.ok) {
                                            fetchOrder(order.id);
                                        } else {
                                            const contentType = res.headers.get("content-type");
                                            let errorMessage = 'Failed to verify payment.';
                                            if (contentType && contentType.includes("application/json")) {
                                                const data = await res.json();
                                                errorMessage = data.error || errorMessage;
                                            } else {
                                                // Handle non-JSON error (e.g., server crash HTML)
                                                errorMessage += ` Server returned status ${res.status}`;
                                            }
                                            setError(errorMessage);
                                        }
                                    } catch (err: any) {
                                        console.error('Verification error:', err);
                                        setError(`Failed to verify payment: ${err.message || 'Unknown error'}`);
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                            >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Verify Payment
                            </Button>
                        </div>
                    )}

                    {order.status === 'Paid' && (
                        <div className="space-y-3">
                            <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-md font-medium">
                                Payment verified. Release this order to store for dispatch.
                            </div>
                            <Button 
                                className="w-full bg-blue-600 hover:bg-blue-700"
                                onClick={async () => {
                                    try {
                                        setLoading(true);
                                        const res = await fetch(`/api/orders/${order.id}/release`, {
                                            method: 'PUT',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                ...createAuthHeaders()
                                            }
                                        });

                                        if (res.ok) {
                                            fetchOrder(order.id);
                                        } else {
                                            const contentType = res.headers.get("content-type");
                                            let errorMessage = 'Failed to release order.';
                                            if (contentType && contentType.includes("application/json")) {
                                                const data = await res.json();
                                                errorMessage = data.error || errorMessage;
                                            } else {
                                                errorMessage += ` Server returned status ${res.status}`;
                                            }
                                            setError(errorMessage);
                                        }
                                    } catch (err: any) {
                                        console.error('Release error:', err);
                                        setError(`Failed to release order: ${err.message || 'Unknown error'}`);
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                            >
                                <Package className="mr-2 h-4 w-4" />
                                Release to Store
                            </Button>
                        </div>
                    )}
                    
                    {/* Request Payment Section */}
                    {(order.status === 'Pending' || order.status === 'Awaiting Payment') && (
                      <div className="mt-4 pt-4 border-t">
                        {order.paymentRequested ? (
                            <div className="p-3 bg-orange-100 text-orange-800 text-center rounded-md font-medium text-sm border border-orange-200">
                                Payment already requested
                            </div>
                        ) : (
                            <Button 
                            variant="outline"
                            className="w-full border-orange-200 hover:bg-orange-50 text-orange-700"
                            onClick={async () => {
                                try {
                                    setLoading(true);
                                    const res = await fetch(`/api/orders/${order.id}/request-payment`, {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            ...createAuthHeaders()
                                        },
                                        body: JSON.stringify({
                                            message: "Finance team requests immediate payment for this order to proceed."
                                        })
                                    });

                                    if (res.ok) {
                                        // Update local state immediately to reflect changes
                                        fetchOrder(order.id);
                                    } else {
                                        const data = await res.json();
                                        alert(data.error || 'Failed to send request');
                                    }
                                } catch (err) {
                                    alert('Failed to send payment request');
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Request Payment
                            </Button>
                        )}
                      </div>
                    )}
                </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
