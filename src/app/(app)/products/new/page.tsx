"use client";

import * as React from "react";
import { useState } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { PlusCircle, Trash2, Loader2, ArrowLeft } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createProduct } from "@/lib/products";
import { getShops } from "@/lib/shops";
import { createStockEvent } from "@/lib/stock-events";
import { EnhancedImageUpload } from "@/components/enhanced-image-upload";

const variantSchema = z.object({
  color: z.string().min(1, "Color is required"),
  size: z.string().min(1, "Size is required"),
  stock: z.coerce.number().int().positive("Stock must be a positive number"),
  image: z.any().optional(),
});

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  productCode: z.string().regex(/^[a-zA-Z]{2}-[a-zA-Z]{2}-\d{3}$/i, "Code must be in XX-XX-XXX format"),
  category: z.string().min(1, "Category is required"),
  price: z.coerce.number().positive("Price must be a positive number"),
  description: z.string().optional(),
  minimumStockLevel: z.coerce.number().int().nonnegative("Minimum stock must be a non-negative number").optional(),
  imageUrl: z.any().refine((file) => file, "Main product image is required."),
  variants: z.array(variantSchema).min(1, "At least one variant is required"),
});

type ProductFormValues = z.infer<typeof productSchema>;

const categories = ["Men", "Women", "Kids", "Unisex"];

const VariantImagePreview = ({ control, index }: { control: any; index: number }) => {
  const imageFile = useWatch({
    control,
    name: `variants.${index}.image`,
  });

  const [preview, setPreview] = useState<string | null>(null);

  React.useEffect(() => {
    if (imageFile instanceof File) {
      const url = URL.createObjectURL(imageFile);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    } else if (typeof imageFile === "string") {
      setPreview(imageFile);
    } else {
      setPreview(null);
    }
  }, [imageFile]);

  if (!preview) return null;

  return (
    <div className="relative h-32 w-full rounded-md overflow-hidden">
      <Image 
        src={preview} 
        alt={`Variant ${index + 1} preview`} 
        fill 
        sizes="(max-width: 768px) 50vw, 25vw"
        style={{ objectFit: "cover" }} 
        priority={false} // Set to false for non-critical images
      />
    </div>
  );
};

export default function NewProductPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [progressMessage, setProgressMessage] = useState("");
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      productCode: "",
      category: "",
      price: 0,
      description: "",
      minimumStockLevel: 10,
      variants: [{ color: "", size: "", stock: 1, image: undefined }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "variants",
  });

  const handleMainImageChange = (file: File | null) => {
    if (!file) {
      setMainImagePreview(null);
      form.setValue("imageUrl", undefined);
      return;
    }

    const newPreviewUrl = URL.createObjectURL(file);
    if (mainImagePreview) URL.revokeObjectURL(mainImagePreview);
    setMainImagePreview(newPreviewUrl);
    form.setValue("imageUrl", file);
  };

  const handleVariantImageChange = (file: File | null, index: number) => {
    if (!file) {
      form.setValue(`variants.${index}.image`, undefined);
      return;
    }
    form.setValue(`variants.${index}.image`, file);
  };

  const onSubmit = async (data: ProductFormValues) => {
    setIsLoading(true);
    try {
      setProgressMessage("Creating product...");
      
      // Upload main product image if provided
      let mainImageUrl = undefined;
      if (data.imageUrl instanceof File) {
        const formData = new FormData();
        formData.append('file', data.imageUrl);
        const mainImageName = `${data.productCode.toUpperCase()}_main.${data.imageUrl.name.split('.').pop()}`;
        formData.append('filename', mainImageName);
      
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
      
        if (uploadResponse.ok) {
          const result = await uploadResponse.json();
          mainImageUrl = result.imageUrl;
        } else {
          throw new Error('Failed to upload main product image');
        }
      }
      
      // Upload variant images if provided
      const variantsWithImages = await Promise.all(data.variants.map(async (variant, index) => {
        let imageUrl = undefined;
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
          } else {
            throw new Error(`Failed to upload variant image for ${variant.color} ${variant.size}`);
          }
        }
        // Create a new variant object without the File object
        const { image, ...variantWithoutImage } = variant;
        return {
          ...variantWithoutImage,
          imageUrl
        };
      }));

      // Create the product in SQLite
      const newProduct = await createProduct({
        name: data.name,
        productCode: data.productCode.toUpperCase(),
        category: data.category,
        price: data.price,
        minimumStockLevel: data.minimumStockLevel || 10,
        imageUrl: mainImageUrl,
        description: data.description,
        variants: variantsWithImages.map(variant => ({
          // Don't send id and productId fields - they will be generated by the backend
          color: variant.color,
          size: variant.size,
          stock: variant.stock,
          imageUrl: variant.imageUrl
        }))
      });

      // Create stock events for each variant
      try {
        for (const variant of newProduct.variants) {
          await createStockEvent({
            productId: newProduct.id,
            variantId: variant.id,
            type: "Stock In",
            quantity: variant.stock,
            reason: "Initial stock"
          });
        }
      } catch (stockError) {
        console.error("Error creating stock events:", stockError);
        // Don't fail the entire product creation if stock events fail
        toast({
          title: "Warning",
          description: "Product created successfully, but there was an issue recording initial stock levels.",
          variant: "destructive",
        });
      }

      // Clean up object URLs
      if (mainImagePreview) URL.revokeObjectURL(mainImagePreview);
      setMainImagePreview(null);

      toast({
        title: "Product Added Successfully",
        description: `"${data.name}" has been added to your catalog.`,
      });

      router.push("/products");
    } catch (error: any) {
      console.error("Error adding product:", error);
      
      // Handle specific error cases
      let errorMessage = "Failed to add the product. Please try again.";
      if (error.message) {
        if (error.message.includes('already exists')) {
          errorMessage = error.message;
        } else if (error.message.includes('Failed to create product')) {
          errorMessage = "Failed to create product. Please check your inputs and try again.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setProgressMessage("");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/products">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Products</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">Add New Product</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Product Details</CardTitle>
          <CardDescription>Fill in the details below to add a new product to your catalog.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
              <EnhancedImageUpload
                label="Main Product Image"
                onImageChange={handleMainImageChange}
                currentImage={mainImagePreview}
                disabled={isLoading}
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
                      <FormLabel>Price (ETB)</FormLabel>
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

              <Card>
                <CardHeader>
                  <CardTitle>Product Variants</CardTitle>
                  <CardDescription>Add at least one color/size combination for this product.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {fields.map((field, index) => (
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
                              <EnhancedImageUpload
                                label="Variant Image"
                                onImageChange={(file) => handleVariantImageChange(file, index)}
                                disabled={isLoading}
                                accept="image/*"
                              />
                            </FormItem>
                          )}
                        />
                        <VariantImagePreview control={form.control} index={index} />
                      </div>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-3 -right-3 h-7 w-7"
                          onClick={() => remove(index)}
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => append({ color: "", size: "", stock: 1, image: undefined })}
                    className="mt-4"
                    disabled={isLoading}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Another Variant
                  </Button>
                  <FormMessage>{form.formState.errors.variants?.message || form.formState.errors.variants?.root?.message}</FormMessage>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => router.push("/products")}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {progressMessage || "Adding Product..."}
                    </>
                  ) : (
                    "Add Product"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper function to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};