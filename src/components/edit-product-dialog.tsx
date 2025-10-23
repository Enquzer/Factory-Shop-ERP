"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Trash2, Loader2 } from "lucide-react";
import Image from "next/image";
import { Product, ProductVariant, AgePricing, updateProduct, updateVariantStock, updateVariantImage } from "@/lib/products";
import { createStockEvent } from "@/lib/stock-events";
import { updateShopInventoryOnReplenishment } from "@/lib/products-sqlite";

const variantSchema = z.object({
  id: z.string(),
  color: z.string().min(1, "Color is required"),
  size: z.string().min(1, "Size is required"),
  stock: z.coerce.number().int().nonnegative("Stock must be a non-negative number"),
  image: z.any().optional(),
  imageUrl: z.string().optional(),
});

const agePricingSchema = z.object({
  id: z.number().optional(),
  ageMin: z.coerce.number().int().nonnegative("Minimum age must be a non-negative number"),
  ageMax: z.coerce.number().int().positive("Maximum age must be a positive number"),
  price: z.coerce.number().positive("Price must be a positive number"),
});

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  productCode: z.string().regex(/^[a-zA-Z]{2}-[a-zA-Z]{2}-\d{3}$/i, "Code must be in XX-XX-XXX format"),
  category: z.string().min(1, "Category is required"),
  price: z.coerce.number().positive("Price must be a positive number"),
  description: z.string().optional(),
  minimumStockLevel: z.coerce.number().int().nonnegative("Minimum stock must be a non-negative number").optional(),
  imageUrl: z.any(),
  variants: z.array(variantSchema).min(1, "At least one variant is required"),
  agePricing: z.array(agePricingSchema).optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

const categories = ["Men", "Women", "Kids", "Unisex"];

const VariantImagePreview = ({ control, index }: { control: any, index: number }) => {
    const image = useWatch({
      control,
      name: `variants.${index}.image`,
    });

    const existingUrl = useWatch({
        control,
        name: `variants.${index}.imageUrl`,
    });
  
    const [preview, setPreview] = useState<string | null>(null);
  
    useEffect(() => {
      if (image instanceof File) {
        const url = URL.createObjectURL(image);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
      } else if (typeof image === 'string') {
        setPreview(image);
      } else if (existingUrl) {
        setPreview(existingUrl);
      }
      else {
        setPreview(null);
      }
    }, [image, existingUrl]);
  
    if (!preview) return null;
  
    return (
      <div className="relative h-32 w-full rounded-md overflow-hidden">
        <Image 
          src={preview} 
          alt={`Variant ${index + 1} preview`} 
          fill 
          sizes="(max-width: 768px) 50vw, 25vw"
          style={{objectFit: "cover"}} 
        />
      </div>
    );
};

