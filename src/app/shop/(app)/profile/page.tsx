"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator";
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ShopProfileData = {
  id: string;
  username: string;
  name: string;
  contactPerson: string;
  contactPhone: string;
  city: string;
  exactLocation: string;
  tradeLicenseNumber: string;
  tinNumber: string;
  discount: number;
  status: 'Active' | 'Inactive' | 'Pending';
  monthlySalesTarget: number;
};

export default function ShopProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [shopProfileData, setShopProfileData] = useState<ShopProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchShopProfile = async () => {
      if (!user?.username) return;
      
      try {
        const response = await fetch(`/api/shops/${user.username}`);
        if (response.ok) {
          const data = await response.json();
          // Map the API data to match the form fields
          setShopProfileData({
            ...data,
            contactPhone: "", // These fields aren't in the current API response
            tradeLicenseNumber: "",
            tinNumber: ""
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to fetch shop profile data",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error("Error fetching shop profile:", error);
        toast({
          title: "Error",
          description: "Failed to fetch shop profile data",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchShopProfile();
  }, [user?.username, toast]);

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopProfileData || !user?.username) return;

    setIsSaving(true);
    try {
      // Prepare data for update (only include fields that can be updated)
      const updateData: any = {
        name: shopProfileData.name,
        contactPerson: shopProfileData.contactPerson,
        city: shopProfileData.city,
        exactLocation: shopProfileData.exactLocation,
        monthlySalesTarget: shopProfileData.monthlySalesTarget
      };

      // Only include discount in update data if user is factory
      // This is an additional client-side protection
      if (user.role === 'factory') {
        updateData.discount = shopProfileData.discount;
      }

      const response = await fetch(`/api/shops?id=${shopProfileData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Shop profile updated successfully"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update shop profile",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error updating shop profile:", error);
      toast({
        title: "Error",
        description: "Failed to update shop profile",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">My Shop Profile</h1>
          <Button disabled>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Shop Details</CardTitle>
            <CardDescription>
              Loading shop information...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!shopProfileData) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold">My Shop Profile</h1>
        <Card>
          <CardHeader>
            <CardTitle>Shop Details</CardTitle>
            <CardDescription>
              Unable to load shop profile data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">No shop data available.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My Shop Profile</h1>
        <Button onClick={handleSaveChanges} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Shop Details</CardTitle>
          <CardDescription>
            Update your shop's information. Your username cannot be changed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-6" onSubmit={handleSaveChanges}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Column 1 */}
                <div className="space-y-4">
                     <div className="grid gap-2">
                        <Label htmlFor="username">Username</Label>
                        <Input 
                          id="username" 
                          value={shopProfileData.username} 
                          disabled 
                        />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="shop-name">Shop Name</Label>
                        <Input 
                          id="shop-name" 
                          value={shopProfileData.name} 
                          onChange={(e) => setShopProfileData({...shopProfileData, name: e.target.value})}
                        />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="contact-person">Contact Person</Label>
                        <Input 
                          id="contact-person" 
                          value={shopProfileData.contactPerson} 
                          onChange={(e) => setShopProfileData({...shopProfileData, contactPerson: e.target.value})}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="contact-phone">Contact Phone</Label>
                        <Input 
                          id="contact-phone" 
                          value={shopProfileData.contactPhone} 
                          onChange={(e) => setShopProfileData({...shopProfileData, contactPhone: e.target.value})}
                        />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="city">City</Label>
                        <Input 
                          id="city" 
                          value={shopProfileData.city} 
                          onChange={(e) => setShopProfileData({...shopProfileData, city: e.target.value})}
                        />
                    </div>
                </div>
                {/* Column 2 */}
                <div className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="exact-location">Exact Location</Label>
                        <Textarea 
                          id="exact-location" 
                          value={shopProfileData.exactLocation} 
                          onChange={(e) => setShopProfileData({...shopProfileData, exactLocation: e.target.value})}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="trade-license">Trade License Number</Label>
                        <Input 
                          id="trade-license" 
                          value={shopProfileData.tradeLicenseNumber} 
                          onChange={(e) => setShopProfileData({...shopProfileData, tradeLicenseNumber: e.target.value})}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="tin-number">TIN Number</Label>
                        <Input 
                          id="tin-number" 
                          value={shopProfileData.tinNumber} 
                          onChange={(e) => setShopProfileData({...shopProfileData, tinNumber: e.target.value})}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="discount">Discount (%)</Label>
                        <Input 
                          id="discount" 
                          type="number" 
                          value={shopProfileData.discount * 100} 
                          onChange={(e) => setShopProfileData({...shopProfileData, discount: parseFloat(e.target.value) / 100 || 0})}
                          disabled={user?.role !== 'factory'}
                        />
                        {user?.role !== 'factory' && (
                          <p className="text-xs text-muted-foreground">
                            Only factory users can edit discount percentage
                          </p>
                        )}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="monthly-target">Monthly Sales Target (ETB)</Label>
                        <Input 
                          id="monthly-target" 
                          type="number" 
                          value={shopProfileData.monthlySalesTarget} 
                          onChange={(e) => setShopProfileData({...shopProfileData, monthlySalesTarget: parseFloat(e.target.value) || 0})}
                        />
                    </div>
                </div>
            </div>

            <Separator className="my-4" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                     <h3 className="text-lg font-medium">Update Password</h3>
                     <div className="grid gap-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input id="new-password" type="password" />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <Input id="confirm-password" type="password" />
                    </div>
                </div>
                 <div className="space-y-4">
                     <h3 className="text-lg font-medium">Shop Pictures</h3>
                     <div className="grid gap-2">
                        <Label htmlFor="shop-pictures">Upload Images</Label>
                        <Input id="shop-pictures" type="file" multiple />
                         <p className="text-xs text-muted-foreground">You can upload multiple images for your shop.</p>
                    </div>
                </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}