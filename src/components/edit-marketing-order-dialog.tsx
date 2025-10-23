import { 
  Dialog, 
  DialogContent, 
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
import { Trash2 } from "lucide-react";

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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (order) {
      setProductName(order.productName);
      setProductCode(order.productCode);
      setDescription(order.description || "");
      setItems(order.items.map(item => ({ ...item })));
    }
  }, [order]);

  // Update the quantity whenever items change
  useEffect(() => {
    const total = items.reduce((sum, item) => sum + item.quantity, 0);
    setQuantity(total);
  }, [items]);

  const handleUpdateOrder = async () => {
    if (!order) return;

    setLoading(true);
    try {
      // Calculate total quantity from items
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
      
      const updatedData = {
        productName,
        productCode,
        description,
        quantity: totalQuantity,
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
                <Label>Total Quantity</Label>
                <Input
                  type="number"
                  value={quantity}
                  readOnly
                  className="bg-gray-100"
                />
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
