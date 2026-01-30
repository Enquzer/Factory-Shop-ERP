"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Download, PackageCheck } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { RawMaterial } from '@/lib/raw-materials';
import { authenticatedFetch } from '@/lib/utils';

interface BOMItem {
  id: string;
  materialName: string;
  materialId: string;
  quantityPerUnit: number;
  wastagePercentage: number;
  unitOfMeasure: string;
  type: string;
  supplier?: string;
  cost?: number;
  color?: string; // Added for color-specific BOM items
  calculatedTotal?: number; // Added for calculated total per color
  requestedQty?: number; // Added for requested quantity
  calculatedCost?: number; // Added for calculated cost
  isCustom?: boolean; // Added to identify custom materials not in the database
  materialImageUrl?: string; // Raw material image URL
}

interface MarketingOrderItem {
  size: string;
  color: string;
  quantity: number;
}

interface OrderDetails {
  id: string;
  orderNumber: string;
  productName: string;
  productCode: string;
  quantity: number;
  imageUrl?: string;
  items: MarketingOrderItem[];
}

interface BOMModificationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  orderDetails: OrderDetails;
  initialBomItems: BOMItem[];
  onSave: (modifiedBomItems: BOMItem[]) => void;
  onGeneratePDF: (processedBomItems: BOMItem[]) => void;
}

