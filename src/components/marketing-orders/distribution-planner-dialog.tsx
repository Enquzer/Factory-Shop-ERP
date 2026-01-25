"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { Loader2, Calculator, Info, Check, TrendingUp, BarChart3, BrainCircuit } from "lucide-react";
import { getShops, Shop } from "@/lib/shops";
import { cn } from "@/lib/utils";
import { calculateDistribution, ShopAllocation } from "@/lib/distribution-algorithm";

interface TendencyData {
  totalUnits: number;
  sizePercentages: { size: string; quantity: number; percentage: number }[];
  colorPercentages: { color: string; quantity: number; percentage: number }[];
  variantPercentages: { size: string; color: string; quantity: number; percentage: number }[];
  inventory: {
    totalStock: number;
    colorStock: Record<string, number>;
    sizeStock: Record<string, number>;
    variantStock: { color: string; size: string; quantity: number }[];
  };
}

export interface PlanningResultItem {
  color: string;
  size: string;
  quantity: number;
}

interface DistributionPlannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (items: PlanningResultItem[]) => void;
  defaultQuantity?: number;
}

export function DistributionPlannerDialog({
  open,
  onOpenChange,
  onConfirm,
  defaultQuantity = 1200,
}: DistributionPlannerDialogProps) {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loadingShops, setLoadingShops] = useState(false);

  // Matrix Inputs
  const [colors, setColors] = useState<string[]>([]); // e.g. ["Red", "Blue"]
  const [sizes, setSizes] = useState<string[]>([]);   // e.g. ["S", "M", "L"]
  const [newColor, setNewColor] = useState("");
  const [newSize, setNewSize] = useState("");
  
  // Algorithm Parameters
  const [qtyPerVariant, setQtyPerVariant] = useState<number>(defaultQuantity);
  const [multiple, setMultiple] = useState<number>(12);
  const [priorityPercent, setPriorityPercent] = useState<number>(30);
  const [priorityShopIds, setPriorityShopIds] = useState<string[]>([]);

  // Trend Analytics
  const [tendencyData, setTendencyData] = useState<TendencyData | null>(null);
  const [isApplyingTrends, setIsApplyingTrends] = useState(false);
  const [isBalancingStock, setIsBalancingStock] = useState(false);
  const [totalProjectQty, setTotalProjectQty] = useState<number>(defaultQuantity * 6); // Default for multi-variant
  
  const [manualVariantQtys, setManualVariantQtys] = useState<Record<string, number>>({});
  const [minCoverageOverride, setMinCoverageOverride] = useState<number | null>(null);
  
  // Computed State
  const [allocations, setAllocations] = useState<Record<string, ShopAllocation[]>>({}); // Key: "Color-Size"
  const [totalOrderQty, setTotalOrderQty] = useState(0);

  useEffect(() => {
    if (open) {
      fetchShops();
      fetchTendency();
      // Reset or init defaults if needed
      if (colors.length === 0) setColors(["Standard"]); 
      if (sizes.length === 0) setSizes(["Free"]);
    }
  }, [open]);

  const fetchTendency = async () => {
    try {
      const res = await fetch('/api/analytics/order-tendency');
      const data = await res.json();
      setTendencyData(data);
    } catch (e) {
      console.error("Failed to fetch tendency", e);
    }
  };

  // Update total recommended when shops load
  useEffect(() => {
     if (shops.length > 0 && qtyPerVariant < (shops.length * multiple)) {
        // Suggest a minimum meaningful quantity per variant
        setQtyPerVariant(shops.length * multiple);
     }
  }, [shops, multiple]);

  const fetchShops = async () => {
    setLoadingShops(true);
    try {
      const fetchedShops = await getShops();
      const activeShops = fetchedShops.filter(s => s.status === 'Active');
      setShops(activeShops);
      
      // Default Priorities
      if (priorityShopIds.length === 0 && activeShops.length >= 2) {
         setPriorityShopIds([activeShops[0].id, activeShops[1].id]);
      } else if (priorityShopIds.length === 0 && activeShops.length > 0) {
         setPriorityShopIds([activeShops[0].id]);
      }
    } catch (error) {
      console.error("Failed to fetch shops", error);
    } finally {
      setLoadingShops(false);
    }
  };

  const [selectedVariantKey, setSelectedVariantKey] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<"breakdown" | "matrix" | "trends">("matrix");

  // Helper to get historical weight for a variant
  const getHistoricalWeight = (color: string, size: string) => {
    if (!tendencyData) return null;
    
    // Exact match
    const exact = tendencyData.variantPercentages.find(v => v.color === color && v.size === size);
    if (exact) return exact.percentage;

    // Derived match (Color Weight * Size Weight)
    const colorWeight = tendencyData.colorPercentages.find(c => c.color === color)?.percentage || 1;
    const sizeWeight = tendencyData.sizePercentages.find(s => s.size === size)?.percentage || 1;
    
    // Normalize to 100 based on selected matrix if needed, but for now simple product
    return (colorWeight * sizeWeight) / 100;
  };

  // Main Calculation Effect
  useEffect(() => {
    if (shops.length === 0) return;

    const newAllocations: Record<string, ShopAllocation[]> = {};
    let grandTotal = 0;

    // 1. Determine relative weights if applying trends
    const variantWeights: Record<string, number> = {};
    let totalWeightSum = 0;

    if (isApplyingTrends) {
      colors.forEach(color => {
        sizes.forEach(size => {
          const weight = getHistoricalWeight(color, size) || (100 / (colors.length * sizes.length));
          variantWeights[`${color}-${size}`] = weight;
          totalWeightSum += weight;
        });
      });
    }

    // 2. Iterate matrix and calculate
    colors.forEach(color => {
      sizes.forEach(size => {
         const key = `${color}-${size}`;
         
         let targetQty = qtyPerVariant;
         
         // Priority 1: Manual Override
         if (manualVariantQtys[key] !== undefined) {
           targetQty = manualVariantQtys[key];
         }
         // Priority 2: Intelligent Trends
         else if (isApplyingTrends && totalWeightSum > 0) {
            let weight = variantWeights[key] / totalWeightSum;
            
            // Apply Stock Balancing if enabled
            if (isBalancingStock && tendencyData) {
               const currentStock = tendencyData.inventory.variantStock.find(v => v.color === color && v.size === size)?.quantity || 0;
               const avgStock = tendencyData.inventory.totalStock / (tendencyData.inventory.variantStock.length || 1);
               
               // If stock is > 1.5x average, penalize production weight
               if (currentStock > avgStock * 1.5) {
                  weight = weight * 0.7; // Reduce by 30%
               } else if (currentStock < avgStock * 0.5 && currentStock > 0) {
                  weight = weight * 1.25; // Increase by 25% to refill
               }
            }

            // Distribute project total by adjusted weight
            targetQty = Math.round(totalProjectQty * weight);
            // Ensure multiple
            targetQty = Math.max(multiple, Math.round(targetQty / multiple) * multiple);
         }

         const params = {
            totalQuantity: targetQty,
            priorityPercentage: priorityPercent,
            multiple: multiple,
            priorityShopIds: priorityShopIds,
            allShops: shops.map(s => ({ id: s.id, name: s.name })),
         };

         const result = calculateDistribution(params);
         newAllocations[key] = result;
         
         const variantTotal = result.reduce((sum, a) => sum + a.allocation, 0);
         grandTotal += variantTotal;
      });
    });

    setAllocations(newAllocations);
    setTotalOrderQty(grandTotal);

    // Default selection to first variant if none selected or if selected is gone
    const keys = Object.keys(newAllocations);
    if (keys.length > 0 && (!selectedVariantKey || !newAllocations[selectedVariantKey])) {
      setSelectedVariantKey(keys[0]);
    }
    
  }, [shops, qtyPerVariant, multiple, priorityPercent, priorityShopIds, colors, sizes, isApplyingTrends, totalProjectQty, manualVariantQtys, isBalancingStock]);


  // Suggestions for missing colors
  const suggestedBestSellers = useMemo(() => {
    if (!tendencyData) return [];
    
    // Find colors in tendency that are NOT in current matrix
    return tendencyData.colorPercentages
      .filter(cp => !colors.includes(cp.color))
      .filter(cp => cp.percentage > 10) // Only suggest if > 10% share
      .slice(0, 3);
  }, [tendencyData, colors]);

  const togglePriorityShop = (shopId: string) => {
    setPriorityShopIds(prev => 
      prev.includes(shopId) 
        ? prev.filter(id => id !== shopId)
        : [...prev, shopId]
    );
  };

  const handleAddColor = () => {
    if (newColor.trim() && !colors.includes(newColor.trim())) {
      setColors(prev => prev.filter(s => s !== "Standard").concat(newColor.trim()));
      setNewColor("");
    }
  };
  const handleAddSize = () => {
     if (newSize.trim() && !sizes.includes(newSize.trim())) {
      setSizes(prev => prev.filter(s => s !== "Free").concat(newSize.trim()));
      setNewSize("");
    }
  };
  const removeColor = (c: string) => setColors(prev => prev.length > 1 ? prev.filter(x => x !== c) : prev);
  const removeSize = (s: string) => setSizes(prev => prev.length > 1 ? prev.filter(x => x !== s) : prev);

  const handleConfirm = () => {
    const items: PlanningResultItem[] = [];
    
    Object.keys(allocations).forEach(key => {
       const [color, size] = key.split('-');
       const total = allocations[key].reduce((sum, a) => sum + a.allocation, 0);
       items.push({ color, size, quantity: total });
    });
    
    onConfirm(items);
    onOpenChange(false);
  };
    
  // Sample helper to show "Items Needed for full coverage"
  const minCoverageQty = minCoverageOverride ?? (shops.length * multiple);

  const currentPreviewAllocations = selectedVariantKey ? allocations[selectedVariantKey] : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[98vw] w-[1400px] max-h-[98vh] h-[95vh] flex flex-col p-0 border-none shadow-2xl overflow-hidden">
        <div className="px-6 py-3 border-b bg-primary text-primary-foreground shrink-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl font-black">
              <Calculator className="h-6 w-6" />
              SMART DISTRIBUTION PLANNER
            </DialogTitle>
            <DialogDescription className="text-primary-foreground/80 text-sm font-medium">
               Optimized Quantity Allocation based on Multi-Shop Weighted Logic
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 bg-muted/10">
          
          {/* --- LEFT: CONFIG (3 cols) --- */}
          <div className="lg:col-span-3 border-r bg-white flex flex-col overflow-hidden shadow-sm z-20">
            <ScrollArea className="flex-1">
              <div className="p-5 space-y-6">
                {/* 1. Matrix Setup */}
                <div className="space-y-4">
                   <div className="flex items-center gap-2">
                      <div className="h-5 w-1 bg-primary rounded-full"></div>
                      <h4 className="font-bold text-xs uppercase tracking-widest text-foreground">Matrix Construction</h4>
                   </div>
                   
                   {/* Colors */}
                   <div className="space-y-2">
                     <Label className="text-[10px] font-bold text-muted-foreground uppercase">Colors</Label>
                     <div className="flex gap-2">
                       <Input value={newColor} onChange={e => setNewColor(e.target.value)} placeholder="Color" onKeyDown={e => e.key === 'Enter' && handleAddColor()} className="h-8 border text-sm" />
                       <Button size="icon" variant="secondary" onClick={handleAddColor} type="button" className="h-8 w-8 shrink-0">+</Button>
                     </div>
                     <div className="flex flex-wrap gap-1.5 pt-1">
                       {colors.map(c => (
                         <Badge key={c} variant="secondary" className="pl-2 pr-1 py-0.5 gap-1 text-[10px] font-bold bg-muted/50 border group hover:bg-destructive/5 transition-all cursor-pointer">
                           {c} 
                           <button onClick={() => removeColor(c)} className="text-muted-foreground group-hover:text-destructive">×</button>
                         </Badge>
                       ))}
                     </div>
                   </div>

                   {/* Sizes */}
                   <div className="space-y-2">
                     <Label className="text-[10px] font-bold text-muted-foreground uppercase">Sizes</Label>
                     <div className="flex gap-2">
                       <Input value={newSize} onChange={e => setNewSize(e.target.value)} placeholder="Size" onKeyDown={e => e.key === 'Enter' && handleAddSize()} className="h-8 border text-sm" />
                       <Button size="icon" variant="secondary" onClick={handleAddSize} type="button" className="h-8 w-8 shrink-0">+</Button>
                     </div>
                     <div className="flex flex-wrap gap-1.5 pt-1">
                       {sizes.map(s => (
                         <Badge key={s} variant="secondary" className="pl-2 pr-1 py-0.5 gap-1 text-[10px] font-bold bg-muted/50 border group hover:bg-destructive/5 transition-all cursor-pointer">
                           {s} 
                           <button onClick={() => removeSize(s)} className="text-muted-foreground group-hover:text-destructive">×</button>
                         </Badge>
                       ))}
                     </div>
                   </div>
                </div>

                <Separator />

                {/* 2. Quantity Logic */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                      <div className="h-5 w-1 bg-primary rounded-full"></div>
                      <h4 className="font-bold text-xs uppercase tracking-widest text-foreground">Target Parameters</h4>
                   </div>
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2 bg-primary/5 p-2 rounded-lg border border-primary/10">
                       <div className="flex items-center justify-between">
                          <Label className="text-[10px] font-black uppercase text-primary flex items-center gap-2 cursor-pointer">
                             <BrainCircuit className="h-4 w-4" />
                             Trend Weighted
                          </Label>
                          <Checkbox 
                           checked={isApplyingTrends} 
                           onCheckedChange={(checked) => setIsApplyingTrends(!!checked)}
                          />
                       </div>
                       
                       {isApplyingTrends && (
                          <div className="flex items-center justify-between border-t border-primary/10 pt-2">
                             <Label className="text-[9px] font-bold uppercase text-slate-500 flex items-center gap-2 cursor-pointer">
                                Inventory Balancing
                             </Label>
                             <Checkbox 
                              checked={isBalancingStock} 
                              onCheckedChange={(checked) => setIsBalancingStock(!!checked)}
                             />
                          </div>
                       )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase">
                        {isApplyingTrends ? "Total Project Units" : "Base Qty / Variant"}
                      </Label>
                      <Input 
                        type="number" 
                        value={isApplyingTrends ? totalProjectQty : qtyPerVariant} 
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (isApplyingTrends) setTotalProjectQty(val);
                          else setQtyPerVariant(val);
                        }}
                        min={0}
                        className="h-10 text-xl font-black font-mono border-primary/20 bg-primary/5 text-primary"
                      />
                      <div className="space-y-1 border rounded-lg p-2 bg-blue-50/50 border-blue-100">
                        <div className="flex justify-between items-center">
                          <Label className="text-[9px] text-blue-800 font-bold uppercase cursor-help flex items-center gap-1">
                             Min Coverage
                             <Info className="h-2.5 w-2.5" />
                          </Label>
                          <div className="flex items-center gap-1">
                            <Input 
                              type="number"
                              value={minCoverageQty}
                              onChange={(e) => setMinCoverageOverride(Number(e.target.value))}
                              className="h-5 w-12 text-[10px] font-black p-0 text-center bg-white"
                            />
                            <span className="text-[9px] font-bold text-blue-900">pcs</span>
                          </div>
                        </div>
                        <p className="text-[8px] text-blue-600 leading-tight">Minimum units required to satisfy all active shops ({shops.length}) based on pack size.</p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                       <Label className="text-[10px] font-bold text-muted-foreground uppercase">Pack Size</Label>
                       <Select value={multiple.toString()} onValueChange={(v) => setMultiple(Number(v))}>
                        <SelectTrigger className="h-9 font-bold text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[6, 12, 24, 36, 48, 60].map(m => (
                            <SelectItem key={m} value={m.toString()} className="font-bold text-xs">{m} Unit Pack</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* 3. Priority Logic */}
                <div className="space-y-4">
                   <div className="flex items-center gap-2">
                      <div className="h-5 w-1 bg-primary rounded-full"></div>
                      <h4 className="font-bold text-xs uppercase tracking-widest text-foreground flex-1">Priorities</h4>
                      <Badge className="bg-primary hover:bg-primary text-white text-[10px] font-black h-5">{priorityPercent}%</Badge>
                   </div>
                  <div className="space-y-5">
                     <div className="space-y-2 px-1">
                       <Slider 
                          value={[priorityPercent]} 
                          max={80} min={10} step={5} 
                          onValueChange={(vals: number[]) => setPriorityPercent(vals[0])} 
                        />
                       <div className="flex justify-between text-[9px] font-bold text-muted-foreground/60 uppercase">
                          <span>Fair</span>
                          <span>Priority</span>
                       </div>
                     </div>
                     
                     <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase">High Tier Shops</Label>
                      <ScrollArea className="h-[150px] border rounded-lg bg-muted/10 p-1.5">
                        {loadingShops ? <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : (
                          <div className="space-y-0.5">
                            {shops.map(shop => (
                              <div key={shop.id} className={cn(
                                 "flex items-center space-x-2 p-1.5 rounded-md transition-all border border-transparent",
                                 priorityShopIds.includes(shop.id) ? "bg-primary/10 border-primary/10" : "hover:bg-white"
                              )}>
                                <Checkbox 
                                  id={`shop-${shop.id}`}
                                  checked={priorityShopIds.includes(shop.id)}
                                  onCheckedChange={() => togglePriorityShop(shop.id)}
                                  className="h-3.5 w-3.5"
                                />
                                <Label htmlFor={`shop-${shop.id}`} className="text-xs font-bold cursor-pointer truncate flex-1">
                                  {shop.name}
                                </Label>
                                {priorityShopIds.includes(shop.id) && <Check className="h-3 w-3 text-primary" />}
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* --- RIGHT: PREVIEW (9 cols) --- */}
          <div className="lg:col-span-9 flex flex-col bg-slate-50 overflow-hidden">
             
             {/* Header with Stats - more compact */}
             <div className="px-6 py-4 flex justify-between items-center overflow-hidden bg-white border-b shadow-sm shrink-0">
                <div className="flex gap-8">
                   <div className="space-y-0.5">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SKUs</p>
                      <p className="text-2xl font-black text-slate-800">{colors.length * sizes.length}</p>
                   </div>
                   <div className="space-y-0.5">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Shops</p>
                      <p className="text-2xl font-black text-slate-800">{shops.length}</p>
                   </div>
                   <div className="space-y-0.5">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Efficiency</p>
                      <p className="text-2xl font-black text-slate-800">{Math.round((totalOrderQty / (qtyPerVariant * colors.length * sizes.length || 1)) * 100)}%</p>
                   </div>
                </div>

                <div className="bg-slate-900 border-2 border-slate-800 px-5 py-2.5 rounded-xl shadow-lg flex items-center gap-6">
                   <div className="text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Pieces</p>
                      <p className="text-3xl font-black text-white tabular-nums tracking-tighter">{totalOrderQty.toLocaleString()}</p>
                   </div>
                   <div className="h-8 w-px bg-slate-700"></div>
                   <div className="text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Variant Avg</p>
                      <p className="text-2xl font-black text-primary tabular-nums tracking-tighter">{Math.round(totalOrderQty / (colors.length * sizes.length || 1))}</p>
                   </div>
                </div>
             </div>

             {/* Main Content Area */}
             <div className="flex-1 overflow-hidden flex flex-col">
                <div className="px-6 py-2 bg-white border-b flex justify-between items-center z-10 shrink-0">
                   <div className="flex bg-slate-100 p-0.5 rounded-lg w-fit border shadow-inner">
                       <Button 
                        variant={viewMode === 'matrix' ? "default" : "ghost"} 
                        size="sm" 
                        onClick={() => setViewMode('matrix')}
                        className={cn("rounded-md px-4 py-1 h-7 font-black uppercase text-[10px]", viewMode === 'matrix' ? "shadow shadow-black/20" : "text-slate-500")}
                       >
                         Master Matrix
                       </Button>
                       <Button 
                        variant={viewMode === 'trends' ? "default" : "ghost"} 
                        size="sm" 
                        onClick={() => setViewMode('trends')}
                        className={cn("rounded-md px-4 py-1 h-7 font-black uppercase text-[10px]", viewMode === 'trends' ? "shadow shadow-black/20" : "text-slate-500")}
                       >
                         Demand Trends
                       </Button>
                       <Button 
                        variant={viewMode === 'breakdown' ? "default" : "ghost"} 
                        size="sm" 
                        onClick={() => setViewMode('breakdown')}
                        className={cn("rounded-md px-4 py-1 h-7 font-black uppercase text-[10px]", viewMode === 'breakdown' ? "shadow shadow-black/20" : "text-slate-500")}
                       >
                         Shop Breakdown
                       </Button>
                   </div>

                   {selectedVariantKey && (
                     <div className="flex gap-2 font-black text-[10px] text-slate-500 uppercase tracking-widest">
                        {viewMode === 'breakdown' ? `Allocating ${selectedVariantKey.replace('-', ' \u2022 ')}` : "Live Global Distribution"}
                     </div>
                   )}
                </div>

                <div className="flex-1 overflow-auto p-5 pt-3">
                  {viewMode === 'trends' && (
                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           {/* Sizes Trend */}
                           <Card className="p-6 border-2">
                              <h4 className="text-sm font-black uppercase text-primary flex items-center gap-2 mb-6">
                                 <TrendingUp className="h-5 w-5" />
                                 Historical Size Tendency
                              </h4>
                              <div className="space-y-4">
                                 {tendencyData?.sizePercentages.map(s => (
                                    <div key={s.size} className="space-y-1">
                                       <div className="flex justify-between text-xs font-bold">
                                          <span>{s.size}</span>
                                          <span>{s.percentage.toFixed(1)}%</span>
                                       </div>
                                       <div className="h-2 bg-muted rounded-full overflow-hidden">
                                          <div className="h-full bg-primary" style={{ width: `${s.percentage}%` }}></div>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           </Card>

                            {/* Colors Trend */}
                            <Card className="p-6 border-2">
                              <h4 className="text-sm font-black uppercase text-secondary flex items-center gap-2 mb-6">
                                 <BarChart3 className="h-5 w-5" />
                                 Top color Performance
                              </h4>
                              <div className="space-y-4">
                                 {tendencyData?.colorPercentages.slice(0, 8).map(c => (
                                    <div key={c.color} className="space-y-1">
                                       <div className="flex justify-between text-xs font-bold">
                                          <span className="flex items-center gap-2">
                                             <div className="h-2 w-2 rounded-full border" style={{ backgroundColor: c.color.toLowerCase() }}></div>
                                             {c.color}
                                          </span>
                                          <span>{c.percentage.toFixed(1)}%</span>
                                       </div>
                                       <div className="h-2 bg-muted rounded-full overflow-hidden">
                                          <div className="h-full bg-secondary" style={{ width: `${c.percentage}%` }}></div>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           </Card>
                        </div>

                        <Card className="p-6 border-2 bg-primary/5">
                           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                              <div>
                                 <h4 className="text-sm font-black uppercase text-primary">Smart AI weighting logic</h4>
                                 <p className="text-[10px] font-bold text-muted-foreground">Historical order patterns across {tendencyData?.totalUnits.toLocaleString()} units analyzed.</p>
                              </div>
                              <Button 
                                onClick={() => setIsApplyingTrends(!isApplyingTrends)}
                                variant={isApplyingTrends ? "default" : "outline"}
                                className="font-black gap-2"
                              >
                                 <BrainCircuit className="h-4 w-4" />
                                 {isApplyingTrends ? "Disable Auto-Weight" : "Apply Intelligent Weights"}
                              </Button>
                           </div>
                           
                           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                              {colors.map(color => sizes.map(size => {
                                 const weight = getHistoricalWeight(color, size);
                                 return weight ? (
                                    <div key={`${color}-${size}`} className="p-3 bg-white rounded-lg border-2 shadow-sm flex flex-col items-center">
                                       <span className="text-[9px] font-black uppercase text-muted-foreground">{color}</span>
                                       <span className="text-lg font-black">{size}</span>
                                       <Badge variant="outline" className="mt-2 text-[10px] font-bold text-primary">{weight.toFixed(1)}% demand</Badge>
                                    </div>
                                 ) : null;
                              }))}
                           </div>
                        </Card>
                    </div>
                  )}

                  {viewMode === 'matrix' ? (
                    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                      <div className="flex justify-between items-center px-1">
                        <div className="flex items-center gap-2">
                           <Info className="h-4 w-4 text-slate-400" />
                           <p className="text-[10px] font-bold text-slate-500 uppercase">Tip: Click on any quantity to manually adjust the production load for that variant.</p>
                        </div>
                        {Object.keys(manualVariantQtys).length > 0 && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setManualVariantQtys({})}
                            className="h-6 text-[10px] font-black text-destructive hover:bg-destructive/10 uppercase"
                          >
                            Reset to Calculated
                          </Button>
                        )}
                      </div>

                      {/* AI Suggestions Box */}
                      {suggestedBestSellers.length > 0 && (
                        <div className="px-1 mb-4">
                           <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 flex gap-4 items-center animate-in slide-in-from-top-4 duration-500">
                             <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                                <BrainCircuit className="h-6 w-6 text-orange-600" />
                             </div>
                             <div className="flex-1">
                                <h5 className="text-[10px] font-black text-orange-800 uppercase tracking-widest mb-1">AI Placement Discovery</h5>
                                <p className="text-xs font-bold text-orange-700">
                                   Historical data suggests <span className="underline decoration-2 font-black">"{suggestedBestSellers[0].color}"</span> is a major seller ({suggestedBestSellers[0].percentage.toFixed(0)}% demand) but is missing from your plan.
                                </p>
                             </div>
                             <Button 
                               variant="outline" 
                               size="sm" 
                               onClick={() => {
                                  setColors(prev => prev.filter(c => c !== "Standard").concat(suggestedBestSellers[0].color));
                               }}
                               className="bg-white border-orange-200 text-orange-700 font-black text-[10px] uppercase hover:bg-orange-100"
                             >
                                Add {suggestedBestSellers[0].color}
                             </Button>
                           </div>
                        </div>
                      )}

                      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-slate-50">
                              <th className="p-3 text-left border-b bg-slate-100/50 font-black text-slate-500 uppercase tracking-widest text-[9px] w-[150px]">SKU Matrix</th>
                              {sizes.map(size => (
                                <th key={size} className="p-3 text-center border-b font-black text-slate-800 uppercase text-xs">{size}</th>
                              ))}
                              <th className="p-3 text-center border-b bg-primary/5 font-black text-primary uppercase text-xs">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {colors.map(color => (
                              <tr key={color} className="group hover:bg-slate-50/50 transition-colors">
                                <td className="p-3 font-bold text-slate-700 text-sm border-r flex items-center gap-2">
                                   <div className="h-3 w-3 rounded-full border shadow-[0_0_2px_rgba(0,0,0,0.1)]" style={{ backgroundColor: color.toLowerCase() }}></div>
                                   {color}
                                </td>
                                {sizes.map(size => {
                                  const key = `${color}-${size}`;
                                  const total = allocations[key]?.reduce((sum, a) => sum + a.allocation, 0) || 0;
                                  const isManual = manualVariantQtys[key] !== undefined;
                                  
                                  const inv = tendencyData?.inventory.variantStock.find(v => v.color === color && v.size === size)?.quantity || 0;

                                  return (
                                    <td key={size} className={cn(
                                      "p-2 text-center bg-white group-hover:bg-slate-50/50 transition-colors relative",
                                      isManual && "bg-orange-50/30"
                                    )}>
                                       <div className="flex flex-col items-center">
                                          <Input 
                                            type="number"
                                            value={total}
                                            onChange={(e) => {
                                              const newVal = Number(e.target.value);
                                              setManualVariantQtys(prev => ({ ...prev, [key]: newVal }));
                                            }}
                                            className={cn(
                                              "h-9 w-20 text-center font-mono text-base font-black bg-transparent border-none focus-visible:ring-primary/20 hover:bg-muted/50 rounded-md transition-all",
                                              isManual ? "text-orange-600" : "text-slate-600"
                                            )}
                                          />
                                          <div className="flex gap-1.5 items-center">
                                             {isManual ? (
                                               <span className="text-[8px] font-black text-orange-400 uppercase leading-none">Manual</span>
                                             ) : inv > 0 ? (
                                               <span className="text-[7px] font-bold text-slate-400 leading-none">Stock: {inv}</span>
                                             ) : null}
                                          </div>
                                       </div>
                                    </td>
                                  );
                                })}
                                <td className="p-3 text-center font-black text-lg text-primary bg-primary/5">
                                   {sizes.reduce((sum, size) => sum + (allocations[`${color}-${size}`]?.reduce((a, b) => a + b.allocation, 0) || 0), 0).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="border-t-2 border-slate-900 bg-slate-900 text-white">
                            <tr className="font-bold">
                              <td className="p-3 text-slate-400 font-black uppercase text-[9px] tracking-widest border-r border-slate-800">Summaries</td>
                              {sizes.map(size => (
                                <td key={size} className="p-3 text-center text-sm tabular-nums">
                                   {colors.reduce((sum, color) => sum + (allocations[`${color}-${size}`]?.reduce((a, b) => a + b.allocation, 0) || 0), 0).toLocaleString()}
                                </td>
                              ))}
                              <td className="p-3 text-center text-xl text-primary bg-primary/20">
                                {totalOrderQty.toLocaleString()}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                       <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                          {Object.keys(allocations).map(key => (
                             <Button
                               key={key}
                               variant={selectedVariantKey === key ? "default" : "outline"}
                               size="sm"
                               onClick={() => setSelectedVariantKey(key)}
                               className={cn(
                                 "shrink-0 h-10 px-4 gap-2 border transition-all",
                                 selectedVariantKey === key ? "shadow-md scale-102 border-primary" : "bg-white text-[10px] font-bold"
                               )}
                             >
                                <div className="text-left leading-none">
                                   <p className="text-[7px] uppercase font-bold text-muted-foreground opacity-70 mb-0.5">{key.split('-')[0]}</p>
                                   <p className="text-xs font-black">{key.split('-')[1]}</p>
                                </div>
                                <Separator orientation="vertical" className="h-4 bg-slate-200" />
                                <span className="text-sm font-bold tabular-nums">{allocations[key].reduce((a,b)=>a+b.allocation,0)}</span>
                             </Button>
                          ))}
                       </div>

                       <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-slate-50">
                                <th className="px-6 py-3 text-left font-black text-slate-400 uppercase tracking-widest text-[8px]">Retail Shop</th>
                                <th className="px-6 py-3 text-center font-black text-slate-400 uppercase tracking-widest text-[8px]">Tier</th>
                                <th className="px-6 py-3 text-right font-black text-slate-400 uppercase tracking-widest text-[8px]">Target</th>
                                <th className="px-6 py-3 text-right font-black text-slate-400 uppercase tracking-widest text-[8px]">Packs</th>
                                <th className="px-6 py-3 text-right font-black text-primary uppercase tracking-widest text-[8px] bg-primary/5">Confirmed</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {currentPreviewAllocations.map((alloc) => (
                                <tr key={alloc.shopId} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-6 py-2 font-bold text-slate-700">{alloc.shopName}</td>
                                  <td className="px-6 py-2 text-center">
                                     {alloc.isPriority ? (
                                       <span className="bg-orange-100 text-orange-600 font-black px-1.5 py-0.5 rounded text-[8px] uppercase">Priority</span>
                                     ) : (
                                       <span className="text-slate-300 font-bold text-[8px] uppercase">Standard</span>
                                     )}
                                  </td>
                                  <td className="px-6 py-2 text-right font-mono text-slate-400 tabular-nums">{Math.round(alloc.target)}</td>
                                  <td className="px-6 py-2 text-right font-bold text-slate-500">{alloc.packs}</td>
                                  <td className="px-6 py-2 text-right font-black text-primary bg-primary/5 text-base">{alloc.allocation}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-primary text-primary-foreground border-t-2 border-slate-900">
                               <tr className="font-black">
                                  <td colSpan={3} className="px-6 py-3 text-xs uppercase tracking-tight">Variant SKU Total Confirmation</td>
                                  <td className="px-6 py-3 text-right text-sm">{currentPreviewAllocations.reduce((a,b)=>a+b.packs,0)} Packs</td>
                                  <td className="px-6 py-3 text-right text-xl tabular-nums shadow-[-4px_0_12px_rgba(0,0,0,0.1)]">{currentPreviewAllocations.reduce((sum, a) => sum + a.allocation, 0)}</td>
                               </tr>
                            </tfoot>
                          </table>
                       </div>
                    </div>
                  )}
                </div>
             </div>
          </div>
        </div>

        <div className="px-8 py-4 border-t bg-white flex justify-between items-center shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] z-30">
           <div className="flex items-center gap-8">
              <div className="flex flex-col">
                 <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Distribution State</span>
                 <div className="flex items-center gap-2">
                    <span className="text-xl font-black text-slate-800">READY</span>
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                 </div>
              </div>
              <Separator orientation="vertical" className="h-10 w-0.5 bg-slate-100" />
              <div className="flex flex-col">
                 <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Full Order Payload</span>
                 <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-primary tabular-nums tracking-tight">{totalOrderQty.toLocaleString()}</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Units</span>
                 </div>
              </div>
           </div>
           
           <div className="flex gap-3">
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-10 px-6 font-bold text-slate-400 hover:text-slate-600 text-base">Cancel</Button>
              <Button onClick={handleConfirm} size="lg" className="h-12 px-10 font-black text-xl gap-3 shadow-xl shadow-primary/20 rounded-xl hover:scale-102 transition-all">
                <Calculator className="h-6 w-6" />
                INITIATE SMART ORDER
              </Button>
           </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
