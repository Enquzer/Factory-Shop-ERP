"use client";

import { useState, type ReactNode } from "react";
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
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "./ui/textarea";

const shopSchema = z.object({
    username: z.string().min(1, "Username is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    contactPerson: z.string().min(1, "Contact person is required"),
    contactPhone: z.string().min(1, "Contact phone is required"),
    city: z.string().min(1, "City is required"),
    exactLocation: z.string().min(1, "Exact location is required"),
    discountPercent: z.coerce.number().min(0, "Discount can't be negative").max(100, "Discount can't be over 100").default(0),
    tradeLicenseNumber: z.string().optional(),
    tinNumber: z.string().optional(),
    shopPictures: z.any().optional(),
    licenseAttachment: z.any().optional(),
});

type ShopFormValues = z.infer<typeof shopSchema>;


export function RegisterShopDialog({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<ShopFormValues>({
    resolver: zodResolver(shopSchema),
    defaultValues: {
        username: "",
        password: "",
        contactPerson: "",
        contactPhone: "",
        city: "",
        exactLocation: "",
        discountPercent: 0,
        tradeLicenseNumber: "",
        tinNumber: "",
    },
  });

  const onSubmit = (data: ShopFormValues) => {
    console.log("New Shop Data:", data);
    // Here you would typically handle file uploads and call an API to save the shop
    toast({
      title: "Shop Registered",
      description: `Shop "${data.username}" has been registered.`,
    });
    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Register New Shop</DialogTitle>
          <DialogDescription>
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
                    <h3 className="text-lg font-medium">Location & Discount</h3>
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
                        name="discountPercent"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Discount (%)</FormLabel>
                            <FormControl><Input type="number" min="0" max="100" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Business Details</h3>
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
                    <h3 className="text-lg font-medium">Attachments</h3>
                    <FormField
                        control={form.control}
                        name="shopPictures"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Shop Picture(s)</FormLabel>
                                <FormControl>
                                    <Input 
                                        type="file" 
                                        accept="image/*" 
                                        multiple
                                        onChange={(e) => field.onChange(e.target.files)}
                                        className="file:text-primary-foreground"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                        />
                    <FormField
                        control={form.control}
                        name="licenseAttachment"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>License Attachment</FormLabel>
                                <FormControl>
                                    <Input 
                                        type="file" 
                                        accept="image/*,application/pdf"
                                        onChange={(e) => field.onChange(e.target.files?.[0])}
                                        className="file:text-primary-foreground"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                        />
                </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row sm:justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">Cancel</Button>
                <Button type="submit" className="w-full sm:w-auto">Register Shop</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    