'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

// AQL Table General Level II
const AQL_TABLE = [
  { min: 2, max: 8, sampleSize: 2, maxMajor: 0, maxMinor: 0 },
  { min: 9, max: 15, sampleSize: 13, maxMajor: 1, maxMinor: 1 },
  { min: 16, max: 25, sampleSize: 13, maxMajor: 1, maxMinor: 1 },
  { min: 26, max: 50, sampleSize: 13, maxMajor: 1, maxMinor: 1 },
  { min: 51, max: 90, sampleSize: 13, maxMajor: 1, maxMinor: 1 },
  { min: 91, max: 150, sampleSize: 20, maxMajor: 1, maxMinor: 2 },
  { min: 151, max: 280, sampleSize: 32, maxMajor: 2, maxMinor: 3 },
  { min: 281, max: 500, sampleSize: 50, maxMajor: 3, maxMinor: 5 },
  { min: 501, max: 1200, sampleSize: 80, maxMajor: 5, maxMinor: 7 },
  { min: 1201, max: 3200, sampleSize: 125, maxMajor: 7, maxMinor: 10 },
  { min: 3201, max: 10000, sampleSize: 200, maxMajor: 10, maxMinor: 14 },
];

const INSPECTION_CATEGORIES = [
  {
    category: 'FABRIC',
    points: [
      { name: 'Woven / Knit Material', desc: 'Holes, shading, runs, or snags.' },
      { name: 'Interfacing / Lining', desc: 'Bubbling, peeling, or mismatched color.' },
      { name: 'Print / Embroidery', desc: 'Bleeding, cracking, or missing stitches.' },
    ]
  },
  {
    category: 'PRODUCTION',
    points: [
      { name: 'Pattern / Seams', desc: 'Twisted seams, puckering, or open seams.' },
      { name: 'Stitches / Thread', desc: 'Skipped stitches, broken thread, or raw edges.' },
      { name: 'Neck / Shoulder / Hem', desc: 'Asymmetry, uneven heights, or wavy hems.' },
      { name: 'Sleeves / Cuffs', desc: 'Unaligned cuffs or uneven sleeve lengths.' },
    ]
  },
  {
    category: 'HARDWARE',
    points: [
      { name: 'Buttons / Snaps / Zips', desc: 'Loose buttons, stuck zippers, or sharp edges.' },
      { name: 'Velcro / Elastic', desc: 'Weak grip or loss of elasticity.' },
    ]
  },
  {
    category: 'FINISHING',
    points: [
      { name: 'Trimming / Threads', desc: 'Long loose threads (uncut).' },
      { name: 'Pressing / Washing', desc: 'Iron marks, burns, or water spots.' },
      { name: 'Stains / Dirt', desc: 'Oil spots, chalk marks, or dust.' },
    ]
  },
  {
    category: 'SAFETY',
    points: [
      { name: 'Nickel / Needle Test', desc: 'Mandatory Pass. Metal contamination.', isSafety: true },
      { name: 'Button Pull Test', desc: 'Choking hazard (SafQ test).', isSafety: true },
    ]
  },
  {
    category: 'PACKAGING',
    points: [
      { name: 'Labels / Price Tags', desc: 'Wrong price, missing size tag, or skewed label.' },
      { name: 'Transport Markings', desc: 'Wrong carton marking or SKU mismatch.' },
    ]
  }
];

interface DefectEntry {
  category: string;
  point: string;
  critical: number;
  major: number;
  minor: number;
}

interface QualityInspectionMatrixProps {
  orderQuantity: number;
  onUpdate: (data: {
    sampleSize: number;
    totalCritical: number;
    totalMajor: number;
    totalMinor: number;
    defectJson: string;
    status: 'Passed' | 'Failed' | 'Rework';
  }) => void;
  initialData?: string;
}

