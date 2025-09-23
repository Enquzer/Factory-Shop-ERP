
"use client";

import * as React from "react";
import { useState, type ReactNode } from "react";
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
  DialogTrigger,
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
import { db, storage } from "@/lib/firebase";
import { collection, doc, setDoc, writeBatch } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { compressImage } from "@/lib/image-compression";
import { createStockEvent } from "@/lib/stock-events";

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
  imageUrl: z.any().refine((file) => file, "Main product image is required."),
  variants: z.array(variantSchema).min(1, "At least one variant is required"),
});

type ProductFormValues = z.infer<typeof productSchema>;

const categories = ["Men", "Women", "Kids", "Unisex"];

const VariantImagePreview = ({ control, index }: { control: any, index: number }) => {
    const imageFile = useWatch({
      control,
      name: `variants.${index}.image`,
    });
  
    const [preview, setPreview] = useState<string | null>(null);
  
    React.useEffect(() => {
      if (imageFile && typeof imageFile !== 'string') {
        const url = URL.createObjectURL(imageFile);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
      } else if (typeof imageFile === 'string') {
        setPreview(imageFile);
      } else {
        setPreview(null);
      }
    }, [imageFile]);
  
    if (!preview) return null;
  
    return (
      <div className="mt-2 relative w-full h-24 rounded-md overflow-hidden border">
        <Image src={preview} alt={`Variant ${index + 1} preview`} fill style={{objectFit: "cover"}} />
      </div>
    );
};

export function AddProductDialog({ children, onProductAdded }: { children: ReactNode, onProductAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      productCode: "",
      category: "",
      price: 0,
      description: "",
      variants: [{ color: "", size: "", stock: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "variants",
  });

  const handleMainImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsLoading(true);
      try {
        const compressedFile = await compressImage(file);
        const newPreviewUrl = URL.createObjectURL(compressedFile);
        if (mainImagePreview) {
            URL.revokeObjectURL(mainImagePreview);
        }
        setMainImagePreview(newPreviewUrl);
        form.setValue("imageUrl", compressedFile);
      } catch (error) {
        toast({ title: "Image Error", description: "Could not process image file.", variant: "destructive"});
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleVariantImageChange = async (file: File | undefined, onChange: (...event: any[]) => void) => {
    if (file) {
      setIsLoading(true);
      try {
        const compressedFile = await compressImage(file);
        onChange(compressedFile);
      } catch (error) {
         toast({ title: "Image Error", description: "Could not process variant image.", variant: "destructive"});
         console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
  }

  const uploadImage = async (file: File, path: string): Promise<string> => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  };


  const onSubmit = async (data: ProductFormValues) => {
    setIsLoading(true);
    try {
        const batch = writeBatch(db);
        const productId = data.productCode.toUpperCase();
        
        // Upload main image
        const mainImageFile = data.imageUrl as File;
        const mainImageUrl = await uploadImage(mainImageFile, `products/${productId}/main.jpg`);

        const variantsWithIds = data.variants.map((v, index) => ({
            ...v,
            id: `VAR-${Date.now()}-${index}`
        }));

        // Upload variant images
        const uploadedVariants = await Promise.all(variantsWithIds.map(async (variant) => {
            let variantImageUrl = '';
            if (variant.image) {
                const variantImageFile = variant.image as File;
                variantImageUrl = await uploadImage(variantImageFile, `products/${productId}/variant-${variant.id}.jpg`);
            }

            // Create initial stock event for each variant
            createStockEvent({
                productId: productId,
                variantId: variant.id,
                type: 'Stock In',
                quantity: variant.stock,
                reason: 'Initial stock',
            }, batch);

            return {
                id: variant.id,
                color: variant.color,
                size: variant.size,
                stock: variant.stock,
                imageUrl: variantImageUrl,
            };
        }));
        
        const newProduct = {
            id: productId,
            name: data.name,
            productCode: productId,
            category: data.category,
            price: data.price,
            description: data.description || '',
            imageUrl: mainImageUrl,
            variants: uploadedVariants,
        };
        
        const productRef = doc(db, "products", productId);
        batch.set(productRef, newProduct);

        await batch.commit();

        toast({
            title: "Product Added Successfully",
            description: `"${data.name}" has been added to your catalog.`,
        });
        
        setOpen(false);
        form.reset();
        setMainImagePreview(null);
        onProductAdded();

    } catch (error) {
        console.error("Error adding product:", error);
        toast({
            title: "Error",
            description: "Failed to add the product. Please try again.",
            variant: "destructive",
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new product to your catalog.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6 py-4 max-h-[80vh] overflow-y-auto pr-6">
            
            <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Main Product Image</FormLabel>
                        <FormControl>
                            <Input type="file" accept="image/*" onChange={handleMainImageChange} className="file:text-primary-foreground" disabled={isLoading}/>
                        </FormControl>
                         {mainImagePreview && (
                            <div className="mt-2 relative w-full aspect-video rounded-md overflow-hidden border">
                                <Image src={mainImagePreview} alt="Main product preview" fill style={{objectFit: 'contain'}} />
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
                        <Input placeholder="e.g., Men's Classic Tee" {...field} />
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
                        <Input placeholder="e.g., MC-TS-001" {...field} />
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
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
                        <Input type="number" step="0.01" {...field} />
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
                    <Textarea placeholder="Describe the product" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <h3 className="text-lg font-medium mb-4">Product Variants</h3>
              <div className="space-y-6">
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 border p-4 rounded-md relative">
                     <FormField
                        control={form.control}
                        name={`variants.${index}.color`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Color</FormLabel>
                            <FormControl><Input placeholder="e.g., Blue" {...field} /></FormControl>
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
                            <FormControl><Input placeholder="e.g., M" {...field} /></FormControl>
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
                            <FormControl><Input type="number" {...field} /></FormControl>
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
              </div>
               <FormMessage>{form.formState.errors.variants?.message || form.formState.errors.variants?.root?.message}</FormMessage>
            </div>

            <DialogFooter>
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
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
