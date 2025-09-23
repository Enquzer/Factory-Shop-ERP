
"use client";

import type { Order } from "@/lib/orders";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { ScrollArea } from "./ui/scroll-area";
import { format, parseISO } from "date-fns";

export function OrderDetailDialog({ order, open, onOpenChange }: { order: Order; open: boolean; onOpenChange: (open: boolean) => void }) {

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Order Details</DialogTitle>
          <DialogDescription>
            Order ID: {order.id}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pr-6">
                <div className="space-y-4">
                     <div>
                        <h3 className="font-semibold text-base">Shop Name</h3>
                        <p className="text-muted-foreground">{order.shopName}</p>
                    </div>
                     <div>
                        <h3 className="font-semibold text-base">Order Date</h3>
                        <p className="text-muted-foreground">{format(parseISO(order.date), "PPP")}</p>
                    </div>
                </div>
                <div className="space-y-4">
                     <div>
                        <h3 className="font-semibold text-base">Status</h3>
                        <p className="text-muted-foreground">
                            <Badge>{order.status}</Badge>
                        </p>
                    </div>
                    <div>
                        <h3 className="font-semibold text-base">Total Amount</h3>
                        <p className="text-primary font-bold text-lg">
                           ETB {order.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>
            </div>
            
            <div className="mt-6 pr-6">
                <h3 className="font-semibold text-lg mb-2">Items Ordered</h3>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">Image</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-center">Quantity</TableHead>
                            <TableHead className="text-right">Subtotal</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {order.items.map(item => (
                            <TableRow key={item.variant.id}>
                                <TableCell>
                                    <Image 
                                        src={item.imageUrl} 
                                        alt={item.name} 
                                        width={64} 
                                        height={80} 
                                        className="rounded-md object-cover bg-muted"
                                    />
                                </TableCell>
                                <TableCell>
                                    <div className="font-medium">{item.name}</div>
                                    <div className="text-sm text-muted-foreground">{item.variant.color}, {item.variant.size}</div>
                                </TableCell>
                                <TableCell className="text-center">{item.quantity}</TableCell>
                                <TableCell className="text-right">ETB {(item.price * item.quantity).toFixed(2)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </ScrollArea>
        <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
