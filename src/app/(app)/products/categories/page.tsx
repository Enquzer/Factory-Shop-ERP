
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, Loader2, Save, X } from "lucide-react";

interface Category {
  id: number;
  name: string;
  code: string;
}

export default function CategoryManagementPage() {
  const { toast } = useToast();
  const [mainCategories, setMainCategories] = useState<Category[]>([]);
  const [productCategories, setProductCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [newMain, setNewMain] = useState({ name: '', code: '' });
  const [newProduct, setNewProduct] = useState({ name: '', code: '' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState({ name: '', code: '' });
  const [editingType, setEditingType] = useState<'main' | 'product' | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const [mainRes, productRes] = await Promise.all([
        fetch('/api/categories/main'),
        fetch('/api/categories/product')
      ]);
      const mainData = await mainRes.json();
      const productData = await productRes.json();
      setMainCategories(mainData);
      setProductCategories(productData);
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch categories", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMain = async () => {
    if (!newMain.name || !newMain.code) return;
    try {
      const res = await fetch('/api/categories/main', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMain)
      });
      if (res.ok) {
        setNewMain({ name: '', code: '' });
        fetchCategories();
        toast({ title: "Success", description: "Main category added" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to add category", variant: "destructive" });
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.code) return;
    try {
      const res = await fetch('/api/categories/product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct)
      });
      if (res.ok) {
        setNewProduct({ name: '', code: '' });
        fetchCategories();
        toast({ title: "Success", description: "Product category added" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to add category", variant: "destructive" });
    }
  };

  const handleDelete = async (type: 'main' | 'product', id: number) => {
    try {
      const res = await fetch(`/api/categories/${type}?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchCategories();
        toast({ title: "Deleted", description: "Category removed" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  const startEdit = (type: 'main' | 'product', cat: Category) => {
    setEditingType(type);
    setEditingId(cat.id);
    setEditData({ name: cat.name, code: cat.code });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingType(null);
    setEditData({ name: '', code: '' });
  };

  const handleUpdate = async () => {
    if (!editingId || !editingType) return;
    try {
      const res = await fetch(`/api/categories/${editingType}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, ...editData })
      });
      if (res.ok) {
        cancelEdit();
        fetchCategories();
        toast({ title: "Updated", description: "Category updated successfully" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update category", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Category Management</h1>
        <p className="text-muted-foreground text-lg">Define Main and Product categories for automatic code generation.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Main Categories Section */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Main Categories</CardTitle>
            <CardDescription>Target audience codes (e.g., Men &rarr; CM, Ladies &rarr; CL)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-4 items-end bg-muted/30 p-4 rounded-xl">
              <div className="grid gap-2 flex-1">
                <Label>Category Name</Label>
                <Input 
                  placeholder="e.g. Men" 
                  value={newMain.name}
                  onChange={(e) => setNewMain({ ...newMain, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2 w-24">
                <Label>Code</Label>
                <Input 
                  placeholder="CM" 
                  maxLength={2} 
                  value={newMain.code}
                  onChange={(e) => setNewMain({ ...newMain, code: e.target.value.toUpperCase() })}
                />
              </div>
              <Button onClick={handleAddMain} className="h-10">
                <Plus className="h-4 w-4 mr-2" /> Add
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mainCategories.map(cat => (
                  <TableRow key={cat.id}>
                    {editingId === cat.id && editingType === 'main' ? (
                      <>
                        <TableCell>
                          <Input value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} />
                        </TableCell>
                        <TableCell>
                          <Input value={editData.code} maxLength={2} className="w-16" onChange={e => setEditData({...editData, code: e.target.value.toUpperCase()})} />
                        </TableCell>
                        <TableCell className="text-right flex gap-1 justify-end">
                          <Button size="icon" variant="ghost" onClick={handleUpdate} className="text-green-600"><Save className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={cancelEdit} className="text-red-600"><X className="h-4 w-4" /></Button>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="font-medium">{cat.name}</TableCell>
                        <TableCell><span className="bg-primary/10 text-primary px-2 py-1 rounded font-mono text-sm">{cat.code}</span></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => startEdit('main', cat)}><Edit2 className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete('main', cat.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Product Categories Section */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Product Categories</CardTitle>
            <CardDescription>Product type codes (e.g. Dress &rarr; DR, Tops &rarr; TP)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-4 items-end bg-muted/30 p-4 rounded-xl">
              <div className="grid gap-2 flex-1">
                <Label>Category Name</Label>
                <Input 
                  placeholder="e.g. Dress" 
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2 w-24">
                <Label>Code</Label>
                <Input 
                  placeholder="DR" 
                  maxLength={2} 
                  value={newProduct.code}
                  onChange={(e) => setNewProduct({ ...newProduct, code: e.target.value.toUpperCase() })}
                />
              </div>
              <Button onClick={handleAddProduct} className="h-10">
                <Plus className="h-4 w-4 mr-2" /> Add
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productCategories.map(cat => (
                  <TableRow key={cat.id}>
                    {editingId === cat.id && editingType === 'product' ? (
                      <>
                        <TableCell>
                          <Input value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} />
                        </TableCell>
                        <TableCell>
                          <Input value={editData.code} maxLength={2} className="w-16" onChange={e => setEditData({...editData, code: e.target.value.toUpperCase()})} />
                        </TableCell>
                        <TableCell className="text-right flex gap-1 justify-end">
                          <Button size="icon" variant="ghost" onClick={handleUpdate} className="text-green-600"><Save className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={cancelEdit} className="text-red-600"><X className="h-4 w-4" /></Button>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="font-medium">{cat.name}</TableCell>
                        <TableCell><span className="bg-secondary/50 text-secondary-foreground px-2 py-1 rounded font-mono text-sm">{cat.code}</span></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => startEdit('product', cat)}><Edit2 className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete('product', cat.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
