"use client";

import { useState, useMemo, useEffect } from "react";
import type { Product, ProductVariant } from "@/lib/products";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import Image from "next/image";
import { useOrder } from "@/hooks/use-order";
import { useToast } from "@/hooks/use-toast";
import { 
  PlusCircle, 
  MinusCircle, 
  ShoppingCart, 
  Package, 
  Factory, 
  Store, 
  Plus, 
  Check, 
  ChevronsUpDown, 
  Search, 
  Trash2, 
  ArrowLeft, 
  Upload, 
  Image as ImageIcon 
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from '@/contexts/auth-context';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { getProducts } from "@/lib/products";
import { calculateDemandWeights } from "@/lib/variant-demand";
import { useShopInventory } from "@/hooks/use-shop-inventory";
import { StockDistributionToggle } from "@/components/stock-distribution-toggle";
import { createAuthHeaders } from "@/lib/auth-helpers";

// Fixed TypeScript error with useShopInventory hook usage

type OrderQuantities = {
    [variantId: string]: number;
}

type ProductDetailDialogProps = {
    product: Product;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    userRole?: string;
}

export function ProductDetailDialog({ product, open, onOpenChange, userRole }: ProductDetailDialogProps) {
    // Try to use the order context, but provide fallbacks for factory context
    const orderContext = useOrder();
    const { toast } = useToast();
    const { user } = useAuth();
    const [quantities, setQuantities] = useState<OrderQuantities>({});
    const [isReadyToDeliver, setIsReadyToDeliver] = useState(product.readyToDeliver === 1);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    
    // Shop settings for simplified view
    const [shopSettings, setShopSettings] = useState<{ showVariantDetails: boolean } | null>(null);
    const [simplifiedQuantity, setSimplifiedQuantity] = useState(12);
    const [previewDistribution, setPreviewDistribution] = useState<Map<string, number>>(new Map());

    // Fetch shop settings if user is a shop
    useEffect(() => {
        if (user && user.role === 'shop') {
             // Pass the username, not the id, as user.id likely doesn't match shop.id
             fetch(`/api/shops?username=${user.username}`)
                .then(res => res.json())
                .then(data => {
                    // Start of Selection
                    if (data && typeof data.showVariantDetails !== 'undefined') {
                        setShopSettings({ showVariantDetails: !!data.showVariantDetails });
                    }
                })
                .catch(err => console.error("Error fetching shop settings:", err));
        }
    }, [user]);

    // Calculate distribution when in simplified mode
    useEffect(() => {
        if (shopSettings && !shopSettings.showVariantDetails && simplifiedQuantity > 0) {
             // Dynamically import to avoid server-side issues if any
             import("@/lib/ai-distribution").then(({ distributeOrderQuantity }) => {
                 const dist = distributeOrderQuantity(
                    product.variants as any[], 
                    simplifiedQuantity,
                    'proportional'
                 );
                 setPreviewDistribution(dist);
                 
                 // Convert distribution map to quantities object for compatibility
                 const newQuantities: OrderQuantities = {};
                 dist.forEach((qty, variantId) => {
                     newQuantities[variantId] = qty;
                 });
                 setQuantities(newQuantities);
             });
        }
    }, [shopSettings, simplifiedQuantity, product.variants]);

    const handleSimplifiedQuantityChange = (value: string) => {
        const numValue = parseInt(value);
        if (!isNaN(numValue) && numValue >= 0) {
          // Round to nearest multiple of 12
          const rounded = Math.round(numValue / 12) * 12;
          setSimplifiedQuantity(rounded || 12);
        }
    };

    const handleSimplifiedIncrement = () => {
        setSimplifiedQuantity(prev => prev + 12);
    };

    const handleSimplifiedDecrement = () => {
        setSimplifiedQuantity(prev => Math.max(12, prev - 12));
    };

    const isSimplifiedMode = user?.role === 'shop' && shopSettings !== null && !shopSettings.showVariantDetails;
    
    // Marketing order state
    const [isMarketingOrderDialogOpen, setIsMarketingOrderDialogOpen] = useState(false);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [isNewProduct, setIsNewProduct] = useState(false);
    const [selectedMarketingProduct, setSelectedMarketingProduct] = useState<Product | null>(product);
    
    // Marketing order form fields
    const [marketingProductName, setMarketingProductName] = useState(product.name);
    const [marketingProductCode, setMarketingProductCode] = useState(product.productCode);
    const [marketingCategory, setMarketingCategory] = useState(product.category);
    const [marketingPrice, setMarketingPrice] = useState(product.price);
    const [marketingMainImage, setMarketingMainImage] = useState<File | null>(null);
    const [marketingMainImagePreview, setMarketingMainImagePreview] = useState<string | null>(product.imageUrl || null);
    const [marketingCost, setMarketingCost] = useState(product.cost || 0);
    
    const [marketingOrderData, setMarketingOrderData] = useState({
        description: '',
        orderPlacementDate: new Date().toISOString().split('T')[0],
        plannedDeliveryDate: ''
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    
    // Manual items for new product registration
    const [manualItems, setManualItems] = useState<{size: string, color: string, quantity: number}[]>([]);
    const [newItemSize, setNewItemSize] = useState("");
    const [newItemColor, setNewItemColor] = useState("");
    const [newItemQuantity, setNewItemQuantity] = useState(0);

    // Fetch all products for the searchable dropdown
    useEffect(() => {
        if (isMarketingOrderDialogOpen) {
            const fetchAllProducts = async () => {
                try {
                    const fetched = await getProducts();
                    setAllProducts(fetched);
                } catch (error) {
                    console.error("Error fetching all products:", error);
                }
            };
            fetchAllProducts();
        }
    }, [isMarketingOrderDialogOpen]);

    // Handle product selection in marketing order
    const handleMarketingProductSelect = (selectedId: string) => {
        const prod = allProducts.find(p => p.id === selectedId) || null;
        setSelectedMarketingProduct(prod);
        
        if (prod) {
            setMarketingProductName(prod.name);
            setMarketingProductCode(prod.productCode);
            setMarketingCategory(prod.category);
            setMarketingPrice(prod.price);
            setMarketingCost(prod.cost || 0);
            setMarketingMainImagePreview(prod.imageUrl || null);
            setIsNewProduct(false);
            
            // If the selected product is the one we started with, stay with current quantities
            // Otherwise, we might want to clear them? 
            // For now, let's keep it simple: if changing products, clear quantities unless it's the same
            if (prod.id !== product.id) {
                setQuantities({});
                setManualItems([]);
            }
        } else {
            // New product registration
            setIsNewProduct(true);
            setMarketingProductName("");
            setMarketingProductCode("");
            setMarketingCategory("");
            setMarketingPrice(0);
            setMarketingCost(0);
            setMarketingMainImagePreview(null);
            setQuantities({});
            setManualItems([]);
        }
    };

    // Auto-find product by code
    useEffect(() => {
        if (marketingProductCode && !isNewProduct) {
            const match = allProducts.find(p => p.productCode.toUpperCase() === marketingProductCode.toUpperCase());
            if (match && (!selectedMarketingProduct || match.id !== selectedMarketingProduct.id)) {
                handleMarketingProductSelect(match.id);
            }
        }
    }, [marketingProductCode, isNewProduct, allProducts]);

    const filteredMarketingProducts = allProducts.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.productCode.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleMarketingImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setMarketingMainImage(file);
        const previewUrl = URL.createObjectURL(file);
        setMarketingMainImagePreview(previewUrl);
    };

    const addManualItem = () => {
        if (!newItemSize || !newItemColor || newItemQuantity <= 0) {
            toast({
                title: "Validation Error",
                description: "Please fill in all item fields.",
                variant: "destructive",
            });
            return;
        }
        setManualItems([...manualItems, { size: newItemSize, color: newItemColor, quantity: newItemQuantity }]);
        setNewItemSize("");
        setNewItemColor("");
        setNewItemQuantity(0);
    };

    // Fallback functions for when orderContext is not available (factory context)
    const getAvailableStock = orderContext?.getAvailableStock || ((variantId: string) => {
        // For factory users, return the actual product variant stock
        const variant = product.variants.find(v => v.id === variantId);
        return variant ? variant.stock : 0;
    });
    const orderItems = orderContext?.items || [];
    const shopDiscount = orderContext?.shopDiscount || 0;
    const addItem = orderContext?.addItem || (() => {
        toast({
            title: "Not Available",
            description: "This feature is only available for shop users.",
            variant: "destructive",
        });
    });

    const variantsByColor = useMemo(() => {
        return product.variants.reduce((acc, variant) => {
            if (!acc[variant.color]) {
                acc[variant.color] = {
                    imageUrl: variant.imageUrl || product.imageUrl || '/placeholder-product.png',
                    variants: [],
                };
            }
            acc[variant.color].variants.push(variant);
            return acc;
        }, {} as Record<string, { imageUrl: string; variants: ProductVariant[] }>);
    }, [product.variants, product.imageUrl]);

    // Calculate available stock considering items already in the order
    const getRealTimeAvailableStock = (variantId: string) => {
        // For factory users, show the actual product stock
        if (user?.role === 'factory') {
          const variant = product.variants.find(v => v.id === variantId);
          return variant ? variant.stock : 0;
        }
        
        // For shop users, strictly return the shop inventory
        // We do not subtract orderedQuantity because we are ordering (buying), not selling from inventory
        return getAvailableStock(variantId);
      };

    const handleQuantityChange = (variantId: string, amount: number) => {
        const currentQuantity = quantities[variantId] || 0;
        const newQuantity = Math.max(0, currentQuantity + amount);
        
        // Factory users can place marketing orders for production and are not limited by current stock
        if (user?.role === 'factory') {
            setQuantities(prev => ({
                ...prev,
                [variantId]: newQuantity
            }));
            return;
        }
        
        // For shop users, strictly return the shop inventory
        const availableStock = getAvailableStock(variantId);
        
        // For shop users, also check factory stock
        if (user?.role === 'shop') {
          const variant = product.variants.find(v => v.id === variantId);
          const factoryStock = variant ? variant.stock : 0;
          
          // If factory has no stock, prevent ordering
          if (factoryStock <= 0) {
            toast({
              title: "Out of Stock",
              description: "This product is currently out of stock at the factory.",
              variant: "destructive",
            });
            return;
          }
          
          // If trying to increase quantity beyond factory stock
          if (amount > 0 && newQuantity > factoryStock) {
            toast({
              title: "Insufficient Factory Stock",
              description: `Only ${factoryStock} units available in factory stock.`,
              variant: "destructive",
            });
            return;
          }
        }
        
        setQuantities(prev => ({
            ...prev,
            [variantId]: newQuantity
        }));
    }

    const handleAddAllToOrder = async () => {
        let itemsAdded = 0;
        for (const [variantId, quantity] of Object.entries(quantities)) {
            if (quantity > 0) {
                const variant = product.variants.find(v => v.id === variantId);
                if (variant) {
                    await addItem(product, variant, quantity);
                    itemsAdded += quantity;
                }
            }
        }

        if (itemsAdded > 0) {
            toast({
                title: "Added to Cart",
                description: `${itemsAdded} item(s) added successfully.`,
                duration: 2000,
            });
            setQuantities({});
            onOpenChange(false);
        } else {
             toast({
                title: "No Items Selected",
                description: "Please specify a quantity for the items you wish to order.",
                variant: "destructive",
            });
        }
    };
    
    const handleReadyToDeliverChange = async (checked: boolean) => {
        if (user?.role !== 'factory') return;
        
        setUpdatingStatus(true);
        try {
            const response = await fetch(`/api/products?id=${product.id}`, {
                method: 'PUT',
                headers: {
                    ...createAuthHeaders(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    readyToDeliver: checked ? 1 : 0
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to update product status');
            }
            
            setIsReadyToDeliver(checked);
            toast({
                title: "Product Status Updated",
                description: `Product is now ${checked ? 'available' : 'unavailable'} for ordering.`,
            });
        } catch (error) {
            console.error('Error updating product status:', error);
            toast({
                title: "Error",
                description: "Failed to update product status. Please try again.",
                variant: "destructive",
            });
            // Revert the switch state if the update failed
            setIsReadyToDeliver(!checked);
        } finally {
            setUpdatingStatus(false);
        }
    };
    
    const handlePlaceMarketingOrder = async () => {
        // Validation
        const newErrors: Record<string, string> = {};
        if (!marketingProductName.trim()) newErrors.productName = "Required";
        if (!marketingProductCode.trim()) newErrors.productCode = "Required";
        else if (!/^[A-Z]{2}(-[A-Z]{2})?-\d{3,}([/-]\d{2,})?$/i.test(marketingProductCode)) {
            newErrors.productCode = "Invalid format";
        }
        
        if (isNewProduct) {
            if (!marketingCategory) newErrors.category = "Required";
            if (marketingPrice <= 0) newErrors.price = "Required";
            if (!marketingMainImage) newErrors.mainImage = "Image required";
        }

        const totalItems = isNewProduct 
            ? manualItems.reduce((sum, item) => sum + item.quantity, 0)
            : Object.values(quantities).reduce((sum, q) => sum + q, 0);
            
        if (totalItems <= 0) {
            toast({
                title: "No Items Selected",
                description: "Please add items to your order.",
                variant: "destructive",
            });
            return;
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        try {
            // Prepare items
            const finalItems = isNewProduct 
                ? manualItems 
                : Object.entries(quantities)
                    .filter(([_, q]) => q > 0)
                    .map(([vid, q]) => {
                        const v = (selectedMarketingProduct || product).variants.find(v => v.id === vid);
                        return { size: v?.size || '', color: v?.color || '', quantity: q };
                    });

            const orderData: any = {
                productName: marketingProductName,
                productCode: marketingProductCode,
                description: marketingOrderData.description,
                quantity: totalItems,
                status: 'Placed Order',
                isCompleted: false,
                createdBy: user?.username || 'Factory User',
                orderPlacementDate: marketingOrderData.orderPlacementDate,
                plannedDeliveryDate: marketingOrderData.plannedDeliveryDate || undefined,
                items: finalItems
            };

            if (isNewProduct) {
                orderData.isNewProduct = true;
                orderData.category = marketingCategory;
                orderData.price = marketingPrice;
                orderData.cost = marketingCost;
                
                if (marketingMainImage) {
                    const formData = new FormData();
                    formData.append('file', marketingMainImage);
                    const mainImageName = `${marketingProductCode.toUpperCase()}_main.${marketingMainImage.name.split('.').pop()}`;
                    formData.append('filename', mainImageName);
                    
                    const uploadRes = await fetch('/api/upload', { 
                        method: 'POST', 
                        headers: {
                            ...createAuthHeaders()
                        },
                        body: formData 
                    });
                    if (uploadRes.ok) {
                        const res = await uploadRes.json();
                        orderData.imageUrl = res.imageUrl;
                    }
                }
            } else if (selectedMarketingProduct?.imageUrl) {
                orderData.imageUrl = selectedMarketingProduct.imageUrl;
            }

            const response = await fetch('/api/marketing-orders', {
                method: 'POST',
                headers: { 
                    ...createAuthHeaders(),
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify(orderData),
            });
            
            if (!response.ok) throw new Error('Failed to create marketing order');
            
            toast({ title: "Success", description: "Marketing order created successfully." });
            setIsMarketingOrderDialogOpen(false);
            onOpenChange(false);
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const getPriceForVariant = (variant: any) => {
        if (!product.agePricing || product.agePricing.length === 0) return product.price;

        const variantSize = variant.size?.trim().toLowerCase();
        
        // 1. Try label match (sizes column)
        const labelMatch = product.agePricing.find(p => 
            p.sizes?.split(',').map((s: string) => s.trim().toLowerCase()).includes(variantSize)
        );
        if (labelMatch) return labelMatch.price;

        // 2. Try numeric range match
        const sizeNum = parseInt(variantSize);
        if (!isNaN(sizeNum)) {
            const rangeMatch = product.agePricing.find(p => 
                (p.ageMin !== undefined && p.ageMax !== undefined) &&
                sizeNum >= (p.ageMin || 0) && sizeNum <= (p.ageMax || 0)
            );
            if (rangeMatch) return rangeMatch.price;
        }

        return product.price;
    };
    
    // For shop users, get their inventory
    const shopId = user?.id ? String(user.id) : '';
    const { inventory: shopInventory } = useShopInventory(shopId);
    
    const totalSelected = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
    const subTotal = Object.entries(quantities).reduce((total, [variantId, quantity]) => {
        const variant = product.variants.find(v => v.id === variantId);
        const price = variant ? getPriceForVariant(variant) : product.price;
        return total + (price * quantity);
    }, 0);
    const discountAmount = subTotal * shopDiscount;
    const finalTotal = subTotal - discountAmount;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{product.name}</DialogTitle>
            <DialogDescription>
              {user?.role === 'factory' 
                ? "Place a marketing order for production with detailed size and color breakdown." 
                : isSimplifiedMode
                   ? "Enter bulk quantity (multiples of 12). Variants are distributed automatically."
                   : "Select the color, size, and quantity you wish to order."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[65vh] overflow-y-auto pr-4">
             {/* Factory controls */}
             {user?.role === 'factory' && (
               <div className="mb-4 p-4 border rounded-lg bg-muted">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center space-x-2">
                     <Switch
                       id="ready-to-deliver"
                       checked={isReadyToDeliver}
                       onCheckedChange={handleReadyToDeliverChange}
                       disabled={updatingStatus}
                     />
                     <Label htmlFor="ready-to-deliver">
                       Ready for Shop Orders
                     </Label>
                   </div>
                   <Badge variant={isReadyToDeliver ? "default" : "destructive"}>
                     {isReadyToDeliver ? "Available" : "Unavailable"}
                   </Badge>
                 </div>
                 <p className="text-sm text-muted-foreground mt-2">
                   Toggle this switch to control whether shops can order this product.
                 </p>
               </div>
             )}
             
              {/* Stock information for shop users */}
              {user?.role === 'shop' && (
                <div className="mb-4 p-4 border rounded-lg bg-muted">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Your Stock</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-primary">
                        {product.agePricing && product.agePricing.length > 0
                          ? `Pricing: From ETB ${Math.min(...product.agePricing.map(p => p.price)).toFixed(2)}`
                          : `Selling Price: ETB ${product.price.toFixed(2)}`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center mt-2">
                    <Store className="h-4 w-4 mr-2 text-green-500" />
                    <span className="text-sm">
                      {product.variants.reduce((total, variant) => {
                        const availableStock = getRealTimeAvailableStock(variant.id);
                        return total + Math.max(0, availableStock);
                      }, 0)} units available in your inventory
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    This shows the total quantity of this product available in your shop inventory.
                  </p>
                </div>
              )}

              {/* Cost information for factory users */}
              {user?.role === 'factory' && (
                <div className="mb-4 p-4 border rounded-lg bg-primary/5 border-primary/20">
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-primary flex items-center gap-2">
                            <Factory className="h-4 w-4" /> Production & Costing Detail
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-2 bg-background rounded border border-primary/10">
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Base Selling Price</p>
                            <p className="text-lg font-bold">ETB {product.price.toFixed(2)}</p>
                        </div>
                        <div className="p-2 bg-background rounded border border-primary/10">
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Base Production Cost</p>
                            <p className="text-lg font-bold text-blue-600">ETB {product.cost?.toFixed(2) || "0.00"}</p>
                        </div>
                    </div>
                    {product.agePricing && product.agePricing.length > 0 && (
                        <div className="mt-4">
                            <p className="text-xs font-bold mb-2 uppercase text-muted-foreground">Age-Based Pricing & Costing Breakdown</p>
                            <div className="rounded border overflow-hidden">
                                <table className="w-full text-[10px]">
                                    <thead className="bg-muted">
                                        <tr className="divide-x">
                                            <th className="p-1.5 text-left">Ages/Sizes</th>
                                            <th className="p-1.5 text-right">Price (ETB)</th>
                                            <th className="p-1.5 text-right">Cost (ETB)</th>
                                            <th className="p-1.5 text-right">Margin (%)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {product.agePricing.map((ap, idx) => {
                                            const margin = ap.price > 0 ? ((ap.price - (ap.cost || 0)) / ap.price) * 100 : 0;
                                            return (
                                                <tr key={idx} className="divide-x hover:bg-muted/30">
                                                    <td className="p-1.5 font-medium">{ap.sizes || `${ap.ageMin}-${ap.ageMax} yrs`}</td>
                                                    <td className="p-1.5 text-right font-bold">ETB {ap.price.toFixed(2)}</td>
                                                    <td className="p-1.5 text-right text-blue-600">ETB {ap.cost?.toFixed(2) || "0.00"}</td>
                                                    <td className={cn("p-1.5 text-right font-bold", margin > 20 ? "text-green-600" : "text-amber-600")}>
                                                        {margin.toFixed(1)}%
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
              )}
             
             {isSimplifiedMode && (
                 <div className="space-y-6 mb-6">
                     <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-muted/20">
                         <Label htmlFor="simplified-quantity" className="text-lg font-medium mb-4">
                             Order Quantity (Packs of 12)
                         </Label>
                         <div className="flex items-center gap-4">
                           <Button 
                             type="button" 
                             variant="outline" 
                             size="icon" 
                             className="h-12 w-12"
                             onClick={handleSimplifiedDecrement}
                             disabled={simplifiedQuantity <= 12}
                           >
                             <MinusCircle className="h-6 w-6" />
                           </Button>
                           <Input
                             id="simplified-quantity"
                             type="number"
                             min="12"
                             step="12"
                             value={simplifiedQuantity}
                             onChange={(e) => handleSimplifiedQuantityChange(e.target.value)}
                             className="text-center w-32 h-12 text-xl font-bold"
                           />
                           <Button 
                             type="button" 
                             variant="outline" 
                             size="icon" 
                             className="h-12 w-12"
                             onClick={handleSimplifiedIncrement}
                           >
                             <PlusCircle className="h-6 w-6" />
                           </Button>
                         </div>
                     </div>
                     
                     <div className="rounded-lg border p-4">
                        <h4 className="font-medium mb-3">Automatic Distribution Preview</h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-muted">
                                <tr>
                                  <th className="p-2 text-left">Color</th>
                                  <th className="p-2 text-left">Size</th>
                                  <th className="p-2 text-right">Qty</th>
                                  <th className="p-2 text-right">Factory Stock</th>
                                </tr>
                              </thead>
                              <tbody>
                                {product.variants.map((variant) => {
                                  const qty = quantities[variant.id] || 0;
                                  if (qty === 0 && variant.stock === 0) return null;
                                  return (
                                    <tr key={variant.id} className="border-t">
                                      <td className="p-2">{variant.color}</td>
                                      <td className="p-2">{variant.size}</td>
                                      <td className="p-2 text-right font-bold text-primary">
                                        {qty > 0 ? qty : '-'}
                                      </td>
                                      <td className="p-2 text-right">
                                        <Badge variant={variant.stock > 0 ? 'outline' : 'destructive'}>
                                            {Math.max(0, variant.stock)}
                                        </Badge>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                        </div>
                     </div>
                 </div>
             )}
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Factory view - show all variants by color */}
                  {user?.role === 'factory' && Object.entries(variantsByColor).map(([color, { imageUrl, variants }]) => (
                      <Card key={color} className="overflow-hidden">
                           <div className="relative h-48 w-full">
                              <Image 
                                src={imageUrl} 
                                alt={`${product.name} - ${color}`} 
                                fill 
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px"
                                style={{objectFit: 'cover'}} 
                                // Add error handling for blob URLs
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  // Only set fallback if not already set to avoid infinite loop
                                  if (target.src !== window.location.origin + '/placeholder-product.png') {
                                    target.src = '/placeholder-product.png';
                                  }
                                }}
                                // Add loading strategy
                                loading="lazy"
                                // Add key to force re-render when src changes
                                key={imageUrl}
                              />
                            </div>
                          <CardContent className="p-4 space-y-3">
                              <h3 className="font-bold text-lg">{color}</h3>
                              <Separator />
                              <div className="space-y-4">
                                  {variants.map(variant => {
                                      const availableStock = getRealTimeAvailableStock(variant.id);
                                      const orderedQuantity = quantities[variant.id] || 0;
                                      const totalInOrder = orderItems
                                          .filter(item => item.variant.id === variant.id)
                                          .reduce((sum, item) => sum + item.quantity, 0);
                                      
                                      return (
                                          <div key={variant.id} className="grid grid-cols-3 items-center gap-2">
                                              <div className="space-y-1">
                                                  <p className="font-medium">{variant.size}</p>
                                                  {user?.role === 'shop' ? (
                                                      // For shops, show both factory and shop stock
                                                      <>
                                                          <div className="flex items-center gap-1">
                                                              <Store className="h-3 w-3 text-green-500" />
                                                              <Badge variant={availableStock > 0 ? "secondary" : "destructive"} className="text-xs">
                                                                  Your Stock: {availableStock}
                                                              </Badge>
                                                          </div>
                                                          <div className="flex items-center gap-1">
                                                              <Factory className="h-3 w-3 text-blue-500" />
                                                              <Badge variant={variant.stock > 0 ? "secondary" : "destructive"} className="text-xs">
                                                                  Factory: {variant.stock}
                                                              </Badge>
                                                          </div>
                                                      </>
                                                  ) : (
                                                      // For factory, show only factory stock
                                                      <Badge variant={variant.stock > 0 ? "secondary" : "destructive"}>
                                                          {variant.stock > 0 ? `${variant.stock} in stock` : 'Out of Stock'}
                                                      </Badge>
                                                  )}
                                                  {totalInOrder > 0 && (
                                                      <p className="text-xs text-muted-foreground">
                                                          {totalInOrder} already in order
                                                      </p>
                                                  )}
                                              </div>

                                              <div className="col-span-2 flex items-center justify-end gap-2">
                                                  <Button 
                                                      size="icon" 
                                                      variant="outline" 
                                                      className="h-8 w-8" 
                                                      onClick={() => handleQuantityChange(variant.id, -1)} 
                                                      disabled={orderedQuantity === 0}
                                                  >
                                                      <MinusCircle className="h-4 w-4" />
                                                  </Button>
                                                  <Input
                                                      type="number"
                                                      className="w-16 h-8 text-center"
                                                      value={orderedQuantity}
                                                      onChange={(e) => {
                                                          const value = parseInt(e.target.value) || 0;
                                                          // No stock limits for factory production orders
                                                          setQuantities(prev => ({...prev, [variant.id]: Math.max(0, value)}));
                                                      }}
                                                      min="0"
                                                  />
                                                  <Button 
                                                      size="icon" 
                                                      variant="outline" 
                                                      className="h-8 w-8" 
                                                      onClick={() => handleQuantityChange(variant.id, 1)} 
                                                  >
                                                      <PlusCircle className="h-4 w-4" />
                                                  </Button>
                                              </div>
                                          </div>
                                      );
                                  })}
                              </div>
                          </CardContent>
                      </Card>
                  ))}
                  
                  {/* Shop view - show variants with stock info */}
                  {user?.role === 'shop' && !isSimplifiedMode && Object.entries(variantsByColor).map(([color, { imageUrl, variants }]) => (
                      <Card key={color} className="overflow-hidden">
                          <div className="relative h-48 w-full">
                              <Image 
                                src={imageUrl} 
                                alt={`${product.name} - ${color}`} 
                                fill 
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 400px"
                                style={{objectFit: 'cover'}} 
                                // Add error handling for blob URLs
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  // Only set fallback if not already set to avoid infinite loop
                                  if (target.src !== window.location.origin + '/placeholder-product.png') {
                                    target.src = '/placeholder-product.png';
                                  }
                                }}
                                // Add loading strategy
                                loading="lazy"
                                // Add key to force re-render when src changes
                                key={imageUrl}
                              />
                            </div>
                          <CardContent className="p-4 space-y-3">
                              <h3 className="font-bold text-lg">{color}</h3>
                              <Separator />
                              <div className="space-y-4">
                                  {variants.map(variant => {
                                      const availableStock = getRealTimeAvailableStock(variant.id);
                                      const orderedQuantity = quantities[variant.id] || 0;
                                      const totalInOrder = orderItems
                                          .filter(item => item.variant.id === variant.id)
                                          .reduce((sum, item) => sum + item.quantity, 0);
                                      
                                      return (
                                          <div key={variant.id} className="grid grid-cols-3 items-center gap-2">
                                              <div className="space-y-1">
                                                  <p className="font-medium">{variant.size}
                                                       {product.agePricing && product.agePricing.length > 0 && (
                                                           <span className="ml-2 text-xs font-bold text-primary">
                                                               ETB {getPriceForVariant(variant).toFixed(2)}
                                                           </span>
                                                       )}
</p>
                                                  {user?.role === 'shop' ? (
                                                      // For shops, show both factory and shop stock
                                                      <>
                                                          <div className="flex items-center gap-1">
                                                              <Store className="h-3 w-3 text-green-500" />
                                                              <Badge variant={availableStock > 0 ? "secondary" : "destructive"} className="text-xs">
                                                                  Your Stock: {availableStock}
                                                              </Badge>
                                                          </div>
                                                          <div className="flex items-center gap-1">
                                                              <Factory className="h-3 w-3 text-blue-500" />
                                                              <Badge variant={variant.stock > 0 ? "secondary" : "destructive"} className="text-xs">
                                                                  Factory: {variant.stock}
                                                              </Badge>
                                                          </div>
                                                      </>
                                                  ) : (
                                                      // For factory, show only factory stock
                                                      <Badge variant={variant.stock > 0 ? "secondary" : "destructive"}>
                                                          {variant.stock > 0 ? `${variant.stock} in stock` : 'Out of Stock'}
                                                      </Badge>
                                                  )}
                                                  {totalInOrder > 0 && (
                                                      <p className="text-xs text-muted-foreground">
                                                          {totalInOrder} already in order
                                                      </p>
                                                  )}
                                              </div>

                                              <div className="col-span-2 flex items-center justify-end gap-2">
                                                  <Button 
                                                      size="icon" 
                                                      variant="outline" 
                                                      className="h-8 w-8" 
                                                      onClick={() => handleQuantityChange(variant.id, -1)} 
                                                      disabled={orderedQuantity === 0 || (variant.stock === 0)}
                                                  >
                                                      <MinusCircle className="h-4 w-4" />
                                                  </Button>
                                                  <Input
                                                      type="number"
                                                      className="w-16 h-8 text-center"
                                                      value={orderedQuantity}
                                                      onChange={(e) => {
                                                          const value = parseInt(e.target.value) || 0;
                                                          const maxAllowed = variant.stock + (quantities[variant.id] || 0);
                                                          if (value <= maxAllowed) {
                                                              setQuantities(prev => ({...prev, [variant.id]: Math.max(0, value)}));
                                                          } else {
                                                              toast({
                                                                  title: "Insufficient Stock",
                                                                  description: `Only ${maxAllowed} items available in stock.`,
                                                                  variant: "destructive",
                                                              });
                                                          }
                                                      }}
                                                      min="0"
                                                      max={variant.stock + (quantities[variant.id] || 0)}
                                                      disabled={variant.stock === 0}
                                                  />
                                                  <Button 
                                                      size="icon" 
                                                      variant="outline" 
                                                      className="h-8 w-8" 
                                                      onClick={() => handleQuantityChange(variant.id, 1)} 
                                                      disabled={orderedQuantity >= variant.stock && variant.stock > 0}
                                                  >
                                                      <PlusCircle className="h-4 w-4" />
                                                  </Button>
                                              </div>
                                          </div>
                                      );
                                  })}
                              </div>
                          </CardContent>
                      </Card>
                  ))}
             </div>
             
             {/* Stock Distribution Chart Toggle */}
             {!isSimplifiedMode && (
             <div className="mt-6">
               <StockDistributionToggle 
                 product={product}
                 shopInventory={shopInventory}
                 viewType={user?.role === 'factory' ? 'factory' : 'shop'}
               />
             </div>
             )}
             
          </div>
          <DialogFooter className="flex-col sm:items-end gap-4 border-t pt-4">
              <div className="w-full sm:w-64 space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span>ETB {subTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                      <span>Discount ({(shopDiscount * 100).toFixed(0)}%)</span>
                      <span className="text-destructive">- ETB {discountAmount.toFixed(2)}</span>
                  </div>
                   <div className="flex justify-between font-bold text-base">
                      <span>Total</span>
                      <span>ETB {finalTotal.toFixed(2)}</span>
                  </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto justify-end">
                  <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">Cancel</Button>
                  {user?.role === 'factory' ? (
                      <Button 
                          onClick={() => setIsMarketingOrderDialogOpen(true)} 
                          className="w-full sm:w-auto"
                      >
                          <Plus className="mr-2 h-4 w-4" />
                          Place Marketing Order ({totalSelected})
                      </Button>
                  ) : (
                      <Button onClick={() => handleAddAllToOrder()} disabled={totalSelected === 0 || (!!isSimplifiedMode && totalSelected % 12 !== 0)} className="w-full sm:w-auto">
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          {isSimplifiedMode ? "Confirm & Place Order" : `Add ${totalSelected} to Cart`}
                      </Button>
                  )}
              </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Marketing Order Dialog */}
      <Dialog open={isMarketingOrderDialogOpen} onOpenChange={setIsMarketingOrderDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Place Marketing Order</DialogTitle>
            <DialogDescription>
              Create a new marketing order for production of {product.name} ({product.productCode})
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-2">
            {/* Product Selection */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Product Selection</Label>
              <div className="flex flex-col gap-4">
                <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between shadow-sm border-primary/20 hover:border-primary/50"
                    >
                      <span className="truncate">
                        {selectedMarketingProduct
                          ? `${selectedMarketingProduct.name} (${selectedMarketingProduct.productCode})`
                          : isNewProduct ? "Registering New Product..." : "Search catalog or start new..."}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <div className="flex items-center border-b px-3 bg-muted/20">
                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <input
                        className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                        placeholder="Type product code or name to search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-1">
                      <div
                        className={cn(
                          "flex cursor-pointer select-none items-center rounded-md px-2 py-2.5 text-sm transition-colors mb-1",
                          isNewProduct ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent"
                        )}
                        onClick={() => {
                            setIsNewProduct(true);
                            setSelectedMarketingProduct(null);
                            setMarketingProductName("");
                            setMarketingProductCode("");
                            setMarketingCategory("");
                            setMarketingPrice(0);
                            setMarketingMainImagePreview(null);
                            setQuantities({});
                            setManualItems([]);
                            setIsPopoverOpen(false);
                        }}
                      >
                        <PlusCircle className={cn("mr-2 h-4 w-4", isNewProduct ? "text-primary" : "text-muted-foreground")} />
                        <span>Register New Product</span>
                        {isNewProduct && <Check className="ml-auto h-4 w-4" />}
                      </div>
                      
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30 rounded-sm mb-1">
                        Existing Products
                      </div>
                      
                      {filteredMarketingProducts.length === 0 ? (
                        <div className="py-8 text-center text-sm text-muted-foreground">
                          No matching products found.
                        </div>
                      ) : (
                        filteredMarketingProducts.map((p) => (
                          <div
                            key={p.id}
                            className={cn(
                              "relative flex cursor-pointer select-none items-center rounded-md px-2 py-2 text-sm transition-colors",
                              selectedMarketingProduct?.id === p.id ? "bg-accent" : "hover:bg-accent/50"
                            )}
                            onClick={() => {
                              handleMarketingProductSelect(p.id);
                              setIsPopoverOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", selectedMarketingProduct?.id === p.id ? "opacity-100" : "opacity-0")} />
                            <div className="flex flex-col min-w-0">
                              <span className="truncate">{p.name}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">{p.productCode}</span>
                            </div>
                            {p.imageUrl && (
                              <div className="ml-auto h-8 w-8 rounded overflow-hidden border">
                                <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Product Details & Preview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-muted/30 p-4 rounded-lg">
                <div className="space-y-2">
                    <Label className="text-xs">Preview</Label>
                    <div className="relative aspect-square w-full rounded-md overflow-hidden border bg-background flex items-center justify-center">
                        {marketingMainImagePreview ? (
                            <Image 
                                src={marketingMainImagePreview} 
                                alt="Preview" 
                                fill 
                                style={{ objectFit: 'cover' }}
                                key={marketingMainImagePreview}
                            />
                        ) : (
                            <ImageIcon className="h-8 w-8 opacity-20" />
                        )}
                    </div>
                    {isNewProduct && (
                        <div className="pt-1">
                            <Input type="file" accept="image/*" onChange={handleMarketingImageChange} className="text-[10px] h-7 px-1" />
                            {errors.mainImage && <p className="text-[10px] text-red-500">{errors.mainImage}</p>}
                        </div>
                    )}
                </div>
                
                <div className="md:col-span-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label className="text-xs">Name</Label>
                            <Input 
                                size={1} 
                                value={marketingProductName} 
                                onChange={e => setMarketingProductName(e.target.value)} 
                                className={cn("h-8 text-sm", errors.productName && "border-red-500")}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Code</Label>
                            <Input 
                                size={1}
                                value={marketingProductCode} 
                                onChange={e => setMarketingProductCode(e.target.value.toUpperCase())}
                                className={cn("h-8 text-sm font-mono", errors.productCode && "border-red-500", selectedMarketingProduct && "border-green-500 bg-green-50/50")}
                            />
                            {selectedMarketingProduct && (
                                <div className="text-[10px] text-green-600 font-medium flex items-center gap-0.5 mt-0.5">
                                    <Check className="h-2 w-2" /> Linked to existing product database
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {isNewProduct && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs">Category</Label>
                                <Select value={marketingCategory} onValueChange={setMarketingCategory}>
                                    <SelectTrigger className="h-8 text-sm">
                                        <SelectValue placeholder="Cat..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Men">Men</SelectItem>
                                        <SelectItem value="Women">Women</SelectItem>
                                        <SelectItem value="Kids">Kids</SelectItem>
                                        <SelectItem value="Unisex">Unisex</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Price (ETB)</Label>
                                <Input 
                                    type="number" 
                                    value={marketingPrice || ""} 
                                    onChange={e => setMarketingPrice(Number(e.target.value))} 
                                    className="h-8 text-sm"
                                    placeholder="Selling Price"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Cost (ETB)</Label>
                                <Input 
                                    type="number" 
                                    value={marketingCost || ""} 
                                    onChange={e => setMarketingCost(Number(e.target.value))} 
                                    className="h-8 text-sm"
                                    placeholder="Production Cost"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Items Breakdown */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Order Breakdown</Label>
              
              {!isNewProduct ? (
                /* Existing Product Breakdown */
                <div className="max-h-60 overflow-y-auto border rounded-md divide-y">
                    {(selectedMarketingProduct || product).variants.map((v) => {
                        const q = quantities[v.id] || 0;
                        return (
                          <div key={v.id} className="flex justify-between items-center p-2 text-sm hover:bg-muted/50 transition-colors">
                            <div className="flex flex-col">
                                <span className={cn("font-medium", q > 0 && "text-primary font-bold")}>{v.color} - {v.size}</span>
                                <span className="text-[10px] text-muted-foreground">Current Factory Stock: {v.stock}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Input 
                                    type="number" 
                                    value={q || ""} 
                                    placeholder="0"
                                    onChange={e => {
                                        const val = Math.max(0, parseInt(e.target.value) || 0);
                                        setQuantities(prev => ({ ...prev, [v.id]: val }));
                                    }}
                                    className={cn("h-7 w-20 text-center", q > 0 && "border-primary ring-1 ring-primary/20")}
                                />
                                <span className="text-muted-foreground w-8 text-xs">units</span>
                            </div>
                          </div>
                        );
                    })}
                </div>
              ) : (
                /* New Product Manual Items */
                <div className="space-y-2">
                    <div className="grid grid-cols-4 gap-2">
                        <Input placeholder="Size" value={newItemSize} onChange={e => setNewItemSize(e.target.value)} className="h-8 text-xs" />
                        <Input placeholder="Color" value={newItemColor} onChange={e => setNewItemColor(e.target.value)} className="h-8 text-xs" />
                        <Input type="number" placeholder="Qty" value={newItemQuantity || ""} onChange={e => setNewItemQuantity(Number(e.target.value))} className="h-8 text-xs" />
                        <Button size="sm" onClick={addManualItem} className="h-8"><Plus className="h-3 w-3 mr-1" /> Add</Button>
                    </div>
                    <div className="max-h-32 overflow-y-auto border rounded-md">
                        <table className="w-full text-xs">
                            <thead className="bg-muted px-2">
                                <tr>
                                    <th className="text-left p-1">Size</th>
                                    <th className="text-left p-1">Color</th>
                                    <th className="text-right p-1">Qty</th>
                                    <th className="w-8"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {manualItems.map((item, i) => (
                                    <tr key={i} className="border-t">
                                        <td className="p-1">{item.size}</td>
                                        <td className="p-1">{item.color}</td>
                                        <td className="p-1 text-right">{item.quantity}</td>
                                        <td className="p-1">
                                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setManualItems(manualItems.filter((_, idx) => idx !== i))}>
                                                <Trash2 className="h-3 w-3 text-destructive" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
              )}
              
              <div className="flex justify-between items-center text-sm font-bold bg-muted/20 p-2 rounded">
                <span>Total Quantity:</span>
                <span className="text-lg">{isNewProduct ? manualItems.reduce((s, i) => s + i.quantity, 0) : Object.values(quantities).reduce((s, q) => s + q, 0)} units</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="orderPlacementDate" className="text-xs">Order Date</Label>
                <Input
                  id="orderPlacementDate"
                  type="date"
                  className="h-8 text-sm"
                  value={marketingOrderData.orderPlacementDate}
                  onChange={(e) => setMarketingOrderData({ ...marketingOrderData, orderPlacementDate: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="plannedDeliveryDate" className="text-xs">Delivery Date (Est.)</Label>
                <Input
                  id="plannedDeliveryDate"
                  type="date"
                  className="h-8 text-sm"
                  value={marketingOrderData.plannedDeliveryDate}
                  onChange={(e) => setMarketingOrderData({ ...marketingOrderData, plannedDeliveryDate: e.target.value })}
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="description" className="text-xs">Description / Notes</Label>
              <Textarea
                id="description"
                className="text-sm min-h-[60px]"
                value={marketingOrderData.description}
                onChange={(e) => setMarketingOrderData({ ...marketingOrderData, description: e.target.value })}
                placeholder="Special instructions..."
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMarketingOrderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePlaceMarketingOrder}>
              Place Marketing Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}