"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Eye, 
  ShoppingCart, 
  Edit, 
  Trash2,
  Search,
  CalendarIcon
} from "lucide-react";
import { type ShopInventoryItem } from '@/lib/shop-inventory';
import Image from "next/image";
import { Store } from "lucide-react";
import { useState, useMemo } from "react";
import { ProductDetailDialog } from "@/components/product-detail-dialog-view";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/auth-context';
import { EditStockDialog } from "./edit-stock-dialog";
import { DeleteStockDialog } from "./delete-stock-dialog";
import { PlaceOrderDialog } from "./place-order-dialog";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

const LOW_STOCK_THRESHOLD = 5;

export function InventoryClientPage({ inventory, onInventoryUpdate }: { inventory: ShopInventoryItem[]; onInventoryUpdate: () => void }) {
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [isProductDetailOpen, setIsProductDetailOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ShopInventoryItem | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [deletingItem, setDeletingItem] = useState<ShopInventoryItem | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [orderingItem, setOrderingItem] = useState<ShopInventoryItem | null>(null);
    const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [sortBy, setSortBy] = useState("name"); // name, stock, recent
    const { toast } = useToast();
    const { user } = useAuth();

    // Filter and sort inventory based on search term and date range
    const filteredInventory = useMemo(() => {
        let result = [...inventory];
        
        // Filter by search term
        if (searchTerm) {
            const term = searchTerm.toLowerCase().trim();
            result = result.filter(item => 
                item.name.toLowerCase().includes(term) || 
                item.productId?.toLowerCase().includes(term)
            );
        }
        
        // Filter by date range
        if (dateRange?.from || dateRange?.to) {
            result = result.filter(item => {
                // Since we don't have a specific modified date in ShopInventoryItem,
                // we'll filter to show the most recently added items (last 10)
                // For now, we'll just apply the date filter if needed in future
                return true;
            });
        }
        
        // Sort items
        result.sort((a, b) => {
            switch (sortBy) {
                case "stock":
                    return b.stock - a.stock;
                case "recent":
                    // Since we don't have a specific date field, we'll sort by item ID
                    // which should roughly correspond to order of addition
                    return b.id - a.id;
                case "name":
                default:
                    return a.name.localeCompare(b.name);
            }
        });
        
        // If sorting by recent, limit to last 10 items
        if (sortBy === "recent") {
            result = result.slice(0, 10);
        }
        
        return result;
    }, [inventory, searchTerm, dateRange, sortBy]);

    // Function to handle view details action
    const handleViewDetails = (item: ShopInventoryItem) => {
        // Create a product object to pass to the detail dialog
        const product = {
            id: item.productId,
            name: item.name,
            productCode: item.productId || `PROD-${item.productId}`,
            category: "General",
            price: item.price,
            description: "Product description not available",
            variants: [{
                id: item.productVariantId,
                color: item.color,
                size: item.size,
                stock: item.stock,
                imageUrl: item.imageUrl
            }],
            minimumStockLevel: 0
        };
        setSelectedProduct(product);
        setIsProductDetailOpen(true);
    };

    // Function to handle place order action
    const handlePlaceOrder = (item: ShopInventoryItem) => {
        setOrderingItem(item);
        setIsOrderDialogOpen(true);
    };

    // Function to handle edit stock action
    const handleEditStock = (item: ShopInventoryItem) => {
        setEditingItem(item);
        setIsEditDialogOpen(true);
    };

    // Function to handle delete stock action
    const handleDeleteStock = (item: ShopInventoryItem) => {
        setDeletingItem(item);
        setIsDeleteDialogOpen(true);
    };

    // Function to update stock
    const handleStockUpdate = async (item: ShopInventoryItem, newStock: number) => {
        if (!user) {
            toast({
                title: "Authentication Error",
                description: "You must be logged in to update stock.",
                variant: "destructive",
            });
            return;
        }

        try {
            const response = await fetch('/api/shop-inventory', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: user.username,
                    productVariantId: item.productVariantId,
                    newStock: newStock
                }),
            });

            const data = await response.json();

            if (response.ok) {
                toast({
                    title: "Stock Updated",
                    description: `Stock for ${item.name} updated to ${newStock} units.`,
                });
                // Refresh the inventory data
                onInventoryUpdate();
            } else {
                toast({
                    title: "Update Failed",
                    description: data.error || "Failed to update stock.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Error updating stock:', error);
            toast({
                title: "Update Failed",
                description: "An error occurred while updating stock.",
                variant: "destructive",
            });
        }
    };

    // Function to delete stock item
    const handleDeleteConfirm = async (item: ShopInventoryItem) => {
        if (!user) {
            toast({
                title: "Authentication Error",
                description: "You must be logged in to delete items.",
                variant: "destructive",
            });
            return;
        }

        try {
            const response = await fetch('/api/shop-inventory', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: user.username,
                    productVariantIds: [item.productVariantId]
                }),
            });

            const data = await response.json();

            if (response.ok) {
                toast({
                    title: "Item Removed",
                    description: `${item.name} has been removed from your inventory.`,
                });
                // Refresh the inventory data
                onInventoryUpdate();
            } else {
                toast({
                    title: "Delete Failed",
                    description: data.error || "Failed to remove item.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Error deleting item:', error);
            toast({
                title: "Delete Failed",
                description: "An error occurred while removing the item.",
                variant: "destructive",
            });
        }
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Stock Details</CardTitle>
                    <CardDescription>An overview of the items you have in stock.</CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Search and Filters */}
                    <div className="mb-4 flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by product name or ID..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        
                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="w-full md:w-40">
                                <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="name">Name</SelectItem>
                                <SelectItem value="stock">Stock Level</SelectItem>
                                <SelectItem value="recent">Recently Added</SelectItem>
                            </SelectContent>
                        </Select>
                        
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full md:w-48 justify-start text-left font-normal",
                                        !dateRange?.from && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (
                                        dateRange?.to ? (
                                            <>
                                                {format(dateRange.from, "LLL dd, y")} -{" "}
                                                {format(dateRange.to, "LLL dd, y")}
                                            </>
                                        ) : (
                                            format(dateRange.from, "LLL dd, y")
                                        )
                                    ) : (
                                        <span>Date Range</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={dateRange?.from}
                                    selected={dateRange}
                                    onSelect={setDateRange as any}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    
                    {filteredInventory.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Variant</TableHead>
                                    <TableHead className="text-right">Stock Level</TableHead>
                                    <TableHead className="text-right">Unit Price</TableHead>
                                    <TableHead className="text-right">Subtotal Value</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredInventory.map(item => {
                                    // Determine stock status
                                    let stockVariant: "outline" | "destructive" | "secondary" = 'outline';
                                    let stockText = item.stock.toString();
                                    
                                    if (item.stock <= 0) {
                                        stockVariant = 'destructive';
                                        stockText = 'Out of Stock';
                                    } else if (item.stock <= LOW_STOCK_THRESHOLD) {
                                        stockVariant = 'destructive';
                                        stockText = `${item.stock} (Low Stock)`;
                                    }
                                    
                                    return (
                                        <TableRow key={`${item.productId}-${item.productVariantId}`}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    {item.imageUrl ? (
                                                        <div className="relative h-10 w-8 rounded overflow-hidden">
                                                            <Image 
                                                                src={item.imageUrl} 
                                                                alt={item.name} 
                                                                fill 
                                                                className="object-cover"
                                                                onError={(e) => {
                                                                    const target = e.target as HTMLImageElement;
                                                                    target.src = '/placeholder-product.png';
                                                                }}
                                                                unoptimized={true}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="bg-muted border rounded w-8 h-10 flex items-center justify-center">
                                                            <span className="text-xs">?</span>
                                                        </div>
                                                    )}
                                                    <span>{item.name}</span>
                                                    <span className="text-xs text-muted-foreground">({item.productId})</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{item.color}, {item.size}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Store className="h-3 w-3 text-green-500" />
                                                    <Badge variant={stockVariant} className="text-xs">
                                                        {stockText}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">ETB {item.price.toFixed(2)}</TableCell>
                                            <TableCell className="text-right font-semibold">ETB {(item.price * item.stock).toFixed(2)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button 
                                                        size="icon" 
                                                        variant="outline" 
                                                        onClick={() => handleViewDetails(item)}
                                                        title="View Details"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button 
                                                        size="icon" 
                                                        variant="outline" 
                                                        onClick={() => handlePlaceOrder(item)}
                                                        title="Place Order"
                                                    >
                                                        <ShoppingCart className="h-4 w-4" />
                                                    </Button>
                                                    <Button 
                                                        size="icon" 
                                                        variant="outline" 
                                                        onClick={() => handleEditStock(item)}
                                                        title="Edit Stock"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button 
                                                        size="icon" 
                                                        variant="outline" 
                                                        onClick={() => handleDeleteStock(item)}
                                                        title="Delete Stock"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            <p>No items found matching your search criteria.</p>
                            <p className="text-sm mt-2">Try adjusting your search terms or browse all items.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {selectedProduct && (
                <ProductDetailDialog 
                    product={selectedProduct} 
                    open={isProductDetailOpen} 
                    onOpenChange={setIsProductDetailOpen} 
                />
            )}

            <EditStockDialog 
                item={editingItem}
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                onStockUpdate={handleStockUpdate}
            />

            <DeleteStockDialog 
                item={deletingItem}
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                onConfirm={handleDeleteConfirm}
            />

            <PlaceOrderDialog 
                item={orderingItem}
                open={isOrderDialogOpen}
                onOpenChange={setIsOrderDialogOpen}
            />
        </>
    );
}