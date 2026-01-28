
"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { Product } from "@/lib/products";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useOrder } from "@/hooks/use-order";
import { useShopInventory } from "@/hooks/use-shop-inventory";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { Package, Check, Plus, Minus, Info } from "lucide-react";
import { distributeOrderQuantity } from "@/lib/ai-distribution";
import { MiniStockChart } from "./mini-stock-chart";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

interface ShopProductCardProps {
  product: Product;
  shopSettings: { showVariantDetails: boolean } | null;
  onClick: () => void;
}

export function ShopProductCard({ product, shopSettings, onClick }: ShopProductCardProps) {
  const { user } = useAuth();
  const { items, addSimplifiedOrder } = useOrder();
  const { inventory } = useShopInventory(user?.username || "");
  
  // Local state
  const [quantity, setQuantity] = useState(12);
  const [isHovered, setIsHovered] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const isSimplifiedMode = user?.role === 'shop' && shopSettings && !shopSettings.showVariantDetails;

  // Calculate stats
  const totalStock = product.variants.reduce((acc, v) => acc + v.stock, 0);
  const shopStock = inventory
    ? inventory
        .filter(i => i.productId === product.id)
        .reduce((acc, i) => acc + i.stock, 0)
    : 0;
    
  // Check if item is in cart
  const cartQuantity = items
    .filter(i => i.productId === product.id)
    .reduce((acc, i) => acc + i.quantity, 0);

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuantity(prev => prev + 12);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuantity(prev => Math.max(12, prev - 12));
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val >= 0) {
       setQuantity(val); 
    }
  };

  const handleAddToOrder = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Distribute
    const distribution = distributeOrderQuantity(product.variants as any[], quantity, 'proportional');
    
    await addSimplifiedOrder(product.productCode, distribution);
    
    setJustAdded(true);
    setTimeout(() => {
        setJustAdded(false);
        setIsPopoverOpen(false); // Close popover after success
    }, 1500);
  };

  const handleCardClick = () => {
      onClick();
  };

  return (
    <Card 
      className={cn(
          "overflow-hidden relative group cursor-pointer transition-all duration-300",
          cartQuantity > 0 ? "ring-2 ring-primary bg-primary/5" : "hover:shadow-lg"
      )}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative h-48 sm:h-56">
        <Image
          src={product.imageUrl || '/placeholder-product.png'}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* Status Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
            {totalStock <= 0 && (
                <Badge variant="destructive" className="shadow-lg backdrop-blur-md bg-red-500/80">Out of Stock</Badge>
            )}
            {shopStock > 0 && !cartQuantity && (
                <Badge variant="secondary" className="bg-green-500/80 text-white shadow-lg backdrop-blur-md border-0">
                    {shopStock} In Shop
                </Badge>
            )}
            {cartQuantity > 0 && (
                <Badge className="bg-primary text-primary-foreground shadow-lg animate-in zoom-in-50 duration-300">
                    <Check className="w-3 h-3 mr-1" /> {cartQuantity} In Cart
                </Badge>
            )}
        </div>

        {/* Simplified Mode Popover / Quick Add Button */}
        {isSimplifiedMode && totalStock > 0 && (
            <div className="absolute bottom-2 right-2 left-2 z-20 transition-all transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100">
                <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button 
                            className={cn(
                                "w-full h-9 font-bold shadow-xl backdrop-blur-md transition-all",
                                cartQuantity > 0 ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-white/95 text-black hover:bg-white"
                            )}
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsPopoverOpen(true);
                            }}
                        >
                            {cartQuantity > 0 ? "Update Order" : "Quick Add"}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent 
                        className="w-84 p-0 overflow-hidden bg-background/80 border-border/40 shadow-2xl backdrop-blur-md rounded-xl" 
                        side="top" 
                        align="center"
                        sideOffset={10}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-4 space-y-4">
                            <div className="space-y-1">
                                <h4 className="text-foreground font-bold text-sm leading-tight">{product.name}</h4>
                                <div className="flex justify-between items-center text-[10px] text-muted-foreground font-medium">
                                    <span>{product.productCode}</span>
                                    <span className="text-blue-600 font-bold">{totalStock} Units available</span>
                                </div>
                            </div>

                            <div className="bg-muted/30 p-2 rounded-lg border border-border/10">
                                <MiniStockChart product={product} shopInventory={inventory || []} />
                            </div>

                            <div className="pt-2 flex flex-col gap-3">
                                <div className="flex items-center justify-between bg-muted/40 rounded-lg p-2 border border-border/10">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground/70 ml-1">Pack Quantity</span>
                                    <div className="flex items-center gap-3">
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-7 w-7 text-foreground/70 hover:bg-muted"
                                            onClick={handleDecrement}
                                        >
                                            <Minus className="h-3.5 w-3.5" />
                                        </Button>
                                        <Input 
                                            value={quantity}
                                            onChange={handleQuantityChange}
                                            className="h-7 w-12 bg-transparent border-0 text-foreground text-center font-bold text-sm p-0 focus-visible:ring-0"
                                        />
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-7 w-7 text-foreground/70 hover:bg-muted"
                                            onClick={handleIncrement}
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>

                                <Button 
                                    className={cn(
                                        "w-full h-10 font-bold transition-all shadow-lg text-sm",
                                        justAdded ? "bg-green-500 hover:bg-green-600 scale-[0.98]" : "bg-primary hover:bg-primary/90"
                                    )}
                                    onClick={handleAddToOrder}
                                    disabled={totalStock <= 0}
                                >
                                    {justAdded ? (
                                        <>
                                            <Check className="mr-2 h-4 w-4 stroke-[3px]" /> Success
                                        </>
                                    ) : (
                                        cartQuantity > 0 ? "Apply Changes" : "Confirm Distribution"
                                    )}
                                </Button>
                            </div>
                        </div>
                        <div className="bg-muted/40 px-4 py-2 border-t border-border/10">
                            <p className="text-[9px] text-muted-foreground/60 text-center uppercase tracking-widest font-bold">
                                Proportional Distribution AI
                            </p>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        )}
      </div>

      <CardContent className="p-3">
        <div className="flex justify-between items-start mb-1">
          <div>
            <h3 className="font-medium truncate text-sm sm:text-base pr-2" title={product.name}>{product.name}</h3>
            <p className="text-xs text-muted-foreground">{product.productCode}</p>
          </div>
          <span className="font-bold text-sm">
            {product.agePricing && product.agePricing.length > 0 
                ? `From ETB ${Math.min(...product.agePricing.map(p => p.price)).toLocaleString()}`
                : `ETB ${product.price.toLocaleString()}`}
          </span>
        </div>
        
        {!isSimplifiedMode && (
             <div className="mt-2 flex items-center text-xs text-muted-foreground">
                <Package className="h-3 w-3 mr-1" />
                {totalStock} in Factory
             </div>
        )}
      </CardContent>
    </Card>
  );
}
