
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { History, FileText, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";

interface ProductHistoryDialogProps {
  productId: string;
  productName: string;
}

export function ProductHistoryDialog({ productId, productName }: ProductHistoryDialogProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetch(`/api/sample-management/inspections?productId=${productId}`)
        .then(res => res.json())
        .then(data => {
            setHistory(data);
            setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [open, productId]);

  const getStatusIcon = (status: string) => {
      switch(status) {
          case 'Passed': return <CheckCircle className="h-4 w-4 text-green-500" />;
          case 'Failed': return <XCircle className="h-4 w-4 text-red-500" />;
          default: return <Clock className="h-4 w-4 text-blue-500" />;
      }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <History className="h-4 w-4 text-muted-foreground" />
          <span className="sr-only">View History</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sample History - {productName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {loading ? (
             <div className="text-center py-4 text-sm text-muted-foreground">Loading history...</div>
          ) : history.length === 0 ? (
             <div className="text-center py-4 text-sm text-muted-foreground">No inspection history found.</div>
          ) : (
            <div className="space-y-2">
                {history.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                        <div className="flex items-center gap-3">
                            {getStatusIcon(item.status)}
                            <div>
                                <div className="font-medium text-sm">{item.sampleType} Inspection</div>
                                <div className="text-xs text-muted-foreground">
                                    Requested: {format(new Date(item.requestDate), 'MMM d, yyyy')}
                                    {item.inspectionDate && ` • Inspected: ${format(new Date(item.inspectionDate), 'MMM d, yyyy')}`}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                item.status === 'Passed' ? 'bg-green-100 text-green-700' : 
                                item.status === 'Failed' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                                {item.status}
                            </span>
                            {item.status !== 'Pending' && (
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => window.open(`/api/sample-management/inspections/${item.id}/report?download=true`, '_blank')}>
                                    <FileText className="h-4 w-4 text-slate-500" />
                                </Button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
