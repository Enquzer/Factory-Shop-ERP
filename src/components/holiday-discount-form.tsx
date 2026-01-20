'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Product, getProducts } from '@/lib/products';
import { HolidayDiscount, CreateHolidayDiscountInput, UpdateHolidayDiscountInput } from '@/lib/holiday-discounts';

interface HolidayDiscountFormProps {
  discount?: HolidayDiscount;
  onSubmit: (data: CreateHolidayDiscountInput | UpdateHolidayDiscountInput) => Promise<void>;
  onCancel: () => void;
}

export function HolidayDiscountForm({ discount, onSubmit, onCancel }: HolidayDiscountFormProps) {
  const [name, setName] = useState(discount?.name || '');
  const [description, setDescription] = useState(discount?.description || '');
  const [startDate, setStartDate] = useState<Date | undefined>(discount ? new Date(discount.startDate) : undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(discount ? new Date(discount.endDate) : undefined);
  const [discountPercentage, setDiscountPercentage] = useState(discount?.discountPercentage.toString() || '0');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const products = await getProducts();
        setAllProducts(products);
        
        // If editing, load selected products
        if (discount?.id) {
          // In a real implementation, you would fetch products associated with this discount
          // For now, we'll just initialize with an empty array
          setSelectedProducts([]);
        }
      } catch (err) {
        setError('Failed to load products');
        console.error('Error loading products:', err);
      }
    };

    fetchProducts();
  }, [discount?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (startDate && endDate && startDate > endDate) {
        setError('End date must be after start date');
        return;
      }

      const discountData: CreateHolidayDiscountInput | UpdateHolidayDiscountInput = {
        id: discount?.id || '', // Will be ignored for create
        name,
        description,
        startDate: startDate || new Date(),
        endDate: endDate || new Date(),
        discountPercentage: parseFloat(discountPercentage),
      };

      await onSubmit(discountData);

      // Apply discount to selected products if any
      if (selectedProducts.length > 0 && discount?.id) {
        // In a real implementation, you would call applyHolidayDiscountToProducts
      }
    } catch (err) {
      setError('Failed to save holiday discount');
      console.error('Error saving holiday discount:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedProducts.length === allProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(allProducts.map(p => p.id));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-destructive/10 text-destructive rounded-md">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Discount Name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Christmas Sale"
            required
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description of the holiday discount"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Start Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : <span>Pick a start date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>End Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : <span>Pick an end date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div>
          <Label htmlFor="discountPercentage">Discount Percentage *</Label>
          <Input
            id="discountPercentage"
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={discountPercentage}
            onChange={(e) => setDiscountPercentage(e.target.value)}
            placeholder="e.g., 15.5"
            required
          />
          <p className="text-xs text-muted-foreground mt-1">Enter a value between 0 and 100</p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Apply to Products</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleSelectAll}
            >
              {selectedProducts.length === allProducts.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
          
          <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
            {allProducts.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No products available</p>
            ) : (
              <div className="space-y-2">
                {allProducts.map((product) => (
                  <div key={product.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`product-${product.id}`}
                      checked={selectedProducts.includes(product.id)}
                      onCheckedChange={() => toggleProductSelection(product.id)}
                    />
                    <Label 
                      htmlFor={`product-${product.id}`} 
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {product.name} ({product.productCode})
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : discount ? 'Update Discount' : 'Create Discount'}
        </Button>
      </div>
    </form>
  );
}