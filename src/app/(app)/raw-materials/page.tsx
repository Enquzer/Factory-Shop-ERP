"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, Loader2, Save, X, Search, Filter, Layers, Beaker, Scissors, ShoppingCart, HelpCircle, Upload, Image as ImageIcon, CirclePlus } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

// Actually checking the previous file content for correct imports
import { MarketingOrder } from '@/lib/marketing-orders';
import { getRawMaterialSubcategoriesByCategory } from '@/lib/raw-material-subcategories';

interface RawMaterial {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  unitOfMeasure: string;
  currentBalance: number;
  minimumStockLevel: number;
  costPerUnit: number;
  supplier?: string;
  source?: 'PURCHASED' | 'MANUAL' | 'OTHER';
  purchaseRequestId?: string;
  imageUrl?: string;
  updatedAt?: string;
}

export default function RawMaterialsPage() {
  const { toast } = useToast();
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubcategoryDialogOpen, setIsSubcategoryDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    category: 'Fabric',
    subcategory: '',
    unitOfMeasure: 'Meter',
    currentBalance: 0,
    minimumStockLevel: 10,
    costPerUnit: 0,
    supplier: '',
    imageUrl: ''
  });
  
  const [predictedId, setPredictedId] = useState('');
  
  const [newSubcategoryData, setNewSubcategoryData] = useState({
    subcategory: '',
    code: ''
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [availableSubcategories, setAvailableSubcategories] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchMaterials();
    fetchSubcategories();
  }, []);

  useEffect(() => {
    // Fetch subcategories when category changes
    if (formData.category) {
      fetchSubcategoriesForCategory(formData.category);
    }
  }, [formData.category]);

  useEffect(() => {
    // Predict ID when category/subcategory changes
    if (formData.category && formData.subcategory) {
      predictNextId();
    } else {
      setPredictedId('');
    }
  }, [formData.category, formData.subcategory]);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/raw-materials');
      const data = await res.json();
      // Sort by ID to show newest first (assuming IDs have timestamps)
      const sortedMaterials = Array.isArray(data) ? [...data].sort((a, b) => {
        // Sort by ID descending (newest first)
        return b.id.localeCompare(a.id);
      }) : [];
      setMaterials(sortedMaterials);
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch materials", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchSubcategories = async () => {
    try {
      const res = await fetch('/api/raw-material-subcategories');
      const data = await res.json();
      setSubcategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch subcategories:', error);
    }
  };

  const fetchSubcategoriesForCategory = async (category: string) => {
    try {
      const res = await fetch(`/api/raw-material-subcategories?category=${encodeURIComponent(category)}`);
      const data = await res.json();
      setAvailableSubcategories(Array.isArray(data) ? data : []);
      // Clear subcategory selection if it's not valid for this category
      if (formData.subcategory && !data.some((s: any) => s.subcategory === formData.subcategory)) {
        setFormData(prev => ({ ...prev, subcategory: '' }));
      }
    } catch (error) {
      console.error('Failed to fetch subcategories for category:', error);
    }
  };

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = '/api/raw-materials';
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId ? { ...formData, id: editingId } : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        toast({ title: "Success", description: `Raw material ${editingId ? 'updated' : 'registered'} successfully` });
        setIsAddDialogOpen(false);
        resetForm();
        fetchMaterials();
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to save material", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'Fabric',
      subcategory: '',
      unitOfMeasure: 'Meter',
      currentBalance: 0,
      minimumStockLevel: 10,
      costPerUnit: 0,
      supplier: '',
      imageUrl: ''
    });
    setImagePreview(null);
    setEditingId(null);
    setAvailableSubcategories([]);
    resetSubcategoryForm();
    setPredictedId('');
  };

  const handleEdit = (material: RawMaterial) => {
    setFormData({
      name: material.name,
      category: material.category,
      subcategory: material.subcategory || '',
      unitOfMeasure: material.unitOfMeasure,
      currentBalance: material.currentBalance,
      minimumStockLevel: material.minimumStockLevel,
      costPerUnit: material.costPerUnit,
      supplier: material.supplier || '',
      imageUrl: material.imageUrl || ''
    });
    setImagePreview(material.imageUrl || null);
    setEditingId(material.id);
    // Load subcategories for this category
    fetchSubcategoriesForCategory(material.category);
    setIsAddDialogOpen(true);
    resetSubcategoryForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this material?')) return;
    
    try {
      const res = await fetch(`/api/raw-materials?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: "Success", description: "Material deleted successfully" });
        fetchMaterials();
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete material", variant: "destructive" });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: "Error", description: "Please select an image file", variant: "destructive" });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Error", description: "Image size must be less than 5MB", variant: "destructive" });
      return;
    }

    setIsImageUploading(true);
    
    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = event.target?.result as string;
        setFormData({...formData, imageUrl: base64String});
        setImagePreview(base64String);
        setIsImageUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast({ title: "Error", description: "Failed to upload image", variant: "destructive" });
      setIsImageUploading(false);
    }
  };

  const removeImage = () => {
    setFormData({...formData, imageUrl: ''});
    setImagePreview(null);
  };

  const handleAddSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newSubcategoryData.subcategory.trim() || !newSubcategoryData.code.trim()) {
      toast({ title: "Error", description: "Please fill in both subcategory name and code", variant: "destructive" });
      return;
    }
    
    try {
      const res = await fetch('/api/raw-material-subcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: formData.category,
          subcategory: newSubcategoryData.subcategory.trim(),
          code: newSubcategoryData.code.trim().toUpperCase()
        })
      });
      
      if (res.ok) {
        toast({ title: "Success", description: "Subcategory added successfully" });
        // Refresh subcategories
        fetchSubcategories();
        fetchSubcategoriesForCategory(formData.category);
        // Set the newly created subcategory as selected
        setFormData({...formData, subcategory: newSubcategoryData.subcategory.trim()});
        setNewSubcategoryData({ subcategory: '', code: '' });
        setIsSubcategoryDialogOpen(false);
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to add subcategory');
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to add subcategory", variant: "destructive" });
    }
  };

  const resetSubcategoryForm = () => {
    setNewSubcategoryData({ subcategory: '', code: '' });
  };

  const predictNextId = async () => {
    if (!formData.category || !formData.subcategory) return;
    
    try {
      const res = await fetch(`/api/raw-materials/next-id?category=${encodeURIComponent(formData.category)}&subcategory=${encodeURIComponent(formData.subcategory)}`);
      if (res.ok) {
        const data = await res.json();
        setPredictedId(data.nextId);
      }
    } catch (error) {
      console.error('Error predicting ID:', error);
      // Fallback to manual format
      const catCode = formData.category.substring(0, 2).toUpperCase();
      const subCode = formData.subcategory.substring(0, 2).toUpperCase();
      setPredictedId(`RW-${catCode}-${subCode}-XX`);
    }
  };

  const filteredMaterials = (materials || []).filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.supplier?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Fabric': return <Layers className="h-4 w-4" />;
      case 'Trims': return <Scissors className="h-4 w-4" />;
      case 'Accessories': return <Beaker className="h-4 w-4" />;
      default: return <Plus className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">
            Raw Material Registry
          </h1>
          <p className="text-muted-foreground text-lg">Manage fabric, trims, and production accessories inventory.</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-teal-600 hover:bg-teal-700 shadow-lg transition-all transform hover:scale-105" onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" /> Register New Material
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSaveMaterial}>
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Raw Material' : 'Register Raw Material'}</DialogTitle>
                <DialogDescription>
                  {editingId ? (
                    <>
                      Update the details of this raw material.
                      <span className="mt-2 text-sm text-muted-foreground font-mono block">
                        Material ID: <span className="font-semibold">{editingId}</span>
                      </span>
                    </>
                  ) : (
                    <>
                      Add a new item to the factory's raw material inventory.
                      {predictedId && (
                        <span className="mt-2 text-sm text-muted-foreground block">
                          <span className="font-mono">Predicted ID: <span className="font-semibold text-teal-600">{predictedId}</span></span>
                          <span className="text-xs mt-1 block">
                            Auto-generated based on category and subcategory selection
                          </span>
                        </span>
                      )}
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Material Name</Label>
                  <Input id="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. 100% Cotton Canvas" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Category</Label>
                    <Select value={formData.category} onValueChange={v => setFormData({...formData, category: v, subcategory: ''})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Fabric">Fabric</SelectItem>
                        <SelectItem value="Trims">Trims</SelectItem>
                        <SelectItem value="Accessories">Accessories</SelectItem>
                        <SelectItem value="Thread">Thread</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label>Subcategory (Optional)</Label>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 px-2 text-xs"
                        onClick={() => setIsSubcategoryDialogOpen(true)}
                      >
                        <CirclePlus className="h-3 w-3 mr-1" />
                        Add New
                      </Button>
                    </div>
                    <Select value={formData.subcategory || "__none__"} onValueChange={v => setFormData({...formData, subcategory: v === "__none__" ? "" : v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select subcategory" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {availableSubcategories.map((sub: any) => (
                          <SelectItem key={sub.id} value={sub.subcategory}>
                            {sub.subcategory}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Unit of Measure</Label>
                    <Select value={formData.unitOfMeasure} onValueChange={v => setFormData({...formData, unitOfMeasure: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Meter">Meter</SelectItem>
                        <SelectItem value="Yard">Yard</SelectItem>
                        <SelectItem value="Kg">Kg</SelectItem>
                        <SelectItem value="Piece">Piece</SelectItem>
                        <SelectItem value="Roll">Roll</SelectItem>
                        <SelectItem value="Cone">Cone</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="balance">Initial Balance</Label>
                    <Input id="balance" type="number" value={formData.currentBalance || 0} onChange={e => setFormData({...formData, currentBalance: parseFloat(e.target.value) || 0})} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="minLevel">Min Stock Level</Label>
                    <Input id="minLevel" type="number" value={formData.minimumStockLevel || 0} onChange={e => setFormData({...formData, minimumStockLevel: parseFloat(e.target.value) || 0})} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="cost">Cost per Unit (ETB)</Label>
                    <Input id="cost" type="number" value={formData.costPerUnit || 0} onChange={e => setFormData({...formData, costPerUnit: parseFloat(e.target.value) || 0})} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="supplier">Supplier (Optional)</Label>
                    <Input id="supplier" value={formData.supplier} onChange={e => setFormData({...formData, supplier: e.target.value})} placeholder="Supplier name" />
                  </div>
                </div>
                
                {/* Image Upload Section */}
                <div className="grid gap-2">
                  <Label>Material Image (Optional)</Label>
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-teal-400 transition-colors">
                        <Input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleImageUpload} 
                          className="hidden" 
                          id="image-upload" 
                          disabled={isImageUploading}
                        />
                        <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center gap-2">
                          {isImageUploading ? (
                            <>
                              <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                              <span className="text-sm text-gray-500">Uploading...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="h-6 w-6 text-gray-400" />
                              <span className="text-sm text-gray-500">Click to upload image</span>
                              <span className="text-xs text-gray-400">PNG, JPG, GIF up to 5MB</span>
                            </>
                          )}
                        </label>
                      </div>
                    </div>
                    
                    {imagePreview && (
                      <div className="relative">
                        <div className="w-24 h-24 rounded-lg overflow-hidden border border-gray-200">
                          <img 
                            src={imagePreview} 
                            alt="Preview" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <Button 
                          type="button"
                          size="icon" 
                          variant="destructive" 
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                          onClick={removeImage}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  {editingId ? 'Update Material' : 'Save Material'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        
        {/* Add Subcategory Dialog */}
        <Dialog open={isSubcategoryDialogOpen} onOpenChange={(open) => {
          setIsSubcategoryDialogOpen(open);
          if (!open) resetSubcategoryForm();
        }}>
          <DialogContent className="sm:max-w-[400px]">
            <form onSubmit={handleAddSubcategory}>
              <DialogHeader>
                <DialogTitle>Add New Subcategory</DialogTitle>
                <DialogDescription>
                  Add a new subcategory for {formData.category} category
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="new-subcategory">Subcategory Name</Label>
                  <Input 
                    id="new-subcategory" 
                    value={newSubcategoryData.subcategory} 
                    onChange={e => setNewSubcategoryData({...newSubcategoryData, subcategory: e.target.value})} 
                    placeholder="e.g. Buttons, Zippers, etc." 
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-code">Code (2 letters)</Label>
                  <Input 
                    id="new-code" 
                    value={newSubcategoryData.code} 
                    onChange={e => setNewSubcategoryData({...newSubcategoryData, code: e.target.value})} 
                    placeholder="e.g. BT, ZP" 
                    maxLength={2}
                    required 
                  />
                  <p className="text-xs text-muted-foreground">This will be used in material ID generation (e.g., RW-Tr-BT-01)</p>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsSubcategoryDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Subcategory
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-xl bg-white/50 backdrop-blur-sm border-teal-100">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <CardTitle className="text-xl flex items-center gap-2">
              <Layers className="h-5 w-5 text-teal-600" />
              Inventory List
            </CardTitle>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search materials..." 
                className="pl-9 h-9" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-teal-50/50">
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Subcategory</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Stock Level</TableHead>
                  <TableHead>Cost/Unit</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaterials.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      No raw materials found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMaterials.map(material => (
                    <TableRow key={material.id} className="hover:bg-teal-50/20 transition-colors">
                      <TableCell>
                        {material.imageUrl ? (
                          <div className="relative w-12 h-12 rounded-md overflow-hidden border">
                            <Image 
                              src={material.imageUrl} 
                              alt={material.name} 
                              width={48}
                              height={48}
                              className="object-cover w-full h-full"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-md bg-gray-100 flex items-center justify-center border">
                            <ImageIcon className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-slate-800">{material.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">ID: {material.id}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-teal-100 text-teal-800 border-none flex w-fit items-center gap-1.5 px-2 py-1">
                          {getCategoryIcon(material.category)}
                          {material.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {material.subcategory ? (
                          <Badge variant="outline" className="text-xs">
                            {material.subcategory}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {material.source === 'PURCHASED' && (
                            <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">
                              <ShoppingCart className="h-3 w-3 mr-1" />
                              Purchased
                            </Badge>
                          )}
                          {material.source === 'MANUAL' && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              <Plus className="h-3 w-3 mr-1" />
                              Manual
                            </Badge>
                          )}
                          {(!material.source || material.source === 'OTHER') && (
                            <Badge variant="outline" className="text-gray-600">
                              <HelpCircle className="h-3 w-3 mr-1" />
                              Other
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`text-sm font-semibold flex items-center gap-2 ${material.currentBalance < material.minimumStockLevel ? 'text-red-600' : 'text-slate-700'}`}>
                          {material.currentBalance} {material.unitOfMeasure}
                          {material.currentBalance < material.minimumStockLevel && (
                            <Badge variant="destructive" className="h-4 px-1 text-[10px] animate-pulse">LOW</Badge>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground">Min Level: {material.minimumStockLevel}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{material.costPerUnit.toLocaleString()} ETB</TableCell>
                      <TableCell className="text-sm">{material.supplier || '-'}</TableCell>
                      <TableCell className="text-right">
                         <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => handleEdit(material)} className="h-8 w-8 hover:text-teal-600"><Edit2 className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDelete(material.id)} className="h-8 w-8 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
                         </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}