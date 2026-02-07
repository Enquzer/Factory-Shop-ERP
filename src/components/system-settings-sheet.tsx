
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Settings, Upload, RotateCcw, Save } from 'lucide-react';
import { useSystemSettings } from '@/contexts/system-settings-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';

export function SystemSettingsSheet() {
  const { settings, updateSettings, isLoading } = useSystemSettings();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  
  // Local state for the form
  const [formData, setFormData] = useState({
    companyName: '',
    primaryColor: '#054150',
    secondaryColor: '#C68f4f',
    logo: null as string | null
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state with settings when opened or settings loaded
  useEffect(() => {
    if (settings && !isLoading) {
      setFormData({
        companyName: settings.companyName || '',
        primaryColor: settings.primaryColor || '#054150',
        secondaryColor: settings.secondaryColor || '#C68f4f',
        logo: settings.logo
      });
    }
  }, [settings, isLoading, isOpen]);

  // Handle file upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      await updateSettings({
        companyName: formData.companyName,
        primaryColor: formData.primaryColor,
        secondaryColor: formData.secondaryColor,
        logo: formData.logo
      });
      
      toast({
        title: "Settings Saved",
        description: "System appearance has been updated successfully.",
      });
      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings.",
        variant: "destructive"
      });
    }
  };

  const handleReset = () => {
    setFormData({
      companyName: settings.companyName || '',
      primaryColor: settings.primaryColor || '#054150',
      secondaryColor: settings.secondaryColor || '#C68f4f',
      logo: settings.logo
    });
  };

  // Only allow factory or admin to see this
  if (!user || (user.role !== 'factory' && user.role !== 'admin')) {
    return null;
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Settings className="h-5 w-5" />
          <span className="sr-only">Open Settings</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>System Customization</SheetTitle>
          <SheetDescription>
            Customize the look and feel of the ERP system. Changes apply globally and to generated PDFs.
          </SheetDescription>
        </SheetHeader>
        
        <div className="grid gap-6 py-6">
          <div className="space-y-4">
            <h3 className="font-medium text-sm flex items-center text-muted-foreground">
              Branding
            </h3>
            
            <div className="grid gap-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => setFormData(s => ({ ...s, companyName: e.target.value }))}
                placeholder="Enter Company Name"
              />
            </div>

            <div className="grid gap-2">
              <Label>Company Logo</Label>
              <div className="flex items-center gap-4 border p-4 rounded-md border-dashed">
                <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center overflow-hidden border relative group">
                  {formData.logo ? (
                    <img src={formData.logo} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-xs text-muted-foreground">No Logo</span>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleLogoUpload}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Image
                  </Button>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Recommended: PNG with transparent background.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-medium text-sm flex items-center text-muted-foreground">
              Theme & Colors
            </h3>
            
            <div className="grid gap-2">
              <Label htmlFor="primaryColor">Primary Color (Buttons & Headers)</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData(s => ({ ...s, primaryColor: e.target.value }))}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={formData.primaryColor}
                  onChange={(e) => setFormData(s => ({ ...s, primaryColor: e.target.value }))}
                  className="flex-1 font-mono"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Main color for buttons, navigation, and major headers.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="secondaryColor">Secondary Color (Accents)</Label>
              <div className="flex gap-2">
                <Input
                  id="secondaryColor"
                  type="color"
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData(s => ({ ...s, secondaryColor: e.target.value }))}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData(s => ({ ...s, secondaryColor: e.target.value }))}
                  className="flex-1 font-mono"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                User for highlights, badges, and secondary actions.
              </p>
            </div>
          </div>
        </div>

        <SheetFooter className="flex-col sm:flex-row gap-2">
           <Button variant="outline" onClick={handleReset} className="sm:mr-auto">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <SheetClose asChild>
            <Button variant="ghost">Cancel</Button>
          </SheetClose>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
