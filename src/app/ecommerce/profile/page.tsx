"use client";

import { useState, useEffect } from "react";
import { useCustomerAuth } from "@/contexts/customer-auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/logo";
import { ShoppingCart, LogOut, User as UserIcon, MapPin, Phone, Mail, Save, Loader2, Link as LinKIcon } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/hooks/use-cart";
import { useRouter } from "next/navigation";
import { EcommerceHeader } from "@/components/ecommerce-header";
import { EcommerceFooter } from "@/components/ecommerce-footer";

export default function ProfilePage() {
  const { user, login, logout, refreshUser } = useCustomerAuth();
  const { itemCount } = useCart();
  const { toast } = useToast();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    city: "Addis Ababa",
    deliveryAddress: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        email: user.email,
        city: user.city,
        deliveryAddress: user.deliveryAddress
      }));
    } else {
        // Redirect if not logged in
        // router.push('/ecommerce/login');
    }
  }, [user, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/customers/${user.username}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('customerAuthToken')}`
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          city: formData.city,
          deliveryAddress: formData.deliveryAddress,
          email: formData.email
        })
      });

      if (response.ok) {
        toast({
          title: "Profile Updated",
          description: "Your information has been saved successfully.",
          className: "bg-green-600 text-white"
        });
        // Re-login to update context
        await refreshUser();
      } else {
        const error = await response.json();
        toast({
          title: "Update Failed",
          description: error.error || "Could not update profile.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <h2 className="text-2xl font-bold mb-4">Please Log In</h2>
                <Link href="/ecommerce/login">
                    <Button className="bg-orange-500 hover:bg-orange-600 text-white">Login Now</Button>
                </Link>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <EcommerceHeader />

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
                    <p className="text-gray-600">Manage your personal information and delivery details</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Sidebar / Info Card */}
                <div className="space-y-6">
                    <Card>
                        <CardContent className="pt-6 flex flex-col items-center">
                            <div className="h-24 w-24 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                                <span className="text-3xl font-bold text-orange-600">
                                    {(user.firstName?.[0] || user.username?.[0] || '?').toUpperCase()}
                                    {(user.lastName?.[0] || '').toUpperCase()}
                                </span>
                            </div>
                            <h2 className="text-xl font-bold text-center">{user.firstName} {user.lastName}</h2>
                            <p className="text-sm text-gray-500 text-center mb-4">@{user.username}</p>
                            
                            <div className="w-full space-y-4 pt-4 border-t border-gray-100">
                                <Link href="/ecommerce/orders" className="flex items-center text-gray-700 hover:text-orange-600 px-2 py-1 rounded hover:bg-orange-50 transition-colors">
                                    <Package className="h-4 w-4 mr-3" />
                                    My Orders
                                </Link>
                                <div className="flex items-center text-orange-600 bg-orange-50 px-2 py-1 rounded font-medium">
                                    <UserIcon className="h-4 w-4 mr-3" />
                                    Profile Settings
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card className="bg-blue-50 border-blue-100">
                        <CardHeader>
                            <CardTitle className="text-blue-800 text-sm flex items-center">
                                <LinKIcon className="h-4 w-4 mr-2" />
                                Account Security
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-blue-600 mb-4">
                                To change your password, please contact our support team or use the "Forgot Password" link on the login page.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Form */}
                <div className="md:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Personal Information</CardTitle>
                            <CardDescription>Update your contact details and default delivery address.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleUpdateProfile} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="firstName">First Name</Label>
                                        <Input 
                                            id="firstName" 
                                            name="firstName" 
                                            value={formData.firstName} 
                                            onChange={handleChange} 
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="lastName">Last Name</Label>
                                        <Input 
                                            id="lastName" 
                                            name="lastName" 
                                            value={formData.lastName} 
                                            onChange={handleChange} 
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email Address</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <Input 
                                                id="email" 
                                                name="email" 
                                                value={formData.email} 
                                                className="pl-9 bg-gray-50" 
                                                disabled 
                                                title="Email cannot be changed"
                                            />
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">Email cannot be changed.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone Number</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <Input 
                                                id="phone" 
                                                name="phone" 
                                                value={formData.phone} 
                                                onChange={handleChange} 
                                                className="pl-9"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-base font-semibold">Delivery Address</Label>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="city" className="text-xs">City</Label>
                                            <Input 
                                                id="city" 
                                                name="city" 
                                                value={formData.city} 
                                                onChange={handleChange} 
                                            />
                                        </div>
                                        <div className="md:col-span-2 space-y-2">
                                            <Label htmlFor="deliveryAddress" className="text-xs">Street / Location / Landmark</Label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <Input 
                                                    id="deliveryAddress" 
                                                    name="deliveryAddress" 
                                                    value={formData.deliveryAddress} 
                                                    onChange={handleChange} 
                                                    className="pl-9"
                                                    placeholder="e.g. Bole, near Edna Mall"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <Button 
                                        type="submit" 
                                        className="bg-orange-600 hover:bg-orange-700 text-white min-w-[150px]"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="mr-2 h-4 w-4" />
                                                Save Changes
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
      </main>
      <EcommerceFooter />
    </div>
  );
}

function Package(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  )
}
