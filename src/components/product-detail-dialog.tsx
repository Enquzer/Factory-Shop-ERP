"use client";

import { useState, useMemo } from "react";
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
import Image from "next/image";
import { useOrder } from "@/hooks/use-order";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, MinusCircle, ShoppingCart, Package, Factory, Store, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from '@/contexts/auth-context';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog as DialogPrimitive,
  DialogContent as DialogContentPrimitive,
  DialogHeader as DialogHeaderPrimitive,
  DialogTitle as DialogTitlePrimitive,
  DialogDescription as DialogDescriptionPrimitive,
  DialogFooter as DialogFooterPrimitive,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type OrderQuantities = {
    [variantId: string]: number;
}

export function ProductDetailDialog({ product, open, onOpenChange }: { product: Product; open: boolean; onOpenChange: (open: boolean) => void }) {
    // Try to use the order context, but provide fallbacks for factory context
    const orderContext = useOrder();
    const { toast } = useToast();
    const { user } = useAuth();
    const [quantities, setQuantities] = useState<OrderQuantities>({});
    const [isReadyToDeliver, setIsReadyToDeliver] = useState(product.readyToDeliver === 1);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    
    // Marketing order state
    const [isMarketingOrderDialogOpen, setIsMarketingOrderDialogOpen] = useState(false);
    const [marketingOrderData, setMarketingOrderData] = useState({
        description: '',
        orderPlacementDate: new Date().toISOString().split('T')[0],
        plannedDeliveryDate: ''
    });

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
        
        // For shop users, check the shop inventory first
        const inventoryStock = getAvailableStock(variantId);
        
        // If shop has stock, return that
        if (inventoryStock > 0) {
          const orderedQuantity = orderItems
            .filter(item => item.variant.id === variantId)
            .reduce((sum, item) => sum + item.quantity, 0);
          return inventoryStock - orderedQuantity;
        }
        
        // If shop has no stock, check factory stock
        const variant = product.variants.find(v => v.id === variantId);
        return variant ? variant.stock : 0;
      };

    const handleQuantityChange = (variantId: string, amount: number) => {
        const currentQuantity = quantities[variantId] || 0;
        const newQuantity = Math.max(0, currentQuantity + amount);
        
        // Check available stock
        const availableStock = getRealTimeAvailableStock(variantId);
        
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
        
        if (newQuantity > availableStock && amount > 0) {
            toast({
                title: "Insufficient Stock",
                description: `Only ${availableStock} items available in stock.`,
                variant: "destructive",
            });
            return;
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
                title: "Products Added",
                description: `${itemsAdded} item(s) have been added to your order.`,
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
        try {
            // Prepare items for the marketing order
            const orderItems = Object.entries(quantities)
                .filter(([_, quantity]) => quantity > 0)
                .map(([variantId, quantity]) => {
                    const variant = product.variants.find(v => v.id === variantId);
                    return {
                        size: variant?.size || '',
                        color: variant?.color || '',
                        quantity: quantity
                    };
                })
                .filter(item => item.size && item.color); // Filter out invalid items
            
            if (orderItems.length === 0) {
                toast({
                    title: "No Items Selected",
                    description: "Please specify a quantity for the items you wish to order.",
                    variant: "destructive",
                });
                return;
            }
            
            // Calculate total quantity
            const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);
            
            // Create the marketing order data
            const orderData = {
                productName: product.name,
                productCode: product.productCode,
                description: marketingOrderData.description,
                quantity: totalQuantity,
                status: 'Placed Order',
                isCompleted: false,
                createdBy: user?.username || 'Factory User',
                orderPlacementDate: marketingOrderData.orderPlacementDate,
                plannedDeliveryDate: marketingOrderData.plannedDeliveryDate || undefined,
                items: orderItems
            };
            
            // Call the API to create the marketing order
            const response = await fetch('/api/marketing-orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(orderData),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || errorData.error || 'Failed to create marketing order');
            }
            
            const newOrder = await response.json();
            
            toast({
                title: "Marketing Order Created",
                description: `Marketing order ${newOrder.orderNumber} has been created successfully.`,
            });
            
            // Reset the form and close dialogs
            setQuantities({});
            setMarketingOrderData({
                description: '',
                orderPlacementDate: new Date().toISOString().split('T')[0],
                plannedDeliveryDate: ''
            });
            setIsMarketingOrderDialogOpen(false);
            onOpenChange(false);
        } catch (error: any) {
            console.error('Error creating marketing order:', error);
            toast({
                title: "Error",
                description: error.message || "Failed to create marketing order. Please try again.",
                variant: "destructive",
            });
        }
    };
    
    const totalSelected = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
    const subTotal = Object.entries(quantities).reduce((total, [variantId, quantity]) => {
        return total + (product.price * quantity);
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
                : "Select the color, size, and quantity you wish to order. Unit Price: ETB " + product.price.toFixed(2)}
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
                 </div>
                 <div className="flex items-center mt-2">
                   <Store className="h-4 w-4 mr-2 text-green-500" />
                   <span className="text-sm">
                     {product.variants.reduce((total, variant) => {
                       const availableStock = getRealTimeAvailableStock(variant.id);
                       return total + availableStock;
                     }, 0)} units available in your inventory
                   </span>
                 </div>
                 <p className="text-xs text-muted-foreground mt-2">
                   This shows the total quantity of this product available in your shop inventory.
                 </p>
               </div>
             )}
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(variantsByColor).map(([color, { imageUrl, variants }]) => (
                      <Card key={color} className="overflow-hidden">
                           <div className="relative h-48 w-full">
                              <Image 
                                src={imageUrl} 
                                alt={`${product.name} - ${color}`} 
                                fill 
                                sizes="(max-width: 768px) 100vw, 50vw"
                                style={{objectFit: 'cover'}} 
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
                                                      disabled={orderedQuantity === 0 || (user?.role === 'shop' ? (availableStock === 0 && variant.stock === 0) : variant.stock === 0)}
                                                  >
                                                      <MinusCircle className="h-4 w-4" />
                                                  </Button>
                                                  <Input
                                                      type="number"
                                                      className="w-16 h-8 text-center"
                                                      value={orderedQuantity}
                                                      onChange={(e) => {
                                                          const value = parseInt(e.target.value) || 0;
                                                          const maxAllowed = user?.role === 'shop' ? Math.max(availableStock, variant.stock) + (quantities[variant.id] || 0) : variant.stock + (quantities[variant.id] || 0);
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
                                                      max={user?.role === 'shop' ? Math.max(availableStock, variant.stock) + (quantities[variant.id] || 0) : variant.stock + (quantities[variant.id] || 0)}
                                                      disabled={user?.role === 'shop' ? (availableStock === 0 && variant.stock === 0) : variant.stock === 0}
                                                  />
                                                  <Button 
                                                      size="icon" 
                                                      variant="outline" 
                                                      className="h-8 w-8" 
                                                      onClick={() => handleQuantityChange(variant.id, 1)} 
                                                      disabled={user?.role === 'shop' ? (orderedQuantity >= Math.max(availableStock, variant.stock) && Math.max(availableStock, variant.stock) > 0) : orderedQuantity >= variant.stock}
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
                          disabled={totalSelected === 0} 
                          className="w-full sm:w-auto"
                      >
                          <Plus className="mr-2 h-4 w-4" />
                          Place Marketing Order ({totalSelected})
                      </Button>
                  ) : (
                      <Button onClick={() => handleAddAllToOrder()} disabled={totalSelected === 0} className="w-full sm:w-auto">
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          Add ({totalSelected}) to Order
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
          
          <div className="space-y-4 py-4">
            <div>
              <h3 className="font-medium mb-2">Selected Items</h3>
              <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                {Object.entries(quantities)
                  .filter(([_, quantity]) => quantity > 0)
                  .map(([variantId, quantity]) => {
                    const variant = product.variants.find(v => v.id === variantId);
                    return variant ? (
                      <div key={variantId} className="flex justify-between py-1 border-b last:border-b-0">
                        <span>{variant.color} - {variant.size}</span>
                        <span className="font-medium">{quantity} units</span>
                      </div>
                    ) : null;
                  })}
              </div>
              <div className="flex justify-between font-bold mt-2">
                <span>Total Quantity:</span>
                <span>{totalSelected} units</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="orderPlacementDate">Order Placement Date</Label>
                <Input
                  id="orderPlacementDate"
                  type="date"
                  value={marketingOrderData.orderPlacementDate}
                  onChange={(e) => setMarketingOrderData({
                    ...marketingOrderData,
                    orderPlacementDate: e.target.value
                  })}
                />
              </div>
              <div>
                <Label htmlFor="plannedDeliveryDate">Planned Delivery Date (Optional)</Label>
                <Input
                  id="plannedDeliveryDate"
                  type="date"
                  value={marketingOrderData.plannedDeliveryDate}
                  onChange={(e) => setMarketingOrderData({
                    ...marketingOrderData,
                    plannedDeliveryDate: e.target.value
                  })}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={marketingOrderData.description}
                onChange={(e) => setMarketingOrderData({
                  ...marketingOrderData,
                  description: e.target.value
                })}
                placeholder="Add any special instructions or notes for this order..."
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