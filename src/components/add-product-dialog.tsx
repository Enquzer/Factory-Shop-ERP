

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
import { PlusCircle, Trash2 } from "lucide-react";
import Image from "next/image";

const variantSchema = z.object({
  color: z.string().min(1, "Color is required"),
  size: z.string().min(1, "Size is required"),
  quantity: z.coerce.number().int().positive("Quantity must be a positive number"),
  image: z.any().optional(),
});

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  productCode: z.string().min(1, "Product code is required"),
  category: z.string().min(1, "Category is required"),
  price: z.coerce.number().positive("Price must be a positive number"),
  description: z.string().optional(),
  mainImage: z.any().optional(),
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

export function AddProductDialog({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
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
      variants: [{ color: "", size: "", quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "variants",
  });

  const handleMainImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setMainImagePreview(URL.createObjectURL(file));
      form.setValue("mainImage", file);
    }
  };

  const onSubmit = (data: ProductFormValues) => {
    console.log("New Product Data:", data);
    // Here you would typically handle file uploads and call an API to save the product
    toast({
      title: "Product Added",
      description: `"${data.name}" has been added to your catalog.`,
    });
    setOpen(false);
    form.reset();
    setMainImagePreview(null);
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
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
                        <Input placeholder="e.g., MCT-001" {...field} />
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
              <div className="space-y-2">
                 <FormLabel>Main Product Image</FormLabel>
                 <FormControl>
                    <Input type="file" accept="image/*" onChange={handleMainImageChange} className="file:text-primary-foreground" />
                 </FormControl>
                 {mainImagePreview && (
                    <div className="mt-2 relative w-full h-48 rounded-md overflow-hidden border">
                        <Image src={mainImagePreview} alt="Main product preview" fill style={{objectFit: 'cover'}} />
                    </div>
                 )}
                 <FormMessage>{form.formState.errors.mainImage?.message as ReactNode}</FormMessage>
              </div>
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
                        name={`variants.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantity</FormLabel>
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
                                            onChange={(e) => onChange(e.target.files?.[0])}
                                            className="text-xs file:text-primary-foreground"
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
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                 <Button
                    type="button"
                    variant="outline"
                    onClick={() => append({ color: "", size: "", quantity: 1 })}
                    className="mt-4"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Another Variant
                  </Button>
              </div>
               <FormMessage>{form.formState.errors.variants?.message || form.formState.errors.variants?.root?.message}</FormMessage>
            </div>

            <DialogFooter>
              <Button type="submit">Add Product</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
