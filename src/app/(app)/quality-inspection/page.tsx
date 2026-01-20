"use client";

import { useAuth } from '@/contexts/auth-context';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  getMarketingOrders, 
  MarketingOrder, 
  QualityInspection, 
  getQualityInspections, 
  saveQualityInspection 
} from '@/lib/marketing-orders';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  Package, 
  TrendingUp, 
  CheckCircle, 
  Clock, 
  Check, 
  X, 
  FileText, 
  Plus, 
  Calendar,
  Layers,
  ClipboardCheck,
  History,
  AlertCircle,
  Paperclip,
  FileDown,
  ExternalLink,
  FileCheck,
  Eye,
  ImageIcon
} from 'lucide-react';
import Image from 'next/image';
import { generateQCPDF } from '@/lib/qc-pdf-generator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function QualityInspectionDashboardPage() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const stageFilter = searchParams.get('stage');
  
  const [orders, setOrders] = useState<MarketingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<MarketingOrder | null>(null);
  const [inspections, setInspections] = useState<QualityInspection[]>([]);
  const [isInspectionDialogOpen, setIsInspectionDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [factoryProfile, setFactoryProfile] = useState<any>(null);

  // New Inspection Form State
  const [formData, setFormData] = useState<Partial<QualityInspection>>({
    date: new Date().toISOString().split('T')[0],
    stage: 'Inline-Sewing',
    status: 'Passed',
    quantityInspected: 0,
    quantityPassed: 0,
    quantityRejected: 0,
    size: '',
    color: '',
    remarks: '',
    reportUrl: ''
  });

  // Check if user has quality inspection role, otherwise redirect
  useEffect(() => {
    if (!isLoading && (!user || (user.role !== 'quality_inspection' && user.role !== 'factory' && user.role !== 'planning'))) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedOrders = await getMarketingOrders();
      // Show orders currently in production or finishing
      const activeProductionStatuses = ['Sample Making', 'Cutting', 'Sewing', 'Finishing', 'Quality Inspection'];
      const filtered = fetchedOrders.filter(o => activeProductionStatuses.includes(o.status) && !o.isCompleted);
      setOrders(filtered);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast({ title: "Error", description: "Failed to load orders.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchFactoryProfile = async () => {
    try {
      const response = await fetch('/api/factory-profile');
      if (response.ok) {
        const data = await response.json();
        setFactoryProfile(data);
      }
    } catch (error) {
      console.error("Error fetching factory profile:", error);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchFactoryProfile();
  }, [fetchOrders]);

  const fetchInspections = async (orderId: string) => {
    try {
      const data = await getQualityInspections(orderId);
      setInspections(data);
    } catch (error) {
      console.error("Error fetching inspections:", error);
    }
  };

  const filteredOrders = orders.filter(order => {
    // Search filter
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.productCode.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    // Stage filter logic
    if (stageFilter === 'Sample') {
      return order.status === 'Sample Making';
    }
    if (stageFilter === 'Sewing') {
      return order.status === 'Sewing';
    }
    if (stageFilter === 'Packing') {
      return ['Finishing', 'Quality Inspection', 'Packing'].includes(order.status);
    }

    return true;
  });

  // Separate orders into Queue and History based on stage completion or status
  const pendingOrders = filteredOrders.filter(order => {
    // If we have a status other than Pending/Null, it's considered "processed" for this view
    // However, if it's 'Rework', maybe it stays? But user said "once inspected... move out"
    // So we'll say if qualityInspectionStatus is set, it goes to history.
    return !order.qualityInspectionStatus || order.qualityInspectionStatus === 'Pending';
  });

  const inspectedOrders = filteredOrders.filter(order => {
    return order.qualityInspectionStatus && order.qualityInspectionStatus !== 'Pending';
  });

  const handleOpenInspection = (order: MarketingOrder) => {
    setSelectedOrder(order);
    
    // Determine default stage based on current filter or order status
    let defaultStage: any = 'Inline-Sewing';
    if (stageFilter === 'Sample') defaultStage = 'Sample';
    else if (stageFilter === 'Packing') defaultStage = 'Final';
    else if (order.status === 'Cutting') defaultStage = 'Inline-Cutting';
    else if (order.status === 'Sample Making') defaultStage = 'Sample';

    setFormData({
      ...formData,
      orderId: order.id,
      stage: defaultStage,
      quantityInspected: order.quantity, // Default to full order quantity
      quantityPassed: order.quantity,
      quantityRejected: 0
    });
    setIsInspectionDialogOpen(true);
  };

  const handleOpenHistory = async (order: MarketingOrder) => {
    setSelectedOrder(order);
    await fetchInspections(order.id);
    setIsHistoryDialogOpen(true);
  };

  const handleSubmitInspection = async () => {
    if (!formData.orderId || !formData.date || !formData.stage || !formData.status) {
      toast({ title: "Validation Error", description: "Please fill required fields.", variant: "destructive" });
      return;
    }

    try {
      let finalReportUrl = formData.reportUrl;

      // Automatically generate PDF report
      setIsGeneratingReport(true);
      try {
        if (selectedOrder) {
          const pdfBlob = await generateQCPDF(
            selectedOrder, 
            formData as QualityInspection,
            factoryProfile?.name,
            factoryProfile?.address,
            factoryProfile?.email
          );
          
          const reportFile = new File([pdfBlob], `QC_Report_${selectedOrder.orderNumber}_${formData.stage}.pdf`, { type: 'application/pdf' });
          
          // Upload to server
          const uploadFormData = new FormData();
          uploadFormData.append('file', reportFile);
          uploadFormData.append('filename', reportFile.name);
          
          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            body: uploadFormData
          });
          
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            finalReportUrl = uploadData.imageUrl;
          }
        }
      } catch (pdfErr) {
        console.error("PDF Generation/Upload Error:", pdfErr);
        toast({ title: "Warning", description: "Inspection saved but failed to generate PDF report.", variant: "destructive" });
      } finally {
        setIsGeneratingReport(false);
      }

      const submissionData = { ...formData, reportUrl: finalReportUrl };
      const success = await saveQualityInspection(submissionData as QualityInspection);
      
      if (success) {
        toast({ title: "Success", description: "Inspection report submitted with auto-generated PDF." });
        setIsInspectionDialogOpen(false);
        if (selectedOrder) fetchInspections(selectedOrder.id);
      } else {
        toast({ title: "Error", description: "Failed to submit report.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error submitting inspection:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent flex items-center gap-2">
            <ClipboardCheck className="h-8 w-8 text-emerald-600" />
            {stageFilter ? `${stageFilter} QC Control` : 'Quality Control Center'}
          </h1>
          <p className="text-muted-foreground italic">
            {stageFilter === 'Sample' && "Approve samples and prototypes before production starts."}
            {stageFilter === 'Sewing' && "Inline inspection for sewing lines and garment assembly."}
            {stageFilter === 'Packing' && "Final inspection and packing quality checks."}
            {!stageFilter && "Maintain high standards through granular inspections and stage-based tracking."}
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search orders..."
              className="pl-8 bg-white border-emerald-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={fetchOrders} variant="outline" className="shadow-sm border-emerald-200">
            <TrendingUp className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-md bg-white border-l-4 border-l-emerald-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-muted-foreground uppercase">Inspected (Total)</p>
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold mt-1">--</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-white border-l-4 border-l-orange-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-muted-foreground uppercase">Awaiting (Active)</p>
              <Clock className="h-4 w-4 text-orange-500" />
            </div>
            <div className="text-2xl font-bold mt-1">{orders.length}</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-white border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-muted-foreground uppercase">Passed Today</p>
              <Check className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold mt-1">--</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-white border-l-4 border-l-red-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-muted-foreground uppercase">Rejected/Rework</p>
              <X className="h-4 w-4 text-red-500" />
            </div>
            <div className="text-2xl font-bold mt-1">--</div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card className="border-none shadow-xl bg-white overflow-hidden mb-8">
        <CardHeader className="bg-emerald-50/50 border-b">
          <CardTitle>Inspection Queue</CardTitle>
          <CardDescription>Orders waiting for quality verification.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-100/50">
                <TableRow>
                  <TableHead>Order Details</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Timeline</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                     <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">
                        Loading production queue...
                     </TableCell>
                  </TableRow>
                ) : pendingOrders.length > 0 ? (
                  pendingOrders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-emerald-50/30 transition-colors">
                      <TableCell>
                        <div className="font-bold text-base">{order.orderNumber}</div>
                        <div className="text-xs text-muted-foreground font-medium">{order.productName} ({order.productCode})</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          "capitalize",
                          order.status === 'Sewing' && "bg-purple-50 text-purple-700 border-purple-200",
                          order.status === 'Cutting' && "bg-yellow-50 text-yellow-700 border-yellow-200",
                          order.status === 'Finishing' && "bg-blue-50 text-blue-700 border-blue-200"
                        )}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-bold">{order.quantity}</div>
                        <div className="text-[10px] text-muted-foreground">Units to process</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Clock className="mr-1 h-3 w-3" />
                          {order.dueDate ? format(new Date(order.dueDate), 'MMM dd, yyyy') : 'TBD'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                         <div className="flex justify-end gap-2">
                           <Button 
                              size="sm" 
                              className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs shadow-md"
                              onClick={() => handleOpenInspection(order)}
                           >
                              <Plus className="mr-1.5 h-3.5 w-3.5" />
                              Inspect
                           </Button>
                         </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      No pending inspections found in Queue.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Inspection History Table */}
      <Card className="border-none shadow-xl bg-white overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b">
          <CardTitle>Recent Inspection History</CardTitle>
          <CardDescription>Completed inspections with reports and details.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-100/50">
                <TableRow>
                  <TableHead>Product Image</TableHead>
                  <TableHead>Order Details</TableHead>
                  <TableHead>Latest Result</TableHead>
                  <TableHead>Report</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                   <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">
                         Loading history...
                      </TableCell>
                   </TableRow>
                ) : inspectedOrders.length > 0 ? (
                  inspectedOrders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell>
                        <div className="relative h-12 w-12 rounded overflow-hidden border bg-gray-100">
                          {order.imageUrl ? (
                             <Image 
                               src={order.imageUrl} 
                               alt={order.productName} 
                               fill 
                               className="object-cover"
                             />
                          ) : (
                             <div className="flex items-center justify-center h-full w-full text-gray-400">
                                <ImageIcon className="h-5 w-5" />
                             </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-base">{order.orderNumber}</div>
                        <div className="text-xs text-muted-foreground font-medium">{order.productName}</div>
                        <div className="text-[10px] text-gray-400">{format(new Date(order.updatedAt || new Date()), 'MMM dd, yyyy')}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          "text-[10px] font-bold uppercase w-fit",
                          (order.qualityInspectionStatus === 'Passed' || order.qualityInspectionStatus === 'Approved') ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          (order.qualityInspectionStatus === 'Failed' || order.qualityInspectionStatus === 'Rejected') ? "bg-red-50 text-red-700 border-red-200" :
                          order.qualityInspectionStatus === 'Rework' ? "bg-amber-50 text-amber-700 border-amber-200" :
                          "bg-gray-50 text-gray-500 border-gray-200"
                        )}>
                           {order.qualityInspectionStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                         {order.qualityInspectionReportUrl ? (
                             <a 
                               href={order.qualityInspectionReportUrl} 
                               target="_blank" 
                               rel="noopener noreferrer"
                               className="flex items-center gap-1.5 text-xs text-blue-600 font-bold hover:underline"
                             >
                               <Paperclip className="h-3.5 w-3.5" />
                               View PDF
                             </a>
                         ) : (
                           <span className="text-xs text-muted-foreground italic">No Attachment</span>
                         )}
                      </TableCell>
                      <TableCell className="text-right">
                         <div className="flex justify-end gap-2">
                             <Button 
                               size="sm" 
                               variant="outline"
                               className="h-8 w-8 p-0"
                               onClick={() => handleOpenHistory(order)}
                               title="View Details"
                             >
                               <Eye className="h-4 w-4" />
                             </Button>
                             <Button 
                               size="sm" 
                               variant="outline"
                               className="h-8 w-8 p-0"
                               onClick={() => handleOpenInspection(order)}
                               title="Edit / New Inspection"
                             >
                               <Plus className="h-4 w-4" />
                             </Button>
                             {order.qualityInspectionReportUrl && (
                               <Button 
                                 size="sm" 
                                 variant="outline"
                                 className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                 onClick={() => window.open(order.qualityInspectionReportUrl, '_blank')}
                                 title="Export PDF"
                               >
                                 <FileDown className="h-4 w-4" />
                               </Button>
                             )}
                         </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      No completed inspections found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Inspection Dialog */}
      <Dialog open={isInspectionDialogOpen} onOpenChange={setIsInspectionDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
               <ClipboardCheck className="h-5 w-5 text-emerald-600" />
               New Inspection Record - {selectedOrder?.orderNumber}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
             <div className="space-y-4">
                <div>
                   <label className="text-sm font-bold mb-1.5 block">Inspection Stage *</label>
                   <Select 
                      value={formData.stage} 
                      onValueChange={(v: any) => setFormData({...formData, stage: v})}
                   >
                      <SelectTrigger className="bg-white border-emerald-100">
                         <SelectValue placeholder="Select Stage" />
                      </SelectTrigger>
                      <SelectContent>
                         <SelectItem value="Sample">Sample Approval Inspection</SelectItem>
                         <SelectItem value="Order">Order Pre-start Inspection</SelectItem>
                         <SelectItem value="Inline-Cutting">Inline Cutting Inspection</SelectItem>
                         <SelectItem value="Inline-Sewing">Inline Sewing Inspection</SelectItem>
                         <SelectItem value="Final">Final Inspection Report</SelectItem>
                      </SelectContent>
                   </Select>
                </div>
                <div>
                   <label className="text-sm font-bold mb-1.5 block">Date *</label>
                   <Input 
                      type="date" 
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                   />
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <div>
                      <label className="text-sm font-bold mb-1.5 block">Size (Optional)</label>
                      <Input 
                         placeholder="e.g. M"
                         value={formData.size}
                         onChange={(e) => setFormData({...formData, size: e.target.value})}
                      />
                   </div>
                   <div>
                      <label className="text-sm font-bold mb-1.5 block">Color (Optional)</label>
                      <Input 
                         placeholder="e.g. Blue"
                         value={formData.color}
                         onChange={(e) => setFormData({...formData, color: e.target.value})}
                      />
                   </div>
                </div>
             </div>
             <div className="space-y-4">
                <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
                   <label className="text-sm font-bold mb-2 block text-emerald-800 tracking-tight">Final Inspection Verdict</label>
                   <div className="flex flex-wrap gap-2">
                       {['Passed', 'Failed', 'Approved', 'Rejected', 'Rework'].map((stat) => (
                           <Button 
                              key={stat}
                              size="sm" 
                              variant={formData.status === stat ? 'default' : 'outline'}
                              className={cn(
                                "h-8 px-3 text-xs font-bold",
                                formData.status === stat ? (
                                  (stat === 'Passed' || stat === 'Approved') ? "bg-emerald-600 hover:bg-emerald-700 shadow-sm" :
                                  (stat === 'Failed' || stat === 'Rejected') ? "bg-red-600 hover:bg-red-700 shadow-sm" :
                                  "bg-amber-500 hover:bg-amber-600 shadow-sm"
                                ) : "bg-white border-emerald-100 text-emerald-800 hover:bg-emerald-50"
                              )}
                              onClick={() => setFormData({...formData, status: stat as any})}
                           >
                              {stat}
                           </Button>
                       ))}
                   </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                   <div>
                      <label className="text-sm font-bold mb-1.5 block">Inspected</label>
                      <Input 
                         type="number"
                         className="bg-white"
                         value={formData.quantityInspected}
                         onChange={(e) => {
                           const val = parseInt(e.target.value) || 0;
                           setFormData({...formData, quantityInspected: val, quantityPassed: val, quantityRejected: 0});
                         }}
                      />
                   </div>
                   <div>
                      <label className="text-sm font-bold mb-1.5 block text-emerald-600 underline decoration-emerald-200">Approved</label>
                      <Input 
                         type="number"
                         className="bg-white border-emerald-100"
                         value={formData.quantityPassed}
                         onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setFormData({...formData, quantityPassed: val, quantityRejected: (formData.quantityInspected || 0) - val});
                         }}
                      />
                   </div>
                   <div>
                      <label className="text-sm font-bold mb-1.5 block text-red-600 underline decoration-red-200">Rejected</label>
                      <Input 
                         type="number"
                         className="bg-white border-red-100"
                         value={formData.quantityRejected}
                         onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setFormData({...formData, quantityRejected: val, quantityPassed: (formData.quantityInspected || 0) - val});
                         }}
                      />
                   </div>
                </div>
                 <div>
                    <label className="text-sm font-bold mb-1.5 flex items-center gap-2">
                       Report Link (Attachment URL)
                       <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">Auto-Generated if Blank</span>
                    </label>
                    <Input 
                       placeholder="External URL or leave blank for Auto-PDF"
                       value={formData.reportUrl}
                       onChange={(e) => setFormData({...formData, reportUrl: e.target.value})}
                    />
                 </div>
             </div>
             <div className="md:col-span-2">
                <label className="text-sm font-bold mb-1.5 block">Detailed Remarks / Findings</label>
                <Textarea 
                   placeholder="Enter any issues found, rework needed, or positive findings..."
                   rows={3}
                   value={formData.remarks}
                   onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                />
             </div>
          </div>
          <DialogFooter className="flex gap-2 sm:justify-end">
             <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setIsInspectionDialogOpen(false)}>Cancel</Button>
             <Button 
                className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 h-10 shadow-lg min-w-[220px]" 
                onClick={handleSubmitInspection}
                disabled={isGeneratingReport}
              >
                {isGeneratingReport ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating QC Report...
                  </>
                ) : (
                  <>
                    <FileCheck className="mr-2 h-4 w-4" />
                    Complete & Save Report
                  </>
                )}
              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
             <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-emerald-600" />
                Inspection History - {selectedOrder?.orderNumber}
             </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
             {inspections.length > 0 ? (
                <div className="space-y-3">
                   {inspections.map((ins, i) => (
                      <div key={i} className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                         <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                               <div className="flex flex-col gap-1">
                                  <Badge className={cn(
                                     (ins.status === 'Passed' || ins.status === 'Approved') ? "bg-emerald-100 text-emerald-700" : 
                                     (ins.status === 'Failed' || ins.status === 'Rejected') ? "bg-red-100 text-red-700" :
                                     "bg-amber-100 text-amber-700"
                                  )}>
                                     {ins.status}
                                  </Badge>
                                  {ins.reportUrl && (
                                    <a 
                                      href={ins.reportUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold hover:bg-emerald-50 w-fit p-1 px-2 rounded-md border border-emerald-100 transition-colors shadow-sm"
                                    >
                                      <Paperclip className="h-3 w-3" />
                                      QC_REPORT.PDF
                                      <ExternalLink className="h-2 w-2" />
                                    </a>
                                  )}
                               </div>
                               <span className="font-bold text-gray-700">{ins.stage}</span>
                            </div>
                            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                               <Calendar className="h-3 w-3" />
                               {ins.date}
                            </div>
                         </div>
                         <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm mb-3">
                            <div>
                               <span className="text-muted-foreground block text-[10px] uppercase font-bold">Inspected</span>
                               <span className="font-medium">{ins.quantityInspected}</span>
                            </div>
                            <div>
                               <span className="text-muted-foreground block text-[10px] uppercase font-bold text-emerald-600">Approved</span>
                               <span className="font-medium">{ins.quantityPassed}</span>
                            </div>
                            <div>
                               <span className="text-muted-foreground block text-[10px] uppercase font-bold text-red-600">Rejected</span>
                               <span className="font-medium">{ins.quantityRejected || 0}</span>
                            </div>
                            <div>
                               <span className="text-muted-foreground block text-[10px] uppercase font-bold">Variant</span>
                               <span className="font-medium">{ins.size || 'N/A'} / {ins.color || 'N/A'}</span>
                            </div>
                            <div>
                               <span className="text-muted-foreground block text-[10px] uppercase font-bold">Inspector</span>
                               <span className="font-medium truncate">{ins.inspectorId}</span>
                            </div>
                         </div>
                         {ins.remarks && (
                            <div className="text-sm bg-gray-50 p-2 rounded border italic text-gray-600 mb-2">
                               "{ins.remarks}"
                            </div>
                         )}
                         {ins.reportUrl && (
                            <Button size="sm" variant="link" className="p-0 h-auto text-emerald-600 font-bold" onClick={() => window.open(ins.reportUrl, '_blank')}>
                               <FileText className="mr-1 h-3.5 w-3.5" />
                               View Attached Report
                            </Button>
                         )}
                      </div>
                   ))}
                </div>
             ) : (
                <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg bg-gray-50 text-muted-foreground">
                   <AlertCircle className="h-8 w-8 mb-2 opacity-20" />
                   <p>No quality inspection records found for this order.</p>
                </div>
             )}
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setIsHistoryDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}