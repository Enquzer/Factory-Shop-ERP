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
import { PlusCircle, Trash2, ArrowLeft, Upload, Image as ImageIcon } from "lucide-react";
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
    } else {
      // Reset form for new product
      setProductName("");
      setProductCode("");
      setDescription("");
      setCategory("");
      setPrice(0);
      setItems([]);
    }
  };

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
    } else if (!/^[a-zA-Z]{2}-[a-zA-Z]{2}-\d{3}$/i.test(productCode)) {
      newErrors.productCode = "Product code must be in XX-XX-XXX format";
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select 
                value={selectedProduct?.id || "new"} 
                onValueChange={(value) => {
                  if (value === "new") {
                    resetForm();
                    setIsNewProduct(true);
                  } else {
                    handleProductSelect(value);
                    setIsNewProduct(false);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a product or register new" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">+ Register New Product</SelectItem>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.productCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Product Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Product Details</h3>
            
            {selectedProduct && !isNewProduct && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {selectedProduct.imageUrl && (
                  <div className="relative h-32 w-full rounded-md overflow-hidden border">
                    <Image 
                      src={selectedProduct.imageUrl} 
                      alt={selectedProduct.name} 
                      fill 
                      sizes="(max-width: 768px) 100vw, 50vw"
                      style={{ objectFit: "cover" }} 
                    />
                  </div>
                )}
                <div className="md:col-span-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Product Name</Label>
                      <Input
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder="Product name"
                        className={errors.productName ? "border-red-500" : ""}
                      />
                      {errors.productName && <p className="text-red-500 text-sm mt-1">{errors.productName}</p>}
                    </div>
                    <div>
                      <Label>Product Code</Label>
                      <Input
                        value={productCode}
                        onChange={(e) => setProductCode(e.target.value.toUpperCase())}
                        placeholder="Product code"
                        className={errors.productCode ? "border-red-500" : ""}
                      />
                      {errors.productCode && <p className="text-red-500 text-sm mt-1">{errors.productCode}</p>}
                    </div>
                  </div>
                  <div className="mt-2">
                    <Label>Description</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Product description"
                    />
                  </div>
                </div>
              </div>
            )}
            
            {isNewProduct && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <Label>Main Product Image *</Label>
                    <div className="mt-2">
                      {mainImagePreview ? (
                        <div className="relative h-48 w-full rounded-md overflow-hidden border">
                          <Image 
                            src={mainImagePreview} 
                            alt="Main product preview" 
                            fill 
                            sizes="(max-width: 768px) 100vw, 50vw"
                            style={{ objectFit: "cover" }} 
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-md">
                          <ImageIcon className="h-12 w-12 text-gray-400" />
                          <p className="mt-2 text-sm text-gray-500">No image selected</p>
                        </div>
                      )}
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleMainImageChange}
                        className="mt-2 file:text-primary-foreground"
                      />
                      {errors.mainImage && <p className="text-red-500 text-sm mt-1">{errors.mainImage}</p>}
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Product Name *</Label>
                        <Input
                          value={productName}
                          onChange={(e) => setProductName(e.target.value)}
                          placeholder="e.g., Summer Collection T-Shirt"
                          className={errors.productName ? "border-red-500" : ""}
                        />
                        {errors.productName && <p className="text-red-500 text-sm mt-1">{errors.productName}</p>}
                      </div>
                      <div>
                        <Label>Product Code *</Label>
                        <div className="flex gap-2">
                          <Input
                            value={productCode}
                            onChange={(e) => setProductCode(e.target.value.toUpperCase())}
                            placeholder="e.g., SC-TS-001"
                            className={errors.productCode ? "border-red-500" : ""}
                          />
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setProductCode(generateProductCode())}
                          >
                            Generate
                          </Button>
                        </div>
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
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Product description"
                      />
                    </div>
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