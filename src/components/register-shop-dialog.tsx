"use client";

import * as React from "react";
import { ReactNode, useState } from "react";
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
import { addShop } from "@/lib/shops";

const shopSchema = z.object({
    username: z.string().min(1, "Username is required"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    name: z.string().min(1, "Shop name is required"),
    contactPerson: z.string().min(1, "Contact person is required"),
    contactPhone: z.string().min(1, "Contact phone is required"),
    city: z.string().min(1, "City is required"),
    exactLocation: z.string().min(1, "Exact location is required"),
    discount: z.coerce.number().min(0, "Discount can't be negative").max(100, "Discount can't be over 100").default(0),
    monthlySalesTarget: z.coerce.number().min(0, "Sales target must be a positive number").default(0),
    tradeLicenseNumber: z.string().optional(),
    tinNumber: z.string().optional(),
    // New fields for variant visibility control
    showVariantDetails: z.boolean().default(true),
    maxVisibleVariants: z.coerce.number().min(1).max(1000).default(1000)
    // Removed aiDistributionMode field
});

type ShopFormValues = z.infer<typeof shopSchema>;


export function RegisterShopDialog({ children, onShopRegistered, userRole }: { children: ReactNode, onShopRegistered: () => void, userRole?: 'factory' | 'shop' }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<ShopFormValues>({
    resolver: zodResolver(shopSchema),
    defaultValues: {
        username: "",
        password: "",
        name: "",
        contactPerson: "",
        contactPhone: "",
        city: "",
        exactLocation: "",
        discount: 0,
        monthlySalesTarget: 10000,
        tradeLicenseNumber: "",
        tinNumber: "",
        // New fields for variant visibility control
        showVariantDetails: true,
        maxVisibleVariants: 1000
        // Removed aiDistributionMode from default values
    },
  });

  const onSubmit = async (data: ShopFormValues) => {
    setIsLoading(true);
    try {
        // Prepare shop data for submission
        const shopData = {
            username: data.username,
            password: data.password,
            name: data.name,
            contactPerson: data.contactPerson,
            contactPhone: data.contactPhone,
            city: data.city,
            exactLocation: data.exactLocation,
            discount: data.discount / 100, // Convert percentage to decimal
            monthlySalesTarget: data.monthlySalesTarget ?? 0,
            tradeLicenseNumber: data.tradeLicenseNumber ?? "",
            tinNumber: data.tinNumber ?? "",
            status: "Pending" as const, // Always set status to Pending for new shops
            // New fields for variant visibility control with proper defaults
            showVariantDetails: data.showVariantDetails ?? true,
            maxVisibleVariants: data.maxVisibleVariants ?? 1000
            // Removed aiDistributionMode from shop data
        };

        await addShop(shopData);
        toast({
          title: "Shop Registered Successfully",
          description: `Shop "${data.name}" has been registered.`,
        });
        // Use setTimeout to ensure proper state updates before closing
        setTimeout(() => {
            setOpen(false);
            form.reset();
        }, 0);
        onShopRegistered();
    } catch (error: any) {
        console.error("Error registering shop:", error);
        // Provide a more user-friendly error message for username conflicts
        // Handle both Error object and plain object cases
        let errorMessage = "An error occurred while registering the shop. Please try again.";
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (error && typeof error === 'object' && 'message' in error) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }
        
        const userFriendlyMessage = errorMessage.includes("already exists") 
            ? `The username "${data.username}" is already taken. Please choose a different username.`
            : errorMessage;
            
        toast({
            title: "Registration Failed",
            description: userFriendlyMessage,
            variant: "destructive",
        })
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl" key="register-shop-dialog-content">
        <DialogHeader key="register-shop-dialog-header">
          <DialogTitle key="register-shop-dialog-title">Register New Shop</DialogTitle>
          <DialogDescription key="register-shop-dialog-description">
            Fill in the details below to register a new shop.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4 max-h-[80vh] overflow-y-auto pr-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Column 1 */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Shop Credentials</h3>
                    <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl><Input placeholder="e.g., bole_boutique" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl><Input type="password" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <h3 className="text-lg font-medium pt-4">Shop Information</h3>
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
                </div>
                {/* Column 2 */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Location &amp; Financials</h3>
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
                                    Only factory users can set discount percentage
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
                            <FormControl><Input type="number" min="0" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Business Details (Optional)</h3>
                    <FormField
                        control={form.control}
                        name="tradeLicenseNumber"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Trade License Number</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
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
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
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
                                        When enabled, shops see each product variant (color/size) separately. When disabled, shops see only aggregated product totals.
                                    </p>
                                </div>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={(checked) => {
                                        field.onChange(checked);
                                        // Show notification about the change
                                        const shopName = form.getValues('name') || 'New Shop';
                                        toast({
                                            title: "Variant Visibility Updated",
                                            description: `Variant details for shop "${shopName}" have been ${checked ? 'enabled' : 'disabled'}. ${checked ? 'Shops will now see individual product variants.' : 'Shops will now see aggregated product totals only.'}`,
                                            duration: 5000,
                                        });
                                    }}
                                />
                            </FormItem>
                        )}
                    />
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
                                        {...field} 
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

            <DialogFooter className="flex-col sm:flex-row sm:justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto" disabled={isLoading}>Cancel</Button>
                <Button type="submit" className="w-full sm:w-auto" disabled={isLoading}>
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Registering...
                        </>
                    ) : "Register Shop"}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}