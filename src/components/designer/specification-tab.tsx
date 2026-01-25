
"use client";

import React, { useState } from 'react';
import { StyleSpecification } from '@/lib/styles-sqlite';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Upload, Loader2, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SpecificationTabProps {
  styleId: string;
  category: 'Finishing' | 'Labels';
  initialSpecs: StyleSpecification[];
  title: string;
  description: string;
  typeOptions: string[];
}

export function SpecificationTab({ 
    styleId, 
    category, 
    initialSpecs, 
    title, 
    description, 
    typeOptions 
}: SpecificationTabProps) {
  const { toast } = useToast();
  const [specs, setSpecs] = useState<StyleSpecification[]>(initialSpecs);
  const [isAdding, setIsAdding] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  React.useEffect(() => {
    setSpecs(initialSpecs);
  }, [initialSpecs]);


  const addSpec = async () => {
    const newSpec: any = {
      category,
      type: typeOptions[0],
      description: '',
      comments: ''
    };

    const token = localStorage.getItem('authToken');
    try {
      const res = await fetch(`/api/designer/styles/${styleId}/specifications`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newSpec)
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      setSpecs([...specs, created]);
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to add specification', variant: 'destructive' });
    }
  };

  // Debounce ref
  const debounceRef = React.useRef<{ [key: string]: NodeJS.Timeout }>({});

  const updateSpec = (id: string, updates: Partial<StyleSpecification>) => {
    // 1. Optimistic UI update immediately
    setSpecs(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));

    // 2. Clear existing timeout for this spec ID
    if (debounceRef.current[id]) {
        clearTimeout(debounceRef.current[id]);
    }

    // 3. Set new timeout to save to server
    debounceRef.current[id] = setTimeout(async () => {
        const token = localStorage.getItem('authToken');
        try {
          await fetch(`/api/designer/styles/${styleId}/specifications`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ id, ...updates })
          });
        } catch (e) {
          toast({ title: 'Sync Error', description: 'Failed to auto-save changes', variant: 'destructive' });
        }
    }, 800); // 800ms delay
  };

  const deleteSpec = async (id: string) => {
    if (!confirm('Delete this specification?')) return;
    const token = localStorage.getItem('authToken');
    try {
      await fetch(`/api/designer/styles/${styleId}/specifications?id=${id}`, { 
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
      });
      setSpecs(prev => prev.filter(s => s.id !== id));
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    }
  };

  const handleUpload = async (id: string, file: File) => {
    setUploadingId(id);
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('authToken');
    
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      updateSpec(id, { imageUrl: data.url });
    } catch (e) {
      toast({ title: 'Upload Failed', description: 'Image upload failed', variant: 'destructive' });
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div>
          <h3 className="text-xl font-bold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
        <Button onClick={addSpec} className="shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> Add Specification
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {specs.filter(s => s.category === category).map((spec) => (
          <Card key={spec.id} className="overflow-hidden border-slate-200 hover:shadow-md transition-shadow">
            <CardHeader className="bg-slate-50/50 p-4 border-b">
              <div className="flex justify-between items-center">
                <select 
                  className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer"
                  value={spec.type}
                  onChange={(e) => updateSpec(spec.id, { type: e.target.value })}
                >
                  {typeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <Button variant="ghost" size="sm" onClick={() => deleteSpec(spec.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="aspect-video relative bg-slate-100 rounded-lg overflow-hidden group">
                {spec.imageUrl ? (
                  <>
                    <img src={spec.imageUrl} className="w-full h-full object-contain" alt={spec.type} />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button variant="secondary" size="sm" onClick={() => document.getElementById(`upload-${spec.id}`)?.click()}>
                            Change Image
                        </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <ImageIcon className="h-10 w-10 mb-2 opacity-20" />
                    <Button variant="outline" size="sm" onClick={() => document.getElementById(`upload-${spec.id}`)?.click()}>
                        Upload {spec.type} Design
                    </Button>
                  </div>
                )}
                {uploadingId === spec.id && (
                  <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
                <input 
                  id={`upload-${spec.id}`}
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleUpload(spec.id, e.target.files[0])}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-slate-500 tracking-wider">Placement / Description</Label>
                <Input 
                  placeholder="e.g. Chest 5cm above pocket"
                  value={spec.description || ''}
                  onChange={(e) => updateSpec(spec.id, { description: e.target.value })}
                  className="h-8"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-slate-500 tracking-wider">Technical Comments</Label>
                <Textarea 
                  placeholder="Specific instructions for factory..."
                  value={spec.comments || ''}
                  onChange={(e) => updateSpec(spec.id, { comments: e.target.value })}
                  className="min-h-[80px] text-sm resize-none"
                />
              </div>
            </CardContent>
          </Card>
        ))}
        {specs.length === 0 && (
            <div className="col-span-full py-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <ImageIcon className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 font-medium">No {title.toLowerCase()} added yet.</p>
                <Button variant="outline" className="mt-4" onClick={addSpec}>
                    Starts adding specs
                </Button>
            </div>
        )}
      </div>
    </div>
  );
}
