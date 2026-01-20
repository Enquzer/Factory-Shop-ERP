"use client";

import { cn } from "@/lib/utils";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from '@/contexts/auth-context';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

export default function FactoryProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profilePicture, setProfilePicture] = useState<string | null>(user?.profilePictureUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    contactPerson: "",
    contactPhone: "",
    email: ""
  });

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/factory-profile');
      if (response.ok) {
        const data = await response.json();
        setFormData({
          name: data.name || "",
          address: data.address || "",
          contactPerson: data.contactPerson || "",
          contactPhone: data.contactPhone || "",
          email: data.email || ""
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfilePicture(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
      setProfilePicture(user?.profilePictureUrl || null);
    }
  };

  const handleBrowseFiles = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    // Map element ID to state key
    const keyMap: Record<string, string> = {
      'factory-name': 'name',
      'contact-person': 'contactPerson',
      'contact-phone': 'contactPhone',
      'address': 'address',
      'email': 'email'
    };
    const key = keyMap[id];
    if (key) {
      setFormData(prev => ({ ...prev, [key]: value }));
    }
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    
    try {
      // Get auth token
      const token = localStorage.getItem('authToken');

      // 1. Upload profile picture if needed
      if (selectedFile && user) {
        const picFormData = new FormData();
        picFormData.append('file', selectedFile);
        picFormData.append('userId', user.id.toString());
        
        const picResponse = await fetch('/api/user-profile', {
          method: 'POST',
          body: picFormData,
        });
        
        if (picResponse.ok) {
          const result = await picResponse.json();
          // Update the user in localStorage with the new profile picture
          const updatedUser = { ...user, profilePictureUrl: result.profilePictureUrl };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          setProfilePicture(result.profilePictureUrl);
          if (fileInputRef.current) fileInputRef.current.value = '';
          setSelectedFile(null);
        }
      }
      
      // 2. Save factory details
      const response = await fetch('/api/factory-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData),
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Factory profile updated successfully!",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save profile");
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save changes",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading profile...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            {user?.role === 'quality_inspection' ? 'Quality Profile' : 
             user?.role === 'factory' ? 'Factory Profile' : 
             `${user?.role?.replace('_', ' ').toUpperCase()} Profile`}
          </h1>
          <p className="text-muted-foreground text-sm">Manage your personal account and view organization details.</p>
        </div>
        <Button onClick={handleSaveChanges} disabled={isSaving} className="shadow-lg">
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 border-none shadow-md bg-gradient-to-br from-white to-gray-50/50">
          <CardHeader>
            <CardTitle className="text-lg">Account Profile</CardTitle>
            <CardDescription>Your personal account details.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            <Avatar className="h-28 w-28 border-4 border-white shadow-xl">
              <AvatarImage src={profilePicture || undefined} />
              <AvatarFallback className="text-3xl bg-blue-100 text-blue-700">
                {user?.username?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-xl">{user?.username}</h3>
              <Badge variant="secondary" className="capitalize px-3 py-0.5">
                {user?.role?.replace('_', ' ')}
              </Badge>
            </div>
            <div className="w-full grid gap-2">
              <Input
                type="file"
                ref={fileInputRef}
                onChange={handleProfilePictureChange}
                accept="image/*"
                className="hidden"
              />
              <Button 
                onClick={handleBrowseFiles}
                variant="outline"
                className="w-full"
              >
                Change Photo
              </Button>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSaveChanges} className="md:col-span-2">
          <Card className="border-none shadow-md">
            <CardHeader className="border-b bg-gray-50/30">
              <CardTitle className="text-lg">Organization Details</CardTitle>
              <CardDescription>
                Primary contact information for the factory.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="grid gap-2">
                        <Label htmlFor="factory-name" className="text-xs font-bold uppercase text-muted-foreground">Factory Name</Label>
                        <Input 
                          id="factory-name" 
                          value={formData.name} 
                          readOnly={user?.role !== 'factory' && user?.role !== 'planning'}
                          className={cn(user?.role !== 'factory' && user?.role !== 'planning' && "bg-gray-50")}
                          onChange={handleInputChange}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="contact-person" className="text-xs font-bold uppercase text-muted-foreground">Primary Contact</Label>
                        <Input 
                          id="contact-person" 
                          value={formData.contactPerson} 
                          readOnly={user?.role !== 'factory' && user?.role !== 'planning'}
                          className={cn(user?.role !== 'factory' && user?.role !== 'planning' && "bg-gray-50")}
                          onChange={handleInputChange}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="contact-phone" className="text-xs font-bold uppercase text-muted-foreground">Phone Number</Label>
                        <Input 
                          id="contact-phone" 
                          value={formData.contactPhone} 
                          readOnly={user?.role !== 'factory' && user?.role !== 'planning'}
                          className={cn(user?.role !== 'factory' && user?.role !== 'planning' && "bg-gray-50")}
                          onChange={handleInputChange}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="email" className="text-xs font-bold uppercase text-muted-foreground">Email Address</Label>
                        <Input 
                          id="email" 
                          value={formData.email} 
                          readOnly={user?.role !== 'factory' && user?.role !== 'planning'}
                          className={cn(user?.role !== 'factory' && user?.role !== 'planning' && "bg-gray-50")}
                          onChange={handleInputChange}
                        />
                    </div>
                    <div className="grid gap-2 sm:col-span-2">
                        <Label htmlFor="address" className="text-xs font-bold uppercase text-muted-foreground">Location / Address</Label>
                        <Textarea 
                          id="address" 
                          value={formData.address} 
                          readOnly={user?.role !== 'factory' && user?.role !== 'planning'}
                          className={cn(user?.role !== 'factory' && user?.role !== 'planning' && "bg-gray-50")}
                          onChange={handleInputChange}
                        />
                    </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  )
}