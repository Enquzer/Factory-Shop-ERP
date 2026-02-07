'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Layout, 
  Search, 
  RefreshCw, 
  Eye, 
  Edit, 
  Trash2,
  Plus,
  Factory,
  Users,
  Calendar
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface MachineLayout {
  id: number;
  layoutName: string;
  orderId: string;
  productCode: string;
  section: string;
  machinePositions: Array<{
    machineId: number;
    x: number;
    y: number;
    rotation: number;
    sequence: number;
    operatorId?: string;
    operatorName?: string;
  }>;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export default function LayoutsListPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [layouts, setLayouts] = useState<MachineLayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');

  useEffect(() => {
    fetchLayouts();
  }, []);

  const fetchLayouts = async () => {
    try {
      setLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/ie/machines/layouts', { headers });
      if (response.ok) {
        const result = await response.json();
        setLayouts(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching layouts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch layouts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteLayout = async (id: number) => {
    if (!confirm('Are you sure you want to delete this layout?')) return;
    
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/ie/machines/layouts/${id}`, {
        method: 'DELETE',
        headers
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Layout deleted successfully"
        });
        fetchLayouts();
      } else {
        toast({
          title: "Error",
          description: "Failed to delete layout",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deleting layout:', error);
      toast({
        title: "Error",
        description: "Failed to delete layout",
        variant: "destructive"
      });
    }
  };

  const filteredLayouts = layouts
    .filter(layout => 
      layout.layoutName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      layout.productCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      layout.orderId.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(layout => sectionFilter === 'all' || layout.section === sectionFilter)
    .sort((a, b) => {
      if (sortBy === 'createdAt') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === 'name') {
        return a.layoutName.localeCompare(b.layoutName);
      } else if (sortBy === 'machines') {
        return b.machinePositions.length - a.machinePositions.length;
      }
      return 0;
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Layout className="h-8 w-8 text-primary" />
            Production Layouts
          </h1>
          <p className="text-muted-foreground">
            Manage and review your machine layouts
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchLayouts}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => router.push('/ie/layout-designer')}>
            <Plus className="mr-2 h-4 w-4" />
            New Layout
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search layouts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          
          <div className="min-w-[150px]">
            <Select value={sectionFilter} onValueChange={setSectionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                <SelectItem value="Cutting">Cutting</SelectItem>
                <SelectItem value="Sewing">Sewing</SelectItem>
                <SelectItem value="Finishing">Finishing</SelectItem>
                <SelectItem value="Packing">Packing</SelectItem>
                <SelectItem value="Quality Control">Quality Control</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="min-w-[150px]">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Date Created</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="machines">Machine Count</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Layouts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLayouts.map(layout => (
          <Card key={layout.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg line-clamp-2">{layout.layoutName}</CardTitle>
                <Badge variant="secondary">{layout.section}</Badge>
              </div>
              <CardDescription className="text-sm">
                {layout.orderId && (
                  <div className="flex items-center gap-1 mt-1">
                    <Factory className="h-3 w-3" />
                    Order: {layout.orderId}
                  </div>
                )}
                {layout.productCode && (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="font-mono text-xs">{layout.productCode}</span>
                  </div>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Factory className="h-4 w-4 text-muted-foreground" />
                  <span>{layout.machinePositions.length} machines</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {layout.machinePositions.filter(p => p.operatorId).length} assigned
                  </span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-1">
                {layout.machinePositions.slice(0, 5).map((pos, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    M{pos.sequence}
                  </Badge>
                ))}
                {layout.machinePositions.length > 5 && (
                  <Badge variant="secondary" className="text-xs">
                    +{layout.machinePositions.length - 5} more
                  </Badge>
                )}
              </div>
              
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Created {new Date(layout.createdAt).toLocaleDateString()}
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => router.push(`/ie/layout-designer?id=${layout.id}`)}
                >
                  <Eye className="mr-1 h-3 w-3" />
                  View
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => router.push(`/ie/layout-designer?id=${layout.id}`)}
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => deleteLayout(layout.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredLayouts.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Layout className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No layouts found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || sectionFilter !== 'all' 
                ? 'Try adjusting your filters' 
                : 'Create your first machine layout'}
            </p>
            {!searchTerm && sectionFilter === 'all' && (
              <Button onClick={() => router.push('/ie/layout-designer')}>
                <Plus className="mr-2 h-4 w-4" />
                Create Layout
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <div className="text-center text-sm text-muted-foreground">
        Showing {filteredLayouts.length} of {layouts.length} layouts
      </div>
    </div>
  );
}