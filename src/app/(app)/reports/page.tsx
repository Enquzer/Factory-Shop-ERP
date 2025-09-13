
"use client";

import { useState } from "react";
import { format, subDays } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Calendar as CalendarIcon, FilterX, FileDown, FileSpreadsheet } from "lucide-react";
// import jsPDF from "jspdf";
// import autoTable from 'jspdf-autotable';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { products as allProducts } from "@/lib/products";
import { shops as allShops } from "@/lib/shops";

const generateDate = (daysAgo: number) => subDays(new Date(), daysAgo);

const fullOrderHistory = [
    { orderId: 'ORD-101', date: generateDate(2), shopName: "Adama Modern", items: [{productId: "WSD-012", quantity: 20}, {productId: "UDJ-007", quantity: 10}] },
    { orderId: 'ORD-102', date: generateDate(5), shopName: "Bole Boutique", items: [{productId: "MCT-001", quantity: 50}, {productId: "MST-002", quantity: 30}] },
    { orderId: 'ORD-103', date: generateDate(8), shopName: "Hawassa Habesha", items: [{productId: "KGH-034", quantity: 25}] },
    { orderId: 'ORD-104', date: generateDate(12), shopName: "Merkato Style", items: [{productId: "WSD-012", quantity: 15}, {productId: "MCT-001", quantity: 20}] },
    { orderId: 'ORD-105', date: generateDate(15), shopName: "Adama Modern", items: [{productId: "WJP-005", quantity: 12}] },
    { orderId: 'ORD-106', date: generateDate(20), shopName: "Bole Boutique", items: [{productId: "UDJ-007", quantity: 15}, {productId: "KGH-034", quantity: 10}] },
    { orderId: 'ORD-107', date: generateDate(25), shopName: "Adama Modern", items: [{productId: "MCT-001", quantity: 40}] },
    { orderId: 'ORD-108', date: generateDate(35), shopName: "Merkato Style", items: [{productId: "MST-002", quantity: 20}, {productId: "WJP-005", quantity: 5}] },
    { orderId: 'ORD-109', date: generateDate(40), shopName: "Hawassa Habesha", items: [{productId: "WSD-012", quantity: 10}] },
];

type ReportItem = {
    orderId: string;
    date: string;
    shopName: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
}


