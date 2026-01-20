
"use client";

import { useState, useEffect } from 'react';
import { Measurement, Canvas } from '@/lib/styles-sqlite';
import { MeasurementCanvas, Arrow } from './measurement-canvas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Save, Trash2, Columns } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';

interface MeasurementsTabProps {
  styleId: string;
  initialMeasurements: Measurement[];
  initialCanvas: Canvas | undefined;
}

export function MeasurementsTab({ styleId, initialMeasurements, initialCanvas }: MeasurementsTabProps) {
  const { toast } = useToast();
  // Parse initial canvas data
  const [arrows, setArrows] = useState<Arrow[]>(() => {
      if (initialCanvas?.annotationsJson) {
          try { return JSON.parse(initialCanvas.annotationsJson); } catch (e) { return []; }
      }
      return [];
  });
  const [canvasImage, setCanvasImage] = useState(initialCanvas?.canvasImageUrl || '');
  
  const [measurements, setMeasurements] = useState<Measurement[]>(initialMeasurements);
  const [sizeColumns, setSizeColumns] = useState<string[]>(['S', 'M', 'L']);
  const [selectedArrowId, setSelectedArrowId] = useState<string | null>(null);

  // Sync measurements with arrows
  // When an arrow is added (e.g. label 'A'), ensure there is a measurement row 'A'
  useEffect(() => {
    arrows.forEach(arrow => {
        // Check if we already have a row for this arrow label
        // We look for logic: Does pom description match "[A]" pattern or is it a new arrow?
        // Simple logic: If we have an arrow 'A', and no existing POM row contains "[A]", add one.
        const labelPattern = `[${arrow.label}]`;
        const exists = measurements.some(m => m.pom.includes(labelPattern));
        
        if (!exists) {
            // Auto-create row
            const newM: Measurement = {
                id: `auto-${Date.now()}-${arrow.id}`, // Unique ID
                styleId,
                pom: `[${arrow.label}] `, // Pre-fill with label
                tolerance: 0.5,
                sizeValues: sizeColumns.reduce((acc, col) => ({ ...acc, [col]: 0 }), {})
            };
            
            // We need to update state, but care must be taken not to cause infinite loops if 'measurements' is in dependency
            // Since we are iterating and updating, functional update is best.
            setMeasurements(prev => {
                // Double check inside the updater to be safe against async updates
                if (prev.some(m => m.pom.includes(labelPattern))) return prev;
                return [...prev, newM];
            });
        }
    });

    // We do NOT auto-delete rows if arrows are deleted, as per standard safety practices (data loss prevention)
  }, [arrows]); // Removed 'measurements' from dependency to avoid loop, though functional update checks existence safely.

  // Save functionality
  const saveAll = async () => {
      try {
          // Save Canvas
          const canvasData = {
              canvasImageUrl: canvasImage,
              annotationsJson: JSON.stringify(arrows)
          };
          await fetch(`/api/designer/styles/${styleId}/canvas`, {
              method: 'POST',
              body: JSON.stringify(canvasData)
          });

          // Save Measurements
          await fetch(`/api/designer/styles/${styleId}/measurements`, {
              method: 'POST',
              body: JSON.stringify(measurements)
          });

          toast({ title: 'Saved', description: 'Measurements and tech pack updated.' });
      } catch (error) {
          toast({ title: 'Error', description: 'Failed to save.', variant: 'destructive' });
      }
  };

  const addMeasurementRow = () => {
      const nextLabel = String.fromCharCode(65 + measurements.length); // A, B, C...
      const newM: Measurement = {
          id: `tmp-${Date.now()}`,
          styleId,
          pom: `[${nextLabel}] `,
          tolerance: 0.5,
          sizeValues: sizeColumns.reduce((acc, col) => ({ ...acc, [col]: 0 }), {})
      };
      setMeasurements([...measurements, newM]);
  };

  const updateMeasurement = (id: string, field: keyof Measurement | 'size', key: string | null, value: any) => {
      setMeasurements(prev => prev.map(m => {
          if (m.id !== id) return m;
          
          if (field === 'size' && key) {
              return { ...m, sizeValues: { ...m.sizeValues, [key]: parseFloat(value) || 0 } };
          }
          return { ...m, [field]: value };
      }));
  };

    const deleteMeasurement = (id: string) => {
        const m = measurements.find(m => m.id === id);
        if (m) {
            // Check for arrow label pattern like "[A]"
            const match = m.pom.match(/^\[(.*?)\]/);
            if (match && match[1]) {
                const label = match[1];
                setArrows(prev => prev.filter(a => a.label !== label));
            }
        }
        setMeasurements(prev => prev.filter(m => m.id !== id));
    };

  // Extract keys from first measurement or default
  useEffect(() => {
      if (measurements.length > 0) {
          // Find all unique keys across all measurements to be safe, or just use state
          const keys = new Set<string>();
          measurements.forEach(m => Object.keys(m.sizeValues).forEach(k => keys.add(k)));
          if (keys.size > 0 && Array.from(keys).sort().join(',') !== sizeColumns.sort().join(',')) {
              // Only update if significantly different? 
              // Actually we want to control columns explicitly.
          }
      }
  }, []);

  const addColumn = (name: string) => {
      if (name && !sizeColumns.includes(name)) {
          setSizeColumns([...sizeColumns, name]);
      }
  };

  return (
    <div className="flex flex-col h-full gap-4">
        <div className="flex justify-between items-center bg-white p-2 rounded-lg border shadow-sm">
            <h3 className="font-medium flex items-center gap-2">
                Measurements & Guide
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                    {arrows.length} Visual / {measurements.length} Rows
                </span>
            </h3>
            <div className="flex gap-2">
                 <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm">
                            <Columns className="mr-2 h-4 w-4" /> Size Range
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                        <div className="space-y-2">
                            <h4 className="font-medium leading-none">Manage Sizes</h4>
                            <p className="text-sm text-slate-500">Add or remove size columns.</p>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {sizeColumns.map(col => (
                                    <span key={col} className="bg-slate-100 px-2 py-1 rounded text-xs flex items-center gap-1">
                                        {col}
                                        <Trash2 className="h-3 w-3 cursor-pointer hover:text-red-500" onClick={() => setSizeColumns(sizeColumns.filter(c => c !== col))} />
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <Input id="new-size" placeholder="New Size (e.g. S)" className="h-8" onKeyDown={(e) => {
                                    if(e.key === 'Enter') {
                                        addColumn(e.currentTarget.value);
                                        e.currentTarget.value = '';
                                    }
                                }} />
                                <Button size="sm" onClick={() => {
                                    const input = document.getElementById('new-size') as HTMLInputElement;
                                    addColumn(input.value);
                                    input.value = '';
                                }}>Add</Button>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
                <Button onClick={saveAll} size="sm" className="bg-slate-900 text-white">
                    <Save className="mr-2 h-4 w-4" /> Save Measurements
                </Button>
            </div>
        </div>

        <div className="flex-1 flex gap-6 min-h-0">
            {/* Left: Canvas */}
            <div className="w-1/2 flex flex-col min-h-0">
                <MeasurementCanvas 
                    imageUrl={canvasImage}
                    arrows={arrows}
                    onArrowsChange={setArrows}
                    onImageChange={setCanvasImage}
                    selectedArrowId={selectedArrowId}
                    onArrowSelect={(id) => {
                        setSelectedArrowId(id);
                        // Optional: Scroll table to row
                    }}
                />
            </div>

            {/* Right: Table */}
            <div className="w-1/2 bg-white border rounded-lg flex flex-col overflow-hidden">
                <div className="p-2 border-b flex justify-between items-center bg-white shrink-0">
                    <span className="text-xs font-bold text-slate-500 uppercase">Spec Sheet</span>
                    <Button variant="ghost" size="sm" onClick={addMeasurementRow}>
                        <Plus className="mr-2 h-4 w-4" /> Add POM
                    </Button>
                </div>
                <div className="flex-1 overflow-auto">
                    <Table>
                        <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                            <TableRow className="border-b-0">
                                <TableHead className="w-[180px] bg-slate-50">POM</TableHead>
                                <TableHead className="w-[60px] text-center bg-slate-50">+/-</TableHead>
                                {sizeColumns.map(size => (
                                    <TableHead key={size} className="text-center min-w-[60px] bg-slate-50">{size}</TableHead>
                                ))}
                                <TableHead className="w-[40px] bg-slate-50"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {measurements.map(m => (
                                <TableRow key={m.id}>
                                    <TableCell>
                                        <Input 
                                            value={m.pom} 
                                            onChange={(e) => updateMeasurement(m.id, 'pom', null, e.target.value)}
                                            className="h-8 border-transparent hover:border-slate-200 focus:border-slate-300 font-medium"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input 
                                            type="number"
                                            value={m.tolerance} 
                                            onChange={(e) => updateMeasurement(m.id, 'tolerance', null, parseFloat(e.target.value))}
                                            className="h-8 text-center border-transparent hover:border-slate-200 focus:border-slate-300 text-xs"
                                            step={0.1}
                                        />
                                    </TableCell>
                                    {sizeColumns.map(size => (
                                        <TableCell key={size} className="p-0">
                                             <Input 
                                                type="number"
                                                value={m.sizeValues[size] || ''} 
                                                onChange={(e) => updateMeasurement(m.id, 'size', size, e.target.value)}
                                                className="h-full w-full rounded-none border-0 text-center focus:ring-inset hover:bg-slate-50"
                                            />
                                        </TableCell>
                                    ))}
                                    <TableCell>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-red-500" onClick={() => deleteMeasurement(m.id)}>
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    </div>
  );
}
