'use client';

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Order, getOrder } from "@/lib/orders";
import { Shop } from "@/lib/shops";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Calendar,
  Package,
  MapPin, 
  User,
  Truck,
  CheckCircle,
  Phone,
  Building,
  Info,
  Clock,
  Printer
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

export default function StoreOrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchData(params.id as string);
    }
  }, [params.id]);

  const fetchData = async (id: string) => {
    try {
      setLoading(true);
      const fetchedOrder = await getOrder(id);
      if (fetchedOrder) {
        setOrder(fetchedOrder);
        
        // Include token for authorization
        const token = localStorage.getItem('authToken');
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        // Fetch shop details for full destination info
        const shopRes = await fetch(`/api/shops?id=${fetchedOrder.shopId}`, { headers });
        if (shopRes.ok) {
          const shopData = await shopRes.json();
          setShop(shopData);
        }
      }
    } catch (err) {
      console.error("Error fetching order details:", err);
      toast({
        title: "Error",
        description: "Failed to load order details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDispatch = async () => {
    if (!order) return;
    
    try {
      setProcessing(true);
      
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/orders/${order.id}/dispatch`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          status: 'Dispatched',
          actionBy: 'store'
        })
      });

      if (res.ok) {
        toast({
          title: "Order Dispatched",
          description: `Order ${order.id} has been marked as dispatched.`,
        });
        fetchData(order.id);
      } else {
        const data = await res.json();
        toast({
          title: "Error",
          description: data.error || 'Failed to dispatch order',
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error('Dispatch error:', err);
      toast({
        title: "Error",
        description: 'Failed to dispatch order',
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const printDispatchNote = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6 text-center">
        <div className="bg-red-50 text-red-500 p-4 rounded-md inline-block">
          Order not found
        </div>
        <div className="mt-4">
            <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 print:p-0">
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Order Details</h1>
            <div className="flex items-center text-sm text-muted-foreground mt-1">
              <span className="font-mono">{order.id}</span>
              <span className="mx-2">•</span>
              <Calendar className="mr-1 h-3 w-3" />
              {new Date(order.date).toLocaleDateString()}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={printDispatchNote}>
                <Printer className="mr-2 h-4 w-4" /> Print Dispatch Note
            </Button>
            {order.status === 'Released' || order.status === 'Paid' ? (
                <Button 
                    className="bg-blue-600 hover:bg-blue-700 shadow-md"
                    onClick={handleDispatch}
                    disabled={processing}
                >
                    {processing ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                        <Truck className="mr-2 h-4 w-4" />
                    )}
                    {processing ? "Processing..." : "Dispatch Now"}
                </Button>
            ) : (
                <Badge 
                    className={
                        order.status === 'Dispatched' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                    }
                >
                    {order.status}
                </Badge>
            )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content: Items Table */}
        <div className="md:col-span-2 space-y-6">
            <Card className="border-none shadow-lg overflow-hidden">
                <CardHeader className="bg-gray-50/50">
                    <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-blue-600" />
                        Order Breakdown - {order.shopName}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-left p-4 font-medium text-muted-foreground">Product</th>
                                    <th className="text-left p-4 font-medium text-muted-foreground">Variant</th>
                                    <th className="text-center p-4 font-medium text-muted-foreground">Qty</th>
                                    <th className="text-right p-4 font-medium text-muted-foreground">Price</th>
                                    <th className="text-right p-4 font-medium text-muted-foreground">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {order.items.map((item, index) => (
                                    <tr key={index} className="hover:bg-gray-50/50">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 bg-gray-100 rounded overflow-hidden">
                                                    {item.imageUrl ? (
                                                        <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <div className="h-full w-full flex items-center justify-center text-gray-400">
                                                            <Package className="h-5 w-5" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="font-medium">{item.name}</div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-muted-foreground">
                                            {item.variant?.color || 'N/A'} / {item.variant?.size || 'N/A'}
                                        </td>
                                        <td className="p-4 text-center font-bold">
                                            {item.quantity}
                                        </td>
                                        <td className="p-4 text-right">
                                            {item.price.toLocaleString()} ETB
                                        </td>
                                        <td className="p-4 text-right font-medium">
                                            {(item.price * item.quantity).toLocaleString()} ETB
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-gray-50 font-bold">
                                    <td colSpan={4} className="p-4 text-right">Grand Total</td>
                                    <td className="p-4 text-right text-lg text-primary">{order.amount.toLocaleString()} ETB</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Packaging / Dispatch Notes Box */}
            <Card className="border-none shadow-md">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2 font-semibold">
                        <Info className="h-4 w-4 text-blue-500" />
                        Packaging & Instructions
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="p-4 rounded-lg bg-blue-50 border border-blue-100 text-sm text-blue-800">
                        Please ensure all items are double-checked against the packing list before loading for delivery. 
                        Attach the printed dispatch note to the external packaging.
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Sidebar: Delivery and Shop Info */}
        <div className="space-y-6">
            <Card className="border-none shadow-lg overflow-hidden">
                <CardHeader className="bg-blue-600 text-white">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <MapPin className="h-5 w-5" />
                        Full Destination Info
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                    <div>
                        <Label className="text-xs uppercase text-muted-foreground">Shop Name</Label>
                        <div className="flex items-center gap-2 mt-1">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            <span className="font-bold text-lg">{order.shopName}</span>
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <MapPin className="h-4 w-4 text-red-500 mt-1" />
                            <div>
                                <Label className="text-xs uppercase text-muted-foreground">Exact Location</Label>
                                <p className="font-medium">{shop?.exactLocation || 'Loading...'}</p>
                                <p className="text-muted-foreground">{shop?.city}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <User className="h-4 w-4 text-blue-500 mt-1" />
                            <div>
                                <Label className="text-xs uppercase text-muted-foreground">Contact Person</Label>
                                <p className="font-medium">{shop?.contactPerson || 'Loading...'}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <Phone className="h-4 w-4 text-green-500 mt-1" />
                            <div>
                                <Label className="text-xs uppercase text-muted-foreground">Contact Phone</Label>
                                <p className="font-medium">{shop?.contactPhone || 'Loading...'}</p>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                        <div className="flex justify-between text-sm py-1 border-b border-dashed">
                            <span className="text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Requested:
                            </span>
                            <span className="font-medium">As soon as possible</span>
                        </div>
                        <div className="flex justify-between text-sm py-1 border-b border-dashed">
                             <span className="text-muted-foreground">Verification:</span>
                             <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 h-5">Verified</Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {shop?.tradeLicenseNumber && (
                <Card className="border-none shadow-md bg-gray-50/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase text-muted-foreground font-semibold">Business Documents</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">License #</span>
                            <span className="font-mono">{shop.tradeLicenseNumber}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">TIN #</span>
                            <span className="font-mono">{shop.tinNumber}</span>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .shadow-lg, .shadow-md { box-shadow: none !important; border: 1px solid #eee !important; }
        }
      `}</style>
    </div>
  );
}

const Label = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <span className={`block font-semibold ${className}`}>{children}</span>
);
