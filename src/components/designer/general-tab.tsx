
"use client";

import { Style } from '@/lib/styles-sqlite';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface GeneralTabProps {
  style: Partial<Style>;
  updateStyle: (updates: Partial<Style>) => void;
}

export function GeneralTab({ style, updateStyle }: GeneralTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Style Details</CardTitle>
            <CardDescription>Basic information about the product style.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Style Name</Label>
                <Input 
                    id="name" 
                    value={style.name || ''} 
                    onChange={e => updateStyle({ name: e.target.value })} 
                    placeholder="e.g. Summer Floral Dress"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="number">Style Number</Label>
                <Input 
                    id="number" 
                    value={style.number || ''} 
                    onChange={e => updateStyle({ number: e.target.value })} 
                    placeholder="e.g. STY-2024-001"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="season">Season</Label>
                    <Input 
                        id="season" 
                        value={style.season || ''} 
                        onChange={e => updateStyle({ season: e.target.value })} 
                        placeholder="e.g. SS24"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input 
                        id="category" 
                        value={style.category || ''} 
                        onChange={e => updateStyle({ category: e.target.value })} 
                        placeholder="e.g. Dresses"
                    />
                </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description & Design Notes</Label>
              <Textarea 
                id="description" 
                value={style.description || ''} 
                onChange={e => updateStyle({ description: e.target.value })} 
                placeholder="Enter detailed design notes, fabric constraints, etc."
                className="min-h-[100px]"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Workflow Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-4 p-4 border rounded-lg bg-slate-50">
                    <div className="flex-1">
                        <Label>Current Stage</Label>
                        <Select 
                            value={style.status} 
                            onValueChange={(val: any) => updateStyle({ status: val })}
                        >
                            <SelectTrigger className="mt-1">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Development">Development</SelectItem>
                                <SelectItem value="Quotation">Quotation</SelectItem>
                                <SelectItem value="Size Set">Size Set</SelectItem>
                                <SelectItem value="Counter Sample">Counter Sample</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                 <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                        <Label className="text-base">Sample Approved</Label>
                        <p className="text-sm text-slate-500">Enable when the physical sample is approved for this stage.</p>
                    </div>
                    <Switch 
                        checked={!!style.sampleApproved}
                        onCheckedChange={(checked) => updateStyle({ sampleApproved: checked ? 1 : 0 })}
                    />
                </div>
            </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Primary Image</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="aspect-[3/4] bg-slate-100 rounded-md border-2 border-dashed border-slate-300 flex flex-col items-center justify-center p-4 relative overflow-hidden group">
                    {style.imageUrl ? (
                        <>
                            {style.imageUrl.toLowerCase().endsWith('.pdf') ? (
                                <div className="flex flex-col items-center justify-center text-slate-500">
                                    <span className="text-4xl">📄</span>
                                    <span className="text-sm font-medium mt-2">PDF Document</span>
                                    <a href={style.imageUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1">View PDF</a>
                                </div>
                            ) : (
                                <img src={style.imageUrl} alt="Style" className="w-full h-full object-cover" />
                            )}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <Button variant="secondary" onClick={() => document.getElementById('image-upload')?.click()}>Change</Button>
                                <Button variant="destructive" size="icon" onClick={() => updateStyle({ imageUrl: '' })}>
                                    <span className="sr-only">Remove</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="text-center w-full">
                            <p className="text-sm text-slate-500 mb-2">No image uploaded</p>
                            <Button variant="outline" size="sm" onClick={() => document.getElementById('image-upload')?.click()}>
                                Upload Image/PDF
                            </Button>
                            <div className="mt-2 text-xs text-slate-400">
                                or paste <Input 
                                    type="text" 
                                    placeholder="URL" 
                                    className="inline-block w-20 h-6 text-xs p-1 ml-1 align-middle"
                                    onChange={(e) => updateStyle({ imageUrl: e.target.value })}
                                />
                            </div>
                        </div>
                    )}
                    <input 
                        type="file" 
                        id="image-upload" 
                        className="hidden" 
                        accept="image/jpeg,image/png,image/gif,application/pdf"
                        onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            
                            const formData = new FormData();
                            formData.append('file', file);
                            
                            // Check authentication token
                            const token = localStorage.getItem('authToken');

                            try {
                                const response = await fetch('/api/upload', {
                                    method: 'POST',
                                    headers: {
                                        'Authorization': `Bearer ${token}`
                                    },
                                    body: formData,
                                });
                                
                                if (response.ok) {
                                    const data = await response.json();
                                    updateStyle({ imageUrl: data.url });
                                } else {
                                    console.error('Upload failed');
                                    alert('Failed to upload file');
                                }
                            } catch (error) {
                                console.error('Error uploading:', error);
                                alert('Error uploading file');
                            }
                        }}
                    />
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
