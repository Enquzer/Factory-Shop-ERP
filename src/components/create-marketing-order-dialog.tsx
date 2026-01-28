"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getProducts, Product } from "@/lib/products";
import { createMarketingOrder, MarketingOrderItem } from "@/lib/marketing-orders";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createAuthHeaders } from "@/lib/auth-helpers";
import { DistributionPlannerDialog } from "./marketing-orders/distribution-planner-dialog";
import { PlusCircle, Trash2, Upload, Image as ImageIcon, Search, Check, ChevronsUpDown, Calculator } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/auth-context";

interface CreateMarketingOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderCreated: () => void;
  availableUsers?: { id: number; username: string }[];
}

export function CreateMarketingOrderDialog({ 
  open, 
  onOpenChange, 
  onOrderCreated,
  availableUsers = []
}: CreateMarketingOrderDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  
  // Form state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productName, setProductName] = useState("");
  const [productCode, setProductCode] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState(0);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [items, setItems] = useState<MarketingOrderItem[]>([]);
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
  
  // Extra fields from page.tsx
  const [orderPlacementDate, setOrderPlacementDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [plannedDeliveryDate, setPlannedDeliveryDate] = useState<string>("");
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState(0);
  
  // File states (files instead of URLs)
  const [ppmMeetingFile, setPpmMeetingFile] = useState<File | null>(null);
  const [sampleApprovalFile, setSampleApprovalFile] = useState<File | null>(null);
  const [cuttingQualityFile, setCuttingQualityFile] = useState<File | null>(null);
  
  const [piecesPerSet, setPiecesPerSet] = useState(1);
  
  // Item form state
  const [itemSize, setItemSize] = useState("");
  const [itemColor, setItemColor] = useState("");
  const [itemQuantity, setItemQuantity] = useState(0);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isPlannerOpen, setIsPlannerOpen] = useState(false);
  
  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      fetchProducts();
    }
  }, [open]);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const fetchedProducts = await getProducts();
      setProducts(fetchedProducts);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        title: "Error",
        description: "Failed to fetch products.",
        variant: "destructive",
      });
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleProductSelect = (productId: string) => {
    const product = products.find(p => p.id === productId) || null;
    setSelectedProduct(product);
    
    if (product) {
      setProductName(product.name);
      setProductCode(product.productCode);
      setDescription(product.description || "");
      setCategory(product.category);
      setPrice(product.price);
      setIsNewProduct(false);
      // Initialize with existing variants as items
      const initialItems = product.variants.map(variant => ({
        orderId: "",
        size: variant.size,
        color: variant.color,
        quantity: 0 // Will be filled by user
      }));
      setItems(initialItems);
      
      // Update preview if product has an image
      if (product.imageUrl) {
        setMainImagePreview(product.imageUrl);
      }
    } else {
      // Reset form for new product
      setProductName("");
      setProductCode("");
      setDescription("");
      setCategory("");
      setPrice(0);
      setItems([]);
      setMainImagePreview(null);
    }
  };

  // Effect to automatically find product by code
  useEffect(() => {
    if (productCode && !isNewProduct && products.length > 0) {
      const match = products.find(p => p.productCode.toUpperCase() === productCode.toUpperCase());
      if (match && (!selectedProduct || match.id !== selectedProduct.id)) {
        handleProductSelect(match.id);
      }
    }
  }, [productCode, isNewProduct, products]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.productCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleMainImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setMainImage(file);
    const previewUrl = URL.createObjectURL(file);
    setMainImagePreview(previewUrl);
  };
  
  const handleFileChange = (setter: (file: File | null) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setter(file);
  };

  const handlePlannerConfirm = (plannedItems: any[]) => {
    // Convert planner items to order items
    const newItems = plannedItems.map(item => ({
      orderId: "", 
      size: item.size,
      color: item.color,
      quantity: item.quantity
    }));
    
    // Append to existing items
    setItems(prev => [...prev, ...newItems]);
    
    // Calculate total
    const currentTotal = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const newTotal = newItems.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0);
    setQuantity(currentTotal + newTotal);
  };

  const addItem = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    
    if (!itemSize.trim() || !itemColor.trim() || itemQuantity <= 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in Size, Color, and a Quantity greater than zero.",
        variant: "destructive",
      });
      return;
    }

    const newItem: MarketingOrderItem = {
      orderId: "", 
      size: itemSize.trim(),
      color: itemColor.trim(),
      quantity: itemQuantity
    };

    setItems(prevItems => [...prevItems, newItem]);

    // Reset item form
    setItemSize("");
    setItemColor("");
    setItemQuantity(0);
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Update the total quantity whenever items change
  useEffect(() => {
    const total = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    setQuantity(total);
  }, [items]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!productName.trim()) {
      newErrors.productName = "Product name is required";
    }
    
    if (!productCode.trim()) {
      newErrors.productCode = "Product code is required";
    } else if (!/^[A-Z]{2}(-[A-Z]{2})?-\d{3,}([/-]\d{2,})?$/i.test(productCode)) {
      newErrors.productCode = "Format: XX-XXX, XX-XXX/XX, XX-XXXX, or XX-XX-XXX/XX";
    }
    
    // Check if there are items and if the total quantity is greater than zero
    if (items.length === 0) {
      newErrors.items = "At least one item is required";
    } else {
      const totalQty = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
      if (totalQty <= 0) {
        newErrors.items = "Total quantity must be greater than zero. Please enter quantities for your items.";
      }
    }
    
    if (isNewProduct) {
      if (!category.trim()) {
        newErrors.category = "Category is required for new products";
      }
      if (price <= 0) {
        newErrors.price = "Price must be > 0";
      }
      if (!mainImage) {
        newErrors.mainImage = "Image is required";
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const uploadFile = async (file: File, prefix: string): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);
    const ext = file.name.split('.').pop();
    const filename = `${productCode.toUpperCase()}_${prefix}_${Date.now()}.${ext}`;
    formData.append('filename', filename);

    const res = await fetch('/api/upload', { 
      method: 'POST', 
      headers: {
        ...createAuthHeaders()
      },
      body: formData 
    });
    if (res.ok) {
      const data = await res.json();
      return data.imageUrl; // The API returns imageUrl for the path
    }
    return null;
  }

  const handleCreateOrder = async () => {
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Upload documentation files if they exist
      let ppmUrl = undefined;
      if (ppmMeetingFile) {
        const url = await uploadFile(ppmMeetingFile, 'PPM');
        if (url) ppmUrl = url;
      }
      
      let sampleApprovalUrl = undefined;
      if (sampleApprovalFile) {
        const url = await uploadFile(sampleApprovalFile, 'SAMPLE_APPROVAL');
        if (url) sampleApprovalUrl = url;
      }
      
      let cuttingQualityUrl = undefined;
      if (cuttingQualityFile) {
        const url = await uploadFile(cuttingQualityFile, 'CUTTING_QUALITY');
        if (url) cuttingQualityUrl = url;
      }
    
      // Create the order data
      const orderData: any = {
        productName,
        productCode,
        description,
        quantity,
        status: "Placed Order",
        isCompleted: false,
        createdBy: user?.username || "Marketing Team",
        orderPlacementDate,
        plannedDeliveryDate: plannedDeliveryDate || undefined,
        assignedTo: assignedTo || undefined,
        priority,
        ppmMeetingAttached: ppmUrl,
        sampleApprovalAttached: sampleApprovalUrl,
        cuttingQualityAttached: cuttingQualityUrl,
        items: items.map(item => ({
          size: item.size,
          color: item.color,
          quantity: item.quantity
        }))
      };

      // Add extra fields for new product registration
      if (isNewProduct) {
        orderData.isNewProduct = true;
        orderData.category = category;
        orderData.price = price;
        orderData.piecesPerSet = piecesPerSet;
        
        // Upload main product image if provided
        if (mainImage) {
          const url = await uploadFile(mainImage, 'MAIN');
          if (url) orderData.imageUrl = url;
        }
      } else if (selectedProduct && selectedProduct.imageUrl) {
        // Include imageUrl for existing products
        orderData.imageUrl = selectedProduct.imageUrl;
      }

      await createMarketingOrder(orderData);
      
      onOrderCreated();
      resetForm();
      onOpenChange(false);
      
      // Clean up object URLs
      if (mainImagePreview) URL.revokeObjectURL(mainImagePreview);
      
    } catch (error: any) {
      console.error("Error creating order:", error);
      toast({
        title: "Error",
        description: "Failed to create order.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setSelectedProduct(null);
    setProductName("");
    setProductCode("");
    setDescription("");
    setQuantity(0);
    setCategory("");
    setPrice(0);
    setIsNewProduct(false);
    setItems([]);
    setMainImage(null);
    setMainImagePreview(null);
    setErrors({});
    setAssignedTo("");
    setPriority(0);
    setPpmMeetingFile(null);
    setSampleApprovalFile(null);
    setCuttingQualityFile(null);
    setPiecesPerSet(1);
    setOrderPlacementDate(new Date().toISOString().split('T')[0]);
    setPlannedDeliveryDate("");
  };

  const generateProductCode = () => {
    if (!category) return "";
    const categoryCode = category.substring(0, 2).toUpperCase();
    const typeCode = "PR"; 
    const randomNumber = Math.floor(100 + Math.random() * 900); 
    return `${categoryCode}-${typeCode}-${randomNumber}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Marketing Order</DialogTitle>
          <DialogDescription>
            Place a new order for production.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Product Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Product Selection</h3>
            <div className="flex flex-col md:flex-row gap-4">
              <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isPopoverOpen}
                    className="w-full md:w-[400px] justify-between shadow-sm border-primary/20"
                  >
                    <span className="truncate">
                      {selectedProduct
                        ? `${selectedProduct.name} (${selectedProduct.productCode})`
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
                      placeholder="Type code or name to search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="max-h-[300px] overflow-y-auto p-1">
                    <div
                      className={cn(
                        "group relative flex cursor-pointer select-none items-center rounded-md px-2 py-2.5 text-sm outline-none transition-colors mb-1",
                        isNewProduct ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent"
                      )}
                      onClick={() => {
                        resetForm();
                        setIsNewProduct(true);
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
                    
                    {filteredProducts.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        {searchTerm ? "No matches." : "Start typing..."}
                      </div>
                    ) : (
                      filteredProducts.map((product) => (
                        <div
                          key={product.id}
                          className={cn(
                            "relative flex cursor-pointer select-none items-center rounded-md px-2 py-2 text-sm outline-none transition-colors",
                            selectedProduct?.id === product.id ? "bg-accent text-accent-foreground font-medium" : "hover:bg-accent/50"
                          )}
                          onClick={() => {
                            handleProductSelect(product.id);
                            setIsNewProduct(false);
                            setIsPopoverOpen(false);
                            setSearchTerm("");
                          }}
                        >
                          <div className={cn("mr-2 flex h-4 w-4", selectedProduct?.id === product.id ? "opacity-100" : "opacity-0")}>
                            <Check className="h-4 w-4" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="truncate">{product.name}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{product.productCode}</span>
                          </div>
                          {product.imageUrl && (
                            <div className="ml-auto h-8 w-8 rounded overflow-hidden border bg-background">
                              <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {!isNewProduct && !selectedProduct && (
                <div className="flex items-center text-sm text-muted-foreground italic">
                  Tip: Start typing a product code below to auto-find.
                </div>
              )}
            </div>
          </div>

          {/* Product Details */}
          {(selectedProduct || isNewProduct || productCode) && (
            <div className="border rounded-lg p-4 bg-gray-50/50">
              <h3 className="text-md font-medium mb-3">Product Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
                <div className="space-y-2">
                  <Label>Image</Label>
                  <div className="relative aspect-square w-full rounded-lg overflow-hidden border-2 border-muted shadow-sm bg-muted/30">
                    {mainImagePreview ? (
                      <Image 
                        src={mainImagePreview} 
                        alt={productName || "Preview"} 
                        fill 
                        style={{ objectFit: "cover" }} 
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <ImageIcon className="h-10 w-10 mb-2 opacity-20" />
                        <span className="text-xs">No image</span>
                      </div>
                    )}
                  </div>
                  {isNewProduct && (
                    <Input type="file" accept="image/*" onChange={handleMainImageChange} className="text-xs h-8 mt-2" />
                  )}
                  {errors.mainImage && <p className="text-red-500 text-xs">{errors.mainImage}</p>}
                </div>
              
                <div className="md:col-span-3 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Product Name</Label>
                      <Input
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        className={errors.productName ? "border-red-500" : ""}
                      />
                    </div>
                    <div>
                      <Label>Product Code</Label>
                      <div className="flex gap-2">
                        <Input
                          value={productCode}
                          onChange={(e) => setProductCode(e.target.value.toUpperCase())}
                          className={cn("font-mono uppercase", errors.productCode ? "border-red-500" : "", selectedProduct && "border-green-500 bg-green-50")}
                        />
                        {isNewProduct && (
                          <Button type="button" variant="outline" size="sm" onClick={() => setProductCode(generateProductCode())}>
                            Generate
                          </Button>
                        )}
                      </div>
                      {selectedProduct && <div className="text-[10px] text-green-600 mt-1 flex items-center gap-1"><Check className="h-3 w-3"/> Linked to existing database</div>}
                    </div>
                  </div>
                  
                  {isNewProduct && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Category</Label>
                        <Select value={category} onValueChange={setCategory}>
                          <SelectTrigger className={errors.category ? "border-red-500" : ""}>
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Men">Men</SelectItem>
                            <SelectItem value="Women">Women</SelectItem>
                            <SelectItem value="Kids">Kids</SelectItem>
                            <SelectItem value="Unisex">Unisex</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Price (ETB)</Label>
                        <Input type="number" value={price || ""} onChange={(e) => setPrice(Number(e.target.value))} />
                      </div>
                       <div>
                        <Label>Pieces/Set</Label>
                        <Input type="number" min="1" value={piecesPerSet} onChange={(e) => setPiecesPerSet(Number(e.target.value))} />
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <Label>Description</Label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Planning & Assignment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
                <Label>Assigned Team / User</Label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Team" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((u) => (
                      <SelectItem key={u.id} value={u.username}>{u.username}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
             </div>
             <div>
                <Label>Priority</Label>
                <Input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} placeholder="0 (Normal)" />
             </div>
             <div>
                <Label>Order Date</Label>
                <Input type="date" value={orderPlacementDate} onChange={(e) => setOrderPlacementDate(e.target.value)} />
             </div>
             <div>
               <Label>Planned Delivery</Label>
               <Input type="date" value={plannedDeliveryDate} onChange={(e) => setPlannedDeliveryDate(e.target.value)} />
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div>
               <Label>PPM Minutes File</Label>
               <Input type="file" accept=".pdf,.doc,.docx,.jpg,.png" onChange={handleFileChange(setPpmMeetingFile)} />
               {ppmMeetingFile && <span className="text-xs text-muted-foreground">{ppmMeetingFile.name}</span>}
             </div>
             <div>
               <Label>Sample Approval File</Label>
               <Input type="file" accept=".pdf,.doc,.docx,.jpg,.png" onChange={handleFileChange(setSampleApprovalFile)} />
               {sampleApprovalFile && <span className="text-xs text-muted-foreground">{sampleApprovalFile.name}</span>}
             </div>
             <div>
               <Label>Cutting Quality File</Label>
               <Input type="file" accept=".pdf,.doc,.docx,.jpg,.png" onChange={handleFileChange(setCuttingQualityFile)} />
               {cuttingQualityFile && <span className="text-xs text-muted-foreground">{cuttingQualityFile.name}</span>}
             </div>
          </div>

          {/* Order Quantity & Distribution */}
          <div className="space-y-4 border-2 border-primary/10 rounded-xl p-6 bg-primary/5">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-xl font-black text-primary flex items-center gap-2">
                  <Calculator className="h-6 w-6" />
                  Order Breakdown & Distribution
                </h3>
                <p className="text-xs text-muted-foreground font-medium">Use the smart planner for fair shop allocation or enter manually.</p>
              </div>
              
              <div className="flex gap-2 w-full md:w-auto">
                <Button 
                  type="button" 
                  size="lg"
                  className="flex-1 md:flex-none gap-2 font-black shadow-lg shadow-primary/20 bg-primary hover:scale-105 transition-transform"
                  onClick={() => setIsPlannerOpen(true)}
                >
                  <Calculator className="h-5 w-5" />
                  Smart Distribution Planner
                </Button>
              </div>
            </div>

            <Separator className="bg-primary/10" />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Manual Entry Sidebar */}
              <div className="md:col-span-1 space-y-4 border-r pr-6">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Manual Adjustment</h4>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase">Size</Label>
                    <Input value={itemSize} onChange={(e) => setItemSize(e.target.value.toUpperCase())} placeholder="e.g. XL" className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase">Color</Label>
                    <Input value={itemColor} onChange={(e) => setItemColor(e.target.value)} placeholder="e.g. Red" className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase">Quantity</Label>
                    <Input type="number" value={itemQuantity || ""} onChange={(e) => setItemQuantity(Number(e.target.value))} className="h-8 text-xs" />
                  </div>
                  <Button type="button" onClick={addItem} size="sm" variant="outline" className="w-full border-dashed">
                    <PlusCircle className="mr-2 h-3 w-3" /> Add Row
                  </Button>
                </div>
              </div>

              {/* Items Table */}
              <div className="md:col-span-3 space-y-3">
                <div className="flex justify-between items-end">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Order Items Summary</h4>
                  <div className="bg-primary/10 px-3 py-1 rounded-full">
                    <span className="text-xs font-bold text-primary">Total Pieces: {quantity.toLocaleString()}</span>
                  </div>
                </div>

                <div className="border rounded-lg bg-white overflow-hidden shadow-sm">
                  <ScrollArea className="h-[250px]">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 sticky top-0 z-10">
                        <tr className="text-[10px] font-black uppercase text-muted-foreground">
                          <th className="px-4 py-3 text-left">Color</th>
                          <th className="px-4 py-3 text-left">Size</th>
                          <th className="px-4 py-3 text-right">Quantity</th>
                          <th className="w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {items.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground italic text-xs">
                              No items added yet. Use the Smart Planner to begin.
                            </td>
                          </tr>
                        ) : (
                          items.map((item, index) => (
                            <tr key={index} className="hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-2 font-bold text-primary">{item.color}</td>
                              <td className="px-4 py-2"><Badge variant="outline" className="font-mono">{item.size}</Badge></td>
                              <td className="px-6 py-2">
                                <Input 
                                  type="number" 
                                  className="h-7 w-24 text-right font-black" 
                                  value={item.quantity} 
                                  onChange={(e) => {
                                    const newItems = [...items];
                                    newItems[index].quantity = Math.max(0, Number(e.target.value));
                                    setItems(newItems);
                                  }} 
                                />
                              </td>
                              <td className="px-4 py-2">
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => removeItem(index)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </ScrollArea>
                </div>
                {errors.items && <p className="text-destructive text-[10px] font-bold uppercase">{errors.items}</p>}
              </div>
            </div>

            <DistributionPlannerDialog 
              open={isPlannerOpen} 
              onOpenChange={setIsPlannerOpen}
              onConfirm={handlePlannerConfirm}
              defaultQuantity={1200}
              category={category}
            />
          </div>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreateOrder}>Create Order</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
