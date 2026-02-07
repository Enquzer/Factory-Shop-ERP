import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Order } from "@/lib/orders";
import { createAuthHeaders } from "@/lib/auth-helpers";

interface Driver {
  id: number;
  name: string;
  contact: string;
  license_plate: string;
}

interface DispatchDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDispatch: (dispatchInfo: any) => void;
}

export function DispatchDialog({ order, open, onOpenChange, onDispatch }: DispatchDialogProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [driverName, setDriverName] = useState("");
  const [transportLicensePlate, setTransportLicensePlate] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [padNumber, setPadNumber] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [comment, setComment] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchDrivers();
    }
  }, [open]);

  const fetchDrivers = async () => {
    try {
      const response = await fetch("/api/hr/drivers", {
        headers: createAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setDrivers(data);
      }
    } catch (error) {
      console.error("Failed to fetch drivers:", error);
    }
  };

  const handleDriverChange = (driverId: string) => {
    setSelectedDriverId(driverId);
    const driver = drivers.find(d => d.id.toString() === driverId);
    if (driver) {
      setDriverName(driver.name);
      setContactPerson(driver.contact);
      setTransportLicensePlate(driver.license_plate || "");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    // Validate required fields
    if (!driverName.trim()) {
      toast({
        title: "Validation Error",
        description: "Driver name is required",
        variant: "destructive",
      });
      return;
    }
    
    if (!contactPerson.trim()) {
      toast({
        title: "Validation Error",
        description: "Driver contact is required",
        variant: "destructive",
      });
      return;
    }
    
    if (!padNumber.trim()) {
      toast({
        title: "Validation Error",
        description: "PAD number is required",
        variant: "destructive",
      });
      return;
    }
    
    if (!receiptNumber.trim()) {
      toast({
        title: "Validation Error",
        description: "Receipt number is required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const dispatchInfo = {
        shopId: order.shopId,
        shopName: order.shopName,
        transportLicensePlate,
        contactPerson,
        dispatchDate,
        driverName,
        padNumber,
        receiptNumber,
        comment,
        // In a real implementation, you would handle file uploads here
        attachments: attachments.map(file => file.name)
      };

      await onDispatch(dispatchInfo);
      
      // Reset form
      setDriverName("");
      setTransportLicensePlate("");
      setContactPerson("");
      setDispatchDate(new Date().toISOString().split('T')[0]);
      setPadNumber("");
      setReceiptNumber("");
      setComment("");
      setAttachments([]);
      setSelectedDriverId("");
      
      toast({
        title: "Success",
        description: "Dispatch information added successfully.",
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding dispatch information:", error);
      toast({
        title: "Error",
        description: "Failed to add dispatch information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...files]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dispatch Order</DialogTitle>
          <DialogDescription>
            Add dispatch information for order {order?.id}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Required fields:</span> Driver Name, Driver Contact, PAD Number, and Receipt Number
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="orderNumber">Order Number</Label>
              <Input 
                id="orderNumber" 
                value={order?.id || ""} 
                readOnly 
                disabled 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="shopName">Shop Name</Label>
              <Input 
                id="shopName" 
                value={order?.shopName || ""} 
                readOnly 
                disabled 
              />
            </div>

            <div className="space-y-2 col-span-full">
              <Label htmlFor="driverSelect">Select Registered Driver</Label>
              <Select onValueChange={handleDriverChange} value={selectedDriverId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a driver..." />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id.toString()}>
                      {driver.name} ({driver.license_plate || 'No Plate'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="driverName">Driver Name <span className="text-destructive">*</span></Label>
              <Input 
                id="driverName" 
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="transportLicensePlate">Transport License Plate</Label>
              <Input 
                id="transportLicensePlate" 
                value={transportLicensePlate}
                onChange={(e) => setTransportLicensePlate(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contactPerson">Driver Contact <span className="text-destructive">*</span></Label>
              <Input 
                id="contactPerson" 
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dispatchDate">Dispatch Date</Label>
              <Input 
                id="dispatchDate" 
                type="date"
                value={dispatchDate}
                onChange={(e) => setDispatchDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="padNumber">PAD Number <span className="text-destructive">*</span></Label>
              <Input 
                id="padNumber" 
                value={padNumber}
                onChange={(e) => setPadNumber(e.target.value)}
                placeholder="Enter PAD number"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="receiptNumber">Receipt Number <span className="text-destructive">*</span></Label>
              <Input 
                id="receiptNumber" 
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                placeholder="Enter Receipt number"
                required
              />
            </div>

            <div className="space-y-2 col-span-full">
              <Label htmlFor="comment">Comments / Dispatch Side Notes</Label>
              <Textarea 
                id="comment" 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add any optional comments here..."
                className="min-h-[80px]"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Order Items</Label>
            <div className="border rounded-md max-h-60 overflow-y-auto font-sans">
              <table className="w-full">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium">Product</th>
                    <th className="text-left p-3 text-sm font-medium">Variant</th>
                    <th className="text-left p-3 text-sm font-medium">Quantity</th>
                    <th className="text-left p-3 text-sm font-medium">Price</th>
                    <th className="text-left p-3 text-sm font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order?.items.map((item, index) => (
                    <tr key={index} className="border-b last:border-b-0">
                      <td className="p-3 text-sm">
                        <div className="flex items-center gap-2">
                          {item.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                              src={item.imageUrl} 
                              alt={item.name} 
                              className="w-10 h-10 object-contain rounded"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/placeholder-product.png';
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                              <span className="text-xs">No Image</span>
                            </div>
                          )}
                          <span>{item.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-sm">
                        {item.variant.color}, {item.variant.size}
                      </td>
                      <td className="p-3 text-sm">
                        {item.quantity}
                      </td>
                      <td className="p-3 text-sm">
                        ETB {item.price.toLocaleString()}
                      </td>
                      <td className="p-3 text-sm font-medium">
                        ETB {(item.price * item.quantity).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="attachments">Attachments (Optional)</Label>
            <Input 
              id="attachments" 
              type="file" 
              multiple 
              onChange={handleAttachmentChange}
              accept="image/*,.pdf,.doc,.docx"
            />
            {attachments.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-muted-foreground mb-2">Attached files:</p>
                <div className="space-y-1">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                      <span className="text-sm truncate">{file.name}</span>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={() => removeAttachment(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Dispatch Information"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}