export function QualityInspectionMatrix({ orderQuantity, onUpdate, initialData }: QualityInspectionMatrixProps) {
  const [defects, setDefects] = useState<DefectEntry[]>([]);
  const [activePoint, setActivePoint] = useState<{ category: string, point: string } | null>(null);

  // Sync internal state with initialData ONLY if it's different
  useEffect(() => {
    if (initialData) {
      try {
        const parsed = JSON.parse(initialData);
        if (JSON.stringify(parsed) !== JSON.stringify(defects)) {
          setDefects(parsed);
        }
      } catch (e) {
        console.error("Failed to parse initial defect data", e);
      }
    }
  }, [initialData]); // defects removed from here to prevent loops

  const aql = useMemo(() => {
    return AQL_TABLE.find(row => orderQuantity >= row.min && orderQuantity <= row.max) || AQL_TABLE[AQL_TABLE.length - 1];
  }, [orderQuantity]);

  const totals = useMemo(() => {
    return defects.reduce((acc, curr) => ({
      critical: acc.critical + curr.critical,
      major: acc.major + curr.major,
      minor: acc.minor + curr.minor,
    }), { critical: 0, major: 0, minor: 0 });
  }, [defects]);

  const status = useMemo(() => {
    if (totals.critical > 0) return 'Failed';
    if (totals.major > aql.maxMajor) return 'Failed';
    if (totals.minor > aql.maxMinor) return 'Rework'; 
    return 'Passed';
  }, [totals, aql]);

  // Use a ref to track the last emitted state to prevent redundant updates
  const lastStateRef = React.useRef("");
  const onUpdateRef = React.useRef(onUpdate);

  // Update the ref whenever onUpdate changes
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  // Notify parent on changes
  useEffect(() => {
    const currentState = JSON.stringify({
      sampleSize: aql.sampleSize,
      totalCritical: totals.critical,
      totalMajor: totals.major,
      totalMinor: totals.minor,
      defects,
      status
    });

    if (lastStateRef.current !== currentState) {
      lastStateRef.current = currentState;
      if (onUpdateRef.current) {
        onUpdateRef.current({
          sampleSize: aql.sampleSize,
          totalCritical: totals.critical,
          totalMajor: totals.major,
          totalMinor: totals.minor,
          defectJson: JSON.stringify(defects),
          status: status as 'Passed' | 'Failed' | 'Rework'
        });
      }
    }
  }, [defects, aql, totals, status]); // Removed onUpdate from deps

  const handleUpdateCount = (category: string, point: string, type: 'critical' | 'major' | 'minor', val: number) => {
    const existingIndex = defects.findIndex(d => d.category === category && d.point === point);
    if (existingIndex > -1) {
      const newDefects = [...defects];
      newDefects[existingIndex] = { ...newDefects[existingIndex], [type]: val };
      setDefects(newDefects);
    } else {
      setDefects([...defects, { category, point, critical: 0, major: 0, minor: 0, [type]: val }]);
    }
  };

  const getDefect = (category: string, point: string) => {
    return defects.find(d => d.category === category && d.point === point) || { critical: 0, major: 0, minor: 0 };
  };

  return (
    <div className="space-y-6">
      <Card className="border-emerald-200 bg-emerald-50/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>AQL Inspection Level II</span>
            <Badge variant="outline" className="bg-white">General II</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="p-3 bg-white rounded-lg border shadow-sm">
              <p className="text-muted-foreground font-medium uppercase text-[10px]">Order Size</p>
              <p className="text-xl font-bold">{orderQuantity}</p>
            </div>
            <div className="p-3 bg-white rounded-lg border shadow-sm border-blue-200">
              <p className="text-blue-600 font-medium uppercase text-[10px]">Sample Size</p>
              <p className="text-xl font-bold text-blue-700 underline decoration-blue-200 decoration-2">{aql.sampleSize} Pcs</p>
            </div>
            <div className="p-3 bg-white rounded-lg border shadow-sm border-orange-200">
              <p className="text-orange-600 font-medium uppercase text-[10px]">Major Limit</p>
              <p className="text-xl font-bold text-orange-700">{aql.maxMajor}</p>
            </div>
            <div className="p-3 bg-white rounded-lg border shadow-sm border-yellow-200">
              <p className="text-yellow-600 font-medium uppercase text-[10px]">Minor Limit</p>
              <p className="text-xl font-bold text-yellow-700">{aql.maxMinor}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="border rounded-xl overflow-hidden shadow-sm bg-white">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[300px]">Inspection Point</TableHead>
              <TableHead className="text-center bg-red-50 text-red-700 font-bold border-x">Critical</TableHead>
              <TableHead className="text-center bg-orange-50 text-orange-700 font-bold border-x">Major</TableHead>
              <TableHead className="text-center bg-yellow-50 text-yellow-700 font-bold border-x">Minor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {INSPECTION_CATEGORIES.map((cat) => (
              <React.Fragment key={cat.category}>
                <TableRow className="bg-slate-100/50">
                  <TableCell colSpan={4} className="font-black text-slate-500 py-1.5 px-4 text-[10px] tracking-widest uppercase">
                    {cat.category}
                  </TableCell>
                </TableRow>
                {cat.points.map((pt) => {
                  const d = getDefect(cat.category, pt.name);
                  return (
                    <TableRow key={pt.name} className="hover:bg-slate-50/80 border-b border-slate-100 last:border-0 transition-colors group">
                      <TableCell className="py-4 px-6">
                        <div className="font-bold text-slate-800 group-hover:text-emerald-700 transition-colors uppercase tracking-tight text-xs">{pt.name}</div>
                        <div className="text-[10px] text-slate-400 italic mt-1 leading-tight">{pt.desc}</div>
                      </TableCell>
                      
                      {/* Critical */}
                      <TableCell className="p-0 border-x border-slate-100 min-w-[80px]">
                        <button 
                          className={cn(
                            "w-full h-full min-h-[60px] flex items-center justify-center transition-all",
                            d.critical > 0 ? "bg-red-600 text-white font-black text-lg shadow-inner ring-1 ring-red-700 ring-inset" : "hover:bg-red-50 text-red-200"
                          )}
                          onClick={() => setActivePoint({ category: cat.category, point: pt.name })}
                        >
                          {d.critical > 0 ? d.critical : <div className="w-1.5 h-1.5 rounded-full bg-red-100 opacity-50" />}
                        </button>
                      </TableCell>
                      
                      {/* Major */}
                      <TableCell className="p-0 border-x border-slate-100 min-w-[80px]">
                        <button 
                          className={cn(
                            "w-full h-full min-h-[60px] flex items-center justify-center transition-all",
                            d.major > 0 ? "bg-orange-500 text-white font-black text-lg shadow-inner ring-1 ring-orange-600 ring-inset" : "hover:bg-orange-50 text-orange-200"
                          )}
                          onClick={() => setActivePoint({ category: cat.category, point: pt.name })}
                        >
                          {d.major > 0 ? d.major : <div className="w-1.5 h-1.5 rounded-full bg-orange-100 opacity-50" />}
                        </button>
                      </TableCell>

                      {/* Minor */}
                      <TableCell className="p-0 border-x border-slate-100 min-w-[80px]">
                        <button 
                          className={cn(
                            "w-full h-full min-h-[60px] flex items-center justify-center transition-all",
                            d.minor > 0 ? "bg-yellow-400 text-slate-900 font-black text-lg shadow-inner ring-1 ring-yellow-500 ring-inset" : "hover:bg-yellow-50 text-yellow-200"
                          )}
                          onClick={() => setActivePoint({ category: cat.category, point: pt.name })}
                        >
                          {d.minor > 0 ? d.minor : <div className="w-1.5 h-1.5 rounded-full bg-yellow-100 opacity-50" />}
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      <Card className={cn(
        "border-2 transition-all duration-500 shadow-lg",
        status === 'Passed' ? "border-emerald-500 bg-emerald-50" : 
        status === 'Failed' ? "border-red-500 bg-red-50 animate-pulse" : 
        "border-amber-500 bg-amber-50"
      )}>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {status === 'Passed' ? (
                <div className="p-4 bg-emerald-500 rounded-full text-white shadow-lg">
                  <CheckCircle className="h-10 w-10" />
                </div>
              ) : (
                <div className={cn("p-4 rounded-full text-white shadow-lg", status === 'Failed' ? "bg-red-500" : "bg-amber-500")}>
                  <XCircle className="h-10 w-10" />
                </div>
              )}
              <div>
                <p className="text-sm font-bold opacity-70 uppercase tracking-tighter">Current Inspection Result</p>
                <p className={cn("text-4xl font-black uppercase tracking-tight", 
                  status === 'Passed' ? "text-emerald-700" : 
                  status === 'Failed' ? "text-red-700" : 
                  "text-amber-700"
                )}>
                  {status === 'Passed' ? 'AQL PASSED' : status === 'Failed' ? 'REJECTED' : 'REWORK NEEDED'}
                </p>
              </div>
            </div>
            <div className="bg-white/60 p-4 rounded-xl backdrop-blur-sm border shadow-inner flex gap-8">
              <div className="text-center">
                <p className="text-[10px] font-bold text-red-600 uppercase">Critical</p>
                <p className="text-2xl font-black text-red-700">{totals.critical}</p>
                <p className="text-[9px] font-medium text-slate-400">Limit: 0</p>
              </div>
              <div className="text-center border-x px-8">
                <p className="text-[10px] font-bold text-orange-600 uppercase">Major</p>
                <p className="text-2xl font-black text-orange-700">{totals.major}</p>
                <p className="text-[9px] font-medium text-slate-400">Limit: {aql.maxMajor}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-bold text-yellow-600 uppercase">Minor</p>
                <p className="text-2xl font-black text-yellow-700">{totals.minor}</p>
                <p className="text-[9px] font-medium text-slate-400">Limit: {aql.maxMinor}</p>
              </div>
            </div>
          </div>
          {status === 'Failed' && totals.critical > 0 && (
             <div className="mt-4 p-2 bg-red-600 text-white text-xs font-bold text-center rounded animate-bounce">
                CRITICAL DEFECT DETECTED: SAFETY VIOLATION! IMMEDIATE REJECTION.
             </div>
          )}
        </CardContent>
      </Card>

      {/* Popup for count input */}
      <Dialog open={!!activePoint} onOpenChange={(v) => !v && setActivePoint(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>Defect Entry</span>
              <Badge variant="outline">{activePoint?.point}</Badge>
            </DialogTitle>
          </DialogHeader>
          {activePoint && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2 p-3 bg-red-50 border border-red-100 rounded-lg">
                  <label className="text-xs font-bold text-red-700 uppercase flex items-center justify-between">
                    Critical Defects
                    <span className="text-[10px] font-normal italic">Safety hazard / fatal flaw</span>
                  </label>
                  <Input 
                    type="number" 
                    min="0"
                    placeholder="0"
                    className="bg-white border-red-200 focus-visible:ring-red-500"
                    value={getDefect(activePoint.category, activePoint.point).critical || ''}
                    onChange={(e) => handleUpdateCount(activePoint.category, activePoint.point, 'critical', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2 p-3 bg-orange-50 border border-orange-100 rounded-lg">
                  <label className="text-xs font-bold text-orange-700 uppercase flex items-center justify-between">
                    Major Defects
                    <span className="text-[10px] font-normal italic">Visual or functional fail</span>
                  </label>
                  <Input 
                    type="number" 
                    min="0"
                    placeholder="0"
                    className="bg-white border-orange-200 focus-visible:ring-orange-500"
                    value={getDefect(activePoint.category, activePoint.point).major || ''}
                    onChange={(e) => handleUpdateCount(activePoint.category, activePoint.point, 'major', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2 p-3 bg-yellow-50 border border-yellow-100 rounded-lg">
                  <label className="text-xs font-bold text-yellow-700 uppercase flex items-center justify-between">
                    Minor Defects
                    <span className="text-[10px] font-normal italic">Small cosmetic issues</span>
                  </label>
                  <Input 
                    type="number" 
                    min="0"
                    placeholder="0"
                    className="bg-white border-yellow-200 focus-visible:ring-yellow-500"
                    value={getDefect(activePoint.category, activePoint.point).minor || ''}
                    onChange={(e) => handleUpdateCount(activePoint.category, activePoint.point, 'minor', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => setActivePoint(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
