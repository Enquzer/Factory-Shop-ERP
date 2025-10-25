"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from '@/contexts/auth-context';
import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function FactoryProfilePage() {
  const { user } = useAuth();
  const [profilePicture, setProfilePicture] = useState<string | null>(user?.profilePictureUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // In a real implementation, this data would be fetched from the database
  // based on the authenticated factory user
  const factoryProfileData = {
    name: "Carement",
    address: "123 Industrial Zone, Addis Ababa, Ethiopia",
    contactPerson: "Factory Manager",
    contactPhone: "+251 911 123 456",
  };

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

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      // First, upload the profile picture if a new one was selected
      if (selectedFile && user) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('userId', user.id.toString());
        
        const response = await fetch('/api/user-profile', {
          method: 'POST',
          body: formData,
        });
        
        const result = await response.json();
        
        if (result.success) {
          // Update the user in localStorage with the new profile picture
          const updatedUser = { ...user, profilePictureUrl: result.profilePictureUrl };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          setProfilePicture(result.profilePictureUrl);
          // Clear the file input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          setSelectedFile(null);
        } else {
          console.error('Failed to upload profile picture:', result.error);
          // Continue with other updates even if picture upload fails
        }
      }
      
      // Here you would save other factory details
      // For now, we'll just simulate a successful save
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert("Changes saved successfully!");
    } catch (error) {
      console.error('Error saving changes:', error);
      alert("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
       <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Factory Profile</h1>
        <Button onClick={handleSaveChanges} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
          <CardDescription>
            Upload a profile picture for your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profilePicture || undefined} />
              <AvatarFallback className="text-2xl">
                {user?.username?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="grid gap-2">
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
                className="w-fit"
              >
                Browse Files
              </Button>
              {selectedFile && (
                <div className="text-sm text-muted-foreground">
                  Selected: {selectedFile.name}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      <form onSubmit={handleSaveChanges}>
        <Card>
          <CardHeader>
            <CardTitle>Factory Details</CardTitle>
            <CardDescription>
              Manage your factory's information here.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid md:grid-cols-2 gap-6">
                  <div className="grid gap-2">
                      <Label htmlFor="factory-name">Factory Name</Label>
                      <Input id="factory-name" defaultValue={factoryProfileData.name} />
                  </div>
                  <div className="grid gap-2">
                      <Label htmlFor="contact-person">Contact Person</Label>
                      <Input id="contact-person" defaultValue={factoryProfileData.contactPerson} />
                  </div>
                  <div className="grid gap-2">
                      <Label htmlFor="contact-phone">Contact Phone</Label>
                      <Input id="contact-phone" defaultValue={factoryProfileData.contactPhone} />
                  </div>
                  <div className="grid gap-2">
                      <Label htmlFor="address">Address</Label>
                      <Textarea id="address" defaultValue={factoryProfileData.address} />
                  </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}