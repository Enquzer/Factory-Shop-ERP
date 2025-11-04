"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Shop, updateShop } from "@/lib/shops";

const editShopSchema = z.object({
    name: z.string().min(1, "Shop name is required"),
    contactPerson: z.string().min(1, "Contact person is required"),
    contactPhone: z.string().min(1, "Contact phone is required"),
    city: z.string().min(1, "City is required"),
    exactLocation: z.string().min(1, "Exact location is required"),
    discount: z.coerce.number().min(0, "Discount can't be negative").max(100, "Discount can't be over 100").default(0),
    monthlySalesTarget: z.coerce.number().min(0, "Sales target must be a positive number").optional().nullable(),
    tradeLicenseNumber: z.string().optional().nullable(),
    tinNumber: z.string().optional().nullable(),
    // New fields for variant visibility control
    showVariantDetails: z.boolean().optional(),
    maxVisibleVariants: z.coerce.number().min(1).max(1000).optional().nullable(),
    aiDistributionMode: z.enum(['proportional', 'equal', 'manual_override']).optional().nullable()
});

type EditShopFormValues = z.infer<typeof editShopSchema>;

export function EditShopDialog({ shop, open, onOpenChange, onShopUpdated, userRole }: { shop: Shop; open: boolean; onOpenChange: (open: boolean) => void; onShopUpdated: () => void; userRole?: 'factory' | 'shop' }) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<EditShopFormValues>({
    resolver: zodResolver(editShopSchema),
    defaultValues: {
      name: "",
      contactPerson: "",
      contactPhone: "",
      city: "",
      exactLocation: "",
      discount: 0,
      monthlySalesTarget: undefined,
      tradeLicenseNumber: "",
      tinNumber: "",
      showVariantDetails: true,
      maxVisibleVariants: 1000,
      aiDistributionMode: "proportional"
    },
  });

  useEffect(() => {
    if (shop) {
        form.reset({
            name: shop.name || "",
            contactPerson: shop.contactPerson || "",
            contactPhone: shop.contactPhone || "",
            city: shop.city || "",
            exactLocation: shop.exactLocation || "",
            discount: shop.discount ? shop.discount * 100 : 0, // Convert to percentage for display
            monthlySalesTarget: shop.monthlySalesTarget ?? undefined,
            tradeLicenseNumber: shop.tradeLicenseNumber ?? "",
            tinNumber: shop.tinNumber ?? "",
            // New fields for variant visibility control
            showVariantDetails: shop.showVariantDetails ?? true,
            maxVisibleVariants: shop.maxVisibleVariants ?? undefined,
            aiDistributionMode: shop.aiDistributionMode ?? undefined
        });
    }
  }, [shop, form]);

  const onSubmit = async (data: EditShopFormValues) => {
    setIsLoading(true);
    try {
        // Only include discount in update data if user is factory
        const updateData: any = {
            ...data,
            discount: data.discount !== undefined && data.discount !== null ? data.discount / 100 : undefined, // Convert back to decimal
            // Handle nullable fields - convert undefined to null for API consistency
            monthlySalesTarget: data.monthlySalesTarget !== undefined ? data.monthlySalesTarget : null,
            tradeLicenseNumber: data.tradeLicenseNumber !== undefined ? data.tradeLicenseNumber : null,
            tinNumber: data.tinNumber !== undefined ? data.tinNumber : null,
            maxVisibleVariants: data.maxVisibleVariants !== undefined ? data.maxVisibleVariants : null,
            aiDistributionMode: data.aiDistributionMode !== undefined ? data.aiDistributionMode : null
        };
        
        // If user is not factory, remove discount from update data
        if (userRole !== 'factory') {
            delete updateData.discount;
        }

        await updateShop(shop.id, updateData);

        toast({
            title: "Shop Updated Successfully",
            description: `"${data.name}" has been updated.`,
        });
        
        onShopUpdated();
        onOpenChange(false);

    } catch (error) {
        console.error("Error updating shop:", error);
        toast({
            title: "Error",
            description: "Failed to update the shop. Please try again.",
            variant: "destructive",
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Shop: {shop.name}</DialogTitle>
          <DialogDescription>
            Update the details for this shop.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Column 1 */}
                <div className="space-y-4">
                     <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Shop Name</FormLabel>
                            <FormControl><Input placeholder="e.g., Bole Boutique" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="contactPerson"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Contact Person</FormLabel>
                            <FormControl><Input placeholder="e.g., John Doe" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="contactPhone"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Contact Phone</FormLabel>
                            <FormControl><Input placeholder="+251..." {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl><Input placeholder="e.g., Addis Ababa" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="exactLocation"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Exact Location / Address</FormLabel>
                            <FormControl><Textarea placeholder="Describe the shop's location" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                {/* Column 2 */}
                <div className="space-y-4">
                     <FormField
                        control={form.control}
                        name="discount"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Discount (%)</FormLabel>
                            <FormControl>
                                <Input 
                                    type="number" 
                                    min="0" 
                                    max="100" 
                                    {...field} 
                                    disabled={userRole !== 'factory'} // Disable for non-factory users
                                />
                            </FormControl>
                            {userRole !== 'factory' && (
                                <p className="text-xs text-muted-foreground">
                                    Only factory users can edit discount percentage
                                </p>
                            )}
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="monthlySalesTarget"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Monthly Sales Target (ETB)</FormLabel>
                            <FormControl>
                                <Input 
                                    type="number" 
                                    min="0" 
                                    value={field.value ?? undefined}
                                    onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                                    onBlur={field.onBlur}
                                    name={field.name}
                                    ref={field.ref}
                                />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="tradeLicenseNumber"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Trade License Number</FormLabel>
                            <FormControl>
                                <Input 
                                    value={field.value ?? ""}
                                    onChange={(e) => field.onChange(e.target.value === "" ? undefined : e.target.value)}
                                    onBlur={field.onBlur}
                                    name={field.name}
                                    ref={field.ref}
                                />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="tinNumber"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>TIN Number</FormLabel>
                            <FormControl>
                                <Input 
                                    value={field.value ?? ""}
                                    onChange={(e) => field.onChange(e.target.value === "" ? undefined : e.target.value)}
                                    onBlur={field.onBlur}
                                    name={field.name}
                                    ref={field.ref}
                                />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 pt-4">
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Variant Visibility Settings</h3>
                    <FormField
                        control={form.control}
                        name="showVariantDetails"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-base">Show Variant Details</FormLabel>
                                    <p className="text-sm text-muted-foreground">
                                        When enabled, shops see each product variant (color/size) separately.
                                        When disabled, shops see only aggregated product totals.
                                    </p>
                                </div>
                                <FormControl>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="maxVisibleVariants"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Max Visible Variants</FormLabel>
                                    <FormControl>
                                        <Input 
                                            type="number" 
                                            min="1" 
                                            max="1000" 
                                            value={field.value ?? undefined}
                                            onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                                            onBlur={field.onBlur}
                                            name={field.name}
                                            ref={field.ref}
                                        />
                                    </FormControl>
                                    <p className="text-xs text-muted-foreground">
                                        Maximum number of variants to display per shop (1-1000)
                                    </p>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="aiDistributionMode"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>AI Distribution Mode</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select distribution mode" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="proportional">Proportional</SelectItem>
                                            <SelectItem value="equal">Equal Distribution</SelectItem>
                                            <SelectItem value="manual_override">Manual Override</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        How AI allocates orders when variants are hidden
                                    </p>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>
            </div>

            <DialogFooter className="pt-6">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                        </>
                    ) : "Save Changes"}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}