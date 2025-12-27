"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
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
    monthlySalesTarget: z.coerce.number().min(0, "Sales target must be a non-negative number").default(0), // Make it required with default 0
    tradeLicenseNumber: z.string().optional().nullable(),
    tinNumber: z.string().optional().nullable(),
    status: z.enum(['Active', 'Inactive', 'Pending']).optional(),
    // New fields for variant visibility control
    showVariantDetails: z.boolean().optional(),
    maxVisibleVariants: z.coerce.number().min(1).max(1000).optional().nullable()
    // Removed aiDistributionMode field
});

type EditShopFormValues = z.infer<typeof editShopSchema>;

export function EditShopDialog({ shop, open, onOpenChange, onShopUpdated, userRole }: { shop: Shop; open: boolean; onOpenChange: (open: boolean) => void; onShopUpdated: () => void; userRole?: 'factory' | 'shop' }) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const hasInitialized = useRef(false);
  const prevShopRef = useRef<Shop | null>(null);

  const form = useForm<EditShopFormValues>({
    resolver: zodResolver(editShopSchema),
    defaultValues: {
      name: "",
      contactPerson: "",
      contactPhone: "",
      city: "",
      exactLocation: "",
      discount: 0,
      monthlySalesTarget: 0, // Changed from null to 0
      tradeLicenseNumber: null,
      tinNumber: null,
      status: "Pending",
      showVariantDetails: true,
      maxVisibleVariants: 1000
      // Removed aiDistributionMode from default values
    },
  });

  // Only initialize the form once when the dialog opens and shop data is available
  useEffect(() => {
    if (open && shop && !hasInitialized.current) {
      // Check if shop data has actually changed to prevent unnecessary resets
      if (!prevShopRef.current || prevShopRef.current.id !== shop.id) {
        hasInitialized.current = true;
        prevShopRef.current = shop;
        
        form.reset({
          name: shop.name || "",
          contactPerson: shop.contactPerson || "",
          contactPhone: shop.contactPhone || "",
          city: shop.city || "",
          exactLocation: shop.exactLocation || "",
          discount: shop.discount ? shop.discount * 100 : 0, // Convert to percentage for display
          monthlySalesTarget: shop.monthlySalesTarget ?? 0, // Changed from null to 0
          tradeLicenseNumber: shop.tradeLicenseNumber ?? null,
          tinNumber: shop.tinNumber ?? null,
          status: shop.status ?? "Pending",
          // New fields for variant visibility control
          showVariantDetails: shop.showVariantDetails ?? true,
          maxVisibleVariants: shop.maxVisibleVariants ?? 1000
          // Removed aiDistributionMode from form reset
        });
      }
    }
    
    // Reset initialization flag when dialog closes
    if (!open) {
      hasInitialized.current = false;
      prevShopRef.current = null;
    }
  }, [open, shop?.id, form]); // Only depend on shop.id instead of the entire shop object

  const onSubmit = async (data: EditShopFormValues) => {
    if (isLoading) return; // Prevent multiple submissions
    
    setIsLoading(true);
    try {
        // Only include discount in update data if user is factory
        const updateData: any = {
            ...data,
            discount: data.discount !== undefined && data.discount !== null ? data.discount / 100 : undefined, // Convert back to decimal
            // Handle nullable fields - convert empty strings to null for API consistency
            monthlySalesTarget: data.monthlySalesTarget, // No longer need to convert to null since it's required
            tradeLicenseNumber: data.tradeLicenseNumber !== undefined && data.tradeLicenseNumber !== null && data.tradeLicenseNumber !== "" ? data.tradeLicenseNumber : null,
            tinNumber: data.tinNumber !== undefined && data.tinNumber !== null && data.tinNumber !== "" ? data.tinNumber : null,
            maxVisibleVariants: data.maxVisibleVariants !== undefined && data.maxVisibleVariants !== null ? data.maxVisibleVariants : null
            // Removed aiDistributionMode from update data
        };
        
        // If user is not factory, remove discount from update data
        if (userRole !== 'factory') {
            delete updateData.discount;
        }

        console.log("Sending update data:", updateData);
        const result = await updateShop(shop.id, updateData);
        console.log("Update result:", result);
        
        if (result) {
            toast({
                title: "Shop Updated Successfully",
                description: `"${data.name}" has been updated.`,
            });
            
            // Reset initialization flag to allow re-initialization if dialog is reopened
            hasInitialized.current = false;
            
            // Close the dialog first
            onOpenChange(false);
            
            // Use setTimeout to ensure proper state updates before fetching
            setTimeout(() => {
                onShopUpdated();
            }, 100);
        } else {
            throw new Error("Failed to update shop");
        }
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
    <Dialog open={open} onOpenChange={(isOpen) => {
      // Only call onOpenChange if the state is actually changing
      if (isOpen !== open) {
        onOpenChange(isOpen);
      }
      // Reset initialization flag when dialog closes
      if (!isOpen) {
        hasInitialized.current = false;
        prevShopRef.current = null;
      }
    }}>
      <DialogContent className="sm:max-w-2xl" key="edit-shop-dialog-content">
        <DialogHeader key="edit-shop-dialog-header">
          <DialogTitle key="edit-shop-dialog-title">Edit Shop: {shop.name}</DialogTitle>
          <DialogDescription key="edit-shop-dialog-description">
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
                        name="status"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Active">Active</SelectItem>
                                    <SelectItem value="Inactive">Inactive</SelectItem>
                                    <SelectItem value="Pending">Pending</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
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
                            {userRole !== 'factory' ? (
                                <p key="discount-info" className="text-xs text-muted-foreground">
                                    Only factory users can edit discount percentage
                                </p>
                            ) : null}
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
                                    value={field.value}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
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
                                    onChange={(e) => field.onChange(e.target.value === "" ? null : e.target.value)}
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
                                    onChange={(e) => field.onChange(e.target.value === "" ? null : e.target.value)}
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
                                            value={field.value ?? ""}
                                            onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
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
                        {/* Removed AI Distribution Mode field */}
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
