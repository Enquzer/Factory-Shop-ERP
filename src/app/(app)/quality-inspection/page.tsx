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
import { getCuttingRecords, CuttingRecord, qcCheckCutting } from '@/lib/cutting';
import { Scissors } from 'lucide-react';
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
  DialogDescription,
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
import { QualityInspectionMatrix } from '@/components/production/quality-inspection-matrix';

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
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
  const [factoryProfile, setFactoryProfile] = useState<any>(null);
  const [cuttingRecords, setCuttingRecords] = useState<CuttingRecord[]>([]);
  const [selectedCuttingRecord, setSelectedCuttingRecord] = useState<CuttingRecord | null>(null);
  const [isCuttingQCDialogOpen, setIsCuttingQCDialogOpen] = useState(false);
  const [cuttingQcPassed, setCuttingQcPassed] = useState(true);
  const [cuttingQcRemarks, setCuttingQcRemarks] = useState('');

  // New Inspection Form State
  const [formData, setFormData] = useState<Partial<QualityInspection>>({
    date: new Date().toISOString().split('T')[0],
    stage: 'Inline-Sewing',
    status: 'Passed',
    quantityInspected: 0,
    sampleSize: 0,
    totalCritical: 0,
    totalMajor: 0,
    totalMinor: 0,
    defectJson: '',
    quantityPassed: 0,
    quantityRejected: 0,
    size: '',
    color: '',
    remarks: '',
    reportUrl: ''
  });

  const handleMatrixUpdate = useCallback((data: any) => {
    setFormData(prev => {
      const hasChanges = 
        prev.sampleSize !== data.sampleSize ||
        prev.totalCritical !== data.totalCritical ||
        prev.totalMajor !== data.totalMajor ||
        prev.totalMinor !== data.totalMinor ||
        prev.defectJson !== data.defectJson ||
        prev.status !== data.status;

      if (!hasChanges) return prev;

      return {
        ...prev,
        sampleSize: data.sampleSize,
        totalCritical: data.totalCritical,
        totalMajor: data.totalMajor,
        totalMinor: data.totalMinor,
        defectJson: data.defectJson,
        status: data.status as any,
        quantityInspected: data.sampleSize,
        quantityPassed: data.sampleSize - data.totalMajor - data.totalMinor - data.totalCritical,
        quantityRejected: data.totalMajor + data.totalMinor + data.totalCritical
      };
    });
  }, []);

  // Check if user has quality inspection role, otherwise redirect
  useEffect(() => {
    if (!isLoading && (!user || (user.role !== 'quality_inspection' && user.role !== 'factory' && user.role !== 'planning'))) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const [fetchedOrders, cuttingData] = await Promise.all([
        getMarketingOrders(),
        getCuttingRecords()
      ]);
      // Show orders currently in production or finishing
      const activeProductionStatuses = ['Sample Making', 'Cutting', 'Sewing', 'Finishing', 'Quality Inspection'];
      const filtered = fetchedOrders.filter(o => activeProductionStatuses.includes(o.status) && !o.isCompleted);
      setOrders(filtered);
      setCuttingRecords(cuttingData);
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

  const handleGeneratePdfForInspection = async (order: MarketingOrder) => {
    if (!order.id) return;
    
    setGeneratingPdfId(order.id);
    try {
      // Fetch the latest inspection for this order
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const response = await fetch(`/api/quality-inspection?orderId=${order.id}`, {
        headers
      });
      if (!response.ok) throw new Error('Failed to fetch inspection data');
      
      const inspections = await response.json();
      const latestInspection = inspections[0]; // Assuming latest is first
      
      if (!latestInspection) {
        toast({ title: "Error", description: "No inspection found for this order", variant: "destructive" });
        return;
      }
      
      // Generate PDF
      const pdfBlob = await generateQCPDF(
        order, 
        latestInspection,
        factoryProfile?.name,
        factoryProfile?.address,
        factoryProfile?.email
      );
      
      const reportFile = new File([pdfBlob], `QC_Report_${order.orderNumber}_${latestInspection.stage}.pdf`, { type: 'application/pdf' });
      
      // Upload to server
      const uploadFormData = new FormData();
      uploadFormData.append('file', reportFile);
      uploadFormData.append('filename', reportFile.name);
      
      const uploadHeaders: Record<string, string> = {};
      if (token) uploadHeaders['Authorization'] = `Bearer ${token}`;
      
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: uploadHeaders,
        body: uploadFormData
      });
      
      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        
        // Update the order with the new report URL and set quality inspection status
        const updateResponse = await fetch(`/api/marketing-orders/${order.id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ 
            qualityInspectionReportUrl: uploadData.url,
            qualityInspectionStatus: 'Completed'
          })
        });
        
        if (updateResponse.ok) {
          toast({ title: "Success", description: "PDF generated and saved successfully" });
          // Update the order in the local state immediately
          setOrders(prevOrders => 
            prevOrders.map(ord => 
              ord.id === order.id 
                ? { ...ord, qualityInspectionReportUrl: uploadData.url, qualityInspectionStatus: 'Approved' as 'Approved' }
                : ord
            )
          );
          fetchOrders(); // Refresh the list
        } else {
          throw new Error('Failed to update order with PDF URL');
        }
      } else {
        throw new Error('Failed to upload PDF');
      }
    } catch (error) {
      console.error("PDF Generation Error:", error);
      toast({ title: "Error", description: "Failed to generate PDF", variant: "destructive" });
    } finally {
      setGeneratingPdfId(null);
    }
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
            finalReportUrl = uploadData.url;
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

  const handleCuttingQCCheck = async () => {
    if (!selectedCuttingRecord) return;
    try {
      await qcCheckCutting(selectedCuttingRecord.id, cuttingQcPassed, cuttingQcRemarks);
      toast({
        title: "Success",
        description: `Cutting QC check ${cuttingQcPassed ? 'passed' : 'failed'}`
      });
      setIsCuttingQCDialogOpen(false);
      setCuttingQcRemarks('');
      fetchOrders();
    } catch (error) {
      console.error('Error QC checking cutting:', error);
      toast({
        title: "Error",
        description: "Failed to perform QC check",
        variant: "destructive"
      });
    }
  };

  const pendingCuttingQC = cuttingRecords.filter(r => r.status === 'qc_pending');

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
              <p className="text-xs font-bold text-muted-foreground uppercase">Cutting QC Pending</p>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </div>
            <div className="text-2xl font-bold mt-1">{pendingCuttingQC.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Cutting QC Section */}
      {pendingCuttingQC.length > 0 && (
        <Card className="border-none shadow-xl bg-amber-50/30 overflow-hidden mb-8 border border-amber-200">
          <CardHeader className="bg-amber-100/50 border-b">
            <CardTitle className="flex items-center gap-2">
              <Scissors className="h-5 w-5 text-amber-600" />
              Cutting Batch QC Requests
            </CardTitle>
            <CardDescription>Cutting batches waiting for initial piece inspection.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Completed Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingCuttingQC.map((record) => (
                  <TableRow key={record.id} className="hover:bg-amber-100/20">
                    <TableCell className="font-bold">{record.orderNumber}</TableCell>
                    <TableCell>{record.productName}</TableCell>
                    <TableCell>
                       {record.items?.reduce((sum, item) => sum + item.cutQuantity, 0)} Units
                    </TableCell>
                    <TableCell>
                      {record.cuttingCompletedDate ? format(new Date(record.cuttingCompletedDate), 'PP') : '--'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        variant="default"
                        className="bg-amber-600 hover:bg-amber-700"
                        onClick={() => {
                          setSelectedCuttingRecord(record);
                          setIsCuttingQCDialogOpen(true);
                        }}
                      >
                        Perform QC
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

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
                               width={64} 
                               height={64} 
                               className="object-cover w-full h-full"
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
                             <Button
                               size="sm"
                               variant="outline"
                               className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                               onClick={() => {
                                 if (order.qualityInspectionReportUrl && order.qualityInspectionReportUrl.startsWith('/uploads/')) {
                                   // If it's a local file, use the direct download
                                   downloadPdf(order.qualityInspectionReportUrl, `QC_Report_${order.orderNumber}.pdf`);
                                 } else {
                                   // If we have an order ID, use the API endpoint
                                   if (order.id) {
                                     downloadQcPdf(order.id, order.qualityInspectionStage || '', order.orderNumber);
                                   }
                                 }
                               }}
                               title="Download PDF"
                               disabled={!order.id}
                             >
                               <FileDown className="h-4 w-4" />
                             </Button>

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
        <DialogContent className="max-w-6xl h-[95vh] flex flex-col p-0 overflow-hidden bg-white border-none shadow-2xl">
          <DialogHeader className="p-6 border-b bg-white shrink-0">
            <DialogTitle className="flex items-center gap-3 text-2xl font-black text-slate-800">
               <div className="p-2 bg-emerald-100 rounded-lg">
                  <ClipboardCheck className="h-6 w-6 text-emerald-600" />
               </div>
               New Quality Inspection Record
               <Badge variant="outline" className="ml-2 bg-slate-50 text-slate-500 font-mono">{selectedOrder?.orderNumber}</Badge>
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">
              Perform a professional AQL-based inspection. All defects and status are auto-calculated.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto bg-slate-50/30">
             {/* Top Info Section */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 border-b bg-white shadow-sm">
                <div className="space-y-4">
                   <div>
                      <label className="text-xs font-black mb-1.5 block text-slate-500 uppercase tracking-widest">Inspection Stage *</label>
                      <Select 
                         value={formData.stage} 
                         onValueChange={(v: any) => setFormData({...formData, stage: v})}
                      >
                         <SelectTrigger className="bg-slate-50 border-slate-200 h-11 focus:ring-emerald-500">
                            <SelectValue placeholder="Select Stage" />
                         </SelectTrigger>
                         <SelectContent>
                            <SelectItem value="Sample" className="font-bold">Sample Approval</SelectItem>
                            <SelectItem value="Order" className="font-bold">Order Pre-start</SelectItem>
                            <SelectItem value="Inline-Cutting" className="font-bold text-amber-600">Inline Cutting</SelectItem>
                            <SelectItem value="Inline-Sewing" className="font-bold text-blue-600">Inline Sewing</SelectItem>
                            <SelectItem value="Final" className="font-bold text-red-600">Final Audit</SelectItem>
                         </SelectContent>
                      </Select>
                   </div>
                   <div>
                      <label className="text-xs font-black mb-1.5 block text-slate-500 uppercase tracking-widest">Inspection Date *</label>
                      <Input 
                         type="date" 
                         className="h-11 border-slate-200 bg-slate-50"
                         value={formData.date}
                         onChange={(e) => setFormData({...formData, date: e.target.value})}
                      />
                   </div>
                </div>
                
                <div className="space-y-4">
                   <div className="grid grid-cols-2 gap-3">
                      <div>
                         <label className="text-xs font-black mb-1.5 block text-slate-500 uppercase tracking-widest">Size Specification</label>
                         <Input 
                            placeholder="e.g. XL"
                            className="h-11 border-slate-200 bg-slate-50"
                            value={formData.size}
                            onChange={(e) => setFormData({...formData, size: e.target.value})}
                         />
                      </div>
                      <div>
                         <label className="text-xs font-black mb-1.5 block text-slate-500 uppercase tracking-widest">Color / Shade</label>
                         <Input 
                            placeholder="e.g. Navy Blue"
                            className="h-11 border-slate-200 bg-slate-50"
                            value={formData.color}
                            onChange={(e) => setFormData({...formData, color: e.target.value})}
                         />
                      </div>
                   </div>
                   <div>
                      <label className="text-xs font-black mb-1.5 block text-slate-500 uppercase tracking-widest">External Report (Optional)</label>
                      <Input 
                         placeholder="Paste link to external photos/docs"
                         className="h-11 border-slate-200 bg-slate-50"
                         value={formData.reportUrl}
                         onChange={(e) => setFormData({...formData, reportUrl: e.target.value})}
                      />
                   </div>
                </div>

                <div className="space-y-4">
                   <div className="p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-100 shadow-sm h-full flex flex-col justify-center">
                      <label className="text-[10px] font-black mb-3 block text-emerald-600 uppercase tracking-[0.2em] text-center">Current Inspection Verdict</label>
                      <div className="flex flex-wrap gap-2 justify-center">
                          {['Passed', 'Failed', 'Approved', 'Rejected', 'Rework'].map((stat) => (
                              <Button 
                                 key={stat}
                                 size="sm" 
                                 variant={formData.status === stat ? 'default' : 'outline'}
                                 className={cn(
                                   "h-9 px-4 text-xs font-black transition-all rounded-full",
                                   formData.status === stat ? (
                                     (stat === 'Passed' || stat === 'Approved') ? "bg-emerald-600 hover:bg-emerald-700 shadow-md scale-110" :
                                     (stat === 'Failed' || stat === 'Rejected') ? "bg-red-600 hover:bg-red-700 shadow-md scale-110" :
                                     "bg-amber-500 hover:bg-amber-600 shadow-md scale-110"
                                   ) : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                                 )}
                                 onClick={() => setFormData({...formData, status: stat as any})}
                              >
                                 {stat}
                              </Button>
                          ))}
                      </div>
                   </div>
                </div>
             </div>

             <div className="p-8">
                <div className="space-y-10">
                    <QualityInspectionMatrix 
                       orderQuantity={selectedOrder?.quantity || 1}
                       initialData={formData.defectJson}
                       onUpdate={handleMatrixUpdate}
                    />

                    <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
                       <label className="text-sm font-black block text-slate-800 uppercase tracking-tight">Inspector Remarks & Quality Findings</label>
                       <Textarea 
                          placeholder="Document any quality issues, needle breakage, shading problems, or general observations here..."
                          className="min-h-[120px] bg-slate-50 border-slate-200 focus:bg-white transition-all text-base"
                          value={formData.remarks}
                          onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                       />
                       <p className="text-[10px] text-slate-400 italic">These remarks will be included in the auto-generated PDF report.</p>
                    </div>
                </div>
             </div>
          </div>

          <DialogFooter className="p-6 bg-slate-50 border-t shrink-0 flex items-center justify-between sm:justify-between gap-4">
             <div className="hidden md:flex items-center gap-2 text-slate-500">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-tighter">Live AQL Monitoring Active</span>
             </div>
             <div className="flex gap-3 w-full md:w-auto">
                <Button variant="outline" className="flex-1 md:flex-none h-11 px-8 font-bold border-slate-300" onClick={() => setIsInspectionDialogOpen(false)}>Discard</Button>
                <Button 
                   className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 h-11 shadow-xl min-w-[280px] font-black text-lg rounded-xl transition-all hover:scale-105 active:scale-95" 
                   onClick={handleSubmitInspection}
                   disabled={isGeneratingReport}
                 >
                   {isGeneratingReport ? (
                     <>
                       <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                       Finalizing Report...
                     </>
                   ) : (
                     <>
                       <FileCheck className="mr-3 h-6 w-6" />
                       COMPLETE & SAVE INSPECTION
                     </>
                   )}
                 </Button>
             </div>
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
             <DialogDescription>
               View all inspection records for this order.
             </DialogDescription>
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
                                  {ins.reportUrl ? (
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
                                  ) : (
                                    <button 
                                      onClick={() => selectedOrder && downloadQcPdf(selectedOrder.id, ins.stage, selectedOrder.orderNumber)}
                                      className="flex items-center gap-1.5 text-[10px] text-gray-500 font-bold hover:bg-gray-50 w-fit p-1 px-2 rounded-md border border-gray-200 transition-colors shadow-sm"
                                    >
                                      <FileText className="h-3 w-3" />
                                      Generate Report
                                    </button>
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
                         <div className="flex gap-2">
                           <Button 
                             size="sm" 
                             variant="link" 
                             className="p-0 h-auto text-emerald-600 font-bold" 
                             onClick={() => {
                               if (ins.reportUrl) {
                                 window.open(ins.reportUrl, '_blank');
                               } else if (selectedOrder?.id) {
                                 downloadQcPdf(selectedOrder.id, ins.stage, selectedOrder.orderNumber);
                               }
                             }}
                           >
                             <FileText className="mr-1 h-3.5 w-3.5" />
                             {ins.reportUrl ? 'View Report' : 'Preview Report'}
                           </Button>
                           <Button
                             size="sm"
                             variant="outline"
                             className="h-7 text-xs text-red-600 hover:text-red-700 border-red-200"
                             onClick={() => {
                               if (ins.reportUrl && ins.reportUrl.startsWith('/uploads/')) {
                                 // If it's a local file, use the direct download
                                 downloadPdf(ins.reportUrl, `QC_Report_${selectedOrder?.orderNumber}_${ins.stage}.pdf`);
                               } else {
                                 // If we have an order ID, use the API endpoint
                                 if (selectedOrder?.id) {
                                   downloadQcPdf(selectedOrder.id, ins.stage, selectedOrder.orderNumber);
                                 }
                               }
                             }}
                           >
                             <FileDown className="mr-1 h-3 w-3" />
                             Download
                           </Button>
                         </div>

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
      
      {/* Cutting QC Dialog */}
      <Dialog open={isCuttingQCDialogOpen} onOpenChange={setIsCuttingQCDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scissors className="h-5 w-5 text-amber-600" />
              Cutting Batch QC Check
            </DialogTitle>
            <DialogDescription>
              Perform quality check on the cutting batch before moving to production.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="text-sm font-medium">Batch Details:</div>
              <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                <div>Order: <span className="font-bold">{selectedCuttingRecord?.orderNumber}</span></div>
                <div>Product: <span className="font-bold">{selectedCuttingRecord?.productName}</span></div>
                <div>Batch ID: <span className="font-bold">{selectedCuttingRecord?.id}</span></div>
                <div>Status: <span className="font-bold text-amber-600 font-mono text-xs italic">{selectedCuttingRecord?.status}</span></div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                variant={cuttingQcPassed ? 'default' : 'outline'}
                className={cn("flex-1", cuttingQcPassed && "bg-emerald-600 hover:bg-emerald-700")}
                onClick={() => setCuttingQcPassed(true)}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Pass Batch
              </Button>
              <Button
                variant={!cuttingQcPassed ? 'destructive' : 'outline'}
                className="flex-1"
                onClick={() => setCuttingQcPassed(false)}
              >
                <X className="mr-2 h-4 w-4" />
                Fail Batch
              </Button>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">QC Remarks</label>
              <Textarea
                placeholder="Enter QC remarks for this cutting batch..."
                value={cuttingQcRemarks}
                onChange={(e) => setCuttingQcRemarks(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCuttingQCDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCuttingQCCheck}
              className={cuttingQcPassed ? "bg-emerald-600 hover:bg-emerald-700" : ""}
            >
              Submit Check
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const downloadPdf = (url: string | undefined, filename: string) => {
  if (!url) return;
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const downloadQcPdf = async (orderId: string, stage: string, orderNumber: string) => {
  try {
    console.log('Starting PDF download for order:', orderId, 'stage:', stage);
    
    // Get auth token from localStorage
    const token = localStorage.getItem('authToken');
    
    // Fetch the PDF with proper authentication
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const url = `/api/quality-inspection/pdf?orderId=${orderId}&stage=${encodeURIComponent(stage)}`;
    console.log('Fetching PDF from:', url);
    
    const response = await fetch(url, {
      headers
    });
    
    console.log('Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      let errorMessage = `Failed to download PDF: ${response.statusText}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.details) {
          errorMessage += ` - ${errorJson.details}`;
        }
      } catch (e) {
        // Not JSON, use raw text
        if (errorText) {
          errorMessage += ` - ${errorText}`;
        }
      }
      
      throw new Error(errorMessage);
    }
    
    // Get the blob data
    const blob = await response.blob();
    console.log('Received blob, size:', blob.size, 'type:', blob.type);
    
    if (blob.size === 0) {
      throw new Error('Received empty PDF file');
    }
    
    // Create a download link
    const objectUrl = window.URL.createObjectURL(blob);
    const fileName = `QC_Report_${orderNumber}_${stage}.pdf`;
    
    console.log('Creating download link for:', fileName);
    
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    link.style.display = 'none'; // Hide the link
    
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);
    
    console.log('PDF download initiated successfully');
  } catch (error) {
    console.error('Error downloading PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    alert(`Failed to download PDF. ${errorMessage}`);
  }
};
