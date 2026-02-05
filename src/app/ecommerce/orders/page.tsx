"use client";

import { useState, useEffect } from "react";
import { useCustomerAuth } from "@/contexts/customer-auth-context";
import { useCart } from "@/hooks/use-cart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { 
  Package, 
  ChevronRight, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Truck, 
  AlertCircle, 
  ShoppingCart,
  User,
  RotateCcw,
  ShoppingBag,
  ArrowLeft,
  XCircle
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { EcommerceHeader } from "@/components/ecommerce-header";
import { EcommerceFooter } from "@/components/ecommerce-footer";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type OrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  color: string;
  size: string;
  imageUrl?: string;
};

type Order = {
  id: string;
  createdAt: string;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  deliveryAddress: string;
  city: string;
  orderItems: OrderItem[];
  transportationCost: number;
};

export default function MyOrdersPage() {
  const { user, logout } = useCustomerAuth();
  const { itemCount } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [returnExplanation, setReturnExplanation] = useState("");
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        if (!user) return;
        
        const token = localStorage.getItem('customerAuthToken');
        const response = await fetch('/api/ecommerce/orders', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setOrders(data.orders || []);
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchOrders();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const handleReturnRequest = (order: Order) => {
    setSelectedOrder(order);
    setReturnReason("");
    setReturnExplanation("");
    setIsReturnModalOpen(true);
  };

  const submitReturnRequest = async () => {
    if (!selectedOrder || !returnReason) {
      toast({
        title: "Error",
        description: "Please select a reason for the return.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingReturn(true);
    try {
      const response = await fetch('/api/ecommerce/returns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          customerId: user?.id,
          customerName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.username,
          items: selectedOrder.orderItems,
          reason: returnReason,
          explanation: returnExplanation
        }),
      });

      if (response.ok) {
        toast({
          title: "Return Requested",
          description: "Your return request has been submitted successfully.",
          className: "bg-green-600 text-white"
        });
        setIsReturnModalOpen(false);
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to submit return request");
      }
    } catch (error: any) {
      console.error("Error submitting return:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit return request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  const confirmDelivery = async (orderId: string) => {
    try {
      const token = localStorage.getItem('customerAuthToken');
      const response = await fetch(`/api/ecommerce/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'delivered' }),
      });

      if (response.ok) {
        toast({
          title: "Order Delivered",
          description: "Thank you for confirming the delivery!",
          className: "bg-green-600 text-white"
        });
        // Refresh orders
        const ordersResponse = await fetch('/api/ecommerce/orders', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (ordersResponse.ok) {
          const data = await ordersResponse.json();
          setOrders(data.orders || []);
        }
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to confirm delivery");
      }
    } catch (error: any) {
      console.error("Error confirming delivery:", error);
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const cancelOrder = async () => {
    if (!orderToCancel || !cancelReason) return;

    setIsSubmittingCancel(true);
    try {
      const token = localStorage.getItem('customerAuthToken');
      const response = await fetch(`/api/ecommerce/orders/${orderToCancel.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          status: 'cancelled',
          cancellationReason: cancelReason
        }),
      });

      if (response.ok) {
        toast({
          title: "Order Cancelled",
          description: "Your order has been cancelled successfully.",
          className: "bg-red-600 text-white"
        });
        setIsCancelModalOpen(false);
        // Refresh orders
        const ordersResponse = await fetch('/api/ecommerce/orders', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (ordersResponse.ok) {
          const data = await ordersResponse.json();
          setOrders(data.orders || []);
        }
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to cancel order");
      }
    } catch (error: any) {
      console.error("Error cancelling order:", error);
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 uppercase text-[10px]">Pending</Badge>;
      case 'confirmed': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 uppercase text-[10px]">Confirmed</Badge>;
      case 'processing': return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 uppercase text-[10px]">Processing</Badge>;
      case 'shipped': return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 uppercase text-[10px]">Shipped</Badge>;
      case 'delivered': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 uppercase text-[10px]">Delivered</Badge>;
      case 'cancelled': return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 uppercase text-[10px]">Cancelled</Badge>;
      default: return <Badge variant="outline" className="uppercase text-[10px]">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full text-center p-8">
          <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Please Log In</h2>
          <p className="text-gray-600 mb-6">You need to be logged in to view your orders.</p>
          <Link href="/ecommerce/login">
            <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white">Login Now</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <EcommerceHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center space-x-4 mb-8">
            <Link href="/ecommerce">
              <Button variant="ghost" size="sm" className="text-gray-600">
                <ArrowLeft className="h-4 w-4 mr-2 text-orange-500" />
                Back to Shopping
              </Button>
            </Link>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center">
            <Package className="h-8 w-8 mr-3 text-orange-600" />
            My Orders
          </h1>

          {orders.length === 0 ? (
            <Card className="text-center py-16">
              <CardContent>
                <div className="h-20 w-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShoppingBag className="h-10 w-10 text-gray-400" />
                </div>
                <h2 className="text-xl font-semibold mb-2">No orders found</h2>
                <p className="text-gray-600 mb-8">It looks like you haven't placed any orders yet.</p>
                <Link href="/ecommerce/products">
                  <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                    Start Shopping
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => (
                <Card key={order.id} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow border-l-4 border-l-orange-500">
                  <CardHeader className="bg-white border-b border-gray-100 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Order #{order.id.split('-').pop()}</span>
                          {getStatusBadge(order.status)}
                        </div>
                        <div className="text-xl font-bold">
                          ETB {(order.totalAmount + (order.transportationCost || 0)).toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          Planted on {format(new Date(order.createdAt), 'PPP')}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                         {(order.status === 'pending' || order.status === 'confirmed') && (
                           <Button 
                             variant="outline" 
                             size="sm" 
                             className="text-xs border-red-200 text-red-600 hover:bg-red-50 font-medium"
                             onClick={() => {
                               setOrderToCancel(order);
                               setCancelReason("");
                               setIsCancelModalOpen(true);
                             }}
                           >
                              <XCircle className="h-3 w-3 mr-1" />
                              Cancel Order
                           </Button>
                         )}
                         {order.status === 'shipped' && (
                           <Button 
                             variant="default" 
                             size="sm" 
                             className="text-xs bg-green-600 hover:bg-green-700 text-white font-medium"
                             onClick={() => confirmDelivery(order.id)}
                           >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Confirm Delivery
                           </Button>
                         )}
                         {order.status === 'delivered' && (
                           <Button 
                             variant="outline" 
                             size="sm" 
                             className="text-xs border-orange-200 text-orange-600 hover:bg-orange-50 font-medium"
                             onClick={() => handleReturnRequest(order)}
                           >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Return Items
                           </Button>
                         )}
                         <Link href={`/ecommerce/orders/${order.id}`}>
                            <Button variant="outline" size="sm" className="text-xs border-orange-200 text-orange-700 hover:bg-orange-50">
                                View Details
                                <ChevronRight className="h-3 w-3 ml-1" />
                            </Button>
                         </Link>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="py-6 bg-white">
                    <div className="flex flex-wrap gap-4 mb-6">
                      {order.orderItems.map((item) => (
                        <div key={item.id} className="flex items-center space-x-3 bg-gray-50 p-2 rounded-lg border border-gray-100 w-full sm:w-auto min-w-[200px]">
                           <div className="h-16 w-16 relative flex-shrink-0 bg-gray-200 rounded overflow-hidden">
                             {item.imageUrl ? (
                               <img src={item.imageUrl} alt={item.name} className="object-cover h-full w-full" />
                             ) : (
                               <div className="flex items-center justify-center h-full w-full bg-gray-100 text-gray-400">
                                 <ShoppingBag className="h-6 w-6" />
                               </div>
                             )}
                           </div>
                           <div className="flex-1 min-w-0">
                             <h4 className="text-sm font-bold text-gray-900 truncate">{item.name}</h4>
                             <p className="text-xs text-gray-500 uppercase">{item.size} • {item.color}</p>
                             <div className="flex items-center justify-between mt-1">
                               <span className="text-xs font-medium">Qty: {item.quantity}</span>
                               <span className="text-xs font-bold text-orange-600">ETB {item.price.toFixed(2)}</span>
                             </div>
                           </div>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                      <div className="flex items-start space-x-3">
                        <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Shipping Address</p>
                          <p className="text-sm text-gray-800">{order.deliveryAddress}</p>
                          <p className="text-sm text-gray-800">{order.city}</p>
                        </div>
                      </div>
                      <div className="flex flex-col justify-end items-end">
                        <div className="text-xs font-medium text-gray-500 mb-2">
                           {order.paymentStatus === 'paid' ? (
                             <span className="flex items-center text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100 uppercase tracking-tighter">
                               <CheckCircle2 className="h-3 w-3 mr-1" />
                               Paid
                             </span>
                           ) : (
                             <span className="flex items-center text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-100 uppercase tracking-tighter">
                               <AlertCircle className="h-3 w-3 mr-1" />
                               Payment Pending
                             </span>
                           )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Return Request Modal */}
        <Dialog open={isReturnModalOpen} onOpenChange={setIsReturnModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-orange-600" />
                Request Return
              </DialogTitle>
              <DialogDescription>
                Order #{selectedOrder?.id.split('-').pop()} • {selectedOrder && format(new Date(selectedOrder.createdAt), 'PP')}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Return</Label>
                <Select value={returnReason} onValueChange={setReturnReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wrong_size">Wrong Size</SelectItem>
                    <SelectItem value="defective">Defective/Damaged</SelectItem>
                    <SelectItem value="wrong_item">Wrong Item Sent</SelectItem>
                    <SelectItem value="not_as_described">Not as Described</SelectItem>
                    <SelectItem value="change_of_mind">Change of Mind</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="explanation">Additional Details</Label>
                <Textarea 
                  id="explanation"
                  placeholder="Please provide more information about the return..."
                  value={returnExplanation}
                  onChange={(e) => setReturnExplanation(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex gap-3 items-start">
                <AlertCircle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                <p className="text-xs text-orange-800 leading-relaxed font-medium italic">
                  Note: Returns are subject to inspection. Items must be unworn, unwashed, and have original tags attached as per our <Link href="/ecommerce/returns" target="_blank" className="underline font-bold">Return Policy</Link>.
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsReturnModalOpen(false)}>Cancel</Button>
              <Button 
                className="bg-orange-600 hover:bg-orange-700 text-white"
                onClick={submitReturnRequest}
                disabled={isSubmittingReturn || !returnReason}
              >
                {isSubmittingReturn ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cancellation Modal */}
        <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <XCircle className="h-5 w-5" />
                Cancel Order
              </DialogTitle>
              <DialogDescription>
                We're sorry to see you cancel. Please tell us why so we can improve.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="cancel-reason">Reason for Cancellation</Label>
                <Select value={cancelReason} onValueChange={setCancelReason}>
                  <SelectTrigger id="cancel-reason">
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="changed_mind">Changed my mind</SelectItem>
                    <SelectItem value="wrong_items">Ordered wrong items</SelectItem>
                    <SelectItem value="found_better_price">Found a better price elsewhere</SelectItem>
                    <SelectItem value="delivery_time">Delivery time is too long</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex gap-3 items-start">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <p className="text-xs text-red-800 leading-relaxed font-medium">
                  Note: Cancellation is immediate and cannot be undone. Any payments made will be refunded to your original payment method within 7-10 business days.
                </p>
              </div>
            </div>

            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsCancelModalOpen(false)}>Keep Order</Button>
              <Button 
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={cancelOrder}
                disabled={isSubmittingCancel || !cancelReason}
              >
                {isSubmittingCancel ? "Cancelling..." : "Confirm Cancellation"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
      <EcommerceFooter />
    </div>
  );
}
