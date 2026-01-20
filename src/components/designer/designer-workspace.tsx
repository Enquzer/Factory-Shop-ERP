
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Style } from '@/lib/styles-sqlite';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Loader2, Send, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { GeneralTab } from '@/components/designer/general-tab';
import { BomTab } from '@/components/designer/bom-tab';
import { MeasurementsTab } from '@/components/designer/measurements-tab';
import { TechPackTab } from '@/components/designer/techpack-tab';
import { useAuth } from '@/contexts/auth-context';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface DesignerWorkspaceProps {
  style?: Style;
  isNew?: boolean;
}

export function DesignerWorkspace({ style, isNew = false }: DesignerWorkspaceProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("general");
  const [isSaving, setIsSaving] = useState(false);
  
  // Factory Approval State
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [rejectionOpen, setRejectionOpen] = useState(false);
  const [approvalData, setApprovalData] = useState({ price: 0, minStock: 10 });
  const [rejectionReason, setRejectionReason] = useState('');

  // If isNew, we only show General tab initially effectively, or handle creation on first save.
  // For simplicity, we'll manage a local 'style' state that mimics the DB object.
  const [currentStyle, setCurrentStyle] = useState<Partial<Style>>(style || {
    name: '',
    number: '',
    status: 'Development',
    version: 1,
    isActive: 1,
    sampleApproved: 0,
    bom: [],
    measurements: [],
    attachments: []
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
        if (isNew) {
            const res = await fetch('/api/designer/styles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(currentStyle)
            });
            if (!res.ok) throw new Error('Failed to create style');
            const newStyle = await res.json();
            toast({ title: 'Style Created', description: 'Redirecting to workspace...' });
            router.push(`/designer/${newStyle.id}`);
        } else {
             // Version Control Check
             let styleToSave = { ...currentStyle };
             if (style?.sampleApproved) {
                 if (confirm("This style is already approved. Saving changes will create a new version (v" + ((style.version || 1) + 1) + "). Continue?")) {
                     styleToSave.version = (style.version || 1) + 1;
                     styleToSave.sampleApproved = 0; // Reset approval for new version
                     updateStyleState({ version: styleToSave.version, sampleApproved: 0 }); // Update local state
                 } else {
                     setIsSaving(false);
                     return;
                 }
             }

             const res = await fetch(`/api/designer/styles/${style!.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(styleToSave)
            });
            if (!res.ok) throw new Error('Failed to update style');
            toast({ title: 'Saved', description: 'Style updated successfully.' });
            router.refresh();
        }
    } catch (error) {
        console.error(error);
        toast({ title: 'Error', description: 'Failed to save changes.', variant: 'destructive' });
    } finally {
        setIsSaving(false);
    }
  };

  const handleHandover = async () => {
      if(!confirm("Are you sure you want to handover this style to the factory? This will notify the factory admin.")) return;
      
      const token = localStorage.getItem('authToken');
      if (!token) {
          toast({ title: "Error", description: "You are not authenticated.", variant: "destructive" });
          return;
      }

      setIsSaving(true);
      try {
          const res = await fetch(`/api/designer/styles/${style!.id}/handover`, {
              method: 'POST',
              headers: {
                  'Authorization': `Bearer ${token}`
              }
          });
          
          if(!res.ok) throw new Error("Handover failed");
          
          toast({ title: "Handover Successful", description: "Factory has been notified." });
          updateStyleState({ status: 'Factory Handover' });
          router.refresh();
      } catch (e) {
          console.error(e);
          toast({ title: "Error", description: "Failed to handover style.", variant: "destructive" });
      } finally {
          setIsSaving(false);
      }
  };

  const handleApproveSubmit = async () => {
     setIsSaving(true);
     try {
         const token = localStorage.getItem('authToken');
         const res = await fetch(`/api/designer/styles/${style!.id}/approve`, {
             method: 'POST',
             headers: { 
                 'Content-Type': 'application/json',
                 'Authorization': `Bearer ${token}`
             },
             body: JSON.stringify(approvalData)
         });
         
         if(!res.ok) throw new Error("Approval failed");
         
         toast({ title: "Style Approved", description: "Style has been converted to a Product." });
         updateStyleState({ status: 'Approved' }); // Assuming API updates it too
         setApprovalOpen(false);
         router.refresh();
     } catch(e) {
         console.error(e);
         toast({ title: "Error", description: "Failed to approve style.", variant: "destructive" });
     } finally {
         setIsSaving(false);
     }
  };

  const handleRejectSubmit = async () => {
     if(!rejectionReason) {
         toast({ title: "Required", description: "Please enter a reason for rejection.", variant: "destructive" });
         return;
     }
     setIsSaving(true);
     try {
         const token = localStorage.getItem('authToken');
         const res = await fetch(`/api/designer/styles/${style!.id}/reject`, {
             method: 'POST',
             headers: { 
                 'Content-Type': 'application/json',
                 'Authorization': `Bearer ${token}`
             },
             body: JSON.stringify({ reason: rejectionReason })
         });
         
         if(!res.ok) throw new Error("Rejection failed");
         
         toast({ title: "Style Rejected", description: "Designer has been notified." });
         updateStyleState({ status: 'Development' }); // Sent back to dev
         setRejectionOpen(false);
         router.refresh();
     } catch(e) {
         console.error(e);
         toast({ title: "Error", description: "Failed to reject style.", variant: "destructive" });
     } finally {
         setIsSaving(false);
     }
  };

  const updateStyleState = (updates: Partial<Style>) => {
      setCurrentStyle(prev => ({ ...prev, ...updates }));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/designer')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="h-6 w-px bg-slate-200" />
          <h1 className="text-lg font-semibold text-slate-800">
            {isNew ? 'New Style' : `${currentStyle.number} - ${currentStyle.name}`}
          </h1>
          {!isNew && (
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                v{currentStyle.version}
            </span>
          )}
          {!isNew && currentStyle.status && (
             <span className={`px-2 py-0.5 rounded-full text-xs font-medium border
                ${currentStyle.status === 'Factory Handover' ? 'bg-orange-50 text-orange-600 border-orange-200' : 
                  currentStyle.status === 'Approved' ? 'bg-green-50 text-green-600 border-green-200' :
                  'bg-slate-100 text-slate-600 border-slate-200'}
             `}>
               {currentStyle.status}
             </span>
          )}
        </div>
        <div className="flex items-center gap-2">
           <span className="text-xs text-slate-400 mr-2">
             {isNew ? 'Unsaved' : 'Last saved just now'}
           </span>
           <Button onClick={handleSave} disabled={isSaving}>
             {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
             Save
           </Button>
           {!isNew && currentStyle.status !== 'Factory Handover' && currentStyle.status !== 'Approved' && (
               <Button onClick={handleHandover} disabled={isSaving} className="bg-green-600 hover:bg-green-700 text-white ml-2">
                 <Send className="h-4 w-4 mr-2" />
                 Handover
               </Button>
           )}
           
           {/* Factory Approval Actions */}
           {!isNew && user?.role === 'factory' && currentStyle.status === 'Factory Handover' && (
               <>
                   <Dialog open={approvalOpen} onOpenChange={setApprovalOpen}>
                       <DialogTrigger asChild>
                           <Button className="bg-blue-600 hover:bg-blue-700 text-white ml-2">
                               <CheckCircle2 className="h-4 w-4 mr-2" />
                               Approve as Product
                           </Button>
                       </DialogTrigger>
                       <DialogContent>
                           <DialogHeader>
                               <DialogTitle>Approve and Create Product</DialogTitle>
                               <DialogDescription>
                                   Convert this style into a factory product. Please set the initial price and minimum stock level.
                               </DialogDescription>
                           </DialogHeader>
                           <div className="grid gap-4 py-4">
                               <div className="grid grid-cols-4 items-center gap-4">
                                   <Label htmlFor="price" className="text-right">Price</Label>
                                   <Input id="price" type="number" value={approvalData.price} onChange={e => setApprovalData({...approvalData, price: parseFloat(e.target.value)})} className="col-span-3" />
                               </div>
                               <div className="grid grid-cols-4 items-center gap-4">
                                   <Label htmlFor="minStock" className="text-right">Min Stock</Label>
                                   <Input id="minStock" type="number" value={approvalData.minStock} onChange={e => setApprovalData({...approvalData, minStock: parseInt(e.target.value)})} className="col-span-3" />
                               </div>
                           </div>
                           <DialogFooter>
                               <Button onClick={handleApproveSubmit} disabled={isSaving}>
                                    {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                    Confirm Approval
                               </Button>
                           </DialogFooter>
                       </DialogContent>
                   </Dialog>

                   <Dialog open={rejectionOpen} onOpenChange={setRejectionOpen}>
                       <DialogTrigger asChild>
                            <Button variant="destructive" className="ml-2">
                               <XCircle className="h-4 w-4 mr-2" />
                               Reject
                           </Button>
                       </DialogTrigger>
                       <DialogContent>
                           <DialogHeader>
                               <DialogTitle>Reject Style</DialogTitle>
                               <DialogDescription>
                                   Return this style to the designer for revision. Please provide a reason.
                               </DialogDescription>
                           </DialogHeader>
                           <div className="py-4">
                               <Label htmlFor="reason">Reason for Rejection</Label>
                               <Textarea id="reason" value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="e.g. Missing measurements, wrong fabric..." />
                           </div>
                           <DialogFooter>
                               <Button variant="destructive" onClick={handleRejectSubmit} disabled={isSaving}>
                                    {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                    Reject Style
                               </Button>
                           </DialogFooter>
                       </DialogContent>
                   </Dialog>
               </>
           )}
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="px-6 pt-4 bg-white border-b border-slate-200">
            <TabsList className="bg-transparent border-b border-transparent w-full justify-start h-auto p-0 space-x-6">
              <TabTrigger value="general">General Info</TabTrigger>
              <TabTrigger value="bom" disabled={isNew}>Bill of Materials</TabTrigger>
              <TabTrigger value="measurements" disabled={isNew}>Measurements & Tech Pack</TabTrigger>
              <TabTrigger value="techpack" disabled={isNew}>Export</TabTrigger>
            </TabsList>
          </div>
          
          <div className="flex-1 overflow-auto p-6">
            <TabsContent value="general" className="m-0 h-full">
               <GeneralTab style={currentStyle} updateStyle={updateStyleState} />
            </TabsContent>
            <TabsContent value="bom" className="m-0 h-full">
               {!isNew && <BomTab styleId={style!.id} initialBom={style!.bom || []} />}
            </TabsContent>
            <TabsContent value="measurements" className="m-0 h-full">
               {!isNew && <MeasurementsTab styleId={style!.id} initialMeasurements={style!.measurements || []} initialCanvas={style!.canvas} />}
            </TabsContent>
            <TabsContent value="techpack" className="m-0 h-full">
               {!isNew && <TechPackTab style={style as Style} />}
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

function TabTrigger({ children, value, disabled }: { children: React.ReactNode, value: string, disabled?: boolean }) {
    return (
        <TabsTrigger 
            value={value} 
            disabled={disabled}
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:shadow-none px-2 py-3 mb-[-1px]"
        >
            {children}
        </TabsTrigger>
    )
}
