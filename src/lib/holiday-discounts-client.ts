// Client-side functions that call the API
import { 
  HolidayDiscount, 
  CreateHolidayDiscountInput, 
  UpdateHolidayDiscountInput, 
  ApplyHolidayDiscountInput,
  HolidayDiscountResponse 
} from './holiday-discounts';

// Create a holiday discount via API
export async function createHolidayDiscount(discount: CreateHolidayDiscountInput): Promise<HolidayDiscountResponse> {
  try {
    const response = await fetch('/api/holiday-discounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(discount),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to create holiday discount');
    }

    return result;
  } catch (error) {
    console.error('Error creating holiday discount:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create holiday discount'
    };
  }
}

// Get all holiday discounts via API
export async function getHolidayDiscounts(): Promise<HolidayDiscount[]> {
  try {
    const response = await fetch('/api/holiday-discounts');
    
    if (!response.ok) {
      throw new Error('Failed to fetch holiday discounts');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching holiday discounts:', error);
    return [];
  }
}

// Get a specific holiday discount by ID via API
export async function getHolidayDiscountById(id: string): Promise<HolidayDiscount | null> {
  try {
    const response = await fetch(`/api/holiday-discounts/${id}`);
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching holiday discount:', error);
    return null;
  }
}

// Update a holiday discount via API
export async function updateHolidayDiscount(discount: UpdateHolidayDiscountInput): Promise<HolidayDiscountResponse> {
  try {
    const response = await fetch('/api/holiday-discounts', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(discount),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to update holiday discount');
    }

    return result;
  } catch (error) {
    console.error('Error updating holiday discount:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update holiday discount'
    };
  }
}

// Delete a holiday discount via API
export async function deleteHolidayDiscount(id: string): Promise<HolidayDiscountResponse> {
  try {
    const response = await fetch(`/api/holiday-discounts/${id}`, {
      method: 'DELETE',
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to delete holiday discount');
    }

    return result;
  } catch (error) {
    console.error('Error deleting holiday discount:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete holiday discount'
    };
  }
}

// Apply holiday discount to products via API
export async function applyHolidayDiscountToProducts(input: ApplyHolidayDiscountInput): Promise<HolidayDiscountResponse> {
  try {
    const response = await fetch('/api/holiday-discounts/apply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to apply holiday discount to products');
    }

    return result;
  } catch (error) {
    console.error('Error applying holiday discount to products:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to apply holiday discount to products'
    };
  }
}