export function BOMModificationDialog({
  isOpen,
  onOpenChange,
  orderDetails,
  initialBomItems,
  onSave,
  onGeneratePDF
}: BOMModificationDialogProps) {
  const { toast } = useToast();
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [availableMaterials, setAvailableMaterials] = useState<RawMaterial[]>([]);
  
  const fetchAvailableMaterials = async () => {
    try {
      const response = await fetch('/api/raw-materials', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        const materials = await response.json();
        setAvailableMaterials(materials);
        return materials; // Return materials for direct use if needed
      } else {
        console.error('Failed to fetch materials');
        setAvailableMaterials([]);
        return [];
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
      setAvailableMaterials([]);
      return [];
    }
  };

  useEffect(() => {
    if (isOpen) {
      const loadAndProcessBomItems = async () => {
        // Fetch available materials when dialog opens
        const response = await fetch('/api/raw-materials', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });
        
        let materials = [];
        if (response.ok) {
          materials = await response.json();
        } else {
          console.error('Failed to fetch materials');
        }
        
        setAvailableMaterials(materials);
        
        // Process BOM items to aggregate by color with the fetched materials
        const aggregatedBomItems = processBomItemsByColor(initialBomItems, orderDetails.items, materials);
        setBomItems(aggregatedBomItems);
      };
      
      loadAndProcessBomItems();
    }
  }, [isOpen, initialBomItems, orderDetails]);

  // Function to process BOM items by aggregating quantities by color
  const processBomItemsByColor = (bomItems: BOMItem[], orderItems: MarketingOrderItem[], materials: RawMaterial[] = availableMaterials): BOMItem[] => {
    // Group order items by color to get aggregated quantities
    const colorQuantities: Record<string, number> = {};
    orderItems.forEach(item => {
      const color = item.color.toLowerCase();
      colorQuantities[color] = (colorQuantities[color] || 0) + item.quantity;
    });
    
    // Create aggregated BOM items for each color
    const aggregatedItems: BOMItem[] = [];
    
    // For each original BOM item, create entries for each color with aggregated quantities
    bomItems.forEach(bomItem => {
      Object.keys(colorQuantities).forEach(color => {
        const quantityForColor = colorQuantities[color];
        const calculatedTotal = quantityForColor * bomItem.quantityPerUnit * (1 + (bomItem.wastagePercentage / 100));
        const totalCost = calculatedTotal * (bomItem.cost || 0);
        
        // Find cost and image from available materials if not already set
        let itemCost = bomItem.cost || 0;
        let materialImageUrl = bomItem.materialImageUrl || '';
        if (bomItem.materialName) {
          const matchedMaterial = materials.find(mat => mat.name === bomItem.materialName);
          if (matchedMaterial) {
            if (!itemCost) itemCost = matchedMaterial.costPerUnit;
            materialImageUrl = matchedMaterial.imageUrl || '';
          }
        }
        
        const calculatedCost = calculatedTotal * itemCost;
        
        aggregatedItems.push({
          ...bomItem,
          id: `${bomItem.id}-${color.replace(' ', '_')}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          materialName: `${bomItem.materialName} - ${color.charAt(0).toUpperCase() + color.slice(1)}`,
          color: color.charAt(0).toUpperCase() + color.slice(1),
          calculatedTotal,
          requestedQty: quantityForColor,
          cost: itemCost,
          calculatedCost,
          materialImageUrl
        });
      });
    });
    
    // Also create entries for fabric and thread if they don't already exist
    // Identify existing fabric and thread entries
    const existingFabricColors = new Set();
    const existingThreadColors = new Set();
    
    aggregatedItems.forEach(item => {
      if (item.type.toLowerCase() === 'fabric') {
        existingFabricColors.add(item.color?.toLowerCase());
      } else if (item.type.toLowerCase() === 'thread') {
        existingThreadColors.add(item.color?.toLowerCase());
      }
    });
    
    // Add missing fabric entries for each color
    Object.entries(colorQuantities).forEach(([color, quantity]) => {
      if (!existingFabricColors.has(color.toLowerCase())) {
        // Find fabric cost from available materials
        const fabricMaterial = materials.find(mat => mat.name.toLowerCase().includes('fabric') || mat.category.toLowerCase() === 'fabric');
        const fabricCostPerUnit = fabricMaterial ? fabricMaterial.costPerUnit : 10; // Default $10 per meter
        
        const fabricEntry: BOMItem = {
          id: `fabric-auto-${color.replace(' ', '_')}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          materialName: `Fabric - ${color.charAt(0).toUpperCase() + color.slice(1)}`,
          materialId: `fabric-${color}`,
          quantityPerUnit: 1, // Default consumption per unit
          wastagePercentage: 5, // Default wastage
          unitOfMeasure: 'm',
          type: 'Fabric',
          supplier: 'Auto-generated',
          color: color.charAt(0).toUpperCase() + color.slice(1),
          calculatedTotal: quantity * 1 * (1 + (5 / 100)),
          requestedQty: quantity,
          cost: fabricCostPerUnit,
          calculatedCost: quantity * 1 * (1 + (5 / 100)) * fabricCostPerUnit,
          materialImageUrl: fabricMaterial?.imageUrl || ''
        };
        aggregatedItems.push(fabricEntry);
      }
      
      if (!existingThreadColors.has(color.toLowerCase())) {
        // Find thread cost from available materials
        const threadMaterial = materials.find(mat => mat.name.toLowerCase().includes('thread') || mat.category.toLowerCase() === 'thread');
        const threadCostPerUnit = threadMaterial ? threadMaterial.costPerUnit : 5; // Default $5 per meter
        
        const threadEntry: BOMItem = {
          id: `thread-auto-${color.replace(' ', '_')}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          materialName: `Thread - ${color.charAt(0).toUpperCase() + color.slice(1)}`,
          materialId: `thread-${color}`,
          quantityPerUnit: 0.1, // Default thread consumption per unit
          wastagePercentage: 10, // Thread wastage
          unitOfMeasure: 'm',
          type: 'Thread',
          supplier: 'Auto-generated',
          color: color.charAt(0).toUpperCase() + color.slice(1),
          calculatedTotal: quantity * 0.1 * (1 + (10 / 100)),
          requestedQty: quantity,
          cost: threadCostPerUnit,
          calculatedCost: quantity * 0.1 * (1 + (10 / 100)) * threadCostPerUnit,
          materialImageUrl: threadMaterial?.imageUrl || ''
        };
        aggregatedItems.push(threadEntry);
      }
    });
    
    return aggregatedItems;
  };



  const addBomItem = () => {
    const newItem: BOMItem = {
      id: `new-${Date.now()}`,
      materialName: '',
      materialId: '',
      quantityPerUnit: 0,
      wastagePercentage: 5,
      unitOfMeasure: '',
      type: 'Fabric',
      supplier: '',
      cost: 0,
      requestedQty: orderDetails.quantity || 1,
      calculatedTotal: 0,
      calculatedCost: 0,
      materialImageUrl: ''
    };
    setBomItems(prev => [...prev, newItem]);
  };

  const removeBomItem = (id: string) => {
    setBomItems(prev => prev.filter(item => item.id !== id));
  };
  
  const updateBomItem = (id: string, field: keyof BOMItem, value: any) => {
    updateBomItemWithCalculation(id, field, value);
  };
  
  const requestMaterialForOrder = async (orderId: string, materialName: string, quantity: number, unit: string) => {
    try {
      const response = await fetch('/api/requisitions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          orderId,
          materialName,
          quantityRequested: quantity,
          status: 'Pending'
        })
      });
      
      if (response.ok) {
        toast({
          title: "Material Request Submitted",
          description: `Material request for ${materialName} has been submitted.`
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit material request');
      }
    } catch (error: any) {
      console.error('Error requesting material:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit material request",
        variant: "destructive"
      });
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Save the aggregated BOM items to the order database
      const response = await fetch(`/api/marketing-orders/${orderDetails.id}/bom`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ bomItems })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save BOM items');
      }

      onSave(bomItems);
      toast({
        title: "Success",
        description: "BOM items updated successfully!"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save BOM items",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate aggregated color quantities
  const colorQuantities: Record<string, number> = {};
  orderDetails.items.forEach(item => {
    const color = item.color.toLowerCase();
    colorQuantities[color] = (colorQuantities[color] || 0) + item.quantity;
  });

  const calculateCalculatedTotal = (item: BOMItem) => {
    // Calculate based on quantity per unit, wastage percentage, and requested quantity
    const qtyPerUnit = item.quantityPerUnit || 0;
    const wastagePercent = item.wastagePercentage || 0;
    const requestedQty = item.requestedQty || orderDetails.quantity || 1; // Use order quantity as fallback
    
    // Formula: (quantity per unit * requested quantity) * (1 + wastage percentage / 100)
    const calculatedTotal = (qtyPerUnit * requestedQty) * (1 + wastagePercent / 100);
    
    return calculatedTotal;
  };

  const calculateCalculatedCost = (item: BOMItem) => {
    // Calculate based on calculated total and cost per unit
    const calculatedTotal = calculateCalculatedTotal(item);
    
    // Look up the cost per unit from available materials if not set
    let costPerUnit = item.cost || 0;
    if (!costPerUnit && item.materialName) {
      const matchedMaterial = availableMaterials.find(mat => mat.name === item.materialName);
      if (matchedMaterial) {
        costPerUnit = matchedMaterial.costPerUnit;
      }
    }
    
    // Formula: calculated total * cost per unit
    const calculatedCost = calculatedTotal * costPerUnit;
    
    return calculatedCost;
  };

  // Enhanced update function to recalculate dependent fields
  const updateBomItemWithCalculation = (id: string, field: keyof BOMItem, value: any) => {
    setBomItems(prev => prev.map(item => {
      if (item.id === id) {
        // Update the field that was changed
        let updatedItem = { ...item, [field]: value };
        
        // If the changed field affects calculations, update calculated fields
        if (['quantityPerUnit', 'wastagePercentage', 'requestedQty'].includes(field)) {
          // Recalculate calculatedTotal based on the updated values
          updatedItem.calculatedTotal = calculateCalculatedTotal(updatedItem);
          // Recalculate calculatedCost based on the updated values
          updatedItem.calculatedCost = calculateCalculatedCost(updatedItem);
        } else if (field === 'cost' || field === 'materialName') {
          // If cost was updated or materialName was changed, recalculate calculatedCost
          updatedItem.calculatedCost = calculateCalculatedCost(updatedItem);
        }
        
        // If the user selected 'request_material', open a prompt to request a new material
        if (field === 'materialName' && value === 'request_material') {
          const newMaterialName = prompt('Enter the name of the new material to request:');
          if (newMaterialName) {
            // Add to material requisitions
            requestMaterialForOrder(orderDetails.id, newMaterialName, calculateCalculatedTotal(updatedItem), item.unitOfMeasure);
            
            updatedItem = { 
              ...updatedItem, 
              materialName: newMaterialName,
              isCustom: true
            };
          } else {
            // If user cancels, keep the original value
            return item;
          }
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const renderMaterialSummary = () => {
    // Aggregate data by type
    const aggregatedByType: Record<string, { totalAmount: number, totalCost: number, materials: string[] }> = {};
    
    bomItems.forEach(item => {
      const type = item.type;
      if (!aggregatedByType[type]) {
        aggregatedByType[type] = { totalAmount: 0, totalCost: 0, materials: [] };
      }
      
      aggregatedByType[type].totalAmount += calculateCalculatedTotal(item);
      aggregatedByType[type].totalCost += calculateCalculatedCost(item);
      
      // Add material name if not already present
      if (!aggregatedByType[type].materials.includes(item.materialName)) {
        aggregatedByType[type].materials.push(item.materialName);
      }
    });
    
    return Object.entries(aggregatedByType).map(([type, data]) => (
      <div key={type} className="border rounded-lg p-3 bg-muted">
        <div className="font-semibold">{type}</div>
        <div className="text-sm text-muted-foreground">Amount: {data.totalAmount.toFixed(2)}, Cost: ${data.totalCost.toFixed(2)}</div>
        <div className="text-xs text-muted-foreground mt-1">
          Materials: {data.materials.join(', ')}
        </div>
      </div>
    ));
  };

  const handleRequestBomFromStore = async () => {
    setIsLoading(true);
    try {
      // Prepare the BOM items for the store request
      const storeRequest = {
        orderId: orderDetails.id,
        items: bomItems.map(item => ({
          materialName: item.materialName,
          materialId: item.materialId,
          quantity: calculateCalculatedTotal(item),
          unit: item.unitOfMeasure,
          type: item.type,
          color: item.color,
          cost: calculateCalculatedCost(item)
        }))
      };

      // Send request to the store for BOM materials
      const response = await authenticatedFetch('/api/material-requests/create-bom-request', {
        method: 'POST',
        body: JSON.stringify(storeRequest)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to request BOM from store');
      }

      const result = await response.json();
      
      toast({
        title: "Success",
        description: `BOM request sent to store successfully. ${result.itemsRequested} items requested.`
      });
    } catch (error: any) {
      console.error('Error requesting BOM from store:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to request BOM from store",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modify BOM for Order {orderDetails.orderNumber}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Order Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Order Details</span>
                <Badge variant="outline">{orderDetails.productCode}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Product Name</h4>
                  <p className="text-lg font-semibold">{orderDetails.productName}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Order Number</h4>
                  <p className="text-lg font-semibold">{orderDetails.orderNumber}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Total Quantity</h4>
                  <p className="text-lg font-semibold">{orderDetails.quantity}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Order Items</h4>
                  <p className="text-lg font-semibold">{orderDetails.items.length} variants</p>
                </div>
              </div>
              
              {orderDetails.imageUrl && (
                <div className="mt-4">
                  <h4 className="font-medium text-sm text-muted-foreground">Product Image</h4>
                  <div className="mt-2 flex items-center justify-center h-32 w-32 border rounded-md overflow-hidden">
                    <img 
                      src={orderDetails.imageUrl} 
                      alt={orderDetails.productName} 
                      className="h-full w-full object-contain"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Aggregated Color Quantities */}
          <Card>
            <CardHeader>
              <CardTitle>Aggregated Color Quantities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Object.entries(colorQuantities).map(([color, quantity]) => (
                  <div key={color} className="border rounded-lg p-3 bg-muted">
                    <div className="font-semibold capitalize">{color}</div>
                    <div className="text-sm text-muted-foreground">{quantity} pc</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Order Items Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Order Size & Color Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Size</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderDetails.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.size}</TableCell>
                      <TableCell>{item.color}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* BOM Items Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>BOM Items</CardTitle>
              <Button onClick={addBomItem} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Material Name</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Qty Per Unit</TableHead>
                    <TableHead className="text-right">Wastage %</TableHead>
                    <TableHead className="text-right">Requested Qty</TableHead>
                    <TableHead className="text-right">Calculated Amount</TableHead>
                    <TableHead className="text-right">Calculated Cost</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bomItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <select
                          value={item.type}
                          onChange={(e) => updateBomItemWithCalculation(item.id, 'type', e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm"
                        >
                          <option value="Fabric">Fabric</option>
                          <option value="Trim">Trim</option>
                          <option value="Finishing">Finishing</option>
                          <option value="Packaging">Packaging</option>
                          <option value="Thread">Thread</option>
                          <option value="Other">Other</option>
                        </select>
                      </TableCell>
                      <TableCell>
                        {item.type.toLowerCase() === 'fabric' ? (
                          <select
                            value={item.materialName}
                            onChange={(e) => updateBomItemWithCalculation(item.id, 'materialName', e.target.value)}
                            className="w-full border rounded px-2 py-1 text-sm"
                          >
                            <option value="">Select Fabric</option>
                            {availableMaterials
                              .filter(material => material.category.toLowerCase() === 'fabric')
                              .map(material => (
                                <option key={material.id} value={material.name}>
                                  {material.name}
                                </option>
                              ))}
                            <option value="request_material">+ Request New Material</option>
                          </select>
                        ) : (
                          <select
                            value={item.materialName}
                            onChange={(e) => updateBomItemWithCalculation(item.id, 'materialName', e.target.value)}
                            className="w-full border rounded px-2 py-1 text-sm"
                          >
                            <option value="">Select Material</option>
                            {availableMaterials
                              .filter(material => material.category.toLowerCase() !== 'fabric')
                              .map(material => (
                                <option key={material.id} value={material.name}>
                                  {material.name}
                                </option>
                              ))}
                            <option value="request_material">+ Request New Material</option>
                          </select>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.color || ''}
                          onChange={(e) => updateBomItemWithCalculation(item.id, 'color', e.target.value)}
                          className="text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.unitOfMeasure}
                          onChange={(e) => updateBomItemWithCalculation(item.id, 'unitOfMeasure', e.target.value)}
                          className="text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantityPerUnit}
                          onChange={(e) => updateBomItemWithCalculation(item.id, 'quantityPerUnit', parseFloat(e.target.value) || 0)}
                          className="text-right text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.wastagePercentage}
                          onChange={(e) => updateBomItemWithCalculation(item.id, 'wastagePercentage', parseFloat(e.target.value) || 0)}
                          className="text-right text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.requestedQty || 0}
                          onChange={(e) => updateBomItemWithCalculation(item.id, 'requestedQty', parseFloat(e.target.value) || 0)}
                          className="text-right text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={calculateCalculatedTotal(item)}
                          readOnly
                          className="text-right text-sm font-medium"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={calculateCalculatedCost(item)}
                          readOnly
                          className="text-right text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBomItem(item.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          {/* Summary Section */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Total Material Cost */}
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Total Material Cost</h4>
                  <p className="text-2xl font-bold">
                    ${bomItems.reduce((sum, item) => sum + calculateCalculatedCost(item), 0).toFixed(2)}
                  </p>
                </div>
                
                {/* Material Summary by Type */}
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Summary by Material Type</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {renderMaterialSummary()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={() => onGeneratePDF(bomItems)} 
            className="sm:order-2"
          >
            <Download className="h-4 w-4 mr-2" />
            Generate BOM PDF
          </Button>
          <Button 
            variant="secondary"
            onClick={handleRequestBomFromStore}
            disabled={isLoading}
            className="sm:order-1"
          >
            <PackageCheck className="h-4 w-4 mr-2" />
            Request BOM from Store
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isLoading}
            className="sm:order-3"
          >
            {isLoading ? 'Saving...' : 'Save BOM Changes'}
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => onOpenChange(false)} 
            className="sm:order-4"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}