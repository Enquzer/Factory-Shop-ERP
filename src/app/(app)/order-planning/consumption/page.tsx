
"use client";

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Loader2, 
  Search, 
  History, 
  Database, 
  ArrowLeft, 
  Filter,
  BarChart4,
  Download,
  Link as LinkIcon,
  Palette,
  Scale,
  Box,
  Layers,
  Image as ImageIcon
} from "lucide-react";
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ProductConsumption, VariantConsumption } from '@/lib/bom';
import { authenticatedFetch } from '@/lib/utils';

export default function MaterialConsumptionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'database' | 'history'>('database');
  const [loading, setLoading] = useState(true);
  const [dbData, setDbData] = useState<ProductConsumption[]>([]);
  const [historyData, setHistoryData] = useState<VariantConsumption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'database') {
        const res = await authenticatedFetch('/api/material-consumption/database');
        if (res.ok) setDbData(await res.json());
      } else {
        const res = await authenticatedFetch('/api/material-consumption/history');
        if (res.ok) setHistoryData(await res.json());
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to load consumption data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filteredDbData = dbData.filter(p => 
    p.productName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.productCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.materialCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.color && p.color.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredHistoryData = historyData.filter(h => 
    h.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
    h.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.size.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.color.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              <BarChart4 className="h-8 w-8 text-primary" />
              MATERIAL CONSUMPTION ANALYSIS
            </h1>
            <p className="text-muted-foreground font-medium">Historical data and product-level consumption database.</p>
          </div>
        </div>
        <div className="flex gap-2">
           <Button 
            variant={activeTab === 'database' ? 'default' : 'outline'} 
            onClick={() => setActiveTab('database')}
            className="gap-2 font-bold uppercase text-[10px] tracking-widest"
           >
              <Database className="h-4 w-4" />
              Product Database
           </Button>
           <Button 
            variant={activeTab === 'history' ? 'default' : 'outline'} 
            onClick={() => setActiveTab('history')}
            className="gap-2 font-bold uppercase text-[10px] tracking-widest"
           >
              <History className="h-4 w-4" />
              Order History
           </Button>
        </div>
      </div>

      <Card className="border-none shadow-2xl bg-white/50 backdrop-blur-md overflow-hidden">
        <CardHeader className="bg-slate-50 border-b py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div className="relative w-full md:w-[400px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                   placeholder={activeTab === 'database' ? "Search Product Name or Code..." : "Search Order #, Product, Size or Color..."} 
                   className="pl-10 bg-white border-slate-200"
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
             <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export CSV
             </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
             <div className="h-[400px] flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground font-bold animate-pulse">Analyzing Consumption Data...</p>
             </div>
          ) : activeTab === 'database' ? (
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold">Product</TableHead>
                  <TableHead className="font-bold">Material / Fabric</TableHead>
                  <TableHead className="font-bold">Color Variation</TableHead>
                  <TableHead className="font-bold">Unit Consumption</TableHead>
                  <TableHead className="text-right font-bold pr-8">Total Historical Consumption</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDbData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-64 text-center text-muted-foreground font-bold uppercase tracking-widest opacity-30">No records found</TableCell>
                  </TableRow>
                ) : filteredDbData.map((record, idx) => (
                  <TableRow key={`${record.productId}-${record.materialId}-${record.color || idx}`} className="hover:bg-slate-50/80 transition-all">
                    <TableCell className="py-4">
                       <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                             {record.productImage ? (
                                <img src={record.productImage} alt={record.productName} className="h-full w-full object-cover" />
                             ) : (
                                <Box className="h-6 w-6 text-slate-300" />
                             )}
                          </div>
                          <div className="flex flex-col">
                             <span className="font-black text-slate-900 text-sm">{record.productName}</span>
                             <span className="text-[10px] font-mono text-primary font-bold">{record.productCode}</span>
                          </div>
                       </div>
                    </TableCell>
                    <TableCell className="py-4">
                       <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg overflow-hidden bg-slate-50 border border-dotted border-slate-300 flex items-center justify-center shrink-0">
                             {record.materialImage ? (
                                <img src={record.materialImage} alt={record.materialName} className="h-full w-full object-cover" />
                             ) : (
                                <ImageIcon className="h-5 w-5 text-slate-300" />
                             )}
                          </div>
                          <div className="flex flex-col">
                             <span className="text-xs font-bold text-slate-700">{record.materialName}</span>
                             <span className="text-[9px] font-mono text-slate-400">CODE: {record.materialCode}</span>
                          </div>
                       </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex items-center gap-2">
                          <Palette className="h-3 w-3 text-slate-400" />
                          <Badge variant="outline" className="text-[10px] font-bold bg-slate-50 text-slate-600 border-slate-200 uppercase">
                             {record.color || 'Standard'}
                          </Badge>
                       </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex flex-col">
                          <div className="flex items-baseline gap-1">
                             <span className="text-sm font-black text-slate-800">{record.quantityPerUnit}</span>
                             <span className="text-[9px] font-bold text-slate-500">{record.unitOfMeasure}</span>
                          </div>
                          <span className="text-[8px] text-slate-400 uppercase font-bold tracking-tighter">PER PIECE</span>
                       </div>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                       <div className="flex flex-col items-end">
                          <div className="flex items-baseline gap-1">
                             <span className="text-lg font-black text-primary">{record.totalHistoricalConsumption.toFixed(2)}</span>
                             <span className="text-[10px] font-bold text-slate-400 uppercase">{record.unitOfMeasure}</span>
                          </div>
                          <Badge variant="secondary" className="text-[8px] font-bold py-0 h-4 px-1 bg-green-50 text-green-700 border-green-100">
                             ACCUMULATED
                          </Badge>
                       </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Table>
               <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold">Order Trace</TableHead>
                  <TableHead className="font-bold">Variant Details</TableHead>
                  <TableHead className="font-bold">Qty</TableHead>
                  <TableHead className="font-bold">Historical Consumption used for this Variant</TableHead>
                  <TableHead className="text-right font-bold pr-8">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistoryData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-64 text-center text-muted-foreground font-bold uppercase tracking-widest opacity-30">No order history found</TableCell>
                  </TableRow>
                ) : filteredHistoryData.map((item, idx) => (
                  <TableRow key={idx} className="hover:bg-slate-50/80 transition-all group">
                    <TableCell className="py-4">
                       <div className="flex flex-col cursor-pointer" onClick={() => router.push(`/order-planning/${item.orderId}`)}>
                          <span className="font-black text-slate-900 group-hover:text-primary transition-colors flex items-center gap-1">
                             {item.orderNumber}
                             <LinkIcon className="h-3 w-3" />
                          </span>
                          <span className="text-[10px] font-bold text-slate-500">{item.productCode}</span>
                       </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex gap-2">
                          <Badge variant="outline" className="text-[10px] font-bold bg-blue-50 text-blue-700 border-blue-200">SIZE: {item.size}</Badge>
                          <Badge variant="outline" className="text-[10px] font-bold bg-purple-50 text-purple-700 border-purple-200 uppercase">{item.color}</Badge>
                       </div>
                    </TableCell>
                    <TableCell className="font-bold text-slate-700">{item.quantity} pcs</TableCell>
                    <TableCell className="py-4">
                       <div className="flex flex-wrap gap-2">
                          {item.materials.map((m, mIdx) => (
                             <div key={mIdx} className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] flex items-baseline gap-1">
                                <span className="font-bold text-slate-600">{m.materialName}:</span>
                                <span className="font-black text-slate-900">{m.consumption.toFixed(3)}</span>
                                <span className="text-slate-400">{m.unitOfMeasure}</span>
                             </div>
                          ))}
                       </div>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                       <Button variant="ghost" size="sm" onClick={() => router.push(`/order-planning/${item.orderId}`)}>
                          View Order
                       </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
