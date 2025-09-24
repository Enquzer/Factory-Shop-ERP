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
import { db, storage } from "@/lib/firebase";
import { collection, doc, setDoc, writeBatch } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { compressImage } from "@/lib/image-compression";
import { createStockEvent } from "@/lib/stock-events";
import { getShops } from "@/lib/shops";
import { createNotificationForBatch } from "@/lib/notifications";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

const sendNewProductNotifications = async (productName: string, productId: string) => {
  try {
    const shops = await getShops();
    if (shops.length === 0) return;

    const batch = writeBatch(db);
    shops.forEach((shop) => {
      createNotificationForBatch(
        {
          userType: "shop",
          shopId: shop.id,
          title: `New Product Available!`,
          description: `Check out the new "${productName}" in the catalog.`,
          href: `/shop/products?query=${productId}`,
        },
        batch
      );
    });

    await batch.commit();
    console.log(`Sent notifications to ${shops.length} shops for new product: ${productName}`);
  } catch (error) {
    console.error("Failed to send new product notifications:", error);
    throw error;
  }
};

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
    <div className="mt-2 relative w-full h-24 rounded-md overflow-hidden border">
      <Image src={preview} alt={`Variant ${index + 1} preview`} fill style={{ objectFit: "cover" }} />
    </div>
  );
};

export default function NewProductPage() {
  const [isLoading, setIsLoading] = useState(false);
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

  const handleMainImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    let localIsLoading = true;
    try {
      const compressedFile = await compressImage(file);
      const newPreviewUrl = URL.createObjectURL(compressedFile);
      if (mainImagePreview) URL.revokeObjectURL(mainImagePreview);
      setMainImagePreview(newPreviewUrl);
      form.setValue("imageUrl", compressedFile);
    } catch (error) {
      console.error("Main image processing error:", error);
      toast({
        title: "Image Error",
        description: "Could not process main image file.",
        variant: "destructive",
      });
    } finally {
      localIsLoading = false;
    }
  };

  const handleVariantImageChange = async (file: File | undefined, onChange: (...event: any[]) => void) => {
    if (!file) return;
    
    let localIsLoading = true;
    try {
      const compressedFile = await compressImage(file);
      onChange(compressedFile);
    } catch (error) {
      console.error("Variant image processing error:", error);
      toast({
        title: "Image Error",
        description: "Could not process variant image.",
        variant: "destructive",
      });
    } finally {
      localIsLoading = false;
    }
  };

  const uploadImage = async (file: File, path: string): Promise<string> => {
    try {
      const storageRef = ref(storage, path);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      console.log(`Image uploaded successfully to ${path}`);
      return url;
    } catch (error) {
      console.error(`Failed to upload image to ${path}:`, error);
      throw error;
    }
  };

  const onSubmit = async (data: ProductFormValues) => {
    setIsLoading(true);
    try {
      console.log("Starting product submission...");
      const productId = data.productCode.toUpperCase();

      // 1. Upload main image
      console.log("Uploading main image...");
      const mainImageFile = data.imageUrl as File;
      const mainImageUrl = await uploadImage(mainImageFile, `products/${productId}/main.jpg`);

      // 2. Process variants
      console.log("Processing variants...");
      const batch = writeBatch(db);
      const uploadedVariants = [];

      for (const [index, variantData] of data.variants.entries()) {
        console.log(`Processing variant ${index + 1}...`);
        const variantId = `VAR-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        let variantImageUrl = "";

        if (variantData.image instanceof File) {
          console.log(`Uploading variant image for variant ${index + 1}...`);
          variantImageUrl = await uploadImage(variantData.image, `products/${productId}/variant-${variantId}.jpg`);
        }

        console.log(`Creating stock event for variant ${index + 1}...`);
        createStockEvent(
          {
            productId: productId,
            variantId: variantId,
            type: "Stock In",
            quantity: variantData.stock,
            reason: "Initial stock",
          },
          batch
        );

        uploadedVariants.push({
          id: variantId,
          color: variantData.color,
          size: variantData.size,
          stock: variantData.stock,
          imageUrl: variantImageUrl,
        });
      }

      // 3. Assemble product
      console.log("Assembling product data...");
      const newProduct = {
        id: productId,
        name: data.name,
        productCode: productId,
        category: data.category,
        price: data.price,
        description: data.description || "",
        minimumStockLevel: data.minimumStockLevel,
        imageUrl: mainImageUrl,
        variants: uploadedVariants,
      };

      // 4. Commit to Firestore
      console.log("Committing product to Firestore...");
      const productRef = doc(db, "products", productId);
      batch.set(productRef, newProduct);
      await batch.commit();
      console.log("Batch committed successfully");

      // 5. Send notifications
      console.log("Sending notifications...");
      await sendNewProductNotifications(newProduct.name, newProduct.id);

      // 6. Reset form and state
      console.log("Resetting form...");
      form.reset();
      if (mainImagePreview) URL.revokeObjectURL(mainImagePreview);
      setMainImagePreview(null);

      toast({
        title: "Product Added Successfully",
        description: `"${data.name}" has been added to your catalog.`,
      });

      // 7. Navigate
      console.log("Navigating to products page...");
      router.push("/products");
    } catch (error) {
      console.error("Error adding product:", error);
      toast({
        title: "Error",
        description: "Failed to add the product. Please check the logs and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
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
                      Adding Product...
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