export function EditProductDialog({ product, open, onOpenChange, onProductUpdated }: { product: Product, open: boolean, onOpenChange: (open: boolean) => void, onProductUpdated: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(product.imageUrl ?? null);
  const { toast } = useToast();

  // Add cleanup effect for blob URLs
  useEffect(() => {
    return () => {
      if (mainImagePreview && mainImagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(mainImagePreview);
      }
    };
  }, [mainImagePreview]);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      ...product,
      imageUrl: product.imageUrl,
      description: product.description || "",
      variants: product.variants.map(v => ({ ...v, image: v.imageUrl })),
      agePricing: product.agePricing || [],
    },
  });

  const { fields: variantFields, append: appendVariant, remove: removeVariant } = useFieldArray({
    control: form.control,
    name: "variants",
  });
  
  const { fields: agePricingFields, append: appendAgePricing, remove: removeAgePricing } = useFieldArray({
    control: form.control,
    name: "agePricing",
  });

  useEffect(() => {
    // Reset form when product changes
    form.reset({
        ...product,
        imageUrl: product.imageUrl,
        description: product.description || "",
        variants: product.variants.map(v => ({...v, image: v.imageUrl})),
        agePricing: product.agePricing || [],
    });
    setMainImagePreview(product.imageUrl ?? null);
  }, [product, form]);

  const handleMainImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const newPreviewUrl = URL.createObjectURL(file);
      if (mainImagePreview) URL.revokeObjectURL(mainImagePreview); // Revoke previous URL
      setMainImagePreview(newPreviewUrl);
      form.setValue("imageUrl", file);
    }
  };

  const handleVariantImageChange = (file: File | undefined, onChange: (...event: any[]) => void) => {
    if (file) {
      onChange(file);
    }
  }

  const onSubmit = async (data: ProductFormValues) => {
    console.log('Form submitted with data:', data);
    setIsLoading(true);
    try {
      console.log('Updating product with data:', data);
      
      // Upload main product image if a new file is provided
      let mainImageUrl = product.imageUrl; // Keep existing image URL by default
      console.log('Current main image URL:', mainImageUrl);
      console.log('New image data:', data.imageUrl);
      
      if (data.imageUrl instanceof File) {
        const formData = new FormData();
        formData.append('file', data.imageUrl);
        const mainImageName = `${data.productCode.toUpperCase()}_main.${data.imageUrl.name.split('.').pop()}`;
        formData.append('filename', mainImageName);
        
        console.log('Uploading main image with name:', mainImageName);
        
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (uploadResponse.ok) {
          const result = await uploadResponse.json();
          mainImageUrl = result.imageUrl;
          console.log('Main image uploaded successfully:', mainImageUrl);
        } else {
          const errorText = await uploadResponse.text();
          console.error('Failed to upload main image:', errorText);
          throw new Error(`Failed to upload main image: ${uploadResponse.status} ${uploadResponse.statusText}`);
        }
      }
      
      console.log('Final main image URL:', mainImageUrl);

      // Upload variant images if new files are provided
      const variantsWithImages = await Promise.all(data.variants.map(async (variant: any) => {
        // Keep existing image URL by default
        let imageUrl = variant.imageUrl;
        
        console.log('Processing variant image for variant:', variant);
        
        // Upload new image if provided
        if (variant.image instanceof File) {
          const formData = new FormData();
          formData.append('file', variant.image);
          const variantImageName = `${data.productCode.toUpperCase()}_${variant.color}_${variant.size}.${variant.image.name.split('.').pop()}`;
          formData.append('filename', variantImageName);
          
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
          
          if (uploadResponse.ok) {
            const result = await uploadResponse.json();
            imageUrl = result.imageUrl;
            console.log('Variant image uploaded successfully:', imageUrl);
          } else {
            const errorText = await uploadResponse.text();
            console.error('Failed to upload variant image:', errorText);
            throw new Error(`Failed to upload variant image: ${uploadResponse.status} ${uploadResponse.statusText}`);
          }
        }
        
        console.log('Final variant data:', {
          ...variant,
          imageUrl: imageUrl || null
        });
        
        return {
          ...variant,
          imageUrl: imageUrl || null
        };
      }));

      console.log('Variants with images:', variantsWithImages);

      // Validate update data before sending
      const updateData: Partial<Product> = {
          name: data.name,
          productCode: data.productCode.toUpperCase(),
          category: data.category,
          price: data.price,
          minimumStockLevel: data.minimumStockLevel,
          imageUrl: mainImageUrl,
          description: data.description,
          variants: variantsWithImages, // Include variants in the update
          // Handle agePricing properly by ensuring it matches the expected structure
          agePricing: data.agePricing ? data.agePricing.map((pricing: any) => ({
            ageMin: pricing.ageMin,
            ageMax: pricing.ageMax,
            price: pricing.price,
            productId: product.id
          })) : []
      };
      
      console.log('Validating update data:', updateData);
      
      // Validate that all variants have required fields
      if (updateData.variants) {
        for (const variant of updateData.variants) {
          if (!variant.id || variant.color === undefined || variant.size === undefined || variant.stock === undefined) {
            console.error('Invalid variant data:', variant);
            throw new Error(`Invalid variant data: missing required fields in variant ${variant.id}`);
          }
        }
      }
      
      console.log('Sending update data:', updateData);
      
      const success = await updateProduct(product.id, updateData);
      
      console.log('Update API call success:', success);
      
      if (!success) {
        throw new Error('Failed to update product');
      }

      // Create stock events for any stock changes and handle replenishment
      const originalVariants = product.variants;
      for (const variantData of variantsWithImages) {
        const originalVariant = originalVariants.find(v => v.id === variantData.id);
        // Ensure both values are numbers for proper comparison
        const newStock = Number(variantData.stock);
        const oldStock = Number(originalVariant?.stock || 0);
        const stockChange = newStock - oldStock;

        if (stockChange !== 0) {
             // Create appropriate stock event based on the change
             await createStockEvent({
                productId: product.id,
                variantId: variantData.id,
                type: stockChange > 0 ? 'Stock In' : 'Stock Out',
                quantity: Math.abs(stockChange),
                // Use appropriate reason based on the type of change
                reason: stockChange > 0 ? 'Replenishment' : 'Manual adjustment',
            });
            
            // If this is a replenishment (stock increased), update shop inventories
            if (stockChange > 0) {
              // Update shop inventories with the replenished stock via API
              try {
                const response = await fetch(`/api/products/variant/${variantData.id}/replenish`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    productId: product.id,
                    quantityAdded: Math.abs(stockChange),
                  }),
                });
                
                if (!response.ok) {
                  console.error('Failed to update shop inventory:', await response.text());
                }
              } catch (error) {
                console.error('Error updating shop inventory:', error);
              }
            }
            
            // Check if stock is at or below minimum level and create notification
            // Since this is a client component, we need to make an API call to check stock levels
            try {
              const response = await fetch(`/api/products?id=${product.id}`);
              if (response.ok) {
                const updatedProduct = await response.json();
                const updatedVariant = updatedProduct.variants.find((v: ProductVariant) => v.id === variantData.id);
                
                if (updatedVariant && newStock <= updatedProduct.minimumStockLevel) {
                  // Create low stock notification for factory via API
                  await fetch('/api/notifications', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      userType: 'factory',
                      title: `Low Stock Alert`,
                      description: `Product "${updatedProduct.name}" (${updatedVariant.color}, ${updatedVariant.size}) stock is at ${newStock}, which is at or below the minimum level of ${updatedProduct.minimumStockLevel}.`,
                      href: `/products`,
                    }),
                  });
                }
              }
            } catch (error) {
              console.error('Error checking stock levels:', error);
            }
        }
    }

    console.log('Product updated successfully, calling onProductUpdated and onOpenChange');
    toast({
        title: "Product Updated Successfully",
        description: `"${data.name}" has been updated.`,
    });

    onProductUpdated();
    onOpenChange(false);
  } catch (error: any) {
      console.error("Error updating product:", error);
      toast({
          title: "Error",
          description: error.message || "Failed to update the product. Please try again.",
          variant: "destructive",
      });
  } finally {
      console.log('Form submission completed');
      setIsLoading(false);
  }
};

  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Make changes to the product details below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4 py-4"
          >
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field: { onChange, value, ...rest } }) => (
                <FormItem>
                  <FormLabel>Main Product Image</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleMainImageChange}
                      className="file:text-primary-foreground"
                      disabled={isLoading}
                    />
                  </FormControl>
                  {mainImagePreview && (
                    <div className="mt-2 relative w-full aspect-video max-w-sm rounded-md overflow-hidden border">
                      <Image src={mainImagePreview} alt="Main product preview" fill style={{ objectFit: "contain" }} />
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Men's Classic Tee" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="productCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., MC-TS-001" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Price (ETB)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe the product" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="minimumStockLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum Stock Level (Optional)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 10" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Product Variants</h3>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => appendVariant({ id: `VAR-${Date.now()}`, color: "", size: "", stock: 0, image: undefined, imageUrl: undefined })}
                  className="text-sm"
                  disabled={isLoading}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Variant
                </Button>
              </div>
              <div className="space-y-4">
                {variantFields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 border p-4 rounded-md relative">
                    <FormField
                      control={form.control}
                      name={`variants.${index}.color`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Color</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Blue" {...field} disabled={isLoading} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`variants.${index}.size`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Size</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., M" {...field} disabled={isLoading} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`variants.${index}.stock`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stock</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} disabled={isLoading} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div>
                      <FormField
                        control={form.control}
                        name={`variants.${index}.image`}
                        render={({ field: { onChange, value, ...rest } }) => (
                          <FormItem>
                            <FormLabel>Variant Image</FormLabel>
                            <FormControl>
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleVariantImageChange(e.target.files?.[0], onChange)}
                                className="text-xs file:text-primary-foreground"
                                disabled={isLoading}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <VariantImagePreview control={form.control} index={index} />
                    </div>
                    {variantFields.length > 1 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-3 -right-3 h-7 w-7"
                        onClick={() => removeVariant(index)}
                        disabled={isLoading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <FormMessage>{form.formState.errors.variants?.message || form.formState.errors.variants?.root?.message}</FormMessage>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Age-Based Pricing</h3>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => appendAgePricing({ ageMin: 0, ageMax: 0, price: 0 })}
                  className="text-sm"
                  disabled={isLoading}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Pricing
                </Button>
              </div>
              <div className="space-y-4">
                {agePricingFields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 sm:grid-cols-4 gap-4 border p-4 rounded-md relative">
                    <FormField
                      control={form.control}
                      name={`agePricing.${index}.ageMin`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Min Age</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="e.g., 1" {...field} disabled={isLoading} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`agePricing.${index}.ageMax`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Age</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="e.g., 4" {...field} disabled={isLoading} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`agePricing.${index}.price`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price (ETB)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="e.g., 1200" {...field} disabled={isLoading} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => removeAgePricing(index)}
                        disabled={isLoading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <FormMessage>{form.formState.errors.agePricing?.message}</FormMessage>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row sm:justify-end gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  console.log('Cancel button clicked');
                  onOpenChange(false);
                }} 
                className="w-full sm:w-auto" 
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="w-full sm:w-auto" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Product"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}