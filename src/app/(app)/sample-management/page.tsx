"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getProducts, updateProduct, Product } from "@/lib/products";
import { 
  FlaskConical,
  Search,
  CheckCircle,
  Image as ImageIcon, 
  Clock, 
  Save, 
  Layout, 
  History,
  CheckCircle2,
  Circle,
  XCircle,
  Check,
  FileText,
  AlertCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ProductHistoryDialog } from "@/components/sample/product-history-dialog";

export default function SampleManagementPage() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const fetchedProducts = await getProducts(true);
      setProducts(fetchedProducts);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        title: "Error",
        description: "Failed to fetch products data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.productCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const startEditing = (product: Product) => {
    setEditingId(product.id);
    setEditForm({
      sampleDevelopmentStatus: product.sampleDevelopmentStatus || 'Pending',
      sampleQuotationStatus: product.sampleQuotationStatus || 'Pending',
      sampleSizeSetStatus: product.sampleSizeSetStatus || 'Pending',
      sampleSizeSetQCStatus: product.sampleSizeSetQCStatus || 'Pending',
      sampleCounterStatus: product.sampleCounterStatus || 'Pending',
      sampleCounterQCStatus: product.sampleCounterQCStatus || 'Pending',
      piecesPerSet: product.piecesPerSet || 1
    });
  };

  const handleUpdate = async (id: string) => {
    try {
      const success = await updateProduct(id, {
        ...editForm,
        sampleApprovedBy: editForm.sampleCounterStatus === 'Completed' ? user?.username : undefined,
        sampleApprovedDate: editForm.sampleCounterStatus === 'Completed' ? new Date().toISOString() : undefined
      });

      if (success) {
        toast({
          title: "Success",
          description: "Sample status updated successfully.",
        });
        setEditingId(null);
        fetchProducts();
      }
    } catch (error) {
      console.error("Error updating sample status:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update sample status.",
        variant: "destructive",
      });
    }
  };

  const [inspections, setInspections] = useState<any[]>([]);
  
  const fetchInspections = async () => {
    try {
      const response = await fetch('/api/sample-management/inspections');
      const data = await response.json();
      setInspections(data);
    } catch (e) {}
  };

  useEffect(() => {
    fetchInspections();
  }, []);

  const handleRequestQC = async (productId: string, sampleType: 'Size Set' | 'Counter') => {
    if (!token) {
        toast({ title: "Authorization Error", description: "You must be logged in to request QC.", variant: "destructive" });
        return;
    }
    try {
      const response = await fetch('/api/sample-management/inspections', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ productId, sampleType })
      });
      
      if (response.status === 401) {
          toast({ title: "Unauthorized", description: "Your session may have expired. Please login again.", variant: "destructive" });
          return;
      }

      const data = await response.json();
      if (data.success) {
        toast({
          title: "QC Requested",
          description: `${sampleType} quality check request sent to QC team.`,
        });
        fetchInspections();
      }
    } catch (error) {
      toast({
        title: "Request Failed",
        description: "Failed to send QC request.",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'Completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'In Progress': return <Clock className="h-4 w-4 text-blue-500" />;
      default: return <Circle className="h-4 w-4 text-gray-300" />;
    }
  };

  const getQCIcon = (status?: string) => {
    switch (status) {
      case 'Passed': return <Check className="h-4 w-4 text-green-500" />;
      case 'Failed': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Circle className="h-4 w-4 text-gray-300" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sample Management</h1>
          <p className="text-muted-foreground">Track product development, size sets, and counter samples.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Product Development Checklist</CardTitle>
            <CardDescription>Track the sampling phases for all products in the catalog.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Pieces/Set</TableHead>
                  <TableHead>Development <span className="text-[10px] font-normal text-muted-foreground block">(Optional)</span></TableHead>
                  <TableHead>Quotation <span className="text-[10px] font-normal text-muted-foreground block">(Optional)</span></TableHead>
                  <TableHead>Size Set</TableHead>
                  <TableHead>Size Set QC</TableHead>
                  <TableHead>Counter Sample</TableHead>
                  <TableHead>Counter QC</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 relative rounded-md overflow-hidden border">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="object-cover w-full h-full" />
                          ) : (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                              <ImageIcon className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-xs text-muted-foreground">{product.productCode}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {editingId === product.id ? (
                        <Input 
                          type="number" 
                          min="1" 
                          className="w-16 h-8" 
                          value={editForm.piecesPerSet} 
                          onChange={(e) => setEditForm({...editForm, piecesPerSet: parseInt(e.target.value)})}
                        />
                      ) : (
                        <Badge variant="outline">{product.piecesPerSet || 1} Pcs</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === product.id ? (
                        <Select 
                          value={editForm.sampleDevelopmentStatus} 
                          onValueChange={(v) => setEditForm({...editForm, sampleDevelopmentStatus: v as any})}
                        >
                          <SelectTrigger className="h-8 w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center gap-2">
                          {getStatusIcon(product.sampleDevelopmentStatus)}
                          <span className="text-sm">{product.sampleDevelopmentStatus || 'Pending'}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === product.id ? (
                        <Select 
                          value={editForm.sampleQuotationStatus} 
                          onValueChange={(v) => setEditForm({...editForm, sampleQuotationStatus: v as any})}
                        >
                          <SelectTrigger className="h-8 w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center gap-2">
                          {getStatusIcon(product.sampleQuotationStatus)}
                          <span className="text-sm">{product.sampleQuotationStatus || 'Pending'}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === product.id ? (
                        <Select 
                          value={editForm.sampleSizeSetStatus} 
                          onValueChange={(v) => setEditForm({...editForm, sampleSizeSetStatus: v as any})}
                        >
                          <SelectTrigger className="h-8 w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center gap-2">
                          {getStatusIcon(product.sampleSizeSetStatus)}
                          <span className="text-sm">{product.sampleSizeSetStatus || 'Pending'}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === product.id ? (
                        <Select 
                          value={editForm.sampleSizeSetQCStatus} 
                          onValueChange={(v) => setEditForm({...editForm, sampleSizeSetQCStatus: v as any})}
                        >
                          <SelectTrigger className="h-8 w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Passed">Passed</SelectItem>
                            <SelectItem value="Failed">Failed</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center gap-2">
                          {getQCIcon(product.sampleSizeSetQCStatus)}
                          <span className="text-sm">{product.sampleSizeSetQCStatus || 'Pending'}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === product.id ? (
                        <Select 
                          value={editForm.sampleCounterStatus} 
                          onValueChange={(v) => setEditForm({...editForm, sampleCounterStatus: v as any})}
                        >
                          <SelectTrigger className="h-8 w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center gap-2">
                          {getStatusIcon(product.sampleCounterStatus)}
                          <span className="text-sm">{product.sampleCounterStatus || 'Pending'}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === product.id ? (
                        <Select 
                          value={editForm.sampleCounterQCStatus} 
                          onValueChange={(v) => setEditForm({...editForm, sampleCounterQCStatus: v as any})}
                        >
                          <SelectTrigger className="h-8 w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Passed">Passed</SelectItem>
                            <SelectItem value="Failed">Failed</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center gap-2">
                          {getQCIcon(product.sampleCounterQCStatus)}
                          <span className="text-sm">{product.sampleCounterQCStatus || 'Pending'}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingId === product.id ? (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                          <Button size="sm" onClick={() => handleUpdate(product.id)}>
                            <Save className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                        </div>
                      ) : (
                         <div className="flex flex-col gap-1">
                          <Button size="sm" variant="outline" onClick={() => startEditing(product)}>
                            Update Status
                          </Button>
                          <div className="flex gap-1 justify-end">
                            {(() => {
                              const sizeSetInsp = inspections.find(i => i.productId === product.id && i.sampleType === 'Size Set' && i.status !== 'Passed' && i.status !== 'Failed');
                              return (
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className={`h-7 text-[10px] px-2 ${sizeSetInsp ? 'bg-yellow-50 text-yellow-600' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                                  onClick={() => !sizeSetInsp && handleRequestQC(product.id, 'Size Set')}
                                  disabled={!!sizeSetInsp}
                                >
                                  {sizeSetInsp ? 'QC Requested' : 'Req SizeSet QC'}
                                </Button>
                              );
                            })()}
                            
                            {(() => {
                              const counterInsp = inspections.find(i => i.productId === product.id && i.sampleType === 'Counter' && i.status !== 'Passed' && i.status !== 'Failed');
                              return (
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className={`h-7 text-[10px] px-2 ${counterInsp ? 'bg-yellow-50 text-yellow-600' : 'bg-purple-50 text-purple-600 hover:bg-purple-100'}`}
                                  onClick={() => !counterInsp && handleRequestQC(product.id, 'Counter')}
                                  disabled={!!counterInsp}
                                >
                                  {counterInsp ? 'QC Requested' : 'Req Counter QC'}
                                </Button>
                              );
                            })()}
                            <ProductHistoryDialog productId={product.id} productName={product.name} />
                          </div>
                          {/* Show Inspection Report links if any */}
                          {inspections.filter(i => i.productId === product.id && i.status === 'Passed').map(ins => (
                            <a 
                              key={ins.id}
                              href={`/api/sample-management/inspections/${ins.id}/report?download=true`}
                              target="_blank"
                              className="text-[10px] text-green-600 flex items-center justify-end gap-1 hover:underline"
                            >
                              <FileText className="h-3 w-3" /> {ins.sampleType} Report
                            </a>
                          ))}
                         </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
