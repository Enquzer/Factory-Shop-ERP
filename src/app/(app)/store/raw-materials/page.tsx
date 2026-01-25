
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, Loader2, Save, X, Search, Filter, Layers, Beaker, Scissors } from "lucide-react";
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

interface RawMaterial {
  id: string;
  name: string;
  category: string;
  unitOfMeasure: string;
  currentBalance: number;
  minimumStockLevel: number;
  costPerUnit: number;
  supplier?: string;
  updatedAt?: string;
}

export default function RawMaterialsPage() {
  const { toast } = useToast();
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    category: 'Fabric',
    unitOfMeasure: 'Meter',
    currentBalance: 0,
    minimumStockLevel: 10,
    costPerUnit: 0,
    supplier: ''
  });

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/raw-materials');
      const data = await res.json();
      setMaterials(Array.isArray(data) ? data : []);
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch materials", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/raw-materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        toast({ title: "Success", description: "Raw material registered successfully" });
        setIsAddDialogOpen(false);
        setFormData({
          name: '',
          category: 'Fabric',
          unitOfMeasure: 'Meter',
          currentBalance: 0,
          minimumStockLevel: 10,
          costPerUnit: 0,
          supplier: ''
        });
        fetchMaterials();
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to register material", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
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
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-teal-600 hover:bg-teal-700 shadow-lg transition-all transform hover:scale-105">
              <Plus className="mr-2 h-4 w-4" /> Register New Material
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleAddMaterial}>
              <DialogHeader>
                <DialogTitle>Register Raw Material</DialogTitle>
                <DialogDescription>Add a new item to the factory's raw material inventory.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Material Name</Label>
                  <Input id="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. 100% Cotton Canvas" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Category</Label>
                    <Select value={formData.category} onValueChange={v => setFormData({...formData, category: v})}>
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
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="balance">Initial Balance</Label>
                    <Input id="balance" type="number" value={formData.currentBalance} onChange={e => setFormData({...formData, currentBalance: parseFloat(e.target.value)})} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="minLevel">Min Stock Level</Label>
                    <Input id="minLevel" type="number" value={formData.minimumStockLevel} onChange={e => setFormData({...formData, minimumStockLevel: parseFloat(e.target.value)})} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="cost">Cost per Unit (ETB)</Label>
                    <Input id="cost" type="number" value={formData.costPerUnit} onChange={e => setFormData({...formData, costPerUnit: parseFloat(e.target.value)})} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="supplier">Supplier (Optional)</Label>
                    <Input id="supplier" value={formData.supplier} onChange={e => setFormData({...formData, supplier: e.target.value})} placeholder="Supplier name" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Material
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
                  <TableHead>Material</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Stock Level</TableHead>
                  <TableHead>Cost/Unit</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaterials.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      No raw materials found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMaterials.map(material => (
                    <TableRow key={material.id} className="hover:bg-teal-50/20 transition-colors">
                      <TableCell>
                        <div className="font-bold text-slate-800">{material.name}</div>
                        <div className="text-xs text-muted-foreground">ID: {material.id}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-teal-100 text-teal-800 border-none flex w-fit items-center gap-1.5 px-2 py-1">
                          {getCategoryIcon(material.category)}
                          {material.category}
                        </Badge>
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
                            <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-teal-600"><Edit2 className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
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