export default function ReportsPage() {
    const [date, setDate] = useState<DateRange | undefined>({
        from: subDays(new Date(), 29),
        to: new Date(),
    });
    const [selectedShop, setSelectedShop] = useState<string>("all");
    const [selectedProduct, setSelectedProduct] = useState<string>("all");

    const getFilteredReport = () => {
        let reportData: ReportItem[] = [];

        const filteredOrders = fullOrderHistory.filter(order => {
            if (date && date.from) {
                 const to = date.to || new Date();
                 if(order.date < date.from || order.date > to) return false;
            }
            if (selectedShop !== "all" && order.shopName !== selectedShop) {
                return false;
            }
            return true;
        });

        filteredOrders.forEach(order => {
            order.items.forEach(item => {
                const product = allProducts.find(p => p.id === item.productId);
                if (!product) return;

                if (selectedProduct !== "all" && item.productId !== selectedProduct) {
                    return;
                }

                reportData.push({
                    orderId: order.orderId,
                    date: format(order.date, "LLL dd, y"),
                    shopName: order.shopName,
                    productName: product.name,
                    quantity: item.quantity,
                    unitPrice: product.price,
                    total: item.quantity * product.price,
                });
            });
        });
        
        return reportData;
    }
    
    const reportData = getFilteredReport();
    const totalRevenue = reportData.reduce((sum, item) => sum + item.total, 0);

    const clearFilters = () => {
        setDate({ from: subDays(new Date(), 29), to: new Date() });
        setSelectedShop("all");
        setSelectedProduct("all");
    }

    const exportToCSV = () => {
        const headers = ["Order ID", "Date", "Shop", "Product", "Quantity", "Unit Price (ETB)", "Total (ETB)"];
        const rows = reportData.map(item => 
            [item.orderId, item.date, `"${item.shopName}"`, `"${item.productName}"`, item.quantity, item.unitPrice.toFixed(2), item.total.toFixed(2)].join(',')
        );
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    const exportToPDF = () => {
        // const doc = new jsPDF();
        // doc.text("Filtered Report", 14, 16);
        
        // const tableColumn = ["Order ID", "Date", "Shop", "Product", "Qty", "Unit Price", "Total"];
        // const tableRows: (string | number)[][] = [];

        // reportData.forEach(item => {
        //     const ticketData = [
        //         item.orderId,
        //         item.date,
        //         item.shopName,
        //         item.productName,
        //         item.quantity,
        //         `ETB ${item.unitPrice.toFixed(2)}`,
        //         `ETB ${item.total.toFixed(2)}`,
        //     ];
        //     tableRows.push(ticketData);
        // });

        // autoTable(doc, {
        //     head: [tableColumn],
        //     body: tableRows,
        //     startY: 20,
        // });

        // const finalY = (doc as any).lastAutoTable.finalY;
        // doc.setFontSize(12);
        // doc.text(`Total Revenue: ETB ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, finalY + 15);
        
        // doc.save("report.pdf");
    }

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-semibold">Reports</h1>
            
            <Card>
                <CardHeader>
                    <CardTitle>Filters</CardTitle>
                    <CardDescription>Refine your report using the filters below.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                     <Popover>
                        <PopoverTrigger asChild>
                            <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                                "w-full justify-start text-left font-normal",
                                !date && "text-muted-foreground"
                            )}
                            >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date?.from ? (
                                date.to ? (
                                <>
                                    {format(date.from, "LLL dd, y")} -{" "}
                                    {format(date.to, "LLL dd, y")}
                                </>
                                ) : (
                                format(date.from, "LLL dd, y")
                                )
                            ) : (
                                <span>Pick a date</span>
                            )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={date?.from}
                            selected={date}
                            onSelect={setDate}
                            numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>

                    <Select value={selectedShop} onValueChange={setSelectedShop}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a shop" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Shops</SelectItem>
                            {allShops.map(shop => (
                                <SelectItem key={shop.id} value={shop.name}>{shop.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a product" />
                        </SelectTrigger>
                        <SelectContent>
                             <SelectItem value="all">All Products</SelectItem>
                            {allProducts.map(product => (
                                <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button variant="ghost" onClick={clearFilters} className="flex items-center gap-2">
                        <FilterX className="h-4 w-4" />
                        Clear Filters
                    </Button>

                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Filtered Report</CardTitle>
                        <CardDescription>
                            Displaying {reportData.length} transaction(s) matching your criteria.
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="icon" onClick={exportToCSV} disabled={reportData.length === 0}>
                            <FileSpreadsheet className="h-4 w-4" />
                            <span className="sr-only">Export to Excel</span>
                        </Button>
                        <Button variant="outline" size="icon" onClick={exportToPDF} disabled={true || reportData.length === 0}>
                            <FileDown className="h-4 w-4" />
                            <span className="sr-only">Export to PDF</span>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order ID</TableHead>
                                <TableHead className="hidden lg:table-cell">Date</TableHead>
                                <TableHead>Shop</TableHead>
                                <TableHead>Product</TableHead>
                                <TableHead className="text-right">Qty</TableHead>
                                <TableHead className="text-right hidden sm:table-cell">Unit Price</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reportData.length > 0 ? (
                                reportData.map((item, index) => (
                                    <TableRow key={`${item.orderId}-${index}`}>
                                        <TableCell className="font-medium">
                                            {item.orderId}
                                            <div className="text-muted-foreground text-xs lg:hidden">{item.date}</div>
                                        </TableCell>
                                        <TableCell className="hidden lg:table-cell">{item.date}</TableCell>
                                        <TableCell>{item.shopName}</TableCell>
                                        <TableCell>{item.productName}</TableCell>
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                        <TableCell className="text-right hidden sm:table-cell">ETB {item.unitPrice.toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-semibold">ETB {item.total.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                        No transactions found for the selected filters.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
                <CardFooter className="flex justify-end bg-muted/50 p-4">
                    <div className="text-lg font-bold">
                        Total Revenue: ETB {totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </CardFooter>
            </Card>
        </div>
    )
}
