"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Order, getOrder } from "@/lib/orders";
import { 
  ArrowLeft, 
  Calendar, 
  CreditCard, 
  Package, 
  FileText,
  Truck,
  CheckCircle,
  Upload,
  X,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingBar } from "@/components/loading-bar";
import { format } from "date-fns";
import Image from "next/image";
import { createAuthHeaders } from "@/lib/auth-helpers";

export default function ShopOrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Payment states
  const [paymentSlipFile, setPaymentSlipFile] = useState<File | null>(null);
  const [paymentSlipPreview, setPaymentSlipPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        setPaymentSlipFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setPaymentSlipPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  const handlePaymentSubmit = async () => {
    if (!order || !paymentSlipFile) return;

    try {
        setIsUploading(true);
        // 1. Upload the file
        const formData = new FormData();
        formData.append('file', paymentSlipFile);
        formData.append('filename', `payment-slip-${order.id}-${Date.now()}.${paymentSlipFile.name.split('.').pop()}`);
        
        const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
        });

        if (!uploadResponse.ok) throw new Error('Failed to upload payment slip');
        const { imageUrl } = await uploadResponse.json();

        // 2. Submit payment confirmation
        const response = await fetch(`/api/orders/${order.id}/payment`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...createAuthHeaders()
            },
            body: JSON.stringify({ paymentSlipUrl: imageUrl }),
        });

        if (!response.ok) throw new Error('Failed to confirm payment');

        // Reset and refresh
        setPaymentSlipFile(null);
        setPaymentSlipPreview(null);
        await fetchOrder(order.id);
        alert("Payment slip uploaded successfully! Finance will verify it soon.");
    } catch (error) {
        console.error("Error confirming payment:", error);
        alert("Failed to submit payment. Please try again.");
    } finally {
        setIsUploading(false);
    }
  };

  const statusColors: Record<string, string> = {
    'Pending': 'bg-gray-100 text-gray-800',
    'Awaiting Payment': 'bg-yellow-100 text-yellow-800 border-yellow-200',
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
        <Button onClick={() => router.push('/shop/orders')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go to My Orders
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
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Items Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div key={index} className="flex gap-4 items-start border-b pb-4 last:border-0 last:pb-0">
                    <div className="relative h-16 w-16 bg-muted rounded overflow-hidden border">
                      {item.imageUrl || item.variant.imageUrl ? (
                        <Image 
                          src={item.imageUrl || item.variant.imageUrl || ''} 
                          alt={item.name} 
                          fill 
                          className="object-cover" 
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          <Package className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{item.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {item.variant.color}, {item.variant.size}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">{item.quantity} x ETB {item.price.toLocaleString()}</p>
                      <p className="font-bold">ETB {(item.quantity * item.price).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
                <div className="pt-4 border-t flex justify-between items-center font-bold">
                  <span>Total Amount</span>
                  <span className="text-lg text-primary">ETB {order.amount.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Section */}
          <Card className={order.paymentRequested && order.status === 'Awaiting Payment' ? "border-orange-500 bg-orange-50/10" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Confirmation
              </CardTitle>
              {order.paymentRequested && order.status === 'Awaiting Payment' && (
                <CardDescription className="text-orange-600 font-medium flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Finance requested immediate payment for this order.
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {order.status === 'Awaiting Payment' || order.status === 'Pending' ? (
                <div className="space-y-4">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <input 
                      type="file" 
                      className="hidden" 
                      ref={fileInputRef} 
                      onChange={handleFileChange}
                      accept="image/*"
                    />
                    {paymentSlipPreview ? (
                      <div className="relative h-48 w-full">
                        <Image src={paymentSlipPreview} alt="Preview" fill className="object-contain" />
                        <Button 
                          variant="destructive" 
                          size="icon" 
                          className="absolute -top-2 -right-2 rounded-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPaymentSlipFile(null);
                            setPaymentSlipPreview(null);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <p className="font-medium">Click to upload payment slip</p>
                        <p className="text-xs text-muted-foreground">PNG, JPG or PDF (Max 5MB)</p>
                      </div>
                    )}
                  </div>
                  <Button 
                    className="w-full" 
                    disabled={!paymentSlipFile || isUploading}
                    onClick={handlePaymentSubmit}
                  >
                    {isUploading ? "Uploading..." : "Submit Payment Confirmation"}
                  </Button>
                </div>
              ) : order.paymentSlipUrl ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600 font-medium p-3 bg-green-50 rounded-md">
                    <CheckCircle className="h-5 w-5" />
                    Payment slip has been uploaded
                  </div>
                  <div className="relative h-64 w-full border rounded overflow-hidden">
                    <Image src={order.paymentSlipUrl} alt="Payment Slip" fill className="object-contain" />
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => window.open(order.paymentSlipUrl, '_blank')}>
                    View Full Image
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground italic">No payment details available.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Order Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex justify-between items-start">
                <span className="text-muted-foreground">Status</span>
                <Badge className={statusColors[order.status]}>{order.status}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order Date</span>
                <span>{format(new Date(order.date), "MMM d, yyyy")}</span>
              </div>
              {order.requestedDeliveryDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Requested Delivery</span>
                  <span>{format(new Date(order.requestedDeliveryDate), "MMM d, yyyy")}</span>
                </div>
              )}
              <div className="pt-4 border-t">
                <p className="font-medium mb-1">Shipping Address</p>
                <p className="text-muted-foreground">{order.shopName}</p>
                {/* Normally we'd fetch shop address here */}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => window.open(`/api/orders/${order.id}/pdf`, '_blank')}
              >
                <FileText className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
