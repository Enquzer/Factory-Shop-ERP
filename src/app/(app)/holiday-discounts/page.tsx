'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HolidayDiscountDialog } from '@/components/holiday-discount-dialog';
import { HolidayDiscount, CreateHolidayDiscountInput, UpdateHolidayDiscountInput } from '@/lib/holiday-discounts';
import { getHolidayDiscounts, createHolidayDiscount, updateHolidayDiscount, deleteHolidayDiscount } from '@/lib/holiday-discounts-client';
import { useAuth } from '@/contexts/auth-context';
import { format } from 'date-fns';
import { Plus, Edit, Trash2 } from 'lucide-react';

export default function HolidayDiscountsPage() {
  const { user } = useAuth();
  const [discounts, setDiscounts] = useState<HolidayDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<HolidayDiscount | null>(null);

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const fetchDiscounts = async () => {
    try {
      setLoading(true);
      const data = await getHolidayDiscounts();
      setDiscounts(data);
    } catch (err) {
      setError('Failed to load holiday discounts');
      console.error('Error fetching holiday discounts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: CreateHolidayDiscountInput) => {
    try {
      const result = await createHolidayDiscount(data);
      if (result.success && result.data) {
        setDiscounts(prev => [...prev, result.data as HolidayDiscount]);
      } else {
        throw new Error(result.message || 'Failed to create discount');
      }
    } catch (err) {
      console.error('Error creating holiday discount:', err);
      throw err;
    }
  };

  const handleUpdate = async (data: UpdateHolidayDiscountInput) => {
    try {
      const result = await updateHolidayDiscount(data);
      if (result.success && result.data) {
        const updatedDiscount = result.data as HolidayDiscount;
        setDiscounts(prev => 
          prev.map(d => d.id === updatedDiscount.id ? updatedDiscount : d)
        );
      } else {
        throw new Error(result.message || 'Failed to update discount');
      }
    } catch (err) {
      console.error('Error updating holiday discount:', err);
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const result = await deleteHolidayDiscount(id);
      if (result.success) {
        setDiscounts(prev => prev.filter(d => d.id !== id));
      } else {
        throw new Error(result.message || 'Failed to delete discount');
      }
    } catch (err) {
      console.error('Error deleting holiday discount:', err);
      throw err;
    }
  };

  const handleSubmit = async (data: CreateHolidayDiscountInput | UpdateHolidayDiscountInput) => {
    if ('id' in data && data.id) {
      // Update existing discount
      await handleUpdate(data as UpdateHolidayDiscountInput);
    } else {
      // Create new discount
      await handleCreate(data as CreateHolidayDiscountInput);
    }
    setDialogOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading holiday discounts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <h1 className="text-2xl font-semibold text-destructive">Error</h1>
        <p className="text-muted-foreground">{error}</p>
        <Button className="mt-4" onClick={fetchDiscounts}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Holiday Discounts</h1>
        <Button onClick={() => {
          setEditingDiscount(null);
          setDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Create Discount
        </Button>
      </div>

      {discounts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No holiday discounts created yet</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => {
                setEditingDiscount(null);
                setDialogOpen(true);
              }}
            >
              Create Your First Discount
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {discounts.map((discount) => (
            <Card key={discount.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{discount.name}</CardTitle>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingDiscount(discount);
                        setDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(discount.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{discount.description}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Dates:</span>
                    <span className="text-sm">
                      {format(new Date(discount.startDate), 'MMM d, yyyy')} - {format(new Date(discount.endDate), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Discount:</span>
                    <span className="text-sm font-medium">{discount.discountPercentage}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <span className={`text-sm ${discount.isActive ? 'text-green-600' : 'text-red-600'}`}>
                      {discount.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HolidayDiscountDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        discount={editingDiscount}
        onSubmit={handleSubmit}
      />
    </div>
  );
}