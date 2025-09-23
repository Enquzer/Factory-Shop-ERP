

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOrder } from "@/hooks/use-order";
import { Eye, Download, CreditCard, Truck, CheckCircle, Loader2 } from "lucide-react";
import type { Order, OrderStatus } from "@/lib/orders";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ordersStore } from "@/lib/orders";
import { createNotification } from "@/lib/notifications";
import { addItemsToShopInventory } from "@/lib/shop-inventory";
import { getShopById, type Shop } from "@/lib/shops";
import { useEffect, useState } from "react";


const statusVariants: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
    Pending: 'default',
    'Awaiting Payment': 'secondary',
    Paid: 'outline',
    Dispatched: 'outline',
    Delivered: 'secondary',
    Cancelled: 'destructive'
};

const generateOrderConfirmationPDF = (order: Order, shop: Shop) => {
    const doc = new jsPDF();
    const discountedPrice = order.amount;
    const originalPrice = order.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const totalQuantity = order.items.reduce((acc, item) => acc + item.quantity, 0);

    // Header
    doc.setFontSize(20);
    doc.text("Order Confirmation", 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Order ID: ${order.id}`, 14, 30);
    doc.text(`Date: ${order.date}`, 14, 36);

    // Shop Info
    doc.text(`Shop Name: ${shop.name}`, 120, 30);
    doc.text(`Contact Person: ${shop.contactPerson}`, 120, 36);
    
    const body = order.items.map(item => {
        const itemDiscountedPrice = item.price * (1 - shop.discount);
        return [
            { content: item.productCode, styles: { valign: 'middle' } },
            { content: `${item.variant.color}, ${item.variant.size}`, styles: { valign: 'middle' } },
            { content: item.quantity.toString(), styles: { valign: 'middle', halign: 'center' } },
            { content: `ETB ${item.price.toFixed(2)}`, styles: { valign: 'middle' } },
            { content: `ETB ${itemDiscountedPrice.toFixed(2)}`, styles: { valign: 'middle' } },
        ]
    });
    
    // Create a new array for autotable that includes the image
    const tableBody = order.items.map(item => ([
        '', // Placeholder for image
        item.productId,
        `${item.name}\n${item.variant.color}, ${item.variant.size}`,
        item.quantity,
        `ETB ${item.price.toFixed(2)}`,
        `ETB ${(item.price * (1-shop.discount)).toFixed(2)}`,
        `ETB ${(item.price * (1-shop.discount) * item.quantity).toFixed(2)}`,
    ]));

    autoTable(doc, {
        startY: 45,
        head: [['Image', 'Code', 'Product', 'Qty', 'Unit Price', 'Discounted Price', 'Subtotal']],
        body: tableBody,
        theme: 'grid',
        didDrawCell: (data) => {
            if (data.column.index === 0 && data.cell.section === 'body') {
                const item = order.items[data.row.index];
                if (item.imageUrl) {
                    try {
                        doc.addImage(item.imageUrl, 'JPEG', data.cell.x + 2, data.cell.y + 2, 15, 18);
                    } catch (e) {
                        console.error("Error adding image to PDF:", e);
                        doc.text("No img", data.cell.x + 2, data.cell.y + 10)
                    }
                }
            }
        },
        rowPageBreak: 'auto',
        styles: {
            valign: 'middle'
        },
        headStyles: {
            fillColor: [41, 128, 185], // A nice blue
            textColor: 255,
            fontStyle: 'bold',
        },
         columnStyles: {
            0: { cellWidth: 20 },
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 100;
    
    // Summary section
    doc.setFontSize(12);
    doc.text("Order Summary", 14, finalY + 15);
    autoTable(doc, {
        startY: finalY + 20,
        body: [
            ['Total Quantity:', totalQuantity.toString()],
            ['Original Total:', `ETB ${originalPrice.toFixed(2)}`],
            ['Discount:', `${(shop.discount * 100).toFixed(0)}%`],
            ['Discounted Total:', `ETB ${discountedPrice.toFixed(2)}`],
        ],
        theme: 'plain',
        styles: {
            fontSize: 12,
        }
    });

    doc.save(`order-${order.id}.pdf`);
}


const ShopActionButton = ({ order, shop }: { order: Order, shop: Shop | null }) => {
    const handleStatusChange = async (order: Order, status: OrderStatus) => {
        await ordersStore.updateOrderStatus(order.id, status);

        if (status === 'Delivered') {
            await addItemsToShopInventory(order.shopId, order.items);
        }

        // Create notification for the factory
        createNotification({
            userType: 'factory',
            title: `Order Status Updated`,
            description: `Order #${order.id} from ${order.shopName} is now '${status}'`,
            href: '/orders',
        });
    }
    
    const handleDownload = () => {
        if (shop) {
            generateOrderConfirmationPDF(order, shop);
        }
    }


    switch (order.status) {
        case 'Awaiting Payment':
            return (
                <>
                    <Button size="sm" onClick={() => handleStatusChange(order, 'Paid')}>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Mark as Paid
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleDownload}>
                        <Download className="h-4 w-4" />
                        <span className="sr-only">Download Invoice</span>
                    </Button>
                </>
            );
        case 'Dispatched':
             return (
                <>
                    <Button size="sm" onClick={() => handleStatusChange(order, 'Delivered')}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Confirm Receipt
                    </Button>
                     <Button variant="ghost" size="icon" onClick={handleDownload}>
                        <Download className="h-4 w-4" />
                        <span className="sr-only">Download Invoice</span>
                    </Button>
                </>
            );
        case 'Pending':
             return (
                <div className="flex items-center text-sm text-muted-foreground">
                   <Truck className="mr-2 h-4 w-4" /> Awaiting Confirmation
                </div>
            );
        default:
             return (
                 <Button variant="ghost" size="icon" onClick={handleDownload}>
                    <Download className="h-4 w-4" />
                    <span className="sr-only">Download Invoice</span>
                </Button>
            );
    }
}


export default function ShopOrdersPage() {
    const { orders, isLoading, shopId } = useOrder();
    const [shop, setShop] = useState<Shop|null>(null);

    useEffect(() => {
        const fetchShop = async () => {
            const shopData = await getShopById(shopId);
            setShop(shopData);
        }
        if (shopId) {
            fetchShop();
        }
    }, [shopId]);

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">My Orders</h1>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Order History</CardTitle>
                    <CardDescription>View and track all your past and current orders.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading || !shop ? (
                        <div className="flex items-center justify-center h-48">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Order ID</TableHead>
                                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="text-center">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders.length > 0 ? (
                                    orders.map((order) => (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-medium">{order.id}</TableCell>
                                            <TableCell className="hidden sm:table-cell">{order.date}</TableCell>
                                            <TableCell>
                                                <Badge variant={statusVariants[order.status]}>{order.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">ETB {order.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                            <TableCell className="text-center space-x-2">
                                                <ShopActionButton order={order} shop={shop} />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                            You haven't placed any orders yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
