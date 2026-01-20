"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getProducts } from "@/lib/products";
import { createMarketingOrder } from "@/lib/marketing-orders";
import { Product } from "@/lib/products";
import { MarketingOrderItem } from "@/lib/marketing-orders";
import { PlusCircle, Trash2, ArrowLeft, Upload, Image as ImageIcon, Search, Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewMarketingOrderPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  
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
  
  // Item form state
  const [itemSize, setItemSize] = useState("");
  const [itemColor, setItemColor] = useState("");
  const [itemQuantity, setItemQuantity] = useState(0);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  
  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const fetchedProducts = await getProducts();
      setProducts(fetchedProducts);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        title: "Error",
        description: "Failed to fetch products. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
    if (productCode && !isNewProduct) {
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

  const addItem = () => {
    if (!itemSize || !itemColor || itemQuantity <= 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all item fields with valid values.",
        variant: "destructive",
      });
      return;
    }

    setItems([
      ...items,
      {
        orderId: "", // Will be set when creating the order
        size: itemSize,
        color: itemColor,
        quantity: itemQuantity
      }
    ]);

    // Reset item form
    setItemSize("");
    setItemColor("");
    setItemQuantity(0);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Update the quantity whenever items change
  useEffect(() => {
    const total = items.reduce((sum, item) => sum + item.quantity, 0);
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
    
    // Quantity is now auto-calculated, so we only validate that items exist
    if (items.length === 0) {
      newErrors.items = "At least one item is required";
    }
    
    if (isNewProduct) {
      if (!category.trim()) {
        newErrors.category = "Category is required for new products";
      }
      
      if (price <= 0) {
        newErrors.price = "Price must be greater than 0 for new products";
      }
      
      if (!mainImage) {
        newErrors.mainImage = "Main product image is required for new products";
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateOrder = async () => {
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form before submitting.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create the order data
      const orderData: any = {
        productName,
        productCode,
        description,
        quantity,
        status: "Placed Order",
        isCompleted: false,
        createdBy: "Marketing Team",
        items: items.map(item => ({
          size: item.size,
          color: item.color,
          quantity: item.quantity
        }))
      };

      // Add extra fields for new product registration if needed
      if (isNewProduct) {
        orderData.isNewProduct = true;
        orderData.category = category;
        orderData.price = price;
        
        // Upload main product image if provided
        if (mainImage) {
          const formData = new FormData();
          formData.append('file', mainImage);
          const mainImageName = `${productCode.toUpperCase()}_main.${mainImage.name.split('.').pop()}`;
          formData.append('filename', mainImageName);
          
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
          
          if (uploadResponse.ok) {
            const result = await uploadResponse.json();
            orderData.imageUrl = result.imageUrl;
          }
        }
      } else if (selectedProduct && selectedProduct.imageUrl) {
        // Include imageUrl for existing products
        orderData.imageUrl = selectedProduct.imageUrl;
      }

      const newOrder = await createMarketingOrder(orderData);

      toast({
        title: "Success",
        description: "Marketing order created successfully.",
      });
      
      // Clean up object URLs
      if (mainImagePreview) URL.revokeObjectURL(mainImagePreview);
      
      // Redirect to marketing orders page
      router.push("/marketing-orders");
    } catch (error: any) {
      console.error("Error creating order:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create order. Please try again.",
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
  };

  const generateProductCode = () => {
    if (!category) return "";
    
    const categoryCode = category.substring(0, 2).toUpperCase();
    const typeCode = "PR"; // Product
    const randomNumber = Math.floor(100 + Math.random() * 900); // 3-digit number
    return `${categoryCode}-${typeCode}-${randomNumber}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" asChild>
          <Link href="/marketing-orders">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Marketing Orders</span>
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">New Marketing Order</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Create New Marketing Order</CardTitle>
          <CardDescription>
            Place a new order for production with detailed size and color breakdown.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
                            className="w-full md:w-[400px] justify-between shadow-sm border-primary/20 hover:border-primary/50 transition-colors"
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
                              placeholder="Type product code or name to search..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                            />
                          </div>
                          <div className="max-h-[300px] overflow-y-auto p-1 custom-scrollbar">
                            <div
                              className={cn(
                                "group relative flex cursor-pointer select-none items-center rounded-md px-2 py-2.5 text-sm outline-none transition-colors mb-1",
                                isNewProduct ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent hover:text-accent-foreground"
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
                                {searchTerm ? "No matching products found." : "Start typing to search..."}
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
                                  <div className={cn(
                                    "mr-2 flex h-4 w-4 items-center justify-center",
                                    selectedProduct?.id === product.id ? "opacity-100" : "opacity-0"
                                  )}>
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
                  Tip: Start typing a product code below to auto-find existing products.
                </div>
              )}
            </div>
          </div>
          
          {/* Product Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Product Details</h3>
            
            {(selectedProduct || isNewProduct || productCode) && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
                  <div className="space-y-2">
                    <Label>Product Image</Label>
                    <div className="relative aspect-square w-full rounded-lg overflow-hidden border-2 border-muted shadow-sm bg-muted/30">
                      {mainImagePreview ? (
                        <Image 
                          src={mainImagePreview} 
                          alt={productName || "Product Preview"} 
                          fill 
                          sizes="(max-width: 768px) 100vw, 25vw"
                          style={{ objectFit: "cover" }} 
                          className="transition-transform duration-300 hover:scale-105"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                          <ImageIcon className="h-10 w-10 mb-2 opacity-20" />
                          <span className="text-xs">No image available</span>
                        </div>
                      )}
                    </div>
                    {isNewProduct && (
                      <div className="mt-2">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleMainImageChange}
                          className="text-xs h-8"
                        />
                        {errors.mainImage && <p className="text-red-500 text-xs mt-1">{errors.mainImage}</p>}
                      </div>
                    )}
                  </div>
                
                <div className="md:col-span-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Product Name {isNewProduct && "*"}</Label>
                      <Input
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder="e.g., Summer Collection T-Shirt"
                        className={errors.productName ? "border-red-500" : ""}
                      />
                      {errors.productName && <p className="text-red-500 text-sm mt-1">{errors.productName}</p>}
                    </div>
                      <div className="flex-1 space-y-2">
                        <Label>Product Code {isNewProduct && "*"}</Label>
                        <div className="flex gap-2">
                          <Input
                            value={productCode}
                            onChange={(e) => setProductCode(e.target.value.toUpperCase())}
                            placeholder="Type or select code..."
                            className={cn(
                              "font-mono uppercase",
                              errors.productCode ? "border-red-500" : "",
                              selectedProduct && "border-green-500 bg-green-50"
                            )}
                          />
                          {isNewProduct && (
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={() => setProductCode(generateProductCode())}
                            >
                              Generate
                            </Button>
                          )}
                        </div>
                        {selectedProduct && (
                          <div className="text-[10px] text-green-600 font-medium flex items-center gap-1">
                            <Check className="h-2 w-2" /> Linked to existing product database
                          </div>
                        )}
                        {errors.productCode && <p className="text-red-500 text-sm mt-1">{errors.productCode}</p>}
                      </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Category *</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className={errors.category ? "border-red-500" : ""}>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Men">Men</SelectItem>
                          <SelectItem value="Women">Women</SelectItem>
                          <SelectItem value="Kids">Kids</SelectItem>
                          <SelectItem value="Unisex">Unisex</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
                    </div>
                    <div>
                      <Label>Price (ETB) *</Label>
                      <Input
                        type="number"
                        value={price || ""}
                        onChange={(e) => setPrice(Number(e.target.value))}
                        placeholder="e.g., 1200"
                        className={errors.price ? "border-red-500" : ""}
                      />
                      {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
                    </div>
                  </div>
                  <div className="mt-2">
                    <Label>Description</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Product description"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Order Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Order Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Total Quantity *</Label>
                <Input
                  type="number"
                  value={quantity || ""}
                  readOnly
                  placeholder="Auto-calculated from size/color breakdown"
                  className="bg-gray-100"
                />
                <p className="text-sm text-muted-foreground mt-1">Automatically calculated from size and color breakdown</p>
              </div>
            </div>
          </div>
          
          {/* Size and Color Breakdown */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Size and Color Breakdown</h3>
              {errors.items && <p className="text-red-500 text-sm">{errors.items}</p>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
              <Input
                placeholder="Size"
                value={itemSize}
                onChange={(e) => setItemSize(e.target.value)}
              />
              <Input
                placeholder="Color"
                value={itemColor}
                onChange={(e) => setItemColor(e.target.value)}
              />
              <Input
                type="number"
                placeholder="Quantity"
                value={itemQuantity || ""}
                onChange={(e) => setItemQuantity(Number(e.target.value))}
              />
              <Button onClick={addItem}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>
            
            {items.length > 0 && (
              <div className="border rounded-md">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Size</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Color</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Quantity</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-4 py-2">{item.size}</td>
                        <td className="px-4 py-2">{item.color}</td>
                        <td className="px-4 py-2">
                          <Input
                            type="number"
                            value={item.quantity || ""}
                            onChange={(e) => {
                              const newItems = [...items];
                              newItems[index].quantity = Number(e.target.value);
                              setItems(newItems);
                            }}
                            className="w-24"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => router.push("/marketing-orders")}>
              Cancel
            </Button>
            <Button onClick={handleCreateOrder}>
              Create Order
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}