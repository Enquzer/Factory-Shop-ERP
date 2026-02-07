import { 
  Dialog, 
  DialogContent, 
  DialogDescription,
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MarketingOrder, MarketingOrderItem, updateMarketingOrder } from "@/lib/marketing-orders";
import { useState, useEffect } from "react";
import Image from "next/image";
import { Trash2, Calendar, Flag, Factory, CheckCircle, Upload, Link as LinkIcon, FileCheck } from "lucide-react";
import { createAuthHeaders } from "@/lib/auth-helpers";
import { Badge } from "@/components/ui/badge";

interface EditMarketingOrderDialogProps {
  order: MarketingOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (updatedOrder: MarketingOrder) => void;
}

export function EditMarketingOrderDialog({ 
  order, 
  open, 
  onOpenChange,
  onUpdate
}: EditMarketingOrderDialogProps) {
  const { toast } = useToast();
  const [productName, setProductName] = useState("");
  const [productCode, setProductCode] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [items, setItems] = useState<MarketingOrderItem[]>([]);
  const [orderPlacementDate, setOrderPlacementDate] = useState<string>("");
  const [plannedDeliveryDate, setPlannedDeliveryDate] = useState<string>("");
  const [sizeSetSampleApproved, setSizeSetSampleApproved] = useState<string>("");
  const [productionStartDate, setProductionStartDate] = useState<string>("");
  const [productionFinishedDate, setProductionFinishedDate] = useState<string>("");
  const [assignedTo, setAssignedTo] = useState("");
  const [availableUsers, setAvailableUsers] = useState<{id: number, username: string}[]>([]);
  const [priority, setPriority] = useState(0);
  const [ppmMeetingAttached, setPpmMeetingAttached] = useState("");
  const [sampleApprovalAttached, setSampleApprovalAttached] = useState("");
  const [cuttingQualityAttached, setCuttingQualityAttached] = useState("");
  
  // File states for attachments
  const [ppmMeetingFile, setPpmMeetingFile] = useState<File | null>(null);
  const [sampleApprovalFile, setSampleApprovalFile] = useState<File | null>(null);
  const [cuttingQualityFile, setCuttingQualityFile] = useState<File | null>(null);
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (order) {
      setProductName(order.productName);
      setProductCode(order.productCode);
      setDescription(order.description || "");
      setItems(order.items.map(item => ({ ...item })));
      setOrderPlacementDate(order.orderPlacementDate || "");
      setPlannedDeliveryDate(order.plannedDeliveryDate || "");
      setSizeSetSampleApproved(order.sizeSetSampleApproved || "");
      setProductionStartDate(order.productionStartDate || "");
      setProductionFinishedDate(order.productionFinishedDate || "");
      setAssignedTo(order.assignedTo || "");
      setPriority(order.priority || 0);
      setPpmMeetingAttached(order.ppmMeetingAttached || "");
      setSampleApprovalAttached(order.sampleApprovalAttached || "");
      setCuttingQualityAttached(order.cuttingQualityAttached || "");
    }
  }, [order]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users', {
          headers: {
            ...createAuthHeaders(),
            'Content-Type': 'application/json',
          }
        });
        if (response.ok) {
          const data = await response.json();
          const pUsers = data.filter((u: any) => 
            ['planning', 'sample_maker', 'cutting', 'sewing', 'finishing', 'packing', 'quality_inspection', 'factory'].includes(u.role)
          );
          setAvailableUsers(pUsers);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    if (open) fetchUsers();
  }, [open]);

  // Update the quantity whenever items change
  useEffect(() => {
    const total = items.reduce((sum, item) => sum + item.quantity, 0);
    setQuantity(total);
  }, [items]);

  const uploadFile = async (file: File, prefix: string): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);
    const ext = file.name.split('.').pop();
    const filename = `${productCode.toUpperCase()}_${prefix}_${Date.now()}.${ext}`;
    formData.append('filename', filename);

    const res = await fetch('/api/upload', { 
      method: 'POST', 
      headers: {
        ...createAuthHeaders()
      },
      body: formData 
    });
    if (res.ok) {
      const data = await res.json();
      return data.imageUrl; // The API returns imageUrl for the path
    }
    return null;
  };

  const handleFileChange = (setter: (file: File | null) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setter(file);
  };

  const handleUpdateOrder = async () => {
    if (!order) return;

    setLoading(true);
    try {
      // Calculate total quantity from items
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
      
      // Upload documentation files if they exist
      let ppmUrl = ppmMeetingAttached;
      if (ppmMeetingFile) {
        const url = await uploadFile(ppmMeetingFile, 'PPM');
        if (url) ppmUrl = url;
      }
      
      let sampleApprovalUrl = sampleApprovalAttached;
      if (sampleApprovalFile) {
        const url = await uploadFile(sampleApprovalFile, 'SAMPLE_APPROVAL');
        if (url) sampleApprovalUrl = url;
      }
      
      let cuttingQualityUrl = cuttingQualityAttached;
      if (cuttingQualityFile) {
        const url = await uploadFile(cuttingQualityFile, 'CUTTING_QUALITY');
        if (url) cuttingQualityUrl = url;
      }

      const updatedData = {
        productName,
        productCode,
        description,
        quantity: totalQuantity,
        orderPlacementDate: orderPlacementDate || undefined,
        plannedDeliveryDate: plannedDeliveryDate || undefined,
        sizeSetSampleApproved: sizeSetSampleApproved || undefined,
        productionStartDate: productionStartDate || undefined,
        productionFinishedDate: productionFinishedDate || undefined,
        assignedTo: assignedTo || undefined,
        priority,
        ppmMeetingAttached: ppmUrl || undefined,
        sampleApprovalAttached: sampleApprovalUrl || undefined,
        cuttingQualityAttached: cuttingQualityUrl || undefined,
      };

      const success = await updateMarketingOrder(order.id, updatedData);
      
      if (success) {
        const updatedOrder = {
          ...order,
          ...updatedData,
          items: items.map(item => ({ ...item }))
        };
        
        onUpdate(updatedOrder);
        onOpenChange(false);
        toast({
          title: "Success",
          description: "Marketing order updated successfully.",
        });
      } else {
        throw new Error("Failed to update marketing order");
      }
    } catch (error) {
      console.error("Error updating marketing order:", error);
      toast({
        title: "Error",
        description: "Failed to update marketing order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    const newItems = [...items];
    newItems[index].quantity = quantity;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const addItem = () => {
    // This would be used if we want to add new items in the edit dialog
    // For now, we'll just keep the existing items editable
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Marketing Order - {order.orderNumber}</DialogTitle>
          <DialogDescription>
            Modify the details of this marketing order.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            {order.imageUrl && (
              <div className="relative h-48 w-full rounded-md overflow-hidden border mb-4">
                <Image 
                  src={order.imageUrl} 
                  alt={order.productName} 
                  fill 
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover" 
                />
              </div>
            )}
            <div className="space-y-4">
              <div>
                <Label htmlFor="productName">Product Name</Label>
                <Input
                  id="productName"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Product name"
                />
              </div>
              
              <div>
                <Label htmlFor="productCode">Product Code</Label>
                <Input
                  id="productCode"
                  value={productCode}
                  onChange={(e) => setProductCode(e.target.value)}
                  placeholder="Product code"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Product description"
                />
              </div>

              <div>
                <Label htmlFor="assignedTo">Assigned Representative / Team</Label>
                <select
                  id="assignedTo"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Unassigned</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.username}>{u.username}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <Label>Total Quantity</Label>
                <Input
                  type="number"
                  value={quantity}
                  readOnly
                  className="bg-gray-100"
                />
              </div>
              
              {/* Date Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="orderPlacementDate" className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4" />
                    Order Placement Date
                  </Label>
                  <Input
                    id="orderPlacementDate"
                    type="date"
                    value={orderPlacementDate}
                    onChange={(e) => setOrderPlacementDate(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="plannedDeliveryDate" className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4" />
                    Planned Delivery Date
                  </Label>
                  <Input
                    id="plannedDeliveryDate"
                    type="date"
                    value={plannedDeliveryDate}
                    onChange={(e) => setPlannedDeliveryDate(e.target.value)}
                  />
                </div>
              </div>
              
              {/* Sample Status Tracking Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sizeSetSampleApproved" className="flex items-center">
                    <Flag className="mr-2 h-4 w-4" />
                    Sample Approved Date
                  </Label>
                  <Input
                    id="sizeSetSampleApproved"
                    type="date"
                    value={sizeSetSampleApproved}
                    onChange={(e) => setSizeSetSampleApproved(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="productionStartDate" className="flex items-center">
                    <Factory className="mr-2 h-4 w-4" />
                    Production Start Date
                  </Label>
                  <Input
                    id="productionStartDate"
                    type="date"
                    value={productionStartDate}
                    onChange={(e) => setProductionStartDate(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="productionFinishedDate" className="flex items-center">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Production Finish Date
                  </Label>
                  <Input
                    id="productionFinishedDate"
                    type="date"
                    value={productionFinishedDate}
                    onChange={(e) => setProductionFinishedDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-primary flex items-center gap-2">
                  <FileCheck className="h-4 w-4" />
                  Production Documentation
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="priority">Sequence Priority</Label>
                    <Input
                      id="priority"
                      type="number"
                      value={priority}
                      onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                      className="max-w-[150px]"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-3 rounded-lg bg-gray-50/50">
                    <div className="space-y-2">
                      <Label htmlFor="ppmMeeting" className="flex items-center gap-1">
                        <LinkIcon className="h-3 w-3" />
                        PPM Meeting Minutes (URL)
                      </Label>
                      <Input
                        id="ppmMeeting"
                        value={ppmMeetingAttached}
                        onChange={(e) => setPpmMeetingAttached(e.target.value)}
                        placeholder="https://..."
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1 text-primary">
                        <Upload className="h-3 w-3" />
                        Attach File (PPM)
                      </Label>
                      <Input 
                        type="file" 
                        accept=".pdf,.doc,.docx,.jpg,.png" 
                        onChange={handleFileChange(setPpmMeetingFile)}
                        className="text-xs h-9 cursor-pointer"
                      />
                      {ppmMeetingFile && <p className="text-[10px] text-green-600 font-medium">Auto-upload: {ppmMeetingFile.name}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-3 rounded-lg bg-gray-50/50">
                    <div className="space-y-2">
                      <Label htmlFor="sampleApproval" className="flex items-center gap-1">
                        <LinkIcon className="h-3 w-3" />
                        Sample Approval (URL)
                      </Label>
                      <Input
                        id="sampleApproval"
                        value={sampleApprovalAttached}
                        onChange={(e) => setSampleApprovalAttached(e.target.value)}
                        placeholder="https://..."
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1 text-primary">
                        <Upload className="h-3 w-3" />
                        Attach File (Sample)
                      </Label>
                      <Input 
                        type="file" 
                        accept=".pdf,.doc,.docx,.jpg,.png" 
                        onChange={handleFileChange(setSampleApprovalFile)}
                        className="text-xs h-9 cursor-pointer"
                      />
                      {sampleApprovalFile && <p className="text-[10px] text-green-600 font-medium">Auto-upload: {sampleApprovalFile.name}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-3 rounded-lg bg-gray-50/50">
                    <div className="space-y-2">
                      <Label htmlFor="cuttingQuality" className="flex items-center gap-1">
                        <LinkIcon className="h-3 w-3" />
                        Cutting Quality Report (URL)
                      </Label>
                      <Input
                        id="cuttingQuality"
                        value={cuttingQualityAttached}
                        onChange={(e) => setCuttingQualityAttached(e.target.value)}
                        placeholder="https://..."
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1 text-primary">
                        <Upload className="h-3 w-3" />
                        Attach File (Quality)
                      </Label>
                      <Input 
                        type="file" 
                        accept=".pdf,.doc,.docx,.jpg,.png" 
                        onChange={handleFileChange(setCuttingQualityFile)}
                        className="text-xs h-9 cursor-pointer"
                      />
                      {cuttingQualityFile && <p className="text-[10px] text-green-600 font-medium">Auto-upload: {cuttingQualityFile.name}</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-lg mb-2">Size and Color Breakdown</h3>
            <div className="border rounded-md">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Size</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Color</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Quantity</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-4 py-2">{item.size}</td>
                      <td className="px-4 py-2">{item.color}</td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(index, Number(e.target.value))}
                          className="w-24"
                          min="0"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdateOrder}
            disabled={loading}
          >
            {loading ? "Updating..." : "Update Order"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}