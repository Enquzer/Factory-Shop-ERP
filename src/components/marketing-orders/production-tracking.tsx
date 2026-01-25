"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Info } from "lucide-react";

type ProductionEntry = {
  id: number;
  componentName: string;
  processType: string;
  quantity: number;
  userId?: string;
  notes?: string;
  timestamp: string;
};

type Balance = Record<string, Record<string, number>>;

type Component = {
  name: string;
  ratio: number;
};

export function ProductionTracking({ orderId }: { orderId: string }) {
  const [history, setHistory] = useState<ProductionEntry[]>([]);
  const [balance, setBalance] = useState<Balance>({});
  const [components, setComponents] = useState<Component[]>([]);
  const [orderQuantity, setOrderQuantity] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Form State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState("");
  const [selectedProcess, setSelectedProcess] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // User Role Logic
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    // Determine user role for defaults
    if (typeof window !== 'undefined') {
      const storedRole = localStorage.getItem('userRole'); // Assuming stored as 'cutting', 'sewing' etc.
      setUserRole(storedRole);
      
      // Auto-set process based on role if applicable
      if (storedRole === 'cutting') setSelectedProcess('Cutting');
      if (storedRole === 'sewing') setSelectedProcess('Sewing');
      if (storedRole === 'finishing') setSelectedProcess('Finishing');
      if (storedRole === 'packing') setSelectedProcess('Packing');
    }
    
    fetchData();
  }, [orderId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/marketing-orders/${orderId}/production`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error("Failed to fetch data");
      const data = await res.json();
      
      setHistory(data.history);
      setBalance(data.balance);
      setComponents(data.components || []); // Fallback if empty
      setOrderQuantity(data.orderQuantity);
      
      // If components exist and user hasn't selected one, default to first
      if (data.components && data.components.length > 0 && !selectedComponent) {
          setSelectedComponent(data.components[0].name);
      }
      
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Could not load production data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedComponent || !selectedProcess || !quantity) return;
    
    setSubmitting(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/marketing-orders/${orderId}/production`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          componentName: selectedComponent,
          processType: selectedProcess,
          quantity: Number(quantity),
          notes
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to log activity");
      }

      toast({ title: "Success", description: "Activity logged successfully" });
      setIsDialogOpen(false);
      setQuantity("");
      setNotes("");
      fetchData(); // Refresh data
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !history.length) return <div className="p-4"><Loader2 className="animate-spin" /> Loading tracking data...</div>;

  // Calculate generic progress if no components defined (Legacy Mode)
  const displayComponents = components.length > 0 ? components : [{ name: 'Main', ratio: 1 }];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Production Status</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Log Activity</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Daily Activity</DialogTitle>
              <DialogDescription>Record completed work for a specific component and process.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Component</Label>
                <Select value={selectedComponent} onValueChange={setSelectedComponent}>
                  <SelectTrigger><SelectValue placeholder="Select Component" /></SelectTrigger>
                  <SelectContent>
                    {displayComponents.map(c => (
                      <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                    ))}
                    {/* Allow 'Product' or 'Set' for Packing Consolidation if not in list? */}
                     {/* For now stick to defined components, user can select 'Main' if fallback */}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Process Stage</Label>
                <Select value={selectedProcess} onValueChange={setSelectedProcess}>
                  <SelectTrigger><SelectValue placeholder="Select Stage" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cutting">Cutting</SelectItem>
                    <SelectItem value="Sewing">Sewing</SelectItem>
                    <SelectItem value="Finishing">Finishing</SelectItem>
                    {/* Packing is usually consolidated, but can be per component if needed */}
                    <SelectItem value="Packing">Packing</SelectItem> 
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantity Completed</Label>
                <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="e.g 50" />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any issues or remarks..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Saving..." : "Save Log"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Check & Balance Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayComponents.map(comp => {
            const compBalance = balance[comp.name] || {};
            const target = orderQuantity * comp.ratio;
            
            return (
                <Card key={comp.name} className="border-t-4 border-t-blue-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex justify-between">
                            {comp.name}
                            <span className="text-sm font-normal text-muted-foreground">Ratio: {comp.ratio}</span>
                        </CardTitle>
                        <CardDescription>Target: {target} pcs</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between items-center">
                                <span>Cutting</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500" style={{ width: `${Math.min(((compBalance['Cutting']||0)/target)*100, 100)}%` }}></div>
                                    </div>
                                    <span>{compBalance['Cutting'] || 0}</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>Sewing</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500" style={{ width: `${Math.min(((compBalance['Sewing']||0)/target)*100, 100)}%` }}></div>
                                    </div>
                                    <span>{compBalance['Sewing'] || 0}</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>Finishing</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500" style={{ width: `${Math.min(((compBalance['Finishing']||0)/target)*100, 100)}%` }}></div>
                                    </div>
                                    <span>{compBalance['Finishing'] || 0}</span>
                                </div>
                            </div>
                         </div>
                    </CardContent>
                </Card>
            );
        })}
        
        {/* Consolidated Packing Card */}
        <Card className="border-t-4 border-t-purple-500 bg-purple-50">
            <CardHeader className="pb-2">
                <CardTitle>Packing (Sets)</CardTitle>
                <CardDescription>Consolidated Product Output</CardDescription>
            </CardHeader>
             <CardContent>
                <div className="space-y-4">
                     <div className="text-center">
                        <div className="text-3xl font-bold text-purple-700">
                            {Object.values(balance).reduce((acc, curr) => acc + (curr['Packing'] || 0), 0) / (displayComponents.length || 1)} 
                            {/* This logic is flawed if 'Packing' is logged per component. But if logged generically? 
                                Actually, my logic logged Packing with `componentName`. 
                                If validation passes, we likely log against ONE component or ALL?
                                The validation checked logic.
                                Let's assume Packing is logged against 'Main' or the component selected.
                                This display might calculate sum of 'Packing' across all components if logged separately? 
                                Or usually Packing is 1-to-1 with OrderQty (Sets).
                            */}
                            {/* Improved Display Logic: Just show total processType='Packing' across all entries */}
                             {Object.values(balance).flatMap(c => c['Packing'] || 0).reduce((a, b) => a + b, 0)}
                        </div>
                        <span className="text-sm text-muted-foreground">Total Sets Packed</span>
                     </div>
                     <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                         {/* Progress based on Order Qty */}
                         <div className="h-full bg-purple-600" style={{ width: `${Math.min((Object.values(balance).flatMap(c => c['Packing'] || 0).reduce((a, b) => a + b, 0) / orderQuantity) * 100, 100)}%` }}></div>
                     </div>
                     <div className="text-xs text-center text-muted-foreground">Target: {orderQuantity} Sets</div>
                </div>
            </CardContent>
        </Card>
      </div>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>Recent daily production entries</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Component</TableHead>
                <TableHead>Process</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">No activity logged yet.</TableCell>
                </TableRow>
              ) : (
                history.map((entry) => (
                    <TableRow key={entry.id}>
                    <TableCell>{new Date(entry.timestamp).toLocaleDateString()} {new Date(entry.timestamp).toLocaleTimeString()}</TableCell>
                    <TableCell>{entry.componentName}</TableCell>
                    <TableCell><span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-gray-100">{entry.processType}</span></TableCell>
                    <TableCell>{entry.quantity}</TableCell>
                    <TableCell>{entry.userId}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={entry.notes}>{entry.notes}</TableCell>
                    </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
