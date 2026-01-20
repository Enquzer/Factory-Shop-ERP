"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Scissors, 
  CheckCircle2, 
  XCircle, 
  Package, 
  Calendar,
  User,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import { 
  getCuttingRecords, 
  createCuttingRecord,
  updateCuttingItem,
  completeCutting,
  qcCheckCutting,
  handoverToProduction,
  notifySewing,
  acceptCut,
  CuttingRecord,
  CuttingItem,
  ProductComponent
} from '@/lib/cutting';
import { getMarketingOrders, MarketingOrder } from '@/lib/marketing-orders';
import { format } from 'date-fns';
import Image from 'next/image';

export default function CuttingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<CuttingRecord[]>([]);
  const [orders, setOrders] = useState<MarketingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<CuttingRecord | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isQCDialogOpen, setIsQCDialogOpen] = useState(false);
  const [isHandoverDialogOpen, setIsHandoverDialogOpen] = useState(false);
  const [isAcceptCutDialogOpen, setIsAcceptCutDialogOpen] = useState(false);
  const [qcPassed, setQcPassed] = useState(true);
  const [qcRemarks, setQcRemarks] = useState('');
  const [productionReceiverName, setProductionReceiverName] = useState('');
  const [sewingResponsiblePerson, setSewingResponsiblePerson] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cuttingData, ordersData] = await Promise.all([
        getCuttingRecords(),
        getMarketingOrders()
      ]);
      setRecords(cuttingData);
      // Filter orders that are ready for cutting (planning approved, not yet cut)
      setOrders(ordersData.filter(o => 
        o.isPlanningApproved && 
        o.status === 'Cutting' &&
        (!o.cuttingStatus || o.cuttingStatus === 'not_started')
      ));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load cutting data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartCutting = async (orderId: string) => {
    try {
      const recordId = await createCuttingRecord(orderId);
      toast({
        title: "Success",
        description: "Cutting record created successfully"
      });
      fetchData();
    } catch (error) {
      console.error('Error creating cutting record:', error);
      toast({
        title: "Error",
        description: "Failed to create cutting record",
        variant: "destructive"
      });
    }
  };

  const handleUpdateItem = async (itemId: number, updates: Partial<CuttingItem>) => {
    try {
      await updateCuttingItem(itemId, updates);
      // Removed noisy toast as per user request
      fetchData();
    } catch (error) {
      console.error('Error updating item:', error);
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive"
      });
    }
  };

  const handleCompleteCutting = async (recordId: number) => {
    try {
      await completeCutting(recordId);
      toast({
        title: "Success",
        description: "Cutting marked as completed"
      });
      fetchData();
      setIsDetailDialogOpen(false);
    } catch (error) {
      console.error('Error completing cutting:', error);
      toast({
        title: "Error",
        description: "Failed to complete cutting",
        variant: "destructive"
      });
    }
  };

  const handleQCCheck = async () => {
    if (!selectedRecord) return;
    try {
      await qcCheckCutting(selectedRecord.id, qcPassed, qcRemarks);
      toast({
        title: "Success",
        description: `QC check ${qcPassed ? 'passed' : 'failed'}`
      });
      setIsQCDialogOpen(false);
      setQcRemarks('');
      fetchData();
    } catch (error) {
      console.error('Error QC checking:', error);
      toast({
        title: "Error",
        description: "Failed to perform QC check",
        variant: "destructive"
      });
    }
  };

  const handleHandover = async () => {
    if (!selectedRecord || !productionReceiverName.trim()) {
      toast({
        title: "Error",
        description: "Please enter production receiver name",
        variant: "destructive"
      });
      return;
    }
    try {
      await handoverToProduction(selectedRecord.id, productionReceiverName);
      toast({
        title: "Success",
        description: "Handed over to production successfully"
      });
      setIsHandoverDialogOpen(false);
      setProductionReceiverName('');
      fetchData();
    } catch (error) {
      console.error('Error handing over:', error);
      toast({
        title: "Error",
        description: "Failed to handover to production",
        variant: "destructive"
      });
    }
  };



  const handleAcceptCut = async () => {
    if (!selectedRecord) return;
    try {
      await acceptCut(selectedRecord.id, sewingResponsiblePerson);
      toast({
        title: "Success",
        description: "Cut panels have been accepted"
      });
      setIsAcceptCutDialogOpen(false);
      setSewingResponsiblePerson('');
      fetchData();
    } catch (error) {
      console.error('Error accepting cut panels:', error);
      toast({
        title: "Error",
        description: "Failed to accept cut panels",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: any }> = {
      'not_started': { label: 'Not Started', variant: 'secondary' },
      'in_progress': { label: 'In Progress', variant: 'default' },
      'completed': { label: 'Completed', variant: 'outline' },
      'qc_pending': { label: 'QC Pending', variant: 'secondary' },
      'qc_passed': { label: 'QC Passed', variant: 'default' },
      'qc_failed': { label: 'QC Failed', variant: 'destructive' },
      'handed_over': { label: 'Handed Over', variant: 'default' }
    };
    const config = statusConfig[status] || { label: status, variant: 'secondary' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTotalCutPercentage = (record: CuttingRecord) => {
    if (!record.items || record.items.length === 0) return 0;
    const totalQty = record.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalCut = record.items.reduce((sum, item) => sum + item.cutQuantity, 0);
    return totalQty > 0 ? Math.round((totalCut / totalQty) * 100) : 0;
  };

  if (!user || !['factory', 'cutting', 'planning', 'quality_inspection'].includes(user.role)) {
    return <div className="p-8 text-center">Unauthorized Access</div>;
  }

  const canStartCutting = ['factory', 'cutting'].includes(user.role);
  const canQC = ['factory', 'quality_inspection', 'cutting'].includes(user.role);

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Cutting Department
          </h1>
          <p className="text-muted-foreground">Manage cutting operations, QC checks, and handover to production</p>
        </div>
        <Button onClick={fetchData} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Orders Ready for Cutting */}
      {canStartCutting && orders.length > 0 && (
        <Card className="border-primary/20 shadow-lg">
          <CardHeader className="bg-primary/5">
            <CardTitle className="flex items-center text-lg">
              <Package className="mr-2 h-5 w-5 text-primary" />
              Orders Ready for Cutting ({orders.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order No</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Planning Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.orderNumber}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {order.imageUrl && (
                          <Image 
                            src={order.imageUrl} 
                            alt={order.productName}
                            width={32}
                            height={32}
                            className="rounded object-cover"
                          />
                        )}
                        <div>
                          <div className="font-medium text-sm">{order.productCode}</div>
                          <div className="text-xs text-muted-foreground">{order.productName}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{order.quantity}</TableCell>
                    <TableCell className="text-sm">
                      {order.sewingStartDate ? format(new Date(order.sewingStartDate), 'PP') : '--'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        onClick={() => handleStartCutting(order.id)}
                        className="shadow-md"
                      >
                        <Scissors className="mr-2 h-4 w-4" />
                        Start Cutting
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Cutting Records */}
      <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
        <CardHeader className="bg-primary/5 border-b">
          <CardTitle className="flex items-center text-lg">
            <Scissors className="mr-2 h-5 w-5 text-primary" />
            Cutting Records ({records.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : records.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No cutting records found</div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-center">Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>QC Status</TableHead>
                  <TableHead>Handover</TableHead>
                  <TableHead>Sewing Notif.</TableHead>
                  <TableHead>Sewing Acc.</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => {
                  const progress = getTotalCutPercentage(record);
                  return (
                    <TableRow key={record.id} className="hover:bg-primary/5 transition-colors">
                      <TableCell className="font-medium">{record.orderNumber}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {record.imageUrl && (
                            <Image 
                              src={record.imageUrl} 
                              alt={record.productName}
                              width={40}
                              height={40}
                              className="rounded object-cover border"
                            />
                          )}
                          <div>
                            <div className="font-medium text-sm">{record.productCode}</div>
                            <div className="text-xs text-muted-foreground">{record.productName}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                            <div 
                              className="h-full bg-primary transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium w-12 text-right">{progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell className="text-sm">
                        {record.cuttingStartDate ? format(new Date(record.cuttingStartDate), 'PP') : '--'}
                      </TableCell>
                      <TableCell>
                        {record.qcPassed ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Passed
                          </Badge>
                        ) : record.qcCheckDate ? (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Failed
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.handedOverToProduction ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Handed Over
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Not Yet</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.sewingNotified ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Notified
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.sewingAccepted ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Accepted
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Not Yet</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedRecord(record);
                            setIsDetailDialogOpen(true);
                          }}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Scissors className="h-6 w-6 text-primary" />
              Cutting Details - {selectedRecord?.orderNumber}
              {selectedRecord && getStatusBadge(selectedRecord.status)}
            </DialogTitle>
          </DialogHeader>
          
          {selectedRecord && (
            <div className="flex-1 overflow-y-auto space-y-6 py-4">
              {/* Product Info */}
              <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                {selectedRecord.imageUrl && (
                  <Image 
                    src={selectedRecord.imageUrl} 
                    alt={selectedRecord.productName}
                    width={100}
                    height={100}
                    className="rounded-lg object-cover border-2 border-primary/20"
                  />
                )}
                <div className="flex-1 space-y-2">
                  <div>
                    <div className="text-sm text-muted-foreground">Product Code</div>
                    <div className="font-semibold text-lg">{selectedRecord.productCode}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Product Name</div>
                    <div className="font-medium">{selectedRecord.productName}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-2">
                    <div>
                      <div className="text-xs text-muted-foreground">Started By</div>
                      <div className="font-medium text-sm">{selectedRecord.cuttingBy || '--'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Start Date</div>
                      <div className="font-medium text-sm">
                        {selectedRecord.cuttingStartDate ? format(new Date(selectedRecord.cuttingStartDate), 'PP') : '--'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Completed Date</div>
                      <div className="font-medium text-sm">
                        {selectedRecord.cuttingCompletedDate ? format(new Date(selectedRecord.cuttingCompletedDate), 'PP') : '--'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Size & Color Breakdown */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Size & Color Breakdown
                </h3>
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Size</TableHead>
                      <TableHead>Color</TableHead>
                      <TableHead className="text-right">Total Qty</TableHead>
                      <TableHead className="text-right">Cut Qty</TableHead>
                      <TableHead className="text-right">QC Passed</TableHead>
                      <TableHead className="text-right">QC Rejected</TableHead>
                      <TableHead>Components</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedRecord.items?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.size}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.color}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          <Input 
                            type="number"
                            className="w-20 h-8 text-right"
                            value={item.cutQuantity}
                            max={item.quantity}
                            onChange={(e) => handleUpdateItem(item.id, { 
                              cutQuantity: Math.min(parseInt(e.target.value) || 0, item.quantity) 
                            })}
                            disabled={selectedRecord.status === 'handed_over'}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input 
                            type="number"
                            className="w-20 h-8 text-right"
                            value={item.qcPassedQuantity}
                            max={item.cutQuantity}
                            onChange={(e) => handleUpdateItem(item.id, { 
                              qcPassedQuantity: Math.min(parseInt(e.target.value) || 0, item.cutQuantity) 
                            })}
                            disabled={selectedRecord.status === 'handed_over'}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input 
                            type="number"
                            className="w-20 h-8 text-right"
                            value={item.qcRejectedQuantity}
                            onChange={(e) => handleUpdateItem(item.id, { 
                              qcRejectedQuantity: parseInt(e.target.value) || 0 
                            })}
                            disabled={selectedRecord.status === 'handed_over'}
                          />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.componentsCut || 'Not specified'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* QC Information */}
              {selectedRecord.qcCheckDate && (
                <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    {selectedRecord.qcPassed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    QC Check Result
                  </h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Checked By</div>
                      <div className="font-medium">{selectedRecord.qcCheckedBy}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Check Date</div>
                      <div className="font-medium">{format(new Date(selectedRecord.qcCheckDate), 'PP')}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Result</div>
                      <div className="font-medium">{selectedRecord.qcPassed ? 'Passed' : 'Failed'}</div>
                    </div>
                  </div>
                  {selectedRecord.qcRemarks && (
                    <div>
                      <div className="text-sm text-muted-foreground">Remarks</div>
                      <div className="text-sm">{selectedRecord.qcRemarks}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Handover Information */}
              {selectedRecord.handedOverToProduction && (
                <div className="p-4 bg-primary/5 rounded-lg space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    Handover to Production
                  </h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Handed Over By</div>
                      <div className="font-medium">{selectedRecord.handoverBy}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Handover Date</div>
                      <div className="font-medium">
                        {selectedRecord.handoverDate ? format(new Date(selectedRecord.handoverDate), 'PP') : '--'}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Received By</div>
                      <div className="font-medium">{selectedRecord.productionReceivedBy}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sewing Notification Information */}
              {selectedRecord.sewingNotified && (
                <div className="p-4 bg-blue-50 rounded-lg space-y-2 border border-blue-200">
                  <h3 className="font-semibold flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600" />
                    Sewing Notification
                  </h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Notified On</div>
                      <div className="font-medium">
                        {selectedRecord.sewingNotifiedDate ? format(new Date(selectedRecord.sewingNotifiedDate), 'PP') : '--'}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Sewing Accepted</div>
                      <div className="font-medium">
                        {selectedRecord.sewingAccepted ? 'Yes' : 'No'}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Sewing Responsible</div>
                      <div className="font-medium">{selectedRecord.sewingResponsiblePerson || '--'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sewing Acceptance Information */}
              {selectedRecord.sewingAccepted && (
                <div className="p-4 bg-purple-50 rounded-lg space-y-2 border border-purple-200">
                  <h3 className="font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-purple-600" />
                    Sewing Acceptance
                  </h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Accepted By</div>
                      <div className="font-medium">{selectedRecord.sewingAcceptedBy}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Accepted On</div>
                      <div className="font-medium">
                        {selectedRecord.sewingAcceptedDate ? format(new Date(selectedRecord.sewingAcceptedDate), 'PP') : '--'}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Handover to Sewing</div>
                      <div className="font-medium">
                        {selectedRecord.actualHandoverToSewing ? format(new Date(selectedRecord.actualHandoverToSewing), 'PP') : '--'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* KPI Tracking Information */}
              {(selectedRecord.cuttingDelayDays > 0 || selectedRecord.sewingStartDelayDays > 0) && (
                <div className="p-4 bg-yellow-50 rounded-lg space-y-2 border border-yellow-200">
                  <h3 className="font-semibold flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-yellow-600" />
                    KPI Tracking
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Cutting Delay (Days)</div>
                      <div className="font-medium text-red-600">{selectedRecord.cuttingDelayDays}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Sewing Start Delay (Days)</div>
                      <div className="font-medium text-red-600">{selectedRecord.sewingStartDelayDays}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="border-t pt-4">
            <div className="flex gap-2 w-full justify-between">
              <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                Close
              </Button>
              <div className="flex gap-2">
                {selectedRecord && selectedRecord.status === 'in_progress' && canStartCutting && (
                  <Button 
                    onClick={() => handleCompleteCutting(selectedRecord.id)}
                    className="shadow-md"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Mark as Completed
                  </Button>
                )}
                {selectedRecord && selectedRecord.status === 'completed' && canQC && !selectedRecord.qcCheckDate && (
                  <Button 
                    onClick={() => {
                      setIsDetailDialogOpen(false);
                      setIsQCDialogOpen(true);
                    }}
                    className="shadow-md"
                  >
                    <AlertCircle className="mr-2 h-4 w-4" />
                    QC Check
                  </Button>
                )}
                {selectedRecord && selectedRecord.qcPassed && !selectedRecord.handedOverToProduction && canStartCutting && (
                  <Button 
                    onClick={() => {
                      setIsDetailDialogOpen(false);
                      setIsHandoverDialogOpen(true);
                    }}
                    className="shadow-md bg-green-600 hover:bg-green-700"
                  >
                    <Package className="mr-2 h-4 w-4" />
                    Handover to Production
                  </Button>
                )}

                {user?.role === 'sewing' && selectedRecord && selectedRecord.sewingNotified === 1 && selectedRecord.sewingAccepted !== 1 && (
                  <Button 
                    onClick={() => {
                      setIsDetailDialogOpen(false);
                      setIsAcceptCutDialogOpen(true);
                    }}
                    className="shadow-md bg-purple-600 hover:bg-purple-700"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Accept Cut Panels
                  </Button>
                )}
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QC Check Dialog */}
      <Dialog open={isQCDialogOpen} onOpenChange={setIsQCDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              Quality Control Check
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-4">
              <Button
                variant={qcPassed ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setQcPassed(true)}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Pass
              </Button>
              <Button
                variant={!qcPassed ? 'destructive' : 'outline'}
                className="flex-1"
                onClick={() => setQcPassed(false)}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Fail
              </Button>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">QC Remarks</label>
              <Textarea
                placeholder="Enter QC remarks..."
                value={qcRemarks}
                onChange={(e) => setQcRemarks(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsQCDialogOpen(false);
              setQcRemarks('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleQCCheck}>
              Submit QC Check
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Handover Dialog */}
      <Dialog open={isHandoverDialogOpen} onOpenChange={setIsHandoverDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Handover to Production
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Production Receiver Name *</label>
              <Input
                placeholder="Enter name of person receiving in production..."
                value={productionReceiverName}
                onChange={(e) => setProductionReceiverName(e.target.value)}
              />
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">
                By confirming this handover, you certify that:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                <li>All pieces have been cut according to specifications</li>
                <li>QC check has been passed</li>
                <li>All components are ready for production</li>
                <li>Size and color breakdown is accurate</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsHandoverDialogOpen(false);
              setProductionReceiverName('');
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleHandover}
              className="bg-green-600 hover:bg-green-700"
            >
              Confirm Handover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      {/* Accept Cut Panels Dialog */}
      <Dialog open={isAcceptCutDialogOpen} onOpenChange={setIsAcceptCutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Accept Cut Panels
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-800">
                By accepting these cut panels, you confirm that you have received the materials and are ready to start the sewing process.
              </p>
            </div>
            <div className="space-y-2">
              <p className="font-medium">Order Information:</p>
              {selectedRecord && (
                <div className="text-sm space-y-1">
                  <p>Order Number: <span className="font-medium">{selectedRecord.orderNumber}</span></p>
                  <p>Product: <span className="font-medium">{selectedRecord.productName}</span></p>
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Sewing Responsible Person *</label>
              <Input
                placeholder="Enter your name or responsible person..."
                value={sewingResponsiblePerson}
                onChange={(e) => setSewingResponsiblePerson(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAcceptCutDialogOpen(false);
              setSewingResponsiblePerson('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleAcceptCut} className="bg-purple-600 hover:bg-purple-700">
              Accept Panels
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
