'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Filter,
  Clock,
  Users,
  Settings
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

type IEOperation = {
  id: number;
  opCode: string;
  operationName: string;
  category: string;
  description: string;
  standardSMV: number;
  machineType: string;
  skillLevelRequired: 'Beginner' | 'Intermediate' | 'Advanced';
  complexity: number;
  department: string;
  isActive: boolean;
  createdAt: string;
};

export default function OperationsLibraryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [operations, setOperations] = useState<IEOperation[]>([]);
  const [filteredOperations, setFilteredOperations] = useState<IEOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOperation, setEditingOperation] = useState<IEOperation | null>(null);
  const [formData, setFormData] = useState({
    opCode: '',
    operationName: '',
    category: '',
    description: '',
    standardSMV: 0,
    machineType: '',
    skillLevelRequired: 'Beginner' as 'Beginner' | 'Intermediate' | 'Advanced',
    complexity: 1,
    department: ''
  });

  useEffect(() => {
    fetchOperations();
    fetchCategories();
  }, []);

  useEffect(() => {
    filterOperations();
  }, [operations, searchTerm, selectedCategory]);

  const fetchOperations = async () => {
    try {
      setLoading(true);
      
      // Get auth token
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch('/api/ie/operations', { headers });
      if (res.ok) {
        const data = await res.json();
        setOperations(data);
      }
    } catch (error) {
      console.error('Error fetching operations:', error);
      toast({
        title: "Error",
        description: "Failed to fetch operations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      // Get auth token
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch('/api/ie/operations/categories', { headers });
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const filterOperations = () => {
    let filtered = [...operations];
    
    if (searchTerm) {
      filtered = filtered.filter(op => 
        op.opCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        op.operationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        op.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(op => op.category === selectedCategory);
    }
    
    setFilteredOperations(filtered);
  };

  const handleCreate = async () => {
    try {
      // Get auth token
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch('/api/ie/operations', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...formData,
          isActive: true
        })
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: "Operation created successfully"
        });
        setIsDialogOpen(false);
        resetForm();
        fetchOperations();
      } else {
        const error = await res.json();
        toast({
          title: "Error",
          description: error.error || "Failed to create operation",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error creating operation:', error);
      toast({
        title: "Error",
        description: "Failed to create operation",
        variant: "destructive"
      });
    }
  };

  const handleUpdate = async () => {
    if (!editingOperation) return;
    
    try {
      // Get auth token
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch(`/api/ie/operations/${editingOperation.opCode}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: "Operation updated successfully"
        });
        setIsDialogOpen(false);
        resetForm();
        fetchOperations();
      } else {
        const error = await res.json();
        toast({
          title: "Error",
          description: error.error || "Failed to update operation",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating operation:', error);
      toast({
        title: "Error",
        description: "Failed to update operation",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (opCode: string) => {
    if (!confirm('Are you sure you want to delete this operation?')) return;
    
    try {
      // Get auth token
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch(`/api/ie/operations/${opCode}`, {
        method: 'DELETE',
        headers
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: "Operation deleted successfully"
        });
        fetchOperations();
      } else {
        const error = await res.json();
        toast({
          title: "Error",
          description: error.error || "Failed to delete operation",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deleting operation:', error);
      toast({
        title: "Error",
        description: "Failed to delete operation",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      opCode: '',
      operationName: '',
      category: '',
      description: '',
      standardSMV: 0,
      machineType: '',
      skillLevelRequired: 'Beginner',
      complexity: 1,
      department: ''
    });
    setEditingOperation(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (operation: IEOperation) => {
    setFormData({
      opCode: operation.opCode,
      operationName: operation.operationName,
      category: operation.category,
      description: operation.description,
      standardSMV: operation.standardSMV,
      machineType: operation.machineType,
      skillLevelRequired: operation.skillLevelRequired,
      complexity: operation.complexity,
      department: operation.department
    });
    setEditingOperation(operation);
    setIsDialogOpen(true);
  };

  const getComplexityColor = (level: number) => {
    if (level >= 4) return 'bg-red-100 text-red-800';
    if (level >= 3) return 'bg-orange-100 text-orange-800';
    if (level >= 2) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getSkillLevelColor = (level: string) => {
    if (level === 'Advanced') return 'bg-purple-100 text-purple-800';
    if (level === 'Intermediate') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Operation Library</h1>
          <p className="text-muted-foreground">
            GSD/Pro-SMV Standard Operations Database
          </p>
        </div>
        {user?.role === 'ie_admin' && (
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Operation
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Operations
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search operations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Operations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Operations ({filteredOperations.length})
          </CardTitle>
          <CardDescription>
            Standard operations with GSD/Pro-SMV values
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>SMV</TableHead>
                  <TableHead>Machine</TableHead>
                  <TableHead>Skill Level</TableHead>
                  <TableHead>Complexity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOperations.map((operation) => (
                  <TableRow key={operation.id}>
                    <TableCell className="font-medium">{operation.opCode}</TableCell>
                    <TableCell>{operation.operationName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{operation.category}</Badge>
                    </TableCell>
                    <TableCell>{operation.standardSMV.toFixed(3)}</TableCell>
                    <TableCell>{operation.machineType || '-'}</TableCell>
                    <TableCell>
                      <Badge className={getSkillLevelColor(operation.skillLevelRequired)} variant="secondary">
                        {operation.skillLevelRequired}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getComplexityColor(operation.complexity)} variant="secondary">
                        {operation.complexity}/5
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(operation)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {user?.role === 'ie_admin' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(operation.opCode)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingOperation ? 'Edit Operation' : 'Create New Operation'}
            </DialogTitle>
            <DialogDescription>
              {editingOperation 
                ? 'Update the operation details below' 
                : 'Add a new standard operation to the library'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="opCode">Operation Code</Label>
                <Input
                  id="opCode"
                  value={formData.opCode}
                  onChange={(e) => setFormData({...formData, opCode: e.target.value})}
                  placeholder="e.g., SEW001"
                  disabled={!!editingOperation}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="operationName">Operation Name</Label>
                <Input
                  id="operationName"
                  value={formData.operationName}
                  onChange={(e) => setFormData({...formData, operationName: e.target.value})}
                  placeholder="e.g., Sleeve Joining"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="machineType">Machine Type</Label>
                <Input
                  id="machineType"
                  value={formData.machineType}
                  onChange={(e) => setFormData({...formData, machineType: e.target.value})}
                  placeholder="e.g., Overlock Machine"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="standardSMV">Standard SMV</Label>
                <Input
                  id="standardSMV"
                  type="number"
                  step="0.001"
                  value={formData.standardSMV}
                  onChange={(e) => setFormData({...formData, standardSMV: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="skillLevel">Skill Level</Label>
                <Select value={formData.skillLevelRequired} onValueChange={(value) => setFormData({...formData, skillLevelRequired: value as any})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="complexity">Complexity (1-5)</Label>
                <Input
                  id="complexity"
                  type="number"
                  min="1"
                  max="5"
                  value={formData.complexity}
                  onChange={(e) => setFormData({...formData, complexity: parseInt(e.target.value) || 1})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => setFormData({...formData, department: e.target.value})}
                placeholder="e.g., Sewing"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Operation description and notes"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={editingOperation ? handleUpdate : handleCreate}>
              {editingOperation ? 'Update' : 'Create'} Operation
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}