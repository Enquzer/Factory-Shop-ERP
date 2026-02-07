"use client";

import { useState, useEffect, useRef } from "react";
import { useSystemSettings } from "@/contexts/system-settings-context";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Upload, RotateCcw, Save, Palette, FileImage, LayoutTemplate, MousePointerClick, Bell, Globe } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export default function BrandingSettingsPage() {
  const { settings, updateSettings, isLoading } = useSystemSettings();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Local state for the form
  const [formData, setFormData] = useState({
    companyName: '',
    logo: null as string | null,
    primaryColor: '#054150',
    secondaryColor: '#C68f4f',
    buttonHoverColor: '#043542',
    buttonActiveColor: '#032a35',
    notificationColor: '#ef4444',
    ecommercePrimaryColor: '#054150',
    ecommerceSecondaryColor: '#C68f4f',
    borderRadius: '0.5rem',
  });

  const [hasChanges, setHasChanges] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state with settings when loaded
  useEffect(() => {
    if (settings && !isLoading) {
      setFormData({
        companyName: settings.companyName || '',
        logo: settings.logo,
        primaryColor: settings.primaryColor || '#054150',
        secondaryColor: settings.secondaryColor || '#C68f4f',
        buttonHoverColor: settings.buttonHoverColor || '#043542',
        buttonActiveColor: settings.buttonActiveColor || '#032a35',
        notificationColor: settings.notificationColor || '#ef4444',
        ecommercePrimaryColor: settings.ecommercePrimaryColor || '#054150',
        ecommerceSecondaryColor: settings.ecommerceSecondaryColor || '#C68f4f',
        borderRadius: settings.borderRadius || '0.5rem',
      });
    }
  }, [settings, isLoading]);

  // Track changes
  useEffect(() => {
    if (settings && !isLoading) {
      const isChanged = Object.keys(formData).some(key => {
         // @ts-ignore
         return formData[key] !== (settings[key] || formData[key]); 
      });
      // Simple check isn't enough because of defaults, but good enough for now or use JSON stringify
      const currentJson = JSON.stringify({
        companyName: settings.companyName || '',
        logo: settings.logo,
        primaryColor: settings.primaryColor || '#054150',
        secondaryColor: settings.secondaryColor || '#C68f4f',
        buttonHoverColor: settings.buttonHoverColor || '#043542', 
        buttonActiveColor: settings.buttonActiveColor || '#032a35',
        notificationColor: settings.notificationColor || '#ef4444', 
        ecommercePrimaryColor: settings.ecommercePrimaryColor || '#054150',
        ecommerceSecondaryColor: settings.ecommerceSecondaryColor || '#C68f4f',
        borderRadius: settings.borderRadius || '0.5rem',
      });
      const formJson = JSON.stringify(formData);
      setHasChanges(currentJson !== formJson);
    }
  }, [formData, settings, isLoading]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { 
        toast({ title: "File too large", description: "Image must be smaller than 2MB.", variant: "destructive" });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, logo: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      await updateSettings(formData);
      toast({ title: "Settings Saved", description: "Branding updated successfully." });
      setHasChanges(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    }
  };

  const handleReset = () => {
    if (settings) {
      setFormData({
        companyName: settings.companyName || '',
        logo: settings.logo,
        primaryColor: settings.primaryColor || '#054150',
        secondaryColor: settings.secondaryColor || '#C68f4f',
        buttonHoverColor: settings.buttonHoverColor || '#043542',
        buttonActiveColor: settings.buttonActiveColor || '#032a35',
        notificationColor: settings.notificationColor || '#ef4444',
        ecommercePrimaryColor: settings.ecommercePrimaryColor || '#054150',
        ecommerceSecondaryColor: settings.ecommerceSecondaryColor || '#C68f4f',
        borderRadius: settings.borderRadius || '0.5rem',
      });
      setHasChanges(false);
    }
  };

  if (isLoading) return <div className="p-8 flex justify-center text-muted-foreground">Loading settings...</div>;

  if (!user || (user.role !== 'factory' && user.role !== 'admin')) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
        <Button variant="outline" className="mt-4" onClick={() => window.history.back()}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Branding</h1>
          <p className="text-muted-foreground mt-1">Customize visual identity, colors, and components.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} disabled={!hasChanges}><RotateCcw className="mr-2 h-4 w-4" /> Reset</Button>
          <Button onClick={handleSave} disabled={!hasChanges}><Save className="mr-2 h-4 w-4" /> Save Changes</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          
          <Tabs defaultValue="identity" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="identity">Identity</TabsTrigger>
              <TabsTrigger value="colors">Colors</TabsTrigger>
              <TabsTrigger value="components">Components</TabsTrigger>
              <TabsTrigger value="public">Website</TabsTrigger>
            </TabsList>
            
            {/* IDENTITY TAB */}
            <TabsContent value="identity" className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><FileImage className="h-5 w-5" /> Logo & Identity</CardTitle>
                  <CardDescription>Main company identity.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName" value={formData.companyName}
                      onChange={(e) => setFormData(s => ({ ...s, companyName: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Company Logo</Label>
                    <div className="flex gap-4 items-center">
                      <div className="w-24 h-24 bg-muted/30 border-2 border-dashed rounded-lg flex items-center justify-center p-2">
                        {formData.logo ? <img src={formData.logo} className="w-full h-full object-contain" /> : <span className="text-xs text-muted-foreground">No Logo</span>}
                      </div>
                      <div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><Upload className="h-4 w-4 mr-2" /> Upload</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* COLORS TAB */}
            <TabsContent value="colors" className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" /> System Colors</CardTitle>
                  <CardDescription>Core colors for the ERP interface.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                     <ColorInput label="Primary Color" value={formData.primaryColor} onChange={(v) => setFormData(s => ({ ...s, primaryColor: v }))} desc="Main headers, sidebars." />
                     <ColorInput label="Secondary Color" value={formData.secondaryColor} onChange={(v) => setFormData(s => ({ ...s, secondaryColor: v }))} desc="Accents, badges." />
                     <ColorInput label="Notification Color" value={formData.notificationColor} onChange={(v) => setFormData(s => ({ ...s, notificationColor: v }))} desc="Alerts, badges, errors." />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* COMPONENTS TAB */}
            <TabsContent value="components" className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><MousePointerClick className="h-5 w-5" /> Interaction States</CardTitle>
                  <CardDescription>Customize how buttons and interactive elements feel.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <ColorInput label="Button Hover Color" value={formData.buttonHoverColor} onChange={(v) => setFormData(s => ({ ...s, buttonHoverColor: v }))} desc="Mouse over state." />
                    <ColorInput label="Button Active Color" value={formData.buttonActiveColor} onChange={(v) => setFormData(s => ({ ...s, buttonActiveColor: v }))} desc="Click/Pressed state." />
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <Label>Global Corner Radius</Label>
                    <Select value={formData.borderRadius} onValueChange={(v) => setFormData(s => ({ ...s, borderRadius: v }))}>
                      <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder="Select radius" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0px">Square (0px)</SelectItem>
                        <SelectItem value="0.25rem">Small (4px)</SelectItem>
                        <SelectItem value="0.5rem">Medium (8px - Default)</SelectItem>
                        <SelectItem value="0.75rem">Large (12px)</SelectItem>
                        <SelectItem value="1rem">Extra Large (16px)</SelectItem>
                        <SelectItem value="9999px">Pill (Full)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Affects buttons, cards, and inputs.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* PUBLIC WEBSITE TAB */}
            <TabsContent value="public" className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" /> Public Website & Ecommerce</CardTitle>
                  <CardDescription>Theme for the customer-facing shop.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                   <div className="grid sm:grid-cols-2 gap-6">
                     <ColorInput label="Website Primary" value={formData.ecommercePrimaryColor} onChange={(v) => setFormData(s => ({ ...s, ecommercePrimaryColor: v }))} desc="Main navigation, checkout buttons." />
                     <ColorInput label="Website Accent" value={formData.ecommerceSecondaryColor} onChange={(v) => setFormData(s => ({ ...s, ecommerceSecondaryColor: v }))} desc="Highlights, notices." />
                   </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* LIVE PREVIEW SECTION */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4">
             <h3 className="text-lg font-semibold flex items-center gap-2"><LayoutTemplate className="h-5 w-5" /> Live Preview</h3>
             
             {/* Component Playground */}
             <div className="border bg-background shadow-sm rounded-lg p-4 space-y-6">
                <div>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3">Button States</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <button className="px-4 py-2 text-white text-sm font-medium shadow transition-colors"
                        style={{ backgroundColor: formData.primaryColor, borderRadius: formData.borderRadius }}>
                        Default
                      </button>
                      <span className="text-xs text-muted-foreground">Natural</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button className="px-4 py-2 text-white text-sm font-medium shadow transition-colors"
                        style={{ backgroundColor: formData.buttonHoverColor, borderRadius: formData.borderRadius }}>
                        Hovered
                      </button>
                      <span className="text-xs text-muted-foreground">Mouse Over</span>
                    </div>
                    <div className="flex items-center gap-3">
                       <button className="px-4 py-2 text-white text-sm font-medium shadow transition-colors"
                        style={{ backgroundColor: formData.buttonActiveColor, borderRadius: formData.borderRadius }}>
                        Active
                      </button>
                      <span className="text-xs text-muted-foreground">Clicked</span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                   <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3">Notifications</h4>
                   <div className="flex items-center gap-4">
                     <div className="relative">
                       <Bell className="h-6 w-6 text-muted-foreground" />
                       <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] text-white"
                         style={{ backgroundColor: formData.notificationColor }}>
                         3
                       </span>
                     </div>
                     <span className="px-2 py-1 rounded text-xs text-white" style={{ backgroundColor: formData.notificationColor, borderRadius: formData.borderRadius }}>
                       New Order!
                     </span>
                   </div>
                </div>
                
                <Separator />

                <div>
                   <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3">Website Theme</h4>
                   <div className="border rounded overflow-hidden" style={{ borderRadius: formData.borderRadius }}>
                     <div className="h-8 w-full flex items-center px-3 justify-between" style={{ backgroundColor: formData.ecommercePrimaryColor }}>
                        <div className="h-2 w-12 bg-white/50 rounded"></div>
                        <div className="h-2 w-4 bg-white/50 rounded-full"></div>
                     </div>
                     <div className="p-3 bg-slate-50 space-y-2">
                       <div className="h-16 bg-white border rounded flex items-center justify-center" style={{ borderRadius: formData.borderRadius }}>
                          <span style={{ color: formData.ecommerceSecondaryColor }} className="text-xs font-bold">SALE</span>
                       </div>
                       <div className="h-6 w-full text-white text-[10px] flex items-center justify-center font-medium" 
                            style={{ backgroundColor: formData.ecommercePrimaryColor, borderRadius: formData.borderRadius }}>
                         Add to Cart
                       </div>
                     </div>
                   </div>
                </div>
             </div>
             
             <Alert className="bg-muted/50 text-xs">
                <AlertTitle>Note</AlertTitle>
                <AlertDescription>
                   Changes are applied globally. Interactive states (hover/active) use CSS variables to override default styles.
                </AlertDescription>
             </Alert>
          </div>
        </div>
      </div>
    </div>
  );
}

function ColorInput({ label, value, onChange, desc }: { label: string, value: string, onChange: (v: string) => void, desc?: string }) {
  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <div className="flex gap-3">
        <div className="relative">
          <Input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-12 h-12 p-1 cursor-pointer rounded-lg border-2" />
        </div>
        <div className="flex-1">
          <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono uppercase" maxLength={7} />
          {desc && <p className="text-xs text-muted-foreground mt-1.5">{desc}</p>}
        </div>
      </div>
    </div>
  );
}
