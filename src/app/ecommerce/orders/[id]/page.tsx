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
  MapPin, 
  Clock, 
  CheckCircle2, 
  Truck, 
  AlertCircle, 
  ShoppingBag,
  ArrowLeft,
  ShoppingCart,
  User,
  CreditCard,
  History,
  Info,
  Edit2,
  Loader2,
  MessageSquare,
  Send,
  MessageCircle
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
  paymentMethod?: string;
  deliveryAddress: string;
  city: string;
  orderItems: OrderItem[];
  transportationCost: number;
  customerName: string;
  customerPhone: string;
  deliveryDistance?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  deliveryType?: string;
};

type SupportTicket = {
  id: string;
  orderId: string;
  subject: string;
  message: string;
  status: 'open' | 'closed';
  reply?: string;
  createdAt: string;
  updatedAt: string;
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, logout } = useCustomerAuth();
  const { itemCount } = useCart();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSupportSubmitting, setIsSupportSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSupportDialogOpen, setIsSupportDialogOpen] = useState(false);
  
  const [editData, setEditData] = useState({
    customerName: "",
    customerPhone: "",
    deliveryAddress: "",
    city: ""
  });

  const [supportData, setSupportData] = useState({
    subject: "Order Issue",
    message: ""
  });

  const fetchOrder = async () => {
    try {
      if (!user || !id) return;
      
      const token = localStorage.getItem('customerAuthToken');
      const response = await fetch(`/api/ecommerce/orders/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setOrder(data.order);
        setEditData({
          customerName: data.order.customerName,
          customerPhone: data.order.customerPhone,
          deliveryAddress: data.order.deliveryAddress,
          city: data.order.city
        });
        
        // Also fetch tickets
        fetchTickets(data.order.id);
      } else if (response.status === 404) {
        console.error("Order not found");
      }
    } catch (error) {
      console.error("Error fetching order:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTickets = async (orderId: string) => {
    try {
      const token = localStorage.getItem('customerAuthToken');
      const response = await fetch(`/api/ecommerce/support?orderId=${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets);
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchOrder();
    } else {
      setIsLoading(false);
    }
  }, [user, id]);

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    
    setIsUpdating(true);
    try {
      const token = localStorage.getItem('customerAuthToken');
      const response = await fetch(`/api/ecommerce/orders/${order.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editData)
      });
      
      if (response.ok) {
        toast({
          title: "Order Updated",
          description: "Your order details have been successfully updated.",
          className: "bg-green-600 text-white"
        });
        setOrder({
          ...order,
          ...editData
        });
        setIsDialogOpen(false);
      } else {
        const err = await response.json();
        toast({
          title: "Update Failed",
          description: err.error || "Could not update order.",
          variant: "destructive"
        });
      }
    } catch (error) {
       toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSubmitSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    
    setIsSupportSubmitting(true);
    try {
      const token = localStorage.getItem('customerAuthToken');
      const response = await fetch(`/api/ecommerce/support`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          orderId: order.id,
          ...supportData
        })
      });
      
      if (response.ok) {
        toast({
          title: "Message Sent",
          description: "Your message has been sent to the support team.",
          className: "bg-green-600 text-white"
        });
        setIsSupportDialogOpen(false);
        setSupportData({ subject: "Order Issue", message: "" });
        fetchTickets(order.id);
      } else {
        const err = await response.json();
        toast({
          title: "Failed to send",
          description: err.error || "Could not send support request.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setIsSupportSubmitting(false);
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

  const getStepStatus = (step: string) => {
    if (!order) return 'upcoming';
    
    const statusMap: Record<Order['status'], number> = {
      'pending': 0,
      'confirmed': 1,
      'processing': 2,
      'shipped': 3,
      'delivered': 4,
      'cancelled': -1
    };

    const currentStepIndex = statusMap[order.status];
    const stepIndices: Record<string, number> = {
      'Placed': 0,
      'Confirmed': 1,
      'Processing': 2,
      'Shipped': 3,
      'Delivered': 4
    };

    const targetIndex = stepIndices[step];
    
    if (order.status === 'cancelled') return 'cancelled';
    if (currentStepIndex >= targetIndex) return 'completed';
    if (currentStepIndex === targetIndex - 1) return 'active';
    return 'upcoming';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full text-center p-8">
          <AlertCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">{!user ? "Please Log In" : "Order Not Found"}</h2>
          <p className="text-gray-600 mb-6">{!user ? "You need to be logged in to view order details." : "We couldn't find the order you're looking for."}</p>
          <Link href={!user ? "/ecommerce/login" : "/ecommerce/orders"}>
            <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white">
              {!user ? "Login Now" : "Back to My Orders"}
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const subtotal = order.totalAmount;
  const shipping = order.transportationCost || 0;
  const total = subtotal + shipping;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <header className="bg-gradient-to-r from-green-900 to-green-800 shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Logo className="h-12" />
              <nav className="hidden md:flex space-x-6">
                <Link href="/ecommerce" className="text-white hover:text-green-200 transition-colors">
                  Home
                </Link>
                <Link href="/ecommerce/products" className="text-white hover:text-green-200 transition-colors">
                  Products
                </Link>
                <Link href="/ecommerce/orders" className="text-white hover:text-green-200 transition-colors font-medium">
                  My Orders
                </Link>
              </nav>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link href="/ecommerce/cart" className="relative p-2">
                <ShoppingCart className="h-6 w-6 text-orange-500 hover:text-orange-600 transition-colors" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-white animate-pulse">
                    {itemCount}
                  </span>
                )}
              </Link>
              
              <div className="flex items-center space-x-3">
                <span className="text-white font-medium hidden sm:inline">Hello, {user.firstName || user.username}</span>
                <Link href="/ecommerce/profile">
                    <Button variant="outline" size="sm" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                        <User className="h-4 w-4" />
                    </Button>
                </Link>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={logout}
                  className="border-white text-white hover:bg-white hover:text-green-900 transition-colors"
                >
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center space-x-4 mb-6">
            <Link href="/ecommerce/orders">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-orange-600">
                <ArrowLeft className="h-4 w-4 mr-2 text-orange-500" />
                Back to Orders
              </Button>
            </Link>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold text-gray-900">Order #{order.id.split('-').pop()}</h1>
                {getStatusBadge(order.status)}
              </div>
              <p className="text-gray-500 text-sm">Placed on {format(new Date(order.createdAt), 'MMMM d, yyyy • h:mm a')}</p>
            </div>
            <div className="flex gap-2">
               <Dialog open={isSupportDialogOpen} onOpenChange={setIsSupportDialogOpen}>
                 <DialogTrigger asChild>
                    <Button variant="outline" className="border-green-700 text-green-800 hover:bg-green-50">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Contact Support
                    </Button>
                 </DialogTrigger>
                 <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Contact Support for Order #{order.id.split('-').pop()}</DialogTitle>
                        <DialogDescription>
                            Have an issue or question about your order? Send us a message and our eCommerce manager will get back to you.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmitSupport} className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="support-subject">Subject / Issue Type</Label>
                            <Input 
                                id="support-subject"
                                placeholder="e.g. Delivery Delay, Incorrect Item, Refund Claim"
                                value={supportData.subject}
                                onChange={(e) => setSupportData({...supportData, subject: e.target.value})}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="support-message">How can we help you?</Label>
                            <Textarea 
                                id="support-message"
                                placeholder="Describe your issue or claim in detail..."
                                className="min-h-[120px]"
                                value={supportData.message}
                                onChange={(e) => setSupportData({...supportData, message: e.target.value})}
                                required
                            />
                        </div>
                        <div className="bg-slate-50 p-3 rounded text-[10px] text-slate-500 border border-slate-100 italic">
                            Your message will include your contact details ({order.customerName}, {order.customerPhone}) to help us assist you faster.
                        </div>
                        <DialogFooter className="pt-4">
                            <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white w-full sm:w-auto" disabled={isSupportSubmitting}>
                                {isSupportSubmitting ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
                                ) : (
                                    <><Send className="mr-2 h-4 w-4" /> Send Message</>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                 </DialogContent>
               </Dialog>
            </div>
          </div>

          {/* Progress Tracker */}
          <Card className="mb-8">
            <CardContent className="pt-8 pb-10">
                <div className="relative">
                    <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -translate-y-1/2 z-0"></div>
                    
                    <div className="flex justify-between items-center relative z-10 px-4 md:px-12">
                        {['Placed', 'Confirmed', 'Processing', 'Shipped', 'Delivered'].map((step, idx) => {
                            const status = getStepStatus(step);
                            return (
                                <div key={step} className="flex flex-col items-center">
                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center border-4 ${
                                        status === 'completed' ? 'bg-orange-600 border-orange-100 text-white' :
                                        status === 'active' ? 'bg-white border-orange-600 text-orange-600 animate-pulse' :
                                        status === 'cancelled' ? 'bg-red-500 border-red-100 text-white' :
                                        'bg-white border-gray-100 text-gray-300'
                                    }`}>
                                        {status === 'completed' ? <CheckCircle2 className="h-5 w-5" /> : 
                                         status === 'cancelled' && idx === 0 ? <AlertCircle className="h-5 w-5" /> :
                                         idx + 1}
                                    </div>
                                    <span className={`text-[10px] md:text-xs font-bold mt-2 ${
                                        status === 'completed' ? 'text-orange-600' :
                                        status === 'active' ? 'text-orange-600' :
                                        'text-gray-400'
                                    }`}>{step}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Items */}
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader className="pb-3 border-b border-gray-50">
                        <CardTitle className="text-lg flex items-center">
                            <ShoppingCart className="h-5 w-5 mr-3 text-gray-400" />
                            Order Items
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-gray-50">
                            {order.orderItems.map((item) => (
                                <div key={item.id} className="p-6 flex items-center gap-4">
                                    <div className="h-20 w-20 relative bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                        {item.imageUrl ? (
                                            <img src={item.imageUrl} alt={item.name} className="object-cover h-full w-full" />
                                        ) : (
                                            <div className="flex items-center justify-center h-full w-full">
                                                <Package className="h-8 w-8 text-gray-300" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-gray-900 mb-1">{item.name}</h3>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 uppercase font-medium">
                                            <span className="flex items-center">Color: <span className="ml-1 text-gray-900">{item.color}</span></span>
                                            <span className="flex items-center">Size: <span className="ml-1 text-gray-900">{item.size}</span></span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-gray-900">ETB {item.price.toFixed(2)}</div>
                                        <div className="text-sm text-gray-500 italic">Qty: {item.quantity}</div>
                                        <div className="text-sm font-bold text-orange-600 mt-1">
                                            ETB {(item.price * item.quantity).toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3 border-b border-gray-50">
                        <CardTitle className="text-lg flex items-center">
                            <Truck className="h-5 w-5 mr-3 text-gray-400" />
                            Shipping & Delivery
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-orange-50 rounded-lg">
                                        <MapPin className="h-5 w-5 text-orange-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm text-gray-900 mb-1">Standard Delivery</h4>
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            {order.customerName}<br />
                                            {order.deliveryAddress}<br />
                                            {order.city}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-blue-50 rounded-lg">
                                        <Info className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm text-gray-900 mb-1">Contact Details</h4>
                                        <p className="text-sm text-gray-600">{order.customerPhone}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <h4 className="font-bold text-sm text-gray-900 mb-2 flex items-center">
                                        <History className="h-4 w-4 mr-2" />
                                        Shipping Status
                                    </h4>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="h-2 w-2 rounded-full bg-orange-600"></div>
                                            <span className="text-xs text-gray-600">
                                              Distance: {(order.deliveryDistance !== null && order.deliveryDistance !== undefined && order.deliveryDistance > 0) 
                                                ? `${order.deliveryDistance.toFixed(2)} km` 
                                                : order.deliveryDistance === 0 ? 'Local Delivery' : 'Not available'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="h-2 w-2 rounded-full bg-orange-600"></div>
                                            <span className="text-xs text-gray-600">
                                                {order.status === 'delivered' ? 'Delivered to your doorstep' : 
                                                 order.status === 'shipped' ? 'On its way to you' : 
                                                 order.status === 'processing' ? 'Order is being prepared' :
                                                 order.status === 'confirmed' ? 'Order confirmed, awaiting preparation' :
                                                 order.status === 'cancelled' ? 'Order cancelled' :
                                                 'Awaiting dispatch'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Support Tickets Section */}
                {tickets.length > 0 && (
                    <Card>
                        <CardHeader className="pb-3 border-b border-gray-50">
                            <CardTitle className="text-lg flex items-center">
                                <MessageCircle className="h-5 w-5 mr-3 text-blue-600" />
                                Support History
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="space-y-6">
                                {tickets.map((ticket) => (
                                    <div key={ticket.id} className="relative pl-6 border-l-2 border-slate-100 space-y-3 pb-4">
                                        <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-white border-2 border-slate-200"></div>
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-bold text-sm text-gray-900">{ticket.subject}</h4>
                                            <Badge variant={ticket.status === 'open' ? 'outline' : 'default'} className={ticket.status === 'open' ? 'text-blue-600 border-blue-200 bg-blue-50' : 'bg-green-600'}>
                                                {ticket.status.toUpperCase()}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-gray-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            {ticket.message}
                                        </p>
                                        <div className="text-[10px] text-gray-400 font-medium italic">
                                            Submitted on {format(new Date(ticket.createdAt), 'MMM d, h:mm a')}
                                        </div>
                                        
                                        {ticket.reply && (
                                            <div className="mt-4 bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3">
                                                <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white flex-shrink-0">
                                                    <User className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-blue-900 mb-1">E-Commerce Manager</p>
                                                    <p className="text-sm text-blue-800 leading-relaxed">
                                                        {ticket.reply}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Right Column: Order Summary */}
            <div className="space-y-6">
                <Card className="sticky top-24">
                    <CardHeader>
                        <CardTitle className="text-lg">Order Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                             <div className="flex justify-between text-sm text-gray-600">
                                <span>Subtotal</span>
                                <span>ETB {subtotal.toFixed(2)}</span>
                             </div>
                             <div className="flex justify-between text-sm text-gray-600">
                                <span>Delivery Fee</span>
                                <span>{shipping === 0 ? <span className="text-green-600 font-bold uppercase text-[10px]">Free</span> : `ETB ${shipping.toFixed(2)}`}</span>
                             </div>
                             <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between font-bold text-lg text-gray-900">
                                <span>Total</span>
                                <span className="text-orange-600">ETB {total.toFixed(2)}</span>
                             </div>
                        </div>

                        <div className="pt-6 border-t border-gray-50">
                             <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Payment Method</h4>
                             <div className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-100 gap-3">
                                <div className="p-2 bg-white rounded shadow-sm">
                                    <CreditCard className="h-4 w-4 text-orange-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">{order.paymentMethod?.toUpperCase() || 'TELEBIRR'}</p>
                                    <p className="text-xs text-gray-500">{order.paymentStatus === 'paid' ? 'Transaction Completed' : 'Waiting for payment'}</p>
                                </div>
                                <div className="ml-auto">
                                    {order.paymentStatus === 'paid' ? (
                                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                                    ) : (
                                        <Clock className="h-5 w-5 text-yellow-500" />
                                    )}
                                </div>
                             </div>
                        </div>
                        
                        {order.status !== 'delivered' && order.status !== 'cancelled' && (
                             <div className="mt-6 p-4 bg-orange-50 border border-orange-100 rounded-lg flex gap-3">
                                <Clock className="h-5 w-5 text-orange-600 flex-shrink-0" />
                                <p className="text-xs text-orange-800 leading-relaxed font-medium">
                                    Thank you for your order! We are currently preparing your items for delivery. You will receive an update once it's on the way.
                                </p>
                             </div>
                        )}

                        {order.status === 'pending' ? (
                          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                              <Button className="w-full bg-green-700 hover:bg-green-800 text-white mt-4 font-bold" variant="default">
                                  <Edit2 className="h-4 w-4 mr-2" />
                                  Update Order Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                              <DialogHeader>
                                <DialogTitle>Edit Delivery Details</DialogTitle>
                                <DialogDescription>
                                  Update your contact name, phone, or delivery address for this order.
                                </DialogDescription>
                              </DialogHeader>
                              <form onSubmit={handleUpdateDetails} className="space-y-4 pt-4">
                                <div className="space-y-2">
                                  <Label htmlFor="edit-name">Recipient Name</Label>
                                  <Input 
                                    id="edit-name" 
                                    value={editData.customerName} 
                                    onChange={(e) => setEditData({...editData, customerName: e.target.value})}
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="edit-phone">Phone Number</Label>
                                  <Input 
                                    id="edit-phone" 
                                    value={editData.customerPhone} 
                                    onChange={(e) => setEditData({...editData, customerPhone: e.target.value})}
                                    required
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="edit-city">City</Label>
                                    <Input 
                                      id="edit-city" 
                                      value={editData.city} 
                                      onChange={(e) => setEditData({...editData, city: e.target.value})}
                                      required
                                    />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="edit-address">Delivery Address</Label>
                                  <Input 
                                    id="edit-address" 
                                    value={editData.deliveryAddress} 
                                    onChange={(e) => setEditData({...editData, deliveryAddress: e.target.value})}
                                    required
                                  />
                                </div>
                                <DialogFooter className="pt-4">
                                  <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white" disabled={isUpdating}>
                                    {isUpdating ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Updating...
                                      </>
                                    ) : (
                                      "Save Changes"
                                    )}
                                  </Button>
                                </DialogFooter>
                              </form>
                            </DialogContent>
                          </Dialog>
                        ) : (
                          <div className="mt-4 p-3 bg-gray-50 border border-gray-100 rounded text-xs text-gray-500 italic text-center">
                             Order is being processed and can no longer be modified.
                          </div>
                        )}
                    </CardContent>
                </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
